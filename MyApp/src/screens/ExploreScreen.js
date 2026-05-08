import * as React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from '@expo/vector-icons';
import { PostService } from '../services/postService';
import { LocationService } from '../services/locationService';
import { ChatService } from '../services/chatService';
import { calculateDistance, formatDistance } from '../utils/geo';
import { useAuth } from '../context/AuthContext';
import FeedItem from '../components/FeedItem';

const PRIMARY = '#8F00FF';
const DARK_BG = '#0A0A0A';
const BORDER = '#1F1F1F';

const ExploreScreen = ({ navigation }) => {
  const { user, refreshLocation } = useAuth();
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [userLocation, setUserLocation] = React.useState(user?.location || null);
  const [neighborhood, setNeighborhood] = React.useState(user?.location?.area || 'Detecting location...');
  const unsubscribeRef = React.useRef(null);

  React.useEffect(() => {
    // 1. Get Location
    const initLocation = async () => {
      try {
        let coords = user?.location;
        if (!coords) {
          coords = await refreshLocation();
        }
        setUserLocation(coords);
        setNeighborhood(coords.area || 'Nearby');
        
        // After location is ready, subscribe to posts
        subscribeToFeeds(coords);
      } catch (error) {
        setNeighborhood('Nearby');
        subscribeToFeeds(null);
      }
    };

    const subscribeToFeeds = (coords) => {
      // Cleanup previous subscription if any
      if (unsubscribeRef.current) unsubscribeRef.current();

      unsubscribeRef.current = PostService.subscribeToFeed((data) => {
        let filteredPosts = data;
        
        if (coords) {
          // Task 2: 10km radius filtering + distance calculation
          filteredPosts = data.map(post => {
            const distance = calculateDistance(
              coords.latitude, 
              coords.longitude, 
              post.location.latitude, 
              post.location.longitude
            );
            return { 
              ...post, 
              distance, 
              distanceStr: formatDistance(distance) 
            };
          });
        }

        setPosts(filteredPosts);
        setLoading(false);
      });
    };

    initLocation();

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerLabel}>COMMUNITY BOARD</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={PRIMARY} />
          <Text style={styles.locationText}>{neighborhood}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.postButton}
        onPress={() => navigation.navigate('Post')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const handleMessageNeighbor = async (post) => {
    if (post.userId === user.uid) return; // Can't chat with self

    try {
      const chatId = await ChatService.getOrCreateChat(user.uid, post.userId);
      navigation.navigate('ChatDetail', { 
        chatId, 
        otherUserName: post.userName,
        otherUserAvatar: post.userAvatar
      });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlashList
        data={posts}
        renderItem={({ item }) => (
          <FeedItem 
            item={item} 
            onPress={handleMessageNeighbor} 
          />
        )}
        estimatedItemSize={250}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No posts in your neighborhood yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: DARK_BG,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A9A9A',
    letterSpacing: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  postButton: {
    backgroundColor: PRIMARY,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9A9A9A',
    textAlign: 'center',
  },
});
