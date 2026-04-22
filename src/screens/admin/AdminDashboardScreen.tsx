import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Tournament, TournamentStatus } from '@/types';
import { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

type FilterKey = 'all' | TournamentStatus;

const STATUS_COLORS: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
  upcoming:          { bg: '#e0e7ff', text: '#3730a3', label: 'Upcoming' },
  registration_open: { bg: '#dcfce7', text: '#166534', label: 'Open' },
  in_progress:       { bg: '#fef9c3', text: '#854d0e', label: 'In Progress' },
  completed:         { bg: '#f1f5f9', text: '#475569', label: 'Completed' },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',               label: 'All' },
  { key: 'registration_open', label: 'Open' },
  { key: 'upcoming',          label: 'Upcoming' },
  { key: 'in_progress',       label: 'In Progress' },
  { key: 'completed',         label: 'Completed' },
];

export function AdminDashboardScreen({ navigation }: Props) {
  const { userProfile, signOut } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournament')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) Alert.alert('Error', error.message);
    else setTournaments((data as Tournament[]) ?? []);
  };

  useEffect(() => { fetchTournaments(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const filtered = activeFilter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === activeFilter);

  const renderTournament = ({ item }: { item: Tournament }) => {
    const status = STATUS_COLORS[item.status];
    const spotsLeft = item.max_players - item.current_players;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>
          📍 {item.location}{'   '}🎾 {item.surface}
        </Text>
        <Text style={styles.cardMeta}>
          📅 {new Date(item.start_date).toLocaleDateString()}
          {'   '}
          👥 {item.current_players}/{item.max_players} players
          {spotsLeft > 0 ? `  (${spotsLeft} spots left)` : '  · Full'}
        </Text>
        <Text style={styles.cardMeta}>💰 Entry fee: ${Number(item.entry_fee).toFixed(2)}</Text>

        <TouchableOpacity
          style={styles.btnEdit}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          onPress={() =>
            navigation.navigate('EditTournament', {
              tournamentId: item.id,
              tournamentName: item.name,
            })
          }
        >
          <Text style={styles.btnEditText}>✏️ Edit Tournament</Text>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Manage players for ${item.name}`}
            onPress={() =>
              navigation.navigate('PlayerManagement', {
                tournamentId: item.id,
                tournamentName: item.name,
                tournamentStatus: item.status,
              })
            }
          >
            <Text style={styles.btnSecondaryText}>👥 Players</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Enter match results for ${item.name}`}
            onPress={() =>
              navigation.navigate('MatchResult', {
                tournamentId: item.id,
                tournamentName: item.name,
              })
            }
          >
            <Text style={styles.btnPrimaryText}>🏆 Results</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Admin greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          Welcome, {userProfile?.full_name ?? 'Admin'} 👋
        </Text>
        <TouchableOpacity
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Create Tournament button */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => navigation.navigate('CreateTournament')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new tournament"
      >
        <Text style={styles.createBtnText}>+ New Tournament</Text>
      </TouchableOpacity>

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, activeFilter === f.key && styles.chipActive]}
              onPress={() => setActiveFilter(f.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        renderItem={renderTournament}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'No tournaments yet.'
                : `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} tournaments.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  greetingText: { fontSize: 15, fontWeight: '600', color: '#0f4c81' },
  signOutBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: 14, color: '#dc2626', fontWeight: '500' },

  createBtn: {
    marginHorizontal: 16, marginTop: 12, height: 48,
    backgroundColor: '#0f4c81', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  filterBar: {
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    marginTop: 10,
  },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, minHeight: 44, justifyContent: 'center',
    borderRadius: 22, backgroundColor: '#f1f5f9',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#0f4c81', borderColor: '#0f4c81' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#ffffff' },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#64748b' },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnPrimary: {
    flex: 1, height: 44, backgroundColor: '#0f4c81',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    flex: 1, height: 44, backgroundColor: '#f1f5f9',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { color: '#0f4c81', fontWeight: '600', fontSize: 14 },

  btnEdit: {
    height: 40, backgroundColor: '#f8fafc',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 4,
  },
  btnEditText: { color: '#475569', fontWeight: '600', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#64748b' },
});
