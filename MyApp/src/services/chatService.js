import { 
  collection, 
  addDoc, 
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  limit,
  increment,
  deleteDoc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { sendPushNotification } from "../utils/notifications";

export const ChatService = {
  /**
   * Chat ID: deterministic for 1:1 chats
   */
  buildChatId: (user1, user2) => {
    if (!user1 || !user2) throw new Error("Both user IDs are required.");
    return [user1, user2].sort().join('_');
  },

  /**
   * Ensure parent chat doc exists (for inbox + metadata)
   */
  ensureChatExists: async (chatId, participants) => {
    const chatRef = doc(db, "chats", chatId);
    const snap = await getDoc(chatRef);
    if (snap.exists()) return;

    await setDoc(chatRef, {
      participants,
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageTimestamp: serverTimestamp(),
      lastSenderId: null,
      lastReadBy: participants,
    }, { merge: true });
  },

  /**
   * Send a new message and update chat metadata
   */
  sendMessage: async (chatId, senderId, text, clientMessageId, imageUrl) => {
    try {
      const chatRef = doc(db, "chats", chatId);
      
      // 1. Add message to sub-collection
      const msgRef = await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId,
        text: text || "",
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        clientMessageId: clientMessageId || null,
      });

      // 2. Update parent chat document for Inbox listing
      await setDoc(chatRef, {
        lastMessage: imageUrl ? "📷 Photo" : text,
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: senderId,
        lastReadBy: [senderId],
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 3. Trigger Client-Side Push Notification
      try {
        const recipientId = chatId.split('_').find(id => id !== senderId);
        if (recipientId) {
          const recipientRef = doc(db, "users", recipientId);
          const senderRef = doc(db, "users", senderId);
          
          const [recipientSnap, senderSnap] = await Promise.all([
            getDoc(recipientRef),
            getDoc(senderRef)
          ]);

          if (recipientSnap.exists() && senderSnap.exists()) {
            const recipientData = recipientSnap.data();
            const senderData = senderSnap.data();

            if (recipientData.pushToken) {
              await sendPushNotification(
                recipientData.pushToken,
                senderData.name || "A Neighbor",
                text,
                { chatId, senderName: senderData.name } // Payload for deep linking later
              );
            }
          }
        }
      } catch (pushError) {
        console.error("Failed to trigger push notification:", pushError);
        // Best effort: don't fail the message send if push fails
      }

      return msgRef.id;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  /**
   * Subscribe to messages in a specific chat
   */
  subscribeToMessages: (chatId, callback, onError) => {
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy("createdAt", "desc"),
      limit(100) // Reduced limit for performance
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(messages);
      },
      (error) => {
        console.error("Messages snapshot error:", error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Subscribe to the user's inbox (all active chats)
   */
  subscribeToInbox: (userId, callback) => {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side to avoid needing a Firestore composite index
      const sortedChats = chats.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.seconds || 0;
        const timeB = b.lastMessageTimestamp?.seconds || 0;
        return timeB - timeA;
      });

      callback(sortedChats);
    });
  },

  /**
   * Typing indicator with basic throttling logic
   */
  typingCache: new Map(),

  setTyping: async (chatId, userId, isTyping) => {
    const cacheKey = `${chatId}_${userId}`;
    const now = Date.now();
    const lastUpdate = ChatService.typingCache.get(cacheKey) || 0;

    // Throttle: don't update if it's the same value and within 3 seconds
    if (isTyping && now - lastUpdate < 3000) return;

    try {
      const chatRef = doc(db, "chats", chatId);
      await setDoc(
        chatRef,
        {
          typing: {
            [userId]: {
              isTyping: !!isTyping,
              at: now,
            },
          },
        },
        { merge: true }
      );
      ChatService.typingCache.set(cacheKey, now);
    } catch (error) {
      // Best-effort
    }
  },

  subscribeToChatMeta: (chatId, callback, onError) => {
    const chatRef = doc(db, "chats", chatId);
    return onSnapshot(
      chatRef,
      (snap) => callback(snap.exists() ? snap.data() : null),
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  /**
   * Mark a chat as read by a specific user
   */
  markAsRead: async (chatId, userId) => {
    try {
      // No read required; avoids extra Firestore getDoc per open.
      await setDoc(doc(db, "chats", chatId), {
        lastReadBy: arrayUnion(userId),
      }, { merge: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  },

  /**
   * Get or create a chat ID for two users
   */
  getOrCreateChat: async (user1, user2) => {
    const chatId = ChatService.buildChatId(user1, user2);
    await ChatService.ensureChatExists(chatId, [user1, user2]);
    return chatId;
  },

  /**
   * Clear all chats for the current user
   */
  clearAllChats: async (userId) => {
    try {
      const { query, where, collection, getDocs, writeBatch } = await import('firebase/firestore');
      
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", userId));
      const chatSnaps = await getDocs(q);
      
      const batch = writeBatch(db);
      
      chatSnaps.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error clearing chats:", error);
      throw error;
    }
  },

  /**
   * Delete a single message from a DM chat
   */
  deleteMessage: async (chatId, messageId) => {
    try {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  },

  /**
   * Edit a message in a DM chat
   */
  editMessage: async (chatId, messageId, newText) => {
    try {
      await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
        text: newText,
        editedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error editing message:", error);
      throw error;
    }
  },

  /**
   * Delete a single message from a public group room
   */
  deleteGroupMessage: async (roomId, messageId) => {
    try {
      await deleteDoc(doc(db, `location_rooms/${roomId}/messages`, messageId));
    } catch (error) {
      console.error("Error deleting group message:", error);
      throw error;
    }
  },

  /**
   * Edit a message in a public group room
   */
  editGroupMessage: async (roomId, messageId, newText) => {
    try {
      await updateDoc(doc(db, `location_rooms/${roomId}/messages`, messageId), {
        text: newText,
        editedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error editing group message:", error);
      throw error;
    }
  },

  /**
   * Delete a single specific chat
   */
  deleteChat: async (chatId) => {
    try {
      const { query, collection, getDocs, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Delete all messages in the subcollection
      const msgsRef = collection(db, `chats/${chatId}/messages`);
      const msgSnaps = await getDocs(msgsRef);
      msgSnaps.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 2. Delete the main chat document
      batch.delete(doc(db, "chats", chatId));

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  },

  // ─── Location Chat Rooms (Drop-Pin) ──────────────────────────────────
  createLocationRoom: async (latitude, longitude, name, creatorId) => {
    try {
      const roomRef = await addDoc(collection(db, "location_rooms"), {
        name,
        latitude,
        longitude,
        creatorId,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        participantCount: 0
      });
      return roomRef.id;
    } catch (error) {
      console.error("Error creating location room:", error);
      throw error;
    }
  },

  subscribeToLocationRooms: (callback) => {
    // For now, fetch all active rooms (could be optimized with geohashing in production)
    const q = query(collection(db, "location_rooms"), orderBy("lastActivity", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(rooms);
    });
  },

  sendGroupMessage: async (roomId, senderId, senderName, senderAvatar, text, imageUrl) => {
    if (!text?.trim() && !imageUrl) return;
    try {
      const msgRef = collection(db, "location_rooms", roomId, "messages");
      await addDoc(msgRef, {
        senderId,
        senderName: senderName || 'Anonymous',
        senderAvatar: senderAvatar || null,
        text: text?.trim() || "",
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp()
      });
      
      // Update room last activity
      await updateDoc(doc(db, "location_rooms", roomId), {
        lastActivity: serverTimestamp(),
        participantCount: increment(1) // Simple metric
      });
    } catch (error) {
      console.error("Error sending group msg:", error);
      throw error;
    }
  },

  subscribeToGroupMessages: (roomId, callback) => {
    const q = query(collection(db, "location_rooms", roomId, "messages"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  },

  deleteLocationRoom: async (roomId) => {
    try {
      const { query, collection, getDocs, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Delete all messages in the subcollection
      const msgsRef = collection(db, `location_rooms/${roomId}/messages`);
      const msgSnaps = await getDocs(msgsRef);
      msgSnaps.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 2. Delete the main room document
      batch.delete(doc(db, "location_rooms", roomId));

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error deleting location room:", error);
      throw error;
    }
  },

  // Check if a user already has an existing room (enforce 1 room per user)
  getUserRoom: async (userId) => {
    const q = query(collection(db, "location_rooms"), where("creatorId", "==", userId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    return null;
  },

  /**
   * Mark a user as a member of a public room (called on join)
   */
  joinRoom: async (roomId, userId) => {
    try {
      await updateDoc(doc(db, "location_rooms", roomId), {
        members: arrayUnion(userId),
      });
    } catch (error) {
      // Best-effort, don't block UI
    }
  },

  /**
   * Subscribe to all public rooms a user has joined
   */
  subscribeToJoinedRooms: (userId, callback) => {
    const q = query(
      collection(db, "location_rooms"),
      where("members", "array-contains", userId),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const tA = a.lastActivity?.seconds || 0;
          const tB = b.lastActivity?.seconds || 0;
          return tB - tA;
        });
      callback(rooms);
    });
  },

  /**
   * Remove a user from a public room's members list
   */
  leaveRoom: async (roomId, userId) => {
    try {
      await updateDoc(doc(db, "location_rooms", roomId), {
        members: arrayRemove(userId),
      });
    } catch (error) {
      console.error("Error leaving room:", error);
      throw error;
    }
  },
};

