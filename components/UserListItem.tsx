import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export type UserListItemData = {
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  } | null;
  is_following: boolean;
};

// Reusable component for displaying a user in a list
export const UserListItem = ({ item }: { item: UserListItemData }) => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [isFollowing, setIsFollowing] = useState(item.is_following);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const handleFollowToggle = async () => {
    if (!user || isTogglingFollow || user.id === item.user_id) return;

    setIsTogglingFollow(true);
    const currentFollowingStatus = isFollowing;
    setIsFollowing(!currentFollowingStatus); // Optimistic update
    try {
      if (currentFollowingStatus) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .match({ follower_id: user.id, following_id: item.user_id });
        if (error) {
          setIsFollowing(currentFollowingStatus); // Revert on error
          console.error('Error unfollowing user:', error);
        }
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: item.user_id });
        if (error) {
          setIsFollowing(currentFollowingStatus); // Revert on error
          console.error('Error following user:', error);
        }
      }
    } finally {
      setIsTogglingFollow(false);
    }
  };

  return (
    <ThemedView style={styles.userContainer}>
      <Link href={`/profile/${item.user_id}`} asChild>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            <Image
              source={{ uri: item.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${item.user_id}` }}
              style={styles.avatar}
            />
            <ThemedText style={{ flex: 1 }} numberOfLines={1}>{item.profiles?.username || 'Unknown'}</ThemedText>
        </TouchableOpacity>
      </Link>

      {user && user.id !== item.user_id && (
        <TouchableOpacity onPress={handleFollowToggle} style={[styles.followButton, isFollowing && styles.disabledButton, colorScheme === 'dark' ? isFollowing ? { backgroundColor: '#dbdbdb36' } : { backgroundColor: '#3797f073' } : null]} disabled={isTogglingFollow}>
          <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    followButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#3797f0',
        borderRadius: 8,
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: '#dbdbdb',
    },
    followButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
