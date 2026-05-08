import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image as RNImage
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LocationService } from '../services/locationService';

import { FeedService } from '../services/feedService';
import { useAuth } from '../context/AuthContext';
import PulsePost from '../components/PulsePost';
import PulseSkeleton from '../components/PulseSkeleton';

const DARK_BG = '#0A0A0A';
const CARD_BG = '#131313';
const PRIMARY = '#BB86FC';
const ACCENT = '#8F00FF';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const FeedScreen = ({ navigation }) => {
  const { user, refreshLocation } = useAuth();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = React.useState([]);
  const [sortBy, setSortBy] = React.useState('hot');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Create post modal
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [newPostText, setNewPostText] = React.useState('');
  const [isPosting, setIsPosting] = React.useState(false);
  const [selectedTag, setSelectedTag] = React.useState(null);
  const [postMode, setPostMode] = React.useState('text'); // 'text' | 'poll'
  const [pollOptions, setPollOptions] = React.useState(['', '']);
  const [selectedRadius, setSelectedRadius] = React.useState(5000); // meters
  const [postSpread, setPostSpread] = React.useState(10000); // meters (poster radius)
  const [currentArea, setCurrentArea] = React.useState('Local Area');
  const [isAnonymous, setIsAnonymous] = React.useState(false);

  // Edit post modal
  const [editingPost, setEditingPost] = React.useState(null);
  const [editText, setEditText] = React.useState('');

  // Custom Dropdown Menu state
  const [openMenuId, _setOpenMenuId] = React.useState(null);
  const openMenuIdRef = React.useRef(null);
  const setOpenMenuId = React.useCallback((id) => {
    const nextId = typeof id === 'function' ? id(openMenuIdRef.current) : id;
    openMenuIdRef.current = nextId;
    _setOpenMenuId(nextId);
  }, []);

  const MOOD_TAGS = [
    { label: 'Rant', emoji: '', color: '#FF4444' },
    { label: 'Event', emoji: '', color: '#44CC44' },
    { label: 'Question', emoji: '', color: '#4488FF' },
    { label: 'Confession', emoji: '', color: '#FFCC00' },
    { label: 'Chill', emoji: '#BB86FC' },
    { label: 'Help', emoji: '', color: '#FFD700' },
  ];

  React.useEffect(() => {
    let unsub = () => {};
    const initFeed = async () => {
      setIsLoading(true);
      if (sortBy === 'nearby') {
        try {
          // Use stored fixed location instead of fresh GPS lock
          let coords = user?.location;
          
          if (!coords) {
            coords = await refreshLocation();
          }

          unsub = await FeedService.subscribeToNearbyPosts(coords, selectedRadius, (data) => {
            // Sort: Emergency first, then time
            const sorted = data.sort((a, b) => {
              if (a.isEmergency && !b.isEmergency) return -1;
              if (!a.isEmergency && b.isEmergency) return 1;
              return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            setPosts(sorted);
            setIsLoading(false);
          });
        } catch (error) {
          Alert.alert("Neighborhood Required", "We need to know your neighborhood to show local pulses. You can set this in Settings.");
          setSortBy('new');
        }
      } else {
        unsub = FeedService.subscribeToPosts(sortBy, (data) => {
          // Emergency posts also pinned in Hot/New
          const sorted = data.sort((a, b) => {
            if (a.isEmergency && !b.isEmergency) return -1;
            if (!a.isEmergency && b.isEmergency) return 1;
            return 0; // Default subscription order
          });
          setPosts(sorted);
          setIsLoading(false);
        });
      }
    };
    initFeed();
    return () => unsub();
  }, [sortBy, selectedRadius]);

  // ─── Create Post ──────────────────────────────────────────────
  const handlePost = async () => {
    const isValid = postMode === 'poll'
      ? newPostText.trim() && pollOptions.filter(o => o.trim()).length >= 2
      : newPostText.trim();
    if (!isValid) return;
    setIsPosting(true);
    try {
      const coords = await LocationService.getCurrentLocation().catch(() => null);
      const validOptions = postMode === 'poll' ? pollOptions.filter(o => o.trim()) : null;
      
      const authorName = isAnonymous ? 'Anonymous Neighbor' : (user.name || 'Anonymous');
      const authorAvatar = isAnonymous ? '' : (user.profileImage || '');

      await FeedService.createPost(user.uid, authorName, authorAvatar, newPostText.trim(), selectedTag, validOptions, coords, false, postSpread);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewPostText('');
      setSelectedTag(null);
      setPostMode('text');
      setPollOptions(['', '']);
      setPostSpread(10000);
      setIsAnonymous(false);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not post.');
    } finally {
      setIsPosting(false);
    }
  };

  // ─── Vote ─────────────────────────────────────────────────────
  const handleVote = React.useCallback(async (postId, voteType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await FeedService.voteOnPost(postId, user.uid, voteType);
  }, [user.uid]);

  // ─── Post Actions (Custom Menu Edit / Delete) ───────────────────────────────
  const toggleMenu = React.useCallback((postId) => {
    setOpenMenuId(prev => prev === postId ? null : postId);
  }, [setOpenMenuId]);

  const openEdit = React.useCallback((item) => {
    setOpenMenuId(null);
    setEditingPost(item);
    setEditText(item.text);
  }, [setOpenMenuId]);

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingPost) return;
    try {
      await FeedService.editPost(editingPost.id, editText.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingPost(null);
    } catch {
      Alert.alert('Error', 'Could not edit post.');
    }
  };

  const confirmDelete = React.useCallback((postId) => {
    setOpenMenuId(null);
    Alert.alert('Delete Post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => FeedService.deletePost(postId) },
    ]);
  }, [setOpenMenuId]);

  const handlePressPost = React.useCallback((item) => {
    if (openMenuIdRef.current) {
      setOpenMenuId(null);
      return;
    }
    navigation.navigate('PostDetail', { post: item });
  }, [navigation, setOpenMenuId]);

  // ─── Render ───────────────────────────────────────────────────
  const renderPost = React.useCallback(({ item }) => (
    <PulsePost 
      item={item}
      currentUserId={user.uid}
      isOpenMenu={openMenuId === item.id}
      onToggleMenu={toggleMenu}
      onOpenEdit={openEdit}
      onConfirmDelete={confirmDelete}
      onPressPost={handlePressPost}
      onVote={handleVote}
    />
  ), [user.uid, openMenuId, toggleMenu, openEdit, confirmDelete, handlePressPost, handleVote]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BlurView intensity={20} tint="dark" style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.headerTitle}>PULSE</Text>
          </View>
          <View style={styles.sortToggle}>
            {['hot', 'nearby'].map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSortBy(s);
                }}
              >
                <Ionicons 
                  name={s === 'hot' ? 'flame' : 'location'} 
                  size={18} 
                  color={sortBy === s ? TEXT_MAIN : TEXT_SEC} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BlurView>

      {/* Radius Selector (only for Nearby) */}
      {sortBy === 'nearby' && (
        <View style={styles.radiusBar}>
          <Text style={styles.radiusLabel}>RADIUS:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll}>
            {[
              { label: '1km', val: 1000 },
              { label: '10km', val: 10000 },
              { label: 'City', val: 100000 },
              { label: 'State', val: 500000 },
            ].map(r => (
              <TouchableOpacity 
                key={r.label} 
                style={[styles.radiusChip, selectedRadius === r.val && styles.radiusChipActive]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedRadius(r.val);
                }}
              >
                <Text style={[styles.radiusChipText, selectedRadius === r.val && styles.radiusChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Feed */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={{ flex: 1, paddingVertical: 16 }}>
            <PulseSkeleton type="post" />
            <PulseSkeleton type="post" />
            <PulseSkeleton type="post" />
          </View>
        ) : (
          <FlashList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            estimatedItemSize={180}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="sparkles" size={40} color={PRIMARY} />
                </View>
                <Text style={styles.emptyText}>Welcome to your neighborhood!</Text>
                <Text style={styles.emptySub}>
                  It's a bit quiet right now. Why not be the one to start the conversation?
                </Text>
                
                <TouchableOpacity 
                  style={styles.emptyActionBtn} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.emptyActionText}>+ Create the first Pulse</Text>
                </TouchableOpacity>

                {sortBy === 'nearby' && selectedRadius < 500000 && (
                  <TouchableOpacity 
                    style={styles.expandBtn} 
                    onPress={() => { 
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                      setSelectedRadius(500000); 
                    }}
                  >
                    <Text style={styles.expandText}>Or see what's happening in the entire State ➔</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={async () => { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
          setModalVisible(true); 
          // Fetch area name when modal opens
          const loc = await LocationService.getCurrentLocation().catch(() => null);
          if (loc) {
            setCurrentArea("Your Neighborhood");
          }
        }}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.modalTitle}>New Pulse</Text>
                <TouchableOpacity 
                  style={[styles.anonToggle, isAnonymous && styles.anonToggleActive]} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsAnonymous(!isAnonymous);
                  }}
                >
                  <Ionicons name={isAnonymous ? "eye-off" : "eye"} size={14} color={isAnonymous ? "#FFF" : "#888"} />
                  <Text style={[styles.anonToggleText, isAnonymous && styles.anonToggleTextActive]}>
                    {isAnonymous ? "ANONYMOUS" : "PUBLIC"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handlePost} disabled={isPosting}>
                <Text style={[styles.postBtnText, isPosting && styles.postBtnDisabled]}>{isPosting ? '...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Location Badge */}
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color={PRIMARY} />
                <Text style={styles.locationBadgeText}>Posting to {currentArea}</Text>
              </View>

              {/* Post Type Switcher */}
              <View style={styles.modeSwitcher}>
                {[{key:'text',label:'Text'},{key:'poll',label:'Poll'}].map(m => (
                  <TouchableOpacity key={m.key} style={[styles.modeBtn, postMode === m.key && styles.modeBtnActive]} onPress={() => setPostMode(m.key)}>
                    <Text style={[styles.modeBtnText, postMode === m.key && styles.modeBtnTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Post Spread Selector */}
              <View style={styles.spreadContainer}>
                <Text style={styles.spreadLabel}>SPREAD RADIUS</Text>
                <View style={styles.spreadChips}>
                  {[
                    { label: '1km', val: 1000 },
                    { label: '10km', val: 10000 },
                    { label: 'City', val: 100000 },
                    { label: 'State', val: 500000 },
                    { label: 'Global', val: 0 }
                  ].map(r => (
                    <TouchableOpacity 
                      key={r.label} 
                      style={[styles.spreadChip, postSpread === r.val && styles.spreadChipActive]} 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPostSpread(r.val);
                      }}
                    >
                      <Text style={[styles.spreadChipText, postSpread === r.val && styles.spreadChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={postMode === 'poll' ? "Ask a question..." : "What's on your mind?"}
                placeholderTextColor="#555"
                multiline autoFocus maxLength={300}
                value={newPostText}
                onChangeText={setNewPostText}
              />

              {/* Poll Options */}
              {postMode === 'poll' && (
                <View style={styles.pollInputContainer}>
                  {pollOptions.map((opt, i) => (
                    <View key={i} style={styles.pollInputRow}>
                      <TextInput
                        style={styles.pollInput}
                        placeholder={`Option ${i + 1}`}
                        placeholderTextColor="#555"
                        value={opt}
                        onChangeText={v => { const next = [...pollOptions]; next[i] = v; setPollOptions(next); }}
                        maxLength={60}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                          <Ionicons name="close-circle" size={20} color="#555" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 4 && (
                    <TouchableOpacity style={styles.addOptionBtn} onPress={() => setPollOptions([...pollOptions, ''])}>
                      <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Mood Tags & Emergency */}
              <View style={styles.tagRow}>
                {MOOD_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag.label}
                    style={[styles.tagChip, selectedTag === tag.label && { borderColor: tag.color, backgroundColor: tag.color + '22' }]}
                    onPress={() => setSelectedTag(prev => prev === tag.label ? null : tag.label)}
                  >
                    <Text style={[styles.tagChipText, selectedTag === tag.label && { color: tag.color }]}>{tag.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.charCount, newPostText.length >= 300 && { color: '#FF4444' }]}>
                {newPostText.length}/300
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

      {/* Edit Post Modal */}
      <Modal visible={!!editingPost} animationType="slide" transparent onRequestClose={() => setEditingPost(null)}>
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditingPost(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={!editText.trim()}>
                <Text style={[styles.postBtnText, !editText.trim() && styles.postBtnDisabled]}>Save</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              multiline autoFocus maxLength={300}
              value={editText}
              onChangeText={setEditText}
              placeholderTextColor="#555"
            />
            <Text style={[styles.charCount, editText.length >= 300 && { color: '#FF4444' }]}>
              {editText.length}/300
            </Text>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </View>
  );
};

export default FeedScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  headerWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    zIndex: 100,
  },
  header: {
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 12,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: TEXT_MAIN, 
    letterSpacing: 2,
    textShadowColor: ACCENT + '44',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  sortToggle: { flexDirection: 'row', backgroundColor: '#161616', borderRadius: 12, padding: 3, gap: 2 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  sortBtnActive: { backgroundColor: '#252525' },
  sortText: { color: TEXT_SEC, fontWeight: '600', fontSize: 13 },
  sortTextActive: { color: TEXT_MAIN },
  listContainer: { flex: 1 },

  // Radius Bar
  radiusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  radiusLabel: { color: '#555', fontSize: 10, fontWeight: '900', marginRight: 10 },
  radiusScroll: { alignItems: 'center' },
  radiusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1A1A1A', marginRight: 8, borderWidth: 1, borderColor: '#333' },
  radiusChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  radiusChipText: { color: '#888', fontSize: 12, fontWeight: '700' },
  radiusChipTextActive: { color: '#FFF' },

  // Header Emergency Button
  // Location Badge
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  locationBadgeText: { color: TEXT_SEC, fontSize: 11, fontWeight: '700' },

  // Emergency Chip in Tag Row
  emergencyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FF444466', backgroundColor: '#FF444411' },
  emergencyChipActive: { backgroundColor: '#FF4444', borderColor: '#FF4444' },
  emergencyChipText: { color: '#FF4444', fontSize: 11, fontWeight: '900' },
  emergencyChipTextActive: { color: '#FFF' },

  // Anonymous Toggle in Header
  anonToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  anonToggleActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  anonToggleText: { color: '#888', fontSize: 9, fontWeight: '900' },
  anonToggleTextActive: { color: '#FFF' },

  // Spread Selector
  spreadContainer: { marginTop: 16, marginBottom: 20 },
  spreadLabel: { color: '#555', fontSize: 9, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
  spreadChips: { flexDirection: 'row', gap: 6 },
  spreadChip: { paddingHorizontal: 0, paddingVertical: 8, borderRadius: 10, backgroundColor: '#161616', borderWidth: 1, borderColor: '#222', flex: 1, alignItems: 'center' },
  spreadChipActive: { backgroundColor: ACCENT + '22', borderColor: ACCENT },
  spreadChipText: { color: '#666', fontSize: 11, fontWeight: '700' },
  spreadChipTextActive: { color: PRIMARY },
  postCard: {
    backgroundColor: CARD_BG, borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#1E1E1E',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    overflow: 'hidden'
  },
  hotPostCard: {
    borderColor: '#FF4500',
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
  },
  hotBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10
  },
  hotBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  distanceText: { color: ACCENT, fontSize: 11, fontWeight: '700' },
  ownCard: { borderColor: '#2A1A3A' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  yourBadge: {
    backgroundColor: ACCENT + '33', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  yourBadgeText: { color: PRIMARY, fontSize: 10, fontWeight: '700' },
  editedLabel: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { color: TEXT_SEC, fontSize: 12 },
  optionsBtn: { padding: 2 },
  postText: { color: TEXT_MAIN, fontSize: 16, lineHeight: 24, marginBottom: 14 },
  
  // Custom Dropdown Menu
  dropdownMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dropdownText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  emojiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#1E1E1E', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  emojiBtnActive: { borderColor: PRIMARY + '66', backgroundColor: PRIMARY + '15' },
  emojiText: { fontSize: 16 },
  emojiCount: { color: TEXT_MAIN, fontSize: 12, fontWeight: '700' },
  // Footer
  postFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#1E1E1E', paddingTop: 10,
  },
  voteContainer: { flexDirection: 'row', alignItems: 'center' },
  voteBtn: { paddingHorizontal: 8 },
  scoreText: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  commentBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#1E1E1E', borderRadius: 10, gap: 6,
  },
  commentText: { color: TEXT_SEC, fontWeight: '600', fontSize: 13 },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#222',
  },
  emptyText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySub: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyActionBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyActionText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  expandBtn: {
    padding: 10,
  },
  expandText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 16, minHeight: '55%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  cancelText: { color: TEXT_SEC, fontSize: 16 },
  modalTitle: { color: TEXT_MAIN, fontSize: 18, fontWeight: '700' },
  postBtnText: { color: PRIMARY, fontSize: 16, fontWeight: '700' },
  postBtnDisabled: { color: '#444' },
  modalInput: { 
    color: TEXT_MAIN, 
    fontSize: 18, 
    lineHeight: 26, 
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 8,
    paddingTop: 4,
  },
  charCount: { color: TEXT_SEC, textAlign: 'right', marginTop: 12, fontSize: 12 },
  // Mood Tags
  tagBadge: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  tagBadgeText: { fontSize: 12, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  tagChipText: { color: TEXT_SEC, fontSize: 13, fontWeight: '600' },
  // Post Type Switcher
  modeSwitcher: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 3, marginBottom: 16, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2A2A2A' },
  modeBtnText: { color: TEXT_SEC, fontWeight: '600', fontSize: 13 },
  modeBtnTextActive: { color: TEXT_MAIN },
  // Poll inputs
  pollInputContainer: { marginTop: 8, gap: 8 },
  pollInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollInput: { flex: 1, color: TEXT_MAIN, fontSize: 15, backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addOptionText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  // Poll display
  pollContainer: { marginBottom: 12, gap: 8 },
  pollOption: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  pollBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: PRIMARY + '33', borderRadius: 10 },
  pollOptionText: { flex: 1, color: TEXT_MAIN, fontSize: 14, fontWeight: '600' },
  pollPct: { color: TEXT_SEC, fontSize: 13, fontWeight: '700' },
  pollTotal: { color: TEXT_SEC, fontSize: 12, textAlign: 'right', marginTop: 2 },
  // Media in Modal
  mediaContainer: { marginTop: 20, marginBottom: 20 },
  addPhotoBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#1A1A1A', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#222' 
  },
  addPhotoText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  imagePreviewContainer: { position: 'relative', width: '100%', height: 200, borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 16 },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
});
