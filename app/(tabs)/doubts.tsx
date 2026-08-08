import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAskDoubt, useDoubts } from '@/hooks/use-doubts';
import { getRephraseSuggestion } from '@/lib/doubt-helper';

export default function DoubtsScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [question, setQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: doubts, isLoading } = useDoubts(profile?.id);
  const { mutate: ask, isPending } = useAskDoubt(profile?.id);

  const suggestion = useMemo(() => getRephraseSuggestion(question), [question]);

  const submit = () => {
    if (!question.trim()) return;
    ask(
      { question: question.trim(), isAnonymous },
      { onSuccess: () => setQuestion('') }
    );
  };

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
        <ThemedText type="title">Doubts</ThemedText>
        <ThemedText type="muted">Ask without a live, face-to-face moment.</ThemedText>
      </MotiView>

      <View style={{ gap: 10 }}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="What's tripping you up?"
          placeholderTextColor={Colors[colorScheme].icon}
          multiline
          style={[styles.input, { color: Colors[colorScheme].text }]}
        />

        {suggestion && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ThemedText type="muted">💡 {suggestion}</ThemedText>
          </MotiView>
        )}

        <View style={styles.row}>
          <ThemedText>Ask anonymously</ThemedText>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: tint }} />
        </View>

        <Pressable
          onPress={submit}
          disabled={isPending || !question.trim()}
          style={[styles.submitButton, { backgroundColor: tint, opacity: isPending || !question.trim() ? 0.5 : 1 }]}>
          <ThemedText style={{ color: '#fff' }} type="subtitle">
            {isPending ? 'Sending…' : 'Ask'}
          </ThemedText>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <ThemedText type="label">Common doubts</ThemedText>
        {isLoading && <ActivityIndicator />}
        {!isLoading && (!doubts || doubts.length === 0) && (
          <ThemedText type="muted">Nothing asked yet — yours could be the first.</ThemedText>
        )}
        {doubts?.map((d, i) => (
          <MotiView
            key={d.id}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 50 }}
            style={[styles.doubtCard, { backgroundColor: colorScheme === 'dark' ? '#1C1F21' : '#F5F7F8' }]}>
            <ThemedText type="subtitle">{d.is_anonymous ? 'Anonymous' : 'You'}</ThemedText>
            <ThemedText>{d.question}</ThemedText>
            {d.mock_answer && (
              <View style={[styles.answerBubble, { borderColor: tint }]}>
                <ThemedText type="muted">{d.mock_answer}</ThemedText>
              </View>
            )}
          </MotiView>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top', fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doubtCard: { borderRadius: 14, padding: 14, gap: 8 },
  answerBubble: { borderLeftWidth: 3, paddingLeft: 10 },
});
