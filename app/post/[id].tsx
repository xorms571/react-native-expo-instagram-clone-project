import PostCard from '@/components/PostCard';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Post } from '../(tabs)';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
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
            .select('*, profiles(username, avatar_url)')
            .eq('id', id)
            .single();

        if (error) {
            setError(error.message);
        } else {
            setPost(data as any);
        }
        setLoading(false);
    }

    async function deletePost() {
        if (!post) return;

        Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    // Delete image from storage
                    const imagePath = post.image_url.split('/').slice(-2).join('/');
                    const { error: storageError } = await supabase.storage.from('posts').remove([imagePath]);
                    if (storageError) {
                        console.error('Error deleting image:', storageError);
                    }

                    // Delete post from database
                    const { error } = await supabase.from('posts').delete().eq('id', post.id);
                    if (error) {
                        Alert.alert('Error', 'Failed to delete post.');
                    } else {
                        Alert.alert('Success', 'Post deleted successfully.');
                        router.back();
                    }
                },
            },
        ]);
    }

    const isOwner = post?.user_id === user?.id;

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }

    if (error || !post) {
        return <Text style={styles.centered}>Error: {error || 'Post not found.'}</Text>;
    }

    return (
        <View style={styles.container}>
            {post && <PostCard post={post} />}
            {isOwner && (
                <View style={styles.actionsContainer}>
                    <Link href={`/post/edit/${post.id}` as any} asChild>
                        <TouchableOpacity style={styles.button}>
                            <Text style={styles.buttonText}>Edit</Text>
                        </TouchableOpacity>
                    </Link>
                    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={deletePost}>
                        <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
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
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        padding: 10,
    },
    button: {
        backgroundColor: '#3797f0',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#ff3b30',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});