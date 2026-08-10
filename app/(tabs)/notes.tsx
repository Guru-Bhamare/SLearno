import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AnimatedCounter } from '@/components/animated-counter';
import { IconBadge } from '@/components/icon-badge';
import { NoteFlashcardsDeck } from '@/components/note-flashcards-deck';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Flashcard } from '@/hooks/use-flashcards';
import { useAddNote, useGenerateFlashcardsFromNotes, useNotes, type Note } from '@/hooks/use-notes';
import { withAlpha } from '@/lib/color';
import { cardStyle, shadow } from '@/lib/theme-styles';

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatEntryLabel(note: Note, today: string) {
  if (note.date === today) {
    const time = new Date(note.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Today · ${time}`;
  }
  return formatDate(note.date);
}

function DateChip({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(accent, 0.1), borderColor: withAlpha(accent, 0.18) }]}>
      <Ionicons name="calendar-outline" size={11} color={accent} />
      <ThemedText numberOfLines={1} style={[styles.chipText, { color: accent }]}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function NotesScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tint = colors.tint;

  const { data: notes, isLoading } = useNotes(profile?.id);
  const { mutate: addNote, isPending: isSaving } = useAddNote(profile?.id);
  const { mutate: generateFlashcards, isPending: isGenerating } = useGenerateFlashcardsFromNotes(profile?.id);

  const today = todayDate();
  const entries = notes ?? [];

  const [draft, setDraft] = useState('');

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);
  const [reviewDeck, setReviewDeck] = useState<{ label: string; cards: Flashcard[] } | null>(null);
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addNote(trimmed, { onSuccess: () => setDraft('') });
  };

  const generateFromEntry = (note: Note) => {
    setGeneratedNoteId(note.id);
    setEmptyNotice(null);
    generateFlashcards([note.id], {
      onSuccess: (result) => {
        if (result.cards.length > 0) {
          setReviewDeck({ label: formatEntryLabel(note, today), cards: result.cards });
        } else {
          setEmptyNotice("That note didn't have enough to build flashcards from.");
        }
      },
      onSettled: () => setGeneratedNoteId(null),
    });
  };

  const generateFromSelection = () => {
    if (selectedIds.length === 0) return;
    const entryCount = selectedIds.length;
    setEmptyNotice(null);
    generateFlashcards(selectedIds, {
      onSuccess: (result) => {
        setSelecting(false);
        setSelectedIds([]);
        if (result.cards.length > 0) {
          setReviewDeck({ label: `${entryCount} ${entryCount > 1 ? 'entries' : 'entry'} combined`, cards: result.cards });
        } else {
          setEmptyNotice("Those notes didn't have enough to build flashcards from.");
        }
      },
    });
  };

  if (reviewDeck) {
    return (
      <Screen>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.header}>
          <View style={styles.headerLeft}>
            <IconBadge name="sparkles" color={tint} size={44} iconSize={20} />
            <View style={styles.headerText}>
              <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
                New flashcards
              </ThemedText>
              <ThemedText type="muted" numberOfLines={1}>
                {reviewDeck.label}
              </ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => setReviewDeck(null)}
            style={[styles.combineBtn, { backgroundColor: withAlpha(colors.icon, 0.1) }]}>
            <Ionicons name="close" size={14} color={colors.icon} />
            <ThemedText numberOfLines={1} style={[styles.combineBtnText, { color: colors.icon }]}>
              Close
            </ThemedText>
          </Pressable>
        </MotiView>

        <View style={[styles.contentCard, cardStyle(colorScheme), shadow]}>
          <NoteFlashcardsDeck label={reviewDeck.label} cards={reviewDeck.cards} onDone={() => setReviewDeck(null)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.header}>
        <View style={styles.headerLeft}>
          <IconBadge name="create-outline" color={tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              Notes
            </ThemedText>
            <ThemedText type="muted" numberOfLines={2}>
              Write it down. Turn any entry into flashcards.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.countBadge, { backgroundColor: withAlpha(tint, 0.12) }]}>
          <Ionicons name="documents-outline" size={16} color={tint} />
          <AnimatedCounter value={entries.length} style={{ color: tint, fontWeight: '700', fontSize: 15 }} />
        </View>
      </MotiView>

      {emptyNotice && (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.noticeBanner, { backgroundColor: withAlpha(colors.icon, 0.08) }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.icon} />
          <ThemedText type="muted" style={styles.noticeText}>
            {emptyNotice}
          </ThemedText>
          <Pressable onPress={() => setEmptyNotice(null)} hitSlop={8}>
            <Ionicons name="close" size={14} color={colors.icon} />
          </Pressable>
        </MotiView>
      )}

      {/* Compose */}
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={[styles.todayCard, cardStyle(colorScheme), { borderColor: colors.border }]}>
        <View style={styles.todayHeader}>
          <ThemedText type="label" style={{ color: tint }}>
            New entry
          </ThemedText>
          <ThemedText type="muted" style={styles.todayDate}>
            {formatDate(today)}
          </ThemedText>
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="What happened today? What do you want to remember?"
          placeholderTextColor={colors.icon}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
        />

        <View style={styles.actionRow}>
          <Pressable
            onPress={save}
            disabled={!draft.trim() || isSaving}
            style={[styles.primaryBtn, { backgroundColor: tint, opacity: !draft.trim() || isSaving ? 0.5 : 1 }]}>
            <Ionicons name="add" size={16} color="#fff" />
            <ThemedText numberOfLines={1} style={styles.primaryBtnText}>
              {isSaving ? 'Saving…' : 'Add entry'}
            </ThemedText>
          </Pressable>
        </View>
      </MotiView>

      {/* Entries */}
      <View style={[styles.sectionCard, cardStyle(colorScheme)]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(tint, 0.1) }]}>
              <Ionicons name="time-outline" size={16} color={tint} />
            </View>
            <View style={styles.sectionTitleText}>
              <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 17 }}>
                Entries
              </ThemedText>
              <ThemedText type="muted" style={styles.sectionCount}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </ThemedText>
            </View>
          </View>

          {entries.length > 0 && (
            <Pressable
              onPress={() => {
                setSelecting((s) => !s);
                setSelectedIds([]);
              }}
              style={[styles.combineBtn, { backgroundColor: withAlpha(tint, 0.08) }]}>
              <Ionicons name={selecting ? 'close' : 'git-merge-outline'} size={14} color={tint} />
              <ThemedText numberOfLines={1} style={[styles.combineBtnText, { color: tint }]}>
                {selecting ? 'Cancel' : 'Combine'}
              </ThemedText>
            </Pressable>
          )}
        </View>

        {isLoading && <ActivityIndicator color={tint} style={{ marginVertical: 8 }} />}

        {!isLoading && entries.length === 0 && (
          <View style={styles.emptyState}>
            <IconBadge name="sparkles-outline" color={tint} size={36} iconSize={16} />
            <View style={styles.emptyText}>
              <ThemedText type="label">Nothing yet</ThemedText>
              <ThemedText type="muted" style={styles.emptyDesc}>
                Add your first entry above — it&apos;ll show up here right away.
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.itemList}>
          {entries.map((note, i) => {
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
                    styles.itemWrap,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    isSelected && { borderWidth: 1.5, borderColor: tint },
                  ]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemHeaderLeft}>
                      {selecting && (
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: isSelected ? tint : withAlpha(tint, 0.45),
                              backgroundColor: isSelected ? tint : 'transparent',
                            },
                          ]}>
                          {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                      )}
                      <DateChip label={formatEntryLabel(note, today)} accent={tint} />
                    </View>

                    {!selecting && (
                      <Pressable
                        onPress={() => generateFromEntry(note)}
                        disabled={isGenerating}
                        style={[styles.cardActionBtn, { backgroundColor: withAlpha(tint, 0.08) }]}>
                        <Ionicons name="sparkles-outline" size={13} color={tint} />
                        <ThemedText
                          numberOfLines={1}
                          style={[styles.cardActionText, { color: tint, opacity: isGenerating ? 0.5 : 1 }]}>
                          {isGenerating && generatedNoteId === note.id ? 'Generating…' : 'Flashcards'}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                  <ThemedText numberOfLines={4} style={styles.itemContent}>
                    {note.content}
                  </ThemedText>
                </Pressable>
              </MotiView>
            );
          })}
        </View>
      </View>

      {selecting && selectedIds.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
          <Pressable
            onPress={generateFromSelection}
            disabled={isGenerating}
            style={[styles.primaryBtn, { backgroundColor: tint, opacity: isGenerating ? 0.6 : 1 }]}>
            <Ionicons name="sparkles-outline" size={16} color="#fff" />
            <ThemedText numberOfLines={1} style={styles.primaryBtnText}>
              {isGenerating
                ? 'Generating…'
                : `Create flashcards from ${selectedIds.length} ${selectedIds.length > 1 ? 'entries' : 'entry'}`}
            </ThemedText>
          </Pressable>
        </MotiView>
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
  headerTitle: { fontSize: 22, lineHeight: 28 },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  contentCard: { padding: 18, gap: 14 },
  todayCard: { padding: 16, gap: 12, borderWidth: 1, overflow: 'hidden' },
  todayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayDate: { fontSize: 13 },
  input: { borderRadius: 14, padding: 12, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  outlineBtnText: { fontWeight: '600', fontSize: 15 },
  sectionCard: { padding: 16, gap: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitleText: { flex: 1, minWidth: 0, gap: 2 },
  sectionCount: { fontSize: 13 },
  combineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  combineBtnText: { fontWeight: '600', fontSize: 13 },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  emptyText: { flex: 1, minWidth: 0, gap: 2 },
  emptyDesc: { fontSize: 13, lineHeight: 18 },
  itemList: { gap: 8 },
  itemWrap: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexShrink: 0,
  },
  cardActionText: { fontSize: 11, fontWeight: '600' },
  itemContent: { fontSize: 15, lineHeight: 21 },
});
