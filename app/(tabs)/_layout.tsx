import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: true,
          headerTitle: 'Bigrootagram',
          headerTitleStyle: {
            fontFamily: 'Cochin',
            fontSize: 24,
          },
          headerTitleAlign: 'center',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="add-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Bigrootagram',
          headerShown: true,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: 'Cochin',
            fontSize: 24,
          },
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person-circle-outline" color={color} />,
          headerRight: () => (
            <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ marginRight: 15 }}>
              <Ionicons name="log-out-outline" size={28} color={Colors[colorScheme ?? 'light'].text} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
