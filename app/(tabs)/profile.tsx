import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

type Post = {
  id: string;
  image_url: string;
};

type ProfileData = {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    website: string;
    post_count: number;
    follower_count: number;
    following_count: number;
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statItem}>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
);

export default function ProfileScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
        if (user) {
            fetchProfileData();
            fetchUserPosts();
        }
    }, [user])
  );

  async function fetchProfileData() {
      if(!user) return;
      const { data, error } = await supabase.rpc('get_profile_data', { p_profile_id: user.id, p_current_user_id: user.id }).single();
      if (error) {
          console.error('Error fetching profile', error);
      } else {
          setProfile(data as ProfileData);
      }
  }

  async function fetchUserPosts() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id, image_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  if (loading || !profile) {
    return <ActivityIndicator style={styles.centered} />;
  }

  const numColumns = 3;
  const imageSize = Dimensions.get('window').width / numColumns;
  
  const renderHeader = () => (
    <ThemedView style={styles.headerContainer}>
        <ThemedView style={styles.topRow}>
            <Image
                source={{ uri: profile.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}` }}
                style={styles.avatar}
            />
            <ThemedView style={styles.statsContainer}>
                <StatItem value={profile.post_count} label="Posts" />
                <StatItem value={profile.follower_count} label="Followers" />
                <StatItem value={profile.following_count} label="Following" />
            </ThemedView>
        </ThemedView>
        <ThemedView style={styles.bioContainer}>
            <ThemedText style={styles.username}>{profile?.full_name || profile?.username || 'User'}</ThemedText>
            {/* Bio text could go here */}
        </ThemedView>
        <ThemedView style={styles.buttonContainer}>
            <Link href="/profile/edit" asChild>
                <TouchableOpacity style={styles.editButton}>
                    <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                </TouchableOpacity>
            </Link>
        </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
        <FlatList
            data={posts}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <Link href={`/post/${item.id}` as any} asChild>
                    <TouchableOpacity style={styles.imageContainer}>
                        <Image
                            source={{ uri: item.image_url }}
                            style={{ width: imageSize - 2, height: imageSize - 2 }}
                        />
                    </TouchableOpacity>
                </Link>
            )}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
        />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
      padding: 15,
  },
  topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
  },
  statsContainer: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-around',
  },
  statItem: {
      alignItems: 'center',
  },
  statValue: {
      fontSize: 18,
      fontWeight: 'bold',
  },
  statLabel: {
      fontSize: 14,
  },
  bioContainer: {
      marginTop: 10,
  },
  username: {
      fontWeight: 'bold',
      fontSize: 16,
  },
  buttonContainer: {
      flexDirection: 'row',
      marginTop: 20,
  },
  editButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#dbdbdb',
      backgroundColor: '#eee'
  },
  editButtonText: {
      fontWeight: 'bold',
      color: '#333'
  },
  imageContainer: {
      padding: 1,
      backgroundColor: '#222'
  },
});
