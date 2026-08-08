import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { TaskCard } from '@/components/task-card';
import { ThemedText } from '@/components/themed-text';
import { formatTimeLabel, timeToMinutes } from '@/components/time-stepper';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DayBlock } from '@/hooks/use-day-map';
import { effectiveStartTime, type RoutineTask } from '@/hooks/use-routine';
import { withAlpha } from '@/lib/color';

type TimelineEntry =
  | { kind: 'block'; block: DayBlock; tasks: RoutineTask[] }
  | { kind: 'unscheduled'; tasks: RoutineTask[] };

function buildTimeline(blocks: DayBlock[], tasks: RoutineTask[]): TimelineEntry[] {
  const sortedBlocks = [...blocks].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const unscheduled: RoutineTask[] = [];

  const entries: TimelineEntry[] = sortedBlocks.map((block) => ({ kind: 'block', block, tasks: [] }));

  for (const task of tasks) {
    const taskMinutes = timeToMinutes(effectiveStartTime(task));
    const match = entries.find((entry) => {
      if (entry.kind !== 'block') return false;
      const start = timeToMinutes(entry.block.start_time);
      const end = timeToMinutes(entry.block.end_time);
      return taskMinutes >= start && taskMinutes < end;
    });
    if (match && match.kind === 'block') {
      match.tasks.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  for (const entry of entries) {
    if (entry.kind === 'block') {
      entry.tasks.sort((a, b) => timeToMinutes(effectiveStartTime(a)) - timeToMinutes(effectiveStartTime(b)));
    }
  }

  if (unscheduled.length > 0) {
    unscheduled.sort((a, b) => timeToMinutes(effectiveStartTime(a)) - timeToMinutes(effectiveStartTime(b)));
    entries.unshift({ kind: 'unscheduled', tasks: unscheduled });
  }

  return entries;
}

/** Merges the day map (work/free blocks) with tasks into one chronological, grouped list. */
export function DayTimeline({
  blocks,
  tasks,
  onComplete,
  onDefer,
  onAddToBlock,
}: {
  blocks: DayBlock[];
  tasks: RoutineTask[];
  onComplete: (task: RoutineTask) => void;
  onDefer: (task: RoutineTask) => void;
  onAddToBlock?: (block: DayBlock) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const entries = useMemo(() => buildTimeline(blocks, tasks), [blocks, tasks]);

  if (entries.length === 0) {
    return <ThemedText type="muted">No tasks scheduled yet.</ThemedText>;
  }

  return (
    <View style={{ gap: 18 }}>
      {entries.map((entry, entryIndex) => (
        <MotiView
          key={entry.kind === 'block' ? entry.block.id : 'unscheduled'}
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: entryIndex * 50 }}
          style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={
                  entry.kind === 'unscheduled'
                    ? 'time-outline'
                    : entry.block.block_type === 'work'
                      ? 'briefcase-outline'
                      : 'sparkles-outline'
                }
                size={15}
                color={colors.icon}
              />
              <ThemedText type="label">
                {entry.kind === 'unscheduled'
                  ? 'Unscheduled'
                  : `${formatTimeLabel(entry.block.start_time)} – ${formatTimeLabel(entry.block.end_time)} · ${
                      entry.block.block_type === 'work' ? 'Work' : 'Free time'
                    }`}
              </ThemedText>
            </View>
            {entry.kind === 'block' && entry.block.block_type === 'free' && onAddToBlock && (
              <Pressable
                onPress={() => onAddToBlock(entry.block)}
                hitSlop={8}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: withAlpha(colors.tint, 0.12),
                }}>
                <Ionicons name="add" size={15} color={colors.tint} />
              </Pressable>
            )}
          </View>

          {entry.tasks.length === 0 && (
            <ThemedText type="muted" style={{ paddingLeft: 22 }}>
              Open — nothing planned here yet.
            </ThemedText>
          )}

          {entry.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task)}
              onDefer={() => onDefer(task)}
            />
          ))}
        </MotiView>
      ))}
    </View>
  );
}
