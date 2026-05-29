import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../../components/Header';
import API from '../../../constants/api';
import { Listing } from '../../../types';

export default function EditReservationScreen() {
  const { id } = useLocalSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhoto, setGuestPhoto] = useState<any>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<Date>(new Date());
  const [checkout, setCheckout] = useState<Date>(new Date(Date.now() + 86400000));
  const [price, setPrice] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const filteredListings = useMemo(() => {
    if (!listingSearch.trim()) return listings;
    const q = listingSearch.toLowerCase();
    return listings.filter(l => l.room_title.toLowerCase().includes(q));
  }, [listings, listingSearch]);

  const selectedListingTitle = useMemo(() => {
    if (!selectedListing) return '';
    return listings.find(l => l.id === selectedListing)?.room_title || '';
  }, [selectedListing, listings]);

  useEffect(() => {
    (async () => {
      try {
        const [lRes, rRes] = await Promise.all([
          fetch(API.listings),
          fetch(API.reservationDetail(Number(id))),
        ]);
        setListings((await lRes.json()).listings || []);
        const data = await rRes.json();
        setSelectedListing(data.listing_id);
        setGuestName(data.guest_name || '');
        setExistingPhotoUrl(data.guest_photo_url || null);
        setCheckin(new Date(data.checkin_date));
        setCheckout(new Date(data.checkout_date));
        setPrice(data.price_per_night || '');
      } catch(e) {
        Alert.alert('Error', 'Failed to load reservation.');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id]);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const displayDate = (d: Date) => d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setGuestPhoto(result.assets[0]);
  };

  const nightCount = Math.max(1, Math.round((checkout.getTime() - checkin.getTime()) / 86400000));

  const submit = async () => {
    if (!guestName.trim()) { Alert.alert('Required', 'Enter guest name.'); return; }
    if (!selectedListing) { Alert.alert('Required', 'Select a listing.'); return; }
    if (checkin >= checkout) { Alert.alert('Invalid', 'Check-out must be after check-in.'); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('listing_id', String(selectedListing));
      form.append('guest_name', guestName.trim());
      form.append('checkin_date', formatDate(checkin));
      form.append('checkout_date', formatDate(checkout));
      if (price) form.append('price_per_night', price);
      if (guestPhoto) {
        form.append('guest_photo', { uri: guestPhoto.uri, name: 'guest.jpg', type: 'image/jpeg' } as any);
      }
      const res = await fetch(API.reservationUpdate(Number(id)), { method:'POST', body: form });
      if (res.ok) {
        Alert.alert('Success', 'Reservation updated!', [{ text:'OK', onPress:()=>router.back() }]);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Something went wrong');
      }
    } catch(e) { Alert.alert('Error', 'Network error. Is the server running?'); }
    finally { setLoading(false); }
  };

  const deleteRes = () => {
    Alert.alert('Delete Reservation', `Delete reservation for "${guestName}"?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        setLoading(true);
        try {
          await fetch(API.reservationDelete(Number(id)), { method:'POST' });
          Alert.alert('Deleted', 'Reservation deleted.', [{ text:'OK', onPress:()=>router.back() }]);
        } catch(e) { Alert.alert('Error', 'Failed to delete.'); }
        finally { setLoading(false); }
      }}
    ]);
  };

  if (initialLoading) return (
    <View style={s.container}>
      <Header title="Edit Booking" showBack />
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="small" color="#1e293b" />
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <Header title="Edit Booking" showBack />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.photoHero} onPress={pickPhoto} activeOpacity={0.9}>
          {guestPhoto ? (
            <Image source={{ uri: guestPhoto.uri }} style={s.heroImage} />
          ) : existingPhotoUrl ? (
            <Image source={{ uri: API.base + existingPhotoUrl }} style={s.heroImage} />
          ) : (
            <View style={s.heroPlaceholder}>
              <View style={s.heroIconCircle}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <Text style={s.heroPlaceholderTitle}>Add a guest photo</Text>
              <Text style={s.heroPlaceholderSub}>Tap to choose from gallery</Text>
            </View>
          )}
          {(guestPhoto || existingPhotoUrl) && (
            <View style={s.heroOverlay}>
              <TouchableOpacity style={s.heroChangeBtn} onPress={pickPhoto}>
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={s.heroChangeText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.fieldsSection}>
          <View style={s.fieldRow}>
            <View style={s.fieldIcon}>
              <Ionicons name="home-outline" size={17} color="#1e293b" />
            </View>
            {selectedListing ? (
              <TouchableOpacity style={s.fieldContent} onPress={() => { setSelectedListing(null); setListingSearch(''); }}>
                <Text style={s.fieldLabel}>Listing</Text>
                <View style={s.selectedRow}>
                  <Text style={s.selectedText} numberOfLines={1}>{selectedListingTitle}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={s.fieldContent}>
                <Text style={s.fieldLabel}>Listing</Text>
                <TextInput style={s.inlineInput} value={listingSearch} onChangeText={setListingSearch} placeholder="Search or select a room..." placeholderTextColor="#94a3b8" />
                {filteredListings.length > 0 && !listingSearch && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} keyboardShouldPersistTaps="handled">
                    {filteredListings.map(l => (
                      <TouchableOpacity key={l.id} style={s.chip} onPress={() => setSelectedListing(l.id)}>
                        <Text style={s.chipText}>{l.room_title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {listingSearch.length > 0 && filteredListings.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} keyboardShouldPersistTaps="handled">
                    {filteredListings.map(l => (
                      <TouchableOpacity key={l.id} style={s.chip} onPress={() => setSelectedListing(l.id)}>
                        <Text style={s.chipText}>{l.room_title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          <View style={s.divider} />

          <View style={s.fieldRow}>
            <View style={s.fieldIcon}>
              <Ionicons name="person-outline" size={17} color="#1e293b" />
            </View>
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Guest</Text>
              <TextInput style={s.inlineInput} value={guestName} onChangeText={setGuestName} placeholder="Full name" placeholderTextColor="#94a3b8" />
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.fieldRow}>
            <View style={s.fieldIcon}>
              <Ionicons name="calendar-outline" size={17} color="#1e293b" />
            </View>
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Stay</Text>
              <View style={s.datePair}>
                <TouchableOpacity style={s.datePill} onPress={() => setShowCheckin(true)}>
                  <Text style={s.datePillLabel}>Check-in</Text>
                  <Text style={s.datePillValue}>{displayDate(checkin)}</Text>
                </TouchableOpacity>
                <View style={s.dateDivider}>
                  <Text style={s.dateArrow}>→</Text>
                  <Text style={s.nightsCount}>{nightCount} {nightCount === 1 ? 'night' : 'nights'}</Text>
                </View>
                <TouchableOpacity style={s.datePill} onPress={() => setShowCheckout(true)}>
                  <Text style={s.datePillLabel}>Check-out</Text>
                  <Text style={s.datePillValue}>{displayDate(checkout)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showCheckin && (
            <DateTimePicker value={checkin} mode="date" display={Platform.OS==='ios'?'spinner':'default'}
              onChange={(_, d) => { setShowCheckin(false); if(d) setCheckin(d); }} />
          )}
          {showCheckout && (
            <DateTimePicker value={checkout} mode="date" display={Platform.OS==='ios'?'spinner':'default'}
              onChange={(_, d) => { setShowCheckout(false); if(d) { if (d > checkin) setCheckout(d); else Alert.alert('Invalid', 'Check-out must be after check-in.'); } }} minimumDate={checkin} />
          )}

          <View style={s.divider} />

          <View style={s.fieldRow}>
            <View style={s.fieldIcon}>
              <Ionicons name="cash-outline" size={17} color="#1e293b" />
            </View>
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Price</Text>
              <View style={s.priceRow}>
                <Text style={s.dollarSign}>$</Text>
                <TextInput style={[s.inlineInput, s.priceInput]} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" />
                <Text style={s.perNight}>/ night</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[s.submitBtn, loading && s.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Update Booking</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={deleteRes} disabled={loading}>
          <Ionicons name="trash-outline" size={13} color="#e74c3c" />
          <Text style={s.deleteText}>Delete Booking</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  body: { paddingBottom: 40 },

  photoHero: { width: '100%', height: 260, backgroundColor: '#f5f6f8', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  heroPlaceholderSub: { fontSize: 12, color: '#94a3b8' },
  heroOverlay: { position: 'absolute', bottom: 12, right: 12 },
  heroChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(30,41,59,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  heroChangeText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  fieldsSection: { backgroundColor: '#fff', marginTop: 2, paddingHorizontal: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 12 },
  fieldIcon: { width: 28, alignItems: 'center', marginTop: 2 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  inlineInput: { fontSize: 14, color: '#1e293b', fontWeight: '500', paddingVertical: 2, margin: 0 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 40 },

  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedText: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1 },

  chipRow: { marginTop: 6, flexDirection: 'row' },
  chip: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  chipText: { fontSize: 12, color: '#1e293b', fontWeight: '600' },

  datePair: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datePill: { flex: 1, backgroundColor: '#f8f9fc', borderRadius: 10, padding: 10, alignItems: 'center' },
  datePillLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  datePillValue: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  dateDivider: { alignItems: 'center', paddingHorizontal: 2 },
  dateArrow: { fontSize: 14, color: '#cbd5e1', fontWeight: '600' },
  nightsCount: { fontSize: 8, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginRight: 2 },
  priceInput: { flex: 1 },
  perNight: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  submitBtn: { backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 16, marginTop: 20, padding: 15, alignItems: 'center', shadowColor: '#1e293b', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, marginHorizontal: 16, marginTop: 10, padding: 13, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  deleteText: { color: '#e74c3c', fontSize: 13, fontWeight: '600' },
});
