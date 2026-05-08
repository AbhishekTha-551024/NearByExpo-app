import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA82JtyYU6ihmTtqPcZDqhkXkJpZRuKI8k",
  authDomain: "testting-8b168.firebaseapp.com",
  projectId: "testting-8b168",
  storageBucket: "testting-8b168.firebasestorage.app",
  messagingSenderId: "133534576673",
  appId: "1:133534576673:web:2d7cbbde3bb52602bb3360"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with clear persistence
// We use a pattern that ensures initializeAuth is called if needed
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If already initialized, get the existing instance
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
