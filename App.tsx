import React, { useState, useEffect } from 'react';
import { Team, Player, GameView, MatchResult, PlayerRole, Tournament, League, LeagueRoundResult, OpponentAnalysis, ScheduledMatch, MapPracticeStats, Tactic, TrainingIntensity } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PlayerCard } from './components/PlayerCard';
import { MarketView } from './components/MarketView';
import { MatchView } from './components/MatchView';
import { ScheduleView } from './components/ScheduleView';
import { RankingsView } from './components/RankingsView';
import { LeagueView } from './components/LeagueView';
import { StartScreen } from './components/StartScreen';
import { MatchLobby } from './components/MatchLobby';
import { PracticeView, DrillType } from './components/PracticeView';
import { MapVeto } from './components/MapVeto';
import { analyzeMatchup, simulateRound } from './services/geminiService';
import { TEAMS_BY_LEAGUE, generateRoster } from './data/realTeams';
import { Loader2, AlertTriangle, Trophy, ArrowRight, Scan, Crosshair, ShieldAlert, BrainCircuit, Calendar, Lock, ThumbsUp, ThumbsDown, TrendingUp, Hourglass, CheckCircle, Target, Zap, ArrowUp, Activity } from 'lucide-react';

const EMPTY_TEAM: Team = {
  id: 'temp-id',
  name: '',
  league: League.OPEN, 
  players: [],
  budget: 2500,
  wins: 0,
  losses: 0,
  matchesPlayed: 0,
  leaguePoints: 0,
  roundDifference: 0,
  mapStats: {},
  weeklySchedule: Array(7).fill(TrainingIntensity.MEDIUM) 
};

const INITIAL_TOURNAMENTS: Tournament[] = [
  { id: 't1', name: 'IEM Katowice 2024', startDate: '2024-01-31', prizePool: 1000000, participationStatus: 'none' },
  { id: 't2', name: 'PGL Major Copenhagen', startDate: '2024-03-17', prizePool: 1250000, participationStatus: 'none' },
  { id: 't3', name: 'IEM Chengdu 2024', startDate: '2024-04-08', prizePool: 250000, participationStatus: 'none' },
  { id: 't4', name: 'ESL Pro League S19', startDate: '2024-04-23', prizePool: 750000, participationStatus: 'none' },
  { id: 't5', name: 'IEM Dallas 2024', startDate: '2024-05-27', prizePool: 250000, participationStatus: 'none' },
  { id: 't6', name: 'IEM Cologne 2024', startDate: '2024-08-07', prizePool: 1000000, participationStatus: 'none' },
  { id: 't7', name: 'BLAST Premier Fall', startDate: '2024-09-25', prizePool: 425000, participationStatus: 'none' },
  { id: 't8', name: 'Perfect World Shanghai Major', startDate: '2024-12-01', prizePool: 1250000, participationStatus: 'none' }
];

type DailyGain = {
  type: 'map' | 'xp' | 'passive' | 'mental';
  subject: string; 
  stat?: string;
  value: number;
};

