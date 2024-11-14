import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { hp, wp } from '~/helpers/common';

const Gradient = () => {
  return (
    <View style={[styles.gradient, { width: wp(100), height: hp(56.5) }]}>
      <LinearGradient
        colors={['rgba(15,16,20,0)', 'rgba(15,16,20,1)']}
        style={styles.gradientBottom}
      />
      <LinearGradient
        colors={['rgba(15,16,20,1)', 'rgba(15,16,20,0)']}
        style={styles.gradientTop}
      />
    </View>
  );
};
export default Gradient;

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    right: 0,
    height: 180,
  },
  gradientTop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 60,
  },
});
