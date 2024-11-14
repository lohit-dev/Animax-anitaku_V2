import { Image, StyleSheet } from 'react-native';

import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type HomeBannerProps = {
  index: number;
  item: Anime;
};

const HomeBanner = ({ index, item }: HomeBannerProps) => {
  return <Image source={{ uri: item.image }} style={styles.Image} />;
};
export default HomeBanner;

const styles = StyleSheet.create({
  Image: {
    ...StyleSheet.absoluteFillObject,
    width: wp(100),
    height: hp(56),
  },
});
