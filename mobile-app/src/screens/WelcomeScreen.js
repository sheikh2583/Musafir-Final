import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🕌</Text>
        <Text style={styles.title}>Welcome to Musafir</Text>
        <Text style={styles.subtitle}>Your Islamic Companion</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    fontSize: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4A84B',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#B3B3B3',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  primaryButton: {
    backgroundColor: '#D4A84B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4A84B',
  },
  secondaryButtonText: {
    color: '#D4A84B',
    fontSize: 16,
    fontWeight: '600',
  },
});
