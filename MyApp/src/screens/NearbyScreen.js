import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image as RNImage,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { distanceBetween } from 'geofire-common';
import { LocationService } from '../services/locationService';
import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { formatDistance } from '../utils/geo';

const DARK_BG = '#0A0A0A';
const PRIMARY = '#BB86FC';
const ACCENT = '#8F00FF';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';
const FALLBACK_AVATAR = "https://api.dicebear.com/7.x/avataaars/png?seed=fallback";

const NearbyScreen = ({ navigation }) => {
  const { user, refreshLocation } = useAuth();
  const insets = useSafeAreaInsets();
  const [nearbyUsers, setNearbyUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState(user?.location || { city: 'Nearby', area: '' });

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
      setCurrentLocation(coords);

      const snap = await getDocs(collection(db, 'users'));
      const matchingDocs = [];

      for (const doc of snap.docs) {
        const userData = doc.data();
        if (doc.id === user.uid) continue;
        if (userData.isVisible === false) continue;
        if (user.blockedUsers?.includes(doc.id)) continue;

        const normalize = (str) => (str || '').toLowerCase().trim();
        const userCity = normalize(userData.location?.city || userData.city);
        const currentCity = normalize(coords.city);
        
        if (userCity !== currentCity && !userCity.includes(currentCity) && !currentCity.includes(userCity)) {
          continue;
        }

        const lat = userData.location?.latitude || userData.latitude;
        const lng = userData.location?.longitude || userData.longitude;

        if (lat && lng) {
          const distanceInKm = distanceBetween([lat, lng], center);
          matchingDocs.push({ id: doc.id, ...userData, distance: distanceInKm });
        }
      }
      matchingDocs.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(matchingDocs);
    } catch (error) {
      console.error("Discovery Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNearbyUsers();
  }, []);

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

  const getOnlineStatus = (item) => {
    if (!item.lastSeen) return false;
    const lastSeen = item.lastSeen?.toDate ? item.lastSeen.toDate() : new Date(item.lastSeen);
    return (Date.now() - lastSeen.getTime()) < 3 * 60 * 1000; // online in last 3 min
  };

  const UserCard = ({ item }) => {
    const isOnline = getOnlineStatus(item);
    const dist = formatDistance(item.distance);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleStartChat(item)}
        activeOpacity={0.75}
      >
        {/* Avatar with online ring */}
        <View style={styles.avatarContainer}>
          <RNImage 
            source={{ uri: item.profileImage || FALLBACK_AVATAR }} 
            style={styles.avatar} 
          />
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* User Info */}
        <View style={styles.info}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.area ? `${item.area}` : item.city || 'Nearby'}
            </Text>
          </View>
        </View>

        {/* Right Side: Distance + Button */}
        <View style={styles.rightSide}>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{dist}</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleStartChat(item)}
          >
            <LinearGradient
              colors={[ACCENT, PRIMARY]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chatGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} nearby
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Discovery</Text>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={14} color={ACCENT} />
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentLocation.area ? `${currentLocation.area}, ` : ''}{currentLocation.city}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.mapToggleButton}
            onPress={() => navigation.navigate('MapDiscovery')}
          >
            <Ionicons name="map" size={18} color={PRIMARY} />
            <Text style={styles.mapToggleText}>Map View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Finding neighbors...</Text>
        </View>
      ) : (
        <FlashList
          data={nearbyUsers}
          renderItem={({ item }) => <UserCard item={item} />}
          estimatedItemSize={88}
          contentContainerStyle={styles.listPadding}
          ListHeaderComponent={nearbyUsers.length > 0 ? <ListHeader /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="people-outline" size={48} color={PRIMARY} />
              </View>
              <Text style={styles.emptyText}>No one nearby yet</Text>
              <Text style={styles.emptySubText}>
                Pull down to refresh, or check back soon.
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearbyUsers}>
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NearbyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#151515',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: TEXT_MAIN,
    letterSpacing: -0.5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_SEC,
    marginLeft: 4,
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  mapToggleText: {
    color: TEXT_MAIN,
    fontWeight: '700',
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: TEXT_SEC,
    fontSize: 14,
    marginTop: 8,
  },
  listPadding: {
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  listHeader: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  listHeaderText: {
    color: TEXT_SEC,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Card
  card: {
    backgroundColor: '#131313',
    marginBottom: 10,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: ACCENT,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: DARK_BG,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_MAIN,
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: TEXT_SEC,
    fontWeight: '500',
  },
  rightSide: {
    alignItems: 'flex-end',
    gap: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
  },
  chatButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chatButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  // Empty State
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    color: TEXT_MAIN,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: TEXT_SEC,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  refreshBtnText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 15,
  },
});
