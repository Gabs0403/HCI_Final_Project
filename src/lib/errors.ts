import { AuthError, PostgrestError } from '@supabase/supabase-js';

const POSTGRES_CODE_MESSAGES: Record<string, string> = {
  '23505': 'You are already registered for this tournament.',
  '23514': 'That value is not allowed.',
  '42501': 'You do not have permission to do that.',
  'PGRST116': 'Not found.',
  'P0002': 'Record not found.',
};

function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === 'object' && err !== null &&
    'code' in err && 'message' in err && 'details' in err
  );
}

function isAuthError(err: unknown): err is AuthError {
  return err instanceof Error && err.name === 'AuthApiError';
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err == null) return fallback;

  if (isPostgrestError(err)) {
    const byCode = POSTGRES_CODE_MESSAGES[err.code];
    if (byCode) return byCode;
    if (err.message.includes('not open for registration')) return 'This tournament is no longer accepting registrations.';
    if (err.message.includes('Tournament is full')) return 'Sorry, this tournament just filled up.';
    return err.message;
  }

  if (isAuthError(err)) return err.message;

  if (err instanceof Error) return err.message;

  if (typeof err === 'string') return err;

  return fallback;
}

export function getAuthErrorMessage(err: unknown): string {
  if (__DEV__ && err) console.warn('[auth]', err);
  if (isAuthError(err) || err instanceof Error) {
    return 'Please check your credentials and try again.';
  }
  return 'Something went wrong. Please try again.';
}
