import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, TextInput } from 'react-native';

export default function EditPostScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [caption, setCaption] = useState('');
    const [post, setPost] = useState<any>(null);

    useEffect(() => {
        if (id) getPost();
    }, [id]);

    async function getPost() {
        try {
            setLoading(true);
            if (!user) throw new Error('No user on the session!');

            let { data, error } = await supabase.from('posts').select('*').eq('id', id).single();

            if (error) throw error;
            if (data.user_id !== user.id) {
                Alert.alert('Error', 'You are not authorized to edit this post.');
                router.back();
                return;
            }

            setPost(data);
            setCaption(data.caption || '');
        } catch (error: any) {
            Alert.alert('Error fetching post', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function updatePost() {
        try {
            setLoading(true);
            if (!user) throw new Error('No user on the session!');

            const { error } = await supabase.from('posts').update({ caption }).eq('id', id);

            if (error) throw error;

            Alert.alert('Success', 'Post updated successfully!');
            router.back();
        } catch (error: any) {
            Alert.alert('Error updating post', error.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <ActivityIndicator style={styles.centered}/>
    }

    return (
        <ThemedView style={styles.container}>
            {post?.image_url && <Image source={{ uri: post.image_url }} style={styles.image} />}
            <ThemedText style={styles.label}>Caption</ThemedText>
            <TextInput
                style={styles.input}
                value={caption}
                onChangeText={setCaption}
                multiline
            />
            <Button title="Update Post" onPress={updatePost} disabled={loading} />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        marginBottom: 20,
        backgroundColor: '#222'
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#fafafa',
        padding: 15,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#dbdbdb',
        marginBottom: 20,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
});
