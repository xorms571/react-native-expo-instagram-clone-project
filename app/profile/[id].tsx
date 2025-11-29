import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

export default function UserProfileScreen() {
    const { id: profileUserId } = useLocalSearchParams<{ id: string }>();
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
        } else {
            setProfile(data as ProfileData);
            setIsFollowing((data as ProfileData).is_following);
            setFollowerCount((data as ProfileData).follower_count);
        }
        setLoading(false);
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
            if (currentFollowingStatus) {
                // Unfollow
                const { error } = await supabase
                    .from('followers')
                    .delete()
                    .match({ follower_id: currentUser.id, following_id: profile.id });
                if (error) {
                    // Revert
                    setIsFollowing(currentFollowingStatus);
                    setFollowerCount(currentFollowerCount);
                    console.error('Error unfollowing user:', error);
                }
            } else {
                // Follow
                const { error } = await supabase
                    .from('followers')
                    .insert({ follower_id: currentUser.id, following_id: profile.id });
                if (error) {
                    // Revert
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
        <View style={styles.headerContainer}>
            <View style={styles.topRow}>
                <Image
                    source={{ uri: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}` }}
                    style={styles.avatar}
                />
                <View style={styles.statsContainer}>
                    <StatItem value={profile.post_count} label="Posts" />
                    <StatItem value={followerCount} label="Followers" />
                    <StatItem value={profile.following_count} label="Following" />
                </View>
            </View>
            <View style={styles.bioContainer}>
                <Text style={styles.username}>{profile.full_name || profile.username}</Text>
            </View>
            <View style={styles.buttonContainer}>
                {isOwnProfile ? (
                    <Link href="/profile/edit" asChild>
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </Link>
                ) : (
                    <TouchableOpacity
                        style={[styles.editButton, isFollowing && styles.followingButton, isTogglingFollow && styles.disabledButton]}
                        onPress={handleFollowToggle}
                        disabled={isTogglingFollow}
                    >
                        <Text style={[styles.editButtonText, isFollowing && styles.followingButtonText]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
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
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
      color: '#333',
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
      backgroundColor: '#3797f0'
  },
  editButtonText: {
      fontWeight: 'bold',
      color: 'white',
  },
  followingButton: {
      backgroundColor: 'white',
  },
  followingButtonText: {
      color: 'black',
  },
  disabledButton: {
      opacity: 0.5,
  },
  imageContainer: {
      padding: 1,
  },
});
