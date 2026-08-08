/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#4F6EF7';
const tintColorDark = '#7C93FF';

export const Colors = {
  light: {
    text: '#161A2B',
    background: '#F7F8FC',
    card: '#FFFFFF',
    border: '#ECEEF6',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9AA1B4',
    tabIconSelected: tintColorLight,
    success: '#2E7D32',
    warning: '#B26A00',
    gradientStart: '#6C7BFA',
    gradientEnd: '#4F6EF7',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F1117',
    card: '#1B1E2A',
    border: '#262A38',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#6B7086',
    tabIconSelected: tintColorDark,
    success: '#4CAF50',
    warning: '#E0A64D',
    gradientStart: '#3D3FA8',
    gradientEnd: '#5A63D8',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
