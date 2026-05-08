import * as React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PollComponent from './PollComponent';

const CARD_BG = '#131313';
const PRIMARY = '#BB86FC';
const ACCENT = '#8F00FF';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const PulsePost = ({ 
  item, 
  currentUserId, 
  isOpenMenu, 
  onToggleMenu, 
  onOpenEdit, 
  onConfirmDelete, 
  onPressPost, 
  onVote,
  showDistance = false
}) => {
  const isHot = item.score >= 5;
  const isOwn = item.authorId === currentUserId;
  const time = item.createdAt?.toDate
    ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const tagDef = item.tag ? [
    {label:'Rant',color:'#FF4444'},
    {label:'Event',color:'#44CC44'},
    {label:'Question',color:'#4488FF'},
    {label:'Confession',color:'#FFCC00'},
    {label:'Chill',color:'#BB86FC'},
    {label:'Help',color:'#FFD700'}
  ].find(t => t.label === item.tag) : null;

  const isLiked = item.likedBy?.includes(currentUserId);
  const isDisliked = item.dislikedBy?.includes(currentUserId);
  const score = item.score || 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
    <TouchableOpacity
      style={[
        styles.postCard, 
        isOwn && styles.ownCard,
        isHot && styles.hotPostCard,
        item.tag === 'Help' && styles.helpCard
      ]}
      onPress={() => onPressPost(item)}
      activeOpacity={0.85}
    >
      {isHot && (
        <View style={styles.hotBadge}>
          <Ionicons name="flame" size={12} color="#FF4500" />
          <Text style={styles.hotBadgeText}>TRENDING</Text>
        </View>
      )}
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.authorRow}>
          {item.authorName === 'Anonymous Neighbor' && (
            <Ionicons name="eye-off" size={14} color={TEXT_SEC} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.authorName, item.authorName === 'Anonymous Neighbor' && { color: TEXT_SEC, fontStyle: 'italic' }]}>
            {item.authorName}
          </Text>
          {isOwn && <View style={styles.yourBadge}><Text style={styles.yourBadgeText}>You</Text></View>}
          {item.editedAt && <Text style={styles.editedLabel}>edited</Text>}
        </View>
        <View style={styles.headerRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timeText}>{time}</Text>
            {item.distance !== undefined && (
              <Text style={styles.distanceText}>{item.distance < 1 ? `${(item.distance * 1000).toFixed(0)}m` : `${item.distance.toFixed(1)}km`} away</Text>
            )}
          </View>
          {isOwn && (
            <View style={{ zIndex: 10 }}>
              <TouchableOpacity 
                style={styles.optionsBtn}
                onPress={() => onToggleMenu(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={TEXT_SEC} />
              </TouchableOpacity>
              
              {isOpenMenu && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => onOpenEdit(item)}>
                    <Ionicons name="pencil" size={16} color={TEXT_MAIN} />
                    <Text style={styles.dropdownText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => onConfirmDelete(item.id)}>
                    <Ionicons name="trash" size={16} color="#FF4444" />
                    <Text style={[styles.dropdownText, { color: '#FF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Mood Tag Badge */}
      {tagDef && (
        <View style={[styles.tagBadge, { borderColor: tagDef.color + '66', backgroundColor: tagDef.color + '18' }]}>
          <Text style={[styles.tagBadgeText, { color: tagDef.color }]}>{tagDef.label}</Text>
        </View>
      )}

      {/* Text */}
      <Text style={styles.postText}>{item.text}</Text>

      {/* Poll */}
      {item.type === 'poll' && Array.isArray(item.pollOptions) && (
        <PollComponent post={item} currentUserId={currentUserId} />
      )}



      {/* Footer: Votes + Comment count */}
      <View style={styles.postFooter}>
        <View style={styles.voteContainer}>
          <TouchableOpacity style={styles.voteBtn} onPress={() => onVote(item.id, 1)}>
            <Ionicons name="arrow-up" size={22} color={isLiked ? PRIMARY : TEXT_SEC} />
          </TouchableOpacity>
          <Text style={[styles.scoreText, { color: isLiked ? PRIMARY : isDisliked ? '#FF4444' : TEXT_MAIN }]}>
            {score}
          </Text>
          <TouchableOpacity style={styles.voteBtn} onPress={() => onVote(item.id, -1)}>
            <Ionicons name="arrow-down" size={22} color={isDisliked ? '#FF4444' : TEXT_SEC} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.commentBtn}
          onPress={() => onPressPost(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={TEXT_SEC} />
          <Text style={styles.commentText}>{item.commentCount || 0} Replies</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(PulsePost, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.score === nextProps.item.score &&
    prevProps.item.likedBy?.includes(prevProps.currentUserId) === nextProps.item.likedBy?.includes(nextProps.currentUserId) &&
    prevProps.item.dislikedBy?.includes(prevProps.currentUserId) === nextProps.item.dislikedBy?.includes(nextProps.currentUserId) &&
    prevProps.item.commentCount === nextProps.item.commentCount &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.editedAt?.seconds === nextProps.item.editedAt?.seconds &&
    prevProps.isOpenMenu === nextProps.isOpenMenu &&
    prevProps.item.totalVotes === nextProps.item.totalVotes &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: CARD_BG, borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#1E1E1E',
    overflow: 'hidden'
  },
  ownCard: { borderColor: '#2A1A3A' },
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
  distanceText: { color: ACCENT, fontSize: 11, fontWeight: '700', marginTop: 2 },
  emergencyCard: {
    borderColor: '#FF4444',
    borderWidth: 1, 
    backgroundColor: 'transparent'
  },
  emergencyBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10
  },
  emergencyBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  helpCard: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD70008',
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#222',
  },
  
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

  tagBadge: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  tagBadgeText: { fontSize: 12, fontWeight: '700' },

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
});
