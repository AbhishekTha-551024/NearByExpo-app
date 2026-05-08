import Constants from 'expo-constants';
import { Platform } from 'react-native';

let notificationsInitialized = false;

const initNotifications = () => {
  if (Constants.appOwnership === 'expo' || notificationsInitialized) return;
  
  const Notifications = require('expo-notifications');
  
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  
  notificationsInitialized = true;
};

/**
 * Requests permission and gets the Expo Push Token for the device.
 */
export async function registerForPushNotificationsAsync() {
  // Expo Go (SDK 53+) no longer supports remote push notifications.
  if (Constants.appOwnership === 'expo') {
    console.log('Skipping push registration: Expo Go does not support remote push notifications.');
    return null;
  }

  initNotifications();
  const Notifications = require('expo-notifications');
  const Device = require('expo-device');
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8F00FF',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
      if (!projectId) {
         token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
         token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
      
      console.log("Expo Push Token:", token);
    } catch (e) {
      console.log("Error getting push token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Sends a push notification directly to an Expo Push Token via the Expo API.
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  // Disable client-side trigger if running in Expo Go
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
}
