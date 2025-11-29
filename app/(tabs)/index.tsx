import PostCard from '@/components/PostCard'; // Import the new component
import { supabase } from '@/utils/supabase';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Button, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

export type Post = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user_id: string;
  profiles: {
      username: string;
      avatar_url: string;
  } | null;
  like_count: number;
  user_has_liked: boolean;
  author_is_followed: boolean;
  comment_count: number;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
        fetchPosts();
    }, [])
  );

  async function fetchPosts() {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setError("User not found.");
        setLoading(false);
        return
    }

    const { data, error } = await supabase
      .rpc('get_posts_with_likes', { p_user_id: user.id })

    if (error) {
      console.error('Error fetching posts:', error);
      setError(error.message);
    } else {
      setPosts(data as any);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !posts.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={fetchPosts} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No posts yet. Be the first to share!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // A light grey background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
  },
});