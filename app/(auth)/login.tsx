import { supabase } from '@/utils/supabase';
import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Please check your email for a confirmation link.');
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bigrootagram</Text>
      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        placeholder="Email"
        placeholderTextColor="#8e8e8e"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#8e8e8e"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={signInWithEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={signUpWithEmail} disabled={loading}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Cochin', // A more stylistic font
  },
  input: {
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3797f0',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpButton: {
    backgroundColor: '#4c68d7',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
