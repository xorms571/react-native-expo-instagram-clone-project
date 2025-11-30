import Comments from '@/components/Comments';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    if (!id) {
        return null;
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Comments postId={id} showTitle={true} standalone={true} />
        </SafeAreaView>
    );
}
