import { View, Text, Image, StyleSheet } from 'react-native';
import API from '../constants/api';

interface Props {
  imageUrl?: string | null;
  name: string;
  size?: number;
}

export default function Avatar({ imageUrl, name, size = 32 }: Props) {
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  const uri = imageUrl?.startsWith('http') ? imageUrl : `${API.base}${imageUrl || ''}`;

  if (imageUrl) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#f0f0f0' },
  fallback: {
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontWeight: '600', color: '#555558' },
});
