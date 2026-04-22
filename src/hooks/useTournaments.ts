import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tournament, TournamentStatus } from '@/types';

interface FetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

async function autoUpdateStatuses(rows: Tournament[]): Promise<Tournament[]> {
  const today = new Date().toISOString().split('T')[0];

  const toInProgress = rows
    .filter(t =>
      (t.status === 'upcoming' || t.status === 'registration_open') &&
      t.start_date <= today && t.end_date >= today,
    )
    .map(t => t.id);

  const toCompleted = rows
    .filter(t => t.status !== 'completed' && t.end_date < today)
    .map(t => t.id);

  if (toInProgress.length > 0) {
    await supabase.from('tournament').update({ status: 'in_progress' }).in('id', toInProgress);
  }
  if (toCompleted.length > 0) {
    await supabase.from('tournament').update({ status: 'completed' }).in('id', toCompleted);
  }

  return rows.map(t => {
    if (toInProgress.includes(t.id)) return { ...t, status: 'in_progress' as TournamentStatus };
    if (toCompleted.includes(t.id))  return { ...t, status: 'completed'  as TournamentStatus };
    return t;
  });
}

export function useTournaments(): FetchState<Tournament[]> {
  const [data, setData] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await supabase
      .from('tournament')
      .select('*')
      .order('start_date', { ascending: true })
      .returns<Tournament[]>();
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setError(null);
      const updated = await autoUpdateStatuses(rows ?? []);
      setData(updated);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('tournaments:list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament' },
        () => fetchAll(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}

export function useTournament(id: string | null): FetchState<Tournament | null> {
  const [data, setData] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) { setData(null); setError(null); return; }
    setLoading(true);
    const { data: row, error: err } = await supabase
      .from('tournament')
      .select('*')
      .eq('id', id)
      .single<Tournament>();
    if (err) {
      setError(err.message);
      setData(null);
    } else {
      let t = row;
      const today = new Date().toISOString().split('T')[0];
      if (t.end_date < today && t.status !== 'completed') {
        await supabase.from('tournament').update({ status: 'completed' }).eq('id', t.id);
        t = { ...t, status: 'completed' as TournamentStatus };
      } else if (
        (t.status === 'upcoming' || t.status === 'registration_open') &&
        t.start_date <= today && t.end_date >= today
      ) {
        await supabase.from('tournament').update({ status: 'in_progress' }).eq('id', t.id);
        t = { ...t, status: 'in_progress' as TournamentStatus };
      }
      setError(null);
      setData(t);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOne(); }, [fetchOne]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tournament:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament', filter: `id=eq.${id}` },
        () => fetchOne(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchOne]);

  return { data, loading, error, refetch: fetchOne };
}
