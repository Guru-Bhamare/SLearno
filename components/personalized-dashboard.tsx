import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ProfileAnalysis } from '@/hooks/use-profile-analysis';
import { cardStyle } from '@/lib/theme-styles';

export function PersonalizedDashboard({ analysis }: { analysis: ProfileAnalysis | null | undefined }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const priorities = analysis?.priorities ?? [];
  const actions = analysis?.actions_taken ?? [];
  if (!priorities.length && !actions.length) return null;

  return (
    <View style={[{ padding: 16, gap: 12 }, cardStyle(colorScheme)]}>
      <ThemedText type="label" style={{ color: colors.tint }}>
        Your plan
      </ThemedText>

      {!!priorities.length && (
        <View style={{ gap: 6 }}>
          {priorities.map((item, i) => (
            <ThemedText key={i} type="muted">
              • {item}
            </ThemedText>
          ))}
        </View>
      )}

      {!!actions.length && (
        <View
          style={[
            { gap: 6 },
            !!priorities.length && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
          ]}>
          {actions.map((item, i) => (
            <ThemedText key={i} type="muted" style={{ color: colors.success }}>
              ✓ {item}
            </ThemedText>
          ))}
        </View>
      )}
    </View>
  );
}
