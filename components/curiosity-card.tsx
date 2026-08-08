import { MotiView } from 'moti';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubmitCuriosityResponse, useTodayCuriosityLog } from '@/hooks/use-curiosity';
import { todaysPrompt } from '@/lib/curiosity-prompts';
import { cardStyle } from '@/lib/theme-styles';

export function CuriosityCard({ profileId }: { profileId: string | undefined }) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const { data: todayLog, isLoading } = useTodayCuriosityLog(profileId);
  const { mutate: submit, isPending } = useSubmitCuriosityResponse(profileId);
  const [response, setResponse] = useState('');

  if (isLoading) return null;

  return (
    <View style={[styles.card, cardStyle(colorScheme)]}>
      <ThemedText type="label" style={{ color: tint }}>
        Curiosity prompt
      </ThemedText>
      <ThemedText type="subtitle">{todayLog?.prompt_text ?? todaysPrompt()}</ThemedText>

      {todayLog ? (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ThemedText type="muted">{todayLog.response_text}</ThemedText>
        </MotiView>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            value={response}
            onChangeText={setResponse}
            placeholder="Quick thought…"
            placeholderTextColor={Colors[colorScheme].icon}
            style={[styles.input, { color: Colors[colorScheme].text }]}
          />
          <Pressable
            disabled={!response.trim() || isPending}
            onPress={() => submit({ prompt: todaysPrompt(), response: response.trim() }, { onSuccess: () => setResponse('') })}
            style={[styles.submitButton, { backgroundColor: tint, opacity: !response.trim() || isPending ? 0.5 : 1 }]}>
            <ThemedText style={{ color: '#fff' }}>Log it</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  input: { borderRadius: 12, padding: 10, backgroundColor: 'rgba(128,128,128,0.12)' },
  submitButton: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
});
