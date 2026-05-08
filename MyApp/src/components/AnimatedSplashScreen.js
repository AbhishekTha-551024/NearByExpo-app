import * as React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedSplashScreen = ({ onAnimationComplete }) => {
  const fadeOutAnim = React.useRef(new Animated.Value(1)).current;
  
  // Icon animations
  const iconScale = React.useRef(new Animated.Value(0)).current;
  const iconOpacity = React.useRef(new Animated.Value(0)).current;

  // Letter animations
  const letters = ['P', 'U', 'L', 'S', 'E'];
  const letterAnims = React.useRef(letters.map(() => new Animated.Value(0))).current;
  const letterTranslates = React.useRef(letters.map(() => new Animated.Value(50))).current;

  // Shockwave/Pulse effect for the word
  const wordScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // 1. Icon pops in
    const iconAnim = Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]);

    // 2. Letters slide up and fade in (staggered)
    const letterAnimations = letters.map((_, i) => {
      return Animated.parallel([
        Animated.timing(letterAnims[i], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(letterTranslates[i], {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]);
    });

    const staggerLetters = Animated.stagger(100, letterAnimations);

    // 3. Shockwave (pulse) effect on the whole word
    const shockwave = Animated.sequence([
      Animated.timing(wordScale, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(wordScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]);

    // 4. Fade out everything
    const fadeOut = Animated.timing(fadeOutAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    });

    Animated.sequence([
      Animated.delay(200),
      iconAnim,
      Animated.delay(100),
      staggerLetters,
      Animated.delay(300),
      shockwave,
      Animated.delay(600), // Hold for users to see
      fadeOut,
    ]).start(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, [fadeOutAnim, iconOpacity, iconScale, letterAnims, letterTranslates, wordScale, letters, onAnimationComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
      <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.content}>
        {/* Animated Icon */}
        <Animated.View 
          style={{ 
            opacity: iconOpacity, 
            transform: [{ scale: iconScale }],
            alignItems: 'center'
          }}
        >
          <LinearGradient
            colors={['#8F00FF', '#BB86FC']}
            style={styles.iconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="pulse" size={48} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Animated Letters */}
        <Animated.View style={[styles.wordContainer, { transform: [{ scale: wordScale }] }]}>
          {letters.map((letter, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.titleLetter,
                {
                  opacity: letterAnims[i],
                  transform: [{ translateY: letterTranslates[i] }]
                }
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default AnimatedSplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Ensure it covers everything
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8F00FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLetter: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginHorizontal: 1,
  }
});
