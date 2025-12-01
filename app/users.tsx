import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserListItem, UserListItemData } from '@/components/UserListItem';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function UserListModal() {
    const { mode, postId, profileUserId } = useLocalSearchParams<{ mode: 'likes' | 'followers' | 'following', postId?: string, profileUserId?: string }>();

    const [userList, setUserList] = useState<UserListItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { user } = useAuth();

    const fetchUsers = useCallback(async () => {
        let query;
        switch (mode) {
            case 'likes':
                if (!postId) return null;
                setTitle('Likes');
                query = supabase
                    .from('likes')
                    .select(`user_id, profiles (id, username, avatar_url)`)
                    .eq('post_id', postId);
                break;
            case 'followers':
                if (!profileUserId) return null;
                setTitle('Followers');
                query = supabase.from('followers').select('profiles!inner!follower_id(id, username, avatar_url)').eq('following_id', profileUserId);
                break;
            case 'following':
                if (!profileUserId) return null;
                setTitle('Following');
                query = supabase.from('followers').select('profiles!inner!following_id(id, username, avatar_url)').eq('follower_id', profileUserId);
                break;
            default:
                return null;
        }

        const { data, error } = await query;
        if (error) {
            console.error(`Error fetching ${mode}:`, error);
            return null;
        }
        return data;

    }, [mode, postId, profileUserId]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);

            const usersData = await fetchUsers();
            if (!usersData) {
                setLoading(false);
                return;
            }

            const { data: followingData, error: followingError } = await supabase
                .from('followers')
                .select('following_id')
                .eq('follower_id', user.id);

            if (followingError) console.error('Error fetching current user following list:', followingError);

            const followingSet = new Set(followingData?.map(f => f.following_id) || []);

            const formattedData: UserListItemData[] = usersData.map((item: any) => {
                const isFromLikes = !!item.user_id;
                const userId = isFromLikes ? item.user_id : item.profiles.id;
                const profileData = Array.isArray(item.profiles) ? item.profiles[0] : (item.profiles || null);

                return {
                    user_id: userId,
                    profiles: profileData,
                    is_following: followingSet.has(userId),
                };
            });

            setUserList(formattedData);
            setLoading(false);
        };

        fetchData();
    }, [fetchUsers, user]);


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
                <ThemedText type='title' style={styles.title}>{title}</ThemedText>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
                </TouchableOpacity>
            </View>
            <FlatList
                data={userList}
                style={{ margin: 10 }}
                renderItem={({ item }) => <UserListItem item={item} />}
                keyExtractor={(item) => item.user_id}
                ListEmptyComponent={<ThemedText style={styles.center}>No users found.</ThemedText>}
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
        padding: 15,
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
});
