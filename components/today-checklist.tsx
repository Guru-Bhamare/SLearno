import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatTimeLabel } from '@/components/time-stepper';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { effectiveStartTime, type RoutineTask } from '@/hooks/use-routine';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

const SECTION = {
  academics: {
    title: 'Academics',
    icon: 'school-outline' as const,
    accentKey: 'tint' as const,
  },
  skills: {
    title: 'Additional skills',
    icon: 'bulb-outline' as const,
    accentKey: 'success' as const,
  },
} as const;

function MetaChip({ label, accent, muted }: { label: string; accent: string; muted?: boolean }) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: muted ? withAlpha(accent, 0.06) : withAlpha(accent, 0.1),
          borderColor: withAlpha(accent, muted ? 0.1 : 0.18),
        },
      ]}>
      <ThemedText
        numberOfLines={1}
        style={[styles.chipText, { color: muted ? accent : accent, opacity: muted ? 0.85 : 1 }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function ChecklistItem({
  task,
  accent,
  onToggle,
  onDefer,
}: {
  task: RoutineTask;
  accent: string;
  onToggle: () => void;
  onDefer: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isDone = task.status === 'done';
  const isDeferred = task.status === 'deferred';
  const isPending = task.status === 'pending';
  const start = effectiveStartTime(task);
  const timeLabel = `${formatTimeLabel(start)} · ${task.duration_min} min`;

  return (
    <View style={[styles.itemWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable
        onPress={isDeferred ? undefined : onToggle}
        style={({ pressed }) => [styles.itemRow, pressed && !isDeferred && { opacity: 0.85 }]}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isDone ? accent : withAlpha(accent, 0.45),
              backgroundColor: isDone ? accent : 'transparent',
            },
          ]}>
          {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>

        <View style={styles.itemContent}>
          <ThemedText
            numberOfLines={3}
            style={[
              styles.itemTitle,
              {
                color: colors.text,
                textDecorationLine: isDone ? 'line-through' : 'none',
                opacity: isDeferred ? 0.5 : 1,
              },
            ]}>
            {task.title}
          </ThemedText>

          <View style={styles.chipRow}>
            <MetaChip label={timeLabel} accent={accent} />
            {task.skill_area !== 'general' && (
              <MetaChip label={task.skill_area} accent={accent} muted />
            )}
            {isDeferred && (
              <View style={[styles.chip, { backgroundColor: withAlpha(colors.warning, 0.12), borderColor: withAlpha(colors.warning, 0.2) }]}>
                <ThemedText numberOfLines={1} style={[styles.chipText, { color: colors.warning }]}>
                  Skipped
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {isPending && (
        <Pressable onPress={onDefer} hitSlop={8} style={styles.skipBtn}>
          <ThemedText type="muted" style={styles.skipText}>
            Skip for today
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function TaskSection({
  sectionKey,
  tasks,
  onToggle,
  onDefer,
}: {
  sectionKey: keyof typeof SECTION;
  tasks: RoutineTask[];
  onToggle: (task: RoutineTask) => void;
  onDefer: (task: RoutineTask) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const meta = SECTION[sectionKey];
  const accent = colors[meta.accentKey];

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => effectiveStartTime(a).localeCompare(effectiveStartTime(b))),
    [tasks]
  );

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length ? doneCount / tasks.length : 0;

  if (!tasks.length) return null;

  return (
    <View style={[styles.sectionCard, cardStyle(colorScheme)]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: withAlpha(accent, 0.1) }]}>
            <Ionicons name={meta.icon} size={16} color={accent} />
          </View>
          <View style={styles.sectionTitleText}>
            <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 17 }}>
              {meta.title}
            </ThemedText>
            <ThemedText type="muted" style={styles.sectionCount}>
              {doneCount} of {tasks.length} done
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: withAlpha(accent, 0.12) }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
      </View>

      <View style={styles.itemList}>
        {sorted.map((task, i) => (
          <MotiView
            key={task.id}
            from={{ opacity: 0, translateY: 4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 35 }}>
            <ChecklistItem
              task={task}
              accent={accent}
              onToggle={() => onToggle(task)}
              onDefer={() => onDefer(task)}
            />
          </MotiView>
        ))}
      </View>
    </View>
  );
}

/** Today's tasks split into Academics and Additional Skills checklists. */
export function TodayChecklist({
  tasks,
  onComplete,
  onDefer,
}: {
  tasks: RoutineTask[];
  onComplete: (task: RoutineTask) => void;
  onDefer: (task: RoutineTask) => void;
}) {
  const academics = useMemo(() => tasks.filter((t) => t.task_type === 'daily'), [tasks]);
  const skills = useMemo(() => tasks.filter((t) => t.task_type === 'skill'), [tasks]);

  if (!tasks.length) return null;

  return (
    <View style={styles.root}>
      <TaskSection sectionKey="academics" tasks={academics} onToggle={onComplete} onDefer={onDefer} />
      <TaskSection sectionKey="skills" tasks={skills} onToggle={onComplete} onDefer={onDefer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  sectionCard: { padding: 16, gap: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitleText: { flex: 1, minWidth: 0, gap: 2 },
  sectionCount: { fontSize: 13 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  itemList: { gap: 8 },
  itemWrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  itemContent: { flex: 1, minWidth: 0, gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  skipBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingBottom: 8 },
  skipText: { fontSize: 12 },
});
