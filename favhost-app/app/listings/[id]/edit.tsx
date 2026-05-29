import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../../components/Header';
import API from '../../../constants/api';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API.listingDetail(Number(id)));
        const data = await res.json();
        setTitle(data.room_title || '');
      } catch(e) {
        Alert.alert('Error', 'Failed to load listing.');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id]);

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
      const res = await fetch(API.listingUpdate(Number(id)), { method:'POST', body: form });
      if (res.ok) {
        Alert.alert('Success', 'Listing updated!', [{ text:'OK', onPress:()=>router.back() }]);
      } else {
        const err = await res.json();
        Alert.alert('Error', JSON.stringify(err.errors));
      }
    } catch(e) { Alert.alert('Error', 'Network error. Is the server running?'); }
    finally { setLoading(false); }
  };

  if (initialLoading) return (
    <View style={styles.container}>
      <Header title="Edit Listing" showBack />
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="small" color="#00b4b4" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Edit Listing" showBack />
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Room Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cozy Studio Downtown" placeholderTextColor="#bbb" />
        
        <Text style={styles.label}>Room Photo</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text style={styles.imagePickerText}>{image ? '✓ Photo selected' : '＋ Choose Photo'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.submitBtn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Update Listing</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f8f8f8' },
  form: { padding:16, gap:4 },
  label: { fontSize:11, fontWeight:'600', color:'#888', marginBottom:5, marginTop:14, textTransform:'uppercase', letterSpacing:0.5 },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e8e8e8', borderRadius:9, padding:11, fontSize:13, color:'#222' },
  imagePicker: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e8e8e8', borderRadius:9, padding:11, alignItems:'center' },
  imagePickerText: { fontSize:13, color:'#00b4b4', fontWeight:'500' },
  submitBtn: { backgroundColor:'#00b4b4', borderRadius:10, padding:13, alignItems:'center', marginTop:24 },
  btnDisabled: { opacity:0.6 },
  submitText: { color:'#fff', fontSize:14, fontWeight:'600' },
});
