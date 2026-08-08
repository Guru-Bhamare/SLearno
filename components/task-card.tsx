import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RoutineTask } from '@/hooks/use-routine';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

const TASK_TYPE_ICON: Record<RoutineTask['task_type'], keyof typeof Ionicons.glyphMap> = {
  daily: 'checkbox-outline',
  skill: 'bulb-outline',
};

export function TaskCard({
  task,
  onComplete,
  onDefer,
}: {
  task: RoutineTask;
  onComplete: () => void;
  onDefer: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const statusColor =
    task.status === 'done' ? colors.success : task.status === 'deferred' ? colors.warning : colors.tint;

  return (
    <View style={[styles.card, cardStyle(colorScheme)]}>
      <Pressable
        onPress={task.status === 'pending' ? onComplete : undefined}
        hitSlop={8}
        style={[
          styles.checkbox,
          {
            borderColor: statusColor,
            backgroundColor: task.status === 'done' ? statusColor : 'transparent',
          },
        ]}>
        {task.status === 'done' && <Ionicons name="checkmark" size={16} color="#fff" />}
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={TASK_TYPE_ICON[task.task_type]} size={14} color={colors.icon} />
          <ThemedText type="subtitle" style={task.status !== 'pending' ? styles.strike : undefined}>
            {task.title}
          </ThemedText>
          {task.source === 'ai' && (
            <View style={[styles.aiBadge, { backgroundColor: withAlpha(colors.tint, 0.14) }]}>
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.tint }}>AI suggested</ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="label" style={{ color: statusColor }}>
          {task.skill_area} · {task.time_block}
          {task.is_compressed ? ' · compressed day' : ''}
        </ThemedText>
      </View>

      {task.status === 'pending' && (
        <Pressable onPress={onDefer} hitSlop={8} style={styles.deferButton}>
          <ThemedText type="muted">Defer</ThemedText>
        </Pressable>
      )}
      {task.status === 'deferred' && <ThemedText style={{ color: statusColor }}>Deferred</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strike: { textDecorationLine: 'line-through' },
  aiBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deferButton: { paddingHorizontal: 6, paddingVertical: 4 },
});
