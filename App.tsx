import React, { useState, useEffect } from 'react';
import { Team, Player, GameView, MatchResult, PlayerRole, Tournament, League, LeagueRoundResult, OpponentAnalysis } from './types';
import { Header } from './components/Header';
import { PlayerCard } from './components/PlayerCard';
import { MarketView } from './components/MarketView';
import { MatchView } from './components/MatchView';
import { ScheduleView } from './components/ScheduleView';
import { RankingsView } from './components/RankingsView';
import { LeagueView } from './components/LeagueView';
import { StartScreen } from './components/StartScreen';
import { simulateMatch, analyzeMatchup } from './services/geminiService';
import { TEAMS_BY_LEAGUE, generateRoster } from './data/realTeams';
import { Loader2, AlertTriangle, Trophy, ArrowRight, Scan, Crosshair, ShieldAlert, BrainCircuit } from 'lucide-react';

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
  roundDifference: 0
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
  
  const [myTeam, setMyTeam] = useState<Team>(EMPTY_TEAM);

  // Holds the other 19 teams in the current league to track their standings
  const [leagueOpponents, setLeagueOpponents] = useState<Team[]>([]);
  // Store the results of the most recent round of matches
  const [latestRoundResults, setLatestRoundResults] = useState<LeagueRoundResult[]>([]);
  
  // Next Opponent State
  const [nextOpponent, setNextOpponent] = useState<Team | null>(null);
  const [analysis, setAnalysis] = useState<OpponentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize League Opponents
  useEffect(() => {
    // Get 19 random teams from the current league list (excluding names that might match user in future)
    // For simplicity, we take the first 19 from the data file
    const allLeagueTeams = TEAMS_BY_LEAGUE[myTeam.league];
    setLeagueOpponents(allLeagueTeams.slice(0, 19));
  }, [myTeam.league]);

  // Ensure we always have a next opponent selected if none exists
  useEffect(() => {
    if (leagueOpponents.length > 0 && !nextOpponent) {
        // Simple rotation: just pick a random one for now, or could be round robin logic
        const randomEnemy = leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)];
        setNextOpponent(randomEnemy);
        setAnalysis(null); // Reset analysis for new opponent
    }
  }, [leagueOpponents, nextOpponent]);

  const [matchState, setMatchState] = useState<{
    isLoading: boolean;
    result: MatchResult | null;
    currentEnemyId?: string; // Track who we are playing
  }>({ isLoading: false, result: null });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartGame = (teamName: string, country: string) => {
    const initialRoster = generateRoster(country, 42, 0.5); // Low tier starter stats
    
    setMyTeam({
        id: 'user-team',
        name: teamName,
        league: League.OPEN,
        players: initialRoster,
        budget: 2500,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        leaguePoints: 0,
        roundDifference: 0
    });
    setIsGameStarted(true);
  };

  const advanceDay = (days: number = 1) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
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

  const handleAnalyzeOpponent = async () => {
    if (!nextOpponent) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeMatchup(myTeam, nextOpponent);
        setAnalysis(result);
    } catch (e) {
        console.error(e);
        setErrorMessage("Failed to generate analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const startMatch = async (isQualifier: boolean = false, tournamentId?: string) => {
    if (myTeam.players.length < 5) {
      setErrorMessage("You need 5 players to start a match!");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setMatchState({ isLoading: true, result: null, currentEnemyId: undefined });
    
    try {
      // Use pre-selected nextOpponent if available, otherwise random fallback
      const enemy = isQualifier ? leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)] : (nextOpponent || leagueOpponents[0]);

      let context = `${myTeam.league} League Match`;
      if (isQualifier && tournamentId) {
        const tourney = tournaments.find(t => t.id === tournamentId);
        if (tourney) context = `Qualifier Match for ${tourney.name}`;
      }

      const result = await simulateMatch(myTeam, enemy, context);
      
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
    // 1. Create a list of the other 18 teams (Exclude Opponent)
    const otherTeams = leagueOpponents.filter(t => t.id !== opponentId);
    
    // 2. Shuffle them to create random pairs
    const shuffled = [...otherTeams].sort(() => 0.5 - Math.random());
    
    const roundResults: LeagueRoundResult[] = [];
    const updatedTeamsMap = new Map<string, Partial<Team>>();

    // Add User's Match to the results list first
    roundResults.push({
        teamA: myTeam.name,
        teamB: userResult.enemyTeamName,
        scoreA: userResult.finalScoreUs,
        scoreB: userResult.finalScoreEnemy,
        winner: userResult.finalScoreUs > userResult.finalScoreEnemy ? myTeam.name : userResult.enemyTeamName
    });

    // Update the actual opponent's stats in the main list
    const userOpponent = leagueOpponents.find(t => t.id === opponentId);
    if (userOpponent) {
         const isOpponentWin = userResult.finalScoreEnemy > userResult.finalScoreUs;
         updatedTeamsMap.set(opponentId, {
            matchesPlayed: userOpponent.matchesPlayed + 1,
            wins: isOpponentWin ? userOpponent.wins + 1 : userOpponent.wins,
            losses: !isOpponentWin ? userOpponent.losses + 1 : userOpponent.losses,
            leaguePoints: isOpponentWin ? userOpponent.leaguePoints + 3 : userOpponent.leaguePoints,
            roundDifference: userOpponent.roundDifference + (userResult.finalScoreEnemy - userResult.finalScoreUs)
         });
    }

    // 3. Simulate Matches for the 9 pairs (18 teams)
    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 >= shuffled.length) break;
        
        const teamA = shuffled[i];
        const teamB = shuffled[i + 1];
        
        // Simple simulation logic: Higher rank = higher chance to win, but with randomness
        // Using rankingPoints as proxy for strength if available, otherwise random
        const ratingA = teamA.rankingPoints || 50;
        const ratingB = teamB.rankingPoints || 50;
        const diff = ratingA - ratingB;
        
        // Probability A wins (sigmoid-ish)
        const chanceA = 0.5 + (diff / 100); 
        const isWinA = Math.random() < Math.max(0.1, Math.min(0.9, chanceA));
        
        // Score generation
        const loserScore = Math.floor(Math.random() * 10) + 2; // 2 to 11
        const winnerScore = 13;
        
        const scoreA = isWinA ? winnerScore : loserScore;
        const scoreB = isWinA ? loserScore : winnerScore;
        const rd = scoreA - scoreB;

        // Record Result
        roundResults.push({
            teamA: teamA.name,
            teamB: teamB.name,
            scoreA: scoreA,
            scoreB: scoreB,
            winner: isWinA ? teamA.name : teamB.name
        });

        // Prepare Updates
        updatedTeamsMap.set(teamA.id, {
            matchesPlayed: teamA.matchesPlayed + 1,
            wins: isWinA ? teamA.wins + 1 : teamA.wins,
            losses: !isWinA ? teamA.losses + 1 : teamA.losses,
            leaguePoints: isWinA ? teamA.leaguePoints + 3 : teamA.leaguePoints,
            roundDifference: teamA.roundDifference + rd
        });

        updatedTeamsMap.set(teamB.id, {
            matchesPlayed: teamB.matchesPlayed + 1,
            wins: !isWinA ? teamB.wins + 1 : teamB.wins,
            losses: isWinA ? teamB.losses + 1 : teamB.losses,
            leaguePoints: !isWinA ? teamB.leaguePoints + 3 : teamB.leaguePoints,
            roundDifference: teamB.roundDifference - rd
        });
    }

    setLatestRoundResults(roundResults);

    // Apply updates to state
    setLeagueOpponents(prev => prev.map(team => {
        const updates = updatedTeamsMap.get(team.id);
        if (updates) {
            return { ...team, ...updates };
        }
        return team;
    }));
  };

  const handleMatchComplete = (result: MatchResult) => {
    const won = result.finalScoreUs > result.finalScoreEnemy;
    const rd = result.finalScoreUs - result.finalScoreEnemy;
    
    // Morale Calculation
    // Win: +5 to +10 based on dominance
    // Loss: -5 to -10 based on dominance
    const baseMoraleChange = won ? 5 : -5;
    const dominanceBonus = Math.floor(Math.abs(rd) / 3); // +1 for every 3 rounds difference
    const finalMoraleChange = won ? baseMoraleChange + dominanceBonus : baseMoraleChange - dominanceBonus;

    setMyTeam(prev => ({
      ...prev,
      budget: prev.budget + result.earnings,
      wins: won ? prev.wins + 1 : prev.wins,
      losses: won ? prev.losses : prev.losses + 1,
      matchesPlayed: prev.matchesPlayed + 1,
      leaguePoints: won ? prev.leaguePoints + 3 : prev.leaguePoints,
      roundDifference: prev.roundDifference + rd,
      players: prev.players.map(p => {
          // Update Morale, clamping between 0 and 100
          const newMorale = Math.max(0, Math.min(100, (p.morale || 50) + finalMoraleChange));
          return { ...p, morale: newMorale };
      })
    }));

    // Simulate other teams
    if (!result.isQualifier && matchState.currentEnemyId) {
        simulateLeagueRound(result, matchState.currentEnemyId);
    }

    if (result.isQualifier && result.tournamentId) {
        setTournaments(prev => prev.map(t => {
            if (t.id === result.tournamentId) {
                return {
                    ...t,
                    participationStatus: won ? 'qualified' : 'eliminated'
                };
            }
            return t;
        }));
    }

    // IMPORTANT: Clear nextOpponent so a new one is picked next tick
    if (!result.isQualifier) {
        setNextOpponent(null);
        setAnalysis(null);
    }

    advanceDay(1); 
    setView(GameView.DASHBOARD);
  };

  const handleQualify = (tournamentId: string) => {
      startMatch(true, tournamentId);
  };

  const getLeagueBadgeColor = (league: League) => {
      switch(league) {
          case League.PRO: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
          case League.CHALLENGER: return 'bg-red-500/20 text-red-400 border-red-500/50';
          case League.ADVANCED: return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
          case League.MAIN: return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
          case League.INTERMEDIATE: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
          case League.OPEN: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
          default: return 'bg-gray-800 text-gray-400';
      }
  };

  const renderDashboard = () => (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-cs-dark border border-gray-800 p-6 rounded-lg shadow-lg col-span-1 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex justify-between items-start mb-2">
                <h2 className="text-gray-400 uppercase text-sm font-bold tracking-widest">Team Status</h2>
                <div className={`px-2 py-1 rounded text-xs font-black uppercase border ${getLeagueBadgeColor(myTeam.league)}`}>
                    {myTeam.league}
                </div>
             </div>
             <div className="text-5xl font-black text-white mb-4 truncate">{myTeam.name}</div>
             <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> {myTeam.wins} WINS</div>
                <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> {myTeam.losses} LOSSES</div>
             </div>
          </div>
          <div className="absolute right-0 top-0 p-10 opacity-5 pointer-events-none">
              <Trophy size={200} />
          </div>
        </div>

        <div className="col-span-2 bg-gradient-to-r from-blue-900/10 to-cs-dark border border-blue-900/30 p-0 rounded-lg flex flex-col relative overflow-hidden">
            {/* Background Element */}
            <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl"></div>

            {/* Match Header */}
            <div className="p-6 border-b border-gray-800/50 flex justify-between items-center relative z-10">
                <div>
                    <h3 className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-1">Next Opponent</h3>
                    <div className="text-2xl font-black text-white flex items-center gap-3">
                        {nextOpponent?.name || "Waiting for Schedule..."}
                        <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-1 rounded">
                             {nextOpponent ? `${nextOpponent.wins}W - ${nextOpponent.losses}L` : '0W - 0L'}
                        </span>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                     <div className="text-xs text-gray-500 uppercase tracking-widest">EST. DIFFICULTY</div>
                     <div className="flex gap-1 justify-end mt-1">
                        {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-2 h-4 rounded-sm ${n <= 3 ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>
                        ))}
                     </div>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 relative z-10">
                {/* Analysis Section */}
                <div className="flex-1 bg-black/20 rounded border border-gray-700/50 p-4 relative min-h-[200px]">
                     {!analysis ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                            <Scan size={32} className="text-cs-blue opacity-50" />
                            <p className="text-gray-400 text-sm max-w-xs">Scout this opponent to reveal their tactics, key threats, and win probability.</p>
                            <button 
                                onClick={handleAnalyzeOpponent}
                                disabled={isAnalyzing || !nextOpponent}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded border border-gray-600 flex items-center gap-2 transition-all"
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14}/>}
                                {isAnalyzing ? 'Analyzing Roster...' : 'Run AI Analysis'}
                            </button>
                        </div>
                     ) : (
                        <div className="animate-fade-in space-y-4">
                            <div className="flex justify-between items-start border-b border-gray-700/50 pb-2">
                                <div>
                                    <div className="text-[10px] text-cs-blue uppercase font-bold">Win Probability</div>
                                    <div className="text-xl font-mono font-bold text-white">{analysis.winProbability}%</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-red-400 uppercase font-bold">Key Threat</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                                        <Crosshair size={12} /> {analysis.keyPlayer}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-green-400 font-bold block mb-1">THEIR STRENGTHS</span>
                                    <ul className="list-disc list-inside text-gray-400 space-y-0.5">
                                        {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <span className="text-red-400 font-bold block mb-1">THEIR WEAKNESSES</span>
                                    <ul className="list-disc list-inside text-gray-400 space-y-0.5">
                                        {analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-900/50 p-2 rounded text-xs">
                                <span className="text-cs-blue font-bold uppercase mr-2">Coach Advice:</span>
                                <span className="text-gray-300 italic">{analysis.strategy}</span>
                            </div>
                        </div>
                     )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col justify-end gap-3 w-full md:w-48 shrink-0">
                    <button 
                        onClick={() => startMatch(false)}
                        disabled={matchState.isLoading || myTeam.players.length < 5}
                        className={`w-full py-3 rounded font-bold text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                            myTeam.players.length < 5 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-cs-blue hover:bg-blue-500 text-white hover:shadow-blue-500/30'
                        }`}
                    >
                        {matchState.isLoading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                        {myTeam.players.length < 5 ? 'Roster Incomplete' : 'Start Match'}
                    </button>
                    
                    <button 
                        onClick={() => setView(GameView.LEAGUE)}
                        className="w-full py-2 rounded font-bold text-xs uppercase tracking-widest bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all"
                    >
                        View Standings
                    </button>
                </div>
            </div>

           {errorMessage && <div className="absolute bottom-2 left-6 right-6 text-red-400 text-xs text-center bg-red-900/80 p-1 rounded">{errorMessage}</div>}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Active Roster 
        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 font-mono">{myTeam.players.length}/5</span>
      </h3>
      
      {/* Changed grid to max 3 cols to avoid squashing 5 in a row on standard screens. They will wrap nicely. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myTeam.players.map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            actionLabel="Release Player"
            onAction={handleFirePlayer}
            className="h-full"
          />
        ))}
        
        {Array.from({ length: 5 - myTeam.players.length }).map((_, i) => (
          <div key={i} className="border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-600 p-6 hover:border-gray-600 transition-colors group cursor-pointer h-full min-h-[300px]" onClick={() => setView(GameView.MARKET)}>
             <div className="text-4xl font-thin mb-2 group-hover:text-cs-blue">+</div>
             <div className="text-sm font-bold uppercase tracking-widest">Empty Slot</div>
             <div className="text-xs mt-2 text-gray-700 group-hover:text-cs-yellow">Go to Market</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isGameStarted) {
      return <StartScreen onStartGame={handleStartGame} />;
  }

  return (
    <div className="min-h-screen bg-cs-darker text-gray-200 font-sans selection:bg-cs-yellow selection:text-black">
      {view !== GameView.MATCH_LIVE && (
        <Header 
            team={myTeam} 
            currentView={view} 
            setView={setView} 
            currentDate={currentDate}
            onAdvanceDay={() => advanceDay(1)}
        />
      )}
      
      <main className="flex-1 relative">
        {view === GameView.DASHBOARD && renderDashboard()}
        {view === GameView.SCHEDULE && (
            <ScheduleView 
                tournaments={tournaments} 
                currentDate={currentDate} 
                team={myTeam} 
                onQualify={handleQualify} 
            />
        )}
        {view === GameView.RANKINGS && (
            <RankingsView />
        )}
        {view === GameView.LEAGUE && (
            <LeagueView myTeam={myTeam} opponents={leagueOpponents} roundResults={latestRoundResults} />
        )}
        {view === GameView.MARKET && (
          <MarketView 
            budget={myTeam.budget} 
            onHire={handleHirePlayer} 
            currentRosterCount={myTeam.players.length} 
          />
        )}
        {view === GameView.MATCH_LOBBY && renderDashboard()}
        {view === GameView.MATCH_LIVE && (
           <MatchView 
             matchResult={matchState.result} 
             playerTeam={myTeam} 
             onComplete={handleMatchComplete} 
           />
        )}
      </main>
    </div>
  );
}