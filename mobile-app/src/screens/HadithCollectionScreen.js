import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform
} from 'react-native';
import { getCollectionHadith } from '../services/hadithService';
import { useSettings } from '../context/SettingsContext';

/**
 * HadithCollectionScreen - Browse hadith from a specific collection
 * 
 * Features:
 * - Paginated hadith list
 * - Arabic text with translation
 * - Proper narrator chain display
 * - Load more functionality
 * - Offline-first
 */
export default function HadithCollectionScreen({ route, navigation }) {
  const { collectionId, collectionName, collectionNameArabic, collectionColor } = route.params;
  const { settings } = useSettings();
  
  const [hadiths, setHadiths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    navigation.setOptions({
      title: collectionName,
      headerStyle: {
        backgroundColor: collectionColor
      }
    });
  }, []);

  useEffect(() => {
    loadHadiths();
  }, [page]);

  const loadHadiths = async () => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await getCollectionHadith(collectionId, page, 20);
      
      if (response.success) {
        if (page === 1) {
          setHadiths(response.data);
        } else {
          setHadiths(prev => [...prev, ...response.data]);
        }
        
        setTotalPages(response.totalPages);
        setHasMore(page < response.totalPages);
      }
    } catch (err) {
      console.error('Error loading hadiths:', err);
      setError('Failed to load hadiths. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const renderHadith = ({ item }) => (
    <View style={[styles.hadithCard, { borderLeftColor: collectionColor }]}>
      {/* Hadith Header */}
      <View style={styles.hadithHeader}>
        <View style={styles.hadithNumberBadge}>
          <Text style={styles.hadithNumberText}>#{item.hadithNumber}</Text>
        </View>
        
        {item.bookName && (
          <Text style={styles.bookInfo} numberOfLines={1}>
            {item.bookName}
          </Text>
        )}
      </View>

      {/* Narrator (if available) */}
      {item.metadata?.narrator && (
        <View style={styles.narratorContainer}>
          <Text style={styles.narratorLabel}>Narrator:</Text>
          <Text style={styles.narratorText}>{item.metadata.narrator}</Text>
        </View>
      )}

      {/* Arabic Text */}
      <View style={styles.arabicContainer}>
        <Text style={[styles.arabicText, { fontSize: settings.hadithArabicFontSize, lineHeight: Math.round(settings.hadithArabicFontSize * 1.8) }]}>{item.arabicText}</Text>
      </View>

      {/* English Translation */}
      {item.translationEn && (
        <View style={styles.translationContainer}>
          <Text style={[styles.translationText, { fontSize: settings.hadithEnglishFontSize, lineHeight: Math.round(settings.hadithEnglishFontSize * 1.6) }]}>{item.translationEn}</Text>
        </View>
      )}

      {/* Grade/Reference */}
      <View style={styles.metadataContainer}>
        {item.metadata?.grade && (
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{item.metadata.grade}</Text>
          </View>
        )}
        {item.metadata?.reference && (
          <Text style={styles.referenceText}>{item.metadata.reference}</Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={collectionColor} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={collectionColor} />
        <Text style={styles.loadingText}>Loading {collectionName}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: collectionColor }]} 
          onPress={() => {
            setPage(1);
            loadHadiths();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Collection Header */}
      <View style={[styles.collectionHeader, { backgroundColor: collectionColor }]}>
        <Text style={styles.collectionNameArabic}>{collectionNameArabic}</Text>
        <Text style={styles.collectionStats}>
          Page {page} of {totalPages}
        </Text>
      </View>

      {/* Hadith List */}
      <FlatList
        data={hadiths}
        renderItem={renderHadith}
        keyExtractor={(item) => `${item.collection}-${item.hadithNumber}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hadiths found</Text>
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
    backgroundColor: '#121212'
  },
  collectionHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#D4A84B'
  },
  collectionNameArabic: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5
  },
  collectionStats: {
    fontSize: 13,
    color: '#E8C87A',
    opacity: 0.9
  },
  listContent: {
    padding: 15
  },
  hadithCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#D4A84B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3
  },
  hadithHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  hadithNumberBadge: {
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D4A84B'
  },
  hadithNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4A84B'
  },
  bookInfo: {
    flex: 1,
    fontSize: 13,
    color: '#B3B3B3',
    fontStyle: 'italic'
  },
  narratorContainer: {
    backgroundColor: '#252525',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  narratorLabel: {
    fontSize: 11,
    color: '#808080',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  narratorText: {
    fontSize: 13,
    color: '#B3B3B3',
    lineHeight: 20
  },
  arabicContainer: {
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333'
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 40,
    color: '#E8C87A',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '500'
  },
  translationContainer: {
    marginBottom: 12
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'left'
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8
  },
  gradeBadge: {
    backgroundColor: '#2A2A1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D4A84B'
  },
  gradeText: {
    fontSize: 11,
    color: '#D4A84B',
    fontWeight: '600'
  },
  referenceText: {
    fontSize: 11,
    color: '#808080',
    flex: 1
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#B3B3B3'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#B3B3B3'
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginHorizontal: 30,
    marginBottom: 20
  },
  retryButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#808080'
  }
});
