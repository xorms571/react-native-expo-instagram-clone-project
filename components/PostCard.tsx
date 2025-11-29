import { Post } from '@/app/(tabs)/index';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const username = post.profiles?.username || 'unknown';
  const avatarUrl = post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`;

  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const handleLike = async () => {
    if (!user) return;

    const currentlyLiked = isLiked;
    const currentLikeCount = likeCount;

    // Optimistic update
    setIsLiked(!currentlyLiked);
    setLikeCount(currentLikeCount + (currentlyLiked ? -1 : 1));

    if (currentlyLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, post_id: post.id });

      if (error) {
        // Revert on error
        setIsLiked(currentlyLiked);
        setLikeCount(currentLikeCount);
        console.error('Error unliking post:', error);
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: post.id });

      if (error) {
        // Revert on error
        setIsLiked(currentlyLiked);
        setLikeCount(currentLikeCount);
        console.error('Error liking post:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
        />
        <ThemedText type="defaultSemiBold">{username}</ThemedText>
      </View>

      {/* Post Image */}
      <Link href={`/post/${post.id}` as any} asChild>
        <TouchableOpacity>
            <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        </TouchableOpacity>
      </Link>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity onPress={handleLike} style={styles.action}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? 'red' : 'black'} />
        </TouchableOpacity>
        <Link href={`/comments/${post.id}` as any} style={styles.action}>
            <Ionicons name="chatbubble-outline" size={26} color="black" />
        </Link>
        <View style={styles.action}>
            <Ionicons name="send-outline" size={26} color="black" />
        </View>
      </View>

      {/* Likes Count */}
      {likeCount > 0 && (
        <View style={styles.likesContainer}>
            <ThemedText type="defaultSemiBold">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</ThemedText>
        </View>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <ThemedText>
            <ThemedText type="defaultSemiBold">{username}</ThemedText>
            {' '}
            {post.caption}
        </ThemedText>
        <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1 / 1, // Square images like Instagram
  },
  actionBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  action: {
      marginRight: 12,
  },
  likesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  timestamp: {
      fontSize: 12,
      color: '#999',
      marginTop: 4,
  }
});

