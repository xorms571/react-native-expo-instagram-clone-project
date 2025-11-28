import { supabase } from '@/utils/supabase';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match!');
        return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
        Alert.alert('Error', error.message);
    } else {
        Alert.alert('Success', 'Please check your email for a confirmation link.');
        router.replace('/login')
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Account</Text>
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
      <TextInput
        style={styles.input}
        onChangeText={setConfirmPassword}
        value={confirmPassword}
        secureTextEntry
        placeholder="Confirm Password"
        placeholderTextColor="#8e8e8e"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        onChangeText={setUsername}
        value={username}
        placeholder="Username"
        placeholderTextColor="#8e8e8e"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={signUpWithEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/login">
            <Text style={styles.linkText}> Log in.</Text>
        </Link>
      </View>
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
    fontFamily: 'Cochin',
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
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
  },
  footerText: {
      color: '#8e8e8e',
  },
  linkText: {
      color: '#3797f0',
      fontWeight: 'bold',
  }
});
