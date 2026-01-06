/**
 * NotificationService.js
 * Handles push notifications for:
 *  1. Azan time alerts for each of the 5 daily prayers
 *  2. Loud azan audio playback (foreground)
 *  3. Major Islamic event reminders (Laylatul Qadr, Ramadan, Eid, etc.)
 *
 * Uses expo-notifications for local scheduling &
 * expo-av for azan audio playback.
 *
 * Gracefully degrades in Expo Go (SDK 53+) where push notifications
 * are unavailable — azan sound still works via expo-av.
 */

// NOTE: expo-notifications is loaded DYNAMICALLY to avoid Expo Go SDK 53+ errors.
// Do NOT add a static import for expo-notifications here.
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { PRAYER_TIMES, PRAYER_ORDER, FORBIDDEN_TIMES } from './SalatService';

// ─── Expo Go Detection ─────────────────────────────────────
// expo-notifications push/scheduling doesn't work in Expo Go since SDK 53
const isExpoGo = Constants.appOwnership === 'expo';
let notificationsAvailable = !isExpoGo;
let Notifications = null; // Loaded dynamically below

// Dynamically load expo-notifications only outside Expo Go
async function loadNotificationsModule() {
  if (Notifications) return true; // already loaded
  if (isExpoGo) return false;
  try {
    Notifications = await import('expo-notifications');
    return true;
  } catch (e) {
    console.warn('[Notification] Failed to load expo-notifications:', e.message);
    return false;
  }
}

// Probe at runtime — some methods may still throw
async function checkNotificationsAvailable() {
  if (isExpoGo) {
    notificationsAvailable = false;
    return false;
  }
  const loaded = await loadNotificationsModule();
  if (!loaded) {
    notificationsAvailable = false;
    return false;
  }
  try {
    await Notifications.getPermissionsAsync();
    notificationsAvailable = true;
    return true;
  } catch (e) {
    console.warn('[Notification] expo-notifications unavailable:', e.message);
    notificationsAvailable = false;
    return false;
  }
}

// ─── Constants ─────────────────────────────────────────────
const SCHEDULED_KEY = '@scheduled_notifications';

// Emoji map for each prayer (augments SalatService data)
const PRAYER_EMOJI = {
  fajr: '\u{1F305}',
  dhuhr: '\u{2600}\u{FE0F}',
  asr: '\u{1F324}\u{FE0F}',
  maghrib: '\u{1F305}',
  isha: '\u{1F319}',
};

// Major Islamic events — key format: "month-day" in Hijri calendar
const MAJOR_EVENTS = {
  '9-1': {
    title: '\u{1F319} Ramadan Mubarak!',
    body: 'The blessed month of Ramadan has begun. May Allah accept your fasting and prayers.',
  },
  '9-27': {
    title: '\u{2B50} Laylat al-Qadr',
    body: 'The Night of Power \u2014 better than a thousand months. Seek forgiveness and make dua tonight.',
  },
  '10-1': {
    title: '\u{1F389} Eid Mubarak!',
    body: 'Eid al-Fitr \u2014 Taqabbal Allahu minna wa minkum! May Allah accept our deeds.',
  },
  '12-9': {
    title: '\u{26F0}\u{FE0F} Day of Arafah',
    body: 'The best day of the year. Fasting today expiates sins of the past and coming year.',
  },
  '12-10': {
    title: '\u{1F411} Eid al-Adha Mubarak!',
    body: 'Taqabbal Allahu minna wa minkum! May your sacrifice be accepted.',
  },
  '1-1': {
    title: '\u{1F319} Happy Islamic New Year!',
    body: 'May this new Hijri year bring you closer to Allah and filled with blessings.',
  },
  '1-10': {
    title: '\u{1F4FF} Day of Ashura',
    body: 'Fasting on Ashura expiates sins of the previous year. \u2014 Sahih Muslim',
  },
  '3-12': {
    title: '\u{1F54C} Mawlid an-Nabi \u{FDFA}',
    body: 'Commemorating the birth of Prophet Muhammad \u{FDFA}. Send peace and blessings upon him.',
  },
  '7-27': {
    title: "\u{2728} Isra' and Mi'raj",
    body: "The miraculous night journey of Prophet Muhammad \u{FDFA}. The five daily prayers were prescribed on this night.",
  },
  '8-15': {
    title: "\u{1F31F} Laylat al-Bara'ah",
    body: 'The Night of Forgiveness. Seek forgiveness and spend the night in prayer.',
  },
};

// Online azan audio URL (Mishary Rashid Alafasy)
const AZAN_AUDIO_URL = 'https://cdn.aladhan.com/audio/adhaan/1.mp3';

