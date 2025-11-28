import React, { useState } from 'react';
import { StyleSheet, View, Text, Button, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider'; // Import useAuth
import 'react-native-get-random-values'; // Required for uuid to work with React Native
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

export default function UploadScreen() {
  const { user } = useAuth(); // Get the authenticated user
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageAndPost = async () => {
    if (!imageUri || !user) {
      Alert.alert('Error', 'Please select an image and ensure you are logged in.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for the uploaded image.');
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: publicUrlData.publicUrl,
          caption: caption,
        });

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Success', 'Post uploaded successfully!');
      setImageUri(null);
      setCaption('');
    } catch (error: any) {
      console.error('Error uploading post:', error);
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an image from gallery" onPress={pickImage} />
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
      )}
      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption..."
        value={caption}
        onChangeText={setCaption}
        multiline
      />
      <Button
        title={uploading ? 'Uploading...' : 'Upload Post'}
        onPress={uploadImageAndPost}
        disabled={uploading || !imageUri}
      />
      {uploading && <ActivityIndicator size="small" style={styles.activityIndicator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginVertical: 20,
    borderRadius: 10,
  },
  captionInput: {
    width: '100%',
    height: 80,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  activityIndicator: {
    marginTop: 10,
  },
});
