import * as React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

const PRIMARY = '#8F00FF';

const ChatItem = ({ item, currentUserId, onPress, onLongPress }) => {
  const isUnread = item.lastMessage && item.lastReadBy && !item.lastReadBy.includes(currentUserId);
  const isTyping = item.typing && Object.values(item.typing).some(t => t.isTyping && Date.now() - t.at < 5000);

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

  return (
    <TouchableOpacity 
      style={styles.chatRow}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item.id, item.neighbor.name)}
    >
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: item.neighbor?.profileImage || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.neighbor?.uid || item.id}` }} 
          style={styles.avatar} 
        />
        {item.neighbor?.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.neighborName, isUnread && styles.unreadName]} numberOfLines={1}>
            {item.neighbor?.name || 'Anonymous Neighbor'}
          </Text>
          <Text style={[styles.timestamp, isUnread && styles.unreadTime]}>
            {formatTime(item.lastMessageTimestamp)}
          </Text>
        </View>
        
        <View style={styles.chatBottomRow}>
          <Text 
            style={[styles.lastMessage, isUnread && styles.unreadMessage]} 
            numberOfLines={1}
          >
            {isTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              item.lastMessage
            )}
          </Text>
          {isUnread && <View style={styles.unreadBadge} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ChatItem, (prevProps, nextProps) => {
  const prevIsUnread = prevProps.item.lastMessage && prevProps.item.lastReadBy && !prevProps.item.lastReadBy.includes(prevProps.currentUserId);
  const nextIsUnread = nextProps.item.lastMessage && nextProps.item.lastReadBy && !nextProps.item.lastReadBy.includes(nextProps.currentUserId);
  
  const prevIsTyping = prevProps.item.typing && Object.values(prevProps.item.typing).some(t => t.isTyping && Date.now() - t.at < 5000);
  const nextIsTyping = nextProps.item.typing && Object.values(nextProps.item.typing).some(t => t.isTyping && Date.now() - t.at < 5000);

  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.lastMessage === nextProps.item.lastMessage &&
    prevIsUnread === nextIsUnread &&
    prevIsTyping === nextIsTyping &&
    prevProps.item.neighbor.profileImage === nextProps.item.neighbor.profileImage &&
    prevProps.item.neighbor.isOnline === nextProps.item.neighbor.isOnline &&
    prevProps.item.lastMessageTimestamp?.seconds === nextProps.item.lastMessageTimestamp?.seconds
  );
});

const styles = StyleSheet.create({
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
});
