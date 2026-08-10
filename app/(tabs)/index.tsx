import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/animated-counter';
import { IconBadge } from '@/components/icon-badge';
import { ProgressRing } from '@/components/progress-ring';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TodayChecklist } from '@/components/today-checklist';
import { TodayPlanForm } from '@/components/today-plan-form';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStreak } from '@/hooks/use-consistency';
import { todayISO, useSetTaskStatus, useTasksForDate } from '@/hooks/use-routine';
import { withAlpha } from '@/lib/color';
import { scheduleEveningNudge } from '@/lib/notifications';
import { cardStyle } from '@/lib/theme-styles';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const today = todayISO();

  const { data: tasks, isLoading } = useTasksForDate(profile?.id, today);
  const { mutate: setStatus } = useSetTaskStatus(profile?.id);
  const { data: streak } = useStreak(profile?.id);

  const [showPlanForm, setShowPlanForm] = useState(false);

  const pendingCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === 'done').length ?? 0;
  const progress = tasks?.length ? doneCount / tasks.length : 0;
  const hasTasks = (tasks?.length ?? 0) > 0;
  const allDone = hasTasks && pendingCount === 0;

  const displayName = profile?.name?.split(' ')[0];
  const greetingLine = displayName ? `${greeting()}, ${displayName}` : greeting();

  useEffect(() => {
    if (!tasks) return;
    scheduleEveningNudge(pendingCount);
  }, [tasks, pendingCount]);

  const nextTask = useMemo(() => {
    if (!tasks) return null;
    return tasks
      .filter((t) => t.status === 'pending')
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))[0];
  }, [tasks]);

  return (
    <Screen>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.header}>
        <View style={styles.headerLeft}>
          <IconBadge name="today" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={2} style={styles.greeting}>
              {greetingLine}
            </ThemedText>
            <ThemedText type="muted" numberOfLines={1}>
              Your daily checklist
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/streak-detail')}
          style={[styles.streakBtn, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
          <Ionicons name="flame" size={16} color={colors.warning} />
          <AnimatedCounter
            value={streak?.current_streak ?? 0}
            style={{ color: colors.warning, fontWeight: '700', fontSize: 15 }}
          />
        </Pressable>
      </MotiView>

      {/* Progress summary */}
      {hasTasks && (
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[styles.progressCard, cardStyle(colorScheme), { borderColor: colors.border }]}>
          <View style={styles.progressText}>
            <ThemedText type="label" style={{ color: colors.tint }}>
              {allDone ? 'All done' : 'Up next'}
            </ThemedText>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.nextTaskTitle}>
              {allDone ? 'You cleared your list for today.' : (nextTask?.title ?? 'Nothing pending')}
            </ThemedText>
            <ThemedText type="muted" style={styles.progressMeta}>
              {doneCount} of {tasks!.length} completed
            </ThemedText>
          </View>
          <View style={styles.ringWrap}>
            <ProgressRing
              progress={progress}
              label={`${Math.round(progress * 100)}%`}
              size={52}
              strokeWidth={5}
              trackColor={withAlpha(colors.tint, 0.12)}
              fillColor={colors.tint}
            />
          </View>
        </MotiView>
      )}

      {/* Quick actions */}
      <View style={styles.quickRow}>
      
        <Pressable
          onPress={() => router.push('/reflection')}
          style={[styles.quickBtn, cardStyle(colorScheme)]}>
          <Ionicons name="leaf-outline" size={16} color={colors.tint} />
          <ThemedText numberOfLines={1} style={[styles.quickLabel, { color: colors.text }]}>
            Time with yourself
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.tint} />
      ) : !hasTasks || showPlanForm ? (
        <TodayPlanForm
          profileId={profile?.id}
          date={today}
          onGenerated={() => setShowPlanForm(false)}
          onCancel={hasTasks ? () => setShowPlanForm(false) : undefined}
        />
      ) : (
        <View style={styles.planSection}>
          <View style={styles.planHeader}>
            <ThemedText type="subtitle" style={{ fontSize: 17 }}>
              Today&apos;s plan
            </ThemedText>
            <Pressable
              onPress={() => setShowPlanForm(true)}
              style={[styles.replanBtn, { backgroundColor: withAlpha(colors.tint, 0.08) }]}>
              <Ionicons name="refresh-outline" size={14} color={colors.tint} />
              <ThemedText numberOfLines={1} style={[styles.replanText, { color: colors.tint }]}>
                Replan
              </ThemedText>
            </Pressable>
          </View>

          <TodayChecklist
            tasks={tasks ?? []}
            onComplete={(task) =>
              setStatus({
                taskId: task.id,
                status: task.status === 'done' ? 'pending' : 'done',
                title: task.title,
                skillArea: task.skill_area,
              })
            }
            onDefer={(task) => setStatus({ taskId: task.id, status: 'deferred' })}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  greeting: { fontSize: 22, lineHeight: 28 },
  streakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressText: { flex: 1, minWidth: 0, gap: 4 },
  nextTaskTitle: { fontSize: 16, lineHeight: 22 },
  progressMeta: { fontSize: 13 },
  ringWrap: { flexShrink: 0 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  quickLabel: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  planSection: { gap: 12 },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  replanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  replanText: { fontWeight: '600', fontSize: 13 },
});
