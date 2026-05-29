import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import ReservationPill from '../../components/ReservationPill';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing, Reservation } from '../../types';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['#5bc8c8', '#e8837d', '#7b9fd4', '#7bcf9e', '#e8a87d', '#a87bcc'];

export default function DashboardScreen() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        fetch(API.listings),
        fetch(API.reservations(month, year, selectedListing?.id)),
      ]);
      const lData = await lRes.json();
      const rData = await rRes.json();
      setListings(lData.listings || []);
      setReservations(rData.reservations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [month, year, selectedListing]));

  // Build month grid (weeks array, Sunday-first)
  const buildGrid = () => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  };

  const getReservationsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.filter(r => r.checkin_date <= dateStr && r.checkout_date > dateStr);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  if (loading) return <LoadingSpinner />;

  const weeks = buildGrid();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Header title="Dashboard" rightLabel="＋ Add" onRight={() => router.push('/reservations/add')} />

      <View style={styles.body}>
        {/* LEFT SIDEBAR */}
        <View style={styles.sidebar}>
          <FlatList
            data={listings}
            keyExtractor={i => String(i.id)}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.sidebarLabel}>LISTINGS</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listingItem, selectedListing?.id === item.id && styles.listingItemActive]}
                onPress={() => setSelectedListing(selectedListing?.id === item.id ? null : item)}
              >
                <Avatar imageUrl={item.image_url} name={item.room_title} size={30} />
                <Text style={styles.listingTitle} numberOfLines={1}>{item.room_title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* RIGHT CALENDAR */}
        <View style={styles.calendarArea}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
          </View>

          {/* Grid */}
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#00b4b4" />}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.emptyCell} />;
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;
                  const dayReservations = getReservationsForDay(day);
                  return (
                    <View key={di} style={[styles.dayCell, isToday && styles.todayCell]}>
                      <Text style={[styles.dayNum, isToday && styles.todayNum]}>
                        {day}{isToday ? '\nToday' : ''}
                      </Text>
                      {dayReservations.slice(0, 2).map(r => (
                        <TouchableOpacity key={r.id} onPress={() => router.push(`/reservations/${r.id}/edit`)}>
                          <ReservationPill reservation={r} compact />
                        </TouchableOpacity>
                      ))}
                      {dayReservations.length > 2 && (
                        <Text style={styles.moreLabel}>+{dayReservations.length - 2} more</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 88, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#f0f0f0' },
  sidebarLabel: { fontSize: 9, color: '#bbb', fontWeight: '600', letterSpacing: 0.8, padding: 8, paddingBottom: 4 },
  listingItem: { alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  listingItemActive: { backgroundColor: '#e8fafa' },
  listingTitle: { fontSize: 9, color: '#666', marginTop: 4, textAlign: 'center' },
  calendarArea: { flex: 1 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 18, color: '#555', fontWeight: '300' },
  monthTitle: { fontSize: 13, fontWeight: '600', color: '#222' },
  dayHeaders: { flexDirection: 'row', backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: '#aaa', fontWeight: '500', paddingVertical: 5 },
  weekRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dayCell: { flex: 1, minHeight: 64, padding: 3, borderRightWidth: 1, borderRightColor: '#f5f5f5' },
  emptyCell: { flex: 1, minHeight: 64, backgroundColor: '#fafafa', borderRightWidth: 1, borderRightColor: '#f5f5f5' },
  todayCell: { backgroundColor: '#f0fafb' },
  dayNum: { fontSize: 10, color: '#aaa', marginBottom: 3, lineHeight: 13 },
  todayNum: { color: '#00b4b4', fontWeight: '700' },
  moreLabel: { fontSize: 9, color: '#aaa', marginTop: 1 },
});
