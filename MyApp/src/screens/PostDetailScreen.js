import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FeedService } from '../services/feedService';
import { ChatService } from '../services/chatService';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import PollComponent from '../components/PollComponent';

const DARK_BG = '#0A0A0A';
const CARD_BG = '#1A1A1A';
const PRIMARY = '#BB86FC';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const formatTime = (timestamp) => {
  if (!timestamp?.toDate) return 'Just now';
  return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CommentItem = React.memo(({ item }) => (
  <View style={styles.commentRow}>
    <View style={styles.commentAvatar}>
      <Text style={styles.commentAvatarText}>{item.authorName?.charAt(0) || '?'}</Text>
    </View>
    <View style={styles.commentBubble}>
      <Text style={styles.commentAuthor}>{item.authorName}</Text>
      <Text style={styles.commentText}>{item.text}</Text>
      <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
    </View>
  </View>
), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [comments, setComments] = React.useState([]);
  const [commentText, setCommentText] = React.useState('');
  const [isPosting, setIsPosting] = React.useState(false);
  const flatListRef = React.useRef(null);

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsubscribe = FeedService.subscribeToComments(post.id, (data) => {
      setComments(data);
      // Auto-scroll to bottom when new comment arrives
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsubscribe();
  }, [post.id]);

  const handleMessageAuthor = async () => {
    if (post.authorId === user.uid) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const chatId = await ChatService.getOrCreateChat(user.uid, post.authorId);
      navigation.navigate('ChatDetail', {
        chatId,
        otherUserName: post.authorName,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    setIsPosting(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await FeedService.addComment(post.id, user.uid, user.name || 'Anonymous', text);
    } catch (error) {
      Alert.alert("Error", "Could not post your comment.");
    } finally {
      setIsPosting(false);
    }
  };

  const renderComment = React.useCallback(({ item }) => <CommentItem item={item} />, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <>
              {/* Original Post Card */}
              <View style={styles.originalPost}>
                <Text style={styles.postAuthor}>{post.authorName}</Text>
                <Text style={styles.postText}>{post.text}</Text>
                
                {post.type === 'poll' && Array.isArray(post.pollOptions) && (
                  <PollComponent post={post} currentUserId={user.uid} />
                )}



                <View style={styles.postStats}>
                  <Ionicons name="arrow-up" size={14} color={TEXT_SEC} />
                  <Text style={styles.statText}>{post.score || 0}</Text>
                  <Ionicons name="chatbubble-outline" size={14} color={TEXT_SEC} style={{ marginLeft: 12 }} />
                  <Text style={styles.statText}>{post.commentCount || 0} comments</Text>
                </View>

                {/* DM Author Button — hidden for own posts OR anonymous posts */}
                {post.authorId !== user.uid && post.authorName !== 'Anonymous Neighbor' && (
                  <TouchableOpacity
                    style={styles.dmButton}
                    onPress={handleMessageAuthor}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#8F00FF', '#BB86FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dmGradient}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                      <Text style={styles.dmButtonText}>Message Anonymously</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <Text style={styles.dividerText}>Comments</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={40} color="#333" />
              <Text style={styles.emptyText}>No comments yet.</Text>
              <Text style={styles.emptySub}>Be the first to reply anonymously!</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Comment Input Bar */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#555"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isPosting}
          >
            <Ionicons name="paper-plane" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PostDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_MAIN,
  },
  originalPost: {
    backgroundColor: CARD_BG,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  postAuthor: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  postText: {
    color: TEXT_MAIN,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 14,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#222',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dmButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  dmButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  statText: {
    color: TEXT_SEC,
    marginLeft: 4,
    fontSize: 13,
  },
  divider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  dividerText: {
    color: TEXT_SEC,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  commentAvatarText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 16,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 12,
  },
  commentAuthor: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  commentText: {
    color: TEXT_MAIN,
    fontSize: 15,
    lineHeight: 21,
  },
  commentTime: {
    color: TEXT_SEC,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  emptyComments: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: TEXT_SEC,
    marginTop: 6,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    backgroundColor: DARK_BG,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: TEXT_MAIN,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 80,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendBtn: {
    backgroundColor: PRIMARY,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
});
