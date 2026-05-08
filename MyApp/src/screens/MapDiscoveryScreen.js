import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  Image as RNImage, 
  Animated, 
  Pressable,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { distanceBetween } from 'geofire-common';
import { LocationService } from '../services/locationService';
import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';
import PulseLoader from '../components/PulseLoader';

const { width, height } = Dimensions.get('window');

// Premium Palette
const ACCENT = '#8F00FF'; // Neon Purple
const ROOM_ACCENT = '#FF3366'; // Pinkish-red for rooms
const PRIMARY = '#8F00FF';
const BG = '#000';
const FALLBACK_AVATAR = "https://api.dicebear.com/7.x/avataaars/png?seed=fallback";

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#111111" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#111111" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#222222" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const hashStringToUnitFloat = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const buildHumanAvatarUrl = (seed) => `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}`;

const UserMarker = React.memo(({ n, onPress }) => {
  const [tracksViewChanges, setTracksViewChanges] = React.useState(true);
  const avatarUri = n.profileImage || buildHumanAvatarUrl(`${hashStringToUnitFloat(n.id + 'g') > 0.5 ? 'woman' : 'man'}-${n.id}`);
  
  return (
    <Marker coordinate={n.coordinate} onPress={() => onPress(n, 'user')} tracksViewChanges={tracksViewChanges}>
      <View style={styles.markerContainer}>
        <RNImage 
          source={{ uri: avatarUri }} 
          style={styles.markerAvatar} 
          onLoad={() => setTracksViewChanges(false)}
          onError={() => setTracksViewChanges(false)}
        />
      </View>
    </Marker>
  );
});

