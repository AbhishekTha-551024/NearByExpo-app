import * as React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { StorageService } from '../services/storageService';
import { 
  StyleSheet, 
  Text, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  TextInput, 
  TouchableOpacity,
  Keyboard,
  Image as RNImage,
  Alert,
  Modal,
  Dimensions,
  Animated,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { doc, onSnapshot } from 'firebase/firestore';
import { ChatService } from '../services/chatService';
import { db } from '../config/firebase';
import { LocationService } from '../services/locationService';
import { UserService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { distanceBetween } from 'geofire-common';
import { formatDistance } from '../utils/geo';
import { hashStringToUnitFloat, getAnonymousColor } from '../utils/chatUtils';
import MessageActionSheet from '../components/MessageActionSheet';
import ChatOptionsSheet from '../components/ChatOptionsSheet';

const { width, height } = Dimensions.get('window');
const DARK_BG = '#0A0A0A';
const ACCENT = '#8F00FF'; 
const BORDER = '#262626';
const ROUTE_COLOR = '#00FFFF';

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const ChatDetailScreen = ({ route, navigation }) => {
  const { chatId, otherUserName, otherUserAvatar } = route.params;
  const { user, blockUserLocally } = useAuth();
  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [neighbor, setNeighbor] = React.useState(null);
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);
  const [isMapOpen, setIsMapOpen] = React.useState(false);
  const [myCoords, setMyCoords] = React.useState(null);
  const [approxDistance, setApproxDistance] = React.useState('');
  const [routeLabel, setRouteLabel] = React.useState('');
  const [chatMeta, setChatMeta] = React.useState(null);
  const [sendError, setSendError] = React.useState(null);
  const [editingMsg, setEditingMsg] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [actionSheetMsg, setActionSheetMsg] = React.useState(null);
  const [isOptionsVisible, setIsOptionsVisible] = React.useState(false);
  
  const insets = useSafeAreaInsets();
  const mapRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);
  const stopTypingTimeoutRef = React.useRef(null);
  const pendingRef = React.useRef(new Map()); 
  const flashListRef = React.useRef(null);

  const neighborVicinity = React.useMemo(() => {
    if (!neighbor?.id || neighbor?.isVisible === false || typeof neighbor?.latitude !== 'number') return null;
    return { latitude: neighbor.latitude, longitude: neighbor.longitude };
  }, [neighbor?.id, neighbor?.latitude, neighbor?.longitude, neighbor?.isVisible]);

  React.useEffect(() => {
    const otherUserId = chatId.split('_').find(id => id !== user.uid);

    const unsubNeighbor = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
      const data = snap.data();
      setNeighbor(data ? { id: otherUserId, ...data } : null);
    });
    
    ChatService.markAsRead(chatId, user.uid);

    let isInitialLoad = true;
    const unsubscribe = ChatService.subscribeToMessages(chatId, (data) => {
      setMessages(data);
      if (data.length > 0 && data[0].senderId !== user.uid) {
        if (!isInitialLoad) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        ChatService.markAsRead(chatId, user.uid);
      }
      isInitialLoad = false;
    });

    const unsubMeta = ChatService.subscribeToChatMeta(chatId, (data) => setChatMeta(data));

    const kbShow = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const kbHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      unsubNeighbor();
      unsubscribe();
      unsubMeta();
      kbShow.remove();
      kbHide.remove();
    };
  }, [chatId]);

  const otherUserId = React.useMemo(() => chatId.split('_').find(id => id !== user?.uid), [chatId, user?.uid]);
  const otherTyping = !!(otherUserId && chatMeta?.typing?.[otherUserId]?.isTyping);

  React.useEffect(() => {
    let cancelled = false;
    const updateDistance = async () => {
      if (!neighbor?.latitude || neighbor?.isVisible === false) {
        setApproxDistance('');
        return;
      }
      try {
        const coords = await LocationService.getCurrentLocation();
        if (cancelled) return;
        setMyCoords(coords);
        const km = distanceBetween([coords.latitude, coords.longitude], [neighbor.latitude, neighbor.longitude]);
        setApproxDistance(`~${formatDistance(km)}`);
      } catch {
        if (!cancelled) setApproxDistance('');
      }
    };
    updateDistance();
    return () => { cancelled = true; };
  }, [neighbor?.latitude, neighbor?.longitude, neighbor?.isVisible]);

  React.useEffect(() => {
    if (isMapOpen && mapRef.current && myCoords && neighborVicinity) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: myCoords.latitude, longitude: myCoords.longitude },
            { latitude: neighborVicinity.latitude, longitude: neighborVicinity.longitude }
          ],
          {
            edgePadding: { top: 150, right: 80, bottom: 250, left: 80 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [isMapOpen, myCoords, neighborVicinity]);

  const handleOptionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOptionsVisible(true);
  };

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to permanently delete this chat? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await ChatService.deleteChat(chatId);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Could not delete chat.");
            }
          } 
        }
      ]
    );
  };

  const handleBlock = () => {
    Alert.alert("Block User", `Are you sure you want to block ${otherUserName}? You will no longer see them on the map or receive their messages.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: async () => {
        try {
          await blockUserLocally(otherUserId);
          navigation.goBack();
        } catch (error) {
          Alert.alert("Error", "Could not block user.");
        }
      }}
    ]);
  };

  const handleReport = () => {
    Alert.alert("Report User", "Why are you reporting this user?", [
      { text: "Inappropriate Content", onPress: () => submitReport("Inappropriate Content") },
      { text: "Spam or Scam", onPress: () => submitReport("Spam or Scam") },
      { text: "Harassment", onPress: () => submitReport("Harassment") },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const submitReport = async (reason) => {
    try {
      await UserService.reportUser(user.uid, otherUserId, reason);
      Alert.alert("Report Submitted", "Thank you. Our moderation team will review this user.");
    } catch (e) {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  const handleInputChange = (t) => {
    setInputText(t);
    setSendError(null);
    if (!user?.uid) return;
    if (t.trim().length > 0) ChatService.setTyping(chatId, user.uid, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => ChatService.setTyping(chatId, user.uid, false), 2000);
  };

  const handleMessageLongPress = (item) => {
    if (item.senderId !== user.uid || item._pending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionSheetMsg(item);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMsg) return;
    try {
      await ChatService.editMessage(chatId, editingMsg.id, editText.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not edit message.');
    } finally {
      setEditingMsg(null);
      setEditText('');
    }
  };

  const getMergedMessages = React.useCallback(() => {
    const pending = [...pendingRef.current.values()];
    const filteredPending = pending.filter(p => {
      const exists = messages.some(m => 
        m.clientMessageId === p.id || 
        (m.text === p.text && Math.abs((m.clientCreatedAt || 0) - p.clientCreatedAt) < 3000)
      );
      return !exists;
    });

    const all = [...filteredPending, ...messages];
    all.sort((a, b) => {
      const getMs = (msg) => {
        if (msg.createdAt && typeof msg.createdAt.toMillis === 'function') return msg.createdAt.toMillis();
        if (msg.createdAt && msg.createdAt.seconds) return msg.createdAt.seconds * 1000;
        return msg.clientCreatedAt || 0;
      };
      return getMs(a) - getMs(b); // Ascending (oldest first)
    });
    
    return all;
  }, [messages]);



  const handleSend = async () => {
    if (!inputText.trim() || !user?.uid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = inputText.trim();
    const pendingId = `local-${Date.now()}`;
    
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    pendingRef.current.set(pendingId, {
      id: pendingId,
      senderId: user.uid,
      text,
      createdAt: null,
      clientCreatedAt: Date.now(),
      _pending: true,
    });

    try {
      await ChatService.sendMessage(chatId, user.uid, text, pendingId);
      // Wait a tiny bit for snapshot to potentially catch up
      setTimeout(() => {
        pendingRef.current.delete(pendingId);
      }, 500);
    } catch (error) {
      const cur = pendingRef.current.get(pendingId);
      if (cur) pendingRef.current.set(pendingId, { ...cur, _failed: true });
      setSendError('Failed to send');
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMine = item.senderId === user.uid;
    const nextMsg = getMergedMessages()[index + 1];
    const prevMsg = getMergedMessages()[index - 1];
    
    const isFirstInGroup = !nextMsg || nextMsg.senderId !== item.senderId;
    const isLastInGroup = !prevMsg || prevMsg.senderId !== item.senderId;

    const time = item.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ||
                 new Date(item.clientCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={350}
        activeOpacity={0.9}
      >
      <View style={[
        styles.messageContainer, 
        isMine ? styles.myContainer : styles.theirContainer,
        !isLastInGroup && { marginBottom: 2 }
      ]}>
        {!isMine && isFirstInGroup && (
          <Text style={styles.senderName}>{otherUserName}</Text>
        )}
        
        <View style={[
          styles.bubble,
          isMine ? styles.myBubble : styles.theirBubble,
          !isLastInGroup && (isMine ? styles.myMiddle : styles.theirMiddle),
          item._failed && styles.failedBubble
        ]}>
          {item.text ? (
            <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
              {item.text}
            </Text>
          ) : null}
          <View style={styles.bubbleFooter}>
            {item.editedAt && <Text style={styles.editedLabel}>edited · </Text>}
            <Text style={styles.timestamp}>{time}</Text>
            {isMine && (
              <Ionicons 
                name={item._pending ? "time-outline" : "checkmark-done"} 
                size={12} 
                color="rgba(255,255,255,0.5)" 
                style={{ marginLeft: 4 }} 
              />
            )}
          </View>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0033', '#000000']} style={StyleSheet.absoluteFill} />
      
      <BlurView intensity={60} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerAction}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerUser} 
            activeOpacity={0.7}
            onPress={() => setIsMapOpen(true)}
          >
            <View style={styles.avatarContainer}>
              <RNImage 
                source={{ uri: neighbor?.profileImage || otherUserAvatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${otherUserId}` }} 
                style={styles.headerAvatar} 
              />
              {neighbor?.isOnline && <View style={styles.onlineBadge} />}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{neighbor?.name || otherUserName || 'Anonymous Neighbor'}</Text>
              <Text style={styles.headerStatus}>
                {otherTyping ? 'typing...' : (neighbor?.isOnline ? 'Online' : 'Offline')}
                {approxDistance ? ` • ${approxDistance}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => setIsMapOpen(true)} style={styles.headerAction}>
              <Ionicons name="location-outline" size={24} color={ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOptionsPress} style={styles.headerAction}>
              <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlashList
          ref={flashListRef}
          data={getMergedMessages()}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          estimatedItemSize={70}
          onContentSizeChange={() => {
            if (getMergedMessages().length > 0) {
              flashListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (getMergedMessages().length > 0) {
              flashListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          estimatedItemSize={70}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Start a vibe check</Text>
              <Text style={styles.emptySubtitle}>Say hi to your neighbor!</Text>
            </View>
          )}
        />

        <BlurView intensity={80} tint="dark" style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>

      {/* Map Modal */}
      <Modal visible={isMapOpen} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            customMapStyle={mapStyle}
            showsUserLocation={true}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: neighborVicinity?.latitude || myCoords?.latitude || 0,
              longitude: neighborVicinity?.longitude || myCoords?.longitude || 0,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {neighborVicinity && (
              <Marker coordinate={neighborVicinity} title={otherUserName}>
                <View style={styles.markerContainer}>
                  <RNImage source={{ uri: otherUserAvatar }} style={styles.markerAvatar} />
                </View>
              </Marker>
            )}

            {myCoords && neighborVicinity && (
              <Polyline
                coordinates={[
                  { latitude: myCoords.latitude, longitude: myCoords.longitude },
                  { latitude: neighborVicinity.latitude, longitude: neighborVicinity.longitude }
                ]}
                strokeColor={ROUTE_COLOR}
                strokeWidth={4}
                lineDashPattern={[1, 5]}
              />
            )}
          </MapView>

          <BlurView intensity={80} tint="dark" style={[styles.mapHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.mapBackButton} onPress={() => setIsMapOpen(false)}>
              <Ionicons name="chevron-down" size={28} color="#FFF" />
              <Text style={styles.mapBackText}>Back to Chat</Text>
            </TouchableOpacity>
          </BlurView>

          {approxDistance && (
            <View style={[styles.mapDistanceCard, { bottom: insets.bottom + 20 }]}>
              <Ionicons name="navigate-circle" size={24} color={ACCENT} />
              <Text style={styles.mapDistanceText}>{otherUserName} is {approxDistance} away</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Chat Options Sheet */}
      <ChatOptionsSheet
        visible={isOptionsVisible}
        otherUserName={otherUserName}
        onClose={() => setIsOptionsVisible(false)}
        onReport={handleReport}
        onBlock={handleBlock}
        onDelete={handleDeleteChat}
      />

      {/* Message Action Sheet */}
      <MessageActionSheet
        visible={!!actionSheetMsg}
        message={actionSheetMsg}
        onClose={() => setActionSheetMsg(null)}
        onEdit={() => {
          setEditingMsg(actionSheetMsg);
          setEditText(actionSheetMsg.text);
          setActionSheetMsg(null);
        }}
        onDelete={() => {
          const item = actionSheetMsg;
          setActionSheetMsg(null);
          Alert.alert('Delete Message', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => ChatService.deleteMessage(chatId, item.id) }
          ]);
        }}
      />

      {/* Edit Message Modal */}
      <Modal visible={!!editingMsg} animationType="slide" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Message</Text>
              <TouchableOpacity onPress={() => { setEditingMsg(null); setEditText(''); }}>
                <Ionicons name="close" size={22} color="#999" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              maxLength={500}
              placeholderTextColor="#555"
            />
            <TouchableOpacity
              style={[styles.editSaveBtn, !editText.trim() && { opacity: 0.4 }]}
              onPress={handleSaveEdit}
              disabled={!editText.trim()}
            >
              <Text style={styles.editSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  header: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  avatarContainer: { width: 40, height: 40 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', borderWidth: 1.5, borderColor: ACCENT },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00FF94', borderWidth: 2, borderColor: '#000' },
  headerInfo: { marginLeft: 12 },
  headerName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  headerStatus: { color: '#888', fontSize: 12, marginTop: 2 },
  
  listPadding: { paddingHorizontal: 16, paddingTop: 20 },
  messageContainer: { marginBottom: 12, maxWidth: '80%' },
  myContainer: { alignSelf: 'flex-end' },
  theirContainer: { alignSelf: 'flex-start' },
  senderName: { color: '#666', fontSize: 11, fontWeight: '700', marginLeft: 12, marginBottom: 4 },
  
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  myBubble: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#1C1C1E', borderBottomLeftRadius: 4 },
  myMiddle: { borderBottomRightRadius: 20, borderTopRightRadius: 20 },
  theirMiddle: { borderBottomLeftRadius: 20, borderTopLeftRadius: 20 },
  
  messageText: { fontSize: 16, lineHeight: 22 },
  myText: { color: '#FFF' },
  theirText: { color: '#EEE' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timestamp: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  
  inputArea: { padding: 12 },
  inputWrapper: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 24, padding: 4, alignItems: 'center' },
  input: { flex: 1, color: '#FFF', paddingHorizontal: 16, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#333' },
  
  attachmentBtn: { paddingHorizontal: 8 },
  imageBubble: { padding: 4, borderRadius: 16 },
  messageImage: { width: width * 0.65, height: width * 0.65, borderRadius: 12, marginBottom: 4 },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  emptySubtitle: { color: '#666', fontSize: 14, marginTop: 8 },

  markerContainer: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: ACCENT, overflow: 'hidden', backgroundColor: '#1A1A1A' },
  markerAvatar: { width: '100%', height: '100%', borderRadius: 25 },
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12 },
  mapBackButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  mapBackText: { color: '#FFF', marginLeft: 8, fontWeight: '700' },
  mapDistanceCard: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(10,10,10,0.85)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mapDistanceText: { color: '#FFF', marginLeft: 10, fontWeight: '800', fontSize: 14 },

  editedLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  editInput: {
    color: '#FFF', fontSize: 16, lineHeight: 22,
    backgroundColor: '#2A2A2A', borderRadius: 12,
    padding: 14, minHeight: 80, textAlignVertical: 'top',
    marginBottom: 16, borderWidth: 1, borderColor: '#333',
  },
  editSaveBtn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  editSaveText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

export default ChatDetailScreen;
