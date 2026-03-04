import notifee, {
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
} from '@notifee/react-native';

export const scheduleDailyReminder = async () => {
  // 1. Xin quyền
  await notifee.requestPermission();

  // 2. Tạo Channel cho Android (Bắt buộc)
  await notifee.createChannel({
    id: 'reminder-channel',
    name: 'Nhắc nhở hàng ngày',
    importance: AndroidImportance.HIGH,
  });

  // 3. Thiết lập thời gian 20:00
  const date = new Date(Date.now());
  date.setHours(20);
  date.setMinutes(0);
  date.setSeconds(0);

  if (Date.now() >= date.getTime()) {
    date.setDate(date.getDate() + 1); // Lưu ý: Chỗ này cộng 1 ngày nhé, không phải 11
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: true,
  };

  // 4. Tạo thông báo
  await notifee.createTriggerNotification(
    {
      id: 'daily-reminder',
      title: 'Đã đến 8 giờ tối rồi!',
      body: 'Đừng quên ghi lại các khoản chi tiêu hôm nay nhé 📝',
      android: {
        channelId: 'reminder-channel',
        pressAction: { id: 'default' },
      },
    },
    trigger as TimestampTrigger,
  );
};
