import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { withAlpha } from '@/lib/color';

const STEP_MIN = 30;
const MIN_MINUTES = 0;
const MAX_MINUTES = 23 * 60 + 30;

function clamp(minutes: number) {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes));
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  const clamped = clamp(minutes);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeLabel(time: string) {
  const minutes = timeToMinutes(time);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** +/- time control in 30-min increments, for start/end/duration entry. */
export function TimeStepper({
  label,
  value,
  onChange,
  step = STEP_MIN,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const minutes = timeToMinutes(value);

  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="label">{label}</ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 14,
          padding: 6,
          backgroundColor: withAlpha(colors.tint, 0.08),
        }}>
        <Pressable
          onPress={() => onChange(minutesToTime(minutes - step))}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name="remove" size={18} color={colors.tint} />
        </Pressable>

        <ThemedText type="subtitle" style={{ fontVariant: ['tabular-nums'] }}>
          {formatTimeLabel(value)}
        </ThemedText>

        <Pressable
          onPress={() => onChange(minutesToTime(minutes + step))}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name="add" size={18} color={colors.tint} />
        </Pressable>
      </View>
    </View>
  );
}

/** +/- control for a plain minute duration (not a clock time), same visual language as TimeStepper. */
export function DurationStepper({
  label,
  minutes,
  onChange,
  step = 5,
  min = 5,
  max = 120,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="label">{label}</ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 14,
          padding: 6,
          backgroundColor: withAlpha(colors.tint, 0.08),
        }}>
        <Pressable
          onPress={() => onChange(Math.max(min, minutes - step))}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name="remove" size={18} color={colors.tint} />
        </Pressable>

        <ThemedText type="subtitle">{minutes} min</ThemedText>

        <Pressable
          onPress={() => onChange(Math.min(max, minutes + step))}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name="add" size={18} color={colors.tint} />
        </Pressable>
      </View>
    </View>
  );
}
