import ProfileView from '@/components/ProfileView';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const { user } = useAuth();

  if (!user) {
    return <ActivityIndicator style={styles.centered} />;
  }

  return (
    <ThemedView style={styles.container}>
        <ProfileView profileUserId={user.id} />
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
});