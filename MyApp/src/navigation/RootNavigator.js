import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LocationOnboardingScreen from '../screens/LocationOnboardingScreen';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';

const RootNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);

  // The splash screen covers everything until its animation is done AND auth finishes loading
  const showSplash = !isSplashAnimationComplete || isLoading;

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {isAuthenticated ? (
          user?.geohash ? <AppNavigator /> : <LocationOnboardingScreen />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
      
      {showSplash && (
        <AnimatedSplashScreen 
          onAnimationComplete={() => setIsSplashAnimationComplete(true)} 
        />
      )}
    </View>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
