

export enum PlayerRole {
  IGL = 'IGL',
  AWPER = 'AWPer',
  ENTRY = 'Entry Fragger',
  SUPPORT = 'Support',
  LURKER = 'Lurker'
}

export enum League {
  OPEN = 'ESEA Open',
  INTERMEDIATE = 'ESEA Intermediate',
  MAIN = 'ESEA Main',
  ADVANCED = 'ESEA Advanced',
  CHALLENGER = 'ESL Challenger',
  PRO = 'Pro League'
}

export interface PlayerStats {
  aim: number;
  reflex: number;
  strategy: number;
  utility: number;
  clutch: number;
}

export interface PlayerPerformance {
    kills: number;
    deaths: number;
    rating: number;
}

export interface Player {
  id: string;
  alias: string;
  fullName: string;
  age: number;
  country: string;
  role: PlayerRole;
  stats: PlayerStats;
  marketValue: number;
  salary: number;
  morale: number; // 0-100
  avatarSeed?: string;
  matchHistory: PlayerPerformance[]; // Track performance over time
}

export interface Team {
  id: string;
  name: string;
  league: League;
  players: Player[];
  budget: number;
  
  // Record
  wins: number;
  losses: number;
  matchesPlayed: number; // To keep sync with user
  
  // ESEA Specifics
  leaguePoints: number; // 3 for win, 0 for loss
  roundDifference: number; // RD
  
  // HLTV Specifics
  rankingPoints?: number; // Global Rank Points
  
  // Tactics
  mapStats?: Record<string, number>; // Map Name -> Proficiency (0-100)
}

export interface MatchLog {
  roundNumber: number;
  winner: 'us' | 'enemy';
  description: string;
  scoreUs: number;
  scoreEnemy: number;
}

export interface PlayerMatchStats {
  alias: string;
  country: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number; // Average Damage per Round
  kast: number; // Percentage
  rating: number; // 2.0 Rating
}

export interface MatchResult {
  enemyTeamName: string;
  finalScoreUs: number;
  finalScoreEnemy: number;
  logs: MatchLog[];
  mvpAlias: string;
  earnings: number;
  summary: string;
  isQualifier?: boolean;
  tournamentId?: string;
  playerStatsUs: PlayerMatchStats[];
  playerStatsEnemy: PlayerMatchStats[];
}

// New interface for League Results Table
export interface LeagueRoundResult {
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    winner: string;
}

export interface OpponentAnalysis {
  overview: string;
  keyPlayer: string;
  keyPlayerReason: string;
  strengths: string[];
  weaknesses: string[];
  strategy: string;
  winProbability: number;
}

export interface ScheduledMatch {
    id: string;
    date: string; // ISO Date string
    opponentId: string;
    isPlayed: boolean;
    type: 'LEAGUE' | 'TOURNAMENT' | 'PRACTICE';
    leagueName?: string; // e.g. "ESEA Open"
}

export enum GameView {
  DASHBOARD = 'DASHBOARD',
  LEAGUE = 'LEAGUE',
  MARKET = 'MARKET',
  SCHEDULE = 'SCHEDULE',
  RANKINGS = 'RANKINGS',
  MATCH_LOBBY = 'MATCH_LOBBY',
  MATCH_LIVE = 'MATCH_LIVE',
  PRACTICE = 'PRACTICE'
}

export type ParticipationStatus = 'invited' | 'qualified' | 'eliminated' | 'none';

export interface Tournament {
  id: string;
  name: string;
  startDate: string; // ISO YYYY-MM-DD
  prizePool: number;
  participationStatus: ParticipationStatus;
}