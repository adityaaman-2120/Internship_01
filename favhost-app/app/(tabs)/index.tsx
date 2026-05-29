import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Modal, useWindowDimensions, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing, Reservation } from '../../types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GRID_PAD = 10;
const MAX_WIDTH = 700;

function getPrevMonth(y: number, m: number) {
  if (m === 1) return { year: y - 1, month: 12 };
  return { year: y, month: m - 1 };
}
function getNextMonth(y: number, m: number) {
  if (m === 12) return { year: y + 1, month: 1 };
  return { year: y, month: m + 1 };
}
function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const LOAD_CHUNK = 6;

export default function DashboardScreen() {
  const today = new Date();
  const todayStr = dateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [listings, setListings] = useState<Listing[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [monthList, setMonthList] = useState(() => {
    const items: { year: number; month: number }[] = [];
    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    for (let i = -6; i <= 6; i++) {
      let my = y;
      let mm = m + i;
      while (mm < 1) { mm += 12; my -= 1; }
      while (mm > 12) { mm -= 12; my += 1; }
      items.push({ year: my, month: mm });
    }
    return items;
  });

  const scrollRef = useRef<ScrollView>(null);
  const monthHeights = useRef<Record<string, number>>({});
  const monthPositions = useRef<{ key: string; y: number; label: string }[]>([]);
  const isAdjusting = useRef(false);
  const isLoadTopGuard = useRef(false);
  const isLoadBottomGuard = useRef(false);
  const monthListRef = useRef(monthList);
  monthListRef.current = monthList;
  const [needsAdjust, setNeedsAdjust] = useState(0);
  const [activeMonthKey, setActiveMonthKey] = useState(`${today.getFullYear()}-${today.getMonth() + 1}`);
  const activeMonthKeyRef = useRef('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth() + 1);
  const initialScrollDone = useRef(false);

  const { width: winW } = useWindowDimensions();
  const contentW = Math.min(winW, MAX_WIDTH);
  const DAY_W = (contentW - GRID_PAD * 2 - 4) / 7;

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        fetch(API.listings),
        fetch(`${API.base}/api/reservations/?all=true${selectedListing ? `&listing_id=${selectedListing.id}` : ''}`),
      ]);
      setListings((await lRes.json()).listings || []);
      setAllReservations((await rRes.json()).reservations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [selectedListing]));

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase().trim();
    return listings.filter(l => l.room_title.toLowerCase().includes(q));
  }, [listings, searchQuery]);

  const getReservationsForMonth = useCallback((year: number, month: number) => {
    return allReservations.filter(r => {
      const ciP = r.checkin_date.split('-').map(Number);
      const coP = r.checkout_date.split('-').map(Number);
      const ci = new Date(ciP[0], ciP[1] - 1, ciP[2]);
      const co = new Date(coP[0], coP[1] - 1, coP[2]);
      const mStart = new Date(year, month - 1, 1);
      const mEnd = new Date(year, month, 0);
      return ci <= mEnd && co > mStart;
    });
  }, [allReservations]);

  const getBookedDays = useCallback((year: number, month: number, reservations: Reservation[]) => {
    const set = new Set<string>();
    reservations.forEach(r => {
      const p = r.checkout_date.split('-').map(Number);
      const co = new Date(p[0], p[1] - 1, p[2]);
      const ci = new Date(p[0], p[1] - 1, p[2] - (r.nights || 1));
      for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
        set.add(dateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
      }
    });
    return set;
  }, []);

  const getResColor = (ci: string, co: string) => {
    const cp = co.split('-').map(Number);
    const coDate = new Date(cp[0], cp[1] - 1, cp[2]);
    const ip = ci.split('-').map(Number);
    const ciDate = new Date(ip[0], ip[1] - 1, ip[2]);
    if (coDate <= today) return '#9dd5d5';
    if (ciDate > today) return '#3a8a8a';
    return '#5bc8c8';
  };

  const getPriceOnDay = (reservations: Reservation[], year: number, month: number, day: number) => {
    const ds = dateStr(year, month, day);
    const r = reservations.find(r => r.checkout_date === ds && r.price_per_night);
    return r && r.price_per_night ? `$${parseFloat(r.price_per_night).toFixed(0)}` : null;
  };

  const isTodayCheck = (y: number, m: number, d: number) => dateStr(y, m, d) === todayStr;
  const isPastCheck = (y: number, m: number, d: number) => dateStr(y, m, d) < todayStr;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isAdjusting.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const threshold = 200;
    const ml = monthListRef.current;

    if (contentOffset.y < threshold && ml.length > 0 && !isLoadTopGuard.current) {
      isLoadTopGuard.current = true;
      isAdjusting.current = true;
      const first = ml[0];
      const newMs: { year: number; month: number }[] = [];
      let y = first.year;
      let m = first.month;
      for (let i = 0; i < LOAD_CHUNK; i++) {
        const prev = getPrevMonth(y, m);
        newMs.unshift(prev);
        y = prev.year;
        m = prev.month;
      }
      setMonthList(prev => [...newMs, ...prev]);
      setNeedsAdjust(n => n + 1);
    }

    if (contentOffset.y + layoutMeasurement.height > contentSize.height - threshold && !isLoadBottomGuard.current) {
      isLoadBottomGuard.current = true;
      const last = ml[ml.length - 1];
      const newMs: { year: number; month: number }[] = [];
      let y = last.year;
      let m = last.month;
      for (let i = 0; i < LOAD_CHUNK; i++) {
        const next = getNextMonth(y, m);
        newMs.push(next);
        y = next.year;
        m = next.month;
      }
      setMonthList(prev => [...prev, ...newMs]);
      setBottomLoadKey(n => n + 1);
    }

    const positions = monthPositions.current;
    if (positions.length > 0) {
      const viewCenter = contentOffset.y + layoutMeasurement.height / 2;
      let best = positions[0];
      for (const p of positions) {
        if (p.y <= viewCenter) best = p;
      }
      if (best.key !== activeMonthKeyRef.current) {
        activeMonthKeyRef.current = best.key;
        setActiveMonthKey(best.key);
      }
    }
  }, []);

  const handleMonthLayout = useCallback((key: string, label: string, e: LayoutChangeEvent) => {
    const { height, y } = e.nativeEvent.layout;
    monthHeights.current[key] = height;
    const idx = monthPositions.current.findIndex(p => p.key === key);
    const entry = { key, y, label };
    if (idx >= 0) {
      monthPositions.current[idx] = entry;
    } else {
      monthPositions.current.push(entry);
    }
    monthPositions.current.sort((a, b) => a.y - b.y);
  }, []);

  const scrollToMonthKey = useCallback((targetKey: string) => {
    const ml = monthListRef.current;
    const idx = ml.findIndex(m => `${m.year}-${m.month}` === targetKey);
    if (idx < 0) return false;
    let y = 0;
    for (let i = 0; i < idx; i++) {
      const m = ml[i];
      y += monthHeights.current[`${m.year}-${m.month}`] || MONTH_EST_H;
    }
    scrollRef.current?.scrollTo({ y, animated: true });
    return true;
  }, []);

  const goToToday = useCallback(() => {
    const key = `${today.getFullYear()}-${today.getMonth() + 1}`;
    if (!monthListRef.current.some(m => `${m.year}-${m.month}` === key)) {
      setMonthList(() => {
        const items: { year: number; month: number }[] = [];
        for (let i = -6; i <= 6; i++) {
          let mm = today.getMonth() + 1 + i;
          let my = today.getFullYear();
          while (mm < 1) { mm += 12; my -= 1; }
          while (mm > 12) { mm -= 12; my += 1; }
          items.push({ year: my, month: mm });
        }
        return items;
      });
    }
    requestAnimationFrame(() => { scrollToMonthKey(key); setActiveMonthKey(key); });
  }, [scrollToMonthKey]);

  const goToMonth = useCallback((year: number, month: number) => {
    const key = `${year}-${month}`;
    if (!monthListRef.current.some(m => m.year === year && m.month === month)) {
      setMonthList(() => {
        const items: { year: number; month: number }[] = [];
        for (let i = -12; i <= 12; i++) {
          let mm = month + i;
          let my = year;
          while (mm < 1) { mm += 12; my -= 1; }
          while (mm > 12) { mm -= 12; my += 1; }
          items.push({ year: my, month: mm });
        }
        return items;
      });
    }
    requestAnimationFrame(() => { scrollToMonthKey(key); setActiveMonthKey(key); });
    setShowMonthPicker(false);
  }, [scrollToMonthKey]);

  const MONTH_EST_H = 340;
  useEffect(() => {
    if (needsAdjust > 0) {
      const timer = setTimeout(() => {
        let totalHeight = 0;
        for (let i = 0; i < LOAD_CHUNK; i++) {
          const ym = monthList[i];
          if (!ym) continue;
          const key = `${ym.year}-${ym.month}`;
          const h = monthHeights.current[key] || MONTH_EST_H;
          totalHeight += h;
        }
        if (totalHeight > 0) {
          scrollRef.current?.scrollTo({ y: totalHeight, animated: false });
        } else {
          scrollRef.current?.scrollTo({ y: LOAD_CHUNK * MONTH_EST_H, animated: false });
        }
        isAdjusting.current = false;
        isLoadTopGuard.current = false;
        isLoadBottomGuard.current = false;
        setNeedsAdjust(0);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [needsAdjust, monthList]);

  const [bottomLoadKey, setBottomLoadKey] = useState(0);
  useEffect(() => {
    if (bottomLoadKey > 0) {
      const timer = setTimeout(() => {
        isAdjusting.current = false;
        isLoadBottomGuard.current = false;
        setBottomLoadKey(0);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [bottomLoadKey]);

  const renderMonth = (ym: { year: number; month: number }) => {
    const { year, month } = ym;
    const key = `${year}-${month}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const monthReservations = getReservationsForMonth(year, month);
    const bookedDays = getBookedDays(year, month, monthReservations);

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    const barsInWeekFn = (week: (number | null)[]) => {
      const wDays: number[] = [];
      week.forEach(x => { if (x !== null) wDays.push(x); });
      if (wDays.length === 0) return [];
      const ws = wDays[0];
      const we = wDays[wDays.length - 1];

      return monthReservations
        .map(r => {
          const ciP = r.checkin_date.split('-').map(Number);
          const coP = r.checkout_date.split('-').map(Number);
          const ciDay = ciP[2];
          const coDay = coP[2];
          const ciMonth = ciP[1];
          const coMonth = coP[1];
          const ciYear = ciP[0];
          const coYear = coP[0];

          const ciIn = ciYear === year && ciMonth === month;
          const coIn = coYear === year && coMonth === month;
          const checkinDay = ciIn ? ciDay : null;
          const checkoutDay = coIn ? coDay : null;

          const barStart = checkinDay !== null ? checkinDay : 1;
          const barEnd = checkoutDay !== null ? checkoutDay : daysInMonth + 1;

          if (barStart > we || barEnd <= ws) return null;

          const segStart = Math.max(barStart, ws);
          const segEnd = Math.min(barEnd, we);
          const ci = week.indexOf(segStart);
          const ce = week.indexOf(segEnd);

          if (ci === -1 || ce === -1) return null;

          const isCS = checkinDay !== null && segStart === checkinDay;
          const isCO = checkoutDay !== null && segEnd === checkoutDay;
          const left = isCS ? ci * DAY_W + DAY_W / 2 : ci * DAY_W + 2;
          const rightEdge = isCO ? ce * DAY_W + DAY_W / 2 : (ce + 1) * DAY_W - 2;
          const width = Math.max(8, rightEdge - left - 2);
          const color = getResColor(r.checkin_date, r.checkout_date);

          return { ...r, left, width, color, isCS, isCO };
        })
        .filter(Boolean) as (Reservation & { left: number; width: number; color: string; isCS: boolean; isCO: boolean })[];
    };

    return (
      <View key={key} onLayout={(e) => handleMonthLayout(key, `${MONTH_NAMES[month - 1]} ${year}`, e)} style={s.monthSection}>
        <View style={s.monthLabel}>
          <Text style={[s.monthLabelText, isCurrentMonth && s.monthLabelCurrent]}>
            {MONTH_NAMES[month - 1]} {year}
            {isCurrentMonth ? ' — Today' : ''}
          </Text>
        </View>
        <View style={s.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <View key={d} style={[s.dayHeaderCell, { width: DAY_W }]}>
              <Text style={s.dayHeaderLabel}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={s.grid}>
          {weeks.map((week, wi) => {
            const wkDays: number[] = [];
            week.forEach(x => { if (x !== null) wkDays.push(x); });
            if (wkDays.length === 0) return null;
            const bars = barsInWeekFn(week);

            return (
              <View key={wi} style={s.weekRow}>
                {week.map((day, di) => {
                  if (day === null) return <View key={di} style={[s.emptyCell, { width: DAY_W }]} />;
                  const td = isTodayCheck(year, month, day);
                  const pd = isPastCheck(year, month, day) && !td;
                  const price = getPriceOnDay(monthReservations, year, month, day);
                  const isBooked = bookedDays.has(dateStr(year, month, day));

                  return (
                    <TouchableOpacity
                      key={di}
                      activeOpacity={0.7}
                      onPress={() => setModalDate(dateStr(year, month, day))}
                      style={[s.dayCell, { width: DAY_W }, td && s.todayCell, pd && s.pastCell]}
                    >
                      <View style={s.dayNumRow}>
                        <Text style={[s.dayNum, td && s.todayNum, pd && s.pastNum]}>{day}</Text>
                        {td && <Text style={s.todayLabel}>Today</Text>}
                      </View>
                      {pd && !isBooked && <View style={s.diagCross} />}
                      {price && <Text style={s.priceLabel}>{price}</Text>}
                    </TouchableOpacity>
                  );
                })}
                {bars.map(bar => (
                  <TouchableOpacity
                    key={bar.id}
                    onPress={() => router.push(`/reservations/${bar.id}/edit`)}
                    style={[
                      s.spanBar,
                      {
                        left: bar.left,
                        width: bar.width,
                        backgroundColor: bar.color,
                        borderTopLeftRadius: bar.isCS ? 10 : 0,
                        borderBottomLeftRadius: bar.isCS ? 10 : 0,
                        borderTopRightRadius: bar.isCO ? 10 : 0,
                        borderBottomRightRadius: bar.isCO ? 10 : 0,
                      }
                    ]}
                  >
                    {bar.isCS && (
                      <>
                        <Avatar imageUrl={bar.guest_photo_url} name={bar.guest_name} size={14} />
                        <Text style={s.barName} numberOfLines={1}>{bar.guest_name}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const dayReservations = useMemo(() => {
    if (!modalDate) return [];
    return allReservations.filter(r => r.checkin_date <= modalDate && r.checkout_date > modalDate);
  }, [modalDate, allReservations]);

  const modalFmt = (() => {
    if (!modalDate) return { day: '', month: '', year: '', weekday: '' };
    const p = modalDate.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    return {
      day: d.getDate().toString(),
      month: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear().toString(),
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
    };
  })();

  const activeMonthLabel = (() => {
    if (!activeMonthKey) return '';
    const parts = activeMonthKey.split('-').map(Number);
    const isCurrent = parts[0] === today.getFullYear() && parts[1] === today.getMonth() + 1;
    return `${MONTH_NAMES[parts[1] - 1]} ${parts[0]}${isCurrent ? ' — Today' : ''}`;
  })();

  useEffect(() => {
    if (!initialScrollDone.current && !loading && monthList.length > 0) {
      initialScrollDone.current = true;
      isAdjusting.current = true;
      const key = `${today.getFullYear()}-${today.getMonth() + 1}`;
      requestAnimationFrame(() => {
        scrollToMonthKey(key);
        setActiveMonthKey(key);
        setTimeout(() => { isAdjusting.current = false; }, 400);
      });
    }
  }, [loading, monthList, scrollToMonthKey]);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={s.container}>
      <Header title="Dashboard" />

      <View style={s.panel}>
        <View style={s.searchRow}>
          <Ionicons name="search" size={14} color="#94a3b8" />
          <TextInput
            style={s.searchInput}
            placeholder="Search rooms..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.listingStrip} contentContainerStyle={s.listingStripContent}>
          {filteredListings.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[s.listingChip, selectedListing?.id === item.id && s.listingChipActive]}
              onPress={() => setSelectedListing(selectedListing?.id === item.id ? null : item)}
            >
              <Avatar imageUrl={item.image_url} name={item.room_title} size={18} />
              <Text style={[s.listingChipText, selectedListing?.id === item.id && s.listingChipTextActive]} numberOfLines={1}>{item.room_title}</Text>
              {selectedListing?.id === item.id && (
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
          {filteredListings.length === 0 && (
            <Text style={s.listingStripEmpty}>No rooms found</Text>
          )}
        </ScrollView>

        <View style={s.stickyHeader}>
          <Text style={s.stickyHeaderText}>{activeMonthLabel}</Text>
          <View style={s.stickyIcons}>
            <TouchableOpacity onPress={goToToday} style={s.stickyIconBtn}>
              <Ionicons name="today-outline" size={17} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPickerYear(today.getFullYear()); setPickerMonth(today.getMonth() + 1); setShowMonthPicker(true); }} style={s.stickyIconBtn}>
              <Ionicons name="calendar-outline" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#d4a574" />}
        >
          {monthList.map(ym => renderMonth(ym))}
        </ScrollView>
      </View>

      <Modal visible={!!modalDate} transparent animationType="fade" onRequestClose={() => setModalDate(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModalDate(null)}>
          <View style={[s.modalPopup, { width: Math.min(winW * 0.88, 500) }]}>
            <View style={s.modalHeader}>
              <View style={s.modalDateBox}>
                <Text style={s.modalDateNum}>{modalFmt.day}</Text>
                <Text style={s.modalDateWeekday}>{modalFmt.weekday}</Text>
              </View>
              <View style={s.modalDateInfo}>
                <Text style={s.modalMonthYear}>{modalFmt.month} {modalFmt.year}</Text>
                <Text style={s.modalResCount}>{dayReservations.length} reservation{dayReservations.length !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalDate(null)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {dayReservations.length === 0 ? (
                <View style={s.modalEmpty}>
                  <View style={s.modalEmptyIcon}>
                    <Ionicons name="calendar-outline" size={22} color="#94a3b8" />
                  </View>
                  <Text style={s.modalEmptyText}>No reservations on this day</Text>
                  <TouchableOpacity
                    style={s.modalAddBtn}
                    onPress={() => { setModalDate(null); router.push(`/reservations/add/?checkin=${modalDate}${selectedListing ? `&listing_id=${selectedListing.id}` : ''}`); }}
                  >
                    <Text style={s.modalAddBtnText}>+ Add Reservation</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                dayReservations.map((r) => {
                  const isCheckin = r.checkin_date === modalDate;
                  const isCheckout = r.checkout_date === modalDate;
                  let statusText = 'In Stay';
                  let statusColor = '#7b9fd4';
                  if (isCheckin && isCheckout) { statusText = '1 Night'; statusColor = '#5bc8c8'; }
                  else if (isCheckin) { statusText = 'Check-in'; statusColor = '#22c55e'; }
                  else if (isCheckout) { statusText = 'Check-out'; statusColor = '#e74c3c'; }
                  const isPastModal = modalDate ? modalDate < todayStr : false;

                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.modalCard, isPastModal && s.modalCardPast]}
                      onPress={() => router.push(`/reservations/${r.id}/edit`)}
                    >
                      <View style={s.modalCardTop}>
                        <Avatar imageUrl={r.guest_photo_url} name={r.guest_name} size={36} />
                        <View style={s.modalCardInfo}>
                          <Text style={s.modalCardGuest}>{r.guest_name}</Text>
                          <Text style={s.modalCardListing}>{r.listing_title}</Text>
                        </View>
                        <View style={[s.modalCardBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[s.modalCardBadgeText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                      </View>
                      <View style={s.modalCardBottom}>
                        <View style={s.modalCardMeta}>
                          <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                          <Text style={s.modalCardMetaText}>{r.checkin_date} → {r.checkout_date}</Text>
                        </View>
                        <View style={s.modalCardMeta}>
                          <Ionicons name="moon-outline" size={11} color="#94a3b8" />
                          <Text style={s.modalCardMetaText}>{r.nights || '—'} night{(r.nights || 0) !== 1 ? 's' : ''}</Text>
                        </View>
                        {r.price_per_night && (
                          <Text style={s.modalCardPrice}>${parseFloat(r.price_per_night).toFixed(0)}/night</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={[s.pickerPopup, { width: Math.min(winW * 0.82, 500) }]}>
            <Text style={s.pickerTitle}>Jump to month</Text>
            <View style={s.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={s.pickerYearBtn}>
                <Ionicons name="chevron-back" size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={s.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={s.pickerYearBtn}>
                <Ionicons name="chevron-forward" size={18} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <View style={s.pickerMonthGrid}>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                const isSel = pickerYear === today.getFullYear() && m === today.getMonth() + 1;
                const isPicked = m === pickerMonth;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.pickerMonthCell, isSel && !isPicked && s.pickerMonthSel, isPicked && s.pickerMonthActive]}
                    onPress={() => setPickerMonth(m)}
                  >
                    <Text style={[s.pickerMonthText, isSel && !isPicked && s.pickerMonthTextSel, isPicked && s.pickerMonthTextActive]}>{name.slice(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.pickerGoBtn} onPress={() => goToMonth(pickerYear, pickerMonth)}>
              <Text style={s.pickerGoText}>Go to {MONTH_NAMES[pickerMonth - 1]} {pickerYear}</Text>
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#f8f7f4' },
  panel: { flex: 1, alignSelf: 'center', maxWidth: MAX_WIDTH, width: '100%' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 10, marginTop: 8, marginBottom: 0, borderRadius: 10, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#1e293b', padding: 0 },
  listingStrip: { maxHeight: 40, marginHorizontal: 10, marginTop: 6, marginBottom: 4 },
  listingStripContent: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  listingChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#1e293b', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  listingChipActive: { backgroundColor: '#1e293b', borderColor: '#d4a574', borderWidth: 1.5 },
  listingChipText: { fontSize: 11, color: '#1e293b', fontWeight: '600', maxWidth: 80 },
  listingChipTextActive: { color: '#fff' },
  listingStripEmpty: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  stickyHeader: { marginHorizontal: 10, marginTop: 4, marginBottom: 2, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: '#d4a574', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#1e293b', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  stickyHeaderText: { fontSize: 15, fontWeight: '700', color: '#1e293b', letterSpacing: -0.3, flex: 1 },
  stickyIcons: { flexDirection: 'row', gap: 6 },
  stickyIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  pickerPopup: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 16 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  pickerYearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' },
  pickerYearText: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pickerMonthCell: { width: '30%', paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8f9fc', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  pickerMonthSel: { backgroundColor: '#fef3e7', borderColor: '#d4a574' },
  pickerMonthActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  pickerMonthText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  pickerMonthTextSel: { color: '#d4a574' },
  pickerMonthTextActive: { color: '#fff' },
  pickerGoBtn: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  pickerGoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  monthSection: { marginHorizontal: 10, marginBottom: 4 },
  monthLabel: { paddingVertical: 8, paddingHorizontal: 6, borderLeftWidth: 3, borderLeftColor: '#d4a574', marginBottom: 2 },
  monthLabelText: { fontSize: 13, fontWeight: '700', color: '#1e293b', letterSpacing: -0.2 },
  monthLabelCurrent: { color: '#d4a574' },
  dayHeaders: { flexDirection: 'row', backgroundColor: '#f1f3f5', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderLeftWidth: 1, borderLeftColor: '#e2e8f0', borderRightWidth: 1, borderRightColor: '#e2e8f0', borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: 'hidden' },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 5, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  dayHeaderLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', letterSpacing: 0.3 },
  grid: { borderLeftWidth: 1, borderLeftColor: '#e2e8f0', borderRightWidth: 1, borderRightColor: '#e2e8f0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' },
  weekRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', position: 'relative', minHeight: 56 },
  dayCell: { padding: 3, borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#fff', minHeight: 56, position: 'relative' },
  emptyCell: { minHeight: 56, backgroundColor: '#f8f7f4', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  todayCell: { backgroundColor: '#fefcf9', borderLeftWidth: 2, borderLeftColor: '#d4a574' },
  pastCell: { backgroundColor: '#fafafa' },
  dayNumRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2, minHeight: 16 },
  dayNum: { fontSize: 11, color: '#1e293b', fontWeight: '600' },
  todayNum: { color: '#d4a574', fontWeight: '800', fontSize: 12 },
  pastNum: { color: '#94a3b8' },
  todayLabel: { fontSize: 7, color: '#fff', backgroundColor: '#d4a574', fontWeight: '700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
  diagCross: { position: 'absolute', top: 8, left: 0, width: 20, height: 2, backgroundColor: '#94a3b8', transform: [{ rotate: '-45deg' }], zIndex: 5 },
  priceLabel: { position: 'absolute', bottom: 2, left: 4, fontSize: 8, color: '#64748b', fontWeight: '700' },
  spanBar: { position: 'absolute', top: 20, height: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 3, zIndex: 3, overflow: 'hidden', borderRadius: 4, shadowColor: '#1e293b', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  barName: { fontSize: 9, color: '#fff', fontWeight: '700', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalPopup: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '80%', overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalDateBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#fef3e7', alignItems: 'center', justifyContent: 'center' },
  modalDateNum: { fontSize: 18, fontWeight: '800', color: '#d4a574', lineHeight: 20 },
  modalDateWeekday: { fontSize: 8, fontWeight: '700', color: '#d4a574', textTransform: 'uppercase', letterSpacing: 0.3 },
  modalDateInfo: { flex: 1 },
  modalMonthYear: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  modalResCount: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 16, maxHeight: 400 },
  modalEmpty: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  modalEmptyIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' },
  modalEmptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  modalAddBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  modalAddBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  modalCardPast: { opacity: 0.65 },
  modalCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  modalCardInfo: { flex: 1 },
  modalCardGuest: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  modalCardListing: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  modalCardBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modalCardBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  modalCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 10, flexWrap: 'wrap' },
  modalCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalCardMetaText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  modalCardPrice: { marginLeft: 'auto', fontSize: 11, fontWeight: '700', color: '#d4a574' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e293b', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '400', lineHeight: 30 },
});
