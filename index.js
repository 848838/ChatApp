import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';
import TestNotification from './Components/TestNotification';

AppRegistry.registerComponent(appName, () => App);
PushNotification.configure({
    onRegister: function (token) {
      console.log('TOKEN:', token);
    },
    onNotification: function (notification) {
      console.log('Received NOTIFICATION:', notification);
  
      // Ensure notification.finish is called, especially on iOS
  
        notification.finish(PushNotificationIOS.FetchResult.NoData);
  
    },
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    popInitialNotification: true, // Handle any notification that app was launched from
    requestPermissions: Platform.OS==='ios' // Ensure permissions are requested on iOS/macOS
  });
  