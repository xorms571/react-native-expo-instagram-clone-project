import { Post } from '@/app/(tabs)/index';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type PostCardProps = {
  post: Post;
  showComments?: boolean
};

export default function PostCard({ post, showComments = true }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const username = post.profiles?.username || 'unknown';
  const avatarUrl = post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`;

  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isFollowing, setIsFollowing] = useState(post.author_is_followed);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

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

  const handleFollowToggle = async () => {
    if (!user || isTogglingFollow) return;

    setIsTogglingFollow(true);
    const currentFollowingStatus = isFollowing;
    setIsFollowing(!currentFollowingStatus);

    try {
      if (currentFollowingStatus) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .match({ follower_id: user.id, following_id: post.user_id });
        if (error) {
          setIsFollowing(currentFollowingStatus);
          console.error('Error unfollowing user:', error);
        }
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: post.user_id });
        if (error) {
          setIsFollowing(currentFollowingStatus);
          console.error('Error following user:', error);
        }
      }
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleDeletePost = async () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel', onPress: () => setIsMenuVisible(false) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsMenuVisible(false);
          const imagePath = post.image_url.split('/').slice(-2).join('/');
          const { error: storageError } = await supabase.storage.from('posts').remove([imagePath]);
          if (storageError) {
            console.error('Error deleting image:', storageError);
          }

          const { error } = await supabase.from('posts').delete().eq('id', post.id);
          if (error) {
            Alert.alert('Error', 'Failed to delete post.');
          } else {
            Alert.alert('Success', 'Post deleted successfully.');
            if (router.canGoBack()) router.back();
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      {/* Post Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Link href={`/profile/${post.user_id}` as any} asChild>
            <TouchableOpacity style={styles.headerUser}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
              <ThemedText type="defaultSemiBold">{username}</ThemedText>
            </TouchableOpacity>
          </Link>
          {user?.id !== post.user_id &&
            <TouchableOpacity onPress={handleFollowToggle} style={[styles.followButton, isFollowing && styles.disabledButton, colorScheme === 'dark' ? isFollowing ? { backgroundColor: '#dbdbdb36' } : { backgroundColor: '#3797f073' } : null]} disabled={isTogglingFollow}>
              <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>}
        </ThemedView>
        <TouchableOpacity onPress={() => setIsMenuVisible(!isMenuVisible)}>
          <Ionicons name="ellipsis-vertical" size={20} color="grey" />
        </TouchableOpacity>
      </ThemedView>

      {isMenuVisible && (
        <ThemedView style={[styles.menuContainer, colorScheme === 'dark' && { backgroundColor: '#222' }]}>
          {user?.id === post.user_id &&
            <>
              <Link href={`/post/edit/${post.id}` as any} asChild>
                <TouchableOpacity style={styles.menuButton}>
                  <Text style={[styles.menuButtonText, colorScheme === 'dark' && { color: 'white' }]}>Edit</Text>
                </TouchableOpacity>
              </Link>
              <TouchableOpacity style={styles.menuButton} onPress={handleDeletePost}>
                <Text style={[styles.menuButtonText, { color: 'red' }]}>Delete</Text>
              </TouchableOpacity>
            </>
          }

        </ThemedView>
      )}

      {/* Post Image */}
      <Link href={`/post/${post.id}` as any} asChild>
        <TouchableOpacity>
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        </TouchableOpacity>
      </Link>

      {/* Action Bar */}
      <ThemedView style={styles.actionBar}>
        <TouchableOpacity onPress={handleLike} style={styles.action}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color='red' />
        </TouchableOpacity>
        {showComments && <Link href={`/comments/${post.id}` as any} style={styles.action}>
          <Ionicons name="chatbubble-outline" size={26} color={colorScheme === 'dark' ? "gray" : "black"} />
        </Link>}
        <ThemedView style={styles.action}>
          <Ionicons name="send-outline" size={26} color={colorScheme === 'dark' ? "gray" : "black"} />
        </ThemedView>
      </ThemedView>

      {/* Likes Count */}
      {likeCount > 0 && (
        <ThemedView style={styles.likesContainer}>
          <ThemedText type="defaultSemiBold">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</ThemedText>
        </ThemedView>
      )}

      {/* Caption */}
      <ThemedView style={styles.captionContainer}>
        <ThemedText>
          <ThemedText type="defaultSemiBold">{username}</ThemedText>
          {' '}
          {post.caption}
        </ThemedText>
        {showComments && post.comment_count > 0 && (
          <Link href={`/comments/${post.id}` as any} style={styles.commentsLink}>
            <Text style={styles.commentsLinkText}>View all {post.comment_count} comments</Text>
          </Link>
        )}
        <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleDateString()}</Text>
      </ThemedView>
    </ThemedView>
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
    justifyContent: 'space-between',
    padding: 12,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3797f0',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#dbdbdb',
  },
  followButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1 / 1,
    backgroundColor: '#222'
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
  commentsLink: {
    marginTop: 4,
  },
  commentsLinkText: {
    color: '#999',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  menuContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  menuButton: {
    paddingVertical: 5,
    paddingHorizontal: 8
  },
  menuButtonText: {
    fontSize: 13,
  },
});
