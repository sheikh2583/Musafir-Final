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
import { searchHadiths } from '../services/hadithService';

/**
 * HadithSearchResultsScreen - Semantic hadith search results
 * Shows AI-powered search results from all 6 collections
 */
export default function HadithSearchResultsScreen({ route, navigation }) {
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
      
      const response = await searchHadiths(query);
      
      if (response.success) {
        setResults(response.results);
        setMetadata(response.metadata);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      console.error('Hadith search error:', err);
      setError('Failed to search hadiths. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getCollectionColor = (collectionId) => {
    const colors = {
      bukhari: '#2E7D32',
      muslim: '#1565C0',
      abudawud: '#6A1B9A',
      tirmidhi: '#D84315',
      nasai: '#00838F',
      ibnmajah: '#F57C00'
    };
    return colors[collectionId] || '#666';
  };

  const getCollectionName = (collectionId) => {
    const names = {
      bukhari: 'Sahih Bukhari',
      muslim: 'Sahih Muslim',
      abudawud: 'Sunan Abu Dawud',
      tirmidhi: 'Jami At-Tirmidhi',
      nasai: "Sunan An-Nasa'i",
      ibnmajah: 'Sunan Ibn Majah'
    };
    return names[collectionId] || collectionId;
  };

  const renderHadithItem = ({ item }) => (
    <View style={styles.hadithCard}>
      {/* Hadith Reference */}
      <View style={styles.hadithHeader}>
        <View style={styles.collectionBadge}>
          <View style={[styles.collectionDot, { backgroundColor: getCollectionColor(item.collection) }]} />
          <Text style={styles.collectionText}>
            {item.collectionName || getCollectionName(item.collection)}
          </Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>
            {item.relevance || Math.round((item.score || 0) * 100)}%
          </Text>
        </View>
      </View>

      {/* Chapter Info */}
      {item.chapterTitle && (
        <Text style={styles.chapterText}>
          📖 {item.chapterTitle}
        </Text>
      )}

      {/* Arabic Text */}
      {item.arabicText && <Text style={styles.arabicText}>{item.arabicText}</Text>}

      {/* English Translation */}
      {item.translationEn && <Text style={styles.englishText}>{item.translationEn}</Text>}

      {/* Narrator Info */}
      {item.metadata?.narrator && (
        <View style={styles.narratorBox}>
          <Text style={styles.narratorLabel}>Narrated by:</Text>
          <Text style={styles.narratorText}>{item.metadata.narrator}</Text>
        </View>
      )}

      {/* Reference Number */}
      <View style={styles.referenceBox}>
        <Text style={styles.referenceText}>
          {item.metadata?.reference || `${getCollectionName(item.collection)} ${item.hadithNumber || item.id}`}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Searching hadiths...</Text>
        <Text style={styles.loadingSubtext}>Using AI across all 6 collections</Text>
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
          <Text style={styles.headerTitle}>Hadith Search Results</Text>
          <Text style={styles.headerQuery}>"{query}"</Text>
        </View>
      </View>

      {/* Results Info */}
      {metadata && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsCount}>
            Found {results.length} hadith{results.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.searchTime}>
            in {metadata.duration}ms • {metadata.model}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={renderHadithItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No hadiths found</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333'
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3
  },
  searchTime: {
    fontSize: 12,
    color: '#808080'
  },
  listContent: {
    padding: 15
  },
  hadithCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3
  },
  hadithHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  collectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  collectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  collectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
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
    fontWeight: '700',
    color: '#D4A84B'
  },
  chapterText: {
    fontSize: 13,
    color: '#B3B3B3',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18
  },
  arabicText: {
    fontSize: 20,
    lineHeight: 36,
    color: '#E8C87A',
    textAlign: 'right',
    fontWeight: '500',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    borderRadius: 8
  },
  englishText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 12
  },
  narratorBox: {
    backgroundColor: '#252525',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  narratorLabel: {
    fontSize: 11,
    color: '#808080',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 3
  },
  narratorText: {
    fontSize: 13,
    color: '#B3B3B3',
    fontStyle: 'italic'
  },
  referenceBox: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 10,
    marginTop: 5
  },
  referenceText: {
    fontSize: 12,
    color: '#808080',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#808080'
  },
  errorIcon: {
    fontSize: 48,
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
    color: '#D4A84B',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080'
  }
});
