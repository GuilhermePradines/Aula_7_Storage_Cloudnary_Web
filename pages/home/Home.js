import React, { useState, useEffect } from 'react';
import {
  View,
  Button,
  Image,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function Home() {
  const CLOUD_NAME = 'djjglygn0';
  const UPLOAD_PRESET = 'aula7imagens'; // Corrigido
  const BACKEND_URL = 'http://192.168.56.1:3001'; // Corrigido para incluir porta

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const uploadToCloudinary = async (photo) => {
    setUploading(true);
    const data = new FormData();
    data.append('file', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
      });

      const result = await res.json();

      if (res.ok && result.secure_url) {
        setImages((prev) => [result, ...prev]);
      } else {
        console.error(result);
        Alert.alert('Erro no upload', result.error?.message || 'Erro desconhecido');
      }
    } catch (error) {
      Alert.alert('Erro no upload', error.message);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const photo = {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
      };
      uploadToCloudinary(photo);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos da sua permissão para acessar a galeria.');
      } else {
        loadImages();
      }
    })();
  }, []);

  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch(`${BACKEND_URL}/images`);
      if (!res.ok) throw new Error('Erro ao buscar imagens');
      const data = await res.json();
      setImages(data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar imagens');
    } finally {
      setLoadingImages(false);
    }
  };

  const deleteImage = (public_id) => {
    Alert.alert('Deletar imagem', 'Deseja realmente remover esta imagem?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${BACKEND_URL}/delete-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_id }),
            });
            const json = await res.json();

            if (json.result === 'ok' || json.result === 'not found') {
              setImages((prev) => prev.filter((img) => img.public_id !== public_id));
              Alert.alert('Sucesso', 'Imagem deletada');
            } else {
              Alert.alert('Erro', 'Falha ao deletar imagem');
            }
          } catch (error) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.secure_url }} style={styles.image} />
      <TouchableOpacity onPress={() => deleteImage(item.public_id)} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Deletar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Button title="Selecionar imagem" onPress={pickImage} />
      {uploading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}
      {loadingImages ? (
        <ActivityIndicator size="large" color="green" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.public_id}
          renderItem={renderItem}
          contentContainerStyle={{ marginTop: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  imageContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  image: { width: 120, height: 120, borderRadius: 8 },
  deleteButton: { backgroundColor: '#ff4d4d', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  deleteText: { color: '#fff', fontWeight: 'bold' },
});
