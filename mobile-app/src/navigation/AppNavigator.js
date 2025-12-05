import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import FloatingMiniPlayer from '../components/FloatingMiniPlayer';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import QuranScreen from '../screens/QuranScreen';
import SurahScreen from '../screens/SurahScreen';
import SurahQuizScreen from '../screens/SurahQuizScreen';
import VerseSearchScreen from '../screens/VerseSearchScreen';
import HadithScreen from '../screens/HadithScreen';
import HadithCollectionScreen from '../screens/HadithCollectionScreen';
import HadithSearchResultsScreen from '../screens/HadithSearchResultsScreen';
import ArabicWritingScreen from '../screens/ArabicWritingScreen';
import QuranQuizScreen from '../screens/QuranQuizScreen';
import SalatLeaderboardScreen from '../screens/SalatLeaderboardScreen';
import HijriCalendarScreen from '../screens/HijriCalendarScreen';
import AIChatScreen from '../screens/AIChatScreen';
import QuizModeScreen from '../screens/QuizModeScreen';
import AyahRangeScreen from '../screens/AyahRangeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QiblaCompassScreen from '../screens/QiblaCompassScreen';
import NearbyMosquesScreen from '../screens/NearbyMosquesScreen';
import ZakatScreen from '../screens/ZakatScreen';
import DuaCategoryScreen from '../screens/DuaCategoryScreen';
import DuaSubCategoryScreen from '../screens/DuaSubCategoryScreen';
import DuaDetailScreen from '../screens/DuaDetailScreen';
import DuaFavoritesScreen from '../screens/DuaFavoritesScreen';
import LectureSpeakersScreen from '../screens/LectureSpeakersScreen';
import LectureListScreen from '../screens/LectureListScreen';
import LecturePlayerScreen from '../screens/LecturePlayerScreen';
import MusafirScreen from '../screens/MusafirScreen';
import CommunityScreen from '../screens/CommunityScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'User Profile' }}
      />
      <Stack.Screen
        name="SalatLeaderboard"
        component={SalatLeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HijriCalendar"
        component={HijriCalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QiblaCompass"
        component={QiblaCompassScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NearbyMosques"
        component={NearbyMosquesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ZakatCalculator"
        component={ZakatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaCategory"
        component={DuaCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaSubCategory"
        component={DuaSubCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaDetail"
        component={DuaDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaFavorites"
        component={DuaFavoritesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LectureSpeakers"
        component={LectureSpeakersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LectureList"
        component={LectureListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LecturePlayer"
        component={LecturePlayerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MusafirStatus"
        component={MusafirScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function QuranStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="QuranList"
        component={QuranScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Surah"
        component={SurahScreen}
        options={{
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#D4A84B',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen
        name="SurahQuiz"
        component={SurahQuizScreen}
        options={({ route }) => ({
          title: `${route.params.surahName} Quiz`,
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#D4A84B',
          headerTitleStyle: { fontWeight: 'bold' }
        })}
      />
      <Stack.Screen
        name="QuizMode"
        component={QuizModeScreen}
        options={({ route }) => ({
          title: `${route.params.surahName} Quiz`,
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#D4A84B',
          headerTitleStyle: { fontWeight: 'bold' }
        })}
      />
      <Stack.Screen
        name="AyahRangeSelect"
        component={AyahRangeScreen}
        options={{
          title: 'Select Ayah Range',
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#D4A84B',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen
        name="VerseSearch"
        component={VerseSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArabicWriting"
        component={ArabicWritingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuranQuiz"
        component={QuranQuizScreen}
        options={{
          title: 'Quran Vocabulary Quiz',
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#D4A84B',
        }}
      />
    </Stack.Navigator>
  );
}

function HadithStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HadithList"
        component={HadithScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HadithCollection"
        component={HadithCollectionScreen}
        options={{
          headerStyle: { backgroundColor: '#1565C0' },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen
        name="HadithSearchResults"
        component={HadithSearchResultsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityMain"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'User Profile' }}
      />
      <Stack.Screen
        name="SalatLeaderboard"
        component={SalatLeaderboardScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <View style={navStyles.root}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Quran') {
              iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Hadith') {
              iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'Community') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#D4A84B',
          tabBarInactiveTintColor: '#808080',
          tabBarStyle: {
            backgroundColor: '#1E1E1E',
            borderTopColor: '#333333',
            borderTopWidth: 1,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Quran" component={QuranStack} />
        <Tab.Screen name="Hadith" component={HadithStack} />
        <Tab.Screen name="Community" component={CommunityStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
      <FloatingMiniPlayer />
    </View>
  );
}

const navStyles = StyleSheet.create({
  root: { flex: 1 },
});

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
