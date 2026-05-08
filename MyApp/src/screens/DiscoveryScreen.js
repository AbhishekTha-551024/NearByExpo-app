import * as React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image as RNImage,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, startAt, endAt, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { LocationService } from '../services/locationService';
import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { formatDistance } from '../utils/geo';
import PulseSkeleton from '../components/PulseSkeleton';

const PRIMARY = '#8F00FF';
const BG = '#0A0A0A';
const CARD = '#141414';
const BORDER = '#262626';

const DiscoveryScreen = ({ navigation }) => {
  const { user, refreshLocation } = useAuth();
  const [nearbyUsers, setNearbyUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchNearbyUsers();
  }, [user?.location]);

  const fetchNearbyUsers = async () => {
    try {
      setLoading(true);
      // Use stored fixed location instead of fresh GPS lock
      let coords = user?.location;

      if (!coords) {
        coords = await refreshLocation();
      }

      const center = [coords.latitude, coords.longitude];
      const radiusInM = 10 * 1000; // 10km

      // 2. Query Bounds
      const bounds = geohashQueryBounds(center, radiusInM);
      const promises = [];
      for (const b of bounds) {
        const q = query(
          collection(db, 'users'),
          orderBy('geohash'),
          startAt(b[0]),
          endAt(b[1])
        );
        promises.push(getDocs(q));
      }

      const snapshots = await Promise.all(promises);
      const uniqueUsers = new Map();

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const userData = doc.data();

          // Filter out self, blocked users, and ghosts
          if (doc.id === user.uid) continue;
          if (user.blockedUsers?.includes(doc.id)) continue;
          if (userData.isVisible === false) continue;

          const lat = userData.location?.latitude;
          const lng = userData.location?.longitude;

          if (lat && lng) {
            const distanceInKm = distanceBetween([lat, lng], center);
            const distanceInM = distanceInKm * 1000;

            if (distanceInM <= radiusInM) {
              const existing = uniqueUsers.get(doc.id);
              if (!existing || distanceInKm < existing.distance) {
                uniqueUsers.set(doc.id, {
                  id: doc.id,
                  ...userData,
                  distance: distanceInKm,
                });
              }
            }
          }
        }
      }

      const matchingDocs = [...uniqueUsers.values()];
      // Sort by distance
      matchingDocs.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(matchingDocs);

    } catch (error) {
      console.error("Discovery Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUser) => {
    try {
      const chatId = await ChatService.getOrCreateChat(user.uid, targetUser.id);
      navigation.navigate('ChatDetail', {
        chatId,
        otherUserName: targetUser.name,
        otherUserAvatar: targetUser.profileImage
      });
    } catch (error) {
      console.error("Chat navigation error:", error);
    }
  };

  const UserCard = ({ item }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <RNImage
              source={item.profileImage ? { uri: item.profileImage } : { uri: 'https://via.placeholder.com/100' }}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.userName}>{item.name}</Text>
              <View style={styles.distanceRow}>
                <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleStartChat(item)}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discovery</Text>
        <Text style={styles.headerSubtitle}>Neighbors within 10km</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, paddingVertical: 10 }}>
          <PulseSkeleton type="user" />
          <PulseSkeleton type="user" />
          <PulseSkeleton type="user" />
          <PulseSkeleton type="user" />
        </View>
      ) : (
        <FlashList
          data={nearbyUsers}
          renderItem={({ item }) => <UserCard item={item} />}
          estimatedItemSize={100}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No one nearby yet.</Text>
              <TouchableOpacity onPress={fetchNearbyUsers} style={styles.retryButton}>
                <Text style={styles.retryText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default DiscoveryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    padding: 20,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#A0A0A0',
    fontSize: 16,
  },
  listPadding: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: CARD,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 15,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#262626',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#A0A0A0',
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9A9A9A',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
  },
  retryText: {
    color: '#D7A7FF',
    fontWeight: '600',
  },
});
