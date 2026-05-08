import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  TextInput, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Keyboard,
  Image,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import MessageActionSheet from '../components/MessageActionSheet';

const DARK_BG = '#0A0A0A';
const ACCENT = '#8F00FF';
const ROOM_ACCENT = '#FF3366';

const GroupChatScreen = ({ route, navigation }) => {
  const { roomId, roomName, creatorId = '' } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [roomData, setRoomData] = React.useState(null);
  const [editingMsg, setEditingMsg] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [actionSheetMsg, setActionSheetMsg] = React.useState(null);
  const flashListRef = React.useRef(null);

  React.useEffect(() => {
    // Mark user as joined so room appears in their inbox
    ChatService.joinRoom(roomId, user.uid);

    // Listen to the room document for live member count
    const unsubRoom = onSnapshot(doc(db, 'location_rooms', roomId), (snap) => {
      if (snap.exists()) setRoomData(snap.data());
    });

    const unsubMessages = ChatService.subscribeToGroupMessages(roomId, (data) => {
      // data is newest-first from Firestore, reverse for display (oldest at top)
      setMessages([...data].reverse());
      if (data.length > 0 && data[0].senderId !== user.uid) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    return () => {
      unsubRoom();
      unsubMessages();
    };
  }, [roomId, user.uid]);

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flashListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await ChatService.sendGroupMessage(
        roomId,
        user.uid,
        user.name || user.displayName || 'Anonymous',
        user.profileImage || user.photoURL || null,
        text
      );
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  const handleLongPress = (item) => {
    if (item.senderId !== user.uid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionSheetMsg(item);
  };

  const handleDeleteConfirm = (item) => {
    Alert.alert('Delete Message', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => ChatService.deleteGroupMessage(roomId, item.id)
      }
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMsg) return;
    try {
      await ChatService.editGroupMessage(roomId, editingMsg.id, editText.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Could not edit message.');
    } finally {
      setEditingMsg(null);
      setEditText('');
    }
  };

  const handleDeleteRoom = () => {
    Alert.alert('Delete Room', 'Are you sure you want to permanently delete this public room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ChatService.deleteLocationRoom(roomId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Could not delete room.');
          }
        }
      }
    ]);
  };

  const handleLeaveRoom = () => {
    Alert.alert('Leave Room', 'Are you sure you want to leave this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await ChatService.leaveRoom(roomId, user.uid);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Could not leave room.');
          }
        }
      }
    ]);
  };

  const renderMessage = React.useCallback(({ item, index }) => {
    const isMine = item.senderId === user.uid;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const isFirstInGroup = !prevMsg || prevMsg.senderId !== item.senderId;
    const isLastInGroup = !nextMsg || nextMsg.senderId !== item.senderId;
    const time = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <View style={[
        styles.messageContainer,
        isMine ? styles.myContainer : styles.theirContainer,
        !isLastInGroup && { marginBottom: 2 },
      ]}>
        {!isMine && isFirstInGroup && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.85}
          delayLongPress={350}
        >
          <View style={[
            styles.bubble,
            isMine ? styles.myBubble : styles.theirBubble,
            !isLastInGroup && (isMine ? styles.myMiddle : styles.theirMiddle),
          ]}>
            <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
              {item.text}
            </Text>
            <View style={styles.bubbleFooter}>
              {item.editedAt && <Text style={styles.editedLabel}>edited · </Text>}
              <Text style={styles.timestamp}>{time}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [messages, user.uid, handleLongPress]);

  const isCreator = creatorId === user.uid;
  const memberCount = roomData?.members?.length || roomData?.participantCount || 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0033', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <BlurView intensity={60} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerAction}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.roomIconSmall}>
              <Ionicons name="chatbubbles" size={16} color="#FFF" />
            </View>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{roomName}</Text>
              <Text style={styles.headerSubtitle}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'} · Public Room
              </Text>
            </View>
          </View>

          {isCreator ? (
            <TouchableOpacity style={styles.headerAction} onPress={handleDeleteRoom}>
              <Ionicons name="trash" size={20} color="#FF4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveRoom}>
              <Ionicons name="exit-outline" size={18} color="#FF4444" />
              <Text style={styles.leaveBtnText}>Leave</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlashList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          estimatedItemSize={70}
          contentContainerStyle={styles.listPadding}
          onLayout={() => {
            if (messages.length > 0) flashListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>Room is quiet...</Text>
              <Text style={styles.emptySubtitle}>Be the first to say something!</Text>
            </View>
          )}
        />

        {/* Input */}
        <BlurView intensity={80} tint="dark" style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Broadcast to room..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>

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
            { text: 'Delete', style: 'destructive', onPress: () => ChatService.deleteGroupMessage(roomId, item.id) }
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

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },

  // Header
  header: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)',
    backgroundColor: 'rgba(255,68,68,0.08)',
  },
  leaveBtnText: { color: '#FF4444', fontSize: 12, fontWeight: '700' },
  roomIconSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FF3366',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', maxWidth: 180 },
  headerSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },

  // Messages
  listPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  messageContainer: { marginBottom: 12, maxWidth: '80%' },
  myContainer: { alignSelf: 'flex-end' },
  theirContainer: { alignSelf: 'flex-start' },
  senderName: { color: '#FF3366', fontSize: 11, fontWeight: '700', marginLeft: 12, marginBottom: 4 },

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

  // Input
  inputArea: { padding: 12 },
  inputWrapper: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 24, padding: 4, alignItems: 'center' },
  input: { flex: 1, color: '#FFF', paddingHorizontal: 16, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#333' },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 16 },
  emptySubtitle: { color: '#666', fontSize: 14, marginTop: 8 },

  editedLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },

  // Edit Modal
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
