import { supabase } from '@/lib/supabase';
import { inforDeviceFirebase } from '@/lib/firebase';

export const deviceService = {
  updateDeviceToken: async (userId: string) => {
    const { fcmToken, uniqueId, deviceName } = await inforDeviceFirebase();
    const { data, error } = await supabase
      .from('devices')
      .upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          device_id: uniqueId,
          device_name: deviceName,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_id', // Nếu trùng device_id thì chỉ cập nhật fcm_token và last_seen
        },
      )
      .select();
    if (error) throw error;
    console.log('data:', data);
    return data;
  },
};
