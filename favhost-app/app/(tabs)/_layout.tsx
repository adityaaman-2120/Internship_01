import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#555558',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Dashboard',
        tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />,
      }} />
      <Tabs.Screen name="calendar" options={{
        title: 'Calendar',
        tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={20} color={color} />,
      }} />
      <Tabs.Screen name="listings" options={{
        title: 'Listings',
        tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={20} color={color} />,
      }} />
      <Tabs.Screen name="reservations" options={{
        title: 'Reservations',
        tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={20} color={color} />,
      }} />
    </Tabs>
  );
}
