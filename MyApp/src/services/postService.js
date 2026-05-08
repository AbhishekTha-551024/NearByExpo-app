import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  where 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase";

export const PostService = {
  /**
   * Upload image to Firebase Storage
   */
  uploadImage: async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `posts/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Image Upload Error:", error);
      throw error;
    }
  },
  /**
   * Create a new community post
   */
  createPost: async (userId, userName, postData) => {
    try {
      const docRef = await addDoc(collection(db, "posts"), {
        userId,
        userName,
        title: postData.title,
        description: postData.description,
        type: postData.type, // 'buy', 'sell', 'offer', 'trade'
        price: postData.price || null,
        location: postData.location, // { latitude, longitude, neighborhood }
        image: postData.image || null,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time feed updates
   */
  subscribeToFeed: (callback) => {
    const q = query(
      collection(db, "posts"), 
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(posts);
    });
  }
};
