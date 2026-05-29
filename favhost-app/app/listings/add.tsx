import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import API from '../../constants/api';

export default function AddListingScreen() {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a room title.'); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('room_title', title.trim());
      if (image) {
        form.append('room_image', { uri: image.uri, name: 'room.jpg', type: 'image/jpeg' } as any);
      }
      const res = await fetch(API.listingCreate, { method:'POST', body: form });
      if (res.ok) {
        Alert.alert('Success', 'Listing added!', [{ text:'OK', onPress:()=>router.back() }]);
      } else {
        const err = await res.json();
        Alert.alert('Error', JSON.stringify(err.errors));
      }
    } catch(e) { Alert.alert('Error', 'Network error. Is the server running?'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Header title="Add Listing" showBack />
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.card}>
          <Text style={styles.label}>Room Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cozy Studio Downtown" placeholderTextColor="#94a3b8" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Room Photo</Text>
          {image ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={14} color="#1e293b" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color="#94a3b8" />
              <Text style={styles.imagePickerText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Add Listing</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  form: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#f8f9fc', borderRadius: 10, padding: 12, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  imagePreviewWrap: { alignItems: 'center', gap: 10 },
  imagePreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#f1f5f9', resizeMode: 'cover' },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  changePhotoText: { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  imagePicker: { height: 120, borderRadius: 12, backgroundColor: '#f8f9fc', borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  imagePickerText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  submitBtn: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4, shadowColor: '#1e293b', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});
