import { View, ActivityIndicator } from 'react-native';

export default function LoadingSpinner() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f8f8' }}>
      <ActivityIndicator size="small" color="#00b4b4" />
    </View>
  );
}
