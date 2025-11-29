import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { AudioProvider } from './src/context/AudioContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';

/** Initializes notification service once settings are loaded */
function NotificationBootstrap({ children }) {
  const { settings, loaded } = useSettings();

  useEffect(() => {
    if (!loaded) return;

    // Initialize notification system with current settings
    NotificationService.initialize(settings).catch((err) =>
      console.warn('[App] Notification init error:', err)
    );

    // Listen for received notifications (azan sound trigger)
    const sub = NotificationService.addReceivedListener(settings);
    return () => sub.remove();
  }, [loaded, settings.azanNotifications, settings.azanSound, settings.eventNotifications]);

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationBootstrap>
          <AudioProvider>
            <AppNavigator />
          </AudioProvider>
        </NotificationBootstrap>
      </SettingsProvider>
    </AuthProvider>
  );
}
