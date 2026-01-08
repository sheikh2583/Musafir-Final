/**
 * CommunityScreen.js
 * ─────────────────────────────────────────
 * Central hub for community features:
 * - Search & befriend users
 * - Share thoughts (post messages)
 * - Community messages with Global / Friends tabs
 * - Community Leaderboard
 *
 * Replaces the inline social features that were on HomeScreen.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TABS = [
  { key: 'global', label: 'Global', icon: 'globe-outline' },
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
];

export default function CommunityScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState(currentUser);
  const [activeTab, setActiveTab] = useState('global');
  const [messages, setMessages] = useState([]);
  const [friendMessages, setFriendMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Leaderboard preview
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);

  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [activeTab])
  );

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMessages(), fetchLeaderboard(), fetchUserData()]);
    setLoading(false);
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUserData(response.data);
    } catch (e) {}
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      const all = response.data || [];
      setMessages(all);
      // Friends = from subscribed users only
      setFriendMessages(all.filter(m => m.isFromSubscription));
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/salat/leaderboard?type=weekly&limit=5');
      if (response.data?.success) {
        setLeaderboard(response.data.data.leaderboard || []);
        setMyRank(response.data.data.myRank);
      }
    } catch (error) {
      console.log('Leaderboard error:', error.message);
    }
  };

  const performSearch = async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setShowSearch(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please write a message');
      return;
    }
    setPostLoading(true);
    try {
      await api.post('/messages', { content: message });
      setMessage('');
      Keyboard.dismiss();
      await fetchMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to post message');
    } finally {
      setPostLoading(false);
    }
  };

  const handleDeleteMessage = (messageId) => {
    Alert.alert('Delete Message', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/messages/${messageId}`);
            await fetchMessages();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const displayMessages = activeTab === 'friends' ? friendMessages : messages;

  // ─── Render Helpers ────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Mini Leaderboard */}
      <TouchableOpacity
        style={styles.leaderboardCard}
        onPress={() => navigation.navigate('SalatLeaderboard')}
        activeOpacity={0.8}
      >
        <View style={styles.leaderboardHeader}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.leaderboardTitle}>Community Leaderboard</Text>
          <Ionicons name="chevron-forward" size={18} color="#D4A84B" />
        </View>
        {leaderboard.length > 0 ? (
          <View style={styles.leaderboardPreview}>
            {leaderboard.slice(0, 3).map((entry, idx) => (
              <View key={idx} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </Text>
                <Text style={styles.leaderboardName} numberOfLines={1}>{entry.name}</Text>
                <Text style={styles.leaderboardScore}>{entry.totalScore || entry.weeklyScore || 0}</Text>
              </View>
            ))}
            {myRank && myRank > 3 && (
              <Text style={styles.leaderboardMyRank}>Your rank: #{myRank}</Text>
            )}
          </View>
        ) : (
          <Text style={styles.leaderboardEmpty}>Befriend users to see the leaderboard</Text>
        )}
      </TouchableOpacity>

      {/* Tabs: Global / Friends */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? '#D4A84B' : '#808080'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Post Input */}
      <View style={styles.postSection}>
        <TextInput
          style={styles.postInput}
          placeholder="Share your thoughts..."
          placeholderTextColor="#808080"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.postBtn, (!message.trim() || postLoading) && styles.postBtnDisabled]}
          onPress={handlePostMessage}
          disabled={!message.trim() || postLoading}
          activeOpacity={0.7}
        >
          {postLoading ? (
            <ActivityIndicator size="small" color="#121212" />
          ) : (
            <Ionicons name="send" size={18} color="#121212" />
          )}
        </TouchableOpacity>
      </View>

      {/* Messages label */}
      <Text style={styles.sectionLabel}>
        {activeTab === 'friends' ? 'Friends\' Messages' : 'Global Messages'}
      </Text>
    </View>
  );

  const renderMessage = ({ item: msg }) => (
    <View style={styles.msgCard}>
      <View style={styles.msgHeader}>
        <TouchableOpacity
          onPress={() => {
            if (msg.user?._id && msg.user._id !== userData?._id) {
              navigation.navigate('UserProfile', { userId: msg.user._id });
            }
          }}
          disabled={!msg.user?._id || msg.user._id === userData?._id}
          activeOpacity={0.7}
        >
          <View style={styles.msgAvatarRow}>
            <View style={styles.msgAvatar}>
              <Text style={styles.msgAvatarText}>{msg.user?.name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <View>
              <Text style={[
                styles.msgName,
                msg.user?._id && msg.user._id !== userData?._id && styles.msgNameClickable,
              ]}>{msg.user?.name || 'Unknown'}</Text>
              <Text style={styles.msgTime}>{formatTime(msg.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {msg.user?._id === userData?._id && (
          <TouchableOpacity onPress={() => handleDeleteMessage(msg._id)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="#808080" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.msgContent}>{msg.content}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color="#333" />
      <Text style={styles.emptyText}>
        {activeTab === 'friends'
          ? 'No messages from friends yet.\nBefriend users to see their messages!'
          : 'No messages yet.\nBe the first to share your thoughts!'}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>المجتمع</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={22} color="#D4A84B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search Bar — fixed above list so keyboard persists */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#808080" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search & befriend users..."
              placeholderTextColor="#808080"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => performSearch(searchQuery)}
              returnKeyType="search"
              autoCapitalize="none"
              blurOnSubmit={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); Keyboard.dismiss(); }} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#808080" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <View style={styles.searchDropdown}>
              {searchResults.map((u) => (
                <TouchableOpacity
                  key={u._id}
                  style={styles.searchItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    Keyboard.dismiss();
                    navigation.navigate('UserProfile', { userId: u._id });
                  }}
                >
                  <View style={styles.searchAvatar}>
                    <Text style={styles.searchAvatarText}>{u.name?.[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{u.name}</Text>
                    <Text style={styles.searchEmail}>{u.email}</Text>
                  </View>
                  <Ionicons name="person-add-outline" size={18} color="#D4A84B" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D4A84B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#808080',
    marginTop: 2,
  },
  headerBtn: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Search
  searchSection: {
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 100,
    backgroundColor: '#121212',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  searchDropdown: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    gap: 12,
  },
  searchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
  },
  searchName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchEmail: {
    color: '#808080',
    fontSize: 12,
    marginTop: 1,
  },
  // Leaderboard
  leaderboardCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  leaderboardPreview: {
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaderboardRank: {
    fontSize: 18,
    width: 28,
  },
  leaderboardName: {
    flex: 1,
    color: '#B3B3B3',
    fontSize: 14,
  },
  leaderboardScore: {
    color: '#D4A84B',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardMyRank: {
    color: '#808080',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  leaderboardEmpty: {
    color: '#808080',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  tabActive: {
    borderColor: '#D4A84B',
    backgroundColor: 'rgba(212,168,75,0.08)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080',
  },
  tabTextActive: {
    color: '#D4A84B',
  },
  // Post
  postSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 20,
  },
  postInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  postBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // Message cards
  msgCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  msgAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '700',
  },
  msgName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  msgNameClickable: {
    color: '#D4A84B',
  },
  msgTime: {
    color: '#808080',
    fontSize: 11,
    marginTop: 1,
  },
  msgContent: {
    color: '#B3B3B3',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 42,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  emptyText: {
    color: '#808080',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
