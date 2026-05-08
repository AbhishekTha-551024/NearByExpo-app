import * as React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Pressable, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');
const ACCENT = '#8F00FF';

const ChatOptionsSheet = ({ visible, otherUserName, onReport, onBlock, onDelete, onClose }) => {
  const slideAnim = React.useRef(new Animated.Value(400)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat Options</Text>
            <Text style={styles.headerSub}>Managing conversation with {otherUserName}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {/* Report Option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => { onClose(); setTimeout(onReport, 200); }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,165,0,0.12)' }]}>
                <Ionicons name="flag-outline" size={20} color="#FFA500" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>Report User</Text>
                <Text style={styles.optionSubText}>Report for inappropriate behavior</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Block Option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => { onClose(); setTimeout(onBlock, 200); }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,68,68,0.12)' }]}>
                <Ionicons name="ban-outline" size={20} color="#FF4444" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionLabel, { color: '#FF4444' }]}>Block User</Text>
                <Text style={styles.optionSubText}>Stop receiving messages from them</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Delete Option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => { onClose(); setTimeout(onDelete, 200); }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <Ionicons name="trash-outline" size={20} color="#FFF" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>Delete Conversation</Text>
                <Text style={styles.optionSubText}>Permanently remove this chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default ChatOptionsSheet;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 20,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 4,
  },
  optionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  optionTextContainer: { flex: 1 },
  optionLabel: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  optionSubText: { color: '#636366', fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 76 },
  cancelBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
