import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/animated-counter';
import { Heatmap } from '@/components/heatmap';
import { IconBadge } from '@/components/icon-badge';
import { ProgressRing } from '@/components/progress-ring';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConsistencyLog, useJourneyStats, useStreak } from '@/hooks/use-consistency';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

export default function JourneyScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { data: streak, isLoading: isStreakLoading } = useStreak(profile?.id);
  const { data: journey, isLoading: isJourneyLoading } = useJourneyStats(profile?.id);
  const { data: days } = useConsistencyLog(profile?.id);

  const isLoading = isStreakLoading || isJourneyLoading;

  const windowSize = journey?.windowSize ?? 10;
  const recent = journey?.recentActiveDays ?? 0;
  const prior = journey?.priorActiveDays ?? 0;
  const delta = recent - prior;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.warning : colors.icon;

  return (
    <Screen>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.header}>
        <View style={styles.headerLeft}>
          <IconBadge name="trending-up" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.title}>
              Your journey
            </ThemedText>
            <ThemedText type="muted" numberOfLines={1}>
              What you've done
            </ThemedText>
          </View>
        </View>

        <View style={[styles.streakBtn, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
          <Ionicons name="flame" size={16} color={colors.warning} />
          <AnimatedCounter
            value={streak?.current_streak ?? 0}
            style={{ color: colors.warning, fontWeight: '700', fontSize: 15 }}
          />
        </View>
      </MotiView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.tint} />
      ) : (
        <>
          {/* So far */}
          <MotiView
            from={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[styles.progressCard, cardStyle(colorScheme), { borderColor: colors.border }]}>
            <View style={styles.progressText}>
              <ThemedText type="label" style={{ color: colors.tint }}>
                So far
              </ThemedText>
              <ThemedText type="subtitle" numberOfLines={2} style={styles.soFarTitle}>
                {journey?.allTimeActiveDays ?? 0} active {journey?.allTimeActiveDays === 1 ? 'day' : 'days'}
              </ThemedText>
              <ThemedText type="muted" style={styles.progressMeta}>
                Longest streak: {streak?.longest_streak ?? 0} days
              </ThemedText>
            </View>
            <View style={styles.ringWrap}>
              <ProgressRing
                progress={recent / windowSize}
                label={`${recent}/${windowSize}`}
                size={52}
                strokeWidth={5}
                trackColor={withAlpha(colors.tint, 0.12)}
                fillColor={colors.tint}
              />
            </View>
          </MotiView>

          {/* Then vs now */}
          <View style={styles.thenNowRow}>
            <View style={[styles.thenNowCard, cardStyle(colorScheme)]}>
              <ThemedText type="label" style={{ color: colors.icon }}>
                {windowSize} days ago
              </ThemedText>
              <AnimatedCounter value={prior} type="title" style={styles.thenNowValue} />
              <ThemedText type="muted" numberOfLines={1}>
                active days that week
              </ThemedText>
            </View>
            <View style={[styles.thenNowCard, cardStyle(colorScheme)]}>
              <ThemedText type="label" style={{ color: colors.tint }}>
                Last {windowSize} days
              </ThemedText>
              <AnimatedCounter value={recent} type="title" style={[styles.thenNowValue, { color: colors.tint }]} />
              <View style={styles.trendRow}>
                <Ionicons name={trendIcon} size={14} color={trendColor} />
                <ThemedText numberOfLines={1} style={[styles.trendText, { color: trendColor }]}>
                  {delta === 0 ? 'same pace' : `${delta > 0 ? '+' : ''}${delta} vs then`}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Pattern */}
          <View style={styles.patternSection}>
            <ThemedText type="subtitle" style={{ fontSize: 17 }}>
              Your pattern
            </ThemedText>
            <ThemedText type="muted">
              No leaderboard, no comparison to anyone else — just your own record. A break resets the
              streak, not the history below.
            </ThemedText>
            <Heatmap days={days ?? []} />
          </View>
        </>
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
  title: { fontSize: 22, lineHeight: 28 },
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
  soFarTitle: { fontSize: 16, lineHeight: 22 },
  progressMeta: { fontSize: 13 },
  ringWrap: { flexShrink: 0 },
  thenNowRow: { flexDirection: 'row', gap: 10 },
  thenNowCard: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    gap: 4,
  },
  thenNowValue: { fontSize: 26, lineHeight: 32 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  patternSection: { gap: 10 },
});
