import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type ChatMessage, type OnboardingComplete, useOnboardingChat } from '@/hooks/use-onboarding-chat';
import { withAlpha } from '@/lib/color';

export default function OnboardingScreen() {
  const { userId, refetchProfile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [summary, setSummary] = useState<OnboardingComplete | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const startedRef = useRef(false);

  const { mutate: sendTurn, isPending } = useOnboardingChat();

  const askNext = (nextHistory: ChatMessage[]) => {
    if (!userId) return;
    sendTurn(
      { profileId: userId, history: nextHistory },
      {
        onSuccess: (result) => {
          if (result.type === 'question') {
            setHistory([...nextHistory, { role: 'assistant', content: result.message }]);
            setQuickReplies(result.quick_replies ?? []);
          } else {
            setHistory(nextHistory);
            setQuickReplies([]);
            setSummary(result);
          }
        },
      }
    );
  };

  useEffect(() => {
    if (startedRef.current || !userId) return;
    startedRef.current = true;
    askNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const submitAnswer = (answer: string) => {
    if (!answer.trim() || isPending) return;
    const nextHistory: ChatMessage[] = [...history, { role: 'user', content: answer.trim() }];
    setHistory(nextHistory);
    setQuickReplies([]);
    setInputValue('');
    askNext(nextHistory);
  };

  const finish = async () => {
    await refetchProfile();
    router.replace('/(tabs)');
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [history, isPending]);

  if (summary) {
    return (
      <Screen style={styles.container}>
        <View style={{ gap: 12 }}>
          <ThemedText type="title">Here&apos;s your starting point</ThemedText>
          <ThemedText type="muted">
            Built from what you told us — we&apos;ll keep adjusting this as you work through your routine.
          </ThemedText>
        </View>

        <SummarySection label="Priorities" items={summary.priorities} tint={tint} />
        <SummarySection label="Recommendations" items={summary.recommendations} tint={tint} />
        <SummarySection label="Next steps" items={summary.next_steps} tint={tint} />

        <Pressable onPress={finish} style={[styles.primaryButton, { backgroundColor: tint }]}>
          <ThemedText style={{ color: '#fff' }} type="subtitle">
            Start my routine
          </ThemedText>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.container}>
      <ThemedText type="title">Let&apos;s build your routine</ThemedText>
      <ThemedText type="muted">A few quick questions — no wrong answers.</ThemedText>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
        {history.map((m, i) => (
          <MotiView
            key={i}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[
              styles.bubble,
              m.role === 'assistant'
                ? { alignSelf: 'flex-start', backgroundColor: 'rgba(128,128,128,0.12)' }
                : { alignSelf: 'flex-end', backgroundColor: withAlpha(tint, 0.13) },
            ]}>
            <ThemedText>{m.content}</ThemedText>
          </MotiView>
        ))}
        {isPending && <ActivityIndicator style={{ alignSelf: 'flex-start' }} />}
      </ScrollView>

      {quickReplies.length > 0 && !isPending && (
        <View style={styles.chipRow}>
          {quickReplies.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => submitAnswer(opt)}
              style={[styles.chip, { borderColor: tint }]}>
              <ThemedText style={{ color: tint }}>{opt}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type your answer…"
            placeholderTextColor="rgba(128,128,128,0.7)"
            editable={!isPending}
            onSubmitEditing={() => submitAnswer(inputValue)}
            style={[styles.input, { color: Colors[colorScheme].text, borderColor: tint }]}
          />
          <Pressable
            onPress={() => submitAnswer(inputValue)}
            disabled={isPending || !inputValue.trim()}
            style={[styles.sendButton, { backgroundColor: tint, opacity: isPending || !inputValue.trim() ? 0.5 : 1 }]}>
            <ThemedText style={{ color: '#fff' }}>Send</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummarySection({ label, items, tint }: { label: string; items: string[]; tint: string }) {
  if (!items?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="label" style={{ color: tint }}>
        {label}
      </ThemedText>
      {items.map((item, i) => (
        <ThemedText key={i}>• {item}</ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24, gap: 16 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: '85%' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  inputRow: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  input: { flex: 1, borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sendButton: { borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  primaryButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
});
