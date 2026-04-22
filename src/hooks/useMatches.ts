import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, UserProfile } from '@/types';

export interface MatchWithPlayers extends Match {
  player1: Pick<UserProfile, 'id' | 'full_name'> | null;
  player2: Pick<UserProfile, 'id' | 'full_name'> | null;
  winner: Pick<UserProfile, 'id' | 'full_name'> | null;
}

export function useMatches(tournamentId: string) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: matchRows, error: matchErr } = await supabase
      .from('match')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true });

    if (matchErr) {
      setError(matchErr.message);
      setLoading(false);
      return;
    }

    if (!matchRows || matchRows.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const playerIds = [
      ...new Set(
        matchRows
          .flatMap(m => [m.player1_id, m.player2_id, m.winner_id])
          .filter(Boolean)
      ),
    ] as string[];

    const map = new Map<string, Pick<UserProfile, 'id' | 'full_name'>>();
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user')
        .select('id, full_name')
        .in('id', playerIds);
      profiles?.forEach(p => map.set(p.id, p));
    }

    setMatches(
      matchRows.map(m => ({
        ...(m as Match),
        player1: m.player1_id ? (map.get(m.player1_id) ?? null) : null,
        player2: m.player2_id ? (map.get(m.player2_id) ?? null) : null,
        winner:  m.winner_id  ? (map.get(m.winner_id)  ?? null) : null,
      }))
    );
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useEffect(() => {
    const channel = supabase
      .channel(`matches:${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchMatches()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, fetchMatches]);

  const updateMatchResult = async (
    matchId: string,
    winnerId: string,
    score: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('match')
      .update({ winner_id: winnerId, score, status: 'completed' })
      .eq('id', matchId);

    if (error) return { error: error.message };

    const currentMatch = matches.find(m => m.id === matchId);
    let nextMatchId: string | null = null;
    let isPlayer1Slot = false;

    if (currentMatch) {
      const nextRound = currentMatch.round + 1;
      const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);
      isPlayer1Slot = currentMatch.match_number % 2 === 1;
      const nextMatch = matches.find(m => m.round === nextRound && m.match_number === nextMatchNumber);

      if (nextMatch) {
        nextMatchId = nextMatch.id;
        const field = isPlayer1Slot ? 'player1_id' : 'player2_id';
        await supabase.from('match').update({ [field]: winnerId }).eq('id', nextMatch.id);
      }
    }

    setMatches(prev =>
      prev.map(m => {
        if (m.id === matchId) {
          const winner = m.player1?.id === winnerId ? m.player1 : m.player2?.id === winnerId ? m.player2 : null;
          return { ...m, winner_id: winnerId, score, status: 'completed' as const, winner };
        }
        if (nextMatchId && m.id === nextMatchId) {
          const completedMatch = prev.find(x => x.id === matchId);
          const winnerProfile = completedMatch?.player1?.id === winnerId
            ? completedMatch.player1
            : completedMatch?.player2?.id === winnerId ? completedMatch.player2 : null;
          return {
            ...m,
            player1_id: isPlayer1Slot ? winnerId : m.player1_id,
            player2_id: isPlayer1Slot ? m.player2_id : winnerId,
            player1: isPlayer1Slot ? (winnerProfile ?? null) : m.player1,
            player2: isPlayer1Slot ? m.player2 : (winnerProfile ?? null),
          };
        }
        return m;
      })
    );

    return { error: null };
  };

  return { matches, loading, error, refetch: fetchMatches, updateMatchResult };
}
