import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGenerateFlashcardsFromNotes, useNotes, useUpsertTodayNote, type Note } from '@/hooks/use-notes';
import { cardStyle } from '@/lib/theme-styles';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function NotesScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const { data: notes, isLoading } = useNotes(profile?.id);
  const { mutate: saveToday, isPending: isSaving } = useUpsertTodayNote(profile?.id);
  const { mutate: generateFlashcards, isPending: isGenerating } = useGenerateFlashcardsFromNotes(profile?.id);

  const today = todayDate();
  const todayNote = useMemo(() => notes?.find((n) => n.date === today), [notes, today]);
  const pastNotes = useMemo(() => (notes ?? []).filter((n) => n.date !== today), [notes, today]);

  const [draft, setDraft] = useState<string | null>(null);
  const content = draft ?? todayNote?.content ?? '';

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const save = () => {
    if (draft === null) return;
    saveToday(draft.trim(), { onSuccess: () => setDraft(null) });
  };

  const generateFromDay = (note: Note) => {
    setGeneratedNoteId(note.id);
    generateFlashcards([note.id], { onSettled: () => setGeneratedNoteId(null) });
  };

  const generateFromSelection = () => {
    if (selectedIds.length === 0) return;
    generateFlashcards(selectedIds, {
      onSuccess: () => {
        setSelecting(false);
        setSelectedIds([]);
      },
    });
  };

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
        <ThemedText type="title">Notes</ThemedText>
        <ThemedText type="muted">Write whatever you want to remember. Turn any day into flashcards.</ThemedText>
      </MotiView>

      <View style={{ gap: 10 }}>
        <ThemedText type="label">Today</ThemedText>
        <TextInput
          value={content}
          onChangeText={setDraft}
          multiline
          placeholder="What happened today? What do you want to remember?"
          placeholderTextColor={Colors[colorScheme].icon}
          style={[
            styles.input,
            { minHeight: 120, textAlignVertical: 'top', color: Colors[colorScheme].text, backgroundColor: Colors[colorScheme].card },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={save}
            disabled={draft === null || isSaving}
            style={[styles.submitButton, { flex: 1, backgroundColor: tint, opacity: draft === null || isSaving ? 0.5 : 1 }]}>
            <ThemedText style={{ color: '#fff' }}>{isSaving ? 'Saving…' : 'Save'}</ThemedText>
          </Pressable>
          {!!todayNote?.content && (
            <Pressable
              onPress={() => generateFromDay(todayNote)}
              disabled={isGenerating}
              style={[styles.toggleButton, { flex: 1, borderColor: tint, opacity: isGenerating ? 0.5 : 1 }]}>
              <ThemedText style={{ color: tint }}>
                {isGenerating && generatedNoteId === todayNote.id ? 'Generating…' : 'Create flashcards'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText type="label">Past days</ThemedText>
          <Pressable
            onPress={() => {
              setSelecting((s) => !s);
              setSelectedIds([]);
            }}>
            <ThemedText style={{ color: tint }}>{selecting ? 'Cancel' : 'Combine days'}</ThemedText>
          </Pressable>
        </View>

        {isLoading && <ActivityIndicator />}
        {!isLoading && pastNotes.length === 0 && <ThemedText type="muted">No past notes yet.</ThemedText>}

        {pastNotes.map((note, i) => {
          const isSelected = selectedIds.includes(note.id);
          return (
            <MotiView
              key={note.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: i * 40 }}>
              <Pressable
                onPress={() => (selecting ? toggleSelected(note.id) : undefined)}
                style={[
                  styles.noteCard,
                  cardStyle(colorScheme),
                  isSelected && { borderWidth: 1.5, borderColor: tint },
                ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="label" style={{ color: tint }}>
                    {formatDate(note.date)}
                  </ThemedText>
                  {!selecting && (
                    <Pressable onPress={() => generateFromDay(note)} disabled={isGenerating}>
                      <ThemedText style={{ color: tint, opacity: isGenerating ? 0.5 : 1 }}>
                        {isGenerating && generatedNoteId === note.id ? 'Generating…' : 'Create flashcards'}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                <ThemedText>{note.content}</ThemedText>
              </Pressable>
            </MotiView>
          );
        })}
      </View>

      {selecting && selectedIds.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
          <Pressable
            onPress={generateFromSelection}
            disabled={isGenerating}
            style={[styles.submitButton, { backgroundColor: tint, opacity: isGenerating ? 0.6 : 1 }]}>
            <ThemedText style={{ color: '#fff' }}>
              {isGenerating ? 'Generating…' : `Create flashcards from ${selectedIds.length} day${selectedIds.length > 1 ? 's' : ''}`}
            </ThemedText>
          </Pressable>
        </MotiView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 14, padding: 12, fontSize: 15 },
  toggleButton: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  submitButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  noteCard: { padding: 14, gap: 6 },
});
