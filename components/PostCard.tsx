import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';

type Post = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user_id: string;
  // In a real app, you'd fetch user details
  // user: { avatar_url: string; username: string };
};

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  // Placeholder for user details
  const username = post.user_id.substring(0, 8);

  return (
    <View style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: `https://i.pravatar.cc/150?u=${post.user_id}` }} // Placeholder avatar
          style={styles.avatar}
        />
        <ThemedText type="defaultSemiBold">{username}</ThemedText>
      </View>

      {/* Post Image */}
      <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.action}>
            <Ionicons name="heart-outline" size={28} color="black" />
        </View>
        <View style={styles.action}>
            <Ionicons name="chatbubble-outline" size={26} color="black" />
        </View>
        <View style={styles.action}>
            <Ionicons name="send-outline" size={26} color="black" />
        </View>
      </View>

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
