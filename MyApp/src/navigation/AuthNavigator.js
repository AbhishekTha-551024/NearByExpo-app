import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const [isFirstTime, setIsFirstTime] = React.useState(null);

  React.useEffect(() => {
    AsyncStorage.getItem('@hasSeenOnboarding').then(val => {
      setIsFirstTime(val === null);
    });
  }, []);

  if (isFirstTime === null) return null;

  return (
    <Stack.Navigator
      initialRouteName={isFirstTime ? "Onboarding" : "Login"}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
