import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
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
    useColorScheme,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/utils/supabase';
import { ThemedText } from './themed-text';

// TYPES
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

// HELPER FUNCTION
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

// COMMENT ITEM COMPONENT
const CommentItem = ({ comment, onReply, onDelete, onUpdate }: { comment: CommentWithLevel; onReply: (comment: Comment) => void; onDelete: (commentId: string) => void; onUpdate: () => void; }) => {
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [isLiked, setIsLiked] = useState(comment.user_has_liked);
    const [likeCount, setLikeCount] = useState(comment.like_count);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const handleDelete = () => {
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
        ]);
    };

    const handleUpdate = async () => {
        if (!editedContent.trim()) {
            Alert.alert('Error', 'Comment cannot be empty.');
            return;
        }
        const { error } = await supabase.from('comments').update({ content: editedContent }).eq('id', comment.id);
        if (error) {
            Alert.alert('Error', 'Failed to update comment.');
        } else {
            setIsEditing(false);
            onUpdate();
        }
    };

    const handleLike = async () => {
        if (!user) return;
        const currentlyLiked = isLiked;
        const currentLikeCount = likeCount;
        setIsLiked(!currentlyLiked);
        setLikeCount(currentLikeCount + (currentlyLiked ? -1 : 1));
        if (currentlyLiked) {
            const { error } = await supabase.from('comment_likes').delete().match({ user_id: user.id, comment_id: comment.id });
            if (error) {
                setIsLiked(currentlyLiked);
                setLikeCount(currentLikeCount);
            }
        } else {
            const { error } = await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: comment.id });
            if (error) {
                setIsLiked(currentlyLiked);
                setLikeCount(currentLikeCount);
            }
        }
    };

    const username = comment.profiles?.username || 'unknown';
    const avatarUrl = comment.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${comment.user_id}`;
    const isAuthor = user?.id === comment.user_id;

    return (
        <View style={[styles.commentContainer, { marginLeft: comment.level * 20 }, isDark && styles.darkCommentContainer]}>
            <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
            <View style={styles.commentTextContainer}>
                {isEditing ? (
                    <>
                        <TextInput value={editedContent} onChangeText={setEditedContent} style={[styles.editInput, isDark && styles.darkEditInput]} autoFocus placeholderTextColor={isDark ? '#bbb' : '#999'} />
                        <View style={styles.editControls}>
                            <TouchableOpacity onPress={handleUpdate}><ThemedText style={styles.editControlButton}>Save</ThemedText></TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditing(false)}><ThemedText style={[styles.editControlButton, { color: 'red' }]}>Cancel</ThemedText></TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        <ThemedText>
                            <ThemedText type="defaultSemiBold">{username}</ThemedText> {comment.content}
                        </ThemedText>
                        <View style={styles.commentActions}>
                            <ThemedText style={styles.commentTimestamp}>{new Date(comment.created_at).toLocaleDateString()}</ThemedText>
                            <TouchableOpacity onPress={() => onReply(comment)}><Text style={styles.replyButton}>Reply</Text></TouchableOpacity>
                            {isAuthor && (
                                <>
                                    <TouchableOpacity onPress={() => setIsEditing(true)}><Text style={styles.editButton}>Edit</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={handleDelete}><Text style={styles.deleteButton}>Delete</Text></TouchableOpacity>
                                </>
                            )}
                        </View>
                    </>
                )}
            </View>
            {!isEditing && (
                <View style={styles.likeContainer}>
                    <TouchableOpacity onPress={handleLike}><Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? 'red' : (isDark ? 'lightgray' : 'gray')} /></TouchableOpacity>
                    {likeCount > 0 && <ThemedText style={styles.likeCount}>{likeCount}</ThemedText>}
                </View>
            )}
        </View>
    );
};


// MAIN REUSABLE COMPONENT
type CommentsProps = {
    postId: string;
    showTitle?: boolean;
    standalone?: boolean;
}

export default function Comments({ postId, showTitle = false, standalone = false }: CommentsProps) {
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [comments, setComments] = useState<CommentWithLevel[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    const fetchAndSetComments = () => {
        if (postId && user) {
            fetchComments(postId, user.id);
        }
    }

    useEffect(() => {
        fetchAndSetComments();
    }, [postId, user]);

    async function fetchComments(pId: string, userId: string) {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_comments_with_likes', { p_post_id: pId, p_user_id: userId });
        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            const nested = nestComments(data as any);
            setComments(nested);
        }
        setLoading(false);
    }

    async function addComment() {
        if (!user || !postId || !newComment.trim()) return;
        const { error } = await supabase.from('comments').insert({
            post_id: postId,
            user_id: user.id,
            content: newComment.trim(),
            parent_id: replyingTo ? replyingTo.id : null,
        });

        if (error) {
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
        } else {
            setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        }
    };

    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }

    const list = (
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
            style={standalone ? styles.standaloneList : {}}
            ListEmptyComponent={<ThemedText style={styles.noCommentsText}>No comments yet. Be the first to comment!</ThemedText>}
        />
    );

    const input = (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={standalone ? 90 : 0}
        >
            <View style={[styles.commentInputContainer, isDark && styles.darkCommentInputContainer]}>
                {replyingTo && (
                    <View style={styles.replyingToContainer}>
                        <ThemedText style={styles.replyingToText}>Replying to {replyingTo.profiles?.username}</ThemedText>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <ThemedText style={styles.cancelReplyButton}>Cancel</ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TextInput
                        style={[styles.commentInput, isDark && styles.darkCommentInput]}
                        placeholder={replyingTo ? 'Add a reply...' : "Add a comment..."}
                        placeholderTextColor={isDark ? '#bbb' : '#999'}
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={addComment} style={styles.postButton}>
                        <ThemedText style={styles.postButtonText}>Post</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <View style={standalone ? styles.standaloneContainer : {}}>
            {showTitle && <ThemedText type="title" style={[styles.title, isDark && styles.darkTitle]}>Comments</ThemedText>}
            {list}
            {input}
        </View>
    );
}

const styles = StyleSheet.create({
    standaloneContainer: {
        flex: 1,
    },
    standaloneList: {
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
    darkTitle: {
        borderBottomColor: '#333',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noCommentsText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888',
    },
    commentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    darkCommentContainer: {
        borderBottomColor: '#333',
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
        color: 'black',
    },
    darkEditInput: {
        borderColor: '#555',
        color: 'white',
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
    darkCommentInputContainer: {
        backgroundColor: '#1c1c1c',
        borderTopColor: '#333',
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
        color: 'black',
    },
    darkCommentInput: {
        borderColor: '#555',
        backgroundColor: '#333',
        color: 'white',
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