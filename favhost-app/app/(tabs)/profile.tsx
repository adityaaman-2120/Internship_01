import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';
import API from '../../constants/api';
import { Listing, Reservation } from '../../types';

const CARD_GAP = 10;
const MAX_WIDTH = 700;

export default function ProfileScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        fetch(API.listings),
        fetch(API.reservations()),
      ]);
      setListings((await lRes.json()).listings || []);
      setReservations((await rRes.json()).reservations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const stats = useMemo(() => {
    const totalListings = listings.length;
    const totalReservations = reservations.length;
    const uniqueGuests = new Set(reservations.map(r => r.guest_name?.toLowerCase().trim())).size;
    let totalRevenue = 0;
    let totalNights = 0;
    let occupiedNights = 0;
    const listingBookings: Record<number, number> = {};

    reservations.forEach(r => {
      const nights = r.nights || 0;
      const price = parseFloat(r.price_per_night || '0');
      if (!isNaN(price) && nights) {
        totalRevenue += price * nights;
        totalNights += nights;
      }
      if (nights) occupiedNights += nights;
      listingBookings[r.listing_id] = (listingBookings[r.listing_id] || 0) + 1;
    });

    const availableNights = totalListings * 365;
    const occupancyRate = availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0;
    const avgStay = totalReservations > 0 ? (totalNights / totalReservations) : 0;
    const avgRevenue = totalReservations > 0 ? (totalRevenue / totalReservations) : 0;

    let topListing: { title: string; count: number; image: string | null } | null = null;
    if (listings.length > 0) {
      let maxCount = 0;
      let top = null;
      listings.forEach(l => {
        const count = listingBookings[l.id] || 0;
        if (count > maxCount) { maxCount = count; top = l; }
      });
      if (top) topListing = { title: top.room_title, count: maxCount, image: top.image_url };
    }

    const recentReservations = [...reservations].sort(
      (a, b) => new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime()
    ).slice(0, 5);

    return { totalListings, totalReservations, uniqueGuests, totalRevenue, avgRevenue, avgStay, occupancyRate, topListing, recentReservations, totalNights };
  }, [listings, reservations]);

  const formatCurrency = (n: number) => `$${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const { width: winW } = useWindowDimensions();
  const contentW = Math.min(winW, MAX_WIDTH);
  const cardW = (contentW - 16 * 2 - CARD_GAP) / 2;

  if (loading) return (
    <View style={s.container}>
      <Header title="Profile" />
      <LoadingSpinner />
    </View>
  );

  return (
    <View style={s.container}>
      <Header title="Profile" />
      <ScrollView
        contentContainerStyle={s.body}
        style={{ alignSelf: 'center', maxWidth: MAX_WIDTH, width: '100%' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#d4a574" />}
      >
        <LinearGradient colors={['#1a1f36', '#2a2d3e']} style={s.hero}>
          <View style={s.heroAccentBar} />
          <View style={s.heroInner}>
            <View style={s.avatarFrame}>
              <View style={s.avatarCircle}>
                <Ionicons name="business" size={24} color="#d4a574" />
              </View>
              <View style={s.avatarRing} />
            </View>
            <Text style={s.hostName}>Portfolio</Text>
            <Text style={s.hostHandle}>{stats.totalListings} {stats.totalListings === 1 ? 'property' : 'properties'} · {stats.totalReservations} {stats.totalReservations === 1 ? 'booking' : 'bookings'}</Text>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{stats.totalListings}</Text>
                <Text style={s.statLabel}>Listings</Text>
              </View>
              <View style={s.statDot} />
              <View style={s.statItem}>
                <Text style={s.statNumber}>{stats.totalReservations}</Text>
                <Text style={s.statLabel}>Bookings</Text>
              </View>
              <View style={s.statDot} />
              <View style={s.statItem}>
                <Text style={s.statNumber}>{stats.uniqueGuests}</Text>
                <Text style={s.statLabel}>Guests</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={s.metricsGrid}>
          <View style={[s.metricCard, { width: cardW }]}>
            <View style={s.metricCardAccent} />
            <View style={[s.metricIconCircle, { backgroundColor: '#fef3e7' }]}>
              <Ionicons name="wallet-outline" size={16} color="#d4a574" />
            </View>
            <Text style={s.metricValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={s.metricLabel}>Total Revenue</Text>
          </View>
          <View style={[s.metricCard, { width: cardW }]}>
            <View style={s.metricCardAccent} />
            <View style={[s.metricIconCircle, { backgroundColor: '#faf5ef' }]}>
              <Ionicons name="trending-up-outline" size={16} color="#d4a574" />
            </View>
            <Text style={s.metricValue}>{stats.occupancyRate.toFixed(0)}%</Text>
            <Text style={s.metricLabel}>Occupancy</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.min(stats.occupancyRate, 100)}%` }]} />
            </View>
          </View>
          <View style={[s.metricCard, { width: cardW }]}>
            <View style={s.metricCardAccent} />
            <View style={[s.metricIconCircle, { backgroundColor: '#eeedf7' }]}>
              <Ionicons name="moon-outline" size={16} color="#7b7fcf" />
            </View>
            <Text style={s.metricValue}>{stats.avgStay.toFixed(1)}</Text>
            <Text style={s.metricLabel}>Avg Nights</Text>
          </View>
          <View style={[s.metricCard, { width: cardW }]}>
            <View style={s.metricCardAccent} />
            <View style={[s.metricIconCircle, { backgroundColor: '#eaf7ef' }]}>
              <Ionicons name="receipt-outline" size={16} color="#5bb87e" />
            </View>
            <Text style={s.metricValue}>{formatCurrency(stats.avgRevenue)}</Text>
            <Text style={s.metricLabel}>Avg / Booking</Text>
          </View>

          {stats.topListing && stats.topListing.count > 0 && (
            <View style={s.topCard}>
              <View style={s.topCardAccent} />
              <View style={s.topCardHeader}>
                <Ionicons name="star" size={12} color="#d4a574" />
                <Text style={s.topCardTitle}>Top Performer</Text>
              </View>
              <View style={s.topCardBody}>
                {stats.topListing.image ? (
                  <Image source={{ uri: API.base + stats.topListing.image }} style={s.topImage} />
                ) : (
                  <View style={s.topImagePlaceholder}>
                    <Ionicons name="bed-outline" size={16} color="#cbd5e1" />
                  </View>
                )}
                <View style={s.topInfo}>
                  <Text style={s.topName} numberOfLines={1}>{stats.topListing.title}</Text>
                  <Text style={s.topCount}>{stats.topListing.count} {stats.topListing.count === 1 ? 'booking' : 'bookings'} · {stats.topListing.count > 0 && stats.totalRevenue > 0 ? formatCurrency(Math.round(stats.totalRevenue / stats.totalReservations * stats.topListing.count)) : '—'}</Text>
                </View>
                <View style={s.topBadge}>
                  <Text style={s.topBadgeText}>#1</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionAccentBar} />
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>{stats.recentReservations.length}</Text>
            </View>
          </View>
          {stats.recentReservations.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={24} color="#d4c8b8" />
              <Text style={s.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            <View style={s.activityList}>
              {stats.recentReservations.map((r, i) => {
                const now = new Date();
                const checkout = new Date(r.checkout_date);
                const checkin = new Date(r.checkin_date);
                const status = checkout < now ? 'Completed' : checkin <= now ? 'Active' : 'Upcoming';
                const statusColor = status === 'Upcoming' ? '#d4a574' : status === 'Active' ? '#5bb87e' : '#94a3b8';
                const statusIcon = status === 'Upcoming' ? 'time-outline' : status === 'Active' ? 'checkmark-circle' : 'checkmark-done-outline';
                const dateStr = `${checkin.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${checkout.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
                return (
                  <View key={r.id} style={[s.activityRow, i === 0 && s.activityRowFirst]}>
                    <View style={[s.activityStatus, { backgroundColor: statusColor + '15' }]}>
                      <Ionicons name={statusIcon as any} size={14} color={statusColor} />
                    </View>
                    <View style={s.activityInfo}>
                      <Text style={s.activityGuest} numberOfLines={1}>{r.guest_name}</Text>
                      <Text style={s.activityListing} numberOfLines={1}>{r.listing_title}</Text>
                    </View>
                    <View style={s.activityRight}>
                      <Text style={s.activityDate}>{dateStr}</Text>
                      <View style={[s.activityPill, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[s.activityPillText, { color: statusColor }]}>{status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={s.footer}>
          <View style={s.footerRow}>
            <View style={[s.footerDot, { backgroundColor: '#22c55e' }]} />
            <Text style={s.footerText}>Server connected</Text>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Ionicons name="code-slash" size={11} color="#94a3b8" />
            <Text style={s.footerText}>FavHost v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7f4' },
  body: { paddingBottom: 40 },

  hero: { paddingTop: 28, paddingBottom: 24, position: 'relative' },
  heroAccentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(212,165,116,0.25)' },
  heroInner: { alignItems: 'center', paddingHorizontal: 20 },
  avatarFrame: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(212,165,116,0.4)' },
  avatarRing: { position: 'absolute', top: -3, left: -3, width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderColor: 'rgba(212,165,116,0.2)' },
  hostName: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  hostHandle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: 2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingVertical: 14, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 },
  statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(212,165,116,0.3)' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: CARD_GAP, marginTop: -10 },
  metricCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2, borderWidth: 1, borderColor: '#f1f0ed', position: 'relative', overflow: 'hidden' },
  metricCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#d4a574', borderTopLeftRadius: 16, borderTopRightRadius: 16, opacity: 0.4 },
  metricIconCircle: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricValue: { fontSize: 22, fontWeight: '700', color: '#0f172a', letterSpacing: -0.5 },
  metricLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 3 },

  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#f1f0ed', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#d4a574' },

  topCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 0, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2, borderWidth: 1, borderColor: '#f1f0ed', position: 'relative', overflow: 'hidden' },
  topCardAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, backgroundColor: '#d4a574', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, opacity: 0.5 },
  topCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, paddingLeft: 4 },
  topCardTitle: { fontSize: 10, fontWeight: '700', color: '#d4a574', textTransform: 'uppercase', letterSpacing: 0.6 },
  topCardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4 },
  topImage: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#f8f7f4' },
  topImagePlaceholder: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center' },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  topCount: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  topBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fef6ee', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f0ddca' },
  topBadgeText: { fontSize: 10, fontWeight: '800', color: '#d4a574' },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccentBar: { width: 3, height: 16, backgroundColor: '#d4a574', borderRadius: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBadge: { backgroundColor: '#f1f0ed', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  activityList: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2, borderWidth: 1, borderColor: '#f1f0ed' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8f7f4' },
  activityRowFirst: { borderTopWidth: 0 },
  activityStatus: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityGuest: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  activityListing: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityDate: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  activityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activityPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },

  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8, gap: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerDivider: { width: 1, height: 12, backgroundColor: '#e2e8f0' },
  footerText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
});
