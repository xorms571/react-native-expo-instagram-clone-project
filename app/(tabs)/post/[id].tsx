import PostCard from '@/components/PostCard';
import { ThemedView } from '@/components/themed-view';
import { Post, usePosts } from '@/hooks/usePosts';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

// Estimate the average height of a PostCard item for the getItemLayout optimization.
// This includes image, header, action bar, caption, etc.
// A precise value is not necessary, but a good estimate improves performance.
const POST_CARD_ESTIMATED_HEIGHT = 600;

export default function PostUserFeedScreen() {
    const { id: selectedPostId, authorId } = useLocalSearchParams<{ id: string, authorId: string }>();
    const { posts, loading, error, fetchPosts } = usePosts(authorId);

    const initialScrollIndex = useMemo(() => {
        if (!posts || posts.length === 0) {
            return 0;
        }
        return posts.findIndex(p => p.id === selectedPostId);
    }, [posts, selectedPostId]);


    if (loading) {
        return <ActivityIndicator style={styles.centered} />;
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    // This check handles the case where the findIndex returns -1 (not found)
    // or if the posts are still loading for the first time.
    if (initialScrollIndex === -1) {
        return <ActivityIndicator style={styles.centered} />;
    }

    const getItemLayout = (data: ArrayLike<Post> | null | undefined, index: number) => (
        { length: POST_CARD_ESTIMATED_HEIGHT, offset: POST_CARD_ESTIMATED_HEIGHT * index, index }
    );

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PostCard post={item} />}
                initialScrollIndex={initialScrollIndex}
                getItemLayout={getItemLayout}
                showsVerticalScrollIndicator={false}
                windowSize={5} // Renders items in the viewport, plus one above and two below.
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
    },
});
