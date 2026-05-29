import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import Header from '../../components/Header';
import API from '../../constants/api';
import { Listing } from '../../types';

export default function AddReservationScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [checkin, setCheckin] = useState<Date>(new Date());
  const [checkout, setCheckout] = useState<Date>(new Date(Date.now() + 86400000));
  const [price, setPrice] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(API.listings).then(r => r.json()).then(d => setListings(d.listings || []));
  }, []);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const submit = async () => {
    if (!guestName.trim()) { Alert.alert('Required', 'Enter guest name.'); return; }
    if (!selectedListing) { Alert.alert('Required', 'Select a listing.'); return; }
    if (checkin >= checkout) { Alert.alert('Invalid', 'Check-out must be after check-in.'); return; }
    setLoading(true);
    try {
      const res = await fetch(API.reservationCreate, {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          listing_id: selectedListing,
          guest_name: guestName.trim(),
          checkin_date: formatDate(checkin),
          checkout_date: formatDate(checkout),
          price_per_night: price || null,
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Reservation added!', [{ text:'OK', onPress:()=>router.back() }]);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Something went wrong');
      }
    } catch(e) { Alert.alert('Error', 'Network error. Is the server running?'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Header title="Add Reservation" showBack />
      <ScrollView contentContainerStyle={styles.form}>
        
        <Text style={styles.label}>Guest Name *</Text>
        <TextInput style={styles.input} value={guestName} onChangeText={setGuestName} placeholder="Full name" placeholderTextColor="#bbb" />

        <Text style={styles.label}>Listing *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listingPicker}>
          {listings.map(l => (
            <TouchableOpacity key={l.id} style={[styles.listingChip, selectedListing===l.id && styles.listingChipActive]} onPress={() => setSelectedListing(l.id)}>
              <Text style={[styles.listingChipText, selectedListing===l.id && styles.listingChipTextActive]} numberOfLines={1}>{l.room_title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Check-in *</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCheckin(true)}>
          <Text style={styles.dateBtnText}>📅  {formatDate(checkin)}</Text>
        </TouchableOpacity>
        {showCheckin && (
          <DateTimePicker value={checkin} mode="date" display={Platform.OS==='ios'?'spinner':'default'}
            onChange={(_, d) => { setShowCheckin(false); if(d) setCheckin(d); }} />
        )}

        <Text style={styles.label}>Check-out *</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCheckout(true)}>
          <Text style={styles.dateBtnText}>📅  {formatDate(checkout)}</Text>
        </TouchableOpacity>
        {showCheckout && (
          <DateTimePicker value={checkout} mode="date" display={Platform.OS==='ios'?'spinner':'default'}
            onChange={(_, d) => { setShowCheckout(false); if(d) setCheckout(d); }} minimumDate={checkin} />
        )}

        <Text style={styles.label}>Price per Night (optional)</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="e.g. 55" placeholderTextColor="#bbb" keyboardType="decimal-pad" />

        <TouchableOpacity style={[styles.submitBtn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Add Reservation</Text>}
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
  listingPicker: { marginBottom:4 },
  listingChip: { borderWidth:1, borderColor:'#e0e0e0', borderRadius:16, paddingHorizontal:12, paddingVertical:6, marginRight:8, backgroundColor:'#fff' },
  listingChipActive: { backgroundColor:'#00b4b4', borderColor:'#00b4b4' },
  listingChipText: { fontSize:12, color:'#555' },
  listingChipTextActive: { color:'#fff', fontWeight:'600' },
  dateBtn: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e8e8e8', borderRadius:9, padding:11 },
  dateBtnText: { fontSize:13, color:'#333' },
  submitBtn: { backgroundColor:'#00b4b4', borderRadius:10, padding:13, alignItems:'center', marginTop:24 },
  btnDisabled: { opacity:0.6 },
  submitText: { color:'#fff', fontSize:14, fontWeight:'600' },
});
