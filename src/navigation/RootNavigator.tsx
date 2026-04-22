import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';

const PlayerPlaceholder = () => {
  const { signOut } = useAuth();
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>🎾 Player app</Text>
      <Text style={styles.placeholderSub}>Player team's responsibility</Text>
      <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

type RootStackParamList = {
  Auth: undefined;
  PlayerApp: undefined;
  AdminApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, userProfile, loading } = useAuth();

  // DEV ONLY — skip auth entirely when EXPO_PUBLIC_MOCK_MODE=true
  if (process.env.EXPO_PUBLIC_MOCK_MODE === 'true') {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (loading) return <LoadingSpinner message="Loading..." />;

  // DEV ONLY — set EXPO_PUBLIC_DEV_ADMIN_EMAIL in .env to force admin role locally.
  // Remove before any real deployment.
  const devAdminEmail = process.env.EXPO_PUBLIC_DEV_ADMIN_EMAIL;
  const isAdmin =
    userProfile?.role === 'admin' ||
    (!!devAdminEmail && session?.user.email === devAdminEmail);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isAdmin ? (
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="PlayerApp" component={PlayerPlaceholder} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  placeholderText: { fontSize: 22, fontWeight: '700', color: '#0f4c81' },
  placeholderSub: { fontSize: 14, color: '#9ca3af' },
  signOutBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#fee2e2', borderRadius: 10 },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
});
