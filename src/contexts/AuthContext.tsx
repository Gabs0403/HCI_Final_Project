import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  pendingConfirmation: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const noop = async () => {
  console.error('useAuth() was called outside <AuthProvider>');
};

const defaultValue: AuthContextValue = {
  session: null,
  userProfile: null,
  loading: false,
  pendingConfirmation: false,
  signIn: noop,
  signUp: noop,
  signOut: noop,
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

const PROFILE_FETCH_TIMEOUT_MS = 10_000;
const PROFILE_RETRY_DELAY_MS = 500;
const PROFILE_MAX_RETRIES = 3;

function timeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => reject(new Error('Profile fetch timed out')), ms);
    Promise.resolve(promise).then(
      v => { clearTimeout(handle); resolve(v); },
      e => { clearTimeout(handle); reject(e); },
    );
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(prev => prev ?? data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (!newSession) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    const fetchProfile = async (attempt = 0): Promise<void> => {
      try {
        const { data, error } = await timeout(
          supabase.from('user').select('*').eq('id', userId).single(),
          PROFILE_FETCH_TIMEOUT_MS,
        );
        if (cancelled) return;

        if (error) {
          if (error.code === 'PGRST116' && attempt < PROFILE_MAX_RETRIES) {
            await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS));
            if (cancelled) return;
            return fetchProfile(attempt + 1);
          }
          console.warn('Failed to load user profile', error.message);
          setUserProfile(null);
        } else {
          setUserProfile(data as UserProfile);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Profile fetch error', err);
        setUserProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    setPendingConfirmation(!data.session);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setPendingConfirmation(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, userProfile, loading, pendingConfirmation, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
