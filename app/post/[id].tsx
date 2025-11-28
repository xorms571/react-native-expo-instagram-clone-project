import PostCard from '@/components/PostCard';
import { supabase } from '@/utils/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Post } from '../(tabs)';

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
