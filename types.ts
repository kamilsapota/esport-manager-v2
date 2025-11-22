
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

export enum Tactic {
  DEFAULT = 'Default',
  AGGRESSIVE = 'Aggressive',
  PASSIVE = 'Passive'
}

export enum TrainingIntensity {
  REST = 'Rest',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy'
}

export interface PlayerStats {
  aim: number;
  reflex: number;
  strategy: number;
  utility: number;
  teamwork: number;
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
  
  // XP System
  xp: Record<keyof PlayerStats, number>; // Current XP for each stat
  
  marketValue: number;
  salary: number;
  morale: number; // 0-100
  avatarSeed?: string;
  matchHistory: PlayerPerformance[];
}

export interface MapPracticeStats {
    pistol: number;
    ct: number;
    t: number;
    strat: number;
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
  matchesPlayed: number;
  
  // ESEA Specifics
  leaguePoints: number;
  roundDifference: number;
  
  // HLTV Specifics
  rankingPoints?: number;
  
  // Tactics & Training
  mapStats: Record<string, number>;
  practiceStats?: Record<string, MapPracticeStats>;
  permaban?: string;
  
  // Training Logic
  isMapPoolInitialized?: boolean;
  firstPickMap?: string;
  lastTrainedMapId?: string;
  consecutiveMapTrainCount?: number;
  weeklySchedule: TrainingIntensity[]; // Index 0 = Sunday, 1 = Monday, etc.
  
  // Match Strategy
  preferredTactic?: Tactic;
}

export interface KillEvent {
    killer: string;
    victim: string;
    assister?: string;
    weapon: 'ak47' | 'm4a4' | 'm4a1' | 'awp' | 'deagle' | 'usp' | 'glock' | 'hkp2000' | 'tec9' | 'galilar' | 'knife' | 'hegrenade' | 'inferno' | 'mp9' | 'mac10' | 'famas' | 'ssg08' | 'p250' | 'fiveseven' | 'elite' | 'xm1014';
    isHeadshot: boolean;
    killerSide: 'CT' | 'T';
}

export interface MatchLog {
  roundNumber: number;
  winner: 'us' | 'enemy';
  description: string;
  scoreUs: number;
  scoreEnemy: number;
  events: KillEvent[];
  moneyUs: number; // Track for UI/Debugging
  moneyEnemy: number;
}

export interface PlayerMatchStats {
  alias: string;
  country: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  kast: number;
  rating: number;
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
  mapPlayed?: string;
}

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
  bestMap?: string;
  bestMapWinRate?: number;
  worstMap?: string;
  worstMapWinRate?: number;
}

export interface ScheduledMatch {
    id: string;
    date: string;
    opponentId: string;
    isPlayed: boolean;
    type: 'LEAGUE' | 'TOURNAMENT' | 'PRACTICE';
    leagueName?: string;
}

export enum GameView {
  DASHBOARD = 'DASHBOARD',
  LEAGUE = 'LEAGUE',
  MARKET = 'MARKET',
  SCHEDULE = 'SCHEDULE',
  RANKINGS = 'RANKINGS',
  MATCH_LOBBY = 'MATCH_LOBBY',
  MAP_VETO = 'MAP_VETO',
  MATCH_LIVE = 'MATCH_LIVE',
  PRACTICE = 'PRACTICE'
}

export type ParticipationStatus = 'invited' | 'qualified' | 'eliminated' | 'none';

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  prizePool: number;
  participationStatus: ParticipationStatus;
}