const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FR', name: 'France' },
    { code: 'SE', name: 'Sweden' },
    { code: 'BR', name: 'Brazil' },
    { code: 'RU', name: 'Russia' },
    { code: 'PL', name: 'Poland' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'DE', name: 'Germany' },
    { code: 'FI', name: 'Finland' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'CN', name: 'China' },
    { code: 'ES', name: 'Spain' },
];

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [view, setView] = useState<GameView>(GameView.DASHBOARD);
  const [currentDate, setCurrentDate] = useState(new Date('2024-01-01'));
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [schedule, setSchedule] = useState<ScheduledMatch[]>([]);
  
  const [myTeam, setMyTeam] = useState<Team>(EMPTY_TEAM);
  
  const [dailyActivities, setDailyActivities] = useState({
      mapTraining: false,
      individualDrills: 0 
  });
  
  const [isDailyTrainingComplete, setIsDailyTrainingComplete] = useState(false);
  const [dailyGains, setDailyGains] = useState<DailyGain[]>([]);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [leagueOpponents, setLeagueOpponents] = useState<Team[]>([]);
  const [latestRoundResults, setLatestRoundResults] = useState<LeagueRoundResult[]>([]);
  const [nextOpponent, setNextOpponent] = useState<Team | null>(null);
  const [analysis, setAnalysis] = useState<OpponentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingMatchContext, setPendingMatchContext] = useState<{isQualifier: boolean, tournamentId?: string} | null>(null);
  const [liveMatchData, setLiveMatchData] = useState<{enemy: Team, mapId: string, context: string, fatiguePenalty: number} | null>(null);
  
  const [matchState, setMatchState] = useState<{
    isLoading: boolean;
    result: MatchResult | null;
    currentEnemyId?: string;
  }>({ isLoading: false, result: null });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<Array<{id: number, subject: string, sender: string, read: boolean, body?: string, date: string}>>([]);

  useEffect(() => {
    const allLeagueTeams = TEAMS_BY_LEAGUE[myTeam.league];
    setLeagueOpponents(allLeagueTeams.slice(0, 19));
  }, [myTeam.league]);

  useEffect(() => {
    const nextMatch = schedule.find(m => !m.isPlayed);
    if (nextMatch && leagueOpponents.length > 0) {
        const opponent = leagueOpponents.find(t => t.id === nextMatch.opponentId);
        if (opponent && (!nextOpponent || nextOpponent.id !== opponent.id)) {
            setNextOpponent(opponent);
            setAnalysis(null);
        }
    } else if (!nextMatch && leagueOpponents.length > 0 && schedule.length > 0) {
        setNextOpponent(null);
    }
  }, [schedule, leagueOpponents, nextOpponent]);

  const isMatchDay = schedule.some(m => 
    new Date(m.date).toDateString() === currentDate.toDateString() && !m.isPlayed
  );

  const nextScheduledMatch = schedule.find(m => !m.isPlayed);

  const generateSeasonSchedule = (startDate: Date, opponents: Team[], league: League): ScheduledMatch[] => {
      const newSchedule: ScheduledMatch[] = [];
      let scheduleDate = new Date(startDate);
      const shuffledOpponents = [...opponents].sort(() => 0.5 - Math.random());
      scheduleDate.setDate(scheduleDate.getDate() + 4);

      shuffledOpponents.slice(0, 15).forEach((opponent) => {
          const interval = Math.floor(Math.random() * 4) + 4;
          newSchedule.push({
              id: crypto.randomUUID(),
              date: scheduleDate.toISOString(),
              opponentId: opponent.id,
              isPlayed: false,
              type: 'LEAGUE',
              leagueName: league === League.OPEN ? 'ESEA Open' : league.split(' ')[0]
          });
          const nextDate = new Date(scheduleDate);
          nextDate.setDate(nextDate.getDate() + interval);
          scheduleDate = nextDate;
      });
      return newSchedule;
  };

  const handleStartGame = (teamName: string, country: string) => {
    const startLeague = League.OPEN;
    const leagueTeams = TEAMS_BY_LEAGUE[startLeague];
    let totalRating = 0;
    let totalPlayers = 0;
    
    leagueTeams.forEach(team => {
        team.players.forEach(p => {
            const r = (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility) / 4;
            totalRating += r;
            totalPlayers++;
        });
    });
    
    const avgLeagueRating = Math.round(totalRating / (totalPlayers || 1));
    
    // Generate and Adjust Roster Age Logic
    let initialRoster = generateRoster(country, avgLeagueRating + 5, 0.5);
    
    // 1. Find IGL and set age 21-23
    const iglIndex = initialRoster.findIndex(p => p.role === PlayerRole.IGL);
    if (iglIndex !== -1) {
        initialRoster[iglIndex].age = 21 + Math.floor(Math.random() * 3); // 21, 22, 23
    }

    // 2. Pick one random non-IGL for age 16-17
    const otherIndices = initialRoster.map((_, i) => i).filter(i => i !== iglIndex);
    const youngsterIndex = otherIndices[Math.floor(Math.random() * otherIndices.length)];
    initialRoster[youngsterIndex].age = 16 + Math.floor(Math.random() * 2); // 16, 17

    // 3. Set remaining to 18-21
    otherIndices.filter(i => i !== youngsterIndex).forEach(i => {
        initialRoster[i].age = 18 + Math.floor(Math.random() * 4); // 18, 19, 20, 21
    });

    // Set initial messages
    const countryName = COUNTRIES.find(c => c.code === country)?.name || country;
    const startStr = "01/01/2024";

    setMessages([
        {
            id: 1,
            sender: "League Operations",
            subject: "The Path to Glory - Welcome to Season 48",
            read: false,
            date: startStr,
            body: `<p>Welcome to <b>Season 48</b>. You are beginning your journey in the <b>ESEA Open League</b>.</p><br><p><b>The Ladder:</b><br>ESEA Open &rarr; Intermediate &rarr; Main &rarr; Advanced &rarr; ESL Challenger &rarr; <span class="text-fm-accent">ESL Pro League</span></p><br><p><b>Season Rules:</b><br>The league follows a round-robin format. The top 8 teams will qualify for the playoffs. Only the playoff winner promotes to the next division.</p>`
        },
        {
            id: 2,
            sender: "Assistant Coach",
            subject: "Training Report: Map Pool & Schedule Strategy",
            read: false,
            date: startStr,
            body: `<p>Boss, I've set up the training facility. Here is how our map pool works:</p><ul class="list-disc pl-4 mt-2 space-y-1"><li><b>Permaban:</b> Starts at 0% Mastery. Very hard to improve.</li><li><b>First Pick:</b> Starts at 45% Mastery. Can reach 100%.</li><li><b>Focus Maps:</b> Start at 35% Mastery.</li><li><b>Rest:</b> Start at 20%. Capped at 85%.</li></ul><br><p><b>Warning:</b> Training the same map 5 days in a row causes fatigue (diminishing returns). Also, be careful with <b>Heavy</b> training intensity on match days - it will penalize our performance!</p>`
        },
        {
            id: 3,
            sender: "Head Analyst",
            subject: "Tactical Briefing: Winning the Mental War",
            read: false,
            date: startStr,
            body: `<p>Here is how we win tactical battles this season.</p><br><p>1. <b>Scout the Enemy:</b> Use the "Scout" button in the Match Lobby to reveal their strategy.</p><p>2. <b>Counter-Strat:</b><br>&bull; If they play <i>Aggressive</i> &rarr; We play <i>Passive</i>.<br>&bull; If they play <i>Passive</i> &rarr; We play <i>Default</i>.</p><p>3. <b>Timeouts:</b> You have 3 tactical timeouts per match. Use them to switch tactics mid-game based on my advice.</p>`
        },
        { 
            id: 4, 
            sender: "Scouting Network", 
            subject: `New young talents found in ${countryName}`, 
            read: false,
            date: startStr,
            body: `<p>Our scouting network in <b class="text-white">${countryName}</b> has identified several promising young players.</p><br><p>These recruits show exceptional ambition and the raw mechanical skill required to compete at a high level. Review the roster to see their roles and potential.</p>` 
        }
    ]);
    
    const maps = ['Dust2', 'Mirage', 'Inferno', 'Nuke', 'Train', 'Overpass', 'Ancient'];
    const mapStats: Record<string, number> = {};
    const practiceStats: Record<string, MapPracticeStats> = {};
    
    maps.forEach(m => {
        mapStats[m] = 0; 
        practiceStats[m] = { pistol: 0, ct: 0, t: 0, strat: 0 };
    });

    setMyTeam({
        id: 'user-team',
        name: teamName,
        league: startLeague,
        players: initialRoster,
        budget: 2500,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        leaguePoints: 0,
        roundDifference: 0,
        mapStats,
        practiceStats,
        isMapPoolInitialized: false,
        consecutiveMapTrainCount: 0,
        lastTrainedMapId: undefined,
        weeklySchedule: Array(7).fill(TrainingIntensity.MEDIUM),
        preferredTactic: Tactic.DEFAULT
    });

    const startDate = new Date('2024-01-01');
    setCurrentDate(startDate);
    
    const seasonSchedule = generateSeasonSchedule(startDate, TEAMS_BY_LEAGUE[startLeague].slice(0, 19), startLeague);
    setSchedule(seasonSchedule);

    setIsGameStarted(true);
  };

  const handleMarkMessageRead = (id: number) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  // ... (Training logic) ...
  const processPassiveTraining = () => {
    if (isDailyTrainingComplete) return;
    const dayOfWeek = (currentDate.getDay() + 6) % 7; 
    const scheduledIntensity = myTeam.weeklySchedule[dayOfWeek];
    
    let mentalChange = 0;
    let baseXp = 0;

    switch (scheduledIntensity) {
        case TrainingIntensity.REST:
            mentalChange = 10; baseXp = 0; break;
        case TrainingIntensity.LIGHT:
            mentalChange = 5; baseXp = 40; break;
        case TrainingIntensity.MEDIUM:
            mentalChange = -5; baseXp = 80; break;
        case TrainingIntensity.HEAVY:
            mentalChange = -15; baseXp = 150; break;
    }

    setMyTeam(prev => {
        const updatedPlayers = prev.players.map(p => {
            const player = { ...p };
            const xp = { ...player.xp };
            const stats = { ...player.stats };
            player.morale = Math.max(0, Math.min(100, player.morale + mentalChange));
            if (Math.abs(mentalChange) >= 5) {
                 setDailyGains(g => {
                     if(!g.some(l => l.type === 'mental' && l.subject === player.alias)) {
                         return [...g, { type: 'mental', subject: player.alias, stat: 'MENTAL', value: mentalChange }]
                     }
                     return g;
                 });
            }

            if (baseXp > 0) {
                const variance = 0.8 + (Math.random() * 0.4);
                const xpGain = Math.floor(baseXp * variance);
                const allStats: (keyof typeof stats)[] = ['aim', 'reflex', 'strategy', 'utility', 'teamwork', 'clutch'];
                for(let i=0; i<3; i++) {
                    const randomStat = allStats[Math.floor(Math.random() * allStats.length)];
                    const portion = Math.floor(xpGain / 3);
                    if (stats[randomStat] < 99) {
                        xp[randomStat] += portion;
                        let req = 500 + (stats[randomStat] * 50);
                        while (xp[randomStat] >= req && stats[randomStat] < 99) {
                            xp[randomStat] -= req;
                            stats[randomStat] += 1;
                            req = 500 + (stats[randomStat] * 50);
                        }
                    }
                }
                setDailyGains(g => {
                    if(!g.some(l => l.type === 'passive' && l.subject === player.alias)) {
                         return [...g, { type: 'passive', subject: player.alias, stat: 'GENERAL', value: xpGain }]
                    }
                    return g;
                });
            }
            player.xp = xp;
            player.stats = stats;
            return player;
        });
        return { ...prev, players: updatedPlayers };
    });
    setIsDailyTrainingComplete(true);
  };

  const advanceDay = (days: number = 1) => {
    if (isMatchDay) {
        setErrorMessage("It's Match Day! You must play your scheduled match before advancing.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
    }
    processPassiveTraining();
    setShowDaySummary(true);
  };

  const handleConfirmDayAdvance = () => {
      setShowDaySummary(false);
      setDailyGains([]); 
      setDailyActivities({ mapTraining: false, individualDrills: 0 });
      setIsDailyTrainingComplete(false);
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
  };

  const handleHirePlayer = (player: Player) => {
    if (myTeam.players.length >= 5) return;
    if (myTeam.budget < player.marketValue) return;
    setMyTeam(prev => ({ ...prev, players: [...prev.players, player], budget: prev.budget - player.marketValue }));
  };

  const handleFirePlayer = (player: Player) => {
    setMyTeam(prev => ({ ...prev, players: prev.players.filter(p => p.id !== player.id), budget: prev.budget + Math.floor(player.marketValue * 0.5) }));
  };

  const handleTraining = (mapId: string, skill: keyof MapPracticeStats) => {
      if (dailyActivities.mapTraining) return;
      setMyTeam(prev => {
          const currentProficiency = prev.mapStats[mapId] || 0;
          const isFirstPick = prev.firstPickMap === mapId;
          const maxCap = isFirstPick ? 100 : 85;
          if (currentProficiency >= maxCap) {
              setErrorMessage(isFirstPick ? "Map Mastery already at MAX!" : "Map capped at 85%. Only your First Pick can reach 100%.");
              setTimeout(() => setErrorMessage(null), 4000);
              return prev; 
          }
          let newStreak = 1;
          if (prev.lastTrainedMapId === mapId) { newStreak = (prev.consecutiveMapTrainCount || 0) + 1; }
          let gain = 1.0; 
          if (currentProficiency >= 75) gain = 0.25;
          else if (currentProficiency >= 50) gain = 0.5;
          if (newStreak >= 5) gain = gain * 0.5;
          const currentPractice = prev.practiceStats?.[mapId] || { pistol: 0, ct: 0, t: 0, strat: 0 };
          const improvement = (gain * 4);
          const newSkillValue = Math.min(100, currentPractice[skill] + improvement);
          const newPracticeStatsForMap = { ...currentPractice, [skill]: newSkillValue };
          const totalSkill = newPracticeStatsForMap.pistol + newPracticeStatsForMap.ct + newPracticeStatsForMap.t + newPracticeStatsForMap.strat;
          const newMapMastery = Math.min(maxCap, totalSkill / 4);
          const updatedMapStats = { ...prev.mapStats };
          const updatedPracticeStats = { ...prev.practiceStats };
          updatedPracticeStats[mapId] = newPracticeStatsForMap;
          updatedMapStats[mapId] = newMapMastery;
          setDailyGains(g => [...g, { type: 'map', subject: mapId, stat: (skill as string).toUpperCase(), value: improvement }]);
          return { ...prev, practiceStats: updatedPracticeStats, mapStats: updatedMapStats, lastTrainedMapId: mapId, consecutiveMapTrainCount: newStreak };
      });
      setDailyActivities(prev => ({ ...prev, mapTraining: true }));
  };

  const handleIndividualTraining = (playerId: string, drillType: DrillType) => {
      if (dailyActivities.individualDrills >= 3) return;
      setMyTeam(prev => {
          const players = prev.players.map(p => {
              if (p.id !== playerId) return p;
              const player = { ...p };
              const stats = { ...player.stats };
              const xp = { ...(player.xp || { aim: 0, reflex: 0, strategy: 0, clutch: 0, utility: 0, teamwork: 0 }) };
              const drillConfig: Record<string, { main: keyof typeof stats, sub: keyof typeof stats }> = {
                  'DEATHMATCH': { main: 'aim', sub: 'reflex' },
                  'RETAKE': { main: 'clutch', sub: 'strategy' },
                  'GRENADE': { main: 'utility', sub: 'strategy' },
                  'DEMO': { main: 'strategy', sub: 'teamwork' },
                  'SCRIM': { main: 'teamwork', sub: 'clutch' },
                  'REACTION': { main: 'reflex', sub: 'aim' },
              };
              const config = drillConfig[drillType];
              const totalXpGain = Math.floor(Math.random() * 201) + 400;
              const mainGain = Math.floor(totalXpGain * 0.7);
              const subGain = totalXpGain - mainGain;
              const applyXp = (stat: keyof typeof stats, gain: number) => {
                   if (stats[stat] >= 99) return; 
                   xp[stat] += gain;
                   setDailyGains(g => [...g, { type: 'xp', subject: player.alias, stat: (stat as string).toUpperCase(), value: gain }]);
                   let req = 500 + (stats[stat] * 50);
                   while (xp[stat] >= req && stats[stat] < 99) {
                       xp[stat] -= req; stats[stat] += 1; req = 500 + (stats[stat] * 50);
                   }
              };
              applyXp(config.main, mainGain);
              applyXp(config.sub, subGain);
              if (drillType === 'SCRIM') player.morale = Math.min(100, player.morale + 5);
              else player.morale = Math.max(0, player.morale - 2);
              player.stats = stats; player.xp = xp;
              return player;
          });
          return { ...prev, players };
      });
      setDailyActivities(prev => ({ ...prev, individualDrills: prev.individualDrills + 1 }));
  };

  const handleUpdateSchedule = (dayIndex: number, intensity: TrainingIntensity) => {
      setMyTeam(prev => {
          const newSchedule = [...prev.weeklySchedule];
          newSchedule[dayIndex] = intensity;
          return { ...prev, weeklySchedule: newSchedule };
      });
  };

  const handleInitialMapSetup = (permaban: string, firstPick: string, focusMaps: string[]) => {
      setMyTeam(prev => {
          const newMapStats = { ...prev.mapStats };
          const newPracticeStats = { ...prev.practiceStats };
          const maps = Object.keys(newMapStats);
          maps.forEach(mapId => {
              let val = 20; 
              if (mapId === permaban) val = 0;
              else if (mapId === firstPick) val = 45;
              else if (focusMaps.includes(mapId)) val = 35;
              newMapStats[mapId] = val;
              newPracticeStats[mapId] = { pistol: val, ct: val, t: val, strat: val };
          });
          return { ...prev, mapStats: newMapStats, practiceStats: newPracticeStats, permaban: permaban, firstPickMap: firstPick, isMapPoolInitialized: true };
      });
  };

  const getMyLeagueRank = () => {
      const allTeams = [myTeam, ...leagueOpponents];
      const sortedTeams = allTeams.sort((a, b) => {
          if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
          if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
          return b.wins - a.wins;
      });
      return sortedTeams.findIndex(t => t.id === myTeam.id) + 1;
  };

  // Match Entry Flow
  const enterMatchLobby = (isQualifier: boolean = false, tournamentId?: string) => {
      if (myTeam.players.length < 5) {
        setErrorMessage("You need 5 players to start a match!");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      if (!isQualifier && !isMatchDay) {
         setErrorMessage("No match scheduled for today. Advance to the next match date.");
         setTimeout(() => setErrorMessage(null), 3000);
         return; 
      }
      if (!isDailyTrainingComplete) {
          processPassiveTraining();
      }
      setPendingMatchContext({ isQualifier, tournamentId });
      setView(GameView.MATCH_LOBBY);
  }

  const handleStartVeto = () => {
      setView(GameView.MAP_VETO);
  };
  
  const handleAnalyzeOpponent = async () => {
    if (!nextOpponent) return;
    if (myTeam.budget < 1500) {
        setErrorMessage("Not enough money ($1500 required) to scout opponent.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
    }
    setIsAnalyzing(true);
    try {
        setMyTeam(prev => ({...prev, budget: prev.budget - 1500}));
        const result = await analyzeMatchup(myTeam, nextOpponent);
        setAnalysis(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const startMatchSimulation = (mapId: string) => {
    const contextData = pendingMatchContext || { isQualifier: false, tournamentId: undefined };
    const { isQualifier, tournamentId } = contextData;
    const enemy = isQualifier 
        ? leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)] 
        : (nextOpponent || leagueOpponents[0]);
    
    let context = `${myTeam.league} League Match`;
    if (isQualifier && tournamentId) {
      const tourney = tournaments.find(t => t.id === tournamentId);
      if (tourney) context = `Qualifier Match for ${tourney.name}`;
    }

    const dayOfWeek = (currentDate.getDay() + 6) % 7; 
    const intensity = myTeam.weeklySchedule[dayOfWeek];
    let fatiguePenalty = 0;
    if (intensity === TrainingIntensity.HEAVY) fatiguePenalty = 0.20;
    else if (intensity === TrainingIntensity.MEDIUM) fatiguePenalty = 0.10;

    setLiveMatchData({ enemy, mapId, context, fatiguePenalty });
    setMatchState({ isLoading: false, result: null, currentEnemyId: enemy.id });
    setView(GameView.MATCH_LIVE);
  };

  const simulateLeagueRound = (userResult: MatchResult, opponentId: string) => {
    const roundResults: LeagueRoundResult[] = [];
    const updatedTeamsMap = new Map<string, Partial<Team>>();
    let actualOpponentId = opponentId;
    let userOpponent = leagueOpponents.find(t => t.id === opponentId);
    if (!userOpponent && userResult.enemyTeamName) {
        userOpponent = leagueOpponents.find(t => t.name.toLowerCase() === userResult.enemyTeamName.toLowerCase());
        if (userOpponent) actualOpponentId = userOpponent.id;
    }
    roundResults.push({
        teamA: myTeam.name, teamB: userResult.enemyTeamName, scoreA: userResult.finalScoreUs, scoreB: userResult.finalScoreEnemy,
        winner: userResult.finalScoreUs > userResult.finalScoreEnemy ? myTeam.name : userResult.enemyTeamName
    });
    const opponentPoints = userResult.finalScoreEnemy > userResult.finalScoreUs ? 3 : 0;
    const opponentRd = userResult.finalScoreEnemy - userResult.finalScoreUs;
    if (userOpponent) {
      updatedTeamsMap.set(userOpponent.id, {
        matchesPlayed: userOpponent.matchesPlayed + 1, wins: userOpponent.wins + (userResult.finalScoreEnemy > userResult.finalScoreUs ? 1 : 0),
        losses: userOpponent.losses + (userResult.finalScoreEnemy > userResult.finalScoreUs ? 0 : 1), leaguePoints: userOpponent.leaguePoints + opponentPoints,
        roundDifference: userOpponent.roundDifference + opponentRd
      });
    }
    let remainingTeams = leagueOpponents.filter(t => t.id !== actualOpponentId);
    remainingTeams = remainingTeams.sort(() => 0.5 - Math.random());
    for (let i = 0; i < remainingTeams.length; i += 2) {
        const teamA = remainingTeams[i];
        const teamB = remainingTeams[i + 1];
        if (!teamB) {
            updatedTeamsMap.set(teamA.id, { matchesPlayed: teamA.matchesPlayed + 1, leaguePoints: teamA.leaguePoints + 3, wins: teamA.wins + 1, roundDifference: teamA.roundDifference + 1 });
            continue;
        }
        const scoreA = Math.random() > 0.5 ? 13 : Math.floor(Math.random() * 11);
        const scoreB = scoreA === 13 ? Math.floor(Math.random() * 11) : 13;
        const winner = scoreA > scoreB ? teamA : teamB;
        roundResults.push({ teamA: teamA.name, teamB: teamB.name, scoreA: scoreA, scoreB: scoreB, winner: winner.name });
        updatedTeamsMap.set(teamA.id, { matchesPlayed: teamA.matchesPlayed + 1, wins: teamA.wins + (teamA === winner ? 1 : 0), losses: teamA.losses + (teamA === winner ? 0 : 1), leaguePoints: teamA.leaguePoints + (teamA === winner ? 3 : 0), roundDifference: teamA.roundDifference + (scoreA - scoreB) });
        updatedTeamsMap.set(teamB.id, { matchesPlayed: teamB.matchesPlayed + 1, wins: teamB.wins + (teamB === winner ? 1 : 0), losses: teamB.losses + (teamB === winner ? 0 : 1), leaguePoints: teamB.leaguePoints + (teamB === winner ? 3 : 0), roundDifference: teamB.roundDifference + (scoreB - scoreA) });
    }
    setLatestRoundResults(roundResults);
    setLeagueOpponents(prev => prev.map(t => { const updates = updatedTeamsMap.get(t.id); return updates ? { ...t, ...updates } : t; }));
  };

  const handleMatchComplete = (result: MatchResult) => {
      const isWin = result.finalScoreUs > result.finalScoreEnemy;
      const points = isWin ? 3 : 0;
      const rd = result.finalScoreUs - result.finalScoreEnemy;
      
      const updatedPlayers = myTeam.players.map(player => {
          const matchStats = result.playerStatsUs.find(s => s.alias === player.alias);
          if (matchStats) {
              return {
                  ...player,
                  matchHistory: [...(player.matchHistory || []), {
                      kills: matchStats.kills,
                      deaths: matchStats.deaths,
                      rating: matchStats.rating
                  }]
              };
          }
          return player;
      });

      const updatedMyTeam = {
          ...myTeam,
          players: updatedPlayers,
          matchesPlayed: myTeam.matchesPlayed + 1,
          wins: myTeam.wins + (isWin ? 1 : 0),
          losses: myTeam.losses + (isWin ? 0 : 1),
          leaguePoints: myTeam.leaguePoints + points,
          roundDifference: myTeam.roundDifference + rd,
          budget: myTeam.budget + result.earnings
      };
      setMyTeam(updatedMyTeam);

      const opponentId = matchState.currentEnemyId;
      if (opponentId) simulateLeagueRound(result, opponentId);
      else simulateLeagueRound(result, "unknown");

      const nextMatchIdx = schedule.findIndex(m => !m.isPlayed);
      if (nextMatchIdx !== -1) {
          const newSched = [...schedule];
          newSched[nextMatchIdx].isPlayed = true;
          setSchedule(newSched);
      }
      setView(GameView.DASHBOARD);
  };

  const handleSetTactic = (tactic: Tactic) => {
      setMyTeam(prev => ({ ...prev, preferredTactic: tactic }));
  };

  const getAggregatedGains = () => {
    const aggregated: Record<string, DailyGain> = {};
    dailyGains.forEach(gain => {
        const key = `${gain.subject}_${gain.stat}`;
        if (aggregated[key]) aggregated[key].value += gain.value;
        else aggregated[key] = { ...gain };
    });
    return Object.values(aggregated);
  };

  return (
    <div className="flex h-screen bg-fm-bg text-fm-text font-sans overflow-hidden">
      {!isGameStarted ? (
        <StartScreen onStartGame={handleStartGame} />
      ) : (
        <>
          {/* SIDEBAR NAVIGATION */}
          <Sidebar currentView={view} setView={setView} />
          
          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              <Header team={myTeam} currentView={view} currentDate={currentDate} onAdvanceDay={() => advanceDay(1)} isMatchDay={isMatchDay} />

              <div className="flex-1 overflow-y-auto relative bg-fm-bg">
                  {/* MAIN VIEW SWITCHER */}
                  {view === GameView.DASHBOARD && (
                      <Dashboard 
                          team={myTeam}
                          nextScheduledMatch={nextScheduledMatch}
                          nextOpponent={nextOpponent}
                          leagueRank={getMyLeagueRank()}
                          leagueOpponents={leagueOpponents}
                          onPlayMatch={() => enterMatchLobby(false)}
                          onViewLeague={() => setView(GameView.LEAGUE)}
                          isAnalyzing={isAnalyzing}
                          messages={messages}
                          onMarkMessageRead={handleMarkMessageRead}
                      />
                  )}

                  {view === GameView.MATCH_LOBBY && nextOpponent && (
                      <MatchLobby 
                          myTeam={myTeam} 
                          opponent={nextOpponent}
                          analysis={analysis}
                          isAnalyzing={isAnalyzing}
                          onAnalyze={handleAnalyzeOpponent}
                          onStartMatch={handleStartVeto}
                          onSetTactic={handleSetTactic}
                      />
                  )}

                  {view === GameView.MAP_VETO && nextOpponent && (
                      <MapVeto 
                          userTeam={myTeam}
                          enemyTeam={nextOpponent}
                          onComplete={(mapId) => startMatchSimulation(mapId)}
                      />
                  )}

                  {view === GameView.MATCH_LIVE && liveMatchData && (
                      <div className="absolute inset-0 z-50 bg-black">
                        <MatchView 
                            playerTeam={myTeam}
                            enemyTeam={liveMatchData.enemy}
                            mapId={liveMatchData.mapId}
                            context={liveMatchData.context}
                            onComplete={handleMatchComplete}
                            fatiguePenalty={liveMatchData.fatiguePenalty} 
                        />
                      </div>
                  )}

                  {view === GameView.LEAGUE && ( <LeagueView myTeam={myTeam} opponents={leagueOpponents} roundResults={latestRoundResults} /> )}
                  {view === GameView.PRACTICE && ( <PracticeView team={myTeam} schedule={schedule} currentDate={currentDate} onTrain={handleTraining} onIndividualTrain={handleIndividualTraining} onUpdateSchedule={handleUpdateSchedule} onSetupComplete={handleInitialMapSetup} dailyActivities={dailyActivities} isDailyTrainingComplete={isDailyTrainingComplete} /> )}
                  {view === GameView.MARKET && ( <MarketView budget={myTeam.budget} onHire={handleHirePlayer} currentRosterCount={myTeam.players.length} /> )}
                  {view === GameView.SCHEDULE && ( <ScheduleView tournaments={tournaments} currentDate={currentDate} team={myTeam} schedule={schedule} onQualify={(tId) => enterMatchLobby(true, tId)} /> )}
                  {view === GameView.RANKINGS && ( <RankingsView /> )}
              </div>

              {/* OVERLAYS */}
              {showDaySummary && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                      <div className="max-w-3xl w-full bg-fm-card border border-fm-border rounded-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                          <div className="bg-fm-card-hover p-6 border-b border-fm-border">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1">Day Complete</h2>
                                      <p className="text-fm-muted text-sm flex items-center gap-2">
                                          <Calendar size={14} /> 
                                          {currentDate.toLocaleDateString()} &rarr; {new Date(currentDate.getTime() + 86400000).toLocaleDateString()}
                                      </p>
                                  </div>
                                  <CheckCircle size={48} className="text-fm-accent opacity-50" />
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div>
                                      <h3 className="text-xs font-bold text-fm-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                          <Zap size={14} className="text-fm-accent" /> Daily Progress
                                      </h3>
                                      {dailyGains.length > 0 ? (
                                          <div className="space-y-2">
                                              {getAggregatedGains().map((gain, i) => (
                                                  <div key={i} className="bg-fm-bg/50 p-3 rounded border border-fm-border flex items-center justify-between">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${gain.type === 'map' ? 'bg-blue-900/20 text-blue-400' : gain.type === 'passive' ? 'bg-purple-900/20 text-purple-400' : gain.type === 'mental' ? 'bg-pink-900/20 text-pink-400' : 'bg-yellow-900/20 text-yellow-400'}`}>
                                                              {gain.type === 'map' ? 'MAP' : gain.type === 'passive' ? 'PLAN' : gain.type === 'mental' ? 'MIND' : 'XP'}
                                                          </div>
                                                          <div>
                                                              <div className="font-bold text-xs text-white">{gain.subject}</div>
                                                              <div className="text-[9px] text-gray-500 uppercase font-bold">{gain.stat}</div>
                                                          </div>
                                                      </div>
                                                      <div className={`font-mono font-bold text-xs ${gain.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                          {gain.value > 0 ? '+' : ''}{gain.value}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <div className="text-center py-8 bg-fm-bg/30 rounded border border-fm-border border-dashed">
                                              <p className="text-gray-500 text-xs">No training activities recorded today.</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <div className="p-6 bg-fm-card border-t border-fm-border flex justify-center">
                              <button onClick={handleConfirmDayAdvance} className="px-8 py-3 bg-fm-accent hover:bg-fm-accent-hover text-white font-bold uppercase tracking-widest rounded shadow-lg transition-transform hover:scale-105 flex items-center gap-2 text-sm">
                                  Start Next Day <ArrowRight size={16} />
                              </button>
                          </div>
                      </div>
                  </div>
              )}
              
              {errorMessage && (
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-2xl z-[60] flex items-center gap-3 animate-bounce">
                      <AlertTriangle size={20} /> <span className="font-bold text-sm">{errorMessage}</span>
                  </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}