import PostList from '@/components/PostList';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function FeedScreen() {
  return (
    <ThemedView style={styles.container}>
      <PostList />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
});