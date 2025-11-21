import React, { useState, useEffect } from 'react';
import { Team, Player, GameView, MatchResult, PlayerRole, Tournament, League, LeagueRoundResult, OpponentAnalysis, ScheduledMatch, MapPracticeStats } from './types';
import { Header } from './components/Header';
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
import { simulateMatch, analyzeMatchup } from './services/geminiService';
import { TEAMS_BY_LEAGUE, generateRoster } from './data/realTeams';
import { Loader2, AlertTriangle, Trophy, ArrowRight, Scan, Crosshair, ShieldAlert, BrainCircuit, Calendar, Lock, ThumbsUp, ThumbsDown, TrendingUp, Hourglass, CheckCircle, Target } from 'lucide-react';

// This is just a placeholder type for init, will be replaced by user choice
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
  mapStats: {}
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

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [view, setView] = useState<GameView>(GameView.DASHBOARD);
  const [currentDate, setCurrentDate] = useState(new Date('2024-01-01'));
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [schedule, setSchedule] = useState<ScheduledMatch[]>([]);
  
  const [myTeam, setMyTeam] = useState<Team>(EMPTY_TEAM);
  const [trainingDoneToday, setTrainingDoneToday] = useState(false);

  // Holds the other 19 teams in the current league to track their standings
  const [leagueOpponents, setLeagueOpponents] = useState<Team[]>([]);
  // Store the results of the most recent round of matches
  const [latestRoundResults, setLatestRoundResults] = useState<LeagueRoundResult[]>([]);
  
  // Next Opponent State
  const [nextOpponent, setNextOpponent] = useState<Team | null>(null);
  const [analysis, setAnalysis] = useState<OpponentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTimer, setAnalysisTimer] = useState<number>(0); // Timer for analysis delay
  
  // Match Context needed for Veto -> Live flow
  const [pendingMatchContext, setPendingMatchContext] = useState<{isQualifier: boolean, tournamentId?: string} | null>(null);

  // Initialize League Opponents
  useEffect(() => {
    // Get 19 random teams from the current league list (excluding names that might match user in future)
    // For simplicity, we take the first 19 from the data file
    const allLeagueTeams = TEAMS_BY_LEAGUE[myTeam.league];
    setLeagueOpponents(allLeagueTeams.slice(0, 19));
  }, [myTeam.league]);

  // Ensure we always have a next opponent selected based on schedule
  useEffect(() => {
    const nextMatch = schedule.find(m => !m.isPlayed);
    if (nextMatch && leagueOpponents.length > 0) {
        const opponent = leagueOpponents.find(t => t.id === nextMatch.opponentId);
        // If opponent not found in league (e.g. scrim), could handle here, but for now assume league
        if (opponent && (!nextOpponent || nextOpponent.id !== opponent.id)) {
            setNextOpponent(opponent);
            setAnalysis(null);
        }
    } else if (!nextMatch && leagueOpponents.length > 0 && schedule.length > 0) {
        // Season finished?
        setNextOpponent(null);
    }
  }, [schedule, leagueOpponents, nextOpponent]);

  const [matchState, setMatchState] = useState<{
    isLoading: boolean;
    result: MatchResult | null;
    currentEnemyId?: string; // Track who we are playing
  }>({ isLoading: false, result: null });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine if today is a match day
  const isMatchDay = schedule.some(m => 
    new Date(m.date).toDateString() === currentDate.toDateString() && !m.isPlayed
  );

  // Get next scheduled match
  const nextScheduledMatch = schedule.find(m => !m.isPlayed);

  const generateSeasonSchedule = (startDate: Date, opponents: Team[], league: League): ScheduledMatch[] => {
      const newSchedule: ScheduledMatch[] = [];
      let scheduleDate = new Date(startDate);
      
      // Shuffle opponents to create random fixture order
      const shuffledOpponents = [...opponents].sort(() => 0.5 - Math.random());
      
      // Generate 15 matches (playing most teams once)
      // Start 4 days from now to give time for market/scouting
      scheduleDate.setDate(scheduleDate.getDate() + 4);

      shuffledOpponents.slice(0, 15).forEach((opponent) => {
          // Interval: 4 to 7 days (ensures max ~2 matches per week)
          const interval = Math.floor(Math.random() * 4) + 4;
          
          newSchedule.push({
              id: crypto.randomUUID(),
              date: scheduleDate.toISOString(),
              opponentId: opponent.id,
              isPlayed: false,
              type: 'LEAGUE',
              leagueName: league === League.OPEN ? 'ESEA Open' : league.split(' ')[0] // Shorten for UI
          });

          // Advance date for next match
          const nextDate = new Date(scheduleDate);
          nextDate.setDate(nextDate.getDate() + interval);
          scheduleDate = nextDate;
      });

      return newSchedule;
  };

  const handleStartGame = (teamName: string, country: string) => {
    const startLeague = League.OPEN;
    
    // --- DYNAMIC BALANCING LOGIC ---
    // Calculate the average rating of the league to ensure ~50% win rate start
    const leagueTeams = TEAMS_BY_LEAGUE[startLeague];
    let totalRating = 0;
    let totalPlayers = 0;
    
    leagueTeams.forEach(team => {
        team.players.forEach(p => {
            // Simple average of key stats
            const r = (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility) / 4;
            totalRating += r;
            totalPlayers++;
        });
    });
    
    const avgLeagueRating = Math.round(totalRating / (totalPlayers || 1));
    
    // Generate initial roster with this exact average rating + 5 POINT BOOST for better player experience
    const initialRoster = generateRoster(country, avgLeagueRating + 5, 0.5); 
    
    // Map Stats are now initialized at 0, waiting for user setup in Practice View
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
        lastTrainedMapId: undefined
    });

    const startDate = new Date('2024-01-01');
    setCurrentDate(startDate);
    
    // Generate Schedule immediately
    const potentialOpponents = TEAMS_BY_LEAGUE[startLeague].slice(0, 19);
    const seasonSchedule = generateSeasonSchedule(startDate, potentialOpponents, startLeague);
    setSchedule(seasonSchedule);

    setIsGameStarted(true);
  };

  const advanceDay = (days: number = 1) => {
    if (isMatchDay) {
        setErrorMessage("It's Match Day! You must play your scheduled match.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
    }
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setTrainingDoneToday(false);
  };

  const handleHirePlayer = (player: Player) => {
    if (myTeam.players.length >= 5) return;
    if (myTeam.budget < player.marketValue) return;

    setMyTeam(prev => ({
      ...prev,
      players: [...prev.players, player],
      budget: prev.budget - player.marketValue
    }));
  };

  const handleFirePlayer = (player: Player) => {
    setMyTeam(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== player.id),
      budget: prev.budget + Math.floor(player.marketValue * 0.5)
    }));
  };

  // --- NEW TRAINING LOGIC ---
  const handleTraining = (mapId: string, skill: keyof MapPracticeStats) => {
      if (trainingDoneToday) return;

      setMyTeam(prev => {
          const currentProficiency = prev.mapStats[mapId] || 0;
          
          // 1. Determine Hard Caps
          // First Pick map can go to 100.
          // All other maps cap at 85.
          const isFirstPick = prev.firstPickMap === mapId;
          const maxCap = isFirstPick ? 100 : 85;

          if (currentProficiency >= maxCap) {
              setErrorMessage(isFirstPick ? "Map Mastery already at MAX!" : "Map capped at 85%. Only your First Pick can reach 100%.");
              setTimeout(() => setErrorMessage(null), 4000);
              return prev; // No change
          }

          // 2. Calculate Fatigue
          // If training same map as last time, increment streak
          let newStreak = 1;
          if (prev.lastTrainedMapId === mapId) {
              newStreak = (prev.consecutiveMapTrainCount || 0) + 1;
          }

          // 3. Calculate Base Gain based on Tiers
          let gain = 1.0; // 0-50%
          if (currentProficiency >= 70) gain = 0.2;
          else if (currentProficiency >= 50) gain = 0.5;

          // 4. Apply Fatigue Penalty
          const isFatigued = newStreak >= 5;
          if (isFatigued) {
              gain = gain * 0.5;
          }

          // 5. Update Sub-stat
          const currentPractice = prev.practiceStats?.[mapId] || { pistol: 0, ct: 0, t: 0, strat: 0 };
          const newSkillValue = Math.min(100, currentPractice[skill] + (gain * 4)); // Multiply by 4 because mastery is avg of 4 sub-stats
          
          const newPracticeStatsForMap = {
              ...currentPractice,
              [skill]: newSkillValue
          };
          
          // Recalculate Overall Map Mastery for this map (Average of 4 sub-skills)
          const totalSkill = newPracticeStatsForMap.pistol + newPracticeStatsForMap.ct + newPracticeStatsForMap.t + newPracticeStatsForMap.strat;
          const rawMastery = totalSkill / 4;
          const newMapMastery = Math.min(maxCap, rawMastery); // Hard Clamp

          // --- DECAY SYSTEM ---
          // Slightly decrease stats of OTHER maps to prevent 100% everywhere
          const updatedMapStats = { ...prev.mapStats };
          const updatedPracticeStats = { ...prev.practiceStats };

          // Update the trained map first
          updatedPracticeStats[mapId] = newPracticeStatsForMap;
          updatedMapStats[mapId] = newMapMastery;

          // Decay others
          Object.keys(updatedMapStats).forEach(otherMapId => {
              if (otherMapId !== mapId) {
                  // Reduce overall by ~0.5% (simulate decay)
                  const currentVal = updatedMapStats[otherMapId];
                  if (currentVal > 20) { // Don't decay below 20%
                      updatedMapStats[otherMapId] = Math.max(20, currentVal - 0.5);
                      // Simplified decay: we just update the mastery number for now, 
                      // keeping sub-stats slightly desynced to avoid complex math, 
                      // or we could reduce sub-stats too. Let's stick to mastery for game logic.
                  }
              }
          });

          return {
              ...prev,
              practiceStats: updatedPracticeStats,
              mapStats: updatedMapStats,
              lastTrainedMapId: mapId,
              consecutiveMapTrainCount: newStreak
          };
      });

      setTrainingDoneToday(true);
  };

  // --- INITIAL MAP SETUP ---
  const handleInitialMapSetup = (permaban: string, firstPick: string, focusMaps: string[]) => {
      setMyTeam(prev => {
          const newMapStats = { ...prev.mapStats };
          const newPracticeStats = { ...prev.practiceStats };
          const maps = Object.keys(newMapStats);

          maps.forEach(mapId => {
              let val = 20; // Default remainder
              if (mapId === permaban) val = 0;
              else if (mapId === firstPick) val = 45;
              else if (focusMaps.includes(mapId)) val = 35;

              newMapStats[mapId] = val;
              // Set sub-stats equal to mastery so average is correct
              newPracticeStats[mapId] = { pistol: val, ct: val, t: val, strat: val };
          });

          return {
              ...prev,
              mapStats: newMapStats,
              practiceStats: newPracticeStats,
              permaban: permaban,
              firstPickMap: firstPick,
              isMapPoolInitialized: true
          };
      });
  };

  const handleAnalyzeOpponent = async () => {
    if (!nextOpponent) return;
    
    setIsAnalyzing(true);
    setAnalysisTimer(30); // Start 30 second countdown

    // Start the visual countdown logic
    const timerInterval = setInterval(() => {
      setAnalysisTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
        // Run API call AND a minimum delay of 30 seconds concurrently
        const apiCallPromise = analyzeMatchup(myTeam, nextOpponent);
        const delayPromise = new Promise(resolve => setTimeout(resolve, 30000));

        // Wait for both to complete
        const [result] = await Promise.all([apiCallPromise, delayPromise]);
        
        setAnalysis(result);
    } catch (e) {
        console.error(e);
        setErrorMessage("Failed to generate analysis.");
    } finally {
        clearInterval(timerInterval);
        setAnalysisTimer(0);
        setIsAnalyzing(false);
    }
  };

  // Helper for analysis status text
  const getAnalysisStatusText = (time: number) => {
      if (time > 20) return "Downloading latest demos...";
      if (time > 10) return "Analyzing player heatmaps...";
      return "Simulating tactical outcomes...";
  };

  // Helper to get current rank
  const getMyLeagueRank = () => {
      const allTeams = [myTeam, ...leagueOpponents];
      const sortedTeams = allTeams.sort((a, b) => {
          if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
          if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
          return b.wins - a.wins;
      });
      return sortedTeams.findIndex(t => t.id === myTeam.id) + 1;
  };

  // Prepares for match by sending user to Map Veto
  const enterVeto = (isQualifier: boolean = false, tournamentId?: string) => {
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
      
      setPendingMatchContext({ isQualifier, tournamentId });
      setView(GameView.MAP_VETO);
  }

  const startMatchSimulation = async (mapId: string) => {
    if (!pendingMatchContext) return;
    const { isQualifier, tournamentId } = pendingMatchContext;

    setMatchState({ isLoading: true, result: null, currentEnemyId: undefined });
    
    try {
      // Use pre-selected nextOpponent if available, otherwise random fallback
      const enemy = isQualifier ? leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)] : (nextOpponent || leagueOpponents[0]);

      let context = `${myTeam.league} League Match`;
      if (isQualifier && tournamentId) {
        const tourney = tournaments.find(t => t.id === tournamentId);
        if (tourney) context = `Qualifier Match for ${tourney.name}`;
      }

      // If analysis has been performed, give a 2% tactical bonus
      const tacticalBonus = analysis ? 0.02 : 0;

      const result = await simulateMatch(myTeam, enemy, context, tacticalBonus, mapId);
      
      result.isQualifier = isQualifier;
      result.tournamentId = tournamentId;
      
      setMatchState({ isLoading: false, result, currentEnemyId: enemy.id });
      setView(GameView.MATCH_LIVE);
    } catch (error) {
      console.error(error);
      setMatchState({ isLoading: false, result: null });
      setErrorMessage("Match simulation failed. Check API Key.");
    }
  };

  // Simulate results for other AI teams - PAIR THEM UP
  const simulateLeagueRound = (userResult: MatchResult, opponentId: string) => {
    const roundResults: LeagueRoundResult[] = [];
    const updatedTeamsMap = new Map<string, Partial<Team>>();

    // 1. Identify User's Opponent Robustly (ID or Name Fallback)
    let actualOpponentId = opponentId;
    let userOpponent = leagueOpponents.find(t => t.id === opponentId);

    if (!userOpponent && userResult.enemyTeamName) {
        userOpponent = leagueOpponents.find(t => t.name.toLowerCase() === userResult.enemyTeamName.toLowerCase());
        if (userOpponent) {
            actualOpponentId = userOpponent.id;
        }
    }

    // 2. Update User's Match Result (Log for View)
    roundResults.push({
        teamA: myTeam.name,
        teamB: userResult.enemyTeamName,
        scoreA: userResult.finalScoreUs,
        scoreB: userResult.finalScoreEnemy,
        winner: userResult.finalScoreUs > userResult.finalScoreEnemy ? myTeam.name : userResult.enemyTeamName
    });

    // Update User Opponent Stats in the Map
    const opponentPoints = userResult.finalScoreEnemy > userResult.finalScoreUs ? 3 : 0;
    const opponentRd = userResult.finalScoreEnemy - userResult.finalScoreUs;
    
    if (userOpponent) {
      updatedTeamsMap.set(userOpponent.id, {
        matchesPlayed: userOpponent.matchesPlayed + 1,
        wins: userOpponent.wins + (userResult.finalScoreEnemy > userResult.finalScoreUs ? 1 : 0),
        losses: userOpponent.losses + (userResult.finalScoreEnemy > userResult.finalScoreUs ? 0 : 1),
        leaguePoints: userOpponent.leaguePoints + opponentPoints,
        roundDifference: userOpponent.roundDifference + opponentRd
      });
    }

    // 3. Simulate The Rest of the League (18 teams if total 20)
    // Filter out the team the user just played
    let remainingTeams = leagueOpponents.filter(t => t.id !== actualOpponentId);
    
    // Shuffle to pair randomly
    remainingTeams = remainingTeams.sort(() => 0.5 - Math.random());

    // Pair up
    for (let i = 0; i < remainingTeams.length; i += 2) {
        const teamA = remainingTeams[i];
        const teamB = remainingTeams[i + 1];

        if (!teamB) {
            // Odd number of teams remaining? Failsafe.
            updatedTeamsMap.set(teamA.id, {
                 matchesPlayed: teamA.matchesPlayed + 1,
                 leaguePoints: teamA.leaguePoints + 3, 
                 wins: teamA.wins + 1,
                 roundDifference: teamA.roundDifference + 1
            });
            continue;
        }

        // Determine Winner based on rating
        const scoreA = Math.random() > 0.5 ? 13 : Math.floor(Math.random() * 11);
        const scoreB = scoreA === 13 ? Math.floor(Math.random() * 11) : 13;
        
        const winner = scoreA > scoreB ? teamA : teamB;
        
        roundResults.push({
            teamA: teamA.name,
            teamB: teamB.name,
            scoreA: scoreA,
            scoreB: scoreB,
            winner: winner.name
        });

        // Store updates
        updatedTeamsMap.set(teamA.id, {
            matchesPlayed: teamA.matchesPlayed + 1,
            wins: teamA.wins + (teamA === winner ? 1 : 0),
            losses: teamA.losses + (teamA === winner ? 0 : 1),
            leaguePoints: teamA.leaguePoints + (teamA === winner ? 3 : 0),
            roundDifference: teamA.roundDifference + (scoreA - scoreB)
        });

        updatedTeamsMap.set(teamB.id, {
            matchesPlayed: teamB.matchesPlayed + 1,
            wins: teamB.wins + (teamB === winner ? 1 : 0),
            losses: teamB.losses + (teamB === winner ? 0 : 1),
            leaguePoints: teamB.leaguePoints + (teamB === winner ? 3 : 0),
            roundDifference: teamB.roundDifference + (scoreB - scoreA)
        });
    }

    setLatestRoundResults(roundResults);

    // Apply updates to state
    setLeagueOpponents(prev => prev.map(t => {
        const updates = updatedTeamsMap.get(t.id);
        return updates ? { ...t, ...updates } : t;
    }));
  };

  const handleMatchComplete = (result: MatchResult) => {
      // Update My Team Stats
      const isWin = result.finalScoreUs > result.finalScoreEnemy;
      const points = isWin ? 3 : 0;
      const rd = result.finalScoreUs - result.finalScoreEnemy;
      
      // UPDATE PLAYER HISTORY (Kills, Deaths, Rating)
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
          players: updatedPlayers, // Save updated history
          matchesPlayed: myTeam.matchesPlayed + 1,
          wins: myTeam.wins + (isWin ? 1 : 0),
          losses: myTeam.losses + (isWin ? 0 : 1),
          leaguePoints: myTeam.leaguePoints + points,
          roundDifference: myTeam.roundDifference + rd,
          budget: myTeam.budget + result.earnings
      };
      
      setMyTeam(updatedMyTeam);

      // Simulate rest of league
      const opponentId = matchState.currentEnemyId;
      if (opponentId) {
          simulateLeagueRound(result, opponentId);
      } else {
          // Fallback if opponent ID was lost (should not happen)
          console.warn("Opponent ID lost during match completion. Simulating generic round.");
          simulateLeagueRound(result, "unknown");
      }

      // Update Schedule to mark played
      const nextMatchIdx = schedule.findIndex(m => !m.isPlayed);
      if (nextMatchIdx !== -1) {
          const newSched = [...schedule];
          newSched[nextMatchIdx].isPlayed = true;
          setSchedule(newSched);
      }

      setView(GameView.DASHBOARD);
  };

  return (
    <div className="min-h-screen bg-cs-darker text-white font-sans">
      {!isGameStarted ? (
        <StartScreen onStartGame={handleStartGame} />
      ) : (
        <>
          <Header 
            team={myTeam} 
            currentView={view} 
            setView={setView} 
            currentDate={currentDate}
            onAdvanceDay={() => advanceDay(1)}
            isMatchDay={isMatchDay}
          />

          <div className="relative">
            {errorMessage && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3 animate-bounce">
                <AlertTriangle size={24} />
                <span className="font-bold">{errorMessage}</span>
              </div>
            )}

            {view === GameView.DASHBOARD && (
               <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Roster */}
                  <div className="lg:col-span-2 space-y-6">
                      <div className="bg-cs-dark border border-gray-800 rounded-lg p-6">
                          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                              <Scan className="text-cs-yellow" /> Active Roster
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {myTeam.players.map(p => (
                                  <PlayerCard 
                                    key={p.id} 
                                    player={p} 
                                    actionLabel="Release"
                                    onAction={handleFirePlayer}
                                    isCompact={true}
                                  />
                              ))}
                              {myTeam.players.length < 5 && (
                                  <div 
                                    onClick={() => setView(GameView.MARKET)}
                                    className="border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center p-8 text-gray-500 hover:text-cs-yellow hover:border-cs-yellow hover:bg-gray-800/50 transition-all cursor-pointer h-full min-h-[160px]"
                                  >
                                      <span className="text-4xl font-thin mb-2">+</span>
                                      <span className="font-bold uppercase tracking-widest">Sign Player</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Next Match */}
                  <div className="space-y-6">
                      <div className="bg-cs-dark border border-gray-800 rounded-lg p-6 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5">
                              <Crosshair size={120} />
                          </div>
                          <h2 className="text-xl font-bold mb-4 text-gray-200">Next Opponent</h2>
                          
                          {nextScheduledMatch ? (
                              <div className="relative z-10">
                                  <div className="text-center mb-6">
                                      <div className="text-4xl font-black text-white tracking-tighter mb-1">
                                          {nextOpponent?.name || "TBD"}
                                      </div>
                                      <div className="text-cs-yellow font-mono text-sm">
                                          {nextOpponent ? `Rank #${nextOpponent.rankingPoints || 'Unranked'}` : 'Pending'}
                                      </div>
                                  </div>

                                  {isAnalyzing ? (
                                      <div className="bg-gray-900/80 rounded p-4 mb-4 border border-cs-blue/30">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs font-bold text-cs-blue uppercase animate-pulse">
                                                  {getAnalysisStatusText(analysisTimer)}
                                              </span>
                                              <span className="text-sm font-mono text-white">{analysisTimer}s</span>
                                          </div>
                                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                              <div 
                                                  className="h-full bg-cs-blue transition-all duration-1000 ease-linear" 
                                                  style={{ width: `${((30 - analysisTimer) / 30) * 100}%` }}
                                              ></div>
                                          </div>
                                      </div>
                                  ) : analysis ? (
                                      <div className="bg-gray-900/80 rounded p-4 text-sm space-y-2 border border-gray-700 mb-4 animate-fade-in">
                                          <div className="flex items-start gap-2 mb-3">
                                              <BrainCircuit size={16} className="text-cs-blue mt-0.5 shrink-0" />
                                              <p className="text-gray-300 italic">"{analysis.overview}"</p>
                                          </div>
                                          
                                          {/* Strengths & Weaknesses Display */}
                                          <div className="grid grid-cols-2 gap-2 mb-3">
                                              <div>
                                                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400 mb-1">
                                                      <ThumbsUp size={10} /> Strengths
                                                  </div>
                                                  <ul className="list-disc list-inside text-xs text-gray-400">
                                                      {analysis.strengths.map((s, i) => <li key={i} className="truncate" title={s}>{s}</li>)}
                                                  </ul>
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-400 mb-1">
                                                      <ThumbsDown size={10} /> Weaknesses
                                                  </div>
                                                  <ul className="list-disc list-inside text-xs text-gray-400">
                                                      {analysis.weaknesses.map((w, i) => <li key={i} className="truncate" title={w}>{w}</li>)}
                                                  </ul>
                                              </div>
                                          </div>

                                          {/* Best/Worst Map Display */}
                                          <div className="grid grid-cols-2 gap-2 mb-3 border-t border-gray-700 pt-2">
                                              <div className="bg-green-900/20 p-1.5 rounded">
                                                  <div className="text-[9px] uppercase text-gray-500 font-bold">Best Map</div>
                                                  <div className="font-bold text-white">{analysis.bestMap}</div>
                                                  <div className="text-[10px] text-green-400 font-mono">{analysis.bestMapWinRate}% WR</div>
                                              </div>
                                              <div className="bg-red-900/20 p-1.5 rounded">
                                                  <div className="text-[9px] uppercase text-gray-500 font-bold">Worst Map</div>
                                                  <div className="font-bold text-white">{analysis.worstMap}</div>
                                                  <div className="text-[10px] text-red-400 font-mono">{analysis.worstMapWinRate}% WR</div>
                                              </div>
                                          </div>

                                          <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
                                              <span className="text-gray-500 text-xs uppercase font-bold">Win Probability</span>
                                              <span className={`font-mono font-bold ${analysis.winProbability > 50 ? 'text-green-400' : 'text-red-400'}`}>
                                                  {analysis.winProbability}%
                                              </span>
                                          </div>

                                          {/* TACTICAL BONUS INDICATOR */}
                                          <div className="mt-2 p-2 bg-green-900/30 border border-green-500/30 rounded flex items-center gap-2 animate-pulse">
                                             <CheckCircle className="text-green-400" size={14} />
                                             <span className="text-[10px] text-green-300 font-bold uppercase tracking-wide">Tactical Bonus Active: +2% Win Chance</span>
                                          </div>
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={handleAnalyzeOpponent}
                                          disabled={isAnalyzing || !nextOpponent}
                                          className="w-full py-2 mb-4 bg-gray-800 hover:bg-gray-700 text-cs-blue font-bold uppercase text-xs tracking-widest rounded transition-colors flex justify-center items-center gap-2"
                                      >
                                          {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
                                          Analyze Matchup
                                      </button>
                                  )}

                                  <button 
                                      onClick={() => {
                                          if (myTeam.players.length < 5) {
                                              setErrorMessage("You need 5 players to enter match lobby!");
                                              setTimeout(() => setErrorMessage(null), 3000);
                                          } else {
                                              setView(GameView.MATCH_LOBBY);
                                          }
                                      }}
                                      disabled={isAnalyzing}
                                      className={`w-full py-4 font-black uppercase tracking-widest rounded shadow-lg transition-transform transform flex justify-center items-center gap-2
                                        ${isAnalyzing 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                            : 'bg-t-accent hover:bg-red-600 text-white shadow-red-900/20 hover:scale-105'}`}
                                  >
                                      Play Match <ArrowRight size={18} />
                                  </button>
                                  <div className="text-center mt-2">
                                     <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                         {new Date(nextScheduledMatch.date).toLocaleDateString()}
                                     </span>
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center py-10 text-gray-500 italic">
                                  No matches scheduled.
                              </div>
                          )}
                      </div>

                      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                              League Standing
                              <TrendingUp size={14} />
                          </h3>
                          <div className="flex justify-between items-center mb-2">
                              <div className="flex flex-col">
                                  <span className="text-xs text-gray-500 uppercase font-bold">Current Rank</span>
                                  <span className="text-3xl font-black text-white leading-none">#{getMyLeagueRank()}</span>
                              </div>
                              <div className="text-right">
                                  <span className="block text-[10px] text-gray-500 uppercase font-bold">Points</span>
                                  <span className="text-cs-yellow font-mono font-bold text-xl">{myTeam.leaguePoints}</span>
                              </div>
                          </div>
                          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-2">
                              <div 
                                className="bg-cs-blue h-full transition-all duration-500" 
                                style={{ width: `${(myTeam.matchesPlayed / 15) * 100}%` }}
                              ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                              <span>Progress</span>
                              <span>{myTeam.matchesPlayed}/15 Games</span>
                          </div>
                          <button 
                            onClick={() => setView(GameView.LEAGUE)}
                            className="w-full mt-4 text-xs text-gray-500 hover:text-white uppercase font-bold border-t border-gray-800 pt-2"
                          >
                            View Full Table
                          </button>
                      </div>
                  </div>
               </div>
            )}

            {view === GameView.MATCH_LOBBY && nextOpponent && (
                <MatchLobby 
                    myTeam={myTeam} 
                    opponent={nextOpponent} 
                    leagueOpponents={leagueOpponents}
                    onStartMatch={() => enterVeto()} 
                />
            )}

            {view === GameView.MAP_VETO && nextOpponent && (
                <MapVeto 
                    userTeam={myTeam}
                    enemyTeam={nextOpponent}
                    onComplete={(mapId) => startMatchSimulation(mapId)}
                />
            )}

            {view === GameView.LEAGUE && (
                <LeagueView myTeam={myTeam} opponents={leagueOpponents} roundResults={latestRoundResults} />
            )}

            {view === GameView.PRACTICE && (
                <PracticeView 
                    team={myTeam} 
                    onTrain={handleTraining}
                    onSetupComplete={handleInitialMapSetup}
                    isTrainingDoneToday={trainingDoneToday}
                />
            )}

            {view === GameView.MARKET && (
                <MarketView budget={myTeam.budget} onHire={handleHirePlayer} currentRosterCount={myTeam.players.length} />
            )}

            {view === GameView.SCHEDULE && (
                <ScheduleView 
                    tournaments={tournaments} 
                    currentDate={currentDate} 
                    team={myTeam} 
                    schedule={schedule}
                    onQualify={(tId) => enterVeto(true, tId)}
                />
            )}

            {view === GameView.RANKINGS && (
                <RankingsView />
            )}

            {view === GameView.MATCH_LIVE && (
                <MatchView 
                    matchResult={matchState.result} 
                    playerTeam={myTeam} 
                    onComplete={handleMatchComplete} 
                />
            )}
          </div>
        </>
      )}
    </div>
  );
}