// ─── Notification Channel Setup (Android) ──────────────────
async function setupNotificationChannel() {
  if (!notificationsAvailable) return;
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('azan-alerts', {
        name: 'Azan Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#D4A84B',
        sound: 'default',
        description: 'Notification at the start of each prayer time',
      });
      await Notifications.setNotificationChannelAsync('event-alerts', {
        name: 'Islamic Event Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#D4A84B',
        sound: 'default',
        description: 'Notifications for major Islamic events',
      });
      await Notifications.setNotificationChannelAsync('forbidden-time-alerts', {
        name: 'Forbidden Prayer Time Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#F44336',
        sound: 'default',
        description: 'Warnings when forbidden prayer times begin (Hanafi)',
      });
    } catch (e) {
      console.warn('[Notification] Channel setup error:', e.message);
    }
  }
}

// ─── Permission ────────────────────────────────────────────
async function requestPermission() {
  if (!notificationsAvailable) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Notification] Permission error:', e.message);
    return false;
  }
}

// ─── Foreground Handler Setup ──────────────────────────────
function configureForegroundHandler() {
  if (!notificationsAvailable) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('[Notification] Handler setup error:', e.message);
  }
}

// ─── Azan Audio Player ─────────────────────────────────────
// This works in Expo Go — it uses expo-av, not expo-notifications
let azanSound = null;

async function playAzanAudio() {
  try {
    await stopAzanAudio();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: AZAN_AUDIO_URL },
      { shouldPlay: true, volume: 1.0, isLooping: false }
    );
    azanSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) stopAzanAudio();
    });

    console.log('[Notification] Azan audio playing');
  } catch (error) {
    console.error('[Notification] Error playing azan audio:', error);
  }
}

async function stopAzanAudio() {
  try {
    if (azanSound) {
      await azanSound.stopAsync();
      await azanSound.unloadAsync();
      azanSound = null;
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

// ─── Schedule Prayer Notifications ─────────────────────────
async function scheduleAzanNotifications() {
  if (!notificationsAvailable) {
    console.log('[Notification] Skipping azan schedule (Expo Go)');
    return [];
  }

  await cancelAzanNotifications();
  const ids = [];

  try {
    for (const key of PRAYER_ORDER) {
      const prayer = PRAYER_TIMES[key];
      const emoji = PRAYER_EMOJI[key] || '\u{1F54C}';

      // Main azan notification at prayer start time
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${prayer.name} (${prayer.nameAr})`,
          body: `It's time for ${prayer.name} prayer. May Allah accept your salah.`,
          data: { type: 'azan', prayer: key },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'azan-alerts' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: prayer.startHour,
          minute: 0,
        },
      });

      ids.push({ id, prayer: key, kind: 'azan' });

      // Pre-prayer reminder — 10 minutes before each prayer
      // Prayer starts at startHour:00, so reminder is at (startHour-1):50
      let reminderHour = (prayer.startHour - 1 + 24) % 24;
      let reminderMinute = 50;

      const preId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `\u{23F0} ${prayer.name} in 10 minutes`,
          body: `Prepare for ${prayer.name} (${prayer.nameAr}) — starts at ${String(prayer.startHour).padStart(2, '0')}:00`,
          data: { type: 'pre_azan', prayer: key },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'azan-alerts' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminderHour,
          minute: reminderMinute,
        },
      });

      ids.push({ id: preId, prayer: key, kind: 'pre_azan' });
    }

    await AsyncStorage.setItem(SCHEDULED_KEY + '_azan', JSON.stringify(ids));
    console.log(`[Notification] Scheduled ${ids.length} azan notifications (${PRAYER_ORDER.length} prayers × 2)`);
  } catch (err) {
    console.error('[Notification] Schedule azan error:', err);
  }

  return ids;
}

