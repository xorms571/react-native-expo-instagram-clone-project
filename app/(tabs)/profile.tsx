import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

type Post = {
  id: string;
  image_url: string;
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

export default function ProfileScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
    }
  }, [user]);

  async function fetchUserPosts() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id, image_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  if (loading) {
    return <ActivityIndicator style={styles.centered} />;
  }

  const numColumns = 3;
  const imageSize = Dimensions.get('window').width / numColumns;
  const username = user?.email?.split('@')[0] || 'user';

  const renderHeader = () => (
    <View style={styles.headerContainer}>
        <View style={styles.topRow}>
            <Image
                source={{ uri: `https://i.pravatar.cc/150?u=${user?.id}` }}
                style={styles.avatar}
            />
            <View style={styles.statsContainer}>
                <StatItem value={posts.length} label="Posts" />
                <StatItem value="1.2M" label="Followers" />
                <StatItem value="1" label="Following" />
            </View>
        </View>
        <View style={styles.bioContainer}>
            <Text style={styles.username}>{username}</Text>
            {/* Bio text could go here */}
        </View>
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
        <FlatList
            data={posts}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: item.image_url }}
                        style={{ width: imageSize - 2, height: imageSize - 2 }}
                    />
                </View>
            )}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
      padding: 15,
  },
  topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
  },
  statsContainer: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-around',
  },
  statItem: {
      alignItems: 'center',
  },
  statValue: {
      fontSize: 18,
      fontWeight: 'bold',
  },
  statLabel: {
      fontSize: 14,
      color: '#333',
  },
  bioContainer: {
      marginTop: 10,
  },
  username: {
      fontWeight: 'bold',
      fontSize: 16,
  },
  buttonContainer: {
      flexDirection: 'row',
      marginTop: 20,
  },
  editButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#dbdbdb',
  },
  editButtonText: {
      fontWeight: 'bold',
      color: 'black',
  },
  imageContainer: {
      padding: 1,
  },
});
