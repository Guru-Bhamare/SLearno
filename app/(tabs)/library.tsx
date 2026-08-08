import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResources, useSuggestResources, type Resource } from '@/hooks/use-resources';
import { cardStyle } from '@/lib/theme-styles';

const SOURCE_LABELS: Record<string, string> = {
  mentor: 'Mentor-suggested',
  senior: 'Senior-shared',
  official: 'Official',
  ai: 'AI-suggested',
};

export default function LibraryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const { profile } = useSession();
  const { data: resources, isLoading } = useResources();
  const { mutate: suggestResources, isPending: isSuggesting, data: suggested } = useSuggestResources();

  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  const skillAreas = useMemo(
    () => Array.from(new Set((resources ?? []).map((r) => r.skill_area))),
    [resources]
  );

  const filtered = useMemo(
    () =>
      (resources ?? []).filter(
        (r) => (!skillFilter || r.skill_area === skillFilter) && (!sourceFilter || r.source_tag === sourceFilter)
      ),
    [resources, skillFilter, sourceFilter]
  );

  const runSearch = () => {
    if (!searchText.trim() || !profile?.id) return;
    setSearchedFor(searchText.trim());
    suggestResources({ profileId: profile.id, query: searchText.trim() });
  };

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}>
        <ThemedText type="title">Library</ThemedText>
        <ThemedText type="muted">Curated resources, tagged by source.</ThemedText>
      </MotiView>

      <View style={[styles.searchRow, { borderColor: tint }]}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={runSearch}
          placeholder="Search a skill or hobby to learn…"
          placeholderTextColor={Colors[colorScheme].icon}
          style={[styles.searchInput, { color: Colors[colorScheme].text }]}
          returnKeyType="search"
        />
        <Pressable onPress={runSearch} style={[styles.searchButton, { backgroundColor: tint }]}>
          {isSuggesting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={{ color: '#fff' }}>Search</ThemedText>
          )}
        </Pressable>
      </View>

      {searchedFor && (
        <View style={{ gap: 8 }}>
          <ThemedText type="label" style={{ color: tint }}>
            AI suggestions for "{searchedFor}"
          </ThemedText>
          {!isSuggesting && suggested?.length === 0 && (
            <ThemedText type="muted">No suggestions came back — try a different phrasing.</ThemedText>
          )}
          {(suggested ?? []).map((resource) => (
            <ResourceCard key={resource.id} resource={resource} tint={tint} colorScheme={colorScheme} />
          ))}
          {(suggested ?? []).some((r) => r.source_tag === 'ai') && (
            <ThemedText type="muted">AI-suggested — verify before relying on it.</ThemedText>
          )}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {Object.entries(SOURCE_LABELS).map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={sourceFilter === value}
            onPress={() => setSourceFilter((s) => (s === value ? null : value))}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {skillAreas.map((area) => (
          <Chip
            key={area}
            label={area}
            active={skillFilter === area}
            onPress={() => setSkillFilter((s) => (s === area ? null : area))}
          />
        ))}
      </ScrollView>

      {isLoading && <ActivityIndicator />}
      {!isLoading && filtered.length === 0 && <ThemedText type="muted">No resources match those filters.</ThemedText>}

      <View style={{ gap: 10 }}>
        {filtered.map((resource, i) => (
          <MotiView
            key={resource.id}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 40 }}>
            <ResourceCard resource={resource} tint={tint} colorScheme={colorScheme} />
          </MotiView>
        ))}
      </View>
    </Screen>
  );
}

function ResourceCard({
  resource,
  tint,
  colorScheme,
}: {
  resource: Resource;
  tint: string;
  colorScheme: 'light' | 'dark';
}) {
  return (
    <Pressable
      onPress={() => router.push(`/resource/${resource.id}`)}
      style={[styles.card, cardStyle(colorScheme)]}>
      <ThemedText type="subtitle">{resource.title}</ThemedText>
      <ThemedText type="label" style={{ color: tint }}>
        {resource.skill_area} · {SOURCE_LABELS[resource.source_tag] ?? resource.source_tag}
      </ThemedText>
      <ThemedText type="muted">{resource.usage_count} interns used this</ThemedText>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: tint, backgroundColor: active ? tint : 'transparent' },
      ]}>
      <ThemedText style={{ color: active ? '#fff' : tint }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1.5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  card: { padding: 14, gap: 4 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 4 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  searchButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
});
