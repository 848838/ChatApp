import React from 'react';
import { View, Button } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { SafeAreaView } from 'react-native-safe-area-context';

const TestNotification = () => {
  const sendNotification = () => {
    console.log('Sending Notification...');
    PushNotification.localNotification({
      title: 'Test Notification',
      message: 'This is a test notification!',
      playSound: true,
      soundName: 'default',
    });
    console.log('Notification sent!');
  };

  return (
    <SafeAreaView style={{marginTop:30}}>
      <Button title="Send Test Notification" onPress={sendNotification} />
    </SafeAreaView>
  );
};

export default TestNotification;
