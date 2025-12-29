import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Share, Animated, Easing } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import SalatService from '../services/SalatService';
import IslamicCalendarService from '../services/IslamicCalendarService';
import MusafirService from '../services/MusafirService';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const scrollViewRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(user);

  // ILM Orb animation
  const orbPulse = useRef(new Animated.Value(1)).current;
  const orbGlow = useRef(new Animated.Value(0.4)).current;
  const orbRotate = useRef(new Animated.Value(0)).current;
  
  // Salat state
  const [hijriDate, setHijriDate] = useState(null);
  const [todayPrayers, setTodayPrayers] = useState([]);
  const [salatStats, setSalatStats] = useState({ completed: 0, total: 5 });
  
  // Islamic calendar state
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [dailyQuote, setDailyQuote] = useState(null);
  const [dailyHadith, setDailyHadith] = useState(null);
  const [todayEvent, setTodayEvent] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  
  // Prayer waqt timer state
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [isNextPrayerMode, setIsNextPrayerMode] = useState(false);
  
  // Forbidden prayer times state (Hanafi)
  const [forbiddenTimes, setForbiddenTimes] = useState([]);
  const [activeForbidden, setActiveForbidden] = useState(null);

  // Ramadan Sehri/Iftar state
  const [ramadanTimes, setRamadanTimes] = useState(null);
  const [ramadanLoading, setRamadanLoading] = useState(false);
  const [showFastingCountdown, setShowFastingCountdown] = useState(false);
  const [fastingCountdown, setFastingCountdown] = useState(null); // { label, hours, mins, secs, isFasting }

  useEffect(() => {
    fetchUserData();
    loadSalatData();
    loadIslamicCalendar();
    loadRamadanTimes();

    // ILM Orb animations
    Animated.loop(
      Animated.timing(orbRotate, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      loadSalatData();
    }, [])
  );

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      updatePrayerTimer();
      // Refresh forbidden time status every tick
      const currentForbidden = SalatService.getCurrentForbiddenTime();
      setActiveForbidden(currentForbidden);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fasting countdown timer — runs every second when banner is tapped
  useEffect(() => {
    if (!showFastingCountdown || !ramadanTimes) return;
    const tick = () => {
      const now = new Date();
      const sehriDate = parseTimeToDate(ramadanTimes.sehriEnd.formatted);
      const iftarDate = parseTimeToDate(ramadanTimes.iftarTime.formatted);
      const isFasting = now >= sehriDate && now < iftarDate;

      let target, label;
      if (isFasting) {
        target = iftarDate;
        label = 'Iftar in';
      } else {
        // After iftar → countdown to next sehri (next day's fajr)
        target = now >= iftarDate
          ? new Date(sehriDate.getTime() + 24 * 60 * 60 * 1000) // tomorrow's sehri
          : sehriDate; // before sehri today
        label = 'Sehri in';
      }

      const diff = Math.max(0, target - now);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setFastingCountdown({ label, hours, mins, secs, isFasting });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showFastingCountdown, ramadanTimes]);

  // Helper: parse "HH:MM" or "H:MM AM/PM" formatted time to today's Date
  const parseTimeToDate = (formatted) => {
    const now = new Date();
    let hours, minutes;
    const lower = formatted.toLowerCase();
    if (lower.includes('am') || lower.includes('pm')) {
      const [time, period] = formatted.split(/\s+/);
      const [h, m] = time.split(':').map(Number);
      hours = period.toLowerCase() === 'pm' && h !== 12 ? h + 12 : (period.toLowerCase() === 'am' && h === 12 ? 0 : h);
      minutes = m;
    } else {
      [hours, minutes] = formatted.split(':').map(Number);
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  };

  const loadSalatData = async () => {
    const hijri = SalatService.getHijriDate();
    setHijriDate(hijri);
    
    const prayers = await SalatService.getTodayPrayers();
    setTodayPrayers(prayers);
    
    const stats = await SalatService.getTodayStats();
    setSalatStats(stats);
    
    // Load forbidden times (Hanafi)
    const ft = SalatService.getAllForbiddenTimes();
    setForbiddenTimes(ft);
    const currentForbidden = SalatService.getCurrentForbiddenTime();
    setActiveForbidden(currentForbidden);
    
    // Load initial prayer timer
    updatePrayerTimer();
  };

  const updatePrayerTimer = () => {
    const current = SalatService.getCurrentPrayer();
    const next = SalatService.getNextPrayer();
    setCurrentPrayer(current);
    setNextPrayer(next);
    
    const now = new Date();
    
    if (current) {
      // During a prayer window — show time remaining
      setIsNextPrayerMode(false);
      const endTime = new Date();
      endTime.setHours(current.endHour, 0, 0, 0);
      
      const diffMs = endTime - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setRemainingTime({
          hours,
          minutes,
          seconds,
          formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        });
      }
    } else if (next) {
      // Between prayers — show countdown to next prayer
      setIsNextPrayerMode(true);
      const startTime = new Date();
      if (next.tomorrow) {
        startTime.setDate(startTime.getDate() + 1);
      }
      startTime.setHours(next.startHour, 0, 0, 0);
      
      const diffMs = startTime - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setRemainingTime({
          hours,
          minutes,
          seconds,
          formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        });
      } else {
        setRemainingTime(null);
      }
    } else {
      setRemainingTime(null);
    }
  };

  const loadRamadanTimes = async () => {
    try {
      setRamadanLoading(true);
      if (MusafirService.isRamadan()) {
        const result = await MusafirService.getPrayerTimesForCurrentLocation();
        if (!result.error) {
          setRamadanTimes({
            sehriEnd: result.times.fajr,
            iftarTime: result.times.maghrib,
            city: result.location?.city || '',
            country: result.location?.country || '',
          });
        }
      } else {
        setRamadanTimes(null);
      }
    } catch (e) {
      console.log('Ramadan times error:', e.message);
    } finally {
      setRamadanLoading(false);
    }
  };

  const loadIslamicCalendar = async () => {
    setCalendarLoading(true);
    try {
      // Get Hijri date (online)
      const hijri = await IslamicCalendarService.getHijriDateOnline();
      setHijriDate(hijri);
      
      // Get upcoming events
      const events = await IslamicCalendarService.getUpcomingEvents(3);
      setUpcomingEvents(events);
      
      // Check if today is special
      const today = await IslamicCalendarService.getTodayEvent();
      setTodayEvent(today);
      
      // Get daily quote
      const quote = IslamicCalendarService.getDailyQuote();
      setDailyQuote(quote);

      // Get daily hadith (local — no API call)
      const hadith = IslamicCalendarService.getDailyHadith();
      setDailyHadith(hadith);
    } catch (error) {
      console.log('Error loading Islamic calendar:', error.message);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handlePrayerToggle = async (prayerKey, currentlyCompleted) => {
    if (currentlyCompleted) {
      await SalatService.unmarkPrayer(prayerKey);
    } else {
      await SalatService.markPrayerComplete(prayerKey);
    }
    await loadSalatData();
  };

  useEffect(() => {
    setUserData(user);
  }, [user]);



  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUserData(response.data);
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserData(), loadSalatData(), loadIslamicCalendar()]);
    setRefreshing(false);
  };



  return (
    <KeyboardAvoidingView
      style={styles.outerContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Hijri Date Header - Clickable to open calendar */}
      {hijriDate && (
        <TouchableOpacity 
          style={styles.hijriContainer}
          onPress={() => navigation.navigate('HijriCalendar')}
          activeOpacity={0.7}
        >
          <View style={styles.hijriDateRow}>
            <Text style={styles.hijriDateAr}>{hijriDate.formattedAr}</Text>
            <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </View>
          <Text style={styles.hijriDate}>{hijriDate.formatted}</Text>
          {hijriDate.dayNameAr && (
            <Text style={styles.hijriDay}>{hijriDate.dayName}</Text>
          )}
          <Text style={styles.hijriTapHint}>Tap to view calendar</Text>
        </TouchableOpacity>
      )}

      {/* Ramadan Sehri / Iftar Banner — only during Ramadan */}
      {ramadanTimes && (
        <TouchableOpacity
          style={styles.ramadanHomeBanner}
          onPress={() => setShowFastingCountdown(prev => !prev)}
          activeOpacity={0.8}
        >
          <View style={styles.ramadanHomeHeader}>
            <Text style={styles.ramadanHomeEmoji}>🌙</Text>
            <Text style={styles.ramadanHomeTitle}>Ramadan Mubarak</Text>
          </View>
          <View style={styles.ramadanHomeTimesRow}>
            <View style={styles.ramadanHomeTimeBox}>
              <Ionicons name="moon-outline" size={18} color="#7E57C2" />
              <Text style={styles.ramadanHomeTimeLabel}>Sehri Ends</Text>
              <Text style={styles.ramadanHomeTimeValue}>{ramadanTimes.sehriEnd.formatted}</Text>
            </View>
            <View style={styles.ramadanHomeDivider} />
            <View style={styles.ramadanHomeTimeBox}>
              <Ionicons name="sunny-outline" size={18} color="#FF9800" />
              <Text style={styles.ramadanHomeTimeLabel}>Iftar Time</Text>
              <Text style={styles.ramadanHomeTimeValue}>{ramadanTimes.iftarTime.formatted}</Text>
            </View>
          </View>

          {/* Smart Countdown */}
          {showFastingCountdown && fastingCountdown && (
            <View style={styles.countdownContainer}>
              <View style={styles.countdownDividerTop} />
              <Ionicons
                name={fastingCountdown.isFasting ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={fastingCountdown.isFasting ? '#FF9800' : '#7E57C2'}
              />
              <Text style={styles.countdownLabel}>{fastingCountdown.label}</Text>
              <View style={styles.countdownDigitsRow}>
                <View style={styles.countdownDigitBox}>
                  <Text style={styles.countdownDigit}>{String(fastingCountdown.hours).padStart(2, '0')}</Text>
                  <Text style={styles.countdownUnit}>hr</Text>
                </View>
                <Text style={styles.countdownColon}>:</Text>
                <View style={styles.countdownDigitBox}>
                  <Text style={styles.countdownDigit}>{String(fastingCountdown.mins).padStart(2, '0')}</Text>
                  <Text style={styles.countdownUnit}>min</Text>
                </View>
                <Text style={styles.countdownColon}>:</Text>
                <View style={styles.countdownDigitBox}>
                  <Text style={styles.countdownDigit}>{String(fastingCountdown.secs).padStart(2, '0')}</Text>
                  <Text style={styles.countdownUnit}>sec</Text>
                </View>
              </View>
              <Text style={styles.countdownStatus}>
                {fastingCountdown.isFasting ? '🤲 You are fasting — stay strong!' : '🌙 Rest well — Sehri is approaching'}
              </Text>
            </View>
          )}

          {ramadanTimes.city ? (
            <Text style={styles.ramadanHomeLocation}>
              📍 {ramadanTimes.city}{ramadanTimes.country ? `, ${ramadanTimes.country}` : ''}
            </Text>
          ) : null}
          <Text style={styles.ramadanTapHint}>
            {showFastingCountdown ? 'Tap to hide countdown' : 'Tap for countdown'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.title}>As-salamu alaykum</Text>
      <Text style={styles.subtitle}>Welcome, {userData?.name}</Text>

      {/* Today's Special Event Banner */}
      {todayEvent && (
        <View style={[styles.todayEventBanner, { backgroundColor: IslamicCalendarService.getEventColor(todayEvent.type) }]}>
          <Text style={styles.todayEventEmoji}>{todayEvent.emoji}</Text>
          <View style={styles.todayEventInfo}>
            <Text style={styles.todayEventTitle}>Today: {todayEvent.name}</Text>
            <Text style={styles.todayEventNameAr}>{todayEvent.nameAr}</Text>
          </View>
        </View>
      )}

      {/* Daily Quran Quote Card */}
      {dailyQuote && (
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="book-outline" size={18} color="#D4A84B" />
              <Text style={styles.quoteLabel}>Verse of the Day</Text>
            </View>
            <TouchableOpacity
              onPress={() => IslamicCalendarService.shareQuranVerse(dailyQuote)}
              style={styles.shareIconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-social-outline" size={20} color="#D4A84B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
          <Text style={styles.quoteRef}>— {dailyQuote.ref}</Text>
        </View>
      )}

      {/* Hadith of the Day Card */}
      {dailyHadith && (
        <View style={styles.hadithCard}>
          <View style={styles.hadithHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="library-outline" size={18} color="#81C784" />
              <Text style={styles.hadithLabel}>Hadith of the Day</Text>
            </View>
            <TouchableOpacity
              onPress={() => IslamicCalendarService.shareHadith(dailyHadith)}
              style={styles.shareIconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-social-outline" size={20} color="#81C784" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hadithBodyText}>"{dailyHadith.text}"</Text>
          <Text style={styles.hadithNarratorText}>— {dailyHadith.narrator}</Text>
          <Text style={styles.hadithRefText}>{dailyHadith.collection}, #{dailyHadith.number}</Text>
        </View>
      )}

      {/* Prayer Waqt Timer Card */}
      {remainingTime && (currentPrayer || nextPrayer) && (
        <View style={[styles.timerCard, isNextPrayerMode && styles.timerCardNext]}>
          <View style={styles.timerHeader}>
            <Ionicons name={isNextPrayerMode ? 'hourglass-outline' : 'time'} size={20} color={isNextPrayerMode ? '#B3B3B3' : '#D4A84B'} />
            <Text style={[styles.timerLabel, isNextPrayerMode && styles.timerLabelNext]}>
              {isNextPrayerMode ? 'Next Prayer' : 'Current Waqt'}
            </Text>
          </View>
          <View style={styles.timerContent}>
            <View style={styles.timerPrayerInfo}>
              <Text style={styles.timerPrayerName}>
                {isNextPrayerMode ? nextPrayer?.name : currentPrayer?.name}
              </Text>
              <Text style={styles.timerPrayerNameAr}>
                {isNextPrayerMode ? nextPrayer?.nameAr : currentPrayer?.nameAr}
              </Text>
            </View>
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerText, isNextPrayerMode && styles.timerTextNext]}>
                {remainingTime.formatted}
              </Text>
              <Text style={styles.timerSubtext}>
                {isNextPrayerMode ? 'starts in' : 'remaining'}
              </Text>
            </View>
          </View>
          {!isNextPrayerMode && currentPrayer && (
            <View style={styles.timerProgressBar}>
              <View style={[styles.timerProgressFill, {
                width: `${Math.max(0, Math.min(100, ((currentPrayer.endHour - currentPrayer.startHour - remainingTime.hours - (remainingTime.minutes / 60)) / (currentPrayer.endHour - currentPrayer.startHour)) * 100))}%`
              }]} />
            </View>
          )}
        </View>
      )}

      {/* ─── Forbidden Prayer Times Card (Hanafi) ─── */}
      <View style={styles.forbiddenCard}>
        <View style={styles.forbiddenHeader}>
          <Text style={styles.forbiddenTitle}>⛔ Forbidden Prayer Times</Text>
          <Text style={styles.forbiddenMadhab}>Hanafi</Text>
        </View>
        
        {/* Active Warning Banner */}
        {activeForbidden && (
          <View style={[
            styles.forbiddenBanner,
            activeForbidden.severity === 'haram' ? styles.forbiddenBannerHaram : styles.forbiddenBannerMakruh,
          ]}>
            <Text style={styles.forbiddenBannerIcon}>{activeForbidden.icon}</Text>
            <View style={styles.forbiddenBannerText}>
              <Text style={styles.forbiddenBannerTitle}>
                {activeForbidden.severity === 'haram' ? '🚫 DO NOT PRAY NOW' : '⚠️ Avoid Nafl Prayers'}
              </Text>
              <Text style={styles.forbiddenBannerDesc}>{activeForbidden.description}</Text>
              <Text style={styles.forbiddenBannerTime}>
                {activeForbidden.remainingMinutes} min remaining
              </Text>
            </View>
          </View>
        )}

        {/* Haram Times */}
        <Text style={styles.forbiddenSectionLabel}>
          🚫 Strictly Forbidden (Haram)
        </Text>
        {forbiddenTimes.filter(ft => ft.severity === 'haram').map((ft) => (
          <View key={ft.key} style={[
            styles.forbiddenRow,
            ft.isActive && styles.forbiddenRowActive,
            ft.isPast && styles.forbiddenRowPast,
          ]}>
            <Text style={styles.forbiddenRowIcon}>{ft.icon}</Text>
            <View style={styles.forbiddenRowInfo}>
              <View style={styles.forbiddenRowNameRow}>
                <Text style={[styles.forbiddenRowName, ft.isPast && styles.forbiddenRowTextPast]}>
                  {ft.name}
                </Text>
                <Text style={[styles.forbiddenRowNameAr, ft.isPast && styles.forbiddenRowTextPast]}>
                  {ft.nameAr}
                </Text>
              </View>
              <Text style={[styles.forbiddenRowTime, ft.isPast && styles.forbiddenRowTextPast]}>
                {ft.timeRange}
              </Text>
            </View>
            <View style={[
              styles.forbiddenStatusBadge,
              ft.isActive ? styles.forbiddenStatusActive :
              ft.isPast ? styles.forbiddenStatusPast :
              styles.forbiddenStatusUpcoming,
            ]}>
              <Text style={styles.forbiddenStatusText}>
                {ft.isActive ? `${ft.remainingMinutes}m` : ft.isPast ? 'Done' : 'Later'}
              </Text>
            </View>
          </View>
        ))}

        {/* Makruh Times */}
        <Text style={[styles.forbiddenSectionLabel, { marginTop: 10 }]}>
          ⚠️ Disliked (Makruh Tahrimi)
        </Text>
        {forbiddenTimes.filter(ft => ft.severity === 'makruh').map((ft) => (
          <View key={ft.key} style={[
            styles.forbiddenRow,
            ft.isActive && styles.forbiddenRowActiveMakruh,
            ft.isPast && styles.forbiddenRowPast,
          ]}>
            <Text style={styles.forbiddenRowIcon}>{ft.icon}</Text>
            <View style={styles.forbiddenRowInfo}>
              <View style={styles.forbiddenRowNameRow}>
                <Text style={[styles.forbiddenRowName, ft.isPast && styles.forbiddenRowTextPast]}>
                  {ft.name}
                </Text>
                <Text style={[styles.forbiddenRowNameAr, ft.isPast && styles.forbiddenRowTextPast]}>
                  {ft.nameAr}
                </Text>
              </View>
              <Text style={[styles.forbiddenRowTime, ft.isPast && styles.forbiddenRowTextPast]}>
                {ft.timeRange}
              </Text>
            </View>
            <View style={[
              styles.forbiddenStatusBadge,
              ft.isActive ? styles.forbiddenStatusActiveMakruh :
              ft.isPast ? styles.forbiddenStatusPast :
              styles.forbiddenStatusUpcoming,
            ]}>
              <Text style={styles.forbiddenStatusText}>
                {ft.isActive ? `${ft.remainingMinutes}m` : ft.isPast ? 'Done' : 'Later'}
              </Text>
            </View>
          </View>
        ))}

        {/* Reference */}
        <Text style={styles.forbiddenReference}>
          Based on Sahih Muslim 831a & Sahih al-Bukhari 586, 588
        </Text>
      </View>

      {/* Salat Tracking Card */}
      <View style={styles.salatCard}>
        <View style={styles.salatHeader}>
          <Text style={styles.salatTitle}>🕌 Today's Prayers</Text>
          <Text style={styles.salatStats}>{salatStats.completed}/5</Text>
        </View>
        
        <View style={styles.prayerGrid}>
          {todayPrayers.map((prayer) => {
            let iconName = 'ellipse-outline';
            let iconColor = '#BDBDBD';
            let bgStyle = styles.prayerUpcoming;
            
            if (prayer.completed) {
              iconName = 'checkmark-circle';
              iconColor = '#4CAF50';
              bgStyle = styles.prayerCompleted;
            } else if (prayer.status === 'missed') {
              iconName = 'close-circle';
              iconColor = '#F44336';
              bgStyle = styles.prayerMissed;
            } else if (prayer.status === 'pending') {
              iconName = 'time';
              iconColor = '#FF9800';
              bgStyle = styles.prayerPending;
            }
            
            return (
              <TouchableOpacity
                key={prayer.key}
                style={[styles.prayerItem, bgStyle]}
                onPress={() => handlePrayerToggle(prayer.key, prayer.completed)}
              >
                <Ionicons name={iconName} size={26} color={iconColor} />
                <Text style={[
                  styles.prayerName,
                  prayer.completed && styles.prayerNameCompleted,
                  prayer.status === 'missed' && !prayer.completed && styles.prayerNameMissed,
                  prayer.status === 'pending' && styles.prayerNamePending,
                ]}>
                  {prayer.name}
                </Text>
                <Text style={[
                  styles.prayerNameAr,
                  prayer.completed && styles.prayerNameArCompleted,
                ]}>
                  {prayer.nameAr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Leaderboard Button */}
        <TouchableOpacity 
          style={styles.leaderboardButton}
          onPress={() => navigation.navigate('SalatLeaderboard')}
        >
          <Ionicons name="trophy" size={18} color="#FFD700" />
          <Text style={styles.leaderboardButtonText}>Community Leaderboard</Text>
          <Ionicons name="chevron-forward" size={18} color="#D4A84B" />
        </TouchableOpacity>
      </View>

      {/* Qibla Compass Card */}
      <TouchableOpacity
        style={styles.qiblaCard}
        onPress={() => navigation.navigate('QiblaCompass')}
        activeOpacity={0.8}
      >
        <View style={styles.qiblaCardLeft}>
          <Text style={styles.qiblaCardEmoji}>🕋</Text>
          <View style={styles.qiblaCardText}>
            <Text style={styles.qiblaCardTitle}>Qibla Compass</Text>
            <Text style={styles.qiblaCardSubtitle}>Find the direction of the Kaaba</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Nearby Mosques Card */}
      <TouchableOpacity
        style={styles.mosqueCard}
        onPress={() => navigation.navigate('NearbyMosques')}
        activeOpacity={0.8}
      >
        <View style={styles.mosqueCardLeft}>
          <Text style={styles.mosqueCardEmoji}>🕌</Text>
          <View style={styles.mosqueCardText}>
            <Text style={styles.mosqueCardTitle}>Nearby Mosques</Text>
            <Text style={styles.mosqueCardSubtitle}>Find mosques around you</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Zakat Calculator Card */}
      <TouchableOpacity
        style={styles.zakatCard}
        onPress={() => navigation.navigate('ZakatCalculator')}
        activeOpacity={0.8}
      >
        <View style={styles.zakatCardLeft}>
          <Text style={styles.zakatCardEmoji}>💰</Text>
          <View style={styles.zakatCardText}>
            <Text style={styles.zakatCardTitle}>Zakat Calculator</Text>
            <Text style={styles.zakatCardSubtitle}>Calculate nisab & donate to verified foundations</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Dua & Adhkar Card */}
      <TouchableOpacity
        style={styles.duaCard}
        onPress={() => navigation.navigate('DuaCategory')}
        activeOpacity={0.8}
      >
        <View style={styles.duaCardLeft}>
          <Text style={styles.duaCardEmoji}>🤲</Text>
          <View style={styles.duaCardText}>
            <Text style={styles.duaCardTitle}>Dua & Adhkar</Text>
            <Text style={styles.duaCardSubtitle}>Daily supplications & remembrances</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Islamic Lectures Card */}
      <TouchableOpacity
        style={styles.lecturesCard}
        onPress={() => navigation.navigate('LectureSpeakers')}
        activeOpacity={0.8}
      >
        <View style={styles.lecturesCardLeft}>
          <Text style={styles.lecturesCardEmoji}>🎙️</Text>
          <View style={styles.lecturesCardText}>
            <Text style={styles.lecturesCardTitle}>Islamic Lectures</Text>
            <Text style={styles.lecturesCardSubtitle}>900+ lectures from top scholars</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Musafir (Traveller) Card */}
      <TouchableOpacity
        style={styles.musafirCard}
        onPress={() => navigation.navigate('MusafirStatus')}
        activeOpacity={0.8}
      >
        <View style={styles.musafirCardLeft}>
          <Text style={styles.musafirCardEmoji}>🕌</Text>
          <View style={styles.musafirCardText}>
            <Text style={styles.musafirCardTitle}>Musafir</Text>
            <Text style={styles.musafirCardSubtitle}>Traveller Qasr prayer status</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
      </TouchableOpacity>

      {/* Upcoming Islamic Events Card */}
      {calendarLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#D4A84B" />
          <Text style={styles.loadingText}>Loading Islamic calendar...</Text>
        </View>
      ) : upcomingEvents.length > 0 && (
        <View style={styles.eventsCard}>
          <View style={styles.eventsHeader}>
            <Ionicons name="calendar" size={20} color="#D4A84B" />
            <Text style={styles.eventsTitle}>Upcoming Events</Text>
          </View>
          
          {upcomingEvents.map((event, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.eventItem, index === upcomingEvents.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('HijriCalendar')}
            >
              <View style={[styles.eventBadge, { backgroundColor: IslamicCalendarService.getEventColor(event.type) }]}>
                <Text style={styles.eventEmoji}>{event.emoji}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventDate}>{event.hijriDate}</Text>
              </View>
              <View style={styles.eventDays}>
                <Text style={styles.eventDaysNumber}>{event.daysUntil}</Text>
                <Text style={styles.eventDaysLabel}>{event.daysUntil === 1 ? 'day' : 'days'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <Text style={styles.eventsTip}>Tap an event to learn more</Text>
        </View>
      )}

      {/* Share App Button */}
      <TouchableOpacity
        style={styles.shareAppCard}
        onPress={() => IslamicCalendarService.shareApp()}
        activeOpacity={0.8}
      >
        <View style={styles.shareAppContent}>
          <Ionicons name="heart" size={24} color="#E91E63" />
          <View style={styles.shareAppTextWrap}>
            <Text style={styles.shareAppTitle}>Share Musafir</Text>
            <Text style={styles.shareAppSubtitle}>Invite friends & earn rewards</Text>
          </View>
        </View>
        <Ionicons name="share-social" size={22} color="#D4A84B" />
      </TouchableOpacity>
    </ScrollView>
    
    {/* AI Chat ILM Orb FAB */}
    <TouchableOpacity
      style={styles.aiFab}
      onPress={() => navigation.navigate('AIChat')}
      activeOpacity={0.85}
    >
      {/* Outer glow ring */}
      <Animated.View style={[styles.fabGlowRing, { opacity: orbGlow, transform: [{ scale: orbPulse }] }]} />
      {/* Rotating accent ring */}
      <Animated.View style={[styles.fabRotateRing, { transform: [{ rotate: orbRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
      {/* Core orb */}
      <Animated.View style={[styles.fabCore, { transform: [{ scale: orbPulse }] }]}>
        <Text style={styles.fabIlmText}>عِلْم</Text>
      </Animated.View>
    </TouchableOpacity>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
  },
  aiFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  fabGlowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#D4A84B',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  fabRotateRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: '#D4A84B',
    borderRightColor: 'rgba(212,168,75,0.3)',
  },
  fabCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 12,
  },
  fabIlmText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121212',
    textAlign: 'center',
  },
  hijriContainer: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: -20,
    marginTop: -20,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4A84B',
  },
  hijriDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hijriDateAr: {
    fontSize: 22,
    color: '#D4A84B',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hijriDate: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  hijriDay: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  hijriTapHint: {
    fontSize: 10,
    color: '#5A5A5A',
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Ramadan Sehri/Iftar Banner (below calendar)
  ramadanHomeBanner: {
    backgroundColor: 'rgba(126,87,194,0.12)',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(126,87,194,0.3)',
  },
  ramadanHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ramadanHomeEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  ramadanHomeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#CE93D8',
  },
  ramadanHomeTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ramadanHomeTimeBox: {
    alignItems: 'center',
    flex: 1,
  },
  ramadanHomeTimeLabel: {
    fontSize: 11,
    color: '#B3B3B3',
    marginTop: 4,
  },
  ramadanHomeTimeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 3,
  },
  ramadanHomeDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(126,87,194,0.3)',
  },
  ramadanHomeLocation: {
    fontSize: 10,
    color: '#808080',
    textAlign: 'center',
    marginTop: 8,
  },
  ramadanTapHint: {
    fontSize: 10,
    color: 'rgba(206,147,216,0.5)',
    textAlign: 'center',
    marginTop: 6,
  },
  // Fasting Countdown
  countdownContainer: {
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  countdownDividerTop: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(126,87,194,0.25)',
    marginBottom: 6,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CE93D8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  countdownDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  countdownDigitBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(126,87,194,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
  },
  countdownDigit: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    fontSize: 9,
    color: '#B3B3B3',
    marginTop: 1,
  },
  countdownColon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CE93D8',
    marginHorizontal: 2,
  },
  countdownStatus: {
    fontSize: 11,
    color: '#B3B3B3',
    textAlign: 'center',
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4A84B',
    marginTop: 20,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#B3B3B3',
    marginBottom: 20,
  },
  // Today's Special Event Banner
  todayEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  todayEventEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  todayEventInfo: {
    flex: 1,
  },
  todayEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  todayEventNameAr: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  // Daily Quote Card
  quoteCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#D4A84B',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteLabel: {
    fontSize: 12,
    color: '#D4A84B',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  quoteText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteRef: {
    fontSize: 12,
    color: '#808080',
    marginTop: 8,
    textAlign: 'right',
  },
  // Prayer Waqt Timer Card
  timerCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4A84B',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timerLabel: {
    fontSize: 12,
    color: '#D4A84B',
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timerPrayerInfo: {
    flex: 1,
  },
  timerPrayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerPrayerNameAr: {
    fontSize: 18,
    color: '#B3B3B3',
    marginTop: 2,
  },
  timerDisplay: {
    alignItems: 'flex-end',
  },
  timerText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#D4A84B',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  timerSubtext: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
  },
  timerProgressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerProgressFill: {
    height: 4,
    backgroundColor: '#D4A84B',
    borderRadius: 2,
  },
  timerCardNext: {
    borderColor: '#333333',
    shadowColor: '#000',
  },
  timerLabelNext: {
    color: '#B3B3B3',
  },
  timerTextNext: {
    color: '#FFFFFF',
  },
  // Loading card
  loadingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#B3B3B3',
    fontSize: 14,
  },
  // ─── Forbidden Times Styles ──────────────────────────
  forbiddenCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  forbiddenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forbiddenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F44336',
  },
  forbiddenMadhab: {
    fontSize: 12,
    color: '#D4A84B',
    backgroundColor: 'rgba(212,168,75,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '600',
    overflow: 'hidden',
  },
  forbiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  forbiddenBannerHaram: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  forbiddenBannerMakruh: {
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
  },
  forbiddenBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  forbiddenBannerText: {
    flex: 1,
  },
  forbiddenBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F44336',
    marginBottom: 2,
  },
  forbiddenBannerDesc: {
    fontSize: 12,
    color: '#E0E0E0',
    lineHeight: 16,
  },
  forbiddenBannerTime: {
    fontSize: 13,
    color: '#FF8A80',
    fontWeight: '700',
    marginTop: 4,
  },
  forbiddenSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B3B3B3',
    marginBottom: 8,
  },
  forbiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  forbiddenRowActive: {
    backgroundColor: 'rgba(244,67,54,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.25)',
  },
  forbiddenRowActiveMakruh: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.2)',
  },
  forbiddenRowPast: {
    opacity: 0.45,
  },
  forbiddenRowIcon: {
    fontSize: 20,
    marginRight: 10,
    width: 28,
    textAlign: 'center',
  },
  forbiddenRowInfo: {
    flex: 1,
  },
  forbiddenRowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forbiddenRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forbiddenRowNameAr: {
    fontSize: 14,
    color: '#D4A84B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  forbiddenRowTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  forbiddenRowTextPast: {
    color: '#666',
  },
  forbiddenStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  forbiddenStatusActive: {
    backgroundColor: 'rgba(244,67,54,0.25)',
  },
  forbiddenStatusActiveMakruh: {
    backgroundColor: 'rgba(255,152,0,0.2)',
  },
  forbiddenStatusPast: {
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  forbiddenStatusUpcoming: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  forbiddenStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E0E0E0',
  },
  forbiddenReference: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  salatCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  salatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  salatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  salatStats: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4A84B',
  },
  prayerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prayerItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#252525',
    minWidth: 60,
    borderWidth: 1,
    borderColor: '#333333',
  },
  prayerUpcoming: {
    backgroundColor: '#252525',
    borderColor: '#333333',
  },
  prayerCompleted: {
    backgroundColor: '#2E4A2E',
    borderColor: '#4CAF50',
  },
  prayerMissed: {
    backgroundColor: '#4A2E2E',
    borderColor: '#CF6679',
  },
  prayerPending: {
    backgroundColor: '#4A432E',
    borderColor: '#FFB74D',
  },
  prayerName: {
    fontSize: 11,
    color: '#B3B3B3',
    marginTop: 4,
    fontWeight: '600',
  },
  prayerNameCompleted: {
    color: '#4CAF50',
  },
  prayerNameMissed: {
    color: '#CF6679',
  },
  prayerNamePending: {
    color: '#FFB74D',
  },
  prayerNameAr: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  prayerNameArCompleted: {
    color: '#81C784',
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D4A84B',
  },
  leaderboardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A84B',
    marginHorizontal: 8,
  },
  // Islamic Events Card
  eventsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  eventBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  eventEmoji: {
    fontSize: 22,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventDate: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  eventDays: {
    alignItems: 'center',
    minWidth: 55,
    backgroundColor: '#252525',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  eventDaysNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4A84B',
  },
  eventDaysLabel: {
    fontSize: 10,
    color: '#808080',
    marginTop: -2,
  },
  eventsTip: {
    fontSize: 11,
    color: '#5A5A5A',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  hadithTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  refreshHadith: {
    padding: 4,
  },
  hadithContent: {
    paddingTop: 4,
  },
  hadithText: {
    fontSize: 14,
    color: '#B3B3B3',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  hadithNarrator: {
    fontSize: 12,
    color: '#808080',
    marginTop: 10,
    fontWeight: '500',
  },
  hadithReference: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  hadithEmpty: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 15,
  },
  // Qibla Compass Card
  qiblaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  qiblaCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qiblaCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  qiblaCardText: {
    flex: 1,
  },
  qiblaCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  qiblaCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  // Nearby Mosques Card
  mosqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mosqueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mosqueCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  mosqueCardText: {
    flex: 1,
  },
  mosqueCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  mosqueCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  // Zakat Calculator Card
  zakatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  zakatCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  zakatCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  zakatCardText: {
    flex: 1,
  },
  zakatCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  zakatCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  duaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  duaCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  duaCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  duaCardText: {
    flex: 1,
  },
  duaCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  duaCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  // Islamic Lectures Card
  lecturesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lecturesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lecturesCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  lecturesCardText: {
    flex: 1,
  },
  lecturesCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  lecturesCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  // Musafir (Traveller) Card
  musafirCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  musafirCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  musafirCardEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  musafirCardText: {
    flex: 1,
  },
  musafirCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  musafirCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  // Share icon button (used in quote/hadith cards)
  shareIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // Hadith of the Day Card
  hadithCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#81C784',
  },
  hadithHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hadithLabel: {
    fontSize: 12,
    color: '#81C784',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  hadithBodyText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 23,
  },
  hadithNarratorText: {
    fontSize: 12,
    color: '#81C784',
    marginTop: 10,
    fontWeight: '500',
  },
  hadithRefText: {
    fontSize: 11,
    color: '#808080',
    marginTop: 3,
  },
  // Share App Card
  shareAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    marginBottom: 80,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  shareAppContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shareAppTextWrap: {
    marginLeft: 14,
  },
  shareAppTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareAppSubtitle: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
});
