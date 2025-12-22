import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export const AUDIO_BASE_URL = process.env.EXPO_PUBLIC_AUDIO_BASE_URL;

const AudioContext = createContext(null);

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}

export function AudioProvider({ children }) {
  // ── State ──────────────────────────────────────────────
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);   // audioKey e.g. "001005"
  const [playbackStatus, setPlaybackStatus] = useState('idle');      // 'idle' | 'playing' | 'paused'
  const [playbackMode, setPlaybackMode] = useState(null);            // 'single' | 'playall'

  // Metadata for the floating player
  const [surahInfo, setSurahInfo] = useState(null);  // { surahNumber, surahName, verses }
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null);

  const soundRef = useRef(null);
  const versesRef = useRef([]);        // keep verses accessible in callbacks
  const modeRef = useRef(null);        // avoid stale closure in onPlaybackStatusUpdate
  const isStoppingRef = useRef(false); // guard against concurrent stop/start

  // ── Internal helpers ───────────────────────────────────
  const makeKey = (verse) =>
    `${String(verse.surah).padStart(3, '0')}${String(verse.ayah).padStart(3, '0')}`;

  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) { /* already unloaded */ }
      soundRef.current = null;
    }
  };

  // ── Stop everything ────────────────────────────────────
  const hardStop = useCallback(async () => {
    isStoppingRef.current = true;
    await cleanupSound();
    setCurrentlyPlaying(null);
    setCurrentAyahNumber(null);
    setPlaybackStatus('idle');
    setPlaybackMode(null);
    modeRef.current = null;
    isStoppingRef.current = false;
  }, []);

  // ── Stream a single audio key ─────────────────────────
  const streamAudio = useCallback(async (audioKey) => {
    if (isStoppingRef.current) return;

    try {
      const audioUrl = `${AUDIO_BASE_URL}${audioKey}.mp3`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      if (isStoppingRef.current) {
        // User pressed stop while we were loading
        await sound.stopAsync();
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      setCurrentlyPlaying(audioKey);

      // Extract ayah number from key
      const ayahNum = parseInt(audioKey.slice(3), 10);
      setCurrentAyahNumber(ayahNum);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          onTrackFinished(audioKey);
        }
      });
    } catch (e) {
      console.log('Playback error:', e);
      if (!isStoppingRef.current) {
        hardStop();
      }
    }
  }, [hardStop]);

  // ── When a track finishes ─────────────────────────────
  const onTrackFinished = useCallback(async (finishedKey) => {
    if (isStoppingRef.current) return;

    if (modeRef.current === 'playall') {
      const verses = versesRef.current;
      const idx = verses.findIndex((v) => makeKey(v) === finishedKey);

      if (idx >= 0 && idx < verses.length - 1) {
        const nextKey = makeKey(verses[idx + 1]);
        await cleanupSound();
        streamAudio(nextKey);
      } else {
        // Reached end of surah
        hardStop();
      }
    } else {
      hardStop();
    }
  }, [hardStop, streamAudio]);

  // ── Public: load surah data (called when entering SurahScreen) ──
  const loadSurahAudio = useCallback((surahNumber, surahName, verses) => {
    versesRef.current = verses;
    setSurahInfo({ surahNumber, surahName });
  }, []);

  // ── Public: play a single verse ───────────────────────
  const playSingle = useCallback(async (audioKey) => {
    // Toggle off if same key tapped
    if (currentlyPlaying === audioKey && playbackMode === 'single') {
      await hardStop();
      return;
    }

    await cleanupSound();
    modeRef.current = 'single';
    setPlaybackMode('single');
    setPlaybackStatus('playing');
    await streamAudio(audioKey);
  }, [currentlyPlaying, playbackMode, hardStop, streamAudio]);

  // ── Public: play all from first verse ─────────────────
  const playAll = useCallback(async () => {
    const verses = versesRef.current;
    if (!verses || verses.length === 0) return;

    await cleanupSound();
    modeRef.current = 'playall';
    setPlaybackMode('playall');
    setPlaybackStatus('playing');
    const firstKey = makeKey(verses[0]);
    await streamAudio(firstKey);
  }, [streamAudio]);

  // ── Public: pause / resume ────────────────────────────
  const togglePause = useCallback(async () => {
    if (!soundRef.current) return;

    if (playbackStatus === 'playing') {
      await soundRef.current.pauseAsync();
      setPlaybackStatus('paused');
    } else if (playbackStatus === 'paused') {
      await soundRef.current.playAsync();
      setPlaybackStatus('playing');
    }
  }, [playbackStatus]);

  // ── Public: skip to next verse ─────────────────────────
  const skipNext = useCallback(async () => {
    if (!currentlyPlaying) return;
    const verses = versesRef.current;
    const idx = verses.findIndex((v) => makeKey(v) === currentlyPlaying);

    if (idx >= 0 && idx < verses.length - 1) {
      await cleanupSound();
      const nextKey = makeKey(verses[idx + 1]);
      await streamAudio(nextKey);
    }
  }, [currentlyPlaying, streamAudio]);

  // ── Context value ─────────────────────────────────────
  const value = {
    // State
    currentlyPlaying,
    playbackStatus,
    playbackMode,
    surahInfo,
    currentAyahNumber,

    // Actions
    loadSurahAudio,
    playSingle,
    playAll,
    togglePause,
    hardStop,
    skipNext,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}
