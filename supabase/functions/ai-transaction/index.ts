import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function generateGeminiContent(apiKey: string, prompt: string) {
  // GIỮ NGUYÊN MODEL CỦA LỘC
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);

  const data = await res.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error('AI không phản hồi.');

  const cleanedText = textContent.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleanedText);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Thiếu header Authorization');

    const body = await req.json();
    const query = body.query?.trim();
    const clientTime = body.currentTime || new Date().toISOString();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Lấy userId để fix lỗi RLS (Bắt buộc phải có để insert vào bảng có RLS)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // 1. Lấy context Danh mục & Ví
    const [catsRes, walletsRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('id'),
      supabase.from('wallets').select('id, display_name').order('id'),
    ]);

    const catMap: Record<number, string> = {};
    const compactCats =
      catsRes.data
        ?.map((c, i) => {
          catMap[i] = c.id;
          return `${i}:${c.name}`;
        })
        .join('|') || '';
    const walletMap: Record<number, string> = {};
    let fallbackIdx = 0;
    const compactWallets =
      walletsRes.data
        ?.map((w, i) => {
          walletMap[i] = w.id;
          if (w.display_name.toLowerCase().includes('tiền mặt'))
            fallbackIdx = i;
          return `${i}:${w.display_name}`;
        })
        .join('|') || '';

    // 2. MASTER PROMPT - GIỮ NGUYÊN 100% CỦA LỘC
    const masterPrompt = `Câu hỏi: "${query}"
    Thời gian HIỆN TẠI: ${clientTime}
    Danh mục (c_idx:Tên): ${compactCats}
    Ví (w_idx:Tên): ${compactWallets}

    NHIỆM VỤ: Phân loại Ý ĐỊNH (intent) và trích xuất dữ liệu. 
    BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO ĐÚNG 1 TRONG 2 CẤU TRÚC MẪU SAU:

    1. NẾU LÀ CHUYỂN TIỀN / RÚT TIỀN (TRANSFER):
    {
      "intent": "TRANSFER",
      "data": { "from_w_idx": 0, "to_w_idx": 1, "amount": 500000, "note": "rút tiền mặt" }
    }

    2. NẾU LÀ GIAO DỊCH THU/CHI BÌNH THƯỜNG (TRANS_ENTRY):
    {
      "intent": "TRANS_ENTRY",
      "data": [
        { "type": "expense", "w_idx": 0, "c_idx": 2, "amount": 100000, "date": "${clientTime}", "note": "cà phê" }
      ]
    }

    QUY TẮC DỮ LIỆU:
    - ĐƠN VỊ LƯU TRỮ: Database sử dụng đơn vị "NGHÌN ĐỒNG" (k). 
      BẮT BUỘC quy đổi mọi số tiền về đơn vị này trước khi điền vào "amount".
      + "50k", "50 ngàn", "50" -> amount: 50
      + "1 triệu", "1 củ" -> amount: 1000
      + "5 lít", "500k" -> amount: 500
      + "1 xị" -> amount: 100
    - TRƯỜNG "amount": Là con số đã chia cho 1000. Không kèm chữ "k" hay ký hiệu khác.
    - VÍ (w_idx): Mặc định là index của ví "Tiền mặt". KHÔNG được để trống.
    - DANH MỤC (c_idx): Chọn index phù hợp. Nếu thu nhập -> để null.
    - TRƯỜNG "type": Chỉ được phép điền string "income" hoặc "expense".
    
    CÁCH XỬ LÝ KHI CÓ NHIỀU KHOẢN TIỀN:
    - TÁCH GIAO DỊCH: Nếu câu CÓ dấu phẩy (,) (VD: "cà phê 100k, ăn sáng 80k") -> Tạo NHIỀU object riêng biệt trong mảng 'data'.
    - GỘP GIAO DỊCH: Nếu KHÔNG CÓ dấu phẩy (VD: "lộc 45 thủy 10 20 ăn tối 90") -> Tạo DUY NHẤT 1 object trong mảng 'data'. Trường 'amount' là TỔNG CÁC SỐ (45+10+20+40+100=215) không được bỏ sót số nào, 'note' giữ nguyên toàn bộ chuỗi gốc.`;

    const aiRes = await generateGeminiContent(apiKey!, masterPrompt);

    const safeGetWalletId = (idx: any) =>
      walletMap[Number(idx)] || walletMap[fallbackIdx];
    let result;

    if (aiRes.intent === 'TRANSFER') {
      const { data, error } = await supabase.rpc('transfer_money', {
        p_user_id: userId,
        p_from_wallet_id: safeGetWalletId(aiRes.data?.from_w_idx),
        p_to_wallet_id: safeGetWalletId(aiRes.data?.to_w_idx),
        p_amount: Number(aiRes.data?.amount || 0),
        p_note: aiRes.data?.note || 'Chuyển tiền',
      });
      if (error) throw error;
      result = data;
    } else {
      const dataArray = Array.isArray(aiRes.data) ? aiRes.data : [aiRes.data];
      const rows = dataArray.map((item: any) => ({
        user_id: userId, // 🔥 THÊM DÒNG NÀY ĐỂ FIX LỖI RLS
        type: item?.type || 'expense',
        wallet_id: safeGetWalletId(item?.w_idx),
        category_id: item?.c_idx !== null ? catMap[Number(item?.c_idx)] : null,
        amount: Number(item?.amount || 0),
        date: item?.date || clientTime,
        note: item?.note || query,
      }));
      const { data, error } = await supabase
        .from('transactions')
        .insert(rows)
        .select();
      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
