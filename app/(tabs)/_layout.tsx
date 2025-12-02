import { Tabs, useRouter } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import HeaderIcons from '@/components/HeaderIcons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'Bigrootagram',
          headerRight: () => <HeaderIcons />,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="add-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'Bigrootagram',
          headerRight: () => <HeaderIcons />,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/[id]"
        options={{
          href: null,
          headerTitle: 'Bigrootagram',
          headerRight: () => <HeaderIcons />,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
          headerTitle: 'Bigrootagram',
          headerRight: () => <HeaderIcons />,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="post/[id]"
        options={({ route }) => ({
          headerTitle: 'Post',
          tabBarItemStyle: { display: 'none' },
          headerLeft: () => {
            const { authorId } = route.params as { authorId?: string };

            const handleBack = () => {
              if (authorId && user && authorId !== user.id) {
                router.replace(`/profile/${authorId}`);
              } else {
                router.replace('/profile');
              }
            };

            return (
              <TouchableOpacity onPress={handleBack} style={{ marginLeft: 15, padding: 5 }}>
                <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            );
          },
        })}
      />
    </Tabs>
  );
}
