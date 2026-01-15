/**
 * LecturePlayerScreen.js
 * ─────────────────────────────────────────
 * Full-screen audio player for an Islamic lecture.
 * Uses expo-av (Audio.Sound) for streaming from remote MP3 URL.
 * Features: play/pause, seek, skip 15s, speed control, favorites, share.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, ActivityIndicator, Share, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import LectureService from '../services/LectureService';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function LecturePlayerScreen({ route, navigation }) {
  const { lectureId } = route.params;

  const [lecture, setLecture] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x
  const [error, setError] = useState(null);

  const soundRef = useRef(null);

  // ─── Load Lecture Data ──────────────
  useEffect(() => {
    const lec = LectureService.getLecture(lectureId);
    if (lec) {
      setLecture(lec);
      LectureService.addToRecent(lectureId);
      LectureService.isFavorite(lectureId).then(setIsFav);
    }
  }, [lectureId]);

  // ─── Audio Setup ────────────────────
  useEffect(() => {
    if (!lecture) return;

    let isMounted = true;

    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: lecture.mp3Url },
          { shouldPlay: false, progressUpdateIntervalMillis: 500 },
          onPlaybackStatusUpdate,
        );

        if (isMounted) {
          soundRef.current = newSound;
          setSound(newSound);
          setIsLoading(false);
        } else {
          await newSound.unloadAsync();
        }
      } catch (err) {
        console.error('Audio load error:', err);
        if (isMounted) {
          setError('Failed to load audio. The file may be unavailable.');
          setIsLoading(false);
        }
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [lecture]);

  // ─── Playback Status Callback ──────
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) {
      if (status.error) setError(status.error);
      return;
    }
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  // ─── Controls ───────────────────────
  const togglePlay = async () => {
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.error('Play/pause error:', err);
    }
  };

  const seekRelative = async (ms) => {
    if (!soundRef.current) return;
    try {
      const newPos = Math.max(0, Math.min(position + ms, duration));
      await soundRef.current.setPositionAsync(newPos);
    } catch {}
  };

  const seekTo = async (fraction) => {
    if (!soundRef.current || !duration) return;
    try {
      await soundRef.current.setPositionAsync(Math.floor(fraction * duration));
    } catch {}
  };

  const cycleSpeed = async () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(SPEEDS[next], true);
      } catch {}
    }
  };

  const toggleFav = async () => {
    const nowFav = await LectureService.toggleFavorite(lectureId);
    setIsFav(nowFav);
  };

  const shareLecture = async () => {
    if (!lecture) return;
    try {
      await Share.share({
        message: `🎙️ ${lecture.title}\n👤 ${lecture.speaker}\n📂 ${lecture.category}\n🔗 ${lecture.mp3Url}\n\nShared via Musafir App`,
      });
    } catch {}
  };

  // ─── Cleanup on navigate away ──────
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause when leaving screen (don't unload — that's in useEffect cleanup)
        if (soundRef.current) {
          soundRef.current.pauseAsync().catch(() => {});
        }
      };
    }, [])
  );

  // ─── Helpers ────────────────────────
  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!lecture) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>Lecture not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={28} color="#D4A84B" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Now Playing</Text>
        <TouchableOpacity onPress={shareLecture} style={styles.topBtn}>
          <Ionicons name="share-outline" size={22} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Album Art / Speaker Visual */}
      <View style={styles.artContainer}>
        <View style={[styles.artCircle, isPlaying && styles.artCirclePlaying]}>
          <Text style={styles.artEmoji}>🎙️</Text>
        </View>
      </View>

      {/* Lecture Info */}
      <View style={styles.infoSection}>
        <Text style={styles.lectureTitle} numberOfLines={3}>{lecture.title}</Text>
        <Text style={styles.lectureSpeaker}>{lecture.speaker}</Text>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{lecture.category}</Text>
          </View>
          <Text style={styles.sourceText}>
            {lecture.source === 'internet_archive' ? 'Internet Archive' : 'Muslim Central'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <TouchableOpacity
          style={styles.progressTrack}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            const trackWidth = Dimensions.get('window').width - 48;
            seekTo(x / trackWidth);
          }}
          activeOpacity={0.9}
        >
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Error Overlay */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#E74C3C" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Speed */}
        <TouchableOpacity onPress={cycleSpeed} style={styles.secondaryBtn}>
          <Text style={styles.speedText}>{SPEEDS[speedIdx]}x</Text>
        </TouchableOpacity>

        {/* Rewind 15s */}
        <TouchableOpacity onPress={() => seekRelative(-15000)} style={styles.seekBtn}>
          <Ionicons name="play-back" size={28} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15</Text>
        </TouchableOpacity>

        {/* Play / Pause */}
        {isLoading || isBuffering ? (
          <View style={styles.playBtn}>
            <ActivityIndicator size="large" color="#121212" />
          </View>
        ) : (
          <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#121212" />
          </TouchableOpacity>
        )}

        {/* Forward 15s */}
        <TouchableOpacity onPress={() => seekRelative(15000)} style={styles.seekBtn}>
          <Ionicons name="play-forward" size={28} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15</Text>
        </TouchableOpacity>

        {/* Favorite */}
        <TouchableOpacity onPress={toggleFav} style={styles.secondaryBtn}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={24} color={isFav ? '#E74C3C' : '#999'} />
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomText}>
          Streaming from remote source • No file downloaded
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },

  // ─── Top Bar ─────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBtn: { padding: 6 },
  topTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },

  // ─── Art ─────────────────
  artContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  artCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#333',
  },
  artCirclePlaying: {
    borderColor: '#D4A84B',
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  artEmoji: { fontSize: 60 },

  // ─── Info ────────────────
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 24,
  },
  lectureTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 6,
  },
  lectureSpeaker: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4A84B',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(212,168,75,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: { fontSize: 11, color: '#D4A84B', fontWeight: '600' },
  sourceText: { fontSize: 11, color: '#666' },

  // ─── Progress ────────────
  progressSection: {
    paddingHorizontal: 30,
    marginBottom: 24,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'visible',
    justifyContent: 'center',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#D4A84B',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4A84B',
    top: -4,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: { fontSize: 12, color: '#888', fontVariant: ['tabular-nums'] },

  // ─── Error ───────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 30,
    marginBottom: 12,
  },
  errorBannerText: { fontSize: 12, color: '#E74C3C', flex: 1 },

  // ─── Controls ────────────
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4A84B',
    borderWidth: 1,
    borderColor: '#D4A84B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  seekBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekLabel: {
    fontSize: 9,
    color: '#888',
    position: 'absolute',
    bottom: 2,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D4A84B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Bottom ──────────────
  bottomInfo: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomText: { fontSize: 11, color: '#555', textAlign: 'center' },

  // ─── Error Screen ────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  backButton: {
    backgroundColor: '#D4A84B',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  backButtonText: { fontSize: 14, fontWeight: '700', color: '#121212' },
});
