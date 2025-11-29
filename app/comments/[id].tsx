import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type Comment = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string;
    } | null;
};

export default function CommentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchComments(id);
        }
    }, [id]);

    async function fetchComments(postId: string) {
        setLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles(username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            setComments(data as any);
        }
        setLoading(false);
    }

    async function addComment() {
        if (!user || !id || !newComment.trim()) {
            return;
        }

        const { error } = await supabase.from('comments').insert({
            post_id: id,
            user_id: user.id,
            content: newComment.trim(),
        });

        if (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment.');
        } else {
            setNewComment('');
            if (id) fetchComments(id); // Refresh comments
        }
    }

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }
    
    const renderComment = ({ item }: { item: Comment }) => {
        const username = item.profiles?.username || 'unknown';
        const avatarUrl = item.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${item.user_id}`;
        return (
            <View style={styles.commentContainer}>
                <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
                <View style={styles.commentTextContainer}>
                    <Text>
                        <Text style={styles.commentUsername}>{username}</Text> {item.content}
                    </Text>
                    <Text style={styles.commentTimestamp}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <Text style={styles.title}>Comments</Text>
                <FlatList
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={(item) => item.id}
                    style={styles.listContainer}
                />
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={addComment} style={styles.postButton}>
                        <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
        // backgroundColor: 'white', // Moved to SafeAreaView
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    listContainer: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    commentAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
    },
    commentTextContainer: {
        flex: 1,
    },
    commentUsername: {
        fontWeight: 'bold',
    },
    commentTimestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    commentInputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: 'white',
        alignItems: 'center',
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
    },
    postButton: {
        backgroundColor: '#3797f0',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    postButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
