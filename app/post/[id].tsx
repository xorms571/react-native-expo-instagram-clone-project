import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/utils/supabase';
import PostCard from '@/components/PostCard';

type Post = {
    id: string;
    image_url: string;
    caption: string;
    created_at: string;
    user_id: string;
};

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchPost();
        }
    }, [id]);

    async function fetchPost() {
        if (!id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            setError(error.message);
        } else {
            setPost(data);
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
            <PostCard post={post} />
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
    }
});
