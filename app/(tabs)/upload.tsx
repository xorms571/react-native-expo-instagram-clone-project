import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider'; // Import useAuth
import 'react-native-get-random-values'; // Required for uuid to work with React Native
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames
import { Ionicons } from '@expo/vector-icons';


export default function UploadScreen() {
  const { user } = useAuth(); // Get the authenticated user
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
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
        {!imageUri ? (
            <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
                <Ionicons name="images-outline" size={60} color="#8e8e8e" />
                <Text style={styles.pickText}>Select a photo</Text>
            </TouchableOpacity>
        ) : (
            <>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <TextInput
                    style={styles.captionInput}
                    placeholder="Write a caption..."
                    placeholderTextColor="#8e8e8e"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                />
                <TouchableOpacity style={styles.uploadButton} onPress={uploadImageAndPost} disabled={uploading}>
                    {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.uploadButtonText}>Share</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.discardButton} onPress={() => setImageUri(null)} disabled={uploading}>
                    <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>
            </>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  pickButton: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 200,
      height: 200,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#dbdbdb',
      borderStyle: 'dashed',
  },
  pickText: {
      marginTop: 10,
      color: '#8e8e8e',
      fontSize: 16,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1 / 1,
    borderRadius: 10,
    marginBottom: 20,
  },
  captionInput: {
    width: '100%',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    marginBottom: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#3797f0',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  uploadButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  },
  discardButton: {
      marginTop: 10,
  },
  discardButtonText: {
      color: '#ff3b30'
  }
});
