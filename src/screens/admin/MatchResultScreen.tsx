import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '@/navigation/AdminNavigator';
import { useMatches, MatchWithPlayers } from '@/hooks/useMatches';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = NativeStackScreenProps<AdminStackParamList, 'MatchResult'>;

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinals';
  if (fromEnd === 2) return 'Quarterfinals';
  return `Round of ${Math.pow(2, fromEnd + 1)}`;
}

export function MatchResultScreen({ route }: Props) {
  const { tournamentId } = route.params;
  const { matches, loading, updateMatchResult } = useMatches(tournamentId);

  // Track per-match input state: { [matchId]: { score, winnerId, saving } }
  const [inputs, setInputs] = useState<
    Record<string, { score: string; winnerId: string | null; saving: boolean }>
  >({});

  const getInput = (matchId: string) =>
    inputs[matchId] ?? { score: '', winnerId: null, saving: false };

  const setScore = (matchId: string, score: string) =>
    setInputs(prev => ({ ...prev, [matchId]: { ...getInput(matchId), score } }));

  const setWinner = (matchId: string, winnerId: string) =>
    setInputs(prev => ({
      ...prev,
      [matchId]: {
        ...getInput(matchId),
        winnerId: getInput(matchId).winnerId === winnerId ? null : winnerId,
      },
    }));

  const handleSubmit = async (match: MatchWithPlayers) => {
    const { score, winnerId } = getInput(match.id);

    if (!winnerId) {
      Alert.alert('Select a winner', 'Tap a player name to mark them as the winner.');
      return;
    }
    if (!score.trim()) {
      Alert.alert('Enter score', 'Please enter the match score (e.g. 6-4, 7-5).');
      return;
    }

    setInputs(prev => ({ ...prev, [match.id]: { ...getInput(match.id), saving: true } }));

    const { error } = await updateMatchResult(match.id, winnerId, score.trim());

    if (error) {
      Alert.alert('Error', error);
      setInputs(prev => ({ ...prev, [match.id]: { ...getInput(match.id), saving: false } }));
    } else {
      // Clear the input after a successful save
      setInputs(prev => ({ ...prev, [match.id]: { score: '', winnerId: null, saving: false } }));
    }
  };

  if (loading) return <LoadingSpinner message="Loading bracket..." />;

  // Group matches by round
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {rounds.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches generated yet.</Text>
            <Text style={styles.emptySubText}>
              Matches are created once the tournament starts.
            </Text>
          </View>
        )}

        {rounds.map(round => (
          <View key={round} style={styles.roundSection}>
            <Text style={styles.roundTitle}>
              {getRoundLabel(round, totalRounds)}
            </Text>

            {matches
              .filter(m => m.round === round)
              .map((match, idx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  displayNumber={idx + 1}
                  input={getInput(match.id)}
                  onScoreChange={score => setScore(match.id, score)}
                  onWinnerToggle={winnerId => setWinner(match.id, winnerId)}
                  onSubmit={() => handleSubmit(match)}
                />
              ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: MatchWithPlayers;
  displayNumber: number;
  input: { score: string; winnerId: string | null; saving: boolean };
  onScoreChange: (score: string) => void;
  onWinnerToggle: (winnerId: string) => void;
  onSubmit: () => void;
}

function MatchCard({ match, displayNumber, input, onScoreChange, onWinnerToggle, onSubmit }: MatchCardProps) {
  const isCompleted = match.status === 'completed';
  const p1 = match.player1;
  const p2 = match.player2;

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      {/* Match number */}
      <Text style={styles.matchLabel}>Match {displayNumber}</Text>

      {/* Completed state — show result */}
      {isCompleted ? (
        <View style={styles.completedRow}>
          <Text style={styles.completedScore}>{match.score ?? '—'}</Text>
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerBadgeText}>
              🏆 {match.winner?.full_name ?? 'Unknown'}
            </Text>
          </View>
          <View style={styles.vsRow}>
            <Text style={[styles.playerName, match.winner_id === p1?.id && styles.playerWon]}>
              {p1?.full_name ?? 'TBD'}
            </Text>
            <Text style={styles.vs}>vs</Text>
            <Text style={[styles.playerName, match.winner_id === p2?.id && styles.playerWon]}>
              {p2?.full_name ?? 'TBD'}
            </Text>
          </View>
        </View>
      ) : (
        /* Pending state — show entry form */
        <>
          {/* Player selector */}
          <Text style={styles.fieldLabel}>Select winner</Text>
          <View style={styles.playerRow}>
            <PlayerButton
              name={p1?.full_name ?? 'TBD'}
              selected={input.winnerId === p1?.id}
              disabled={!p1}
              onPress={() => p1 && onWinnerToggle(p1.id)}
            />
            <Text style={styles.vs}>vs</Text>
            <PlayerButton
              name={p2?.full_name ?? 'TBD'}
              selected={input.winnerId === p2?.id}
              disabled={!p2}
              onPress={() => p2 && onWinnerToggle(p2.id)}
            />
          </View>

          {/* Score input */}
          <Text style={styles.fieldLabel}>Score</Text>
          <TextInput
            style={styles.scoreInput}
            value={input.score}
            onChangeText={onScoreChange}
            placeholder="e.g. 6-4, 7-5"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Match score"
            accessibilityHint="Enter the match score"
            returnKeyType="done"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, input.saving && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={input.saving}
            accessibilityRole="button"
            accessibilityLabel="Save match result"
          >
            {input.saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Save Result</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Player button ─────────────────────────────────────────────────────────────

interface PlayerButtonProps {
  name: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

function PlayerButton({ name, selected, disabled, onPress }: PlayerButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.playerBtn, selected && styles.playerBtnSelected, disabled && styles.playerBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Select ${name} as winner`}
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.playerBtnText, selected && styles.playerBtnTextSelected]}
        numberOfLines={2}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, gap: 24 },

  roundSection: { gap: 12 },
  roundTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCompleted: { borderLeftWidth: 4, borderLeftColor: '#16a34a' },
  matchLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Completed view
  completedRow: { gap: 6 },
  completedScore: { fontSize: 18, fontWeight: '800', color: '#0f4c81', textAlign: 'center' },
  winnerBadge: {
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'center',
  },
  winnerBadgeText: { fontSize: 13, fontWeight: '700', color: '#166534' },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  playerWon: { color: '#166534', fontWeight: '800' },

  // Form view
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  playerName: { fontSize: 14, color: '#475569', fontWeight: '500' },
  vs: { fontSize: 13, color: '#64748b', fontWeight: '600', marginHorizontal: 4 },

  playerBtn: {
    flex: 1, minHeight: 52, borderRadius: 12,
    borderWidth: 2, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  playerBtnSelected: { borderColor: '#0f4c81', backgroundColor: '#eff6ff' },
  playerBtnDisabled: { opacity: 0.4 },
  playerBtnText: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' },
  playerBtnTextSelected: { color: '#0f4c81' },

  scoreInput: {
    height: 48, borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14,
    fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc',
  },

  submitBtn: {
    height: 48, backgroundColor: '#0f4c81',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});
