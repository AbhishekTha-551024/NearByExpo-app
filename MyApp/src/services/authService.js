import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithCredential
} from "firebase/auth";
import { auth } from "../config/firebase";
import { UserService } from "./userService";

export const AuthService = {
  /**
   * Log in with Google credential
   */
  loginWithGoogle: async (idToken) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user exists in Firestore
      let userData = await UserService.getUserProfile(user.uid);
      
      if (!userData) {
        // Create new user profile if first time
        userData = {
          name: user.displayName || 'Google User',
        };
        await UserService.createUserProfile(user, userData);
      }

      return { user: { ...user, ...userData } };
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },
  /**
   * Log in an existing user
   */
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Fetch additional user data from Firestore
      const userData = await UserService.getUserProfile(user.uid);
      return { user: { ...user, ...userData } };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Register a new user
   */
  register: async (name, email, password, location) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData = {
        name,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };
      
      // Save profile to Firestore
      await UserService.createUserProfile(user, userData);
      
      return { user: { ...user, ...userData } };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Log out the current user
   */
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    }
  }
};
