import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Chỉ nhận diện từ nội dung khi thiếu sender_app.
    const senderApp = sender_app?.trim() || null;
    const bankSource = senderApp || raw_message;
    const isSacombank = /sacombank/i.test(bankSource);
    const isMBBank =
      !isSacombank &&
      (/mb\s*bank/i.test(bankSource) ||
        (!senderApp && raw_message.includes('|GD:')));
    const detectedApp = isSacombank
      ? 'Sacombank'
      : isMBBank
      ? 'MBBank'
      : senderApp;

    // Dấu + phải đi kèm số tiền để không nhầm hotline ngân hàng.
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

    // Ranh giới Unicode tránh nhận nhầm chữ Đ trong nội dung thành đơn vị tiền.
    const amountMatch = raw_message.match(
      /(?:giao\s*d[ịi]ch|gd|s[ốo]\s*ti[ềe]n|thanh\s*to[áa]n|chuy[ểe]n\s*(?:kho[ảa]n|ti[ềe]n)?|chuy[ểe]n\s*th[àa]nh\s*c[ôo]ng)[\s:]*([+-])?\s*([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
    );

    let parsed_amount: number | null = null;
    const parsed_type: 'expense' | 'income' = 'expense';

    if (amountMatch) {
      const amountStr = (amountMatch[2] || amountMatch[1] || '').replace(
        /[,.]/g,
        '',
      );
      if (amountStr) parsed_amount = parseFloat(amountStr);
    }

    if (!parsed_amount) {
      const minusMatch = raw_message.match(
        /(?:-\s*|tr[ừu]\s*)([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
      );
      if (minusMatch) {
        parsed_amount = parseFloat(minusMatch[1].replace(/[,.]/g, ''));
      }
    }

    if (!parsed_amount) {
      const beforeBalance = raw_message.split(
        /(?:SD|S[ốo]\s*d[ưu]|H[ạa]n\s*m[ứu]c)/i,
      )[0];
      const fallbackAmountMatch = beforeBalance.match(
        /([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
      );
      if (fallbackAmountMatch) {
        parsed_amount = parseFloat(fallbackAmountMatch[1].replace(/[,.]/g, ''));
      }
    }

    if (!parsed_amount || parsed_amount <= 0) {
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
    // Lưu số tiền theo đơn vị nghìn đồng của ứng dụng.
    if (parsed_amount >= 1000) {
      parsed_amount = Math.round(parsed_amount / 1000);
    }

    let note: string | null = null;
    const merchantMatch = raw_message.match(
      /t[ạa]i\s+([\s\S]+?)(?:\.\s*M[ãa]|\.|$|M[ãa]\s*giao\s*d[ịi]ch)/i,
    );
    const ndMatch = raw_message.match(
      /(?:ND|Noi dung|Ref):\s*(.+?)(?:\||\.|$)/i,
    );

    if (merchantMatch) {
      note = merchantMatch[1].replace(/\s+/g, ' ').replace(/\.+$/, '').trim();
    } else if (ndMatch) {
      note = ndMatch[1].trim();
    } else {
      note = detectedApp ? `Chi tiêu ${detectedApp}` : 'Giao dịch chi tiêu';
    }

    const cardMatch = raw_message.match(
      /(?:th[ẻe]|card)[\s\S]{1,60}?(\d{4})\b/i,
    );
    const cardLast4 = cardMatch ? cardMatch[1] : null;

    const txnCodeMatch = raw_message.match(
      /(?:M[ãa]\s*giao\s*d[ịi]ch|M[ãa]\s*GD|Ref|Trace|S[ốo]\s*tham\s*chi[ếe]u)[:\s]*([A-Za-z0-9/]+)/i,
    );
    const bankTxnId = txnCodeMatch ? txnCodeMatch[1].trim() : null;

    const balanceMatch = raw_message.match(
      /(?:SD|S[ốo]\s*d[ưu]|H[ạa]n\s*m[ứu]c\s*kh[ảa]\s*d[ụu]ng)[:\s]*([\d,.]+)\s*(?:VND|đ|d)(?![\p{L}\p{N}_])/iu,
    );
    const balanceAfter = balanceMatch
      ? parseFloat(balanceMatch[1].replace(/[,.]/g, ''))
      : null;

    const accountMatch = raw_message.match(/TK\s*([A-Za-z0-9xX]+)/i);
    const accountNumber = accountMatch ? accountMatch[1] : null;

    const metadata = {
      card_last4: cardLast4,
      account_number: accountNumber,
      bank_txn_id: bankTxnId,
      balance_after: balanceAfter,
      original_amount_vnd: rawVndAmount,
      merchant: merchantMatch ? merchantMatch[1].trim() : null,
      sender_app: detectedApp || null,
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Escape _ để ILIKE không coi là ký tự đại diện.
    const walletName = isMBBank
      ? 'MBBANK_9999'
      : isSacombank
      ? 'Sacombank'
      : null;
    let suggested_wallet_id: string | null = null;
    if (walletName) {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user_id)
        .ilike('display_name', walletName.replace(/_/g, '\\_'))
        .limit(1)
        .maybeSingle();

      if (walletError) throw walletError;
      suggested_wallet_id = wallet?.id || null;
    }

    const isPlxMerchant = /PLX/i.test(raw_message);
    const categoryName = isMBBank
      ? 'Ăn uống'
      : isSacombank && isPlxMerchant
      ? 'Phương tiện'
      : 'Cá nhân';
    const { data: suggestedCategory, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .ilike('name', categoryName)
      .limit(1)
      .maybeSingle();

    if (categoryError) throw categoryError;
    const suggested_category_id = suggestedCategory?.id || null;

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
