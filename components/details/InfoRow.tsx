import { Calendar, InfoCircle, Star1, Tag, Translate, Video } from 'iconsax-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { wp } from '~/helpers/common';

interface InfoRowProps {
  label: string;
  value: string;
  icon?: 'translate' | 'calendar' | 'star' | 'video' | 'tag' | 'info';
  valueStyle?: string;
  containerStyle?: string;
  numberOfLines?: number;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  icon,
  valueStyle = 'text-white',
  containerStyle = '',
  numberOfLines = 1,
}) => {
  const getIcon = () => {
    const iconSize = wp(5);
    const iconColor = '#a3e635';

    switch (icon) {
      case 'translate':
        return <Translate size={iconSize} color={iconColor} />;
      case 'calendar':
        return <Calendar size={iconSize} color={iconColor} />;
      case 'star':
        return <Star1 size={iconSize} color={iconColor} />;
      case 'video':
        return <Video size={iconSize} color={iconColor} />;
      case 'tag':
        return <Tag size={iconSize} color={iconColor} />;
      case 'info':
        return <InfoCircle size={iconSize} color={iconColor} />;
      default:
        return null;
    }
  };

  return (
    <View className={`flex-row items-start justify-between py-1 ${containerStyle}`}>
      <View className="flex-row items-center gap-3">
        {getIcon()}
        <Text style={{ fontSize: wp(4) }} className="font-salsa text-neutral-400">
          {label}
        </Text>
      </View>
      <Text
        className={`font-salsa ${valueStyle}`}
        style={{
          maxWidth: wp(45),
          fontSize: wp(4),
        }}
        numberOfLines={numberOfLines}>
        {value}
      </Text>
    </View>
  );
};

export default InfoRow;
