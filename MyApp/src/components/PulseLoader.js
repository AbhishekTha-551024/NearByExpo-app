import * as React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const PRIMARY = '#BB86FC';

const PulseLoader = ({ size = 40, color = PRIMARY }) => {
  const anim1 = React.useRef(new Animated.Value(0)).current;
  const anim2 = React.useRef(new Animated.Value(0)).current;
  const anim3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const createAnimation = (anim, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ),
      ]);
    };

    Animated.parallel([
      createAnimation(anim1, 0),
      createAnimation(anim2, 600),
      createAnimation(anim3, 1200),
    ]).start();
  }, [anim1, anim2, anim3]);

  const createCircleStyle = (anim) => {
    return {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: size / 10,
      borderColor: color,
      opacity: anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 0.4, 0],
      }),
      transform: [
        {
          scale: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 2], // Expands from center
          }),
        },
      ],
    };
  };

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={createCircleStyle(anim1)} />
      <Animated.View style={createCircleStyle(anim2)} />
      <Animated.View style={createCircleStyle(anim3)} />
      {/* Inner solid dot */}
      <View 
        style={{ 
          position: 'absolute',
          width: size / 2.5, 
          height: size / 2.5, 
          borderRadius: size / 5, 
          backgroundColor: color 
        }} 
      />
    </View>
  );
};

export default PulseLoader;
