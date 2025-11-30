import PostCard from '@/components/PostCard';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { Post } from '../(tabs)';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id && user) {
            fetchPost();
        }
    }, [id, user]);

    async function fetchPost() {
        if (!id || !user) return;
        setLoading(true);

        const { data, error } = await supabase
            .rpc('get_post_details', { p_post_id: id, p_user_id: user.id })
            .single();

        if (error) {
            setError(error.message);
        } else {
            setPost(data as any);
        }
        setLoading(false);
    }

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }

    if (error || !post) {
        return <Text style={styles.centered}>Error: {error || 'Post not found.'}</Text>;
    }

    return (
        <View style={styles.container}>
            {post && <PostCard post={post} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});