import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { searchVerses } from '../services/quranService';

/**
 * VerseSearchScreen - Semantic verse search results
 * Shows AI-powered search results with context
 */
export default function VerseSearchScreen({ route, navigation }) {
  const { query } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    performSearch();
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await searchVerses(query);

      if (response.success) {
        setResults(response.results);
        setMetadata(response.metadata);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      console.error('Verse search error:', err);
      setError('Failed to search verses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const VerseItem = ({ item }) => {
    const [showTafseer, setShowTafseer] = useState(false);

    return (
      <View style={styles.verseCard}>
        {/* Verse Reference */}
        <View style={styles.verseHeader}>
          <Text style={styles.verseReference}>
            {item.surahName || `Surah ${item.surah}`} • Ayah {item.ayah}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {Math.round((item.score || 0) * 100)}%
            </Text>
          </View>
        </View>

        {/* Arabic Text */}
        {item.arabic && <Text style={styles.arabicText}>{item.arabic}</Text>}

        {/* English Translation */}
        {item.english && <Text style={styles.englishText}>{item.english}</Text>}

        {/* Tafseer Section (Collapsible) */}
        {item.tafseer && (
          <View style={styles.tafseerContainer}>
            <TouchableOpacity
              style={styles.tafseerToggle}
              onPress={() => setShowTafseer(!showTafseer)}
            >
              <Text style={styles.tafseerToggleText}>
                {showTafseer ? 'Hide Tafseer ▴' : 'Show Tafseer ▾'}
              </Text>
            </TouchableOpacity>

            {showTafseer && (
              <View style={styles.tafseerContent}>
                <Text style={styles.tafseerTitle}>Tafseer Tazkirul Quran:</Text>
                <Text style={styles.tafseerText}>{item.tafseer}</Text>
              </View>
            )}
          </View>
        )}

        {/* View in Context button */}
        <TouchableOpacity
          style={styles.contextButton}
          onPress={() => navigation.navigate('Surah', {
            surahNumber: item.surah,
            highlightAyah: item.ayah
          })}
        >
          <Text style={styles.contextButtonText}>
            View in Context →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D4A84B" />
        <Text style={styles.loadingText}>Searching verses...</Text>
        <Text style={styles.loadingSubtext}>Using AI to find relevant verses</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={performSearch}>
          <Text style={styles.retryButtonText}>Retry Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Search Results</Text>
          <Text style={styles.headerQuery}>"{query}"</Text>
        </View>
      </View>

      {/* Results Info */}
      {metadata && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsCount}>
            Found {results.length} verse{results.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.searchTime}>
            in {metadata.duration}ms • {metadata.model}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={({ item }) => <VerseItem item={item} />}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No verses found</Text>
            <Text style={styles.emptySubtext}>Try a different search query</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 30
  },
  header: {
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4A84B'
  },
  backIcon: {
    marginRight: 15,
    padding: 5
  },
  backIconText: {
    fontSize: 28,
    color: '#D4A84B',
    fontWeight: 'bold'
  },
  headerTextContainer: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerQuery: {
    fontSize: 14,
    color: '#E8C87A',
    marginTop: 3
  },
  resultsInfo: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  searchTime: {
    fontSize: 12,
    color: '#808080'
  },
  listContent: {
    padding: 15
  },
  verseCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  verseReference: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4A84B',
    flex: 1
  },
  scoreBadge: {
    backgroundColor: '#2A2A1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4A84B'
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4A84B'
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 40,
    textAlign: 'right',
    color: '#E8C87A',
    marginBottom: 12,
    fontWeight: '500'
  },
  englishText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 10
  },
  contextButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D4A84B'
  },
  contextButtonText: {
    fontSize: 13,
    color: '#D4A84B',
    fontWeight: '600'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 13,
    color: '#808080'
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#D4A84B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  retryButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600'
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12
  },
  backButtonText: {
    color: '#B3B3B3',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080'
  },
  tafseerContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 10
  },
  tafseerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5
  },
  tafseerToggleText: {
    fontSize: 14,
    color: '#D4A84B',
    fontWeight: '600'
  },
  tafseerContent: {
    marginTop: 10,
    backgroundColor: '#252525',
    padding: 10,
    borderRadius: 8
  },
  tafseerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B3B3B3',
    marginBottom: 5
  },
  tafseerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF'
  }
});
