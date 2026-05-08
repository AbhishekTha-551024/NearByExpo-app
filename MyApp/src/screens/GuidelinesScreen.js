import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const DARK_BG = '#0A0A0A';
const ACCENT = '#8F00FF';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const GuidelinesScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={TEXT_MAIN} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Guidelines</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={ACCENT} />
            <Text style={styles.title}>Keep the Vibe Safe</Text>
            <Text style={styles.subtitle}>
              Our anonymous community is built on trust, safety, and mutual respect.
            </Text>
          </View>

          <BlurView intensity={20} tint="dark" style={styles.card}>
            <RuleItem 
              icon="hand-left" 
              title="No Bullying or Harassment"
              desc="We have a zero-tolerance policy for targeted harassment, bullying, or hate speech. Treat everyone with respect."
            />
            <RuleItem 
              icon="eye-off" 
              title="No Doxxing"
              desc="Do not reveal the real-world identity, location, or private contact information of anyone on the platform."
            />
            <RuleItem 
              icon="warning" 
              title="No Illegal Content"
              desc="Posting illegal content or soliciting illegal activities will result in an immediate and permanent device ban."
            />
            <RuleItem 
              icon="heart" 
              title="Be Kind"
              desc="Anonymity is a privilege. Use it to share ideas, vent safely, and connect with neighbors, not to cause harm."
            />
          </BlurView>

          <Text style={styles.footerText}>
            Repeated violations will result in your account and device being permanently blocked from the platform.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const RuleItem = ({ icon, title, desc }) => (
  <View style={styles.ruleItem}>
    <View style={styles.ruleIconBox}>
      <Ionicons name={icon} size={24} color={ACCENT} />
    </View>
    <View style={styles.ruleTextContainer}>
      <Text style={styles.ruleTitle}>{title}</Text>
      <Text style={styles.ruleDesc}>{desc}</Text>
    </View>
  </View>
);

export default GuidelinesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  safeArea: { flex: 1 },
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
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_MAIN,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: TEXT_SEC,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    padding: 20,
    gap: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 16,
  },
  ruleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(143, 0, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleTextContainer: {
    flex: 1,
  },
  ruleTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  ruleDesc: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  }
});
