import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { AuthService } from "../services/authService";
import { UserService } from "../services/userService";
import { LocationService } from "../services/locationService";
import { registerForPushNotificationsAsync } from "../utils/notifications";

const AuthContext = React.createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const appState = React.useRef(AppState.currentState);

  React.useEffect(() => {
    let isMounted = true;

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // If logged in, fetch full user data from Firestore
          const userData = await UserService.getUserProfile(firebaseUser.uid);
          if (isMounted) {
            setUser({ ...firebaseUser, ...userData });
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth State Error:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!user?.uid) return;

    let heartbeat = null;

    const setOnline = () => UserService.setPresence(user.uid, true);
    const setOffline = () => UserService.setPresence(user.uid, false);

    // initial online + heartbeat
    setOnline();
    heartbeat = setInterval(setOnline, 25_000);

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;

      // When app goes background/inactive -> offline
      if (prev === 'active' && next !== 'active') {
        setOffline();
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
      }

      // When app comes active -> online + restart heartbeat
      if (next === 'active') {
        setOnline();
        if (!heartbeat) heartbeat = setInterval(setOnline, 25_000);
      }
    });

    return () => {
      if (heartbeat) clearInterval(heartbeat);
      sub.remove();
      setOffline();
    };
  }, [user?.uid]);

  React.useEffect(() => {
    if (!user?.uid) return;

    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          // Save the push token to Firestore so Cloud Functions can target this device
          await UserService.updateUserProfile(user.uid, { pushToken: token });
        }
      } catch (error) {
        console.error("Notification setup error:", error);
      }
    };

    setupNotifications();
  }, [user?.uid]);

  const login = async (email, password) => {
    try {
      const result = await AuthService.login(email, password);
      // user will be set by onAuthStateChanged
      return result;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password, location) => {
    try {
      const result = await AuthService.register(name, email, password, location);
      // user will be set by onAuthStateChanged
      return result;
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      const result = await AuthService.loginWithGoogle(idToken);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      throw error;
    }
  };

  const updateUserData = (newData) => {
    setUser(prev => prev ? { ...prev, ...newData } : null);
  };

  const refreshLocation = async () => {
    try {
      const coords = await LocationService.getCurrentLocation();
      const details = await LocationService.getLocationDetails(coords.latitude, coords.longitude);
      const locationData = {
        ...coords,
        ...details,
        updatedAt: new Date().toISOString()
      };

      if (user?.uid) {
        await UserService.updateUserProfile(user.uid, { location: locationData });
        updateUserData({ location: locationData });
      }
      return locationData;
    } catch (error) {
      console.error("Error refreshing fixed location:", error);
      throw error;
    }
  };

  const blockUserLocally = async (targetUserId) => {
    if (!user) return;
    try {
      await UserService.blockUser(user.uid, targetUserId);
      const currentBlocked = user.blockedUsers || [];
      if (!currentBlocked.includes(targetUserId)) {
        updateUserData({ blockedUsers: [...currentBlocked, targetUserId] });
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading, 
        login, 
        register,
        loginWithGoogle,
        logout,
        updateUserData,
        refreshLocation,
        blockUserLocally
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
