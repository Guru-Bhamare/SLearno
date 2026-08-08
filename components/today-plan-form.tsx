import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGenerateDailyPlan } from '@/hooks/use-daily-plan';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

function FormField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  colors,
  accent,
  icon,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: (typeof Colors)['light'];
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.field, { borderColor: withAlpha(accent, 0.15), backgroundColor: withAlpha(accent, 0.03) }]}>
      <View style={styles.fieldLabelRow}>
        <View style={[styles.fieldIcon, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Ionicons name={icon} size={15} color={accent} />
        </View>
        <View style={styles.fieldLabelWrap}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>{label}</ThemedText>
          <ThemedText type="muted" style={styles.fieldHint}>
            {hint}
          </ThemedText>
        </View>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={withAlpha(colors.icon, 0.75)}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.card,
            borderColor: withAlpha(accent, 0.2),
          },
        ]}
      />
    </View>
  );
}

export function TodayPlanForm({
  profileId,
  date,
  onGenerated,
  onCancel,
}: {
  profileId: string | undefined;
  date: string;
  onGenerated?: () => void;
  onCancel?: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { mutate: generate, isPending, error } = useGenerateDailyPlan(profileId);

  const [schedule, setSchedule] = useState('');
  const [academicsGoals, setAcademicsGoals] = useState('');
  const [skillsGoals, setSkillsGoals] = useState('');

  const hasGoals = academicsGoals.trim().length > 0 || skillsGoals.trim().length > 0;
  const canSubmit = schedule.trim().length > 0 && hasGoals;

  const submit = () => {
    if (!canSubmit) return;
    generate(
      {
        schedule: schedule.trim(),
        academicsGoals: academicsGoals.trim(),
        skillsGoals: skillsGoals.trim(),
        date,
      },
      { onSuccess: () => onGenerated?.() }
    );
  };

  return (
    <View style={[styles.card, cardStyle(colorScheme)]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.tint} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="subtitle" style={{ fontSize: 17 }}>
            Plan your day
          </ThemedText>
          <ThemedText type="muted" style={styles.headerSub}>
            Add your schedule, then list what you want under each section — you choose academics vs skills.
          </ThemedText>
        </View>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            hitSlop={8}
            style={[styles.closeBtn, { backgroundColor: withAlpha(colors.icon, 0.1) }]}>
            <Ionicons name="close" size={16} color={colors.icon} />
          </Pressable>
        )}
      </View>

      <View style={[styles.field, styles.scheduleField, { borderColor: colors.border }]}>
        <View style={styles.fieldLabelWrap}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>Time schedule</ThemedText>
          <ThemedText type="muted" style={styles.fieldHint}>
            When are you free, in class, or busy?
          </ThemedText>
        </View>
        <TextInput
          value={schedule}
          onChangeText={setSchedule}
          placeholder="8–12 college, 1–3 lunch, 4–7 study time, 8–9 free"
          placeholderTextColor={withAlpha(colors.icon, 0.75)}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: withAlpha(colors.tint, 0.04),
              borderColor: colors.border,
            },
          ]}
        />
      </View>

      <FormField
        label="Academics"
        hint="Coursework, study, assignments — you decide what goes here"
        value={academicsGoals}
        onChangeText={setAcademicsGoals}
        placeholder="Math assignment, physics chapter 4 revision"
        colors={colors}
        accent={colors.tint}
        icon="school-outline"
      />

      <FormField
        label="Additional skills"
        hint="Hobbies, soft skills, side learning — separate from academics"
        value={skillsGoals}
        onChangeText={setSkillsGoals}
        placeholder="Guitar practice, public speaking drills"
        colors={colors}
        accent={colors.success}
        icon="bulb-outline"
      />

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: withAlpha(colors.warning, 0.1) }]}>
          <ThemedText style={{ color: colors.warning, fontSize: 13, lineHeight: 18 }}>
            {error instanceof Error ? error.message : 'Could not generate plan'}
          </ThemedText>
        </View>
      )}

      <Pressable
        onPress={submit}
        disabled={!canSubmit || isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: colors.tint,
            opacity: !canSubmit || isPending ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}>
        {isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="sparkles" size={18} color="#fff" />
        )}
        <ThemedText numberOfLines={1} style={styles.submitText}>
          {isPending ? 'Building your plan…' : "Generate today's plan"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  headerSub: { fontSize: 14, lineHeight: 20 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  field: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scheduleField: { padding: 12 },
  fieldLabelRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  fieldLabelWrap: { flex: 1, minWidth: 0, gap: 2 },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  fieldHint: { fontSize: 13, lineHeight: 18 },
  input: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },
  errorBox: { borderRadius: 10, padding: 12 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 },
});
