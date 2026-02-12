/**
 * @format
 */
import notifee, { EventType } from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Bắt buộc phải có để nhận diện tương tác khi app tắt
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification: _notification, pressAction: _pressAction } = detail;

  if (type === EventType.PRESS) {
    console.log('User nhấn vào thông báo trên iOS');
  }
});

AppRegistry.registerComponent(appName, () => App);
