import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) return reservations;
    const q = searchQuery.toLowerCase();
    return reservations.filter(r =>
      r.guest_name?.toLowerCase().includes(q) ||
      r.listing_title?.toLowerCase().includes(q) ||
      r.checkin_date?.includes(q) ||
      r.checkout_date?.includes(q)
    );
  }, [reservations, searchQuery]);

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
      <Header title="Reservations" />
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#bbb" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by guest, listing, or date..."
          placeholderTextColor="#bbb"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <Ionicons name="close-circle" size={16} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredReservations}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchReservations();}} tintColor="#555558" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={searchQuery ? "search-outline" : "calendar-outline"} size={36} color="#ddd" />
            <Text style={styles.emptyText}>{searchQuery ? 'No reservations match your search' : 'No reservations found'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const today = new Date();
          const checkin = new Date(item.checkin_date);
          const checkout = new Date(item.checkout_date);
          let status, statusColor, statusBg;
          if (today < checkin) { status = 'Upcoming'; statusColor = '#d4a574'; statusBg = '#fef7ec'; }
          else if (today >= checkin && today < checkout) { status = 'Active'; statusColor = '#5fa8b0'; statusBg = '#edf7f8'; }
          else { status = 'Completed'; statusColor = '#94a3b8'; statusBg = '#f1f4f7'; }

          return (
          <TouchableOpacity onPress={() => router.push(`/reservations/${item.id}/edit`)} activeOpacity={0.7}>
            <View style={styles.card}>
              <View style={styles.accent} />
              <View style={styles.cardBody}>
                <View style={styles.topSection}>
                  <View style={styles.guestSection}>
                    <Avatar imageUrl={item.guest_photo_url} name={item.guest_name} size={36} />
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName} numberOfLines={1}>{item.guest_name}</Text>
                      <View style={styles.listingRow}>
                        <Ionicons name="home-outline" size={10} color="#aaa" />
                        <Text style={styles.listingName} numberOfLines={1}>{item.listing_title}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.topActions}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteReservation(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={15} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.dateSection}>
                  <Ionicons name="calendar-outline" size={13} color="#888" />
                  <Text style={styles.dates}>{formatDate(item.checkin_date)} – {formatDate(item.checkout_date)}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.nightsText}>{item.nights} {item.nights === 1 ? 'night' : 'nights'}</Text>
                </View>
                {item.price_per_night && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.priceSection}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <Text style={styles.priceValue}>${item.price_per_night} <Text style={styles.pricePer}>/ night</Text></Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/reservations/add')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  list: { padding: 14, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, shadowColor: '#1e293b', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4, overflow: 'hidden' },
  accent: { height: 3, backgroundColor: '#1e293b' },
  cardBody: { padding: 14 },
  topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  guestSection: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 16, fontWeight: '700', color: '#1e293b', letterSpacing: -0.2 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  listingName: { fontSize: 12, color: '#64748b', flex: 1 },
  topActions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  dateSection: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 2 },
  dates: { fontSize: 12, color: '#475569', fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1' },
  nightsText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  priceSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  priceValue: { fontSize: 18, fontWeight: '800', color: '#d4a574', letterSpacing: -0.3 },
  pricePer: { fontSize: 11, fontWeight: '400', color: '#94a3b8', letterSpacing: 0 },
  empty: { padding: 60, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, color: '#aaa' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10, marginBottom: 4, borderRadius: 12, paddingHorizontal: 12, height: 40, shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', height: '100%' },
  searchClear: { padding: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e293b', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '400', lineHeight: 30 },
});
