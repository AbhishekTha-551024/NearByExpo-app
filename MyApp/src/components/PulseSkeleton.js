import * as React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PulseSkeleton = ({ type = 'post' }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const startShimmer = () => {
      shimmerAnim.setValue(0);
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => startShimmer());
    };

    const startPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(() => startPulse());
    };

    startShimmer();
    startPulse();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const Shimmer = () => (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  if (type === 'post') {
    return (
      <Animated.View style={[styles.postCard, { opacity: pulseAnim }]}>
        <View style={styles.header}>
          <View style={styles.avatar}><Shimmer /></View>
          <View style={styles.headerText}>
            <View style={styles.nameBar}><Shimmer /></View>
            <View style={styles.metaBar}><Shimmer /></View>
          </View>
        </View>
        <View style={styles.contentBar}><Shimmer /></View>
        <View style={[styles.contentBar, { width: '70%' }]}><Shimmer /></View>
        <View style={styles.footer}>
          <View style={styles.iconCircle}><Shimmer /></View>
          <View style={styles.iconCircle}><Shimmer /></View>
          <View style={styles.iconCircle}><Shimmer /></View>
        </View>
      </Animated.View>
    );
  }

  if (type === 'user') {
    return (
      <Animated.View style={[styles.postCard, { flexDirection: 'row', alignItems: 'center', opacity: pulseAnim }]}>
        <View style={styles.avatar}><Shimmer /></View>
        <View style={[styles.headerText, { marginLeft: 16 }]}>
          <View style={[styles.nameBar, { width: '60%', height: 14 }]}><Shimmer /></View>
          <View style={[styles.metaBar, { width: '40%', height: 12 }]}><Shimmer /></View>
        </View>
        <View style={[styles.iconCircle, { width: 80, height: 40, borderRadius: 12 }]}><Shimmer /></View>
      </Animated.View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', overflow: 'hidden' },
  headerText: { marginLeft: 12, flex: 1 },
  nameBar: { width: '40%', height: 12, borderRadius: 6, backgroundColor: '#222', overflow: 'hidden', marginBottom: 8 },
  metaBar: { width: '25%', height: 10, borderRadius: 5, backgroundColor: '#222', overflow: 'hidden' },
  contentBar: { width: '100%', height: 14, borderRadius: 7, backgroundColor: '#222', overflow: 'hidden', marginBottom: 12 },
  footer: { flexDirection: 'row', marginTop: 10, gap: 20 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', overflow: 'hidden' },
});

export default PulseSkeleton;
