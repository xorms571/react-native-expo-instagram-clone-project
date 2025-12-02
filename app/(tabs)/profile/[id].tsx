import ProfileView from '@/components/ProfileView';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function UserProfileScreen() {
    const { id: profileUserId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    
    if (!profileUserId || !user) {
        return <ActivityIndicator style={styles.centered} />;
    }

    return (
        <ThemedView style={styles.container}>
            <ProfileView profileUserId={profileUserId} />
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