import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatTimeLabel, TimeStepper, timeToMinutes } from '@/components/time-stepper';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAddDayBlock, useDayBlocks, useDeleteDayBlock, type DayBlock } from '@/hooks/use-day-map';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

const BLOCK_LABEL: Record<DayBlock['block_type'], string> = { work: 'Work', free: 'Free time' };
const BLOCK_ICON: Record<DayBlock['block_type'], keyof typeof Ionicons.glyphMap> = {
  work: 'briefcase-outline',
  free: 'sparkles-outline',
};

/** Day-mapping anchor step: blocks out work vs. free time for a given date. */
export function DayMapEditor({ profileId, date }: { profileId: string | undefined; date: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { data: blocks, isLoading } = useDayBlocks(profileId, date);
  const { mutate: addBlock, isPending } = useAddDayBlock(profileId);
  const { mutate: deleteBlock } = useDeleteDayBlock(profileId);

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [blockType, setBlockType] = useState<DayBlock['block_type']>('work');

  const submit = () => {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return;
    addBlock({ date, startTime, endTime, blockType });
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <ThemedText type="subtitle">Map your day</ThemedText>
        <ThemedText type="muted">
          Block out work and free time first — tasks get placed against the free time you mark here.
        </ThemedText>
      </View>

      <View style={[{ padding: 16, gap: 14 }, cardStyle(colorScheme)]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['work', 'free'] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setBlockType(type)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 12,
                paddingVertical: 10,
                backgroundColor: blockType === type ? colors.tint : withAlpha(colors.tint, 0.08),
              }}>
              <Ionicons name={BLOCK_ICON[type]} size={16} color={blockType === type ? '#fff' : colors.tint} />
              <ThemedText style={{ color: blockType === type ? '#fff' : colors.tint, fontWeight: '600' }}>
                {BLOCK_LABEL[type]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TimeStepper label="Starts" value={startTime} onChange={setStartTime} />
          </View>
          <View style={{ flex: 1 }}>
            <TimeStepper label="Ends" value={endTime} onChange={setEndTime} />
          </View>
        </View>

        {timeToMinutes(endTime) <= timeToMinutes(startTime) && (
          <ThemedText type="muted" style={{ color: colors.warning }}>
            End time needs to be after the start time.
          </ThemedText>
        )}

        <Pressable
          onPress={submit}
          disabled={isPending || timeToMinutes(endTime) <= timeToMinutes(startTime)}
          style={{
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: colors.tint,
            opacity: isPending ? 0.6 : 1,
          }}>
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Add block</ThemedText>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator />}

      {!isLoading && !!blocks?.length && (
        <View style={{ gap: 8 }}>
          {blocks.map((block, i) => (
            <MotiView
              key={block.id}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: i * 40 }}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderLeftWidth: 4,
                  borderLeftColor: block.block_type === 'work' ? colors.icon : colors.tint,
                },
                cardStyle(colorScheme),
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={BLOCK_ICON[block.block_type]} size={18} color={colors.icon} />
                <View>
                  <ThemedText type="subtitle" style={{ fontSize: 15 }}>
                    {formatTimeLabel(block.start_time)} – {formatTimeLabel(block.end_time)}
                  </ThemedText>
                  <ThemedText type="muted">{BLOCK_LABEL[block.block_type]}</ThemedText>
                </View>
              </View>
              <Pressable onPress={() => deleteBlock({ blockId: block.id, date })} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.icon} />
              </Pressable>
            </MotiView>
          ))}
        </View>
      )}

      {!isLoading && !blocks?.length && (
        <ThemedText type="muted">No blocks yet — add your first one above.</ThemedText>
      )}
    </View>
  );
}
