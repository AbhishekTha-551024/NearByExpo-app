import * as React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Pressable, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');
const ACCENT = '#8F00FF';

const MessageActionSheet = ({ visible, message, onEdit, onDelete, onClose }) => {
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
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

  if (!visible && !message) return null;

  // Preview text, truncated
  const preview = message?.text?.length > 60
    ? message.text.slice(0, 60) + '...'
    : message?.text;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Dark opaque backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Message Preview */}
          {preview ? (
            <View style={styles.previewBox}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#777" style={{ marginRight: 8 }} />
              <Text style={styles.previewText} numberOfLines={2}>{preview}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Edit Option */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => { onClose(); setTimeout(onEdit, 150); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(143,0,255,0.12)' }]}>
              <Ionicons name="pencil" size={20} color={ACCENT} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Edit Message</Text>
              <Text style={styles.optionSub}>Change what you said</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Delete Option */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => { onClose(); setTimeout(onDelete, 150); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,68,68,0.12)' }]}>
              <Ionicons name="trash" size={20} color="#FF4444" />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: '#FF4444' }]}>Delete Message</Text>
              <Text style={styles.optionSub}>Remove for everyone</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          {/* Cancel */}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default MessageActionSheet;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  previewText: {
    flex: 1,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  optionIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  optionSub: { color: '#666', fontSize: 12, marginTop: 2 },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: { color: '#CCC', fontSize: 16, fontWeight: '700' },
});
