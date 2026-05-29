import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Reservation } from '../../types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en', { month:'short', day:'numeric', year:'2-digit' });
}

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = async () => {
    try {
      const res = await fetch(API.reservations());
      const data = await res.json();
      setReservations(data.reservations || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchReservations(); }, []));

  const deleteReservation = (res: Reservation) => {
    Alert.alert('Delete', `Delete reservation for "${res.guest_name}"?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        await fetch(API.reservationDelete(res.id), { method:'POST' });
        fetchReservations();
      }}
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Header title="Reservations" rightLabel="＋ Add" onRight={() => router.push('/reservations/add')} />
      <FlatList
        data={reservations}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchReservations();}} tintColor="#00b4b4" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No reservations found</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar imageUrl={item.guest_photo_url} name={item.guest_name} size={36} />
            <View style={styles.info}>
              <Text style={styles.guestName}>{item.guest_name}</Text>
              <Text style={styles.listingName} numberOfLines={1}>{item.listing_title}</Text>
              <Text style={styles.dates}>{formatDate(item.checkin_date)} → {formatDate(item.checkout_date)} · {item.nights}n</Text>
            </View>
            {item.price_per_night && (
              <Text style={styles.price}>${item.price_per_night}/n</Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => router.push(`/reservations/${item.id}/edit`)} style={styles.actionBtn}>
                <Text style={styles.editText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteReservation(item)} style={styles.actionBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f8f8f8' },
  list: { padding:10 },
  card: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:10, padding:10, marginBottom:8, borderWidth:1, borderColor:'#f0f0f0', gap:10 },
  info: { flex:1 },
  guestName: { fontSize:13, fontWeight:'600', color:'#222' },
  listingName: { fontSize:11, color:'#888', marginTop:1 },
  dates: { fontSize:10, color:'#aaa', marginTop:2 },
  price: { fontSize:11, fontWeight:'600', color:'#00b4b4' },
  actions: { flexDirection:'column', gap:6 },
  actionBtn: { width:26, height:26, borderRadius:13, backgroundColor:'#f5f5f5', alignItems:'center', justifyContent:'center' },
  editText: { fontSize:13, color:'#00b4b4' },
  deleteText: { fontSize:12, color:'#e74c3c' },
  empty: { padding:60, alignItems:'center' },
  emptyText: { fontSize:13, color:'#aaa' },
});
