import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

type LikeWithProfile = {
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  } | null;
  is_following: boolean;
};

const UserListItem = ({ item }: { item: LikeWithProfile }) => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [isFollowing, setIsFollowing] = useState(item.is_following);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const handleFollowToggle = async () => {
    if (!user || isTogglingFollow || user.id === item.user_id) return;

    setIsTogglingFollow(true);
    const currentFollowingStatus = isFollowing;
    setIsFollowing(!currentFollowingStatus);
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
      <View>
        <Link style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }} href={`/profile/${item.user_id}` as any}>
          <Image
            source={{ uri: item.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${item.user_id}` }}
            style={styles.avatar}
          />
          <ThemedText style={{ flex: 1 }}>{item.profiles?.username || 'Unknown'}</ThemedText>
        </Link>
      </View>

      {user && user.id !== item.user_id && (
        <TouchableOpacity onPress={handleFollowToggle} style={[styles.followButton, isFollowing && styles.disabledButton, colorScheme === 'dark' ? isFollowing ? { backgroundColor: '#dbdbdb36' } : { backgroundColor: '#3797f073' } : null]} disabled={isTogglingFollow}>
          <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
};


export default function LikesScreen() {
  const { post_id } = useLocalSearchParams<{ post_id: string }>();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!post_id || !user) return;

    const fetchLikesAndFollowing = async () => {
      setLoading(true);

      // Fetch users who liked the post
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select(`user_id, profiles (username, avatar_url)`)
        .eq('post_id', post_id);

      if (likesError) {
        console.error('Error fetching likes:', likesError);
        setLoading(false);
        return;
      }

      // Fetch the list of users the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) {
        console.error('Error fetching following list:', followingError);
      }

      const followingSet = new Set(followingData?.map(f => f.following_id) || []);

      // Format the data and add the is_following flag
      const formattedLikes = (likesData as any[]).map((item: any) => ({
        user_id: item.user_id,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        is_following: followingSet.has(item.user_id),
      }));

      setLikes(formattedLikes);
      setLoading(false);
    };

    fetchLikesAndFollowing();
  }, [post_id, user]);


  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <ThemedText type='title' style={styles.title}>Likes</ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={likes}
        renderItem={({ item }) => <UserListItem item={item} />}
        keyExtractor={(item) => item.user_id}
        ListEmptyComponent={<ThemedText style={styles.center}>No likes yet.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  darkHeader: {
    backgroundColor: '#1c1c1c',
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
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
