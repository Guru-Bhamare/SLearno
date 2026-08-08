import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DurationStepper, TimeStepper } from '@/components/time-stepper';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAddTask } from '@/hooks/use-routine';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

const TYPE_LABEL = { daily: 'To-do', skill: 'Skill / learning' } as const;

/** Add a daily to-do or skill task for a given date — no ranking, just add and it's in the routine. */
export function AddTaskSheet({
  profileId,
  date,
  defaultStartTime = '09:00',
  onAdded,
}: {
  profileId: string | undefined;
  date: string;
  defaultStartTime?: string;
  onAdded?: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { mutate: addTask, isPending } = useAddTask(profileId);

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<'daily' | 'skill'>('daily');
  const [skillArea, setSkillArea] = useState('');
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMin, setDurationMin] = useState(20);

  const canSubmit = title.trim().length > 0 && (taskType === 'daily' || skillArea.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    addTask(
      {
        title: title.trim(),
        skillArea: taskType === 'skill' ? skillArea.trim() : undefined,
        taskType,
        scheduledFor: date,
        startTime,
        durationMin,
      },
      {
        onSuccess: () => {
          setTitle('');
          setSkillArea('');
          onAdded?.();
        },
      }
    );
  };

  return (
    <View style={[{ padding: 16, gap: 14 }, cardStyle(colorScheme)]}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['daily', 'skill'] as const).map((type) => (
          <Pressable
            key={type}
            onPress={() => setTaskType(type)}
            style={{
              flex: 1,
              alignItems: 'center',
              borderRadius: 12,
              paddingVertical: 10,
              backgroundColor: taskType === type ? colors.tint : withAlpha(colors.tint, 0.08),
            }}>
            <ThemedText style={{ color: taskType === type ? '#fff' : colors.tint, fontWeight: '600' }}>
              {TYPE_LABEL[type]}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={taskType === 'daily' ? "e.g. Submit expense report" : 'e.g. Practice speaking'}
        placeholderTextColor={colors.icon}
        style={{
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          backgroundColor: withAlpha(colors.tint, 0.06),
        }}
      />

      {taskType === 'skill' && (
        <TextInput
          value={skillArea}
          onChangeText={setSkillArea}
          placeholder="Skill area, e.g. Public speaking"
          placeholderTextColor={colors.icon}
          style={{
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.text,
            backgroundColor: withAlpha(colors.tint, 0.06),
          }}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TimeStepper label="Time" value={startTime} onChange={setStartTime} />
        </View>
        <View style={{ flex: 1 }}>
          <DurationStepper label="Duration" minutes={durationMin} onChange={setDurationMin} />
        </View>
      </View>

      <Pressable
        onPress={submit}
        disabled={!canSubmit || isPending}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: 12,
          paddingVertical: 12,
          backgroundColor: colors.tint,
          opacity: !canSubmit || isPending ? 0.5 : 1,
        }}>
        <Ionicons name="add" size={16} color="#fff" />
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Add to routine</ThemedText>
      </Pressable>
    </View>
  );
}
