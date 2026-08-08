import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AddTaskSheet } from '@/components/add-task-sheet';
import { DayMapEditor } from '@/components/day-map-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { todayISO, tomorrowISO, useTasksForDate } from '@/hooks/use-routine';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export default function DayPlanScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam === 'today' ? todayISO() : dateParam === 'tomorrow' || !dateParam ? tomorrowISO() : dateParam;
  const isTomorrow = date === tomorrowISO();

  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { data: tasks, isLoading: tasksLoading } = useTasksForDate(profile?.id, date);

  const finish = () => {
    if (isTomorrow && profile?.id) {
      triggerProgressAnalysis(profile.id, 'day_map');
    }
    router.back();
  };

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 4 }}>
        <ThemedText type="title" style={{ fontSize: 22 }}>
          {isTomorrow ? "Plan tomorrow" : "Today's plan"}
        </ThemedText>
        <ThemedText type="muted">
          Map your day first, then add whatever needs doing — no need to rank anything.
        </ThemedText>
      </MotiView>

      <DayMapEditor profileId={profile?.id} date={date} />

      <View style={{ gap: 10 }}>
        <ThemedText type="subtitle">Add tasks</ThemedText>
        <AddTaskSheet profileId={profile?.id} date={date} />
      </View>

      <View style={{ gap: 10 }}>
        <ThemedText type="label">Already added</ThemedText>
        {tasksLoading && <ActivityIndicator />}
        {!tasksLoading && (!tasks || tasks.length === 0) && (
          <ThemedText type="muted">Nothing added yet.</ThemedText>
        )}
        {tasks?.map((task) => (
          <View
            key={task.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
            }}>
            <Ionicons name={task.task_type === 'skill' ? 'bulb-outline' : 'checkbox-outline'} size={16} color={colors.icon} />
            <ThemedText style={{ flex: 1 }}>{task.title}</ThemedText>
            <ThemedText type="muted">{task.start_time?.slice(0, 5) ?? task.time_block}</ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={finish}
        style={{
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: 'center',
          backgroundColor: colors.tint,
        }}>
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Done</ThemedText>
      </Pressable>
    </Screen>
  );
}
