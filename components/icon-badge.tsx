import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { withAlpha } from '@/lib/color';

export function IconBadge({
  name,
  color,
  size = 36,
  iconSize = 18,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(color, 0.14),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={name} size={iconSize} color={color} />
    </View>
  );
}
