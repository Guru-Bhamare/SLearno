import { Platform } from 'react-native';

// expo-notifications doesn't support scheduled local notifications on web,
// and importing it there throws on load — skip entirely off-native.
const Notifications = Platform.OS !== 'web' ? require('expo-notifications') : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NUDGE_IDENTIFIER = 'same-day-nudge';
const EVENING_HOUR = 20;

async function ensurePermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

/**
 * Reminds the user once, this evening, if tasks are still incomplete.
 * Re-schedules from scratch on every call so it stays in sync with the
 * current incomplete count and cancels itself once everything is done.
 */
export async function scheduleEveningNudge(incompleteCount: number) {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(NUDGE_IDENTIFIER).catch(() => {});
  if (incompleteCount === 0) return;

  const now = new Date();
  const fireAt = new Date();
  fireAt.setHours(EVENING_HOUR, 0, 0, 0);
  if (fireAt <= now) return; // evening slot already passed today

  const granted = await ensurePermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: NUDGE_IDENTIFIER,
    content: {
      title: 'Still time today',
      body: `${incompleteCount} task${incompleteCount > 1 ? 's' : ''} left — even a small step counts.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}
