import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeedService } from '../services/feedService';
import * as Haptics from 'expo-haptics';

const PRIMARY = '#BB86FC';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const PollComponent = ({ post, currentUserId }) => {
  const [userVote, setUserVote] = React.useState(null);
  const [isVoting, setIsVoting] = React.useState(false);

  React.useEffect(() => {
    const fetchVote = async () => {
      const vote = await FeedService.getUserPollVote(post.id, currentUserId);
      if (vote !== null) {
        setUserVote(vote);
      }
    };
    fetchVote();
  }, [post.id, currentUserId]);

  const handleVote = async (idx) => {
    if (userVote !== null || isVoting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVoting(true);
    try {
      setUserVote(idx); // optimistic UI update
      const result = await FeedService.voteOnPoll(post.id, currentUserId, idx);
      if (result !== undefined && result !== idx) {
        setUserVote(result);
      }
    } catch (error) {
      setUserVote(null); // revert on error
    } finally {
      setIsVoting(false);
    }
  };

  if (!post.pollOptions || !Array.isArray(post.pollOptions)) return null;

  return (
    <View style={styles.pollContainer}>
      {post.pollOptions.map((opt, idx) => {
        const total = post.totalVotes || 0;
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
        const isSelected = userVote === idx;
        
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
            onPress={() => handleVote(idx)}
            disabled={userVote !== null || isVoting}
            activeOpacity={userVote !== null ? 1 : 0.7}
          >
            <View style={[styles.pollBar, { width: `${pct}%` }, isSelected && styles.pollBarSelected]} />
            <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>{opt.text}</Text>
            {userVote !== null && <Text style={[styles.pollPct, isSelected && styles.pollPctSelected]}>{pct}%</Text>}
          </TouchableOpacity>
        );
      })}
      <Text style={styles.pollTotal}>{post.totalVotes || 0} votes</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pollContainer: { marginBottom: 12, gap: 8 },
  pollOption: { 
    borderRadius: 10, 
    overflow: 'hidden', 
    backgroundColor: '#1A1A1A', 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 40, 
    paddingHorizontal: 12, 
    borderWidth: 1, 
    borderColor: '#2A2A2A' 
  },
  pollOptionSelected: {
    borderColor: PRIMARY,
  },
  pollBar: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    backgroundColor: PRIMARY + '33', 
    borderRadius: 10 
  },
  pollBarSelected: {
    backgroundColor: PRIMARY + '4D',
  },
  pollOptionText: { 
    flex: 1, 
    color: TEXT_MAIN, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  pollOptionTextSelected: {
    color: PRIMARY,
  },
  pollPct: { 
    color: TEXT_SEC, 
    fontSize: 13, 
    fontWeight: '700' 
  },
  pollPctSelected: {
    color: PRIMARY,
  },
  pollTotal: { 
    color: TEXT_SEC, 
    fontSize: 12, 
    textAlign: 'right', 
    marginTop: 2 
  },
});

export default PollComponent;