// ─── Schedule Forbidden Time Warnings (Hanafi) ─────────────
async function scheduleForbiddenTimeNotifications() {
  if (!notificationsAvailable) {
    console.log('[Notification] Skipping forbidden time schedule (Expo Go)');
    return [];
  }

  await cancelForbiddenTimeNotifications();
  const ids = [];

  try {
    // Only schedule warnings for haram times (the 3 strictly forbidden)
    const haramTimes = FORBIDDEN_TIMES.filter(ft => ft.severity === 'haram');

    for (const ft of haramTimes) {
      // Notification at the START of forbidden time
      const startId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `\u{26D4} ${ft.icon} Forbidden Time: ${ft.name}`,
          body: `${ft.description}\nAvoid praying until ${String(ft.endHour).padStart(2, '0')}:${String(ft.endMinute).padStart(2, '0')}`,
          data: { type: 'forbidden_time', timeKey: ft.key },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'forbidden-time-alerts' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: ft.startHour,
          minute: ft.startMinute,
        },
      });

      ids.push({ id: startId, timeKey: ft.key, kind: 'forbidden_start' });

      // Notification when forbidden time ENDS (safe to pray again)
      const endId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `\u{2705} ${ft.name} period ended`,
          body: `The forbidden time of ${ft.name} has passed. You may now resume prayers.`,
          data: { type: 'forbidden_time_end', timeKey: ft.key },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'forbidden-time-alerts' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: ft.endHour,
          minute: ft.endMinute,
        },
      });

      ids.push({ id: endId, timeKey: ft.key, kind: 'forbidden_end' });
    }

    await AsyncStorage.setItem(SCHEDULED_KEY + '_forbidden', JSON.stringify(ids));
    console.log(`[Notification] Scheduled ${ids.length} forbidden time notifications`);
  } catch (err) {
    console.error('[Notification] Schedule forbidden time error:', err);
  }

  return ids;
}

async function cancelForbiddenTimeNotifications() {
  if (!notificationsAvailable) return;
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_KEY + '_forbidden');
    if (stored) {
      const ids = JSON.parse(stored);
      for (const item of ids) {
        await Notifications.cancelScheduledNotificationAsync(item.id);
      }
      await AsyncStorage.removeItem(SCHEDULED_KEY + '_forbidden');
    }
  } catch (err) {
    console.warn('[Notification] Cancel forbidden time error:', err);
  }
}

async function cancelAzanNotifications() {
  if (!notificationsAvailable) return;
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_KEY + '_azan');
    if (stored) {
      const ids = JSON.parse(stored);
      for (const item of ids) {
        await Notifications.cancelScheduledNotificationAsync(item.id);
      }
      await AsyncStorage.removeItem(SCHEDULED_KEY + '_azan');
    }
  } catch (err) {
    console.warn('[Notification] Cancel azan error:', err);
  }
}

// ─── Schedule Event Notifications ──────────────────────────
async function scheduleEventNotifications() {
  if (!notificationsAvailable) {
    console.log('[Notification] Skipping event schedule (Expo Go)');
    return [];
  }

  await cancelEventNotifications();
  const ids = [];

  try {
    // Fetch current Hijri date from Aladhan API
    let hijriDate;
    try {
      const response = await fetch('https://api.aladhan.com/v1/gpiToH');
      const data = await response.json();
      if (data.code === 200) {
        hijriDate = {
          day: parseInt(data.data.hijri.day),
          month: parseInt(data.data.hijri.month.number),
          year: parseInt(data.data.hijri.year),
        };
      }
    } catch (e) {
      console.warn('[Notification] Hijri API fallback');
    }

    if (!hijriDate) {
      const today = new Date();
      const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
      const a = Math.floor((14 - m) / 12);
      const yr = y + 4800 - a, mo = m + 12 * a - 3;
      const jd = d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
      const l = jd - 1948440 + 10632;
      const n = Math.floor((l - 1) / 10631);
      const rem = l - 10631 * n + 354;
      const j = Math.floor((10985 - rem) / 5316) * Math.floor((50 * rem) / 17719) + Math.floor(rem / 5670) * Math.floor((43 * rem) / 15238);
      const adj = rem - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
      hijriDate = {
        month: Math.floor((24 * adj) / 709),
        day: adj - Math.floor((709 * Math.floor((24 * adj) / 709)) / 24),
        year: 30 * n + j - 30,
      };
    }

    for (const [key, event] of Object.entries(MAJOR_EVENTS)) {
      const [eventMonth, eventDay] = key.split('-').map(Number);
      const fromDayOfYear = (hijriDate.month - 1) * 30 + hijriDate.day;
      let toDayOfYear = (eventMonth - 1) * 30 + eventDay;
      if (toDayOfYear <= fromDayOfYear) toDayOfYear += 354;
      const daysUntil = toDayOfYear - fromDayOfYear;

      if (daysUntil >= 0 && daysUntil <= 60) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysUntil);
        eventDate.setHours(8, 0, 0, 0);

        if (eventDate > new Date()) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: event.title,
              body: event.body,
              data: { type: 'event', eventKey: key },
              sound: 'default',
              ...(Platform.OS === 'android' && { channelId: 'event-alerts' }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: eventDate,
            },
          });
          ids.push({ id, eventKey: key, daysUntil });

          // Day-before reminder for major events
          if (['9-1', '9-27', '10-1', '12-10'].includes(key) && daysUntil > 1) {
            const reminderDate = new Date();
            reminderDate.setDate(reminderDate.getDate() + daysUntil - 1);
            reminderDate.setHours(20, 0, 0, 0);

            if (reminderDate > new Date()) {
              const reminderId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `\u{1F4C5} Tomorrow: ${event.title.replace(/^[^\s]+\s/, '')}`,
                  body: `Prepare for tomorrow \u2014 ${event.body.split('.')[0]}.`,
                  data: { type: 'event_reminder', eventKey: key },
                  sound: 'default',
                  ...(Platform.OS === 'android' && { channelId: 'event-alerts' }),
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: reminderDate,
                },
              });
              ids.push({ id: reminderId, eventKey: key + '_reminder', daysUntil: daysUntil - 1 });
            }
          }
        }
      }
    }

    await AsyncStorage.setItem(SCHEDULED_KEY + '_events', JSON.stringify(ids));
    console.log(`[Notification] Scheduled ${ids.length} event notifications`);
  } catch (err) {
    console.error('[Notification] Error scheduling event notifications:', err);
  }

  return ids;
}

