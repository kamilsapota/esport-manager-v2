import React, { useState, useEffect, useRef } from 'react';
import { Team, Player, PlayerRole, League, LeagueRoundResult, OpponentAnalysis, ScheduledMatch, MapPracticeStats, Tactic, TrainingIntensity, DRILLS, DrillType, Coach, AutomationConfig, Tournament, GameView, MatchResult, SeasonPhase, PlayoffMatch, PlayerMatchStats, SeriesState, DailyGain } from './types';
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
import { PracticeView } from './components/PracticeView';
import { MapVeto } from './components/MapVeto';
import { IntroScreen } from './components/IntroScreen';
import { MatchTransition } from './components/MatchTransition';
import { SeasonEndOverlay } from './components/SeasonEndOverlay';
import { DaySummary } from './components/DaySummary';
import { analyzeMatchup } from './services/geminiService';
import { TEAMS_BY_LEAGUE, generateRoster } from './data/realTeams';
import { AlertTriangle, Calendar, CheckCircle, ArrowRight, Zap, Mail, X, Loader2 } from 'lucide-react';

const EMPTY_TEAM: Team = {
  id: 'temp-id',
  name: 'TBD',
  league: League.OPEN, 
  players: [],
  budget: 2500,
  wins: 0,
  losses: 0,
  matchesPlayed: 0,
  leaguePoints: 0,
  roundDifference: 0,
  mapStats: {},
  weeklySchedule: Array(7).fill(TrainingIntensity.MEDIUM),
  coaches: [],
  automationConfig: { autoMapTraining: false, autoSchedule: false, autoIndividual: true }
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

// Helper map for images (duplicated from PracticeView for Transition)
const MAP_IMAGES: Record<string, string> = {
    'Dust2': 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png',
    'Mirage': 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png',
    'Inferno': 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png',
    'Nuke': 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png',
    'Train': 'https://www.hltv.org/img/static/statsmatchmaps/train.png',
    'Overpass': 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png',
    'Ancient': 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png'
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

const PLAYER_PORTRAITS = [
    'https://th.bing.com/th/id/OIG1.V4uq5T0A.E8wbxad5FpT?pid=ImgGn',
    'https://th.bing.com/th/id/OIG2.7Oo33qK_YnHG5aCukFHn?pid=ImgGn',
    'https://th.bing.com/th/id/OIG4.o2i3OcH38UWXGAOoKEke?pid=ImgGn',
    'https://th.bing.com/th/id/OIG4.8oX0pm95oLL1a2dKrf2V?pid=ImgGn',
    'https://th.bing.com/th/id/OIG1.736Ck96kJgGBQlafROy6?pid=ImgGn',
    'https://i.imgur.com/fNApPNm.png',
    'https://th.bing.com/th/id/OIG4.exEKzaS_LGmuXRuGFGKO?pid=ImgGn',
    'https://th.bing.com/th/id/OIG1.TDKvo0rticgCd8VoLkSW?pid=ImgGn',
    'https://th.bing.com/th/id/OIG2.xmQslWisLTo1SxERT2UL?pid=ImgGn',
    'https://th.bing.com/th/id/OIG3.iOq4Vlt2lRO8quPNmbf3?pid=ImgGn'
];

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showMatchTransition, setShowMatchTransition] = useState(false);
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
  const [liveMatchData, setLiveMatchData] = useState<{enemy: Team, mapId: string, context: string, fatiguePenalty: number, analysisActive: boolean} | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{id: number, subject: string, sender: string, read: boolean, body?: string, date: string}>>([]);

  // SEASON & PLAYOFF STATES
  const [seasonPhase, setSeasonPhase] = useState<SeasonPhase>('REGULAR');
  const [playoffBracket, setPlayoffBracket] = useState<PlayoffMatch[]>([]);
  const [showSeasonEndOverlay, setShowSeasonEndOverlay] = useState(false);
  const [seasonEndStats, setSeasonEndStats] = useState<{rank: number, isPlayoff: boolean, isPromotion: boolean}>({rank: 0, isPlayoff: false, isPromotion: false});
  
  // SERIES STATE (BO3)
  const [seriesState, setSeriesState] = useState<SeriesState>({ active: false, maps: [], currentMapIndex: 0, scoreUs: 0, scoreEnemy: 0 });

  // SKIP STATE
  const [isSkippingToMatch, setIsSkippingToMatch] = useState(false);

  useEffect(() => {
    // Only set opponents if not already set (preserve state)
    if(leagueOpponents.length === 0 && myTeam.id !== 'temp-id') {
        const allLeagueTeams = TEAMS_BY_LEAGUE[myTeam.league];
        if (allLeagueTeams) {
            setLeagueOpponents(allLeagueTeams.slice(0, 19));
        }
    }
  }, [myTeam.league, myTeam.id]);

  useEffect(() => {
    const nextMatch = schedule.find(m => !m.isPlayed);
    if (nextMatch) {
        if (nextMatch.type === 'LEAGUE') {
            const opponent = leagueOpponents.find(t => t.id === nextMatch.opponentId);
            if (opponent && (!nextOpponent || nextOpponent.id !== opponent.id)) {
                setNextOpponent(opponent);
                setAnalysis(null);
            }
        } else if (nextMatch.type === 'PLAYOFF') {
             // Find opponent from bracket
             const match = playoffBracket.find(m => m.id === nextMatch.id);
             if (match) {
                 const op = match.teamA.id === myTeam.id ? match.teamB : match.teamA;
                 // Ensure we update state correctly even if op is temp-id
                 if (!nextOpponent || nextOpponent.id !== op.id) {
                     setNextOpponent(op);
                     setAnalysis(null);
                 }
             }
        }
    } else if (schedule.length > 0 && !schedule.some(m => !m.isPlayed)) {
        setNextOpponent(null);
    }
  }, [schedule, leagueOpponents, nextOpponent, playoffBracket]);

  // DEV SKIP LOOP
  useEffect(() => {
      let skipTimer: ReturnType<typeof setTimeout>;

      if (isSkippingToMatch) {
          const isMatchDay = schedule.some(m => !m.isPlayed && new Date(m.date).toDateString() === currentDate.toDateString());
          if (isMatchDay) {
              setIsSkippingToMatch(false);
          } else {
              skipTimer = setTimeout(() => {
                  handleAdvanceDay();
              }, 100); // Fast skip
          }
      }

      return () => clearTimeout(skipTimer);
  }, [isSkippingToMatch, currentDate, schedule]);

  const isMatchDay = schedule.some(m => 
    new Date(m.date).toDateString() === currentDate.toDateString() && !m.isPlayed
  );

  const nextScheduledMatch = schedule.find(m => !m.isPlayed);
  const unreadCount = messages.filter(m => !m.read).length;

  const generateSeasonSchedule = (startDate: Date, opponents: Team[], league: League): ScheduledMatch[] => {
      const newSchedule: ScheduledMatch[] = [];
      let scheduleDate = new Date(startDate);
      const shuffledOpponents = [...opponents].sort(() => 0.5 - Math.random());
      scheduleDate.setDate(scheduleDate.getDate() + 4);

      // LIMIT TO 15 MATCHES
      shuffledOpponents.slice(0, 15).forEach((opponent) => {
          const interval = Math.floor(Math.random() * 3) + 3; // 3-6 days gap
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
    const initialRoster = generateRoster(country, avgLeagueRating + 5, 0.5);

    const shuffledPortraits = [...PLAYER_PORTRAITS].sort(() => 0.5 - Math.random());
    const rosterWithImages = initialRoster.map((p, i) => ({
        ...p,
        imageUrl: shuffledPortraits[i % shuffledPortraits.length]
    }));

    // Age Logic
    const iglIndex = rosterWithImages.findIndex(p => p.role === PlayerRole.IGL);
    if (iglIndex !== -1) rosterWithImages[iglIndex].age = 21 + Math.floor(Math.random() * 3);
    const otherIndices = rosterWithImages.map((_, i) => i).filter(i => i !== iglIndex);
    const youngsterIndex = otherIndices[Math.floor(Math.random() * otherIndices.length)];
    rosterWithImages[youngsterIndex].age = 16 + Math.floor(Math.random() * 2);
    otherIndices.filter(i => i !== youngsterIndex).forEach(i => {
        rosterWithImages[i].age = 18 + Math.floor(Math.random() * 4);
    });

    const countryName = COUNTRIES.find(c => c.code === country)?.name || country;
    const startStr = "01/01/2024";

    // RESTORED: All 4 Initial Emails
    const initialMessages = [
        {
            id: 1,
            sender: "League Operations",
            subject: "The Path to Glory - Welcome to Season 48",
            read: false,
            date: startStr,
            body: `<p>Welcome to <b>Season 48</b>. You are beginning your journey in the <b>ESEA Open League</b>.</p><br><p><b>The Ladder:</b><br>ESEA Open &rarr; Intermediate &rarr; Main &rarr; Advanced &rarr; ESL Challenger &rarr; <span class="text-fm-accent">ESL Pro League</span></p><br><p><b>Season Rules:</b><br>The league follows a round-robin format (15 Matches). The top 8 teams will qualify for the playoffs. Only the playoff winner promotes to the next division.</p>`
        },
        {
            id: 2,
            sender: "Assistant Coach",
            subject: "Coaching Staff, Training & Map Pool",
            read: false,
            date: startStr,
            body: `<p>Boss, I've set up the training facility. Here is how our map pool works:</p><ul class="list-disc pl-4 mt-2 space-y-1"><li><b>Permaban:</b> Starts at 0% Mastery. Very hard to improve.</li><li><b>First Pick:</b> Starts at 45% Mastery. Can reach 100%.</li><li><b>Focus Maps:</b> Start at 35% Mastery.</li><li><b>Rest:</b> Start at 20%. Capped at 85%.</li></ul><br><p><b>Coaching Staff Update:</b> We have implemented a new staff system. You can now hire a <b>Head Coach</b> to automate scheduling and <b>Performance Coaches</b> to focus on individual player development.</p><br><p><b>Warning:</b> Training the same map 5 days in a row causes fatigue (diminishing returns). Also, be careful with <b>Heavy</b> training intensity on match days - it will penalize our performance!</p>`
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
    ];
    setMessages(initialMessages);
    
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
        players: rosterWithImages,
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
        weeklySchedule: [
            TrainingIntensity.MEDIUM, 
            TrainingIntensity.HEAVY, 
            TrainingIntensity.LIGHT, 
            TrainingIntensity.MEDIUM, 
            TrainingIntensity.HEAVY, 
            TrainingIntensity.REST, 
            TrainingIntensity.LIGHT
        ],
        preferredTactic: Tactic.DEFAULT,
        coaches: [],
        automationConfig: { autoMapTraining: false, autoSchedule: false, autoIndividual: true }
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

  // --- AI SCHEDULER HELPER ---
  const generateSmartSchedule = (currentSchedule: TrainingIntensity[], team: Team, refDate: Date): TrainingIntensity[] => {
      const newSchedule = [...currentSchedule];
      const currentDayIndex = (refDate.getDay() + 6) % 7; // Mon=0, Sun=6
      const mondayDate = new Date(refDate);
      mondayDate.setDate(refDate.getDate() - currentDayIndex);

      const avgMorale = team.players.reduce((acc, p) => acc + p.morale, 0) / (team.players.length || 1);

      // Iterate through the whole week 0-6 (Mon-Sun)
      for (let i = 0; i < 7; i++) {
          const checkDate = new Date(mondayDate);
          checkDate.setDate(mondayDate.getDate() + i);

          const isMatchDay = schedule.some(m => !m.isPlayed && new Date(m.date).toDateString() === checkDate.toDateString());
          
          const tomorrow = new Date(checkDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const isMatchTomorrow = schedule.some(m => !m.isPlayed && new Date(m.date).toDateString() === tomorrow.toDateString());

          const yesterday = new Date(checkDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const wasMatchYesterday = schedule.some(m => new Date(m.date).toDateString() === yesterday.toDateString());

          if (isMatchDay) {
              newSchedule[i] = avgMorale > 85 ? TrainingIntensity.LIGHT : TrainingIntensity.REST;
          } 
          else if (isMatchTomorrow) {
              newSchedule[i] = avgMorale > 90 ? TrainingIntensity.LIGHT : TrainingIntensity.REST;
          }
          else if (wasMatchYesterday) {
              newSchedule[i] = TrainingIntensity.REST;
          }
          else {
              if (avgMorale > 80) {
                  newSchedule[i] = (i % 2 === 0) ? TrainingIntensity.HEAVY : TrainingIntensity.MEDIUM;
              } else if (avgMorale > 65) {
                  newSchedule[i] = TrainingIntensity.MEDIUM;
              } else {
                  newSchedule[i] = TrainingIntensity.LIGHT;
              }
          }
      }
      return newSchedule;
  };

  // --- AUTOMATION ENGINE ---
  const runAutomatedTraining = () => {
      const currentDayIndex = (currentDate.getDay() + 6) % 7; // Mon=0, Sun=6
      const isMonday = currentDayIndex === 0;

      // 1. AUTO SCHEDULE (FULL WEEK PLANNER) - Only run on Monday OR if schedule needs init
      if (myTeam.coaches.some(c => c.type === 'HEAD') && myTeam.automationConfig.autoSchedule) {
          if (isMonday) {
            setMyTeam(prev => ({ 
                ...prev, 
                weeklySchedule: generateSmartSchedule(prev.weeklySchedule, prev, currentDate) 
            }));
          }
      }

      // 2. AUTO MAP TRAINING (Execute Daily)
      if (myTeam.coaches.some(c => c.type === 'HEAD') && myTeam.automationConfig.autoMapTraining) {
          const { firstPickMap, mapStats, lastTrainedMapId, consecutiveMapTrainCount, permaban } = myTeam;
          let targetMapId = null;

          const validMaps = Object.keys(mapStats).filter(m => m !== permaban);
          
          const candidates = validMaps.map(m => {
             let score = 0;
             const mastery = mapStats[m];
             
             if (m === lastTrainedMapId && (consecutiveMapTrainCount || 0) >= 4) {
                 score -= 1000;
             }

             if (m === firstPickMap) {
                 if (mastery < 99) score += 50;
             } else {
                 if (mastery >= 85) score -= 50; 
                 score += (100 - mastery);
             }
             
             return { id: m, score };
          });

          candidates.sort((a, b) => b.score - a.score);
          
          if (candidates.length > 0) {
              targetMapId = candidates[0].id;
          }

          if (targetMapId) {
             const stats: (keyof MapPracticeStats)[] = ['pistol', 'ct', 't', 'strat'];
             const targetStat = stats[Math.floor(Math.random() * stats.length)];
             handleTraining(targetMapId, targetStat); 
          }
      }

      // 3. AUTO INDIVIDUAL TRAINING
      myTeam.players.forEach(player => {
          const coach = myTeam.coaches.find(c => c.assignedPlayerId === player.id);
          if (coach) {
              const stats = player.stats;
              const keys = Object.keys(stats) as (keyof typeof stats)[];
              let targetStat: keyof typeof stats = 'aim'; 

              if (coach.focus === 'ROLE') {
                  const rolePriorities: Record<PlayerRole, (keyof typeof stats)[]> = {
                      [PlayerRole.AWPER]: ['aim', 'reflex', 'clutch'],
                      [PlayerRole.ENTRY]: ['aim', 'reflex', 'teamwork'],
                      [PlayerRole.IGL]: ['strategy', 'teamwork', 'utility'],
                      [PlayerRole.SUPPORT]: ['utility', 'teamwork', 'strategy'],
                      [PlayerRole.LURKER]: ['clutch', 'strategy', 'aim']
                  };
                  const priorities = rolePriorities[player.role];
                  priorities.sort((a, b) => stats[a] - stats[b]);
                  targetStat = priorities[0];
              } else if (coach.focus === 'BALANCED') {
                  keys.sort((a, b) => stats[a] - stats[b]);
                  targetStat = keys[0];
              } else {
                  keys.sort((a, b) => stats[a] - stats[b]);
                  targetStat = keys[0];
              }

              const drill = DRILLS.find(d => d.main === targetStat || d.sub === targetStat) || DRILLS[0];
              handleIndividualTraining(player.id, drill.id, true);
          }
      });
  };

  const processPassiveTraining = () => {
    if (isDailyTrainingComplete) return;
    
    runAutomatedTraining();

    const dayOfWeek = (currentDate.getDay() + 6) % 7; 

    setMyTeam(prev => {
        const scheduledIntensity = prev.weeklySchedule[dayOfWeek];
        
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

        const updatedPlayers = prev.players.map(p => {
            const player = { ...p };
            const xp = { ...player.xp };
            const stats = { ...player.stats };
            player.morale = Math.max(0, Math.min(100, player.morale + mentalChange));
            if (Math.abs(mentalChange) >= 5) {
                 setDailyGains(g => {
                     if(!g.some(l => l.type === 'mental' && l.subject === player.alias)) {
                         return [...g, {type: 'mental', subject: player.alias, value: mentalChange}];
                     }
                     return g;
                 });
            }

            // Apply Passive XP
            if (baseXp > 0) {
                xp.teamwork += baseXp * 0.4;
                xp.strategy += baseXp * 0.4;
                xp.utility += baseXp * 0.2;
                
                Object.keys(xp).forEach(k => {
                   const key = k as keyof typeof xp;
                   const required = 500 + (stats[key] * 50);
                   if (xp[key] >= required && stats[key] < 99) {
                       stats[key]++;
                       xp[key] -= required;
                       setDailyGains(g => [...g, {type: 'xp', subject: p.alias, stat: key, value: 1}]);
                   }
                });
            }
            
            return { ...player, stats, xp };
        });

        return { ...prev, players: updatedPlayers };
    });

    setIsDailyTrainingComplete(true);
    if (!isSkippingToMatch) {
        setShowDaySummary(true);
    }
  };

  const handleAdvanceDay = () => {
    if (isAnalyzing) {
        setErrorMessage("Cannot advance day while tactical analysis is in progress.");
        return;
    }

    if (showDaySummary) {
        setShowDaySummary(false);
        setDailyGains([]);
    } 
    else if (!isDailyTrainingComplete) {
        processPassiveTraining();
        return; 
    }

    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate);
    
    setDailyActivities({ mapTraining: false, individualDrills: 0 });
    setIsDailyTrainingComplete(false);
  };

  const handleSimToMatch = () => {
      setIsSkippingToMatch(true);
  };

  // --- PLAYOFF LOGIC ---

  const checkSeasonEnd = (matchesPlayed: number) => {
      // Trigger after 15th match
      if (matchesPlayed >= 15 && seasonPhase === 'REGULAR') {
          // Calculate Standings
          const allTeams = [myTeam, ...leagueOpponents];
          const sorted = allTeams.sort((a, b) => {
              if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
              if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
              return b.wins - a.wins;
          });

          const myRank = sorted.findIndex(t => t.id === myTeam.id) + 1;
          const isQualified = myRank <= 8;

          setSeasonEndStats({ rank: myRank, isPlayoff: isQualified, isPromotion: false });
          setShowSeasonEndOverlay(true);
      }
  };

  const generatePlayoffBracket = (allTeams: Team[]) => {
      const top8 = allTeams.sort((a, b) => {
          if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
          if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
          return b.wins - a.wins;
      }).slice(0, 8);

      // Seeding: 1v8, 4v5, 3v6, 2v7
      const matches: PlayoffMatch[] = [
          { id: 'qf-1', round: 'QF', teamA: top8[0], teamB: top8[7], date: currentDate.toISOString(), isPlayed: false },
          { id: 'qf-2', round: 'QF', teamA: top8[3], teamB: top8[4], date: currentDate.toISOString(), isPlayed: false },
          { id: 'qf-3', round: 'QF', teamA: top8[2], teamB: top8[5], date: currentDate.toISOString(), isPlayed: false },
          { id: 'qf-4', round: 'QF', teamA: top8[1], teamB: top8[6], date: currentDate.toISOString(), isPlayed: false },
          // Placeholders for Semis and Final
          { id: 'sf-1', round: 'SF', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false },
          { id: 'sf-2', round: 'SF', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false },
          { id: 'f-1', round: 'F', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false }
      ];

      setPlayoffBracket(matches);
      setSeasonPhase('PLAYOFFS');

      setSchedule([]); 

      // If user is in QF, add to schedule
      const userMatch = matches.find(m => m.teamA.id === myTeam.id || m.teamB.id === myTeam.id);
      if (userMatch) {
          const playoffDate = new Date(currentDate);
          playoffDate.setDate(playoffDate.getDate() + 2); // 1 day break before playoffs
          setCurrentDate(playoffDate); // Advance to match day

          setSchedule([{
              id: userMatch.id,
              date: playoffDate.toISOString(), 
              opponentId: userMatch.teamA.id === myTeam.id ? userMatch.teamB.id : userMatch.teamA.id,
              isPlayed: false,
              type: 'PLAYOFF',
              playoffRound: 'QF'
          }]);
      }
  };

  const advancePlayoffBracket = (matchId: string, winner: Team, scoreA: number, scoreB: number) => {
      let newBracket = [...playoffBracket];
      const matchIndex = newBracket.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return newBracket;

      // Update played match
      newBracket[matchIndex] = { ...newBracket[matchIndex], isPlayed: true, winner, scoreA, scoreB };

      // Determine next match slot
      let nextMatchId = '';
      let slot: 'teamA' | 'teamB' = 'teamA';

      if (matchId === 'qf-1') { nextMatchId = 'sf-1'; slot = 'teamA'; }
      if (matchId === 'qf-2') { nextMatchId = 'sf-1'; slot = 'teamB'; }
      if (matchId === 'qf-3') { nextMatchId = 'sf-2'; slot = 'teamA'; }
      if (matchId === 'qf-4') { nextMatchId = 'sf-2'; slot = 'teamB'; }
      if (matchId === 'sf-1') { nextMatchId = 'f-1'; slot = 'teamA'; }
      if (matchId === 'sf-2') { nextMatchId = 'f-1'; slot = 'teamB'; }
      
      // Propagate winner to next round
      if (nextMatchId) {
          const nextMatchIndex = newBracket.findIndex(m => m.id === nextMatchId);
          if (nextMatchIndex !== -1) {
              const nextMatch = { ...newBracket[nextMatchIndex] };
              nextMatch[slot] = winner;
              newBracket[nextMatchIndex] = nextMatch;
          }
      }

      setPlayoffBracket(newBracket);
      return newBracket;
  };

  const simulateRoundMatches = (currentBracket: PlayoffMatch[], round: 'QF' | 'SF' | 'F') => {
      let updatedBracket = [...currentBracket];
      const otherMatches = updatedBracket.filter(m => m.round === round && !m.isPlayed && m.teamA.id !== myTeam.id && m.teamB.id !== myTeam.id && m.teamA.id !== 'temp-id' && m.teamB.id !== 'temp-id');
      
      otherMatches.forEach(m => {
          const mIdx = updatedBracket.findIndex(x => x.id === m.id);
          const aiWinner = Math.random() > 0.5 ? m.teamA : m.teamB;
          const scoreA = aiWinner.id === m.teamA.id ? 2 : Math.floor(Math.random() * 2);
          const scoreB = aiWinner.id === m.teamB.id ? 2 : Math.floor(Math.random() * 2);

          updatedBracket[mIdx] = { ...m, isPlayed: true, winner: aiWinner, scoreA, scoreB };
          
          let aiNextId = '';
          let aiSlot: 'teamA'|'teamB' = 'teamA';
          if (m.id === 'qf-1') { aiNextId = 'sf-1'; aiSlot = 'teamA'; }
          if (m.id === 'qf-2') { aiNextId = 'sf-1'; aiSlot = 'teamB'; }
          if (m.id === 'qf-3') { aiNextId = 'sf-2'; aiSlot = 'teamA'; }
          if (m.id === 'qf-4') { aiNextId = 'sf-2'; aiSlot = 'teamB'; }
          if (m.id === 'sf-1') { aiNextId = 'f-1'; aiSlot = 'teamA'; }
          if (m.id === 'sf-2') { aiNextId = 'f-1'; aiSlot = 'teamB'; }
          
          const aiNextIdx = updatedBracket.findIndex(x => x.id === aiNextId);
          if (aiNextIdx !== -1) {
              updatedBracket[aiNextIdx] = { ...updatedBracket[aiNextIdx], [aiSlot]: aiWinner };
          }
      });
      
      setPlayoffBracket(updatedBracket);
      return updatedBracket;
  };

  const handleSeasonContinue = () => {
      setShowSeasonEndOverlay(false);
      
      // LOGIC:
      // If we are in REGULAR season and Qualified -> Enter Playoffs
      if (seasonPhase === 'REGULAR' && seasonEndStats.isPlayoff) {
          generatePlayoffBracket([myTeam, ...leagueOpponents]);
          setView(GameView.LEAGUE); // Show Bracket
      } 
      // If we are in PLAYOFFS (Eliminated or Champion) -> New Season
      else if (seasonPhase === 'PLAYOFFS') {
           startNewSeason(seasonEndStats.isPromotion);
      }
      // If we are in REGULAR season and NOT Qualified -> New Season
      else {
          startNewSeason(false);
      }
  };

  const startNewSeason = (promoted: boolean) => {
      // 1. Advance Date (1 Month)
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      newDate.setDate(1); // Start on 1st
      setCurrentDate(newDate);

      // 2. Reset Season Stats
      const resetStats = (t: Team) => ({ ...t, wins: 0, losses: 0, matchesPlayed: 0, leaguePoints: 0, roundDifference: 0 });
      setMyTeam(prev => {
          let newLeague = prev.league;
          if (promoted) {
              const leagues = Object.values(League);
              const idx = leagues.indexOf(prev.league);
              if (idx < leagues.length - 1) newLeague = leagues[idx + 1];
          }
          return { ...resetStats(prev), league: newLeague };
      });

      let newOpponents: Team[] = [];
      if (promoted) {
          const leagues = Object.values(League);
          const currentIdx = leagues.indexOf(myTeam.league);
          if (currentIdx !== -1 && currentIdx < leagues.length - 1) {
              const nextLeague = leagues[currentIdx + 1] as League;
              // Direct access since TEAMS_BY_LEAGUE is exhaustive
              newOpponents = TEAMS_BY_LEAGUE[nextLeague].slice(0, 19); 
          }
      } else {
           newOpponents = leagueOpponents.map(t => resetStats(t));
      }
      setLeagueOpponents(newOpponents);

      const newSchedule = generateSeasonSchedule(newDate, newOpponents, promoted ? (Object.values(League)[Object.values(League).indexOf(myTeam.league) + 1]) : myTeam.league);
      setSchedule(newSchedule);
      setSeasonPhase('REGULAR');
      setPlayoffBracket([]);
      
      let subject = "Season Reset";
      let body = "<p>The new season has begun. The board expects a playoff run this time.</p>";

      const newLeagueName = newOpponents.length > 0 ? newOpponents[0].league : 'Next League';

      if (promoted) {
          subject = `Promotion to ${newLeagueName}!`;
          body = `<p>Congratulations on your playoff victory! You have been promoted.</p><p>Welcome to the new season. Competition will be tougher here.</p>`;
      } else if (seasonEndStats.isPlayoff) {
           subject = "Post-Season Review: Good Effort";
           body = `<p>Boss, we made the playoffs but couldn't secure the trophy this time.</p><br><p>We executed well to get there. The board is happy with the progress, but we need that promotion next season.</p><p>Let's get back to training and go again.</p>`;
      } else {
           subject = "Post-Season Review: Disappointing";
           body = `<p>Boss, missing the playoffs is not what we aimed for.</p><br><p>The board is unhappy. We need to rethink our training and tactics for the upcoming season.</p>`;
      }

      setMessages(prev => [
          {
              id: Date.now(),
              sender: "League Operations",
              subject: subject,
              read: false,
              date: newDate.toLocaleDateString(),
              body: body
          },
          ...prev
      ]);
      
      // Force dashboard view
      setView(GameView.DASHBOARD);
  };

  const handleMatchComplete = (result: MatchResult) => {
      const isWin = result.finalScoreUs > result.finalScoreEnemy;
      
      // HANDLE SERIES (Bo3) - Valid for PLAYOFFS
      if (seriesState.active) {
          const newScoreUs = isWin ? seriesState.scoreUs + 1 : seriesState.scoreUs;
          const newScoreEnemy = isWin ? seriesState.scoreEnemy : seriesState.scoreEnemy + 1;
          
          setSeriesState(prev => ({ ...prev, scoreUs: newScoreUs, scoreEnemy: newScoreEnemy }));

          if (newScoreUs < 2 && newScoreEnemy < 2) {
              // SERIES CONTINUES -> Next Map
              const nextMapIdx = seriesState.currentMapIndex + 1;
              const nextMap = seriesState.maps[nextMapIdx];
              setSeriesState(prev => ({ ...prev, currentMapIndex: nextMapIdx }));
              
              // Launch next match immediately
              // Use existing liveMatchData.enemy as we are in a series against them
              const opponent = liveMatchData?.enemy || nextOpponent;
              if (opponent) {
                  setTimeout(() => {
                     startMatchSim(opponent, nextMap, 'PLAYOFF', liveMatchData?.analysisActive || false);
                  }, 1000);
              }
              return;
          }
          
          // SERIES FINISHED (Someone reached 2 wins)
          setSeriesState({ active: false, maps: [], currentMapIndex: 0, scoreUs: 0, scoreEnemy: 0 });
          
          const seriesWin = newScoreUs === 2;
          
          // Proceed with Post-Match Logic using SERIES result
          if (seasonPhase === 'PLAYOFFS') {
              const matchId = schedule.find(s => !s.isPlayed)?.id;
              if (matchId) {
                  // Advance User
                  let updatedBracket: PlayoffMatch[] = advancePlayoffBracket(matchId, seriesWin ? myTeam : (liveMatchData?.enemy || nextOpponent || EMPTY_TEAM), newScoreUs, newScoreEnemy);
                  
                  // Simulate other matches in this round
                  const currentMatch = updatedBracket.find(m => m.id === matchId);
                  if (currentMatch) {
                      updatedBracket = simulateRoundMatches(updatedBracket, currentMatch.round);
                  }

                  if (!seriesWin) {
                      // User Eliminated
                      const bracketMatch = playoffBracket.find(m => m.id === matchId);
                      let displayRank = 8;
                      if (bracketMatch?.round === 'QF') displayRank = 5;
                      else if (bracketMatch?.round === 'SF') displayRank = 3;
                      else if (bracketMatch?.round === 'F') displayRank = 2;

                      setSeasonEndStats({ rank: displayRank, isPlayoff: true, isPromotion: false });
                      setShowSeasonEndOverlay(true);
                  } else {
                      // User Won Series
                      // Check if it was the Final
                      if (currentMatch?.round === 'F') {
                          setSeasonEndStats({ rank: 1, isPlayoff: true, isPromotion: true });
                          setShowSeasonEndOverlay(true);
                      } else {
                          // Schedule Next match for User
                          const nextM: PlayoffMatch | undefined = updatedBracket.find(m => !m.isPlayed && (m.teamA.id === myTeam.id || m.teamB.id === myTeam.id));
                          if (nextM) {
                               // Next match ready
                               const nextDate = new Date(currentDate);
                               nextDate.setDate(nextDate.getDate() + 2); // 1 Day Break
                               
                               // Ensure opponent is set correctly even if TBD (handled by ID check)
                               // Explicit access to avoid TS inference issues
                               const tA: Team = nextM.teamA;
                               const tB: Team = nextM.teamB;
                               const nextOpponentId = (tA.id as string) === (myTeam.id as string) ? tB.id : tA.id;
                               
                               setSchedule([{
                                   id: nextM.id,
                                   date: nextDate.toISOString(),
                                   opponentId: nextOpponentId,
                                   isPlayed: false,
                                   type: 'PLAYOFF',
                                   playoffRound: nextM.round
                               }]);
                          }
                      }
                  }
              }
              setLiveMatchData(null);
              setView(GameView.LEAGUE); // Go to bracket to see progress
              return;
          }
      }

      // REGULAR SEASON MATCH LOGIC (BO1)
      setSchedule(prev => prev.map(m => {
          if (!m.isPlayed && (m.id === schedule.find(s => !s.isPlayed)?.id)) {
              return { ...m, isPlayed: true };
          }
          return m;
      }));

      // League Stats Logic (Only if Regular Season)
      if (seasonPhase === 'REGULAR') {
          const newLeagueResults: LeagueRoundResult[] = [];
          if (result.enemyTeamName) {
               newLeagueResults.push({
                   teamA: myTeam.name,
                   teamB: result.enemyTeamName,
                   scoreA: result.finalScoreUs,
                   scoreB: result.finalScoreEnemy,
                   winner: result.finalScoreUs > result.finalScoreEnemy ? myTeam.name : result.enemyTeamName
               });
          }

          if (result.enemyTeamName) {
              // BALANCED LEAGUE SIMULATION:
              // Sort teams by matches played to ensure everyone catches up
              const teamsToSimulate = leagueOpponents
                .filter(t => t.id !== result.playerStatsEnemy[0].alias && t.name !== result.enemyTeamName)
                .sort((a, b) => a.matchesPlayed - b.matchesPlayed);
              
              // Pair them up
              for (let i = 0; i < teamsToSimulate.length; i += 2) {
                  if (i + 1 >= teamsToSimulate.length) break;
                  const teamA = teamsToSimulate[i];
                  const teamB = teamsToSimulate[i+1];
                  
                  // Ensure they don't play more than the user (approx)
                  if (teamA.matchesPlayed > myTeam.matchesPlayed) continue;

                  const scoreA = 13;
                  let scoreB = Math.floor(Math.random() * 11);
                  const ratingDiff = (teamA.rankingPoints || 50) - (teamB.rankingPoints || 50);
                  
                  // Simple outcome logic based on rating
                  let winner = teamA.name;
                  let finalScoreA = 13;
                  let finalScoreB = scoreB;

                  if (ratingDiff < -5) {
                       finalScoreB = 13;
                       finalScoreA = Math.max(0, 13 - Math.floor(Math.random() * 10) + Math.floor(ratingDiff/10));
                       winner = teamB.name;
                  }

                  newLeagueResults.push({ teamA: teamA.name, teamB: teamB.name, scoreA: finalScoreA, scoreB: finalScoreB, winner: winner });
              }
          }
          setLatestRoundResults(prev => [...newLeagueResults, ...prev].slice(0, 50));

          const rd = result.finalScoreUs - result.finalScoreEnemy;
          let newMatchesPlayed = myTeam.matchesPlayed + 1;

          setMyTeam(prev => ({
              ...prev,
              wins: isWin ? prev.wins + 1 : prev.wins,
              losses: isWin ? prev.losses : prev.losses + 1,
              matchesPlayed: newMatchesPlayed,
              leaguePoints: (isWin ? prev.wins + 1 : prev.wins) * 3,
              roundDifference: prev.roundDifference + rd,
              budget: prev.budget + result.earnings
          }));

          setLeagueOpponents(prev => prev.map(op => {
               if (op.id === liveMatchData?.enemy?.id) {
                   const opWin = !isWin;
                   return { ...op, wins: opWin ? op.wins+1 : op.wins, losses: opWin ? op.losses : op.losses+1, matchesPlayed: op.matchesPlayed+1, leaguePoints: (opWin ? op.wins+1 : op.wins)*3, roundDifference: op.roundDifference - rd };
               }
               const simResult = newLeagueResults.find(res => res.teamA === op.name || res.teamB === op.name);
               if (simResult) {
                  const isTeamA = simResult.teamA === op.name;
                  const myScore = isTeamA ? simResult.scoreA : simResult.scoreB;
                  const enemyScore = isTeamA ? simResult.scoreB : simResult.scoreA;
                  const w = myScore > enemyScore;
                  return { ...op, wins: w ? op.wins+1:op.wins, losses: w?op.losses:op.losses+1, matchesPlayed: op.matchesPlayed+1, leaguePoints: (w?op.wins+1:op.wins)*3, roundDifference: op.roundDifference + (myScore - enemyScore) };
               }
               return op;
          }));

          checkSeasonEnd(newMatchesPlayed);
      }

      setLiveMatchData(null);
      if (seasonPhase === 'PLAYOFFS') {
           setView(GameView.LEAGUE); 
      } else {
           setView(GameView.LEAGUE); // Go to standings
      }
  };

  const startMatchSim = (enemy: Team, mapId: string, context: string, analysisActive: boolean = false) => {
      const dayIndex = (currentDate.getDay() + 6) % 7;
      const intensity = myTeam.weeklySchedule[dayIndex];
      const fatiguePenalty = intensity === TrainingIntensity.HEAVY ? 0.15 : intensity === TrainingIntensity.MEDIUM ? 0.05 : 0;
      
      setLiveMatchData({
        enemy,
        mapId,
        context: context, 
        fatiguePenalty,
        analysisActive
      });

      setShowMatchTransition(true);

      setTimeout(() => {
        setShowMatchTransition(false);
        setView(GameView.MATCH_LIVE);
      }, 4500); 
  };
  
  // DEV TOOL: Quick Sim
  const handleDevQuickSim = (result: 'win' | 'loss') => {
      if (!nextOpponent) return;

      const scoreUs = result === 'win' ? 13 : 5;
      const scoreEnemy = result === 'win' ? 5 : 13;
      const mvp = result === 'win' ? myTeam.players[0] : nextOpponent.players[0];
      
      const playerStatsUs: PlayerMatchStats[] = myTeam.players.map(p => ({
          alias: p.alias, country: p.country, kills: 15, deaths: 10, assists: 2, adr: 80, kast: 70, rating: 1.1
      }));
      const playerStatsEnemy: PlayerMatchStats[] = nextOpponent.players.map(p => ({
          alias: p.alias, country: p.country, kills: 15, deaths: 10, assists: 2, adr: 80, kast: 70, rating: 1.1
      }));

      const fakeResult: MatchResult = {
          enemyTeamName: nextOpponent.name,
          finalScoreUs: scoreUs,
          finalScoreEnemy: scoreEnemy,
          logs: [],
          mvpAlias: mvp.alias,
          earnings: result === 'win' ? 12500 : 4500,
          summary: "Quick Simulated Match",
          playerStatsUs,
          playerStatsEnemy,
          mapPlayed: "Mirage"
      };

      handleMatchComplete(fakeResult);
  };

  const handleTraining = (mapId: string, stat: keyof MapPracticeStats) => {
      if (dailyActivities.mapTraining) return;

      setMyTeam(prev => {
          const mapStats = { ...prev.mapStats };
          const practiceStats = { ...(prev.practiceStats || {}) };
          
          if (!practiceStats[mapId]) practiceStats[mapId] = { pistol: 0, ct: 0, t: 0, strat: 0 };
          const currentMapPractice = { ...practiceStats[mapId] };
          
          const gain = 10 + Math.floor(Math.random() * 6);
          currentMapPractice[stat] = Math.min(100, currentMapPractice[stat] + gain);
          
          let masteryGain = (gain / 4); 
          const isConsecutive = prev.lastTrainedMapId === mapId;
          const consecutiveCount = isConsecutive ? (prev.consecutiveMapTrainCount || 0) + 1 : 1;
          if (consecutiveCount >= 5) masteryGain *= 0.5; 

          const currentMastery = mapStats[mapId];
          const isFirstPick = prev.firstPickMap === mapId;
          
          if (!isFirstPick && currentMastery >= 85) {
              masteryGain = 0; 
          } else {
              mapStats[mapId] = Math.min(100, currentMastery + masteryGain);
          }

          practiceStats[mapId] = currentMapPractice;
          setDailyGains(g => [...g, {type: 'map', subject: mapId, value: masteryGain}]);

          return { ...prev, mapStats, practiceStats, lastTrainedMapId: mapId, consecutiveMapTrainCount: consecutiveCount };
      });
      setDailyActivities(prev => ({ ...prev, mapTraining: true }));
  };

  const handleIndividualTraining = (playerId: string, drillType: DrillType, isAuto: boolean = false) => {
       if (!isAuto && dailyActivities.individualDrills >= 3) return;

      const drill = DRILLS.find(d => d.id === drillType);
      if (!drill) return;

      setMyTeam(prev => {
          const updatedPlayers = prev.players.map(p => {
              if (p.id !== playerId) return p;
              const xp = { ...p.xp };
              const stats = { ...p.stats };
              const mainGain = 400 + Math.floor(Math.random() * 200);
              const subGain = 200 + Math.floor(Math.random() * 100);
              xp[drill.main] += mainGain;
              xp[drill.sub] += subGain;
              [drill.main, drill.sub].forEach(statKey => {
                  const required = 500 + (stats[statKey] * 50);
                  if (xp[statKey] >= required && stats[statKey] < 99) {
                      stats[statKey]++;
                      xp[statKey] -= required;
                      if (!isAuto) setDailyGains(g => [...g, {type: 'xp', subject: p.alias, stat: statKey, value: 1}]);
                  }
              });
              return { ...p, xp, stats };
          });
          return { ...prev, players: updatedPlayers };
      });
      if (!isAuto) {
        setDailyActivities(prev => ({ ...prev, individualDrills: prev.individualDrills + 1 }));
      }
  };

  // --- RENDER LOGIC ---

  if (showIntro) {
      return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="flex h-screen bg-fm-bg text-fm-text overflow-hidden font-sans selection:bg-fm-accent selection:text-white">
      
      {showMatchTransition && liveMatchData && (
          <MatchTransition 
              userTeam={myTeam} 
              enemyTeam={liveMatchData.enemy} 
              mapName={MAP_IMAGES[liveMatchData.mapId] ? liveMatchData.mapId : 'Unknown Map'}
              mapImage={MAP_IMAGES[liveMatchData.mapId] || ''}
          />
      )}

      {showSeasonEndOverlay && (
          <SeasonEndOverlay 
              rank={seasonEndStats.rank} 
              isPlayoffQualified={seasonEndStats.isPlayoff}
              isPromotion={seasonEndStats.isPromotion}
              seasonPhase={seasonPhase}
              leagueName={myTeam.league}
              onContinue={handleSeasonContinue}
          />
      )}

      {showDaySummary && (
          <DaySummary dailyGains={dailyGains} onClose={handleAdvanceDay} />
      )}

      {!isGameStarted ? (
        <StartScreen onStartGame={handleStartGame} />
      ) : (
        <>
          <Sidebar currentView={view} setView={setView} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header 
                team={myTeam} 
                currentView={view} 
                currentDate={currentDate} 
                onAdvanceDay={handleAdvanceDay}
                isMatchDay={isMatchDay}
                isAnalyzing={isAnalyzing}
                unreadCount={unreadCount}
                onSimToMatch={handleSimToMatch}
            />
            
            <main className="flex-1 overflow-y-auto bg-fm-bg relative">
              
              {view === GameView.DASHBOARD && (
                <Dashboard 
                    team={myTeam} 
                    nextScheduledMatch={nextScheduledMatch}
                    nextOpponent={nextOpponent}
                    leagueRank={1} 
                    leagueOpponents={leagueOpponents}
                    onPlayMatch={() => setView(GameView.MATCH_LOBBY)}
                    onViewLeague={() => setView(GameView.LEAGUE)}
                    isAnalyzing={isAnalyzing}
                    messages={messages}
                    onMarkMessageRead={handleMarkMessageRead}
                />
              )}
              {view === GameView.MARKET && (
                 <MarketView 
                    budget={myTeam.budget} 
                    currentRosterCount={myTeam.players.length}
                    onHire={(p) => setMyTeam(prev => ({ ...prev, players: [...prev.players, p], budget: prev.budget - p.marketValue }))} 
                 />
              )}
              {view === GameView.MATCH_LOBBY && (
                  ((nextOpponent && nextOpponent.id !== 'temp-id') || nextScheduledMatch || (nextOpponent && nextOpponent.id === 'temp-id')) ? (
                      <MatchLobby 
                        myTeam={myTeam}
                        opponent={nextOpponent || EMPTY_TEAM}
                        analysis={analysis}
                        isAnalyzing={isAnalyzing}
                        onAnalyze={async () => {
                            if (myTeam.budget < 1500) {
                                setErrorMessage("Insufficient funds for scouting report ($1500 required).");
                                return;
                            }
                            setIsAnalyzing(true);
                            setMyTeam(prev => ({...prev, budget: prev.budget - 1500}));
                            setTimeout(async () => {
                                const result = await analyzeMatchup(myTeam, nextOpponent!);
                                setAnalysis(result);
                                setIsAnalyzing(false);
                            }, 4000);
                        }}
                        onStartMatch={() => setView(GameView.MAP_VETO)}
                        onSetTactic={(t) => setMyTeam(prev => ({ ...prev, preferredTactic: t }))}
                        isMatchDay={isMatchDay}
                        matchDate={nextScheduledMatch?.date}
                        onDevSim={nextOpponent ? handleDevQuickSim : undefined}
                      />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-fm-muted animate-fade-in p-8">
                         <Loader2 size={48} className="animate-spin text-fm-accent mb-4" />
                         <h2 className="text-xl font-bold text-white mb-2">Loading Match Data...</h2>
                         <p className="text-sm max-w-md text-center">Preparing opponent analysis. If this persists, please return to the dashboard.</p>
                         <button onClick={() => setView(GameView.DASHBOARD)} className="mt-8 text-xs font-bold uppercase tracking-widest hover:text-white border-b border-transparent hover:border-white transition-colors pb-1">Return to Dashboard</button>
                    </div>
                  )
              )}
              {view === GameView.MAP_VETO && nextOpponent && (
                  <MapVeto 
                    userTeam={myTeam}
                    enemyTeam={nextOpponent}
                    bestOf={seasonPhase === 'PLAYOFFS' ? 3 : 1}
                    onComplete={(maps) => {
                        // Start Bo3 Series for PLAYOFFS, Bo1 otherwise
                        const isPlayoff = seasonPhase === 'PLAYOFFS';
                        setSeriesState({
                            active: isPlayoff, // Enable series state only for playoffs
                            maps: maps,
                            currentMapIndex: 0,
                            scoreUs: 0,
                            scoreEnemy: 0
                        });
                        const nextMatch = schedule.find(m => !m.isPlayed);
                        startMatchSim(nextOpponent, maps[0], nextMatch?.type || 'MATCH', !!analysis);
                    }}
                  />
              )}
              {view === GameView.MATCH_LIVE && liveMatchData && !showMatchTransition && (
                  <MatchView 
                    playerTeam={myTeam} 
                    enemyTeam={liveMatchData.enemy} 
                    mapId={liveMatchData.mapId}
                    context={liveMatchData.context}
                    fatiguePenalty={liveMatchData.fatiguePenalty}
                    analysisActive={liveMatchData.analysisActive}
                    onComplete={handleMatchComplete} 
                  />
              )}
              {view === GameView.SCHEDULE && (
                  <ScheduleView 
                    tournaments={tournaments} 
                    currentDate={currentDate} 
                    team={myTeam}
                    schedule={schedule}
                    onQualify={(tId) => {}}
                  />
              )}
              {view === GameView.RANKINGS && <RankingsView />}
              {view === GameView.LEAGUE && (
                  <LeagueView 
                      myTeam={myTeam} 
                      opponents={leagueOpponents} 
                      roundResults={latestRoundResults}
                      seasonPhase={seasonPhase}
                      playoffBracket={playoffBracket}
                      onNextSeason={() => startNewSeason(false)}
                  />
              )}
              {view === GameView.PRACTICE && (
                  <PracticeView 
                    team={myTeam}
                    schedule={schedule}
                    currentDate={currentDate}
                    dailyActivities={dailyActivities}
                    isDailyTrainingComplete={isDailyTrainingComplete}
                    onTrain={handleTraining}
                    onIndividualTrain={(pid, drill) => handleIndividualTraining(pid, drill)}
                    onUpdateSchedule={(idx, intensity) => {
                        setMyTeam(prev => {
                            const newSchedule = [...prev.weeklySchedule];
                            newSchedule[idx] = intensity;
                            return { ...prev, weeklySchedule: newSchedule };
                        });
                    }}
                    onSetupComplete={(pb, fp, focus) => {
                         setMyTeam(prev => {
                             const mapStats = { ...prev.mapStats };
                             Object.keys(mapStats).forEach(k => mapStats[k] = 20);
                             mapStats[pb] = 0; // Permaban
                             mapStats[fp] = 45; // First pick
                             focus.forEach(m => mapStats[m] = 35); // Focus maps
                             return { ...prev, isMapPoolInitialized: true, mapStats, permaban: pb, firstPickMap: fp }
                         });
                    }}
                    onHireCoach={(type) => {
                         setMyTeam(prev => ({
                             ...prev,
                             coaches: [...prev.coaches, { id: crypto.randomUUID(), name: type === 'HEAD' ? 'Alex "Tactician" Ivanov' : 'Mike "Aim" Smith', type }]
                         }));
                    }}
                    onAssignCoach={(cId, pId) => {
                         setMyTeam(prev => ({
                             ...prev,
                             coaches: prev.coaches.map(c => c.id === cId ? { ...c, assignedPlayerId: pId } : c)
                         }));
                    }}
                    onToggleAutomation={(key) => {
                         const newValue = !myTeam.automationConfig[key];
                         setMyTeam(prev => ({ ...prev, automationConfig: { ...prev.automationConfig, [key]: newValue } }));
                         if (key === 'autoSchedule' && newValue === true) {
                             setMyTeam(prev => ({ ...prev, weeklySchedule: generateSmartSchedule(prev.weeklySchedule, prev, currentDate) }));
                         }
                    }}
                    onCoachFocusChange={(cId, focus) => {
                        setMyTeam(prev => ({ ...prev, coaches: prev.coaches.map(c => c.id === cId ? { ...c, focus } : c) }));
                    }}
                  />
              )}
            </main>
          </div>
        </>
      )}
      
      {errorMessage && (
          <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce-in z-50">
              <AlertTriangle size={20} />
              <span className="font-bold">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-4 hover:bg-white/20 p-1 rounded"><X size={16} /></button>
          </div>
      )}
    </div>
  );
}