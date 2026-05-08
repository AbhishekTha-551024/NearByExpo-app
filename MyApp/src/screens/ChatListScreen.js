import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatService } from '../services/chatService';
import { UserService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import ChatItem from '../components/ChatItem';
import PulseLoader from '../components/PulseLoader';

const DARK_BG = '#0A0A0A';
const ITEM_BORDER = 'rgba(255,255,255,0.05)';
const PRIMARY = '#8F00FF';
const ROOM_ACCENT = '#FF3366';
const FALLBACK_AVATAR = "https://api.dicebear.com/7.x/personas/png?seed=fallback";

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = React.useState([]);
  const [joinedRooms, setJoinedRooms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const insets = useSafeAreaInsets();
  const profileCacheRef = React.useRef(new Map());

  React.useEffect(() => {
    if (!user) return;

    const unsubscribe = ChatService.subscribeToInbox(user.uid, async (chatData) => {
      const validChats = chatData.filter(chat => {
        const otherUserId = chat.participants.find(id => id !== user.uid);
        return !user.blockedUsers?.includes(otherUserId);
      });

      // Optimized enrichment: process in chunks or parallel with caching
      const enrichedChats = await Promise.all(
        validChats.map(async (chat) => {
          const otherUserId = chat.participants.find(id => id !== user.uid);
          if (!otherUserId) return { ...chat, neighbor: { name: "Unknown", profileImage: FALLBACK_AVATAR } };

          if (profileCacheRef.current.has(otherUserId)) {
            return { ...chat, neighbor: profileCacheRef.current.get(otherUserId) };
          }

          const profile = await UserService.getUserProfile(otherUserId);
          const normalized = {
            uid: otherUserId,
            name: profile?.name || "Anonymous Neighbor",
            profileImage: profile?.profileImage || `https://api.dicebear.com/7.x/avataaars/png?seed=${otherUserId}`
          };
          profileCacheRef.current.set(otherUserId, normalized);
          return { ...chat, neighbor: normalized };
        })
      );

      setChats(enrichedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to joined public rooms
  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = ChatService.subscribeToJoinedRooms(user.uid, (rooms) => {
      setJoinedRooms(rooms);
    });
    return () => unsubscribe();
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleDeleteChat = React.useCallback((chatId, neighborName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete your conversation with ${neighborName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await ChatService.deleteChat(chatId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert("Error", "Could not delete chat");
            }
          }
        }
      ]
    );
  }, []);

  const handlePressChat = React.useCallback((item) => {
    navigation.navigate('ChatDetail', { 
      chatId: item.id, 
      otherUserName: item.neighbor.name,
      otherUserAvatar: item.neighbor.profileImage
    });
  }, [navigation]);

  const renderChatItem = React.useCallback(({ item }) => (
    <ChatItem 
      item={item} 
      currentUserId={user.uid} 
      onPress={handlePressChat} 
      onLongPress={handleDeleteChat} 
    />
  ), [user.uid, handlePressChat, handleDeleteChat]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFill} />
      
      <BlurView intensity={40} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Inbox</Text>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="search-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <PulseLoader size={50} color={PRIMARY} />
        </View>
      ) : (
        <FlashList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={item => item.id}
          estimatedItemSize={84}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            joinedRooms.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>📍 Public Rooms</Text>
                {joinedRooms.map(room => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.roomRow}
                    onPress={() => navigation.navigate('GroupChat', {
                      roomId: room.id,
                      roomName: room.name,
                      creatorId: room.creatorId,
                    })}
                  >
                    <View style={styles.roomIconCircle}>
                      <Ionicons name="chatbubbles" size={22} color="#FFF" />
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomName} numberOfLines={1}>{room.name || 'Unnamed Room'}</Text>
                      <Text style={styles.roomMeta}>Public Room · {room.members?.length || 0} {(room.members?.length === 1) ? 'member' : 'members'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#555" />
                  </TouchableOpacity>
                ))}
                <Text style={styles.sectionLabel}>💬 Direct Messages</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={40} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>Your inbox is empty</Text>
              <Text style={styles.emptySubtitle}>
                No vibes yet! Reach out to someone on the Discovery map.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { borderBottomWidth: 1, borderBottomColor: ITEM_BORDER },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  
  listContent: { paddingBottom: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#555',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  roomRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: ITEM_BORDER,
  },
  roomIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: ROOM_ACCENT,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: ROOM_ACCENT, shadowOpacity: 0.5, shadowRadius: 8,
  },
  roomInfo: { flex: 1, marginLeft: 14 },
  roomName: { fontSize: 16, fontWeight: '700', color: '#EEE' },
  roomMeta: { fontSize: 13, color: '#666', marginTop: 2 },
  chatRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1A1A1A' },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00FF94', borderWidth: 2, borderColor: '#000' },
  
  chatInfo: { flex: 1, marginLeft: 14 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  neighborName: { fontSize: 16, fontWeight: '700', color: '#EEE', flex: 1 },
  unreadName: { color: '#FFF', fontWeight: '800' },
  timestamp: { fontSize: 12, color: '#666' },
  unreadTime: { color: PRIMARY },
  
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#888', flex: 1, marginRight: 8 },
  unreadMessage: { color: '#CCC', fontWeight: '600' },
  typingText: { color: PRIMARY, fontWeight: '700' },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOpacity: 0.5, shadowRadius: 4 },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(143,0,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
