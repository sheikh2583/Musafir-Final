/**
 * Musafir App - Dark Theme with Golden Accents
 * Centralized color definitions for consistent theming
 */

export const COLORS = {
  // Primary backgrounds
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  backgroundTertiary: '#252525',
  
  // Card and surface colors
  card: '#1E1E1E',
  cardElevated: '#252525',
  surface: '#2A2A2A',
  
  // Golden accent colors
  accent: '#D4A84B',
  accentLight: '#E8C87A',
  accentDark: '#B8942F',
  accentMuted: '#8B7355',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  textDisabled: '#5A5A5A',
  
  // Border colors
  border: '#333333',
  borderLight: '#404040',
  borderDark: '#1A1A1A',
  
  // Status colors (slightly muted for dark theme)
  success: '#4CAF50',
  successDark: '#2E7D32',
  error: '#CF6679',
  errorDark: '#B00020',
  warning: '#FFB74D',
  warningDark: '#F57C00',
  info: '#64B5F6',
  infoDark: '#1976D2',
  
  // Special colors
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  
  // Hadith collection colors (adjusted for dark theme)
  hadithBlue: '#5C9CE6',
  hadithBlueDark: '#1565C0',
  
  // Prayer status colors
  prayerCompleted: '#2E4A2E',
  prayerMissed: '#4A2E2E',
  prayerPending: '#4A432E',
  prayerUpcoming: '#2A2A2A',
  
  // Islamic event colors
  eventEid: '#4CAF50',
  eventFasting: '#FF9800',
  eventRamadan: '#9C27B0',
  eventHajj: '#795548',
  eventHoliday: '#2196F3',
  eventSpecial: '#E91E63',
  
  // Overlay
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.5)',
  
  // Shadow (for dark theme, we use subtle glows)
  shadow: '#000000',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

export default { COLORS, SHADOWS };
