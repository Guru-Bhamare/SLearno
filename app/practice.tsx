import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMatchPartner, usePracticeSessions } from '@/hooks/use-practice';
import { PARTNER_POOL } from '@/lib/practice-partners';
import { cardStyle } from '@/lib/theme-styles';

export default function PracticeScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const { data: sessions, isLoading } = usePracticeSessions(profile?.id);
  const { mutate: match, data: matched, isPending } = useMatchPartner(profile?.id);

  const [shuffleName, setShuffleName] = useState<string | null>(null);
  const shuffleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPending) {
      shuffleRef.current = setInterval(() => {
        setShuffleName(PARTNER_POOL[Math.floor(Math.random() * PARTNER_POOL.length)]);
      }, 90);
    } else if (shuffleRef.current) {
      clearInterval(shuffleRef.current);
      shuffleRef.current = null;
      setShuffleName(null);
    }
    return () => {
      if (shuffleRef.current) clearInterval(shuffleRef.current);
    };
  }, [isPending]);

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
        <ThemedText type="title">Find a practice partner</ThemedText>
        <ThemedText type="muted">Short, scheduled, low-stakes — 10 minutes of active practice.</ThemedText>
      </MotiView>

      <Pressable onPress={() => match()} disabled={isPending} style={[styles.matchButton, { backgroundColor: tint }]}>
        <ThemedText style={{ color: '#fff' }} type="subtitle">
          {isPending ? 'Matching…' : 'Find a partner'}
        </ThemedText>
      </Pressable>

      {isPending && shuffleName && (
        <MotiView style={styles.resultCard}>
          <ThemedText type="title" style={{ opacity: 0.4 }}>
            {shuffleName}
          </ThemedText>
        </MotiView>
      )}

      {!isPending && matched && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
          style={[styles.resultCard, { borderColor: tint }]}>
          <ThemedText type="title">{matched.partner_label}</ThemedText>
          <ThemedText type="muted">
            {matched.duration_min} min · starts in a few minutes
          </ThemedText>
          {matched.prompt && <ThemedText style={{ marginTop: 8 }}>{matched.prompt}</ThemedText>}
        </MotiView>
      )}

      <View style={{ gap: 10 }}>
        <ThemedText type="label">Past sessions</ThemedText>
        {isLoading && <ActivityIndicator />}
        {!isLoading && (!sessions || sessions.length === 0) && (
          <ThemedText type="muted">No sessions yet.</ThemedText>
        )}
        {sessions?.map((s) => (
          <View key={s.id} style={[styles.sessionRow, cardStyle(colorScheme)]}>
            <ThemedText type="subtitle">{s.partner_label}</ThemedText>
            <ThemedText type="muted">{new Date(s.scheduled_for).toLocaleString()}</ThemedText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  matchButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  resultCard: { borderWidth: 1.5, borderRadius: 16, padding: 20, alignItems: 'center', borderColor: 'transparent' },
  sessionRow: { padding: 12 },
});
