import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { hp, wp } from '~/helpers/common';

const Gradient = () => {
  return (
    <View style={[styles.gradient, { width: wp(100), height: hp(56.5) }]}>
      <LinearGradient
        colors={['rgba(15,16,20,1)', 'rgba(15,16,20,0)']}
        className="absolute left-0 right-0 top-0 h-[60]"
      />
      <LinearGradient
        colors={['rgba(16,17,21,0)', 'rgba(16,17,21,1)']}
        className="absolute bottom-0 left-0 right-0 h-[180]"
      />
    </View>
  );
};

export default Gradient;

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
