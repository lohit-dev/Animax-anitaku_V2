import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { hp, wp } from '~/helpers/common';

const Gradient = () => {
  return (
    <View style={[styles.gradient, { width: wp(100), height: hp(56.5) }]}>
      <LinearGradient colors={['rgba(15,16,20,1)', 'rgba(15,16,20,0)']} style={styles.topFade} />
      <LinearGradient colors={['rgba(16,17,21,0)', 'rgba(16,17,21,1)']} style={styles.bottomFade} />
    </View>
  );
};

export default Gradient;

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  topFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 60,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
});
