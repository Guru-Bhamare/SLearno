import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Extra breathing room below the status-bar strip so headers don't sit flush against it.
const HEADER_TOP_SPACING = 16;

export function Screen({
  children,
  scroll = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const colors = Colors[colorScheme];
  const contentPaddingTop = insets.top + HEADER_TOP_SPACING;

  const statusBarBackdrop = (
    <View
      pointerEvents="none"
      style={[styles.statusBarBackdrop, { height: insets.top, backgroundColor: colors.statusBar }]}
    />
  );

  if (!scroll) {
    return (
      <View style={[styles.container, styles.flexFill, { backgroundColor: colors.background, paddingTop: contentPaddingTop }, style]}>
        {statusBarBackdrop}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flexFill}
        contentContainerStyle={[styles.container, { paddingTop: contentPaddingTop }, style]}>
        {children}
      </ScrollView>
      {statusBarBackdrop}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  flexFill: {
    flex: 1,
  },
  statusBarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
