

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
  xp: Record<keyof PlayerStats, number>; 
  
  marketValue: number;
  salary: number;
  morale: number; 
  avatarSeed?: string;
  imageUrl?: string;
  matchHistory: PlayerPerformance[];
}

export interface MapPracticeStats {
    pistol: number;
    ct: number;
    t: number;
    strat: number;
}

export interface Coach {
    id: string;
    name: string;
    type: 'HEAD' | 'PERFORMANCE';
    assignedPlayerId?: string; // For Performance coaches
    focus?: 'LOWEST' | 'ROLE' | 'BALANCED';
}

export interface AutomationConfig {
    autoMapTraining: boolean;
    autoSchedule: boolean;
    autoIndividual: boolean;
}

export interface Team {
  id: string;
  name: string;
  league: League;
  players: Player[];
  budget: number;
  
  wins: number;
  losses: number;
  matchesPlayed: number;
  
  leaguePoints: number;
  roundDifference: number;
  rankingPoints?: number;
  
  mapStats: Record<string, number>;
  practiceStats?: Record<string, MapPracticeStats>;
  permaban?: string;
  
  isMapPoolInitialized?: boolean;
  firstPickMap?: string;
  lastTrainedMapId?: string;
  consecutiveMapTrainCount?: number;
  weeklySchedule: TrainingIntensity[];
  
  preferredTactic?: Tactic;
  
  coaches: Coach[];
  automationConfig: AutomationConfig;
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
  moneyUs: number;
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
  isPlayoff?: boolean;
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
  suggestedTactic: Tactic;
}

export interface ScheduledMatch {
    id: string;
    date: string;
    opponentId: string;
    isPlayed: boolean;
    type: 'LEAGUE' | 'TOURNAMENT' | 'PRACTICE' | 'PLAYOFF';
    leagueName?: string;
    playoffRound?: 'QF' | 'SF' | 'F';
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

export type SeasonPhase = 'REGULAR' | 'PLAYOFFS' | 'OFF_SEASON';

export interface PlayoffMatch {
    id: string;
    round: 'QF' | 'SF' | 'F';
    teamA: Team;
    teamB: Team;
    scoreA?: number;
    scoreB?: number;
    winner?: Team;
    date: string;
    isPlayed: boolean;
}

export interface SeriesState {
    active: boolean;
    maps: string[]; // [Pick1, Pick2, Decider]
    currentMapIndex: number;
    scoreUs: number;
    scoreEnemy: number;
}

// SHARED DRILL DEFINITIONS
export type DrillType = 'DEATHMATCH' | 'RETAKE' | 'GRENADE' | 'DEMO' | 'SCRIM' | 'REACTION';

export const DRILLS: { id: DrillType, name: string, main: keyof PlayerStats, sub: keyof PlayerStats, desc: string }[] = [
    { id: 'DEATHMATCH', name: 'Deathmatch Session', main: 'aim', sub: 'reflex', desc: '+Aim, +Reflex' },
    { id: 'RETAKE', name: 'Retake Scenarios', main: 'clutch', sub: 'strategy', desc: '+Clutch, +Strategy' },
    { id: 'GRENADE', name: 'Grenade Lineups', main: 'utility', sub: 'strategy', desc: '+Utility, +Strategy' },
    { id: 'DEMO', name: 'Demo Review', main: 'strategy', sub: 'teamwork', desc: '+Strategy, +Teamwork' },
    { id: 'SCRIM', name: '5vs5 Scrim', main: 'teamwork', sub: 'clutch', desc: '+Teamwork, +Mental' },
    { id: 'REACTION', name: 'Reaction Test', main: 'reflex', sub: 'aim', desc: '+Reflex, +Aim' },
];