import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudio } from '../context/AudioContext';

export default function FloatingMiniPlayer() {
  const {
    currentlyPlaying,
    playbackStatus,
    surahInfo,
    currentAyahNumber,
    togglePause,
    hardStop,
    skipNext,
  } = useAudio();

  const isVisible =
    currentlyPlaying &&
    (playbackStatus === 'playing' || playbackStatus === 'paused');

  if (!isVisible) return null;

  const surahName = surahInfo?.surahName || 'Surah';
  const ayah = currentAyahNumber || '—';

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Track info */}
        <View style={styles.infoSection}>
          <Text style={styles.surahName} numberOfLines={1}>
            {surahName}
          </Text>
          <Text style={styles.ayahText}>Ayah {ayah}</Text>
        </View>

        {/* Centered controls */}
        <View style={styles.controls}>
          {/* Pause / Play */}
          <TouchableOpacity onPress={togglePause} style={styles.playPauseButton}>
            <Text style={styles.playPauseIcon}>
              {playbackStatus === 'playing' ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Next verse */}
          <TouchableOpacity onPress={skipNext} style={styles.controlButton}>
            <Text style={styles.controlIcon}>⏭</Text>
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity onPress={hardStop} style={styles.controlButton}>
            <Text style={[styles.controlIcon, styles.stopIcon]}>⏹</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    // Shadow – iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    // Shadow – Android
    elevation: 16,
  },
  infoSection: {
    flex: 1,
    marginRight: 10,
  },
  surahName: {
    color: '#D4A84B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ayahText: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#D4A84B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    // glow
    shadowColor: '#D4A84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  playPauseIcon: {
    fontSize: 20,
    color: '#121212',
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  controlIcon: {
    fontSize: 16,
    color: '#D4A84B',
  },
  stopIcon: {
    color: '#CF6679',
  },
});
