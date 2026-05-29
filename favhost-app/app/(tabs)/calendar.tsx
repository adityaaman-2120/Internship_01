import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing, Reservation } from '../../types';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const BAR_COLORS = ['#5bc8c8','#e8837d','#7b9fd4','#7bcf9e','#e8a87d','#a87bcc','#e8c87d','#7bbfcf'];
const COL_WIDTH = 38;
const LABEL_WIDTH = 110;
const ROW_HEIGHT = 42;

export default function CalendarScreen() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        fetch(API.listings),
        fetch(API.reservations(month, year)),
      ]);
      setListings((await lRes.json()).listings || []);
      setReservations((await rRes.json()).reservations || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [month, year]));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : -1;

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const getReservationBars = (listing: Listing) => {
    return reservations
      .filter(r => r.listing_id === listing.id)
      .map(r => {
        const checkin = new Date(r.checkin_date);
        const checkout = new Date(r.checkout_date);
        const startDay = checkin.getMonth()+1 === month && checkin.getFullYear()===year
          ? checkin.getDate()
          : 1;
        const endDay = checkout.getMonth()+1 === month && checkout.getFullYear()===year
          ? checkout.getDate()
          : daysInMonth;
        const span = Math.max(1, endDay - startDay);
        return { ...r, startDay, span };
      });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Header title="Calendar" rightLabel="＋ Add" onRight={() => router.push('/reservations/add')} />
      
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[month-1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchData();}} tintColor="#00b4b4" />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.headerRow}>
              <View style={[styles.labelCell, styles.headerCell]}>
                <Text style={styles.headerCornerText}>Listings</Text>
              </View>
              {days.map(d => (
                <View key={String(d)} style={[styles.dayHeaderCell, d===todayDay && styles.todayHeader]}>
                  <Text style={[styles.dayNum, d===todayDay && styles.todayNum]}>{d}</Text>
                  <Text style={styles.daySubLabel}>
                    {new Date(year, month-1, d).toLocaleDateString('en',{weekday:'short'}).slice(0,2).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {listings.map((listing, li) => {
              const bars = getReservationBars(listing);
              const color = BAR_COLORS[li % BAR_COLORS.length];
              return (
                <View key={listing.id} style={styles.listingRow}>
                  <View style={styles.labelCell}>
                    <Avatar imageUrl={listing.image_url} name={listing.room_title} size={22} />
                    <Text style={styles.labelText} numberOfLines={1}>{listing.room_title}</Text>
                  </View>
                  
                  <View style={styles.dayCells}>
                    {days.map(d => (
                      <View key={String(d)} style={[styles.dayCell, d===todayDay && styles.todayCell]} />
                    ))}
                    
                    {bars.map(bar => (
                      <TouchableOpacity
                        key={bar.id}
                        onPress={() => router.push(`/reservations/${bar.id}/edit`)}
                        style={[
                          styles.resBar,
                          {
                            left: (bar.startDay - 1) * COL_WIDTH,
                            width: bar.span * COL_WIDTH - 4,
                            backgroundColor: color,
                          }
                        ]}
                      >
                        <Avatar imageUrl={bar.guest_photo_url} name={bar.guest_name} size={16} />
                        <Text style={styles.barName} numberOfLines={1}>{bar.guest_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            {listings.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No listings yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f8f8f8' },
  subHeader: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:16, backgroundColor:'#1a1a2e', paddingVertical:8 },
  navBtn: { padding:6 },
  navArrow: { fontSize:18, color:'#ccc' },
  monthTitle: { fontSize:13, fontWeight:'600', color:'#fff', minWidth:120, textAlign:'center' },
  headerRow: { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#e8e8e8' },
  headerCell: { borderRightWidth:1, borderRightColor:'#e8e8e8' },
  headerCornerText: { fontSize:10, color:'#aaa', fontWeight:'500' },
  dayHeaderCell: { width:COL_WIDTH, alignItems:'center', paddingVertical:4, borderRightWidth:1, borderRightColor:'#f0f0f0' },
  todayHeader: { backgroundColor:'#f0f9ff' },
  dayNum: { fontSize:11, fontWeight:'600', color:'#333' },
  daySubLabel: { fontSize:8, color:'#bbb' },
  todayNum: { color:'#0ea5e9' },
  listingRow: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#f0f0f0', height:ROW_HEIGHT },
  labelCell: { width:LABEL_WIDTH, flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:8, backgroundColor:'#fff', borderRightWidth:1, borderRightColor:'#e8e8e8', zIndex:5 },
  labelText: { fontSize:11, color:'#555', flex:1 },
  dayCells: { flexDirection:'row', position:'relative', height:ROW_HEIGHT },
  dayCell: { width:COL_WIDTH, height:ROW_HEIGHT, borderRightWidth:1, borderRightColor:'#f5f5f5' },
  todayCell: { backgroundColor:'#f0f9ff' },
  resBar: { position:'absolute', top:7, height:28, borderRadius:14, flexDirection:'row', alignItems:'center', paddingHorizontal:6, gap:4, zIndex:3, overflow:'hidden' },
  barName: { fontSize:10, color:'#fff', fontWeight:'500', flex:1 },
  emptyState: { padding:40, alignItems:'center' },
  emptyText: { fontSize:13, color:'#aaa' },
});