const RoomMarker = React.memo(({ r, onPress }) => {
  const [tracksViewChanges, setTracksViewChanges] = React.useState(true);
  
  React.useEffect(() => {
    // Disable tracksViewChanges after a short delay so the icon renders perfectly on Android/iOS
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker coordinate={{ latitude: r.latitude, longitude: r.longitude }} onPress={() => onPress(r, 'room')} tracksViewChanges={tracksViewChanges}>
      <View style={styles.roomMarkerContainer}>
        <View style={styles.roomGlow}>
          <Ionicons name="chatbubbles" size={20} color="#FFF" />
        </View>
      </View>
    </Marker>
  );
});

const MapDiscoveryScreen = ({ navigation }) => {
  const { user, refreshLocation } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [neighbors, setNeighbors] = React.useState([]);
  const [rooms, setRooms] = React.useState([]);
  const [region, setRegion] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  
  // Sheet States
  const [selectedItem, setSelectedItem] = React.useState(null); // Can be user or room
  
  // Create Room States
  const [pendingRoomCoords, setPendingRoomCoords] = React.useState(null);
  const [isRoomModalVisible, setRoomModalVisible] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState('');

  const mapRef = React.useRef(null);
  const neighborMapRef = React.useRef(new Map());
  
  const sheetY = React.useRef(new Animated.Value(height)).current;
  const sheetVisibleRef = React.useRef(false);
  const pulse = React.useRef(new Animated.Value(1)).current;

  // ─── Animations ────────────────────────────────────────────────────────
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const snapPoints = React.useMemo(() => {
    const sheetHeight = 320 + insets.bottom;
    return { openY: 0, closedY: sheetHeight + 40, sheetHeight };
  }, [insets.bottom]);

  // ─── Map Initialization ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!user?.uid) return undefined;

    let unsubRooms = () => {};
    let unsubUsers = () => {};
    let cancelled = false;

    const initMap = async () => {
      try {
        setIsLoading(true);
        let coords = user?.location;

        if (!coords) {
          coords = await refreshLocation();
        }

        if (cancelled || !coords?.latitude || !coords?.longitude) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const initialRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(initialRegion);

        unsubRooms = ChatService.subscribeToLocationRooms((allRooms) => {
          if (!cancelled) setRooms(allRooms);
        });

        const q = query(collection(db, 'users'));
        unsubUsers = onSnapshot(q, (snapshot) => {
          if (cancelled) return;
          snapshot.docChanges().forEach((change) => {
            const userData = change.doc.data();
            const id = change.doc.id;

            if (
              id === user.uid ||
              userData.isVisible === false ||
              user.blockedUsers?.includes(id)
            ) {
              neighborMapRef.current.delete(id);
              return;
            }

            if (change.type === 'removed') {
              neighborMapRef.current.delete(id);
            } else if (
              userData.location &&
              typeof userData.location.latitude === 'number' &&
              typeof userData.location.longitude === 'number'
            ) {
              const dist = distanceBetween(
                [coords.latitude, coords.longitude],
                [userData.location.latitude, userData.location.longitude]
              );
              if (dist <= 10) {
                neighborMapRef.current.set(id, {
                  id,
                  ...userData,
                  coordinate: {
                    latitude: userData.location.latitude,
                    longitude: userData.location.longitude,
                  },
                });
              } else {
                neighborMapRef.current.delete(id);
              }
            }
          });
          setNeighbors(Array.from(neighborMapRef.current.values()));
        });

        if (!cancelled) setIsLoading(false);
      } catch (error) {
        console.error('Map Init Error:', error);
        if (!cancelled) setIsLoading(false);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      unsubRooms();
      unsubUsers();
    };
  }, [user?.location, user?.uid, refreshLocation]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const coords = await LocationService.searchCity(searchQuery);
      if (coords) {
        const next = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        mapRef.current?.animateToRegion(next, 1500);
        setRegion(next);
      } else {
        Alert.alert("Not Found", "Could not find that location.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapLongPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    if (!coords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPendingRoomCoords(coords);
    setRoomModalVisible(true);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !pendingRoomCoords) return;
    try {
      // Enforce: one room per user
      const existing = await ChatService.getUserRoom(user.uid);
      if (existing) {
        Alert.alert(
          'Room Already Exists',
          `You already have an active room called "${existing.name}". Delete your existing room first before creating a new one.`,
          [{ text: 'OK' }]
        );
        setRoomModalVisible(false);
        setPendingRoomCoords(null);
        return;
      }
      await ChatService.createLocationRoom(pendingRoomCoords.latitude, pendingRoomCoords.longitude, newRoomName.trim(), user.uid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRoomModalVisible(false);
      setNewRoomName('');
      setPendingRoomCoords(null);
    } catch (e) {
      Alert.alert("Error", "Could not create room.");
    }
  };

  const openSheet = (item, type) => {
    setSelectedItem({ ...item, type });
    sheetVisibleRef.current = true;
    Animated.spring(sheetY, { toValue: snapPoints.openY, useNativeDriver: true, damping: 20, stiffness: 150 }).start();
  };

  const closeSheet = () => {
    sheetVisibleRef.current = false;
    Animated.spring(sheetY, { toValue: snapPoints.closedY, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !sheetVisibleRef.current) setSelectedItem(null);
    });
  };

  const handleAction = async () => {
    if (selectedItem.type === 'room') {
      closeSheet();
      navigation.navigate('GroupChat', { 
        roomId: selectedItem.id, 
        roomName: selectedItem.name,
        creatorId: selectedItem.creatorId
      });
    } else {
      try {
        const chatId = await ChatService.getOrCreateChat(user.uid, selectedItem.id);
        closeSheet();
        navigation.navigate('ChatDetail', { chatId, otherUserName: selectedItem.name, otherUserAvatar: selectedItem.profileImage });
      } catch (error) {
        console.error("Chat navigation error:", error);
      }
    }
  };

  // ─── Rendering ───────────────────────────────────────────────────────
  if (isLoading || !region) {
    return <View style={styles.centered}><PulseLoader size={50} color={PRIMARY} /></View>;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onLongPress={handleMapLongPress}
      >
        {/* User Markers */}
        {neighbors.map((n) => (
          <UserMarker key={n.id} n={n} onPress={openSheet} />
        ))}

        {/* Room Markers */}
        {rooms.map((r) => (
          <RoomMarker key={r.id} r={r} onPress={openSheet} />
        ))}

        {/* Current User Marker */}
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
          <Animated.View style={[styles.markerContainer, { borderColor: '#FFF', transform: [{ scale: pulse }] }]}>
            <RNImage source={{ uri: user?.profileImage || FALLBACK_AVATAR }} style={styles.markerAvatar} />
          </Animated.View>
        </Marker>
      </MapView>

      {/* Header */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <BlurView intensity={30} tint="dark" style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#AAA" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search globe..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isSearching && <PulseLoader size={20} color={PRIMARY} />}
        </BlurView>
      </View>

      {/* Instruction Pill */}
      <View style={[styles.instructionPill, { top: insets.top + 70 }]}>
        <Text style={styles.instructionText}>Press and hold to create a public room</Text>
      </View>

      {/* Bottom Sheet Overlay */}
      {selectedItem && <Pressable style={styles.backdrop} onPress={closeSheet} />}
      
      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }], height: snapPoints.sheetHeight }]}>
        <View style={styles.sheetHandle} />
        
        {selectedItem?.type === 'room' ? (
          // Room Sheet Content
          <>
            <View style={styles.sheetRow}>
              <View style={[styles.sheetAvatarGlow, { borderColor: ROOM_ACCENT }]}>
                <View style={[styles.roomAvatarPlaceholder, { backgroundColor: ROOM_ACCENT }]}>
                  <Ionicons name="location" size={28} color="#FFF" />
                </View>
              </View>
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetName} numberOfLines={1}>{selectedItem.name}</Text>
                <Text style={styles.sheetMetaText}>{selectedItem.participantCount || 0} active members</Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={closeSheet}>
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetBio}>A public location-based chat room. Drop in to see what's happening here right now.</Text>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: ROOM_ACCENT, marginTop: 'auto' }]} onPress={handleAction}>
              <Ionicons name="log-in" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Join Room</Text>
            </TouchableOpacity>
          </>
        ) : (
          // User Sheet Content
          <>
            <View style={styles.sheetRow}>
              <View style={styles.sheetAvatarGlow}>
                <RNImage 
                  source={{ uri: selectedItem?.profileImage || `https://api.dicebear.com/7.x/avataaars/png?seed=${selectedItem?.id}` }} 
                  style={styles.sheetAvatar} 
                />
              </View>
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetName} numberOfLines={1}>{selectedItem?.name || 'Anonymous Neighbor'}</Text>
                <Text style={styles.sheetMetaText}>Registered user</Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={closeSheet}>
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            {selectedItem?.bio && <Text style={styles.sheetBio} numberOfLines={2}>{selectedItem.bio}</Text>}
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: ACCENT, marginTop: 'auto' }]} onPress={handleAction}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Private Message</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Create Room Modal */}
      <Modal visible={isRoomModalVisible} animationType="fade" transparent>
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="location" size={32} color={ROOM_ACCENT} />
            </View>
            <Text style={styles.modalTitle}>Drop a Chat Pin</Text>
            <Text style={styles.modalSub}>Create a public chat room at this exact location.</Text>
            <TextInput
              style={styles.nameInput}
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="e.g. Library Study Group"
              placeholderTextColor="#666"
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setRoomModalVisible(false); setPendingRoomCoords(null); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: ROOM_ACCENT }]} onPress={handleCreateRoom}>
                <Text style={styles.modalSaveText}>Create Room</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

    </View>
  );
};

