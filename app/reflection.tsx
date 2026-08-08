import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLogReflection } from '@/hooks/use-reflection';
import { withAlpha } from '@/lib/color';

export default function ReflectionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
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
      {phase === 'ambient' ? (
        <>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[styles.circle, { backgroundColor: withAlpha(tint, 0.2) }, circleStyle]} />
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 600 }}
              style={{ position: 'absolute', alignItems: 'center', gap: 8 }}>
              <ThemedText type="title">Time with yourself</ThemedText>
              <ThemedText type="muted">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </ThemedText>
            </MotiView>
          </View>
          <Pressable onPress={finish} style={[styles.endButton, { borderColor: tint }]}>
            <ThemedText style={{ color: tint }}>I&apos;m done</ThemedText>
          </Pressable>
        </>
      ) : (
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 16, flex: 1, justifyContent: 'center' }}>
          <ThemedText type="subtitle">Anything you want to note? Totally optional.</ThemedText>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Skip if you'd rather not"
            placeholderTextColor={Colors[colorScheme].icon}
            style={[
              styles.input,
              { color: Colors[colorScheme].text, backgroundColor: colorScheme === 'dark' ? '#1C1F21' : '#F5F7F8' },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => submit(true)} style={[styles.secondaryButton, { borderColor: tint }]}>
              <ThemedText style={{ color: tint }}>Skip</ThemedText>
            </Pressable>
            <Pressable onPress={() => submit(false)} style={[styles.primaryButton, { backgroundColor: tint }]}>
              <ThemedText style={{ color: '#fff' }}>Save & close</ThemedText>
            </Pressable>
          </View>
        </MotiView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'stretch', paddingVertical: 24 },
  circle: { width: 160, height: 160, borderRadius: 80 },
  endButton: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  input: { borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: 'top' },
  secondaryButton: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
