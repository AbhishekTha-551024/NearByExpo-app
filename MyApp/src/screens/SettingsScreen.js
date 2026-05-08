import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Switch, 
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/userService';
import { ChatService } from '../services/chatService';

const DARK_BG = '#0A0A0A';
const ACCENT = '#8F00FF';
const TEXT_MAIN = '#FFFFFF';
const TEXT_SEC = '#888888';

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: 'Global', value: 9999 },
];

const SettingsScreen = ({ navigation }) => {
  const { user, logout, updateUserData, refreshLocation } = useAuth();
  
  // Existing States
  const [isGhostMode, setIsGhostMode] = React.useState(user?.isVisible === false);
  const [bio, setBio] = React.useState(user?.bio || "");
  const [isEditingBio, setIsEditingBio] = React.useState(false);
  
  // New States
  const [radius, setRadius] = React.useState(user?.radius || 10);
  const [isNameModalVisible, setNameModalVisible] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.name || "");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = React.useState(false);

  // ─── Bio & Ghost Mode ───────────────────────────────────────────
  const handleGhostMode = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGhostMode(value);
    try {
      await UserService.toggleVisibility(user.uid, !value);
      updateUserData({ isVisible: !value });
    } catch (e) {
      setIsGhostMode(!value);
      Alert.alert('Error', 'Failed to update visibility');
    }
  };

  const saveBio = async () => {
    try {
      await UserService.updateBio(user.uid, bio);
      updateUserData({ bio });
      setIsEditingBio(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Failed to save bio');
    }
  };

  // ─── Premium Features ───────────────────────────────────────────
  const handleRadiusChange = async (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRadius(val);
    try {
      // Assuming you might add an updateRadius method in the future
      await UserService.updateUserProfile(user.uid, { radius: val });
      updateUserData({ radius: val });
    } catch (e) {
      console.log('Radius update failed');
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await UserService.updateName(user.uid, newName.trim());
      updateUserData({ name: newName.trim() });
      setNameModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Could not update name');
    }
  };

  const handleReportBug = () => {
    Linking.openURL('mailto:jagatrajjagatraj55102@gmail.com?subject=Bug Report - Pulse App');
  };

  const handleRefreshNeighborhood = async () => {
    try {
      setIsRefreshingLocation(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await refreshLocation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Neighborhood updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Could not refresh location. Please check your GPS permissions.');
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This will instantly delete your profile, all your posts, and all your messages. THIS CANNOT BE UNDONE.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Data", 
          style: "destructive", 
          onPress: async () => {
            setIsDeleting(true);
            try {
              await UserService.deleteAccount(user.uid);
              // The AuthContext onAuthStateChanged will handle logging the user out visually
            } catch (e) {
              setIsDeleting(false);
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert(
                  "Sensitive Operation", 
                  "For your security, you must have logged in recently to delete your account. Please log out and log back in, then try again.",
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert("Error", "Could not delete account. Please try again later.");
              }
            }
          }
        }
      ]
    );
  };
  

  // ─── Render Components ──────────────────────────────────────────
  const SettingsItem = ({ icon, color, title, onPress, showChevron=true, destructive=false }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.menuText, destructive && { color: '#FF4B4B' }]}>{title}</Text>
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#666" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={TEXT_MAIN} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Identity & Bio */}
          <Text style={styles.sectionHeading}>IDENTITY</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <TouchableOpacity onPress={() => isEditingBio ? saveBio() : setIsEditingBio(true)}>
                <Text style={styles.editLink}>{isEditingBio ? 'Save' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>
            {isEditingBio ? (
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your neighbors about yourself..."
                placeholderTextColor="#666"
                multiline
                maxLength={150}
                autoFocus
              />
            ) : (
              <Text style={styles.bioText}>
                {bio || "Tap edit to add a bio and let neighbors know who you are!"}
              </Text>
            )}
            <View style={styles.divider} />
            <SettingsItem 
              icon="person" color="#00D1FF" title="Edit Anonymous Name" 
              onPress={() => setNameModalVisible(true)} 
            />
          </BlurView>

          {/* Preferences */}
          <Text style={styles.sectionHeading}>PREFERENCES</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            {/* Radius Slider Chips */}
            <View style={styles.radiusContainer}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FFD70022' }]}>
                  <Ionicons name="location" size={20} color="#FFD700" />
                </View>
                <Text style={styles.menuText}>Discovery Radius</Text>
              </View>
              <View style={styles.chipRow}>
                {RADIUS_OPTIONS.map(opt => (
                  <TouchableOpacity 
                    key={opt.label}
                    style={[styles.chip, radius === opt.value && styles.chipActive]}
                    onPress={() => handleRadiusChange(opt.value)}
                  >
                    <Text style={[styles.chipText, radius === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            
            {/* Ghost Mode Toggle */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#BB86FC22' }]}>
                  <Ionicons name="eye-off" size={20} color="#BB86FC" />
                </View>
                <Text style={styles.menuText}>Ghost Mode</Text>
              </View>
              <Switch 
                value={isGhostMode} 
                onValueChange={handleGhostMode}
                trackColor={{ false: '#333', true: ACCENT }}
              />
            </View>
            <Text style={styles.helpText}>Hide your profile from the Map and Discovery list.</Text>
          </BlurView>

          {/* Location & Neighborhood */}
          <Text style={styles.sectionHeading}>LOCATION & NEIGHBORHOOD</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.locationInfo}>
              <View style={styles.locationHeader}>
                <Ionicons name="location-sharp" size={24} color={ACCENT} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.currentLocationTitle}>Current Neighborhood</Text>
                  <Text style={styles.currentLocationText}>
                    {user?.location?.area || 'Nearby'}, {user?.location?.city || 'Unknown City'}
                  </Text>
                </View>
              </View>
              <Text style={styles.locationHelp}>
                This is your "Fixed Anchor." The app uses this location to show local pulses and neighbors. You can update it whenever you move or visit a new area.
              </Text>
              
              <TouchableOpacity 
                style={[styles.refreshBtn, isRefreshingLocation && { opacity: 0.6 }]} 
                onPress={handleRefreshNeighborhood}
                disabled={isRefreshingLocation}
              >
                {isRefreshingLocation ? (
                  <Text style={styles.refreshBtnText}>UPDATING...</Text>
                ) : (
                  <>
                    <Ionicons name="sync" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.refreshBtnText}>SET HOME TO CURRENT LOCATION</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Safety & Support */}
          <Text style={styles.sectionHeading}>SAFETY & SUPPORT</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <SettingsItem 
              icon="shield-checkmark" color="#4CAF50" title="Community Guidelines" 
              onPress={() => navigation.navigate('Guidelines')} 
            />
            <View style={styles.divider} />
            <SettingsItem 
              icon="bug" color="#888" title="Report a Bug" 
              onPress={handleReportBug} 
            />
            <View style={styles.divider} />
            <SettingsItem 
              icon="log-out" color="#888" title="Log Out" 
              onPress={logout} showChevron={false} 
            />
          </BlurView>

          {/* Danger Zone */}
          <Text style={styles.sectionHeading}>DANGER ZONE</Text>
          <BlurView intensity={20} tint="dark" style={[styles.card, { borderColor: '#FF4B4B44' }]}>
            <SettingsItem 
              icon="trash" color="#FF4B4B" title={isDeleting ? "Deleting..." : "Delete Account"} 
              onPress={isDeleting ? null : handleDeleteAccount} 
              showChevron={false} destructive={true} 
            />
          </BlurView>


        </ScrollView>
      </SafeAreaView>

      {/* Edit Name Modal */}
      <Modal visible={isNameModalVisible} animationType="fade" transparent>
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Anonymous Name</Text>
            <Text style={styles.modalSub}>Pick a cool new alias.</Text>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Neon Runner #404"
              placeholderTextColor="#666"
              maxLength={25}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setNameModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </View>
  );
};

export default SettingsScreen;

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
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  editLink: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  bioText: {
    color: '#BBB',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bioInput: {
    color: '#FFF',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    color: '#DDD',
    fontSize: 15,
    fontWeight: '600',
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  radiusContainer: {
    padding: 16,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  chipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFD700',
    fontWeight: '800',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#151515',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  nameInput: {
    color: '#FFF',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Location Section Styles
  locationInfo: {
    padding: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTextContainer: {
    marginLeft: 12,
  },
  currentLocationTitle: {
    color: TEXT_SEC,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  currentLocationText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  locationHelp: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshBtn: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  refreshBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
