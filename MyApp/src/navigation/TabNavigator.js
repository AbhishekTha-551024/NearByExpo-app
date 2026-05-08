import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NearbyScreen from '../screens/NearbyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/ChatListScreen';

import FeedScreen from '../screens/FeedScreen';

const Tab = createBottomTabNavigator();

const DARK_BG = '#0A0A0A';
const PRIMARY = '#BB86FC';

const TabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Pulse') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'Nearby') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: DARK_BG,
          borderTopColor: '#1A1A1A',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      })}
    >
      <Tab.Screen 
        name="Pulse" 
        component={FeedScreen} 
      />
      <Tab.Screen 
        name="Nearby" 
        component={NearbyScreen} 
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
