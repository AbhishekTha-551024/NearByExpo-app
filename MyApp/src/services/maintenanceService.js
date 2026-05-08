import { collection, getDocs, writeBatch, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";

export const MaintenanceService = {
  /**
   * DANGER: This will delete ALL posts, rooms, and messages in the database.
   * Only for development use to clear out testing data.
   */
  clearAllTestData: async () => {
    try {
      console.log("Starting full database purge...");
      
      const collections = ["posts", "location_rooms", "chats", "reports"];
      
      for (const colName of collections) {
        await MaintenanceService.deleteCollection(colName);
      }
      
      console.log("Database purged successfully.");
      return { success: true };
    } catch (error) {
      console.error("Purge failed:", error);
      throw error;
    }
  },

  /**
   * Helper to delete all documents in a collection (including subcollections)
   */
  deleteCollection: async (colPath) => {
    const q = query(collection(db, colPath), limit(500));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    
    for (const docSnap of snapshot.docs) {
      // If it's a chat or room, we also need to clear its messages subcollection
      if (colPath === 'chats' || colPath === 'location_rooms' || colPath === 'posts') {
        const subMsgs = await getDocs(collection(db, `${colPath}/${docSnap.id}/${colPath === 'posts' ? 'comments' : 'messages'}`));
        subMsgs.forEach(subDoc => batch.delete(subDoc.ref));
      }
      
      batch.delete(docSnap.ref);
    }
    
    await batch.commit();
    
    // If there's more data, recurse (Firestore limit is 500 per batch)
    if (snapshot.docs.length >= 500) {
      await MaintenanceService.deleteCollection(colPath);
    }
  }
};
