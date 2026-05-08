import { doc, setDoc, getDoc, serverTimestamp, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { geohashForLocation } from 'geofire-common';
import { LocationService } from "./locationService";

export const UserService = {
  /**
   * Create user profile in Firestore (Task 1: Anonymous Support)
   */
  createUserProfile: async (user, extraData = {}) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const anonymousName = extraData.name || UserService.generateAnonymousName();
      
      const profile = {
        uid: user.uid,
        email: user.email,
        name: anonymousName,
        profileImage: extraData.profileImage || `https://api.dicebear.com/7.x/avataaars/png?seed=${user.uid}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isVisible: true, // Default to visible
      };

      if (extraData.latitude && extraData.longitude) {
        const loc = await LocationService.getLocationDetails(extraData.latitude, extraData.longitude);
        profile.location = {
          latitude: extraData.latitude,
          longitude: extraData.longitude,
          geohash: geohashForLocation([extraData.latitude, extraData.longitude]),
          city: loc.city,
          area: loc.area,
          updatedAt: new Date().toISOString()
        };
      }
      
      await setDoc(userRef, profile);
      return { success: true, name: anonymousName };
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  /**
   * Helper: Generate Random Anonymous Name
   */
  generateAnonymousName: () => {
    const adjectives = ["Shadow", "Storm", "Frost", "Midnight", "Solar", "Deep", "Silent", "Neon", "Dusty", "Glitch"];
    const nouns = ["Walker", "Runner", "Strider", "Seeker", "Gazer", "Traveler", "Ghost", "Pilot", "Drifter", "Spark"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${adj} ${noun} #${num}`;
  },

  /**
   * Fetch user profile from Firestore
   */
  getUserProfile: async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  },

  /**
   * Update existing user profile
   */
  updateUserProfile: async (uid, data) => {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  /**
   * Task 1: Update user location with geohash
   */
  saveUserLocation: async (userId, latitude, longitude) => {
    try {
      const geohash = geohashForLocation([latitude, longitude]);
      const loc = await LocationService.getLocationDetails(latitude, longitude);
      const userRef = doc(db, "users", userId);
      
      const updateData = {
        location: {
          latitude,
          longitude,
          geohash,
          city: loc.city,
          area: loc.area,
          updatedAt: new Date().toISOString()
        }
      };
      
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, location: updateData.location };
    } catch (error) {
      console.error("Error saving user location:", error);
      throw error;
    }
  },

  /**
   * Ghost Mode: Toggle visibility in discovery
   */
  toggleVisibility: async (userId, isVisible) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isVisible,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error toggling visibility:", error);
      throw error;
    }
  },

  /**
   * Identity Shuffle: Regenerate Anonymous Name and Avatar
   */
  shuffleIdentity: async (userId) => {
    try {
      const newName = UserService.generateAnonymousName();
      const newAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${Math.random().toString(36).substring(7)}`;
      const userRef = doc(db, "users", userId);
      
      await updateDoc(userRef, {
        name: newName,
        profileImage: newAvatar,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, name: newName, profileImage: newAvatar };
    } catch (error) {
      console.error("Error shuffling identity:", error);
      throw error;
    }
  },

  /**
   * Avatar Shuffle: Only regenerate the profile image
   */
  shuffleAvatar: async (userId) => {
    try {
      const newAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${Math.random().toString(36).substring(7)}`;
      const userRef = doc(db, "users", userId);
      
      await updateDoc(userRef, {
        profileImage: newAvatar,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, profileImage: newAvatar };
    } catch (error) {
      console.error("Error shuffling avatar:", error);
      throw error;
    }
  }
  ,

  /**
   * Presence: update online/offline + last active
   */
  setPresence: async (userId, isOnline) => {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          isOnline: !!isOnline,
          lastActiveAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true };
    } catch (error) {
      console.error("Error setting presence:", error);
      // don't throw; presence should never break UX
      return { success: false };
    }
  },
  /**
   * Update user bio
   */
  updateBio: async (userId, bio) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        bio,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating bio:", error);
      throw error;
    }
  },
  /**
   * Update user current vibe/status
   */
  updateVibe: async (userId, vibe) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        vibe,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating vibe:", error);
      throw error;
    }
  },
  /**
   * Get real-time stats for the user dashboard
   */
  getStats: async (userId) => {
    try {
      const { collection, query, where, getCountFromServer } = require('firebase/firestore');
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", userId));
      const snapshot = await getCountFromServer(q);
      
      return {
        chatCount: snapshot.data().count,
        trustScore: 100, // Default for now
        radius: 10, // Default 10km
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { chatCount: 0, trustScore: 100, radius: 10 };
    }
  },

  /**
   * Block a user
   */
  blockUser: async (currentUserId, targetUserId) => {
    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(targetUserId),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  },

  /**
   * Report a user
   */
  reportUser: async (currentUserId, targetUserId, reason) => {
    try {
      const reportsRef = collection(db, "reports");
      await addDoc(reportsRef, {
        reporterId: currentUserId,
        reportedUserId: targetUserId,
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error reporting user:", error);
      throw error;
    }
  },

  /**
   * Update anonymous name manually
   */
  updateName: async (userId, newName) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name: newName,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating name:", error);
      throw error;
    }
  },

  /**
   * Completely delete the user account and all their data
   */
  deleteAccount: async (userId) => {
    try {
      const { deleteUser, getAuth } = await import('firebase/auth');
      const { query, where, getDocs, writeBatch } = await import('firebase/firestore');
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error("No authenticated user found for deletion.");
      }

      const batch = writeBatch(db);

      // 1. Delete all posts by user
      const postsQ = query(collection(db, "posts"), where("authorId", "==", userId));
      const postSnaps = await getDocs(postsQ);
      postSnaps.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 2. Delete user profile
      batch.delete(doc(db, "users", userId));

      // Execute batch deletion
      await batch.commit();

      // 3. Delete auth account
      await deleteUser(currentUser);

      return { success: true };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }
};
