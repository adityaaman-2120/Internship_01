import { View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { Reservation } from '../types';

interface Props {
  reservation: Reservation;
  compact?: boolean;
}

export default function ReservationPill({ reservation, compact }: Props) {
  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Avatar
        imageUrl={reservation.guest_photo_url}
        name={reservation.guest_name}
        size={compact ? 14 : 18}
      />
      <Text style={styles.name} numberOfLines={1}>
        {reservation.guest_name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5bc8c8',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 7,
    gap: 5,
    marginBottom: 3,
  },
  pillCompact: { paddingVertical: 2, paddingHorizontal: 5 },
  name: { fontSize: 11, color: '#fff', fontWeight: '500', flex: 1 },
});
