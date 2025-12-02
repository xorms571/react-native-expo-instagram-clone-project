import { supabase } from '@/utils/supabase';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';

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

export function usePosts(authorId?: string) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            fetchPosts();
        }, [authorId])
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

        const rpcName = authorId ? 'get_user_posts_with_likes' : 'get_posts_with_likes';
        const params = authorId ? { p_user_id: user.id, p_author_id: authorId } : { p_user_id: user.id };

        const { data, error } = await supabase.rpc(rpcName, params);

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

    return { posts, loading, error, refreshing, onRefresh, fetchPosts };
}
