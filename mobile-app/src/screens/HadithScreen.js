import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getCollections, getCollectionMetadata } from '../services/hadithService';

/**
 * HadithScreen - Main Hadith browsing and search screen
 * 
 * Features:
 * - Toggle between Browse Collections and Search Hadiths
 * - AI-powered semantic search across all collections
 * - Display all 6 collections (Sihah Sittah)
 * - Color-coded collection cards
 * - Offline-first
 */
export default function HadithScreen({ navigation }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('collection'); // 'collection' or 'hadith'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCollections();
      
      if (response.success) {
        // Enrich with metadata (colors, etc.)
        const enriched = response.data.map(col => ({
          ...col,
          ...getCollectionMetadata(col.id)
        }));
        setCollections(enriched);
      }
    } catch (err) {
      console.error('Error loading collections:', err);
      setError('Failed to load Hadith collections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionPress = (collection) => {
    navigation.navigate('HadithCollection', {
      collectionId: collection.id,
      collectionName: collection.name,
      collectionNameArabic: collection.nameArabic,
      collectionColor: collection.color
    });
  };

  const handleHadithSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('HadithSearchResults', { query: searchQuery.trim() });
    }
  };

  const renderCollection = ({ item }) => (
    <TouchableOpacity
      style={[styles.collectionCard, { borderLeftColor: item.color }]}
      onPress={() => handleCollectionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionName}>{item.name}</Text>
          <Text style={styles.collectionNameArabic}>{item.nameArabic}</Text>
        </View>
        
        <Text style={styles.compiler}>{item.compiler}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Text style={styles.statNumber}>{item.totalHadiths || 0}</Text>
            <Text style={styles.statLabel}>Hadiths Available</Text>
          </View>
        </View>
        
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyContainer}>
      <Icon name="search-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Search Hadiths by Meaning</Text>
      <Text style={styles.emptyText}>
        Ask questions or search by topic across all 6 collections.{'\n'}
        Example: "What did the Prophet say about patience?"
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D4A84B" />
        <Text style={styles.loadingText}>Loading Hadith Collections...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCollections}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>الصحاح الستة</Text>
          <Text style={styles.headerSubtitle}>Sihah Sittah - The Six Authentic Books</Text>
        </View>
      </View>

      {/* Search Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, searchMode === 'collection' && styles.toggleButtonActive]}
          onPress={() => setSearchMode('collection')}
        >
          <Text style={[styles.toggleText, searchMode === 'collection' && styles.toggleTextActive]}>
            Browse Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, searchMode === 'hadith' && styles.toggleButtonActive]}
          onPress={() => setSearchMode('hadith')}
        >
          <Text style={[styles.toggleText, searchMode === 'hadith' && styles.toggleTextActive]}>
            Search Hadiths
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchMode === 'collection' ? 'Filter collections...' : 'Ask a question or search by meaning...'}
          placeholderTextColor="#808080"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchMode === 'hadith' ? handleHadithSearch : undefined}
          returnKeyType={searchMode === 'hadith' ? 'search' : 'done'}
        />
        {searchMode === 'hadith' && searchQuery.trim() && (
          <TouchableOpacity onPress={handleHadithSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info box for hadith search mode */}
      {searchMode === 'hadith' && (
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color="#D4A84B" />
          <Text style={styles.infoText}>
            AI-powered search across all 6 collections
          </Text>
        </View>
      )}

      {/* Content based on mode */}
      {searchMode === 'collection' ? (
        <FlatList
          data={collections}
          renderItem={renderCollection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptySearch()
      )}
    </KeyboardAvoidingView>
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
  header: {
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4A84B'
  },
  headerContent: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4A84B',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B3B3B3',
    textAlign: 'center'
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  toggleButtonActive: {
    backgroundColor: '#D4A84B'
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080'
  },
  toggleTextActive: {
    color: '#121212'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0
  },
  searchButton: {
    backgroundColor: '#D4A84B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10
  },
  searchButtonText: {
    color: '#121212',
    fontWeight: '600',
    fontSize: 14
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#64B5F6'
  },
  infoText: {
    fontSize: 13,
    color: '#64B5F6',
    marginLeft: 8,
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#B3B3B3',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: 15,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 22
  },
  listContent: {
    padding: 15,
    paddingTop: 0
  },
  collectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  cardContent: {
    position: 'relative'
  },
  collectionHeader: {
    marginBottom: 10
  },
  collectionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5
  },
  collectionNameArabic: {
    fontSize: 18,
    color: '#B3B3B3',
    fontWeight: '600'
  },
  compiler: {
    fontSize: 14,
    color: '#808080',
    fontStyle: 'italic',
    marginBottom: 15
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  statBadge: {
    backgroundColor: '#252525',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 11,
    color: '#808080',
    textTransform: 'uppercase'
  },
  arrow: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -15
  },
  arrowText: {
    fontSize: 30,
    color: '#5A5A5A'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#B3B3B3'
  },
  errorText: {
    fontSize: 16,
    color: '#CF6679',
    textAlign: 'center',
    marginHorizontal: 30,
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#D4A84B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600'
  }
});
