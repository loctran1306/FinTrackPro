import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
// Sử dụng trực tiếp npm specifier để tránh lỗi không tìm thấy module local
import { JWT } from 'google-auth';

serve(async _req => {
  try {
    // 1. Lấy Config từ Secrets (Đảm bảo Lộc đã set FIREBASE_CONFIG trong Supabase Dashboard)
    const firebaseConfig = JSON.parse(Deno.env.get('FIREBASE_CONFIG') || '{}');

    if (!firebaseConfig.client_email || !firebaseConfig.private_key) {
      throw new Error('Thiếu cấu hình Firebase trong Secrets');
    }

    // 2. Khởi tạo JWT Client để lấy Access Token cho Firebase V1
    const auth = new JWT({
      email: firebaseConfig.client_email,
      key: firebaseConfig.private_key.replace(/\\n/g, '\n'), // Fix lỗi xuống dòng của private_key
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse.token;

    // 3. Khởi tạo Supabase Client với Service Role Key để có quyền đọc bảng devices
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 4. Truy vấn bảng 'devices' mà Lộc đã thiết lập để gửi cho đa thiết bị
    const { data: devices, error: dbError } = await supabase
      .from('devices')
      .select('fcm_token')
      .not('fcm_token', 'is', null);

    if (dbError) throw dbError;
    if (!devices || devices.length === 0)
      return new Response('No tokens found', { status: 200 });

    // 5. Gửi thông báo chuẩn V1 API
    const PROJECT_ID = firebaseConfig.project_id;
    const sendPromises = devices.map(device =>
      fetch(
        `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: device.fcm_token,
              notification: {
                title: 'FinTrackPro 📝',
                body: 'Đã 9h tối, Lộc ơi vào nhập chi tiêu thôi!',
              },
              android: {
                priority: 'high', // Ưu tiên cao nhất
                notification: {
                  channel_id: 'fintrackpro_channel', // Tên bất kỳ nhưng nên đặt rõ ràng
                  sound: 'default',
                  click_action: 'TOP_STORY_ACTIVITY', // Giúp nhấn vào thông báo là mở app
                },
              },
              apns: {
                payload: { aps: { sound: 'default' } },
              },
            },
          }),
        },
      ),
    );

    const results = await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({ success: true, sent_count: results.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err: any) {
    console.error('Lỗi gửi thông báo:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
