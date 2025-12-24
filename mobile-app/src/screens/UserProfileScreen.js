import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isOwnProfile = currentUser?._id === userId;

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setUserData(response.data);
      setIsSubscribed(response.data.isSubscribed || false);
    } catch (error) {
      console.error('Fetch user error:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        await api.delete(`/users/${userId}/subscribe`);
        setIsSubscribed(false);
        Alert.alert('Success', 'Unfriended successfully');
      } else {
        // Befriend
        await api.post(`/users/${userId}/subscribe`);
        setIsSubscribed(true);
        Alert.alert('Success', 'Befriended successfully');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update subscription');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A84B" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{userData?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.name}>{userData?.name || 'User'}</Text>
          <Text style={styles.email}>{userData?.email || ''}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.subscribeButton, 
            isSubscribed && !isOwnProfile && styles.unsubscribeButton,
            (subscribing || isOwnProfile) && styles.buttonDisabled
          ]} 
          onPress={handleSubscribe}
          disabled={subscribing || isOwnProfile}
        >
          {subscribing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isOwnProfile ? 'Unfriend' : (isSubscribed ? 'Unfriend' : 'Befriend')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.infoText}>
          {isOwnProfile
            ? "This is your profile"
            : (isSubscribed 
              ? "You'll see this user's messages in Community" 
              : "Befriend to see this user's messages in Community")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    fontSize: 16,
    color: '#808080',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarLetter: {
    color: '#121212',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#B3B3B3',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  subscribeButton: {
    backgroundColor: '#D4A84B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  unsubscribeButton: {
    backgroundColor: '#d32f2f',
  },
  buttonDisabled: {
    backgroundColor: '#808080',
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    textAlign: 'center',
    color: '#808080',
    fontSize: 12,
    marginTop: 12,
    paddingHorizontal: 10,
  },
});
