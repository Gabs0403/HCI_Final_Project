export type UserRole = 'player' | 'admin';

export type TournamentStatus =
  | 'upcoming'
  | 'registration_open'
  | 'in_progress'
  | 'completed';

export type SurfaceType = 'clay' | 'grass' | 'hard' | 'indoor';

export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'walkover';

export type RegStatus = 'pending' | 'confirmed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  max_players: number;
  entry_fee: number;
  rules: string;
  status: TournamentStatus;
  surface: SurfaceType;
  current_players: number;
  created_by: string;
  created_at: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  player_id: string;
  registration_status: RegStatus;
  payment_status: PaymentStatus;
  registered_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  score: string | null;
  status: MatchStatus;
  scheduled_at: string | null;
  created_at: string;
}
