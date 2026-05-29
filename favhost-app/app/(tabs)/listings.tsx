import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing } from '../../types';

export default function ListingsScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      <Header title="Listings" rightLabel="＋ Add" onRight={() => router.push('/listings/add')} />
      <FlatList
        data={listings}
        keyExtractor={i => String(i.id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchListings();}} tintColor="#00b4b4" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/listings/add')}>
              <Text style={styles.addBtnText}>＋ Add Listing</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar imageUrl={item.image_url} name={item.room_title} size={44} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.room_title}</Text>
              <Text style={styles.cardSub}>{item.reservation_count ?? 0} reservations</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => router.push(`/listings/${item.id}/edit`)} style={styles.actionBtn}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteListing(item)} style={styles.actionBtn}>
                <Text style={styles.deleteText}>Del</Text>
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
  row: { gap:10, marginBottom:10 },
  card: { flex:1, backgroundColor:'#fff', borderRadius:10, padding:10, borderWidth:1, borderColor:'#f0f0f0', flexDirection:'row', alignItems:'center', gap:8 },
  cardBody: { flex:1 },
  cardTitle: { fontSize:12, fontWeight:'600', color:'#222' },
  cardSub: { fontSize:10, color:'#aaa', marginTop:2 },
  cardActions: { flexDirection:'column', gap:4 },
  actionBtn: { paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:'#f5f5f5' },
  editText: { fontSize:10, color:'#00b4b4', fontWeight:'500' },
  deleteText: { fontSize:10, color:'#e74c3c', fontWeight:'500' },
  empty: { flex:1, alignItems:'center', paddingTop:80, gap:12 },
  emptyTitle: { fontSize:14, color:'#aaa' },
  addBtn: { backgroundColor:'#00b4b4', paddingHorizontal:20, paddingVertical:9, borderRadius:20 },
  addBtnText: { color:'#fff', fontSize:13, fontWeight:'600' },
});
