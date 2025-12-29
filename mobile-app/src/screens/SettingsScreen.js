import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import NotificationService from '../services/NotificationService';

const FONT_SIZE_RANGES = {
  arabicFontSize: { min: 18, max: 44, step: 2, label: 'Quran Arabic Font Size' },
  englishFontSize: { min: 12, max: 28, step: 1, label: 'Quran English Font Size' },
  hadithArabicFontSize: { min: 16, max: 38, step: 2, label: 'Hadith Arabic Font Size' },
  hadithEnglishFontSize: { min: 12, max: 24, step: 1, label: 'Hadith English Font Size' },
};

export default function SettingsScreen({ navigation }) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [notifSyncing, setNotifSyncing] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Load scheduled notification count
  useEffect(() => {
    NotificationService.getScheduledCount().then(setScheduledCount).catch(() => {});
  }, [settings.azanNotifications, settings.eventNotifications]);

  // Sync notifications when toggle changes
  const handleNotificationToggle = useCallback(async (key, value) => {
    // If enabling any notification, request permission first
    if (value) {
      const granted = await NotificationService.requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    await updateSetting(key, value);

    // Build the new settings state for sync
    const newSettings = { ...settings, [key]: value };

    // If azanSound is turned on, also turn on azanNotifications
    if (key === 'azanSound' && value && !settings.azanNotifications) {
      await updateSetting('azanNotifications', true);
      newSettings.azanNotifications = true;
    }

    // If azanNotifications is turned off, also turn off azanSound
    if (key === 'azanNotifications' && !value) {
      await updateSetting('azanSound', false);
      newSettings.azanSound = false;
    }

    setNotifSyncing(true);
    try {
      await NotificationService.syncWithSettings(newSettings);
      const count = await NotificationService.getScheduledCount();
      setScheduledCount(count);
    } catch (err) {
      console.error('Notification sync error:', err);
    } finally {
      setNotifSyncing(false);
    }
  }, [settings, updateSetting]);

  // Test azan audio
  const handleTestAzan = async () => {
    Alert.alert(
      '🔊 Playing Azan',
      'Playing a short azan clip. Tap OK to stop.',
      [
        {
          text: 'Stop',
          onPress: () => NotificationService.stopAzanAudio(),
        },
      ]
    );
    await NotificationService.playAzanAudio();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetSettings(),
        },
      ]
    );
  };

  const renderFontSizeControl = (key) => {
    const config = FONT_SIZE_RANGES[key];
    const value = settings[key];

    return (
      <View style={styles.settingRow} key={key}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{config.label}</Text>
          <Text style={styles.settingValue}>{value}px</Text>
        </View>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={[styles.stepButton, value <= config.min && styles.stepButtonDisabled]}
            onPress={() => {
              if (value > config.min) updateSetting(key, value - config.step);
            }}
            disabled={value <= config.min}
          >
            <Ionicons name="remove" size={20} color={value <= config.min ? '#555' : '#D4A84B'} />
          </TouchableOpacity>

          <View style={styles.previewBarContainer}>
            <View
              style={[
                styles.previewBarFill,
                { width: `${((value - config.min) / (config.max - config.min)) * 100}%` },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[styles.stepButton, value >= config.max && styles.stepButtonDisabled]}
            onPress={() => {
              if (value < config.max) updateSetting(key, value + config.step);
            }}
            disabled={value >= config.max}
          >
            <Ionicons name="add" size={20} color={value >= config.max ? '#555' : '#D4A84B'} />
          </TouchableOpacity>
        </View>
        {/* Live preview */}
        <View style={styles.previewContainer}>
          {key.includes('arabic') || key.includes('Arabic') ? (
            <Text
              style={[
                styles.previewArabic,
                { fontSize: value, lineHeight: value * 1.8 },
              ]}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </Text>
          ) : (
            <Text style={[styles.previewEnglish, { fontSize: value, lineHeight: value * 1.4 }]}>
              In the name of Allah, the Most Gracious, the Most Merciful.
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderToggle = (key, label, description) => (
    <View style={styles.toggleRow} key={key}>
      <View style={styles.toggleInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(val) => updateSetting(key, val)}
        trackColor={{ false: '#333333', true: '#D4A84B' }}
        thumbColor={settings[key] ? '#FFF' : '#808080'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#D4A84B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Font Sizes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="text" size={20} color="#D4A84B" />
            <Text style={styles.sectionTitle}>Font Sizes</Text>
          </View>

          {renderFontSizeControl('arabicFontSize')}
          {renderFontSizeControl('englishFontSize')}
          {renderFontSizeControl('hadithArabicFontSize')}
          {renderFontSizeControl('hadithEnglishFontSize')}
        </View>

        {/* ── Notifications Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color="#D4A84B" />
            <Text style={styles.sectionTitle}>Notifications</Text>
            {notifSyncing && (
              <ActivityIndicator size="small" color="#D4A84B" style={{ marginLeft: 8 }} />
            )}
          </View>

          {/* Azan Notification toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingLabel}>Azan Time Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive a push notification at the start of each prayer time (Fajr, Dhuhr, Asr, Maghrib, Isha)
              </Text>
            </View>
            <Switch
              value={settings.azanNotifications}
              onValueChange={(val) => handleNotificationToggle('azanNotifications', val)}
              trackColor={{ false: '#333333', true: '#D4A84B' }}
              thumbColor={settings.azanNotifications ? '#FFF' : '#808080'}
            />
          </View>

          {/* Azan Sound toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingLabel}>Play Azan Sound</Text>
              <Text style={styles.settingDescription}>
                Play the azan aloud when the app is open at prayer time
              </Text>
            </View>
            <Switch
              value={settings.azanSound}
              onValueChange={(val) => handleNotificationToggle('azanSound', val)}
              trackColor={{ false: '#333333', true: '#D4A84B' }}
              thumbColor={settings.azanSound ? '#FFF' : '#808080'}
            />
          </View>

          {/* Test Azan button */}
          {settings.azanSound && (
            <TouchableOpacity style={styles.testAzanBtn} onPress={handleTestAzan}>
              <Ionicons name="volume-high" size={18} color="#D4A84B" />
              <Text style={styles.testAzanText}>Test Azan Sound</Text>
            </TouchableOpacity>
          )}

          {/* Event Notifications toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.settingLabel}>Islamic Event Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified before Laylatul Qadr, Ramadan, Eid al-Fitr, Eid al-Adha, and other major events
              </Text>
            </View>
            <Switch
              value={settings.eventNotifications}
              onValueChange={(val) => handleNotificationToggle('eventNotifications', val)}
              trackColor={{ false: '#333333', true: '#D4A84B' }}
              thumbColor={settings.eventNotifications ? '#FFF' : '#808080'}
            />
          </View>

          {/* Status indicator */}
          {(settings.azanNotifications || settings.eventNotifications) && (
            <View style={styles.notifStatus}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.notifStatusText}>
                {scheduledCount} notification{scheduledCount !== 1 ? 's' : ''} scheduled
              </Text>
            </View>
          )}
        </View>

        {/* Reading Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={20} color="#D4A84B" />
            <Text style={styles.sectionTitle}>Reading Preferences</Text>
          </View>

          {renderToggle(
            'showTranslationByDefault',
            'Show Translation by Default',
            'Automatically show English translation when opening a Surah'
          )}
          {renderToggle(
            'showTafseerByDefault',
            'Auto-expand Tafseer',
            'Automatically expand tafseer section for each ayah'
          )}
          {renderToggle(
            'audioAutoScroll',
            'Auto-scroll During Playback',
            'Scroll to the currently playing ayah automatically'
          )}
        </View>

        {/* Reset Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color="#CF6679" />
            <Text style={styles.resetText}>Reset All Settings to Default</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4A84B',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  settingRow: {
    marginBottom: 20,
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  settingValue: {
    fontSize: 15,
    color: '#D4A84B',
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  settingDescription: {
    fontSize: 12,
    color: '#808080',
    marginTop: 3,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4A84B',
  },
  stepButtonDisabled: {
    borderColor: '#333333',
  },
  previewBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  previewBarFill: {
    height: 6,
    backgroundColor: '#D4A84B',
    borderRadius: 3,
  },
  previewContainer: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  previewArabic: {
    color: '#E8C87A',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
  },
  previewEnglish: {
    color: '#B3B3B3',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  resetText: {
    color: '#CF6679',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Notification styles
  testAzanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4A84B44',
  },
  testAzanText: {
    color: '#D4A84B',
    fontSize: 13,
    fontWeight: '600',
  },
  notifStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  notifStatusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
