import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface Props {
  title: string;
  showBack?: boolean;
  rightLabel?: string;
  onRight?: () => void;
}

export default function Header({ title, showBack, rightLabel, onRight }: Props) {
  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.side}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.side}>
          <Text style={styles.logo}>Fav<Text style={styles.logoAccent}>H</Text>ost</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        onPress={onRight}
        style={[styles.side, styles.right]}
        disabled={!rightLabel}
      >
        {rightLabel ? (
          <Text style={styles.rightText}>{rightLabel}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  side: { width: 70 },
  logo: { fontSize: 15, fontWeight: '700', color: '#222' },
  logoAccent: { color: '#e74c3c' },
  title: { fontSize: 17, fontWeight: '700', color: '#1e293b', letterSpacing: -0.3 },
  backText: { fontSize: 28, color: '#1e293b', fontWeight: '700' },
  right: { alignItems: 'flex-end' },
  rightText: { fontSize: 28, color: '#1e293b', fontWeight: '700' },
});
