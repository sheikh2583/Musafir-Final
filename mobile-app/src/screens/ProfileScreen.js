import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SalatService from '../services/SalatService';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(user);
  const [salatStreak, setSalatStreak] = useState(0);
  const [todayStats, setTodayStats] = useState({ completed: 0, total: 5, percentage: 0 });

  useEffect(() => {
    setUserData(user);
    loadSalatData();
  }, [user]);

  const loadSalatData = async () => {
    const streak = await SalatService.getStreak();
    setSalatStreak(streak);
    
    const stats = await SalatService.getTodayStats();
    setTodayStats(stats);
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUserData(response.data);
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await loadSalatData();
    setRefreshing(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data including messages will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me/delete');
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      console.error('Delete account error:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.name}>{userData?.name || 'User'}</Text>
          <Text style={styles.email}>{userData?.email || ''}</Text>
        </View>

        {/* Salat Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Ionicons name="flame" size={28} color="#FF5722" />
            <Text style={styles.streakTitle}>Salat Streak</Text>
          </View>
          
          <View style={styles.streakContent}>
            <View style={styles.streakMain}>
              <Text style={styles.streakNumber}>{salatStreak}</Text>
              <Text style={styles.streakLabel}>{salatStreak === 1 ? 'Day' : 'Days'}</Text>
            </View>
            
            <View style={styles.streakDivider} />
            
            <View style={styles.todayStats}>
              <Text style={styles.todayTitle}>Today</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${todayStats.percentage}%` }]} />
                </View>
                <Text style={styles.progressText}>{todayStats.completed}/5</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.streakTip}>
            {salatStreak === 0 
              ? '🌟 Complete all 5 prayers today to start your streak!'
              : salatStreak < 7 
                ? '💪 Keep going! Consistency builds strong habits.'
                : salatStreak < 30
                  ? '🔥 Amazing progress! You\'re on fire!'
                  : '🏆 MashaAllah! You\'re a true champion!'}
          </Text>
        </View>

        {/* Settings Card */}
        <TouchableOpacity
          style={styles.settingsCard}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsCardLeft}>
            <Ionicons name="settings-outline" size={24} color="#D4A84B" />
            <View style={styles.settingsCardText}>
              <Text style={styles.settingsCardTitle}>Settings</Text>
              <Text style={styles.settingsCardSubtitle}>Font sizes, reading preferences</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D4A84B" />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deleteButton, deleting && styles.buttonDisabled]} 
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Delete Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.warningText}>
          Deleting your account will remove all your data permanently.
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
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D4A84B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
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
  streakCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333333',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  streakMain: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#D4A84B',
  },
  streakLabel: {
    fontSize: 14,
    color: '#B3B3B3',
    marginTop: -5,
  },
  streakDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#333333',
    marginHorizontal: 15,
  },
  todayStats: {
    flex: 1,
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4A84B',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 5,
  },
  streakTip: {
    fontSize: 13,
    color: '#808080',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  settingsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsCardText: {
    marginLeft: 14,
    flex: 1,
  },
  settingsCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  settingsCardSubtitle: {
    fontSize: 12,
    color: '#808080',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  logoutButton: {
    backgroundColor: '#CF6679',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#8B0000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#404040',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    textAlign: 'center',
    color: '#808080',
    fontSize: 11,
    marginTop: 12,
    paddingHorizontal: 10,
  },
});
