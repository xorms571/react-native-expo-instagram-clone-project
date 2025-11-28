import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (user) getProfile();
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!user) throw new Error('No user on the session!');

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`username, full_name, website`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setWebsite(data.website || '');
      }
    } catch (error: any) {
      Alert.alert('Error fetching profile', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      if (!user) throw new Error('No user on the session!');

      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        website,
        updated_at: new Date(),
      };

      let { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error updating profile', error.message);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
      return <ActivityIndicator style={styles.centered}/>
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />
      <Text style={styles.label}>Website</Text>
      <TextInput
        style={styles.input}
        value={website}
        onChangeText={setWebsite}
        autoCapitalize="none"
      />
      <Button title="Update Profile" onPress={updateProfile} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    marginBottom: 20,
    fontSize: 16,
  },
});
