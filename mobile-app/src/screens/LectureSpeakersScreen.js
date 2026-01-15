/**
 * LectureSpeakersScreen.js
 * ─────────────────────────────────────────
 * Speakers >> Lectures >> Play
 * Entry point: grid of speakers sorted by lecture count.
 * Includes search bar, recently played shortcut, and favorites badge.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Platform, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LectureService from '../services/LectureService';

// Speaker avatar colours (deterministic by index)
const AVATAR_COLORS = [
  '#D4A84B', '#E74C3C', '#3498DB', '#27AE60',
  '#9B59B6', '#E67E22', '#1ABC9C', '#C0392B',
  '#2980B9', '#F39C12',
];

export default function LectureSpeakersScreen({ navigation }) {
  const [speakers, setSpeakers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentCount, setRecentCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const data = LectureService.getSpeakers();
    const meta = LectureService.getMetadata();
    setSpeakers(data);
    setMetadata(meta);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const recent = await LectureService.getRecentLectures();
        setRecentCount(recent.length);
        const fc = await LectureService.getFavoriteCount();
        setFavCount(fc);
      })();
    }, [])
  );

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const results = LectureService.searchLectures(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const renderSpeaker = ({ item, index }) => {
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <TouchableOpacity
        style={styles.speakerCard}
        onPress={() => navigation.navigate('LectureList', {
          speakerId: item.id,
          speakerName: item.name,
          speakerBio: item.bio,
          lectureCount: item.lectureCount,
        })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: color + '25', borderColor: color }]}>
          <Text style={[styles.avatarText, { color }]}>{item.initial}</Text>
        </View>
        <View style={styles.speakerInfo}>
          <Text style={styles.speakerName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.speakerMeta}>{item.lectureCount} lectures • {item.categories.length} topics</Text>
          <View style={styles.categoryChips}>
            {item.categories.slice(0, 3).map((cat, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{cat}</Text>
              </View>
            ))}
            {item.categories.length > 3 && (
              <Text style={styles.moreChip}>+{item.categories.length - 3}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#555" />
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => navigation.navigate('LecturePlayer', { lectureId: item.id })}
      activeOpacity={0.7}
    >
      <Ionicons name="musical-notes-outline" size={20} color="#D4A84B" />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.searchResultMeta}>{item.speaker} • {item.category} • {item.duration}</Text>
      </View>
      <Ionicons name="play-circle-outline" size={22} color="#D4A84B" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A84B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#D4A84B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🎙️ Islamic Lectures</Text>
          <Text style={styles.headerSubtitle}>
            {metadata?.totalLectures || 0} lectures • {metadata?.totalSpeakers || 0} speakers
          </Text>
        </View>
        {favCount > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('LectureList', {
              speakerId: '__favorites__',
              speakerName: 'Favorites',
              speakerBio: 'Your saved lectures',
              lectureCount: favCount,
            })}
            style={styles.favBtn}
          >
            <Ionicons name="heart" size={20} color="#E74C3C" />
            <View style={styles.favBadge}>
              <Text style={styles.favBadgeText}>{favCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#808080" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search lectures, speakers, topics..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {searchQuery.trim().length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={40} color="#444" />
              <Text style={styles.emptyText}>No lectures match "{searchQuery}"</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={speakers}
          keyExtractor={item => item.id}
          renderItem={renderSpeaker}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Recently Played */}
              {recentCount > 0 && (
                <TouchableOpacity
                  style={styles.recentCard}
                  onPress={() => navigation.navigate('LectureList', {
                    speakerId: '__recent__',
                    speakerName: 'Recently Played',
                    speakerBio: 'Continue where you left off',
                    lectureCount: recentCount,
                  })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={22} color="#3498DB" />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle}>Recently Played</Text>
                    <Text style={styles.recentSubtitle}>{recentCount} lectures</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#3498DB" />
                </TouchableOpacity>
              )}

              {/* Section Header */}
              <Text style={styles.sectionTitle}>Speakers</Text>
            </>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Data sourced from Internet Archive{'\n'}
                Scraped {metadata?.scrapedAt ? new Date(metadata.scrapedAt).toLocaleDateString() : 'offline'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  // ─── Header ──────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(212,168,75,0.3)',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#B3B3B3', marginTop: 1 },
  favBtn: { position: 'relative', padding: 6 },
  favBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#E74C3C', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  favBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // ─── Search ──────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // ─── List ────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4A84B',
    marginTop: 16,
    marginBottom: 10,
  },

  // ─── Speaker Card ────────
  speakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  speakerInfo: { flex: 1 },
  speakerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  speakerMeta: { fontSize: 12, color: '#B3B3B3', marginBottom: 4 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    backgroundColor: 'rgba(212,168,75,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { fontSize: 10, color: '#D4A84B', fontWeight: '500' },
  moreChip: { fontSize: 10, color: '#888', alignSelf: 'center', marginLeft: 2 },

  // ─── Recent ──────────────
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,152,219,0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(52,152,219,0.2)',
    gap: 10,
  },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#3498DB' },
  recentSubtitle: { fontSize: 11, color: '#888' },

  // ─── Search Results ──────
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  searchResultInfo: { flex: 1 },
  searchResultTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  searchResultMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  emptySearch: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#777', fontSize: 13 },

  // ─── Footer ──────────────
  footer: { alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  footerText: { fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 16 },
});
