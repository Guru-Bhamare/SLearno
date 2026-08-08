import { Platform, ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

export function cardStyle(scheme: 'light' | 'dark'): ViewStyle {
  return {
    backgroundColor: Colors[scheme].card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors[scheme].border,
  };
}

export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#1B1E2A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 3 },
  default: {},
}) as ViewStyle;
