import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req: Request) => {
  // Xử lý CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Kiểm tra Secret Key bảo vệ Webhook
    const apiKey = req.headers.get('x-api-key');
    const expectedKey =
      Deno.env.get('BANK_WEBHOOK_SECRET') || 'fintrack_secret_key_123';

    if (apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid x-api-key' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Nhận payload từ iOS Shortcuts (chỉ cần raw_message và user_id)
    const body = await req.json();
    const { raw_message, user_id, sender_app } = body;

    if (!raw_message || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Thiếu raw_message hoặc user_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Tự động nhận diện ngân hàng / sender_app từ nội dung tin nhắn
    let detectedApp = sender_app?.trim() || null;
    if (!detectedApp) {
      if (/sacombank/i.test(raw_message)) {
        detectedApp = 'Sacombank';
      } else if (
        /mb\s*bank|mbbank/i.test(raw_message) ||
        raw_message.includes('|GD:')
      ) {
        detectedApp = 'MBBank';
      } else if (/techcombank|tcb/i.test(raw_message)) {
        detectedApp = 'Techcombank';
      } else if (/vietcombank|vcb/i.test(raw_message)) {
        detectedApp = 'Vietcombank';
      } else if (/tpbank|tienphong/i.test(raw_message)) {
        detectedApp = 'TPBank';
      } else if (/vpbank|vpb/i.test(raw_message)) {
        detectedApp = 'VPBank';
      } else if (/\bacb\b/i.test(raw_message)) {
        detectedApp = 'ACB';
      } else if (/bidv/i.test(raw_message)) {
        detectedApp = 'BIDV';
      } else if (/vietinbank|ctg/i.test(raw_message)) {
        detectedApp = 'VietinBank';
      } else if (/momo/i.test(raw_message)) {
        detectedApp = 'MoMo';
      } else if (/zalopay/i.test(raw_message)) {
        detectedApp = 'ZaloPay';
      } else if (/cake/i.test(raw_message)) {
        detectedApp = 'Cake';
      } else if (/timo/i.test(raw_message)) {
        detectedApp = 'Timo';
      }
    }

    // 3. Bóc tách dữ liệu
    console.log('===> [bank-webhook] Nhận raw_message:', raw_message);

    // a. Kiểm tra nếu là nhận tiền (Income) thì bỏ qua
    // Lưu ý: KHÔNG dùng `\+[\d]+` đơn thuần vì sẽ bắt nhầm số hotline ngân hàng (VD: "+842835266060")!
    // Chỉ coi là Income nếu có từ khóa nhận tiền hoặc dấu `+` đi kèm số tiền (VD: `GD: +10,000VND`)
    const hasIncomeKeywords =
      /(?:nh[ậa]n ti[ềe]n|chuy[ểe]n ti[ềe]n [đd][ếe]n|ho[àa]n ti[ềe]n|ti[ềe]n v[àa]o)/i.test(
        raw_message,
      );
    const hasPlusAmount =
      /(?:GD|giao\s*d[ịi]ch)?:\s*\+\s*[\d,.]+/i.test(raw_message) ||
      /\+\s*[\d,.]+\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu.test(raw_message);
    const isCardPurchase = /th[ẻe][\s\S]*?giao\s*d[ịi]ch[\s\S]*?t[ạa]i/i.test(
      raw_message,
    );

    const isIncome = (hasIncomeKeywords || hasPlusAmount) && !isCardPurchase;

    if (isIncome) {
      console.log('===> [bank-webhook] Bỏ qua vì phát hiện là giao dịch nhận tiền (income)');
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          message: 'Bỏ qua giao dịch nhận tiền (income)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // b. Bóc tách số tiền giao dịch
    // Đơn vị tiền phải đứng riêng: "41\nĐưa..." không phải "41đ".
    // Dùng ranh giới Unicode vì \b không nhận diện đúng chữ tiếng Việt.
    // Tầng 1: Có từ khóa (giao dịch, GD, số tiền, thanh toán, chuyển tiền, chuyển thành công...)
    let amountMatch = raw_message.match(
      /(?:giao\s*d[ịi]ch|gd|s[ốo]\s*ti[ềe]n|thanh\s*to[áa]n|chuy[ểe]n\s*(?:kho[ảa]n|ti[ềe]n)?|chuy[ểe]n\s*th[àa]nh\s*c[ôo]ng)[\s:]*([+-])?\s*([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
    );

    let parsed_amount: number | null = null;
    let parsed_type: 'expense' | 'income' = 'expense';

    if (amountMatch) {
      // Trường hợp có group [+-] thì lấy group 2, nếu không thì lấy group cuối
      const amountStr = (amountMatch[2] || amountMatch[1] || '').replace(/[,.]/g, '');
      if (amountStr) parsed_amount = parseFloat(amountStr);
    }

    // Tầng 2: Dấu trừ "-" hoặc "trừ" phải đi kèm số tiền có đơn vị.
    if (!parsed_amount) {
      const minusMatch = raw_message.match(/(?:-\s*|tr[ừu]\s*)([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu);
      if (minusMatch) {
        parsed_amount = parseFloat(minusMatch[1].replace(/[,.]/g, ''));
      }
    }

    // Tầng 3: Bất kỳ cụm số + VND/đ ở phần đầu tin nhắn (trước chữ SD / Số dư / Hạn mức)
    if (!parsed_amount) {
      const beforeBalance = raw_message.split(/(?:SD|S[ốo]\s*d[ưu]|H[ạa]n\s*m[ứu]c)/i)[0];
      const fallbackAmountMatch = beforeBalance.match(/([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu);
      if (fallbackAmountMatch) {
        parsed_amount = parseFloat(fallbackAmountMatch[1].replace(/[,.]/g, ''));
      }
    }

    console.log('===> [bank-webhook] Bóc tách số tiền (VND):', parsed_amount);

    // Nếu thông báo KHÔNG có số tiền giao dịch (ví dụ tin quảng cáo, OTP, hoặc popup 'Thành công' không có số tiền) -> Bỏ qua
    if (!parsed_amount || parsed_amount <= 0) {
      console.log('===> [bank-webhook] Bỏ qua vì không có số tiền giao dịch hợp lệ');
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          message: 'Bỏ qua: Tin nhắn không chứa số tiền giao dịch',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    const rawVndAmount = parsed_amount;
    // Quy đổi về đơn vị NGHÌN ĐỒNG (k) và làm tròn theo chuẩn lưu trữ của FinTrackPro (VD: 110,322 VND -> 110k, 50,000 VND -> 50k)
    if (parsed_amount >= 1000) {
      parsed_amount = Math.round(parsed_amount / 1000);
    }
    console.log('===> [bank-webhook] Số tiền sau quy đổi (k):', parsed_amount);

    // c. Bóc tách nội dung chi tiêu
    // Sacombank / POS: "tại Foody19002042 VN. Mã giao dịch..."
    // MBBank: "ND: Le Thi Bich Thuy chuyen tien... | SD: ..."
    // Chuyển khoản thường: "ND: Highlands Coffee..."
    let note: string | null = null;
    const merchantMatch = raw_message.match(
      /t[ạa]i\s+([\s\S]+?)(?:\.\s*M[ãa]|\.|$|M[ãa]\s*giao\s*d[ịi]ch)/i,
    );
    const ndMatch = raw_message.match(/(?:ND|Noi dung|Ref):\s*(.+?)(?:\||\.|$)/i);

    if (merchantMatch) {
      note = merchantMatch[1].replace(/\s+/g, ' ').replace(/\.+$/, '').trim();
    } else if (ndMatch) {
      note = ndMatch[1].trim();
    } else {
      note = detectedApp ? `Chi tiêu ${detectedApp}` : 'Giao dịch chi tiêu';
    }

    // d. Bóc tách 4 số cuối thẻ (hỗ trợ cả trường hợp xuống dòng)
    const cardMatch = raw_message.match(/(?:th[ẻe]|card)[\s\S]{1,60}?(\d{4})\b/i);
    const cardLast4 = cardMatch ? cardMatch[1] : null;

    // e. Bóc tách các thông tin chi tiết để đưa vào metadata
    // 1. Mã giao dịch ngân hàng (VD: "Mã giao dịch 118497" hoặc mã ref)
    const txnCodeMatch = raw_message.match(
      /(?:M[ãa]\s*giao\s*d[ịi]ch|M[ãa]\s*GD|Ref|Trace|S[ốo]\s*tham\s*chi[ếe]u)[:\s]*([A-Za-z0-9/]+)/i,
    );
    const bankTxnId = txnCodeMatch ? txnCodeMatch[1].trim() : null;

    // 2. Số dư tài khoản hoặc Hạn mức khả dụng sau giao dịch
    const balanceMatch = raw_message.match(
      /(?:SD|S[ốo]\s*d[ưu]|H[ạa]n\s*m[ứu]c\s*kh[ảa]\s*d[ụu]ng)[:\s]*([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
    );
    const balanceAfter = balanceMatch
      ? parseFloat(balanceMatch[1].replace(/[,.]/g, ''))
      : null;

    // 3. Số tài khoản (VD: MBBank "TK 69xxx999")
    const accountMatch = raw_message.match(/TK\s*([A-Za-z0-9xX]+)/i);
    const accountNumber = accountMatch ? accountMatch[1] : null;

    // Đối tượng metadata chứa các thông tin hữu ích
    const metadata = {
      card_last4: cardLast4,
      account_number: accountNumber,
      bank_txn_id: bankTxnId,
      balance_after: balanceAfter,
      original_amount_vnd: rawVndAmount,
      merchant: merchantMatch ? merchantMatch[1].trim() : null,
      sender_app: detectedApp || null,
    };

    // 4. Khởi tạo Supabase Client với Service Role Key để ghi DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Chống trùng lặp (Deduplication trong vòng 60 giây)
    // Nếu trong 60s vừa qua đã lưu 1 giao dịch có cùng số tiền -> Bỏ qua ngay
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentDupes } = await supabase
      .from('transaction_inbox')
      .select('id')
      .eq('user_id', user_id)
      .eq('parsed_amount', parsed_amount)
      .gte('created_at', sixtySecondsAgo)
      .limit(1);

    if (recentDupes && recentDupes.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          message: 'Bỏ qua: Phát hiện giao dịch trùng lặp trong vòng 60 giây',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // 6. Tự động gợi ý ví (suggested_wallet_id)
    // ƯU TIÊN RIÊNG: Nếu là MBBank (detectedApp là MBBank hoặc tin nhắn có |GD:) -> Chọn ví "Tiền mặt"
    let suggested_wallet_id: string | null = null;
    const isMBBank =
      detectedApp === 'MBBank' ||
      raw_message.toLowerCase().includes('mbbank') ||
      raw_message.includes('|GD:');

    if (isMBBank) {
      const { data: cashWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user_id)
        .or('display_name.ilike.%tiền mặt%,display_name.ilike.%tien mat%,display_name.ilike.%cash%')
        .limit(1)
        .maybeSingle();

      if (cashWallet?.id) {
        suggested_wallet_id = cashWallet.id;
      }
    }

    // Nếu không phải MBBank hoặc chưa tìm được ví:
    // Ưu tiên 1: Tìm ví có 4 số cuối thẻ (VD: ví tên "Visa 8522")
    if (!suggested_wallet_id && cardLast4) {
      const { data: walletCard } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user_id)
        .ilike('display_name', `%${cardLast4}%`)
        .limit(1)
        .maybeSingle();

      if (walletCard?.id) {
        suggested_wallet_id = walletCard.id;
      }
    }

    // Ưu tiên 2: Tìm ví theo tên ngân hàng (VD: "Sacombank", "Techcombank", ...)
    if (!suggested_wallet_id && detectedApp) {
      const { data: walletBank } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user_id)
        .ilike('display_name', `%${detectedApp}%`)
        .limit(1)
        .maybeSingle();

      if (walletBank?.id) {
        suggested_wallet_id = walletBank.id;
      }
    }

    // 7. Sacombank PLX_ thuộc Phương tiện; các giao dịch còn lại mặc định Cá nhân.
    const isSacombank = /sacombank/i.test(detectedApp || '') ||
      /sacombank/i.test(raw_message);
    const isPlxMerchant = /\bPLX_/i.test(merchantMatch?.[1] || '');

    const categoryName = isSacombank && isPlxMerchant ? 'Phương tiện' : 'Cá nhân';
    const { data: suggestedCategory, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user_id)
        .ilike('name', categoryName)
        .limit(1)
        .maybeSingle();

    if (categoryError) throw categoryError;
    const suggested_category_id = suggestedCategory?.id || null;

    // 8. Lưu vào bảng transaction_inbox
    const { data, error } = await supabase
      .from('transaction_inbox')
      .insert([
        {
          user_id: user_id,
          raw_message: raw_message,
          parsed_amount: parsed_amount,
          parsed_type: parsed_type,
          note: note,
          suggested_wallet_id: suggested_wallet_id,
          suggested_category_id: suggested_category_id,
          sender_app: detectedApp,
          status: 'pending',
          metadata: metadata,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
