/**
 * Morning reminders, scheduled on the phone itself: no push server or Firebase needed, and they arrive
 * even when the app is closed or offline. The next 7 mornings are scheduled with that day's plan, and
 * rescheduled whenever the app opens, so the text stays current.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';
import { storage } from './storage';

const SETTINGS_KEY = 'ec_reminders';
const ID_PREFIX = 'ec-morning-';
const CHANNEL = 'daily';
export const REMINDER_HOURS = [6, 7, 8, 9] as const;

export type ReminderSettings = { enabled: boolean; hour: number };
const DEFAULTS: ReminderSettings = { enabled: true, hour: 7 };

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await storage.get(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function saveReminderSettings(s: ReminderSettings) {
  await storage.set(SETTINGS_KEY, JSON.stringify(s));
}

/** Show reminders as a banner even if the app happens to be open at 7:00. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Asks for permission if needed. Returns whether notifications are allowed. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 'granted', 'ask' (the phone can still show the system prompt) or 'denied' (only phone settings can change it). */
export async function permissionState(): Promise<'granted' | 'ask' | 'denied'> {
  if (Platform.OS === 'web') return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'ask' : 'denied';
}

async function clearScheduled() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(ID_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

type Reminder = { date: string; title: string; body: string };

/**
 * Replaces the scheduled morning reminders with the next 7 days' plan. Quietly does nothing when reminders
 * are off, permission was not given, or the phone is offline; the next app open tries again.
 * Returns how many were scheduled.
 */
export async function syncReminders(token: string, opts: { askPermission?: boolean } = {}): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const settings = await getReminderSettings();
  if (!settings.enabled) {
    await clearScheduled();
    return 0;
  }
  const allowed = opts.askPermission ? await ensurePermission() : (await Notifications.getPermissionsAsync()).granted;
  if (!allowed) return 0;
  // Expo Go on Android can refuse to create channels; the default channel still delivers the reminder.
  let channelId: string | undefined;
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Morning reminder', importance: AndroidImportance.DEFAULT });
      channelId = CHANNEL;
    } catch {
      channelId = undefined;
    }
  }
  let reminders: Reminder[];
  try {
    reminders = (await api<{ reminders: Reminder[] }>('/api/reminders?days=7', { token })).reminders;
  } catch {
    return 0;
  }
  await clearScheduled();
  const now = Date.now();
  let count = 0;
  for (const r of reminders) {
    const [y, m, d] = r.date.split('-').map(Number);
    const at = new Date(y, m - 1, d, settings.hour, 0, 0);
    if (at.getTime() <= now + 60_000) continue; // today's time has passed: start from tomorrow
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${r.date}`,
      content: { title: r.title, body: r.body, data: { screen: 'today' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...(channelId ? { channelId } : {}) },
    });
    count++;
  }
  return count;
}

/** The next scheduled reminder, for showing "Next: tomorrow at 7:00" in settings. */
export async function nextReminder(): Promise<Date | null> {
  if (Platform.OS === 'web') return null;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const dates = all
    .filter((n) => n.identifier.startsWith(ID_PREFIX))
    .map((n) => {
      const t = n.trigger as { value?: number; date?: number } | null;
      const v = t?.value ?? t?.date;
      return typeof v === 'number' ? new Date(v) : null;
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}
