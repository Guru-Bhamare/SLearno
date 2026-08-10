import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLogReflection } from '@/hooks/use-reflection';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

export default function ReflectionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tint = colors.tint;
  const { profile } = useSession();
  const { mutate: logReflection } = useLogReflection(profile?.id);

  const [phase, setPhase] = useState<'ambient' | 'wrap'>('ambient');
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.25, { duration: 4000 }), -1, true);
  }, [scale]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const finish = () => setPhase('wrap');

  const submit = (skipped: boolean) => {
    logReflection({ skipped, note: skipped ? undefined : note.trim() || undefined });
    router.back();
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Screen scroll={false} style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.header}>
        <IconBadge name="leaf" color={colors.tint} size={44} iconSize={20} />
        <View style={styles.headerText}>
          <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
            Reflection
          </ThemedText>
          <ThemedText type="muted" numberOfLines={1}>
            {phase === 'ambient' ? 'A distraction-free moment' : 'Wrap up your thoughts'}
          </ThemedText>
        </View>
      </MotiView>

      {phase === 'ambient' ? (
        <>
          <View style={styles.ambientBody}>
            <Animated.View style={[styles.circle, { backgroundColor: withAlpha(tint, 0.2) }, circleStyle]} />
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 600 }}
              style={styles.ambientLabel}>
              <ThemedText type="title">Time with yourself</ThemedText>
              <ThemedText type="muted" style={{ fontVariant: ['tabular-nums'] }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </ThemedText>
            </MotiView>
          </View>
          <Pressable onPress={finish} style={[styles.endButton, { borderColor: tint }]}>
            <ThemedText style={{ color: tint }} type="subtitle">
              I&apos;m done
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.wrapBody}>
          <View style={[styles.inputCard, cardStyle(colorScheme), { borderColor: colors.border }]}>
            <ThemedText type="subtitle" style={{ fontSize: 16 }}>
              Anything you want to note?
            </ThemedText>
            <ThemedText type="muted">Totally optional.</ThemedText>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Skip if you'd rather not"
              placeholderTextColor={colors.icon}
              style={[styles.input, { color: colors.text }]}
            />
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => submit(true)} style={[styles.secondaryButton, { borderColor: tint }]}>
              <ThemedText style={{ color: tint }}>Skip</ThemedText>
            </Pressable>
            <Pressable onPress={() => submit(false)} style={[styles.primaryButton, { backgroundColor: tint }]}>
              <ThemedText style={{ color: '#fff' }}>Save &amp; close</ThemedText>
            </Pressable>
          </View>
        </MotiView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'stretch', paddingVertical: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 22, lineHeight: 28 },
  ambientBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 160, height: 160, borderRadius: 80 },
  ambientLabel: { position: 'absolute', alignItems: 'center', gap: 8 },
  endButton: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  wrapBody: { flex: 1, justifyContent: 'center', gap: 16 },
  inputCard: { padding: 16, gap: 8, borderWidth: 1 },
  input: { borderRadius: 12, minHeight: 100, textAlignVertical: 'top', paddingTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  secondaryButton: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
