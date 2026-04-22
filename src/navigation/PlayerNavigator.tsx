import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TournamentListScreen } from '@/screens/player/TournamentListScreen';
import { TournamentDetailScreen } from '@/screens/player/TournamentDetailScreen';
import { BracketScreen } from '@/screens/player/BracketScreen';
import { PaymentScreen } from '@/screens/player/PaymentScreen';
import { RegistrationConfirmScreen } from '@/screens/player/RegistrationConfirmScreen';

export type PlayerStackParamList = {
    TournamentList: undefined;
    TournamentDetail: { tournamentId: string };
    Bracket: { tournamentId: string; tournamentName: string };
    Payment: { tournamentId: string; tournamentName: string; entryFee: number };
    RegistrationConfirm: { tournamentId: string; tournamentName: string };
};

const Stack = createNativeStackNavigator<PlayerStackParamList>();

export function PlayerNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#0f4c81' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: '700' },
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen
                name="TournamentList"
                component={TournamentListScreen}
                options={{ title: 'Tournaments', headerShown: false }}
            />
            <Stack.Screen
                name="TournamentDetail"
                component={TournamentDetailScreen}
                options={{ title: 'Tournament Details' }}
            />
            <Stack.Screen
                name="Bracket"
                component={BracketScreen}
                options={({ route }) => ({ title: route.params.tournamentName })}
            />
            <Stack.Screen
                name="Payment"
                component={PaymentScreen}
                options={{ title: 'Registration & Payment' }}
            />
            <Stack.Screen
                name="RegistrationConfirm"
                component={RegistrationConfirmScreen}
                options={{ title: 'Confirmed!', headerShown: false }}
            />
        </Stack.Navigator>
    );
}