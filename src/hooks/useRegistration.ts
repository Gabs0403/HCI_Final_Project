import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/errors';

export type RegisterResult =
  | { status: 'registered' }
  | { status: 'already-registered' }
  | { status: 'tournament-full' }
  | { status: 'tournament-closed' }
  | { status: 'not-signed-in' }
  | { status: 'error'; message: string };

export function useRegistration() {
  const { userProfile } = useAuth();

  const register = async (tournamentId: string): Promise<RegisterResult> => {
    if (!userProfile) return { status: 'not-signed-in' };

    const { error } = await supabase.from('registration').insert({
      tournament_id: tournamentId,
      player_id: userProfile.id,
    });
    if (!error) return { status: 'registered' };
    if (error.code === '23505') return { status: 'already-registered' };
    if (error.message.includes('not open for registration')) {
      return { status: 'tournament-closed' };
    }
    if (error.message.includes('Tournament is full')) {
      return { status: 'tournament-full' };
    }
    return { status: 'error', message: getErrorMessage(error) };
  };

  const cancel = async (tournamentId: string): Promise<{ error: string | null }> => {
    if (!userProfile) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('registration')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('player_id', userProfile.id);
    return { error: error ? getErrorMessage(error) : null };
  };

  return { register, cancel };
}

export function useIsRegistered(tournamentId: string | null) {
  const { userProfile } = useAuth();
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!tournamentId || !userProfile?.id) {
      setRegistered(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('registration')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('player_id', userProfile.id)
      .maybeSingle();
    setRegistered(!!data);
    setLoading(false);
  }, [tournamentId, userProfile?.id]);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!tournamentId || !userProfile?.id) return;
    const channel = supabase
      .channel(`registration:${tournamentId}:${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registration',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => check(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, userProfile?.id, check]);

  return { registered, loading, refetch: check };
}
