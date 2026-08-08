import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Heatmap({ days }: { days: { date: string; completed: boolean }[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const empty = Colors[colorScheme].border;

  // Pad to a full multiple of 7 so the grid lines up into weeks.
  const padCount = (7 - (days.length % 7)) % 7;
  const padded = [...Array(padCount).fill(null), ...days];

  return (
    <View style={styles.grid}>
      {padded.map((day, i) =>
        day === null ? (
          <View key={`pad-${i}`} style={styles.cell} />
        ) : (
          <MotiView
            key={day.date}
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 8, type: 'timing', duration: 200 }}
            style={[styles.cell, { backgroundColor: day.completed ? tint : empty }]}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 14, height: 14, borderRadius: 4 },
});
