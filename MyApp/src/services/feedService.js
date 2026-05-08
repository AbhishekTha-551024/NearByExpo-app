import { 
  collection, 
  addDoc, 
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  increment,
  limit,
  getDocs,
  startAt,
  endAt
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase";
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

export const FeedService = {
  /**
   * Create a new post — supports text, mood tag, poll, image, and targetRadius (spread)
   */
  createPost: async (authorId, authorName, authorAvatar, text, tag = null, pollOptions = null, location = null, isEmergency = false, targetRadius = 50000, imageUrl = null) => {
    try {
      const postData = {
        authorId, authorName, authorAvatar, text,
        tag,
        isEmergency,
        targetRadius, // How far this post should spread (in meters)
        likedBy: [], dislikedBy: [], score: 0, commentCount: 0,
        createdAt: serverTimestamp(),
        imageUrl, // Optional photo URL
      };

      if (location) {
        postData.latitude = location.latitude;
        postData.longitude = location.longitude;
        postData.geohash = geohashForLocation([location.latitude, location.longitude]);
      }

      // If poll options provided, build the poll structure
      if (pollOptions && pollOptions.length >= 2) {
        postData.type = 'poll';
        postData.pollOptions = pollOptions.map(opt => ({ text: opt, votes: 0 }));
        postData.totalVotes = 0;
      } else {
        postData.type = 'text';
      }

      const postRef = await addDoc(collection(db, "posts"), postData);
      return postRef.id;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  },



  /**
   * Vote on a poll option (one vote per user per poll)
   */
  voteOnPoll: async (postId, userId, optionIndex) => {
    const postRef = doc(db, "posts", postId);
    const voteRef = doc(db, `posts/${postId}/pollVotes`, userId);
    try {
      const existing = await getDoc(voteRef);
      if (existing.exists()) return existing.data().optionIndex; // Already voted, return their vote

      // Read the current post to get the pollOptions array
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const currentOptions = postSnap.data().pollOptions || [];
      
      // Update the votes count on the specific option
      const updatedOptions = currentOptions.map((opt, i) => ({
        ...opt,
        votes: i === optionIndex ? (opt.votes || 0) + 1 : (opt.votes || 0),
      }));

      // Save vote record and updated options atomically
      await Promise.all([
        setDoc(voteRef, { optionIndex }),
        updateDoc(postRef, {
          pollOptions: updatedOptions,
          totalVotes: increment(1),
        }),
      ]);
      
      return optionIndex;
    } catch (error) {
      console.error("Error voting on poll:", error);
      throw error;
    }
  },

  /**
   * Get current user's poll vote for a post
   */
  getUserPollVote: async (postId, userId) => {
    try {
      const voteRef = doc(db, `posts/${postId}/pollVotes`, userId);
      const snap = await getDoc(voteRef);
      if (snap.exists()) return snap.data().optionIndex;
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Subscribe to posts. Sort by 'new' or 'hot'.
   * Auto-filters out posts with a score <= -5
   */
  subscribeToPosts: (sortBy = "new", callback) => {
    let q;
    if (sortBy === "hot") {
      q = query(collection(db, "posts"), orderBy("score", "desc"), limit(100));
    } else {
      q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
    }

    return onSnapshot(q, (snapshot) => {
      let posts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      if (sortBy === "hot") {
        posts.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
      }

      posts = posts.filter(post => post.score > -5);
      callback(posts);
    });
  },

  /**
   * Subscribe to nearby posts using geohash bounds
   */
  subscribeToNearbyPosts: async (centerCoords, radiusInM, callback) => {
    try {
      const center = [centerCoords.latitude, centerCoords.longitude];
      const bounds = geohashQueryBounds(center, radiusInM);
      
      const promises = bounds.map(b => {
        const q = query(
          collection(db, "posts"),
          orderBy("geohash"),
          startAt(b[0]),
          endAt(b[1]),
          limit(50)
        );
        return getDocs(q);
      });

      const snapshots = await Promise.all(promises);
      const nearbyPosts = [];
      
      snapshots.forEach(snap => {
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            const distanceInKm = distanceBetween([data.latitude, data.longitude], center);
            if (distanceInKm * 1000 <= radiusInM) {
              const postSpread = data.targetRadius || 50000;
              // If postSpread is 0, it means Global. Otherwise check distance.
              if (postSpread === 0 || distanceInKm * 1000 <= postSpread) {
                nearbyPosts.push({ id: doc.id, ...data, distance: distanceInKm });
              }
            }
          }
        });
      });

      nearbyPosts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(nearbyPosts);
      return () => {}; 
    } catch (error) {
      console.error("Nearby fetch error:", error);
      callback([]);
      return () => {};
    }
  },

  /**
   * Upvote or Downvote a post atomically using increment().
   * voteType: 1 for upvote, -1 for downvote
   */
  voteOnPost: async (postId, userId, voteType) => {
    const postRef = doc(db, "posts", postId);
    try {
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) return;
      
      const data = postDoc.data();
      let likedBy = data.likedBy || [];
      let dislikedBy = data.dislikedBy || [];
      
      // Remove user from both arrays first to reset their state
      likedBy = likedBy.filter(id => id !== userId);
      dislikedBy = dislikedBy.filter(id => id !== userId);
      
      // Add user to the correct array if they are actively voting
      if (voteType === 1 && (!data.likedBy || !data.likedBy.includes(userId))) {
        likedBy.push(userId);
      } else if (voteType === -1 && (!data.dislikedBy || !data.dislikedBy.includes(userId))) {
        dislikedBy.push(userId);
      }
      
      await updateDoc(postRef, {
        likedBy,
        dislikedBy,
        score: likedBy.length - dislikedBy.length,
      });
    } catch (error) {
      console.error("Vote failed: ", error);
    }
  },

  /**
   * Check how a specific user voted on a specific post
   */
  getUserVote: async (postId, userId) => {
    try {
      const voteDoc = await getDoc(doc(db, `posts/${postId}/votes`, userId));
      return voteDoc.exists() ? voteDoc.data().value : 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Add an anonymous comment to a post
   */
  addComment: async (postId, authorId, authorName, text) => {
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        authorId,
        authorName,
        text,
        createdAt: serverTimestamp(),
      });
      // Increment comment counter on parent post
      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(1),
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time comments for a specific post
   */
  subscribeToComments: (postId, callback) => {
    const q = query(
      collection(db, `posts/${postId}/comments`),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      callback(comments);
    });
  },

  /**
   * Delete a post (only the author should call this)
   */
  deletePost: async (postId) => {
    try {
      // 1. Fetch all comments for this post
      const commentsQuery = query(collection(db, `posts/${postId}/comments`));
      const commentsSnap = await getDocs(commentsQuery);
      
      // 2. Delete all comments
      const deletePromises = commentsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      // 3. Delete the post itself
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  },

  /**
   * Edit the text of a post (only the author should call this)
   */
  editPost: async (postId, newText) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        text: newText,
        editedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error editing post:", error);
      throw error;
    }
  },

  /**
   * Toggle an emoji reaction on a post.
   * Stores reactions as a map: { "🔥": count, "❤️": count, ... }
   */
  reactToPost: async (postId, userId, emoji) => {
    const postRef = doc(db, "posts", postId);
    const reactionRef = doc(db, `posts/${postId}/reactions`, userId);

    try {
      const reactionDoc = await getDoc(reactionRef);

      if (reactionDoc.exists() && reactionDoc.data().emoji === emoji) {
        // Toggle off same reaction
        await deleteDoc(reactionRef);
        await updateDoc(postRef, {
          [`reactions.${emoji}`]: increment(-1),
        });
      } else {
        // Remove previous reaction if any, then apply new one
        if (reactionDoc.exists()) {
          const prevEmoji = reactionDoc.data().emoji;
          await updateDoc(postRef, {
            [`reactions.${prevEmoji}`]: increment(-1),
          });
        }
        await setDoc(reactionRef, { emoji, userId });
        await updateDoc(postRef, {
          [`reactions.${emoji}`]: increment(1),
        });
      }
    } catch (error) {
      console.error("React failed:", error);
    }
  },

  /**
   * Get this user's current reaction on a specific post
   */
  getUserReaction: async (postId, userId) => {
    try {
      const snap = await getDoc(doc(db, `posts/${postId}/reactions`, userId));
      return snap.exists() ? snap.data().emoji : null;
    } catch {
      return null;
    }
  },

  /**
   * Subscribe to posts by a specific user (for Profile tab history)
   */
  subscribeToUserPosts: (userId, callback) => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.authorId === userId);
      callback(posts);
    });
  },
};
