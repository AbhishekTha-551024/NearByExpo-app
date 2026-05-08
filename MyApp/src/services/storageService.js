import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const StorageService = {
  /**
   * Upload an image from a local URI securely using XHR Blob conversion
   * @param {string} path - Storage path (e.g., 'chats/images/')
   * @param {string} uri - Local file URI from ImagePicker
   * @returns {Promise<string>} - Download URL
   */
  uploadImageAsync: async (path, uri) => {
    try {
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const fullPath = `${path}${filename}`;
      const storageRef = ref(storage, fullPath);
      
      // Convert URI to Blob using XHR (Robust for Expo/React Native)
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          resolve(xhr.response);
        };
        xhr.onerror = function(e) {
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      
      await uploadBytes(storageRef, blob);
      
      // We're done with the blob, close it
      if (blob.close) {
        blob.close();
      }

      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Storage upload error:", error);
      throw error;
    }
  }
};
