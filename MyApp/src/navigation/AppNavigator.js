import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import PostScreen from '../screens/PostScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import MapDiscoveryScreen from '../screens/MapDiscoveryScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GuidelinesScreen from '../screens/GuidelinesScreen';
import GroupChatScreen from '../screens/GroupChatScreen';

const AppNavigator = () => {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Post" 
        component={PostScreen} 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MapDiscovery" 
        component={MapDiscoveryScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Guidelines" 
        component={GuidelinesScreen} 
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen 
        name="GroupChat" 
        component={GroupChatScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
