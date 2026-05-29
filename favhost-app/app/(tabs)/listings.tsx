import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing } from '../../types';

export default function ListingsScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase();
    return listings.filter(l =>
      l.room_title?.toLowerCase().includes(q)
    );
  }, [listings, searchQuery]);

  const fetchListings = async () => {
    try {
      const res = await fetch(API.listings);
      const data = await res.json();
      setListings(data.listings || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchListings(); }, []));

  const deleteListing = (listing: Listing) => {
    Alert.alert(
      'Delete Listing',
      `Delete "${listing.room_title}"? All its reservations will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await fetch(API.listingDelete(listing.id), { method:'POST' });
          fetchListings();
        }}
      ]
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Header title="Listings" />
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search listings..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <Ionicons name="close-circle" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredListings}
        keyExtractor={i => String(i.id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchListings();}} tintColor="#1e293b" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={searchQuery ? "search-outline" : "home-outline"} size={36} color="#ddd" />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No listings match your search' : 'No listings yet'}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/listings/add')}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/listings/${item.id}/edit`)} activeOpacity={0.7} style={{ flex: 1 }}>
            <View style={styles.card}>
              <View style={styles.accent} />
              {item.image_url ? (
                <Image source={{ uri: API.base + item.image_url }} style={styles.heroImage} />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="bed-outline" size={28} color="#cbd5e1" />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.room_title}</Text>
                <View style={styles.metaSection}>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                    <Text style={styles.metaText}>{item.reservation_count} {item.reservation_count === 1 ? 'reservation' : 'reservations'}</Text>
                  </View>
                  {item.created_at && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={11} color="#94a3b8" />
                      <Text style={styles.metaText}>Added {new Date(item.created_at).toLocaleDateString('en', { month:'short', year:'numeric' })}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.divider} />
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => router.push(`/listings/${item.id}/edit`)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={12} color="#d4a574" />
                    <Text style={[styles.actionLabel, { color: '#d4a574' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteListing(item)} style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="trash-outline" size={12} color="#e74c3c" />
                    <Text style={[styles.actionLabel, { color: '#e74c3c' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/listings/add')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  list: { padding: 14, paddingBottom: 30 },
  row: { gap: 10, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#1e293b', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  accent: { height: 3, backgroundColor: '#1e293b' },
  heroImage: { width: '100%', height: 100, resizeMode: 'cover' },
  heroPlaceholder: { height: 100, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', letterSpacing: -0.2 },
  metaSection: { marginTop: 6, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f8f9fc' },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 14, color: '#aaa' },
  addBtn: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '400' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e293b', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '400', lineHeight: 30 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10, marginBottom: 4, borderRadius: 12, paddingHorizontal: 12, height: 40, shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', height: '100%' },
  searchClear: { padding: 2 },
});
