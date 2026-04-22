import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { PlayerNavigator } from './PlayerNavigator';

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
                    <Stack.Screen name="PlayerApp" component={PlayerNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}