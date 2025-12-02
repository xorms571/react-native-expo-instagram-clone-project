import PostCard from '@/components/PostCard';
import { usePosts } from '@/hooks/usePosts';
import React from 'react';
import { ActivityIndicator, Button, FlatList, RefreshControl, StyleSheet, Text, useColorScheme } from 'react-native';
import { ThemedView } from './themed-view';

type PostListProps = {
    authorId?: string;
};

export default function PostList({ authorId }: PostListProps) {
    const { posts, loading, error, refreshing, onRefresh, fetchPosts } = usePosts(authorId);
    const colorScheme = useColorScheme();
    const containerStyle = { backgroundColor: colorScheme === 'dark' ? '#111' : '#f0f0f0', }

    if (loading && !refreshing) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    if (error && !posts.length) {
        return (
            <ThemedView style={styles.centered}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <Button title="Retry" onPress={fetchPosts} />
            </ThemedView>
        );
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PostCard post={item} />}
            ListEmptyComponent={
                <ThemedView style={styles.centered}>
                    <Text>No posts yet.</Text>
                </ThemedView>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            style={[styles.container, containerStyle]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 10,
    },
});
