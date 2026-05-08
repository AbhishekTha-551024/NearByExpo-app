import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Image as RNImage,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/userService';
import { FeedService } from '../services/feedService';

const { width, height } = Dimensions.get('window');
const DARK_BG = '#0A0A0A';
const ACCENT = '#8F00FF';

// Profile Screen - Cleaned up to move settings to a dedicated screen
const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateUserData } = useAuth();
  const [stats, setStats] = React.useState({ chatCount: 0, trustScore: 100, radius: 10 });
  const [myPosts, setMyPosts] = React.useState([]);

  React.useEffect(() => {
    if (user?.uid) {
      UserService.getStats(user.uid).then(setStats);
      const unsub = FeedService.subscribeToUserPosts(user.uid, setMyPosts);
      return () => unsub();
    }
  }, [user?.uid]);

  const handleShuffleAvatar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const result = await UserService.shuffleAvatar(user.uid);
      if (result.success) {
        updateUserData({ profileImage: result.profileImage });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to shuffle avatar');
    }
  };

  const StatItem = ({ label, value }) => (
    <View style={styles.statItem}>
      <BlurView intensity={20} tint="dark" style={styles.statGlass}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </BlurView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Layer */}
      <RNImage 
        source={{ uri: user?.profileImage }} 
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} 
        blurRadius={50}
      />
      <LinearGradient
        colors={[DARK_BG, 'transparent', DARK_BG]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Settings Icon Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.settingsBtn} 
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header Card */}
          <BlurView intensity={40} tint="dark" style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <RNImage source={{ uri: user?.profileImage }} style={styles.avatar} />
              <TouchableOpacity style={styles.shuffleBadge} onPress={handleShuffleAvatar}>
                <Ionicons name="sync" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color="#D7A7FF" />
              <Text style={styles.locationBadgeText}>
                {user?.location?.area ? `${user.location.area}, ` : ''}{user?.location?.city || 'Neighborhood'}
              </Text>
            </View>
          </BlurView>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatItem label="Trust" value={`${stats.trustScore}%`} />
            <StatItem label="Chats" value={stats.chatCount} />
            <StatItem label="Range" value="Global" />
          </View>

          {/* My Posts History */}
          <BlurView intensity={20} tint="dark" style={styles.menuCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pulse" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>My Pulses</Text>
              </View>
              <Text style={{ color: '#555', fontSize: 12 }}>{myPosts.length} posts</Text>
            </View>

            {myPosts.length === 0 ? (
              <Text style={styles.emptyText}>You haven't posted anything yet. Go to the Pulse tab to make some noise locally!</Text>
            ) : (
              myPosts.map(post => {
                const time = post.createdAt?.toDate
                  ? post.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : '';
                return (
                  <TouchableOpacity 
                    key={post.id} 
                    style={styles.myPostItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PostDetail', { post })}
                  >
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.myPostText} numberOfLines={2}>{post.text}</Text>
                        <View style={styles.myPostMeta}>
                          <View style={styles.myPostStat}>
                            <Ionicons name="arrow-up" size={14} color="#BB86FC" />
                            <Text style={styles.myPostStatText}>{post.score || 0}</Text>
                          </View>
                          <View style={styles.myPostStat}>
                            <Ionicons name="chatbubble-outline" size={14} color="#666" />
                            <Text style={styles.myPostStatText}>{post.commentCount || 0}</Text>
                          </View>
                          <Text style={styles.myPostTime}>{time}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingTop: 0 },
  profileCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: ACCENT,
    padding: 3,
    marginBottom: 16
  },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  shuffleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ACCENT,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1A1A1A'
  },
  userName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  userEmail: { color: '#666', fontSize: 14, marginBottom: 0 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 0, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(143, 0, 255, 0.2)',
  },
  locationBadgeText: {
    color: '#D7A7FF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statItem: { width: (width - 60) / 3 },
  statGlass: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#666', fontSize: 10, marginTop: 4, fontWeight: '700' },
  menuCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 30
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    fontStyle: 'italic'
  },
  myPostItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  myPostText: {
    color: '#EEE',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    fontWeight: '500',
  },
  myPostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  myPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  myPostStatText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '700',
  },
  myPostTime: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  postThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#222',
  },
});
