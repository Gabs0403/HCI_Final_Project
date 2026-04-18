import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tournament } from '@/types';

interface FetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
      setData(rows ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}

export function useTournament(id: string | null): FetchState<Tournament | null> {
  const [data, setData] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id) {
      setData(null);
      setError(null);
      return;
    }
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
      setError(null);
      setData(row);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { data, loading, error, refetch: fetchOne };
}
