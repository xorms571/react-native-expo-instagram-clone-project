import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { StatItem } from './StatItem';
import { UserListSheet } from './UserListSheet';
import { UserListItemData } from './UserListItem';

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

type SheetMode = 'followers' | 'following';

export default function ProfileView({ profileUserId }: ProfileViewProps) {
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);

    // --- State for UserListSheet ---
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const [sheetMode, setSheetMode] = useState<SheetMode>('followers');
    const [sheetData, setSheetData] = useState<UserListItemData[]>([]);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    // --------------------------------

    const { posts, loading: loadingPosts, onRefresh: onRefreshPosts } = usePosts(profileUserId);

    useFocusEffect(
        React.useCallback(() => {
            if (profileUserId && currentUser) {
                fetchProfileData();
            }
        }, [profileUserId, currentUser])
    );

    // --- Fetch logic for UserListSheet ---
    const fetchSheetData = useCallback(async (mode: SheetMode) => {
        if (!profileUserId || !currentUser) return;

        setIsSheetLoading(true);

        let query;
        switch (mode) {
            case 'followers':
                query = supabase
                    .from('followers')
                    .select('profiles!inner!follower_id(id, username, avatar_url)')
                    .eq('following_id', profileUserId);
                break;
            case 'following':
                query = supabase
                    .from('followers')
                    .select('profiles!inner!following_id(id, username, avatar_url)')
                    .eq('follower_id', profileUserId);
                break;
        }

        const { data, error } = await query;
        if (error) {
            console.error(`Error fetching ${mode}:`, error);
            setSheetData([]);
        } else if (data) {
            const { data: followingData } = await supabase
                .from('followers')
                .select('following_id')
                .eq('follower_id', currentUser.id);

            const followingSet = new Set(followingData?.map(f => f.following_id) || []);

            const formattedData: UserListItemData[] = data.map((item: any) => ({
                user_id: item.profiles.id,
                profiles: item.profiles,
                is_following: followingSet.has(item.profiles.id),
            }));
            setSheetData(formattedData);
        }

        setIsSheetLoading(false);
    }, [profileUserId, currentUser]);


    const openUserList = (mode: SheetMode) => {
        setSheetMode(mode);
        setIsSheetVisible(true);
        fetchSheetData(mode);
    };

    const closeUserList = () => {
        setIsSheetVisible(false);
        setSheetData([]);
    };
    // -------------------------------------


    async function fetchProfileData() {
        if (!profileUserId || !currentUser) return;
        setLoadingProfile(true);

        const { data, error } = await supabase
            .rpc('get_profile_data', { p_profile_id: profileUserId, p_current_user_id: currentUser.id })
            .single();

        if (error) {
            console.error('Error fetching profile data:', error);
            setLoadingProfile(false);
        } else if (data) {
            setProfile(data as ProfileData);
            setIsFollowing((data as ProfileData).is_following);
            setFollowerCount((data as ProfileData).follower_count);
            setLoadingProfile(false);
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

    const handleRefresh = async () => {
        await Promise.all([fetchProfileData(), onRefreshPosts()]);
    };

    if (loadingProfile || !profile) {
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
                    <TouchableOpacity onPress={() => openUserList('followers')}>
                        <StatItem value={followerCount} label="Followers" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openUserList('following')}>
                        <StatItem value={profile.following_count} label="Following" />
                    </TouchableOpacity>
                </ThemedView>
            </ThemedView>
            <ThemedView style={styles.bioContainer}>
                <ThemedText style={styles.username}>{profile.full_name || profile.username}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.buttonContainer}>
                {isOwnProfile ? (
                    <Link href="/profile/edit" asChild>
                        <TouchableOpacity style={{ ...styles.profileButton, ...styles.editButton }}>
                            <ThemedText style={{ ...styles.profileButtonText, ...styles.editButtonText }}>Edit Profile</ThemedText>
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
                    <Link href={{ pathname: `post/${item.id}` as any, params: { authorId: profileUserId } }} asChild>
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
                onRefresh={handleRefresh}
                refreshing={loadingProfile || loadingPosts}
            />
            <UserListSheet
                visible={isSheetVisible}
                users={sheetData}
                loading={isSheetLoading}
                onClose={closeUserList}
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
        justifyContent: 'space-between',
        alignItems: 'center',
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

    // 버튼 3종류 통합 (edit / follow / following)
    editButton: {
        borderColor: '#dbdbdb',
        backgroundColor: '#eee',
    },
    followButton: {
        borderColor: '#3797f0',
        backgroundColor: '#3797f0',
    },
    followingButton: {
        borderColor: '#dbdbdb',
        backgroundColor: '#eee',
    },

    editButtonText: { color: '#333' },
    followButtonText: { color: 'white' },
    followingButtonText: { color: '#333' },

    disabledButton: {
        opacity: 0.5,
    },

    imageContainer: {
        padding: 1,
        backgroundColor: '#222',
    },
});
