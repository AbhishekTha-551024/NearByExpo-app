import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/userService';

const PRIMARY = '#8F00FF';
const ACCENT = '#BB86FC';

const formatToday = () =>
  new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const MainHomeScreen = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState({ chatCount: 0, trustScore: 100 });

  React.useEffect(() => {
    if (user?.uid) {
      UserService.getStats(user.uid).then(setStats);
    }
  }, [user?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A0033', '#0A0A0A', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello, {user?.name || 'User'}!</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Text style={styles.dateText}>{formatToday()}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Community Reach</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.chatCount}</Text>
              <Text style={styles.statLabel}>Vibes Found</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.trustScore}%</Text>
              <Text style={styles.statLabel}>Trust Level</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Getting Started</Text>
        <View style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: 'rgba(143, 0, 255, 0.16)' }]}>
            <Ionicons name="search" size={20} color="#D7A7FF" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Explore your neighborhood</Text>
            <Text style={styles.activityTime}>Start discovering neighbors nearby</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MainHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: 14,
    color: '#CFA8FF',
    marginTop: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#9B9B9B',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: ACCENT,
  },
  statLabel: {
    fontSize: 12,
    color: '#9B9B9B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F2F2F2',
  },
  activityTime: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
  },
});
