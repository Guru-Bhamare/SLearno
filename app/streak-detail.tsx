import { MotiView } from 'moti';
import { ActivityIndicator, View } from 'react-native';

import { AnimatedCounter } from '@/components/animated-counter';
import { Heatmap } from '@/components/heatmap';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/context/session';
import { useConsistencyLog, useStreak } from '@/hooks/use-consistency';

export default function StreakDetailScreen() {
  const { profile } = useSession();
  const { data: streak, isLoading } = useStreak(profile?.id);
  const { data: days } = useConsistencyLog(profile?.id);

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 24 }}>
        <ThemedText type="title">Streak</ThemedText>

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <View style={{ flexDirection: 'row', gap: 32 }} data-note="counters">

            <View>
              <AnimatedCounter value={streak?.current_streak ?? 0} type="title" />
              <ThemedText type="muted">current</ThemedText>
            </View>
            <View>
              <AnimatedCounter value={streak?.longest_streak ?? 0} type="title" />
              <ThemedText type="muted">longest</ThemedText>
            </View>
          </View>
        )}

        <ThemedText type="muted">
          No leaderboard, no comparison — just your own pattern. A break resets the count, not the
          history below, and compressed days still count.
        </ThemedText>

        <Heatmap days={days ?? []} />
      </MotiView>
    </Screen>
  );
}
