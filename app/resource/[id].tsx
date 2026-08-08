import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUploadHomework } from '@/hooks/use-flashcards';
import { useIncrementResourceUsage, useResource, useSetFocusSkill } from '@/hooks/use-resources';
import { cardStyle } from '@/lib/theme-styles';

const SOURCE_LABELS: Record<string, string> = {
  mentor: 'Mentor-suggested',
  senior: 'Senior-shared',
  official: 'Official',
  ai: 'AI-suggested',
};

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const { profile } = useSession();

  const { data: resource, isLoading } = useResource(id);
  const { mutate: incrementUsage } = useIncrementResourceUsage();
  const hasCountedOpen = useRef(false);

  const { mutate: setFocusSkill, isPending: isSettingFocus } = useSetFocusSkill(profile?.id);
  const { mutate: uploadHomework, isPending: isUploadingHomework, data: homeworkResult } = useUploadHomework(
    profile?.id
  );

  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (resource && !hasCountedOpen.current) {
      hasCountedOpen.current = true;
      incrementUsage({ id: resource.id, currentUsage: resource.usage_count });
    }
  }, [resource, incrementUsage]);

  if (isLoading || !resource) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const isFocusResource = profile?.focus_resource_id === resource.id;

  const pickHomeworkImage = async () => {
    setPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError('Photo library permission is needed to add a homework screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadHomework({
      resourceId: resource.id,
      fileUri: asset.uri,
      contentType: asset.mimeType ?? 'image/jpeg',
    });
  };

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 12 }}>
        <ThemedText type="title">{resource.title}</ThemedText>
        <ThemedText type="label" style={{ color: tint }}>
          {resource.skill_area} · {SOURCE_LABELS[resource.source_tag] ?? resource.source_tag}
        </ThemedText>
        <ThemedText type="muted">{resource.usage_count} interns used this</ThemedText>

        {resource.url ? (
          <Pressable
            onPress={() => Linking.openURL(resource.url!)}
            style={[styles.openButton, { backgroundColor: tint }]}>
            <ThemedText style={{ color: '#fff' }}>Open resource</ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="muted">Shared as guidance, not a link — ask about it in Doubts if unclear.</ThemedText>
        )}

        {isFocusResource ? (
          <ThemedText type="label" style={{ color: tint }}>
            This is your current focus skill
          </ThemedText>
        ) : (
          <Pressable
            onPress={() => setFocusSkill({ resourceId: resource.id })}
            disabled={isSettingFocus}
            style={[styles.openButton, { borderWidth: 1.5, borderColor: tint }]}>
            {isSettingFocus ? (
              <ActivityIndicator color={tint} size="small" />
            ) : (
              <ThemedText style={{ color: tint }}>Make this your focus skill</ThemedText>
            )}
          </Pressable>
        )}

        {isFocusResource && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={[styles.homeworkCard, cardStyle(colorScheme)]}>
            <ThemedText type="subtitle">Add homework screenshot</ThemedText>
            <ThemedText type="muted">
              Upload a photo of your homework and we'll turn it — together with this resource — into flashcards.
            </ThemedText>
            <Pressable
              onPress={pickHomeworkImage}
              disabled={isUploadingHomework}
              style={[styles.openButton, { backgroundColor: tint, marginTop: 8 }]}>
              {isUploadingHomework ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={{ color: '#fff' }}>Choose photo</ThemedText>
              )}
            </Pressable>
            {pickerError && <ThemedText type="muted">{pickerError}</ThemedText>}
            {homeworkResult && (
              <ThemedText type="muted">Added {homeworkResult.added} flashcards from your homework.</ThemedText>
            )}
          </MotiView>
        )}
      </MotiView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  openButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  homeworkCard: { padding: 14, gap: 6, marginTop: 8 },
});
