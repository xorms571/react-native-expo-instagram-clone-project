import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { StatItem } from './StatItem';

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
    is_following: boolean;
};

type ProfileViewProps = {
    profileUserId: string;
}

export default function ProfileView({ profileUserId }: ProfileViewProps) {
    const { user: currentUser } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            if (profileUserId && currentUser) {
                fetchProfileData();
                fetchUserPosts();
            }
        }, [profileUserId, currentUser])
    );

    async function fetchProfileData() {
        if (!profileUserId || !currentUser) return;
        setLoading(true);

        const { data, error } = await supabase
            .rpc('get_profile_data', { p_profile_id: profileUserId, p_current_user_id: currentUser.id })
            .single();

        if (error) {
            console.error('Error fetching profile data:', error);
            setLoading(false);
        } else if (data) {
            setProfile(data as ProfileData);
            setIsFollowing((data as ProfileData).is_following);
            setFollowerCount((data as ProfileData).follower_count);
            setLoading(false);
        }
    }

    async function fetchUserPosts() {
        if (!profileUserId) return;
        const { data, error } = await supabase
            .from('posts')
            .select('id, image_url')
            .eq('user_id', profileUserId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user posts:', error);
        } else {
            setPosts(data || []);
        }
    }

    const handleFollowToggle = async () => {
        if (!currentUser || !profile || isTogglingFollow) return;

        setIsTogglingFollow(true);
        const currentFollowingStatus = isFollowing;
        const currentFollowerCount = followerCount;

        // Optimistic update
        setIsFollowing(!currentFollowingStatus);
        setFollowerCount(currentFollowerCount + (currentFollowingStatus ? -1 : 1));

        try {
            if (currentFollowingStatus) { // Unfollow
                const { error } = await supabase
                    .from('followers')
                    .delete()
                    .match({ follower_id: currentUser.id, following_id: profile.id });
                if (error) { // Revert
                    setIsFollowing(currentFollowingStatus);
                    setFollowerCount(currentFollowerCount);
                    console.error('Error unfollowing user:', error);
                }
            } else { // Follow
                const { error } = await supabase
                    .from('followers')
                    .insert({ follower_id: currentUser.id, following_id: profile.id });
                if (error) { // Revert
                    setIsFollowing(currentFollowingStatus);
                    setFollowerCount(currentFollowerCount);
                    console.error('Error following user:', error);
                }
            }
        } finally {
            setIsTogglingFollow(false);
        }
    };


    if (loading || !profile) {
        return <ActivityIndicator style={styles.centered} />;
    }

    const isOwnProfile = currentUser?.id === profile.id;
    const numColumns = 3;
    const imageSize = Dimensions.get('window').width / numColumns;
  
    const renderHeader = () => (
        <ThemedView style={styles.headerContainer}>
            <ThemedView style={styles.topRow}>
                <Image
                    source={{ uri: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}` }}
                    style={styles.avatar}
                />
                <ThemedView style={styles.statsContainer}>
                    <StatItem value={profile.post_count} label="Posts" />
                    <Link href={{ pathname: '/users', params: { profileUserId: profile.id, mode: 'followers' } }} asChild>
                        <TouchableOpacity>
                            <StatItem value={followerCount} label="Followers" />
                        </TouchableOpacity>
                    </Link>
                    <Link href={{ pathname: '/users', params: { profileUserId: profile.id, mode: 'following' } }} asChild>
                        <TouchableOpacity>
                            <StatItem value={profile.following_count} label="Following" />
                        </TouchableOpacity>
                    </Link>
                </ThemedView>
            </ThemedView>
            <ThemedView style={styles.bioContainer}>
                <ThemedText style={styles.username}>{profile.full_name || profile.username}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.buttonContainer}>
                {isOwnProfile ? (
                    <Link href="/profile/edit" asChild>
                        <TouchableOpacity style={{...styles.profileButton, ...styles.editButton}}>
                            <ThemedText style={{...styles.profileButtonText, ...styles.editButtonText}}>Edit Profile</ThemedText>
                        </TouchableOpacity>
                    </Link>
                ) : (
                    <TouchableOpacity
                        style={[styles.profileButton, isFollowing ? styles.followingButton : styles.followButton, isTogglingFollow && styles.disabledButton]}
                        onPress={handleFollowToggle}
                        disabled={isTogglingFollow}
                    >
                        <ThemedText style={[styles.profileButtonText, isFollowing ? styles.followingButtonText : styles.followButtonText]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </ThemedText>
                    </TouchableOpacity>
                )}
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
                onRefresh={fetchProfileData}
                refreshing={loading}
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
  profileButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
  },
  profileButtonText: {
      fontWeight: 'bold',
  },
  editButton: {
      borderColor: '#dbdbdb',
      backgroundColor: '#eee',
  },
  editButtonText: {
      color: '#333'
  },
  followButton: {
      borderColor: '#3797f0',
      backgroundColor: '#3797f0',
  },
  followButtonText: {
      color: 'white',
  },
  followingButton: {
      borderColor: '#dbdbdb',
      backgroundColor: '#eee',
  },
  followingButtonText: {
      color: '#333'
  },
  disabledButton: {
      opacity: 0.5,
  },
  imageContainer: {
      padding: 1,
      backgroundColor: '#222'
  },
});
