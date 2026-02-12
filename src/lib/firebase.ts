import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getToken,
} from '@react-native-firebase/messaging';
import {
  getMessaging,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';
import { getDeviceName, getModel, getUniqueId } from 'react-native-device-info';

export const registerNotificationFirebase = async () => {
  const app = getApp();
  const messaging = getMessaging(app);
  try {
    await registerDeviceForRemoteMessages(messaging);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('Push registration failed:', message);
    return null;
  }

  // 1. Xin quyền thông báo (bắt buộc trên iOS)
  const authStatus = await requestPermission(messaging);
  console.log('authStatus:', authStatus);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // 2. Lấy Token từ Firebase
    const token = await getToken(messaging);
    console.log('Token:', token);
    return token;
  }
  return null;
};

export const inforDeviceFirebase = async () => {
  const app = getApp();
  const messaging = getMessaging(app);
  const fcmToken = await getToken(messaging);
  const uniqueId = await getUniqueId();
  const deviceName = getModel();
  return { fcmToken, uniqueId, deviceName };
};