async function cancelEventNotifications() {
  if (!notificationsAvailable) return;
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_KEY + '_events');
    if (stored) {
      const ids = JSON.parse(stored);
      for (const item of ids) {
        await Notifications.cancelScheduledNotificationAsync(item.id);
      }
      await AsyncStorage.removeItem(SCHEDULED_KEY + '_events');
    }
  } catch (err) {
    console.warn('[Notification] Cancel event error:', err);
  }
}

// ─── Cancel All ────────────────────────────────────────────
async function cancelAllNotifications() {
  if (!notificationsAvailable) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_KEY + '_azan');
    await AsyncStorage.removeItem(SCHEDULED_KEY + '_events');
    await AsyncStorage.removeItem(SCHEDULED_KEY + '_forbidden');
    console.log('[Notification] All notifications cancelled');
  } catch (e) {
    console.warn('[Notification] Cancel all error:', e.message);
  }
}

// ─── Sync with Settings ────────────────────────────────────
async function syncWithSettings(settings) {
  if (!notificationsAvailable) {
    return { success: false, reason: 'expo_go', isExpoGo: true };
  }

  const hasPermission = await requestPermission();
  if (!hasPermission) {
    return { success: false, reason: 'permission_denied' };
  }

  await setupNotificationChannel();

  if (settings.azanNotifications) {
    await scheduleAzanNotifications();
    // Also schedule forbidden time warnings alongside prayer alerts
    await scheduleForbiddenTimeNotifications();
  } else {
    await cancelAzanNotifications();
    await cancelForbiddenTimeNotifications();
  }

  if (settings.eventNotifications) {
    await scheduleEventNotifications();
  } else {
    await cancelEventNotifications();
  }

  return { success: true };
}

// ─── Initialize ────────────────────────────────────────────
async function initialize(settings) {
  await checkNotificationsAvailable();

  if (notificationsAvailable) {
    configureForegroundHandler();
    await setupNotificationChannel();

    if (settings.azanNotifications || settings.azanSound || settings.eventNotifications) {
      await syncWithSettings(settings);
    }
  } else {
    console.log('[Notification] Running in Expo Go \u2014 push notifications disabled, azan audio available');
  }
}

// ─── Listeners ─────────────────────────────────────────────
function addReceivedListener(settings) {
  if (!notificationsAvailable) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data || {};
      if (data.type === 'azan' && settings.azanSound) {
        playAzanAudio();
      }
    });
  } catch (e) {
    return { remove: () => {} };
  }
}

function addResponseListener(callback) {
  if (!notificationsAvailable) return { remove: () => {} };
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (e) {
    return { remove: () => {} };
  }
}

// ─── Get Scheduled Count ───────────────────────────────────
async function getScheduledCount() {
  if (!notificationsAvailable) return 0;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.length;
  } catch (e) {
    return 0;
  }
}

// ─── Exports ───────────────────────────────────────────────
const NotificationService = {
  // State
  get isExpoGo() { return isExpoGo; },
  get isAvailable() { return notificationsAvailable; },
  // Methods
  requestPermission,
  initialize,
  syncWithSettings,
  scheduleAzanNotifications,
  cancelAzanNotifications,
  scheduleForbiddenTimeNotifications,
  cancelForbiddenTimeNotifications,
  scheduleEventNotifications,
  cancelEventNotifications,
  cancelAllNotifications,
  playAzanAudio,
  stopAzanAudio,
  addReceivedListener,
  addResponseListener,
  getScheduledCount,
  checkNotificationsAvailable,
  // Data
  PRAYER_TIMES,
  PRAYER_ORDER,
  MAJOR_EVENTS,
  FORBIDDEN_TIMES,
};

export default NotificationService;
