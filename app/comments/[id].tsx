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
    parent_id: string | null;
    profiles: {
        username: string;
        avatar_url: string;
    } | null;
};

export type CommentWithLevel = Comment & { level: number };

function nestComments(commentList: Comment[]): CommentWithLevel[] {
    type CommentWithReplies = Comment & { replies: CommentWithReplies[] };

    const commentMap = new Map<string, CommentWithReplies>();
    commentList.forEach(comment => commentMap.set(comment.id, { ...comment, replies: [] }));

    const rootComments: CommentWithReplies[] = [];
    commentList.forEach(comment => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
            commentMap.get(comment.parent_id)!.replies.push(commentMap.get(comment.id)!);
        } else {
            rootComments.push(commentMap.get(comment.id)!);
        }
    });

    const flattened: CommentWithLevel[] = [];
    const flatten = (comments: CommentWithReplies[], level: number) => {
        comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        for (const comment of comments) {
            const { replies, ...rest } = comment;
            flattened.push({ ...rest, level });
            flatten(replies, level + 1);
        }
    };

    flatten(rootComments, 0);
    return flattened;
}

export default function CommentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentWithLevel[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

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
            const nested = nestComments(data as any);
            setComments(nested);
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
            parent_id: replyingTo ? replyingTo.id : null,
        });

        if (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment.');
        } else {
            setNewComment('');
            setReplyingTo(null);
            if (id) fetchComments(id); // Refresh comments
        }
    }

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }
    
    const renderComment = ({ item }: { item: CommentWithLevel }) => {
        const username = item.profiles?.username || 'unknown';
        const avatarUrl = item.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${item.user_id}`;
        return (
            <View style={[styles.commentContainer, { marginLeft: item.level * 20 }]}>
                <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
                <View style={styles.commentTextContainer}>
                    <Text>
                        <Text style={styles.commentUsername}>{username}</Text> {item.content}
                    </Text>
                    <View style={styles.commentActions}>
                        <Text style={styles.commentTimestamp}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => setReplyingTo(item)}>
                            <Text style={styles.replyButton}>Reply</Text>
                        </TouchableOpacity>
                    </View>
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
                    {replyingTo && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>Replying to {replyingTo.profiles?.username}</Text>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Text style={styles.cancelReplyButton}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder={replyingTo ? `Add a reply...` : "Add a comment..."}
                            value={newComment}
                            onChangeText={setNewComment}
                        />
                        <TouchableOpacity onPress={addComment} style={styles.postButton}>
                            <Text style={styles.postButtonText}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
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
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    commentTimestamp: {
        fontSize: 12,
        color: '#999',
    },
    replyButton: {
        marginLeft: 10,
        color: '#3797f0',
        fontWeight: 'bold',
        fontSize: 12,
    },
    commentInputContainer: {
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: 'white',
    },
    replyingToContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        paddingHorizontal: 5,
    },
    replyingToText: {
        color: '#888',
        fontSize: 12,
    },
    cancelReplyButton: {
        color: '#3797f0',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputRow: {
        flexDirection: 'row',
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
