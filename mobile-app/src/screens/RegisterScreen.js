import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      const result = await register(name, email, password, phoneNumber);
      if (result.success) {
        Alert.alert('Success', 'Account created successfully!');
      } else {
        const errorMessage = result.error?.message || result.error?.errors?.[0]?.msg || 'Something went wrong';
        Alert.alert('Registration Failed', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join our Islamic community</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#808080"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor="#808080"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#808080"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters) *"
          placeholderTextColor="#808080"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Login here</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4A84B',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B3B3B3',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#D4A84B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#D4A84B',
    textAlign: 'center',
    marginTop: 20,
  },
});