export default MapDiscoveryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { width, height },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  instructionPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  instructionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  markerContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A1A', borderWidth: 2, borderColor: ACCENT,
    overflow: 'hidden', shadowColor: ACCENT, shadowRadius: 8, shadowOpacity: 0.8, elevation: 10
  },
  markerAvatar: { width: '100%', height: '100%' },
  roomMarkerContainer: {
    width: 50, height: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  roomGlow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ROOM_ACCENT,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: ROOM_ACCENT, shadowRadius: 12, shadowOpacity: 1, elevation: 15,
    borderWidth: 2, borderColor: '#FFF'
  },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flex: 1, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginLeft: 12 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sheetAvatarGlow: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: ACCENT, padding: 2, justifyContent: 'center', alignItems: 'center' },
  sheetAvatar: { width: '100%', height: '100%', borderRadius: 28 },
  roomAvatarPlaceholder: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  sheetInfo: { flex: 1, marginLeft: 15 },
  sheetName: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  sheetMetaText: { color: '#999', fontSize: 13, marginTop: 4 },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  sheetBio: { color: '#BBB', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionButton: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', marginLeft: 8 },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    width: '100%', backgroundColor: '#151515', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center'
  },
  modalHeaderIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,51,102,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  modalSub: { color: '#888', fontSize: 14, marginBottom: 24, textAlign: 'center', paddingHorizontal: 10 },
  nameInput: {
    width: '100%', color: '#FFF', fontSize: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24
  },
  modalBtnRow: { flexDirection: 'row', width: '100%', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#2A2A2A', borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalSaveText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
