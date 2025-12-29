import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings';

const DEFAULT_SETTINGS = {
  arabicFontSize: 28,
  englishFontSize: 16,
  hadithArabicFontSize: 22,
  hadithEnglishFontSize: 15,
  showTranslationByDefault: true,
  showTafseerByDefault: false,
  audioAutoScroll: true,
  // Notification settings
  azanNotifications: false,
  azanSound: false,
  eventNotifications: false,
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoaded(true);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
