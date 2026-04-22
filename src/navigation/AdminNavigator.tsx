import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { PlayerManagementScreen } from '@/screens/admin/PlayerManagementScreen';
import { MatchResultScreen } from '@/screens/admin/MatchResultScreen';
import { CreateTournamentScreen } from '@/screens/admin/CreateTournamentScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  CreateTournament: undefined;
  PlayerManagement: { tournamentId: string; tournamentName: string; tournamentStatus: string };
  MatchResult: { tournamentId: string; tournamentName: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
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
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin Panel' }}
      />
      <Stack.Screen
        name="CreateTournament"
        component={CreateTournamentScreen}
        options={{ title: 'New Tournament' }}
      />
      <Stack.Screen
        name="PlayerManagement"
        component={PlayerManagementScreen}
        options={({ route }) => ({ title: route.params.tournamentName })}
      />
      <Stack.Screen
        name="MatchResult"
        component={MatchResultScreen}
        options={({ route }) => ({ title: route.params.tournamentName })}
      />
    </Stack.Navigator>
  );
}
