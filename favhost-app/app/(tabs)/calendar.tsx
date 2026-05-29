import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing, Reservation } from '../../types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BAR_COLORS = ['#d4a574', '#5bc8c8', '#7b9fd4', '#7bcf9e', '#e8837d', '#a87bcc', '#e8a87d', '#7bbfcf'];
const COL_WIDTH = 38;
const LABEL_WIDTH = 110;
const ROW_HEIGHT = 42;
const MAX_WIDTH = 700;

export default function CalendarScreen() {
  const { width: winW } = useWindowDimensions();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selection, setSelection] = useState<{
    listingId: number;
    startDay: number;
    endDay: number | null;
  } | null>(null);

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        fetch(API.listings),
        fetch(API.reservations(month, year)),
      ]);
      setListings((await lRes.json()).listings || []);
      setReservations((await rRes.json()).reservations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [month, year]));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : -1;

  const prevMonth = () => { setReservations([]); if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { setReservations([]); if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const isToday = (d: number) => d === todayDay;

  const getReservationBars = (listing: Listing) => {
    return reservations
      .filter(r => r.listing_id === listing.id)
      .map(r => {
        const checkin = new Date(r.checkin_date);
        const checkout = new Date(r.checkout_date);
        const startDay = checkin.getMonth() + 1 === month && checkin.getFullYear() === year
          ? checkin.getDate()
          : 1;
        const endDay = checkout.getMonth() + 1 === month && checkout.getFullYear() === year
          ? checkout.getDate()
          : daysInMonth;
        const span = Math.max(1, endDay - startDay);
        return { ...r, startDay, span };
      });
  };

  const navigateToBooking = (listingId: number, startDay: number, endDay: number) => {
    const start = Math.min(startDay, endDay);
    const end = Math.max(startDay, endDay);
    const checkin = `${year}-${String(month).padStart(2, '0')}-${String(start).padStart(2, '0')}`;
    const checkoutRaw = new Date(year, month - 1, end + 1);
    const checkout = `${checkoutRaw.getFullYear()}-${String(checkoutRaw.getMonth() + 1).padStart(2, '0')}-${String(checkoutRaw.getDate()).padStart(2, '0')}`;
    router.push(`/reservations/add/?listing_id=${listingId}&checkin=${checkin}&checkout=${checkout}`);
  };

  const handleDayPress = (listingId: number, day: number) => {
    if (!selection) return;

    if (selection.endDay !== null) {
      setSelection({ listingId, startDay: day, endDay: null });
      return;
    }

    if (day === selection.startDay && selection.listingId === listingId) {
      navigateToBooking(listingId, day, day);
      setSelection(null);
      return;
    }

    setSelection(prev => prev ? { ...prev, endDay: day } : null);
    const start = Math.min(selection.startDay, day);
    const end = Math.max(selection.startDay, day);
    navigateToBooking(listingId, start, end);
    setSelection(null);
  };

  const handleDayLongPress = (listingId: number, day: number) => {
    setSelection({ listingId, startDay: day, endDay: null });
  };

  const isDaySelected = (listingId: number, day: number) => {
    if (!selection || selection.listingId !== listingId) return false;
    if (selection.endDay === null) return day === selection.startDay;
    const lo = Math.min(selection.startDay, selection.endDay);
    const hi = Math.max(selection.startDay, selection.endDay);
    return day >= lo && day <= hi;
  };

  const [showStats, setShowStats] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const dropdownMonths = useMemo(() => {
    const items = [];
    for (let i = -2; i <= 2; i++) {
      let m = month + i;
      let y = year;
      if (m < 1) { m += 12; y -= 1; }
      if (m > 12) { m -= 12; y += 1; }
      items.push({ month: m, year: y, label: `${MONTH_NAMES[m - 1]} ${y}`, isCurrent: m === month && y === year });
    }
    return items;
  }, [month, year]);

  const statsData = useMemo(() => {
    const totalListings = listings.length;
    if (totalListings === 0) return null;

    const ranges = [
      { start: 1, end: 10 },
      { start: 11, end: 20 },
      { start: 21, end: daysInMonth },
    ];

    const columns = ranges.map(r => `${r.start}–${r.end}`);
    const bookings: number[] = [];
    const available: number[] = [];
    const occupancy: number[] = [];

    for (const range of ranges) {
      const rangeStart = new Date(year, month - 1, range.start);
      const rangeEnd = new Date(year, month - 1, range.end);
      const daysInRange = range.end - range.start + 1;

      let bookingsCount = 0;
      let bookedNights = 0;

      for (const res of reservations) {
        const checkin = new Date(res.checkin_date);
        const checkout = new Date(res.checkout_date);

        if (checkin <= rangeEnd && checkout > rangeStart) {
          bookingsCount++;
          const overlapStart = checkin > rangeStart ? checkin : rangeStart;
          const overlapEndEnd = new Date(rangeEnd.getTime() + 86400000);
          const overlapEnd = checkout < overlapEndEnd ? checkout : overlapEndEnd;
          const diff = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
          bookedNights += Math.max(0, diff);
        }
      }

      const totalRoomNights = totalListings * daysInRange;
      bookings.push(bookingsCount);
      available.push(Math.max(totalRoomNights - bookedNights, 0));
      occupancy.push(totalRoomNights > 0 ? Math.round((bookedNights / totalRoomNights) * 100) : 0);
    }

    return { columns, bookings, available, occupancy, totalListings };
  }, [listings, reservations, month, year, daysInMonth]);

  const getOccColor = (val: number) => {
    if (val >= 70) return '#e74c3c';
    if (val >= 50) return '#d4a574';
    return '#5bc8c8';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={s.container}>
      <Header title="Calendar" />

      <View style={[s.subHeader, { alignSelf: 'center', maxWidth: MAX_WIDTH, width: '100%' }]}>
        <View style={{ width: 36 }} />
        <View style={s.subHeaderCenter}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMonthDropdown(true)} style={s.monthDropdownTrigger}>
            <Text style={s.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
            <Ionicons name="chevron-down" size={10} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setShowStats(true)} style={s.statsBtn}>
          <Ionicons name="bar-chart-outline" size={15} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Modal visible={showMonthDropdown} transparent animationType="fade" onRequestClose={() => setShowMonthDropdown(false)}>
        <TouchableOpacity style={s.dropdownOverlay} activeOpacity={1} onPress={() => setShowMonthDropdown(false)}>
          <View style={s.dropdown}>
            {dropdownMonths.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.dropdownItem, item.isCurrent && s.dropdownItemCurrent]}
                onPress={() => { setReservations([]); setMonth(item.month); setYear(item.year); setShowMonthDropdown(false); }}
              >
                <Text style={[s.dropdownItemText, item.isCurrent && s.dropdownItemTextCurrent]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {selection !== null && (
        <View style={s.selectionHint}>
          <Text style={s.selectionHintText}>
            {selection.endDay === null
              ? `Tap a check-out day (or tap again to book 1 night)`
              : `Tap end day`}
          </Text>
          <TouchableOpacity onPress={() => setSelection(null)} style={s.selectionCancel}>
            <Text style={s.selectionCancelText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#d4a574" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={s.labelColumn}>
            <View style={[s.labelHeaderCell, { height: ROW_HEIGHT }]}>
              <Text style={s.headerCornerText}>Listings</Text>
            </View>
            {listings.map((listing, li) => (
              <View key={listing.id} style={[s.labelCell, { height: ROW_HEIGHT }, li % 2 === 0 && s.labelCellEven]}>
                <Avatar imageUrl={listing.image_url} name={listing.room_title} size={22} />
                <Text style={s.labelText} numberOfLines={1}>{listing.room_title}</Text>
              </View>
            ))}
            {listings.length === 0 && (
              <View style={{ height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>No listings</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <View>
              <View style={[s.headerRow, { height: ROW_HEIGHT }]}>
                {days.map(d => (
                  <View key={String(d)} style={[s.dayHeaderCell, isToday(d) && s.todayHeader]}>
                    <Text style={[s.dayNum, isToday(d) && s.todayNum]}>{d}</Text>
                    <Text style={s.daySubLabel}>
                      {new Date(year, month - 1, d).toLocaleDateString('en', { weekday: 'short' }).slice(0, 3).toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>

              {listings.map((listing, li) => {
                const bars = getReservationBars(listing);
                const color = BAR_COLORS[li % BAR_COLORS.length];
                return (
                  <View key={listing.id} style={[s.listingRow, { height: ROW_HEIGHT }, li % 2 === 0 && s.listingRowEven]}>
                    {days.map(d => {
                      const selected = isDaySelected(listing.id, d);
                      return (
                        <TouchableOpacity
                          key={String(d)}
                          activeOpacity={selection ? 0.6 : 1}
                          onPress={() => handleDayPress(listing.id, d)}
                          onLongPress={() => handleDayLongPress(listing.id, d)}
                          delayLongPress={1000}
                          style={[
                            s.dayCell,
                            isToday(d) && s.todayCell,
                            selected && s.selectedCell,
                          ]}
                        />
                      );
                    })}
                    {bars.map(bar => (
                      <TouchableOpacity
                        key={bar.id}
                        onPress={() => router.push(`/reservations/${bar.id}/edit`)}
                        style={[
                          s.resBar,
                          {
                            left: (bar.startDay - 1) * COL_WIDTH + COL_WIDTH / 2,
                            width: bar.span * COL_WIDTH - 4,
                            backgroundColor: color,
                          }
                        ]}
                      >
                        <Avatar imageUrl={bar.guest_photo_url} name={bar.guest_name} size={16} />
                        <Text style={s.barName} numberOfLines={1}>{bar.guest_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}

              {listings.length === 0 && (
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>No listings yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <Modal visible={showStats} transparent animationType="fade" onRequestClose={() => setShowStats(false)}>
        <TouchableOpacity style={s.statsOverlay} activeOpacity={1} onPress={() => setShowStats(false)}>
          <View style={s.statsPopup}>
            <View style={s.statsHeader}>
              <Text style={s.statsTitle}>{MONTH_NAMES[month - 1]} Overview</Text>
              <TouchableOpacity onPress={() => setShowStats(false)} style={s.statsCloseBtn}>
                <Ionicons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {statsData ? (
              <>
                <View style={s.statsTable}>
                  <View style={s.statsRow}>
                    <Text style={[s.statsLabel, s.statsLabelHeader]}></Text>
                    {statsData.columns.map(col => (
                      <Text key={col} style={[s.statsCell, s.statsCellHeader]}>{col}</Text>
                    ))}
                  </View>
                  <View style={s.statsRow}>
                    <Text style={s.statsLabel}>Bookings</Text>
                    {statsData.bookings.map((val, i) => (
                      <Text key={i} style={s.statsCell}>{val}</Text>
                    ))}
                  </View>
                  <View style={s.statsRow}>
                    <Text style={s.statsLabel}>Available</Text>
                    {statsData.available.map((val, i) => (
                      <Text key={i} style={s.statsCell}>{val}</Text>
                    ))}
                  </View>
                  <View style={[s.statsRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.statsLabel}>Occupancy</Text>
                    {statsData.occupancy.map((val, i) => (
                      <Text key={i} style={[s.statsCell, s.statsCellBold, { color: getOccColor(val) }]}>{val}%</Text>
                    ))}
                  </View>
                </View>
                <View style={s.statsFooter}>
                  <Text style={s.statsFooterText}>{statsData.totalListings} listings · {MONTH_NAMES[month - 1]}</Text>
                </View>
              </>
            ) : (
              <View style={s.statsEmpty}>
                <Ionicons name="bar-chart-outline" size={28} color="#e2e8f0" />
                <Text style={s.statsEmptyText}>No data available</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <TouchableOpacity style={s.fab} onPress={() => router.push('/reservations/add')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  subHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', elevation: 2, shadowColor: '#1e293b', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  subHeaderCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flex: 1 },
  navBtn: { padding: 6 },
  navArrow: { fontSize: 18, color: '#1e293b', fontWeight: '700' },
  monthTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', letterSpacing: -0.2 },
  monthDropdownTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8f9fc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 120, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statsBtn: { width: 36, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fc', marginRight: 8 },
  dropdownOverlay: { flex: 1, justifyContent: 'flex-start', paddingTop: 120, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.3)' },
  dropdown: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8, minWidth: 200, borderWidth: 1, borderColor: '#cbd5e1' },
  dropdownItem: { paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dropdownItemCurrent: { backgroundColor: '#f8f9fc' },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  dropdownItemTextCurrent: { color: '#94a3b8' },
  selectionHint: { backgroundColor: '#fef3e7', paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#d4a574' },
  selectionHintText: { fontSize: 11, color: '#1e293b', fontWeight: '500', flex: 1 },
  selectionCancel: { paddingLeft: 12 },
  selectionCancelText: { fontSize: 11, color: '#e74c3c', fontWeight: '600' },
  labelColumn: { width: LABEL_WIDTH, zIndex: 10, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#cbd5e1' },
  labelHeaderCell: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f3f5', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  headerCornerText: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  labelCell: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  labelCellEven: { backgroundColor: '#f8fafc' },
  labelText: { fontSize: 11, color: '#1e293b', fontWeight: '600', flex: 1 },
  headerRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  dayHeaderCell: { width: COL_WIDTH, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#cbd5e1', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', backgroundColor: '#f1f3f5' },
  todayHeader: { backgroundColor: '#fef3e7', borderBottomColor: '#d4a574' },
  dayNum: { fontSize: 11, fontWeight: '600', color: '#1e293b' },
  daySubLabel: { fontSize: 8, color: '#64748b', fontWeight: '600' },
  todayNum: { color: '#d4a574', fontWeight: '800' },
  listingRow: { flexDirection: 'row', position: 'relative' },
  listingRowEven: { backgroundColor: '#f8fafc' },
  dayCell: { width: COL_WIDTH, height: ROW_HEIGHT, borderRightWidth: 1, borderRightColor: '#cbd5e1', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  todayCell: { backgroundColor: '#fefcf9' },
  selectedCell: { backgroundColor: '#fef3e7' },
  resBar: { position: 'absolute', top: 7, height: 28, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4, zIndex: 3, overflow: 'hidden', shadowColor: '#1e293b', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  barName: { fontSize: 10, color: '#fff', fontWeight: '600', flex: 1 },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  statsOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center' },
  statsPopup: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10, minWidth: 300 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  statsTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', letterSpacing: -0.2 },
  statsCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' },
  statsTable: { paddingHorizontal: 4 },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statsLabel: { paddingVertical: 10, paddingHorizontal: 14, fontWeight: '600', color: '#1e293b', fontSize: 12, minWidth: 100 },
  statsLabelHeader: { backgroundColor: '#fafafa', color: '#64748b', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsCell: { paddingVertical: 10, paddingHorizontal: 10, textAlign: 'center', fontSize: 13, color: '#1e293b', fontWeight: '500', minWidth: 64, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  statsCellHeader: { backgroundColor: '#fafafa', color: '#64748b', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsCellBold: { fontWeight: '700' },
  statsFooter: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#f1f3f5', borderTopWidth: 1, borderTopColor: '#cbd5e1', alignItems: 'flex-end' },
  statsFooterText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  statsEmpty: { padding: 40, alignItems: 'center', gap: 8 },
  statsEmptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e293b', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '400', lineHeight: 30 },
});
