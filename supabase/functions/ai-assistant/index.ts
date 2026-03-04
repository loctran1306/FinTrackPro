import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// 🚀 Hàm gọi Gemini tối ưu JSON Mode cực kỳ an toàn (Gemini 3.0)
async function generateGeminiContent(
  apiKey: string,
  prompt: string,
  requireJson = true,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const payload: any = { contents: [{ parts: [{ text: prompt }] }] };
  if (requireJson)
    payload.generationConfig = { responseMimeType: 'application/json' };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Gemini API Error: ${data.error.message}`);

  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error('Empty response from Gemini');

  if (requireJson) {
    try {
      textContent = textContent.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(textContent);
    } catch (parseError) {
      console.error('Lỗi Parse JSON:', textContent);
      throw new Error(`Failed to parse AI output: ${parseError.message}`);
    }
  }
  return textContent;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { query } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY')!;
    const currentTime = new Date().toISOString();

    // ⚡ BƯỚC 1: LẤY DATA NGAY LẬP TỨC (Khoảng 20ms - Rất nhanh)
    const [{ data: cats }, { data: wallets }] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase.from('wallets').select('id, display_name'),
    ]);

    // ⚡ BƯỚC 2: NÉN DATA THÀNH INDEX MAPPING
    const catMap: Record<number, string> = {};
    const compactCats =
      cats
        ?.map((c, idx) => {
          catMap[idx] = c.id;
          return `${idx}:${c.name}`;
        })
        .join('|') || '';

    const walletMap: Record<number, string> = {};
    const compactWallets =
      wallets
        ?.map((w, idx) => {
          walletMap[idx] = w.id;
          return `${idx}:${w.display_name}`;
        })
        .join('|') || '';

    // 🔥 BƯỚC 3: PROMPT TỔNG HỢP (MASTER PROMPT)
    // Yêu cầu AI vừa phân loại, vừa format dữ liệu theo đúng chuẩn
    const masterPrompt = `Câu hỏi: "${query}"
    Thời gian HIỆN TẠI: ${currentTime}
    Danh mục (c_idx:Tên): ${compactCats}
    Ví (w_idx:Tên): ${compactWallets}

    NHIỆM VỤ: Phân loại Ý ĐỊNH (intent) và trích xuất dữ liệu. BẮT BUỘC TRẢ VỀ JSON THEO ĐÚNG 1 TRONG 3 CẤU TRÚC SAU:

    1. NẾU INTENT LÀ "ANALYZE" (hỏi về báo cáo, tổng kết, hỏi số tiền đã tiêu):
    { "intent": "ANALYZE", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }

    2. NẾU INTENT LÀ "TRANSFER" (rút tiền, chuyển tiền giữa các ví):
    { "intent": "TRANSFER", "data": { "from_w_idx": <số>, "to_w_idx": <số>, "amount": <số tiền>, "note": "lý do" } }

    3. NẾU INTENT LÀ "TRANS_ENTRY" (thêm giao dịch chi tiêu/thu nhập bình thường):
    { "intent": "TRANS_ENTRY", "data": [{ "type": "income" hoặc "expense", "w_idx": <số>, "c_idx": <số hoặc null>, "amount": <số tiền>, "date": "YYYY-MM-DDTHH:mm:ss.SSSZ", "note": "ghi chú" }] }

    QUY TẮC DỮ LIỆU (CẤM LÀM SAI):
    - SỐ TIỀN: củ/triệu=1000, lít/trăm=100, xị=10. (VD: "50k" -> 50, "2 củ" -> 2000).
    - VÍ (w_idx): BẮT BUỘC chọn số index của ví. Mặc định là index ví "Tiền mặt". KHÔNG ĐỂ TRỐNG.
    - DANH MỤC (c_idx): Chọn số index danh mục. Thu nhập (income) -> null.
    - GHI NHANH CHUỖI SỐ (VD "lộc 45 thủy 10 20"): Bắt buộc tạo DUY NHẤT 1 item (TRANS_ENTRY), amount là TỔNG các số cộng lại, type="expense", chọn index "Ăn uống".`;

    // 🚀 GỌI LLM LẦN 1 (Giải quyết 90% lượng request)
    const aiResponse = await generateGeminiContent(apiKey, masterPrompt, true);
    const intent = aiResponse.intent;
    let finalResult;

    // --- XỬ LÝ KẾT QUẢ TỪ AI ---
    if (intent === 'TRANSFER') {
      finalResult = {
        p_from_wallet_id: walletMap[aiResponse.data.from_w_idx],
        p_to_wallet_id: walletMap[aiResponse.data.to_w_idx],
        p_amount: aiResponse.data.amount,
        p_note: aiResponse.data.note,
      };
    } else if (intent === 'TRANS_ENTRY') {
      finalResult = aiResponse.data.map((item: any) => ({
        type: item.type,
        wallet_id: walletMap[item.w_idx] || Object.values(walletMap)[0], // Fallback an toàn lấy ví đầu tiên
        category_id: item.c_idx !== null ? catMap[item.c_idx] : null,
        amount: item.amount,
        date: item.date || currentTime,
        note: item.note,
      }));
    } else if (intent === 'ANALYZE') {
      // ⚠️ GỌI LLM LẦN 2 (Chỉ xảy ra nếu user hỏi phân tích báo cáo)
      const { data: history } = await supabase
        .from('transactions')
        .select('amount, date, note, categories(name)')
        .gte('date', aiResponse.start_date || '2025-01-01')
        .lte('date', aiResponse.end_date || currentTime)
        .order('date', { ascending: false })
        .limit(150);

      const historyStr =
        history
          ?.map(
            h =>
              `${h.date.split('T')[0]}|${h.amount}|${
                h.categories?.name || 'Khác'
              }|${h.note}`,
          )
          .join('\n') || '';

      const analyzePrompt = `Lịch sử (Ngày|Tiền|Mục|Ghi chú): \n${historyStr}\n\nĐánh giá chi tiêu cho: "${query}".`;

      finalResult = await generateGeminiContent(apiKey, analyzePrompt, false);
    }

    return new Response(JSON.stringify({ intent, data: finalResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
