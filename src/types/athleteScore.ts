export interface AthleteScore {
  id: string;
  client_id: string;
  score: number;
  tier: 'beast_mode' | 'locked_in' | 'showing_up' | 'slipping' | 'benched';
  workout_completion_score: number;
  program_adherence_score: number;
  checkin_completion_score: number;
  goal_progress_score: number;
  nutrition_compliance_score: number;
  window_start: string;
  window_end: string;
  calculated_at: string;
}

export interface AthleteScoreTier {
  key: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;       // gradient start color
  colorEnd: string;    // gradient end color
  emoji: string;
}

export const ATHLETE_TIERS: AthleteScoreTier[] = [
  { key: 'beast_mode', label: 'Beast Mode', minScore: 90, maxScore: 100, color: '#FF6B00', colorEnd: '#FFD700', emoji: '🏆' },
  { key: 'locked_in', label: 'Locked In', minScore: 75, maxScore: 89, color: '#FF8C00', colorEnd: '#FFA500', emoji: '🔥' },
  { key: 'showing_up', label: 'Showing Up', minScore: 55, maxScore: 74, color: '#0EA5E9', colorEnd: '#38BDF8', emoji: '⚡' },
  { key: 'slipping', label: 'Slipping', minScore: 35, maxScore: 54, color: '#6B7280', colorEnd: '#9CA3AF', emoji: '⚠️' },
  { key: 'benched', label: 'Benched', minScore: 0, maxScore: 34, color: '#374151', colorEnd: '#4B5563', emoji: '💤' },
];
