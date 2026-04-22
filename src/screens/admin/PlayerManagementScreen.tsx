import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  Alert, RefreshControl, TouchableOpacity, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { AdminStackParamList } from '@/navigation/AdminNavigator';
import { Registration, UserProfile, PaymentStatus } from '@/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'PlayerManagement'>;

interface RegistrationWithPlayer extends Registration {
  player: UserProfile;
}

const PAYMENT_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  paid:     { bg: '#dcfce7', text: '#166534' },
  unpaid:   { bg: '#fee2e2', text: '#991b1b' },
  refunded: { bg: '#f1f5f9', text: '#475569' },
};

// ── Bracket generation ────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildMatchSlots(playerIds: string[], tournamentId: string) {
  const n = playerIds.length;
  const B = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
  const numRounds = Math.log2(B);
  const r1SlotCount = B / 2;
  const numR1Matches = n - r1SlotCount;
  const seeded = shuffle(playerIds);
  const r1Players = seeded.slice(0, numR1Matches * 2);
  const byePlayers = seeded.slice(numR1Matches * 2);

  // Assign B/2 virtual round-1 slots, interleaving real matches (odd slots) and
  // bye players (even slots) so that byes are paired with real-match winners in
  // round 2 instead of facing each other immediately.
  type VSlot = { kind: 'real'; p1: string; p2: string } | { kind: 'bye'; player: string };
  const virtualSlots: VSlot[] = [];
  let ri = 0, bi = 0;
  for (let s = 1; s <= r1SlotCount; s++) {
    if (s % 2 === 0 && bi < byePlayers.length) {
      virtualSlots.push({ kind: 'bye', player: byePlayers[bi++] });
    } else if (ri < numR1Matches) {
      virtualSlots.push({ kind: 'real', p1: r1Players[ri * 2], p2: r1Players[ri * 2 + 1] });
      ri++;
    } else {
      virtualSlots.push({ kind: 'bye', player: byePlayers[bi++] });
    }
  }

  const slots: {
    tournament_id: string; round: number; match_number: number;
    player1_id: string | null; player2_id: string | null;
    winner_id: null; score: null; status: 'pending'; scheduled_at: null;
  }[] = [];

  // Round 1: one DB record per real match, using its virtual slot number as
  // match_number so the advancement formula (ceil(match_number/2)) still works.
  for (let s = 0; s < r1SlotCount; s++) {
    const slot = virtualSlots[s];
    if (slot.kind === 'real') {
      slots.push({
        tournament_id: tournamentId, round: 1, match_number: s + 1,
        player1_id: slot.p1, player2_id: slot.p2,
        winner_id: null, score: null, status: 'pending', scheduled_at: null,
      });
    }
  }

  // Pre-seed round 2 from bye virtual slots
  const r2pre: Record<number, { p1?: string; p2?: string }> = {};
  for (let s = 0; s < r1SlotCount; s++) {
    const slot = virtualSlots[s];
    if (slot.kind === 'bye') {
      const vNum = s + 1;
      const nextMatch = Math.ceil(vNum / 2);
      if (!r2pre[nextMatch]) r2pre[nextMatch] = {};
      if (vNum % 2 === 1) r2pre[nextMatch].p1 = slot.player;
      else               r2pre[nextMatch].p2 = slot.player;
    }
  }

  // Round 2+
  for (let round = 2; round <= numRounds; round++) {
    const matchCount = B / Math.pow(2, round);
    for (let i = 0; i < matchCount; i++) {
      const mn = i + 1;
      const pre = round === 2 ? (r2pre[mn] ?? {}) : {};
      slots.push({
        tournament_id: tournamentId, round, match_number: mn,
        player1_id: pre.p1 ?? null, player2_id: pre.p2 ?? null,
        winner_id: null, score: null, status: 'pending', scheduled_at: null,
      });
    }
  }

  return slots;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function PlayerManagementScreen({ route, navigation }: Props) {
  const { tournamentId, tournamentName, tournamentStatus } = route.params;
  const isCompleted = tournamentStatus === 'completed';
  const [registrations, setRegistrations] = useState<RegistrationWithPlayer[]>([]);
  const [allPlayers, setAllPlayers]       = useState<UserProfile[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [adding, setAdding]               = useState<string | null>(null);
  const [bracketExists, setBracketExists] = useState(false);

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from('registration')
      .select('*, player:player_id(*)')
      .eq('tournament_id', tournamentId)
      .order('registered_at', { ascending: true });
    if (error) Alert.alert('Error', error.message);
    else setRegistrations((data as RegistrationWithPlayer[]) ?? []);
    setLoading(false);
  };

  const fetchAllPlayers = async () => {
    const { data } = await supabase
      .from('user')
      .select('*')
      .eq('role', 'player');
    if (data) setAllPlayers(data as UserProfile[]);
  };

  const checkBracketExists = async () => {
    const { count } = await supabase
      .from('match')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);
    setBracketExists((count ?? 0) > 0);
  };

  useEffect(() => {
    fetchRegistrations();
    fetchAllPlayers();
    checkBracketExists();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegistrations();
    setRefreshing(false);
  };

  const availablePlayers = allPlayers.filter(
    p => !registrations.some(r => r.player_id === p.id)
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRemove = (reg: RegistrationWithPlayer) => {
    Alert.alert(
      'Remove Player',
      `Remove ${reg.player.full_name} from ${tournamentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            setRegistrations(prev => prev.filter(r => r.id !== reg.id));
            const { error } = await supabase.from('registration').delete().eq('id', reg.id);
            if (error) {
              setRegistrations(prev => [...prev, reg]);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleAddPlayer = async (player: UserProfile) => {
    setAdding(player.id);
    const { data, error } = await supabase
      .from('registration')
      .insert({
        tournament_id: tournamentId,
        player_id: player.id,
        registration_status: 'confirmed',
        payment_status: 'unpaid',
      })
      .select('*, player:player_id(*)')
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRegistrations(prev => [...prev, data as RegistrationWithPlayer]);
      if (availablePlayers.length === 1) setShowAddModal(false);
    }
    setAdding(null);
  };

  const handlePaymentStatus = (reg: RegistrationWithPlayer) => {
    const OPTIONS: PaymentStatus[] = ['paid', 'unpaid', 'refunded'];
    Alert.alert(
      'Update Payment',
      `${reg.player.full_name} — current: ${reg.payment_status}`,
      [
        ...OPTIONS.filter(s => s !== reg.payment_status).map(s => ({
          text: s.charAt(0).toUpperCase() + s.slice(1),
          onPress: async () => {
            setRegistrations(prev =>
              prev.map(r => r.id === reg.id ? { ...r, payment_status: s } : r)
            );
            const { error } = await supabase
              .from('registration')
              .update({ payment_status: s })
              .eq('id', reg.id);
            if (error) {
              setRegistrations(prev =>
                prev.map(r => r.id === reg.id ? { ...r, payment_status: reg.payment_status } : r)
              );
              Alert.alert('Error', error.message);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleGenerateBracket = async () => {
    if (isCompleted) {
      Alert.alert('Tournament closed', 'The bracket cannot be changed for a completed tournament.');
      return;
    }
    if (registrations.length < 2) {
      Alert.alert('Not enough players', 'You need at least 2 registered players.');
      return;
    }
    if (bracketExists) {
      const { count } = await supabase
        .from('match')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed');
      const hasCompleted = (count ?? 0) > 0;
      Alert.alert(
        'Bracket already exists',
        hasCompleted
          ? 'Some matches have already been played. Regenerating will erase all results. Are you sure?'
          : 'Regenerating will erase the current bracket. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Regenerate', style: 'destructive', onPress: generateBracket },
        ]
      );
      return;
    }
    generateBracket();
  };

  const generateBracket = async () => {
    setGenerating(true);
    const playerIds = registrations.map(r => r.player_id);
    const slots = buildMatchSlots(playerIds, tournamentId);

    const { error: deleteError } = await supabase
      .from('match')
      .delete()
      .eq('tournament_id', tournamentId);

    if (deleteError) {
      setGenerating(false);
      Alert.alert('Error', 'Could not clear previous bracket: ' + deleteError.message);
      return;
    }

    const { error } = await supabase.from('match').insert(slots);

    setGenerating(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setBracketExists(true);
      Alert.alert('Bracket Generated! 🎾', `${slots.length} matches created.`, [
        { text: 'View Results', onPress: () => navigation.navigate('MatchResult', { tournamentId, tournamentName }) },
        { text: 'OK' },
      ]);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: RegistrationWithPlayer }) => {
    const payment = PAYMENT_COLORS[item.payment_status];
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.player.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.playerName}>{item.player.full_name}</Text>
            <Text style={styles.playerEmail}>{item.player.email}</Text>
            <Text style={styles.playerMeta}>
              Registered {new Date(item.registered_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            onPress={() => handlePaymentStatus(item)}
            style={[styles.badge, { backgroundColor: payment.bg }]}
            accessibilityRole="button"
            accessibilityLabel={`Payment status: ${item.payment_status}. Tap to change.`}
          >
            <Text style={[styles.badgeText, { color: payment.text }]}>{item.payment_status}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.player.full_name}`}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {registrations.length} player{registrations.length !== 1 ? 's' : ''} registered
        </Text>
        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={[styles.addBtn, bracketExists && styles.addBtnDisabled]}
            onPress={() => {
              if (bracketExists) {
                Alert.alert('Bracket already generated', 'Remove the bracket before adding new players.');
                return;
              }
              setShowAddModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add player to tournament"
          >
            <Text style={[styles.addBtnText, bracketExists && styles.addBtnTextDisabled]}>+ Add</Text>
          </TouchableOpacity>
          {!isCompleted && (
            <TouchableOpacity
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={handleGenerateBracket}
              disabled={generating}
              accessibilityRole="button"
              accessibilityLabel="Generate tournament bracket"
            >
              {generating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.generateBtnText}>
                    {bracketExists ? '🔄 Regenerate' : '🎾 Generate Bracket'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Player</Text>
            {availablePlayers.length === 0 ? (
              <Text style={styles.modalEmpty}>All players are already registered.</Text>
            ) : (
              availablePlayers.map(player => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.modalRow}
                  onPress={() => handleAddPlayer(player)}
                  disabled={adding === player.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${player.full_name}`}
                >
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{player.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalPlayerName}>{player.full_name}</Text>
                    <Text style={styles.modalPlayerEmail}>{player.email}</Text>
                  </View>
                  {adding === player.id
                    ? <ActivityIndicator size="small" color="#0f4c81" />
                    : <Text style={styles.modalAddText}>Add</Text>
                  }
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddModal(false)}
              accessibilityRole="button" accessibilityLabel="Close add player dialog">
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={registrations}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No players registered yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  summaryBar: {
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  summaryText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  summaryActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: {
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#0f4c81', fontSize: 13, fontWeight: '700' },
  addBtnDisabled: { backgroundColor: '#e2e8f0' },
  addBtnTextDisabled: { color: '#94a3b8' },
  generateBtn: {
    backgroundColor: '#0f4c81', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 44, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0f4c81', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  playerEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },
  playerMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  removeBtn: {
    minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  removeBtnText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 4, paddingBottom: 36,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  modalEmpty: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 16 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#0f4c81', alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalPlayerName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  modalPlayerEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },
  modalAddText: { fontSize: 13, fontWeight: '700', color: '#0f4c81' },
  modalClose: {
    marginTop: 12, height: 48, backgroundColor: '#f1f5f9',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#475569' },
});
