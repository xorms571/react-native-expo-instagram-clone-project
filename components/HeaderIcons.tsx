import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function HeaderIcons() {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.icons}>
      <TouchableOpacity style={styles.action}>
        <Ionicons name="heart" size={28} color={colorScheme === 'dark' ? "gray" : "black"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.action}>
        <Ionicons name="send-outline" size={26} color={colorScheme === 'dark' ? "gray" : "black"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={28} color={colorScheme === 'dark' ? "gray" : "black"} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 28,
    marginRight: 12
  },
  icons: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
});
