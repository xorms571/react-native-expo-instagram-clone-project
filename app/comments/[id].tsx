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
    like_count: number;
    user_has_liked: boolean;
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

import { Ionicons } from '@expo/vector-icons';

type CommentItemProps = {
    comment: CommentWithLevel;
    onReply: (comment: Comment) => void;
    onDelete: (commentId: string) => void;
    onUpdate: () => void;
};

const CommentItem = ({ comment, onReply, onDelete, onUpdate }: CommentItemProps) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(comment.user_has_liked);
    const [likeCount, setLikeCount] = useState(comment.like_count);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleDelete = () => {
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete(comment.id),
            },
        ]);
    };

    const handleUpdate = async () => {
        if (!editedContent.trim()) {
            Alert.alert('Error', 'Comment cannot be empty.');
            return;
        }
        const { error } = await supabase
            .from('comments')
            .update({ content: editedContent })
            .eq('id', comment.id);

        if (error) {
            Alert.alert('Error', 'Failed to update comment.');
        } else {
            setIsEditing(false);
            onUpdate(); // Refresh the comments list
        }
    };

    const handleLike = async () => {
        if (!user) return;

        const currentlyLiked = isLiked;
        const currentLikeCount = likeCount;

        setIsLiked(!currentlyLiked);
        setLikeCount(currentLikeCount + (currentlyLiked ? -1 : 1));

        if (currentlyLiked) {
            const { error } = await supabase
                .from('comment_likes')
                .delete()
                .match({ user_id: user.id, comment_id: comment.id });
            if (error) {
                setIsLiked(currentlyLiked);
                setLikeCount(currentLikeCount);
                console.error('Error unliking comment:', error);
            }
        } else {
            const { error } = await supabase
                .from('comment_likes')
                .insert({ user_id: user.id, comment_id: comment.id });
            if (error) {
                setIsLiked(currentlyLiked);
                setLikeCount(currentLikeCount);
                console.error('Error liking comment:', error);
            }
        }
    };

    const username = comment.profiles?.username || 'unknown';
    const avatarUrl = comment.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${comment.user_id}`;
    const isAuthor = user?.id === comment.user_id;

    return (
        <View style={[styles.commentContainer, { marginLeft: comment.level * 20 }]}>
            <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
            <View style={styles.commentTextContainer}>
                {isEditing ? (
                    <>
                        <TextInput
                            value={editedContent}
                            onChangeText={setEditedContent}
                            style={styles.editInput}
                            autoFocus
                        />
                        <View style={styles.editControls}>
                            <TouchableOpacity onPress={handleUpdate}>
                                <Text style={styles.editControlButton}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditing(false)}>
                                <Text style={[styles.editControlButton, { color: 'red' }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        <Text>
                            <Text style={styles.commentUsername}>{username}</Text> {comment.content}
                        </Text>
                        <View style={styles.commentActions}>
                            <Text style={styles.commentTimestamp}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                            <TouchableOpacity onPress={() => onReply(comment)}>
                                <Text style={styles.replyButton}>Reply</Text>
                            </TouchableOpacity>
                            {isAuthor && (
                                <>
                                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                                        <Text style={styles.editButton}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDelete}>
                                        <Text style={styles.deleteButton}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </>
                )}
            </View>
            {!isEditing && (
                <View style={styles.likeContainer}>
                    <TouchableOpacity onPress={handleLike}>
                        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? 'red' : 'gray'} />
                    </TouchableOpacity>
                    {likeCount > 0 && <Text style={styles.likeCount}>{likeCount}</Text>}
                </View>
            )}
        </View>
    );
};


export default function CommentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentWithLevel[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    const fetchAndSetComments = () => {
        if (id && user) {
            fetchComments(id, user.id);
        }
    }

    useEffect(() => {
        fetchAndSetComments();
    }, [id, user]);

    async function fetchComments(postId: string, userId: string) {
        setLoading(true);
        const { data, error } = await supabase
            .rpc('get_comments_with_likes', { p_post_id: postId, p_user_id: userId });

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
            fetchAndSetComments();
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) {
            Alert.alert('Error', 'Failed to delete comment.');
            console.error('Error deleting comment:', error);
        } else {
            setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        }
    };

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }
    
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <Text style={styles.title}>Comments</Text>
                <FlatList
                    data={comments}
                    renderItem={({ item }) => (
                        <CommentItem
                            comment={item}
                            onReply={setReplyingTo}
                            onDelete={handleDeleteComment}
                            onUpdate={fetchAndSetComments}
                        />
                    )}
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
        alignItems: 'center',
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
    editButton: {
        marginLeft: 10,
        color: 'gray',
        fontWeight: 'bold',
        fontSize: 12,
    },
    deleteButton: {
        marginLeft: 10,
        color: 'red',
        fontWeight: 'bold',
        fontSize: 12,
    },
    editInput: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        padding: 4,
        marginBottom: 8,
    },
    editControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    editControlButton: {
        marginLeft: 10,
        color: '#3797f0',
        fontWeight: 'bold',
    },
    likeContainer: {
        alignItems: 'center',
        paddingLeft: 10,
    },
    likeCount: {
        fontSize: 10,
        color: 'gray',
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


