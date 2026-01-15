/**
 * LectureListScreen.js
 * ─────────────────────────────────────────
 * Lists lectures for a speaker (or Favorites / Recently Played).
 * Category filter chips, pagination, favorite toggles.
 * Tapping a lecture navigates to LecturePlayer.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LectureService from '../services/LectureService';

const PAGE_SIZE = 20;

export default function LectureListScreen({ route, navigation }) {
  const {
    speakerId,
    speakerName,
    speakerBio,
    lectureCount,
  } = route.params;

  const isSpecial = speakerId === '__favorites__' || speakerId === '__recent__';
  const isFavorites = speakerId === '__favorites__';
  const isRecent = speakerId === '__recent__';

  const [lectures, setLectures] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // ─── Load data ──────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      if (isFavorites) {
        data = await LectureService.getFavoriteLectures();
      } else if (isRecent) {
        data = await LectureService.getRecentLectures();
      } else {
        const result = LectureService.getLectures(speakerId, { page: 1, pageSize: PAGE_SIZE });
        data = result.lectures;
        setHasMore(result.hasMore);
        setPage(1);
      }
      setLectures(data);
      setFiltered(data);

      // Build category list
      const cats = [...new Set(data.map(l => l.category))].sort();
      setCategories(cats);

      // Load favorites set
      const favIds = await LectureService.getFavoriteIds();
      setFavorites(new Set(favIds));
    } catch (err) {
      console.error('Error loading lectures:', err);
    } finally {
      setLoading(false);
    }
  }, [speakerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ─── Pagination ─────────────────────
  const loadMore = () => {
    if (!hasMore || isSpecial) return;
    const nextPage = page + 1;
    const result = LectureService.getLectures(speakerId, {
      category: selectedCat,
      page: nextPage,
      pageSize: PAGE_SIZE,
    });
    setLectures(prev => [...prev, ...result.lectures]);
    setFiltered(prev => [...prev, ...result.lectures]);
    setHasMore(result.hasMore);
    setPage(nextPage);
  };

  // ─── Category Filter ───────────────
  const filterByCategory = (cat) => {
    if (cat === selectedCat) {
      setSelectedCat(null);
      if (isSpecial) {
        setFiltered(lectures);
      } else {
        const result = LectureService.getLectures(speakerId, { page: 1, pageSize: PAGE_SIZE });
        setFiltered(result.lectures);
        setHasMore(result.hasMore);
        setPage(1);
      }
    } else {
      setSelectedCat(cat);
      if (isSpecial) {
        setFiltered(lectures.filter(l => l.category === cat));
      } else {
        const result = LectureService.getLectures(speakerId, { category: cat, page: 1, pageSize: PAGE_SIZE });
        setFiltered(result.lectures);
        setHasMore(result.hasMore);
        setPage(1);
      }
    }
  };

  // ─── Favorite Toggle ───────────────
  const toggleFav = async (lectureId) => {
    const nowFav = await LectureService.toggleFavorite(lectureId);
    setFavorites(prev => {
      const next = new Set(prev);
      if (nowFav) next.add(lectureId);
      else next.delete(lectureId);
      return next;
    });
    // If on favorites screen, remove from list
    if (isFavorites && !nowFav) {
      setLectures(prev => prev.filter(l => l.id !== lectureId));
      setFiltered(prev => prev.filter(l => l.id !== lectureId));
    }
  };

  // ─── Render ─────────────────────────
  const renderLecture = ({ item, index }) => {
    const isFav = favorites.has(item.id);
    return (
      <TouchableOpacity
        style={styles.lectureCard}
        onPress={() => navigation.navigate('LecturePlayer', { lectureId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.lectureLeft}>
          <View style={styles.playBadge}>
            <Ionicons name="play" size={14} color="#D4A84B" />
          </View>
          <View style={styles.lectureInfo}>
            <Text style={styles.lectureTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.lectureMeta}>
              {!isSpecial && <Text style={styles.lectureCat}>{item.category}</Text>}
              {isSpecial && <Text style={styles.lectureSpeaker}>{item.speaker}</Text>}
              <Text style={styles.lectureDuration}>{item.duration}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => toggleFav(item.id)} style={styles.favBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#E74C3C' : '#555'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Speaker info */}
      {!isSpecial && speakerBio ? (
        <View style={styles.bioCard}>
          <Ionicons name="information-circle-outline" size={16} color="#D4A84B" />
          <Text style={styles.bioText}>{speakerBio}</Text>
        </View>
      ) : null}

      {/* Category filter chips */}
      {categories.length > 1 && (
        <View style={styles.chipRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCat === cat && styles.filterChipActive]}
              onPress={() => filterByCategory(cat)}
            >
              <Text style={[styles.filterChipText, selectedCat === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.countText}>
        {filtered.length}{hasMore ? '+' : ''} lecture{filtered.length !== 1 ? 's' : ''}
        {selectedCat ? ` in ${selectedCat}` : ''}
      </Text>
    </View>
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isFavorites ? '❤️' : isRecent ? '🕐' : '🎙️'} {speakerName}
          </Text>
          <Text style={styles.headerSubtitle}>{lectureCount} lectures</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderLecture}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={isFavorites ? 'heart-outline' : 'musical-notes-outline'} size={48} color="#444" />
            <Text style={styles.emptyTitle}>
              {isFavorites ? 'No Favorites Yet' : 'No Lectures Found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isFavorites ? 'Tap the ❤️ icon on a lecture to save it' : 'Try a different category'}
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#D4A84B" /> : null
        }
      />
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#B3B3B3', marginTop: 1 },

  // ─── List ────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  // ─── Bio ─────────────────
  bioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,168,75,0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.15)',
  },
  bioText: { fontSize: 12, color: '#D4A84B', flex: 1, lineHeight: 16 },

  // ─── Filter Chips ────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#D4A84B',
    borderColor: '#D4A84B',
  },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#B3B3B3' },
  filterChipTextActive: { color: '#121212' },
  countText: { fontSize: 12, color: '#808080', marginTop: 10, marginBottom: 8 },

  // ─── Lecture Card ────────
  lectureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  lectureLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212,168,75,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lectureInfo: { flex: 1 },
  lectureTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 18 },
  lectureMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  lectureCat: { fontSize: 11, color: '#D4A84B', fontWeight: '500' },
  lectureSpeaker: { fontSize: 11, color: '#3498DB', fontWeight: '500' },
  lectureDuration: { fontSize: 11, color: '#888' },
  favBtn: { padding: 6 },

  // ─── Empty ───────────────
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emptySubtext: { fontSize: 12, color: '#888', textAlign: 'center' },
});
