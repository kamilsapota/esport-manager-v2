
import React, { useState, useEffect, useRef } from 'react';
import { Team, Player, PlayerRole, League, LeagueRoundResult, OpponentAnalysis, ScheduledMatch, MapPracticeStats, Tactic, TrainingIntensity, DRILLS, DrillType, Coach, AutomationConfig, Tournament, GameView, MatchResult, SeasonPhase, PlayoffMatch, PlayerMatchStats, SeriesState } from './types';
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
  const [leagueRank, setLeagueRank] = useState(0); // 0 means not calculated yet
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [isPromotion, setIsPromotion] = useState(false);
  
  // BO3 Series State
  const [seriesState, setSeriesState] = useState<SeriesState | null>(null);
  const [vetoInProgress, setVetoInProgress] = useState(false);

  // Computed properties
  const isMatchDay = schedule.some(m => !m.isPlayed && new Date(m.date).toDateString() === currentDate.toDateString());
  const unreadCount = messages.filter(m => !m.read).length;

  const handleStartGame = (name: string, country: string) => {
    // 1. Create User Team (ESEA Open Level)
    const newTeam: Team = {
      ...EMPTY_TEAM,
      id: 'my-team',
      name: name,
      league: League.OPEN,
      players: generateRoster(country, 55, 0.5), // Slightly better than avg Open team
      mapStats: {
        'Dust2': 30, 'Mirage': 30, 'Inferno': 30, 'Nuke': 20, 'Train': 20, 'Overpass': 20, 'Ancient': 20
      },
      firstPickMap: undefined, // Needs wizard
      permaban: undefined // Needs wizard
    };

    // 2. Initialize ESEA Open League
    const opponents = TEAMS_BY_LEAGUE[League.OPEN];
    setLeagueOpponents(opponents);
    setMyTeam(newTeam);

    // 3. Generate Schedule (Round Robin - 19 other teams, play 15 random ones)
    const leagueSchedule: ScheduledMatch[] = [];
    const startDate = new Date('2024-01-02');
    const shuffledOpponents = [...opponents].sort(() => 0.5 - Math.random()).slice(0, 15);
    
    shuffledOpponents.forEach((opp, idx) => {
        // Matches every 3-4 days
        const matchDate = new Date(startDate);
        matchDate.setDate(startDate.getDate() + (idx * 4));
        
        leagueSchedule.push({
            id: `lm-${idx}`,
            date: matchDate.toISOString(),
            opponentId: opp.id,
            isPlayed: false,
            type: 'LEAGUE',
            leagueName: League.OPEN
        });
    });

    setSchedule(leagueSchedule);
    setNextOpponent(shuffledOpponents[0]);

    // 4. Welcome Message
    setMessages([
        {
            id: 1,
            subject: 'Welcome to ESEA Open',
            sender: 'League Admin',
            read: false,
            date: '01/01/2024',
            body: `<p>Welcome to <strong>${League.OPEN}</strong>. The season has begun.</p><p>You will play 15 matches. The top 8 teams qualify for the playoffs.</p><p>Good luck!</p>`
        },
        {
            id: 4,
            subject: 'Scouting Report: New Roster',
            sender: 'Head Scout',
            read: false,
            date: '01/01/2024',
            body: `<p>Boss, we've finalized the contracts for the new roster.</p><p>We have a mix of young talent and some raw mechanical skill. I've attached their dossiers below.</p><p>We need to define our map pool strategy immediately.</p>`
        }
    ]);

    setIsGameStarted(true);
    setView(GameView.DASHBOARD);
  };

  const advanceDay = () => {
      // 1. Process Daily Training (Auto or Manual)
      if (myTeam.automationConfig.autoMapTraining) {
           // Basic logic: Train lowest focus map or first pick
           const mapToTrain = myTeam.firstPickMap || 'Mirage';
           // In a real app, this would be smarter. 
           // For now, simulate a small gain in a random skill on that map.
           // Note: We don't trigger the manual train function to avoid UI popups/complexity in background
      }

      // 2. Simulate League Matches for OTHER teams (Flavor)
      const dailyResults: LeagueRoundResult[] = [];
      const gamesTodayCount = Math.floor(Math.random() * 3); // 0-2 random matches elsewhere
      
      for(let i=0; i<gamesTodayCount; i++) {
          const tA = leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)];
          const tB = leagueOpponents[Math.floor(Math.random() * leagueOpponents.length)];
          if (tA.id !== tB.id) {
              // Simple Sim
              const scoreA = Math.floor(Math.random() * 10) + 4; // 4-13 range roughly
              const scoreB = Math.floor(Math.random() * 10) + 4;
              // Force winner
              const finalScoreA = scoreA >= scoreB ? 13 : scoreA;
              const finalScoreB = scoreA >= scoreB ? scoreB : 13;
              
              // Update standings silently (in a real app we'd update state)
              tA.matchesPlayed++; tB.matchesPlayed++;
              if (finalScoreA > finalScoreB) {
                  tA.wins++; tA.leaguePoints += 3; tB.losses++;
              } else {
                  tB.wins++; tB.leaguePoints += 3; tA.losses++;
              }
              tA.roundDifference += (finalScoreA - finalScoreB);
              tB.roundDifference += (finalScoreB - finalScoreA);
              
              dailyResults.push({
                  teamA: tA.name, teamB: tB.name, scoreA: finalScoreA, scoreB: finalScoreB, winner: finalScoreA > finalScoreB ? tA.name : tB.name
              });
          }
      }
      setLatestRoundResults(prev => [...dailyResults, ...prev].slice(0, 10));

      // 3. Update Date
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDate);

      // 4. Reset Daily States
      setDailyActivities({ mapTraining: false, individualDrills: 0 });
      setIsDailyTrainingComplete(false);
      
      // 5. Update Next Opponent based on Schedule
      const futureMatches = schedule.filter(m => !m.isPlayed && new Date(m.date) >= nextDate);
      if (futureMatches.length > 0) {
          const nextMatch = futureMatches[0];
          // Determine opponent (League vs Tournament vs Playoff)
          if (nextMatch.type === 'PLAYOFF') {
              // Find the match in the bracket
              const bracketMatch = playoffBracket.find(pm => pm.id === nextMatch.id);
              if (bracketMatch) {
                   const opponent = bracketMatch.teamA.id === myTeam.id ? bracketMatch.teamB : bracketMatch.teamA;
                   setNextOpponent(opponent);
              }
          } else {
              const opp = leagueOpponents.find(t => t.id === nextMatch.opponentId);
              if (opp) setNextOpponent(opp);
          }
      } else {
          setNextOpponent(null);
          // If no future matches and in Regular season -> End Season Check
          if (seasonPhase === 'REGULAR' && schedule.every(m => m.isPlayed)) {
               handleRegularSeasonEnd();
          }
      }
  };

  const startNewSeason = () => {
      setShowSeasonEnd(false);
      setSeasonPhase('REGULAR');
      setLeagueRank(0);
      setPlayoffBracket([]);
      setIsPromotion(false);
      setLatestRoundResults([]);

      let newLeague = myTeam.league;
      let newOpponents = [...leagueOpponents];

      // Promotion / Relegation Logic
      if (isPromotion) {
           const leagues = Object.values(League);
           const currentIdx = leagues.indexOf(myTeam.league);
           if (currentIdx < leagues.length - 1) {
                const nextLeague = leagues[currentIdx + 1];
                // TS Fix: No need to check TEAMS_BY_LEAGUE[nextLeague] as it is exhaustive for League enum
                newLeague = nextLeague;
                newOpponents = TEAMS_BY_LEAGUE[newLeague];
           }
      }
      
      // Reset Stats for New Season
      const resetMyTeam = { 
          ...myTeam, 
          league: newLeague, 
          wins: 0, losses: 0, matchesPlayed: 0, leaguePoints: 0, roundDifference: 0 
      };
      
      const resetOpponents = newOpponents.map(t => ({
          ...t, wins: 0, losses: 0, matchesPlayed: 0, leaguePoints: 0, roundDifference: 0 
      }));

      setMyTeam(resetMyTeam);
      setLeagueOpponents(resetOpponents);

      // Generate New Schedule
      const leagueSchedule: ScheduledMatch[] = [];
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() + 14); // 2 weeks break
      
      // Shuffle and pick 15
      const shuffledOpponents = [...resetOpponents].sort(() => 0.5 - Math.random()).slice(0, 15);
      shuffledOpponents.forEach((opp, idx) => {
        const matchDate = new Date(startDate);
        matchDate.setDate(startDate.getDate() + (idx * 4));
        leagueSchedule.push({
            id: `lm-${currentDate.getFullYear()}-${idx}`,
            date: matchDate.toISOString(),
            opponentId: opp.id,
            isPlayed: false,
            type: 'LEAGUE',
            leagueName: newLeague
        });
      });
      
      setSchedule(leagueSchedule);
      setNextOpponent(shuffledOpponents[0]);
      setCurrentDate(startDate);
      
      // Inbox Message
      const msgBody = isPromotion 
        ? `<p>Congratulations on the promotion! Welcome to <strong>${newLeague}</strong>.</p><p>Competition will be tougher here. Ensure your strategies are solid.</p>`
        : `<p>A new season in <strong>${newLeague}</strong> begins.</p><p>Let's aim for the playoffs this time. Don't give up.</p>`;

      setMessages(prev => [{
          id: Date.now(),
          subject: `Season Start: ${newLeague}`,
          sender: 'League Admin',
          read: false,
          date: startDate.toLocaleDateString(),
          body: msgBody
      }, ...prev]);

      setView(GameView.DASHBOARD);
  };

  const handleRegularSeasonEnd = () => {
      // Calculate Standings
      const allTeams = [myTeam, ...leagueOpponents].sort((a, b) => {
          if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
          return b.roundDifference - a.roundDifference;
      });

      const myRank = allTeams.findIndex(t => t.id === myTeam.id) + 1;
      setLeagueRank(myRank);

      if (myRank <= 8) {
          // QUALIFIED FOR PLAYOFFS
          setSeasonPhase('PLAYOFFS');
          generatePlayoffBracket(allTeams.slice(0, 8));
          
          setMessages(prev => [{
              id: Date.now(),
              subject: 'Playoff Qualification',
              sender: 'League Admin',
              read: false,
              date: currentDate.toLocaleDateString(),
              body: `<p>Congratulations! You finished <strong>#${myRank}</strong> and qualified for the playoffs.</p><p>Check the bracket in the Competitions tab.</p>`
          }, ...prev]);

          setShowSeasonEnd(true); // Show overlay for qualification
      } else {
          // ELIMINATED
          setShowSeasonEnd(true);
      }
  };

  const generatePlayoffBracket = (top8Teams: Team[]) => {
      // Standard 1v8, 4v5, 3v6, 2v7 seeding
      const seeds = [
          { a: 0, b: 7 }, // 1 vs 8
          { a: 3, b: 4 }, // 4 vs 5
          { a: 2, b: 5 }, // 3 vs 6
          { a: 1, b: 6 }  // 2 vs 7
      ];

      const bracket: PlayoffMatch[] = [];
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() + 3); // Playoffs start in 3 days

      // QUARTER FINALS
      seeds.forEach((pair, idx) => {
          const matchId = `qf-${idx + 1}`;
          bracket.push({
              id: matchId,
              round: 'QF',
              teamA: top8Teams[pair.a],
              teamB: top8Teams[pair.b],
              date: startDate.toISOString(),
              isPlayed: false
          });
      });

      // SEMI FINALS (Placeholders)
      bracket.push({ id: 'sf-1', round: 'SF', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false });
      bracket.push({ id: 'sf-2', round: 'SF', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false });

      // FINAL
      bracket.push({ id: 'f-1', round: 'F', teamA: EMPTY_TEAM, teamB: EMPTY_TEAM, date: '', isPlayed: false });

      setPlayoffBracket(bracket);

      // Schedule the first match for the user
      const userMatch = bracket.find(m => m.teamA.id === myTeam.id || m.teamB.id === myTeam.id);
      if (userMatch) {
          setSchedule([{
              id: userMatch.id,
              date: startDate.toISOString(),
              opponentId: userMatch.teamA.id === myTeam.id ? userMatch.teamB.id : userMatch.teamA.id,
              isPlayed: false,
              type: 'PLAYOFF',
              playoffRound: 'QF'
          }]);
          setNextOpponent(userMatch.teamA.id === myTeam.id ? userMatch.teamB : userMatch.teamA);
      }
  };

  const handleSimToMatch = () => {
      // Simplified: Just advance one day at a time until match day
      const nextMatch = schedule.find(m => !m.isPlayed);
      if (nextMatch) {
          const targetDate = new Date(nextMatch.date);
          // Prevent infinite loops or long sims in this demo
          if (targetDate > currentDate) {
              advanceDay();
          }
      }
  };

  const startMatchSequence = () => {
      if (!nextOpponent) return;

      if (seasonPhase === 'PLAYOFFS') {
          // Initialize BO3 Veto
          setVetoInProgress(true);
          setSeriesState({
              active: true,
              maps: [],
              currentMapIndex: 0,
              scoreUs: 0,
              scoreEnemy: 0
          });
          setView(GameView.MAP_VETO);
      } else {
          // Regular Season BO1 - Simple Random Map for now or pick favorite
          const maps = ['Mirage', 'Inferno', 'Dust2', 'Nuke', 'Ancient', 'Anubis', 'Vertigo'];
          const randomMap = maps[Math.floor(Math.random() * maps.length)];
          setLiveMatchData({
              enemy: nextOpponent,
              mapId: randomMap,
              context: 'League Match',
              fatiguePenalty: 0,
              analysisActive: !!analysis
          });
          setShowMatchTransition(true);
          setTimeout(() => {
              setShowMatchTransition(false);
              setView(GameView.MATCH_LIVE);
          }, 4000);
      }
  };

  const handleVetoComplete = (maps: string[]) => {
      setVetoInProgress(false);
      if (seriesState && nextOpponent) {
          const updatedSeries = { ...seriesState, maps: maps };
          setSeriesState(updatedSeries);
          
          // Start Map 1
          setLiveMatchData({
              enemy: nextOpponent,
              mapId: maps[0],
              context: `Playoff ${updatedSeries.scoreUs}-${updatedSeries.scoreEnemy} (Map 1)`,
              fatiguePenalty: 0,
              analysisActive: !!analysis
          });
          setShowMatchTransition(true);
          setTimeout(() => {
              setShowMatchTransition(false);
              setView(GameView.MATCH_LIVE);
          }, 4000);
      }
  };

  const handleMatchComplete = (result: MatchResult) => {
      // 1. Record Result
      const userWon = result.finalScoreUs > result.finalScoreEnemy;
      
      if (seasonPhase === 'PLAYOFFS' && seriesState) {
          // Handle BO3 Logic
          const newSeriesScoreUs = userWon ? seriesState.scoreUs + 1 : seriesState.scoreUs;
          const newSeriesScoreEnemy = !userWon ? seriesState.scoreEnemy + 1 : seriesState.scoreEnemy;

          if (newSeriesScoreUs === 2 || newSeriesScoreEnemy === 2) {
              // SERIES OVER
              const seriesWon = newSeriesScoreUs === 2;
              setSeriesState(null); // Clear series state
              
              // Find current bracket match
              const currentMatchId = schedule[0].id;
              const bracketIdx = playoffBracket.findIndex(m => m.id === currentMatchId);
              
              if (bracketIdx !== -1) {
                  const currentMatch = playoffBracket[bracketIdx];
                  if (!currentMatch) return;

                  // Explicitly type to avoid TS 'never' inference
                  const tA = currentMatch.teamA as Team;
                  const tB = currentMatch.teamB as Team;

                  const updatedBracket = [...playoffBracket];
                  updatedBracket[bracketIdx] = {
                      ...currentMatch,
                      isPlayed: true,
                      scoreA: tA.id === myTeam.id ? newSeriesScoreUs : newSeriesScoreEnemy,
                      scoreB: tB.id === myTeam.id ? newSeriesScoreUs : newSeriesScoreEnemy,
                      winner: seriesWon ? myTeam : (tA.id === myTeam.id ? tB : tA)
                  };

                  if (seriesWon) {
                      // ADVANCE TO NEXT ROUND
                      const nextRoundMap: Record<string, string> = { 'qf-1': 'sf-1', 'qf-2': 'sf-1', 'qf-3': 'sf-2', 'qf-4': 'sf-2', 'sf-1': 'f-1', 'sf-2': 'f-1' };
                      const nextMatchId = nextRoundMap[currentMatchId];
                      
                      if (nextMatchId) {
                          const nextMatchIdx = updatedBracket.findIndex(m => m.id === nextMatchId);
                          if (nextMatchIdx !== -1) {
                              const nextMatch = updatedBracket[nextMatchIdx];
                              
                              if (currentMatchId === 'qf-1') updatedBracket[nextMatchIdx].teamA = myTeam;
                              if (currentMatchId === 'qf-2') updatedBracket[nextMatchIdx].teamB = myTeam;
                              if (currentMatchId === 'qf-3') updatedBracket[nextMatchIdx].teamA = myTeam;
                              if (currentMatchId === 'qf-4') updatedBracket[nextMatchIdx].teamB = myTeam;
                              
                              if (currentMatchId === 'sf-1') updatedBracket[nextMatchIdx].teamA = myTeam;
                              if (currentMatchId === 'sf-2') updatedBracket[nextMatchIdx].teamB = myTeam;
                              
                              // Schedule next match
                              const nextDate = new Date(currentMatch.date);
                              nextDate.setDate(nextDate.getDate() + 2);
                              
                              setSchedule([{
                                  id: nextMatchId,
                                  date: nextDate.toISOString(),
                                  opponentId: 'temp-id', // TBD
                                  isPlayed: false,
                                  type: 'PLAYOFF',
                                  playoffRound: nextMatch.round
                              }]);
                              setNextOpponent({ ...EMPTY_TEAM, name: 'TBD' });
                          }
                      } else {
                          // WON FINAL
                          setIsPromotion(true);
                          setLeagueRank(1);
                          setShowSeasonEnd(true);
                      }
                  } else {
                      // ELIMINATED FROM PLAYOFFS
                      // Calculate specific rank based on round
                      let finalRank = 0;
                      if (currentMatch.round === 'QF') finalRank = 5; // Top 8 (5th-8th)
                      else if (currentMatch.round === 'SF') finalRank = 3; // Top 4 (3rd-4th)
                      else if (currentMatch.round === 'F') finalRank = 2; // Runner Up
                      
                      setLeagueRank(finalRank);
                      setShowSeasonEnd(true);
                  }
                  
                  setPlayoffBracket(updatedBracket);
              }
          } else {
              // SERIES CONTINUES
              const nextMapIdx = seriesState.currentMapIndex + 1;
              const nextMap = seriesState.maps[nextMapIdx];
              setSeriesState({
                  ...seriesState,
                  currentMapIndex: nextMapIdx,
                  scoreUs: newSeriesScoreUs,
                  scoreEnemy: newSeriesScoreEnemy
              });
              
              setLiveMatchData({
                  enemy: nextOpponent!,
                  mapId: nextMap,
                  context: `Playoff ${newSeriesScoreUs}-${newSeriesScoreEnemy} (Map ${nextMapIdx + 1})`,
                  fatiguePenalty: 0,
                  analysisActive: !!analysis
              });
              setShowMatchTransition(true);
              setTimeout(() => {
                  setShowMatchTransition(false);
                  setView(GameView.MATCH_LIVE);
              }, 4000);
              return; // EXIT HERE so we don't go to Dashboard
          }

      } else {
          // REGULAR SEASON MATCH END
           setMyTeam(prev => ({
              ...prev,
              matchesPlayed: prev.matchesPlayed + 1,
              wins: userWon ? prev.wins + 1 : prev.wins,
              losses: userWon ? prev.losses : prev.losses + 1,
              roundDifference: prev.roundDifference + (result.finalScoreUs - result.finalScoreEnemy),
              leaguePoints: userWon ? prev.leaguePoints + 3 : prev.leaguePoints
          }));
          
          // Mark as played in schedule
          const currentMatchId = schedule.find(m => !m.isPlayed)?.id;
          if (currentMatchId) {
               setSchedule(prev => prev.map(m => m.id === currentMatchId ? { ...m, isPlayed: true } : m));
          }
      }

      setLiveMatchData(null);
      setAnalysis(null);
      setView(GameView.DASHBOARD);
  };

  // ... (Other functions: onTrain, onIndividualTrain, etc. - kept simple)
  
  // Render
  if (!isGameStarted) {
      if (showIntro) return <IntroScreen onComplete={() => setShowIntro(false)} />;
      return <StartScreen onStartGame={handleStartGame} />;
  }

  return (
    <div className="flex h-screen w-full bg-fm-bg text-white font-sans overflow-hidden selection:bg-fm-accent selection:text-white">
      
      {/* MATCH OVERLAY */}
      {view === GameView.MATCH_LIVE && liveMatchData && (
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

      {/* MAP VETO OVERLAY */}
      {view === GameView.MAP_VETO && nextOpponent && (
          <div className="fixed inset-0 z-50 bg-fm-bg">
              <MapVeto 
                userTeam={myTeam} 
                enemyTeam={nextOpponent} 
                onComplete={handleVetoComplete} 
            />
          </div>
      )}

      {/* MATCH TRANSITION OVERLAY */}
      {showMatchTransition && liveMatchData && (
          <MatchTransition 
            userTeam={myTeam} 
            enemyTeam={liveMatchData.enemy} 
            mapName={liveMatchData.mapId} 
            mapImage={MAP_IMAGES[liveMatchData.mapId] || MAP_IMAGES['Mirage']} 
          />
      )}

      {/* SEASON END OVERLAY */}
      {showSeasonEnd && (
          <SeasonEndOverlay 
            rank={leagueRank} 
            isPlayoffQualified={leagueRank <= 8 && seasonPhase === 'REGULAR'} 
            isPromotion={isPromotion}
            seasonPhase={seasonPhase}
            onContinue={startNewSeason} 
            leagueName={myTeam.league}
          />
      )}

      <Sidebar currentView={view} setView={setView} />
      
      <div className="flex-1 flex flex-col min-w-0 bg-fm-bg relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fm-card/30 via-fm-bg to-fm-bg pointer-events-none"></div>
        
        <Header 
            team={myTeam} 
            currentView={view} 
            currentDate={currentDate} 
            onAdvanceDay={advanceDay}
            onSimToMatch={handleSimToMatch}
            isMatchDay={isMatchDay}
            isAnalyzing={isAnalyzing}
            unreadCount={unreadCount}
        />

        <main className="flex-1 overflow-hidden relative z-10">
          {view === GameView.DASHBOARD && (
            <Dashboard 
                team={myTeam} 
                nextScheduledMatch={schedule.find(m => !m.isPlayed)}
                nextOpponent={nextOpponent}
                leagueRank={leagueRank || (leagueOpponents.filter(t => t.leaguePoints > myTeam.leaguePoints).length + 1)}
                leagueOpponents={leagueOpponents}
                onPlayMatch={() => setView(GameView.MATCH_LOBBY)}
                onViewLeague={() => setView(GameView.LEAGUE)}
                isAnalyzing={isAnalyzing}
                messages={messages}
                onMarkMessageRead={(id) => setMessages(prev => prev.map(m => m.id === id ? {...m, read: true} : m))}
            />
          )}

          {view === GameView.MATCH_LOBBY && nextOpponent && (
              <MatchLobby 
                myTeam={myTeam} 
                opponent={nextOpponent} 
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                onAnalyze={async () => {
                    setIsAnalyzing(true);
                    const result = await analyzeMatchup(myTeam, nextOpponent);
                    setAnalysis(result);
                    setIsAnalyzing(false);
                    setMyTeam(prev => ({ ...prev, budget: prev.budget - 1500 }));
                }}
                onStartMatch={startMatchSequence}
                onSetTactic={(t) => setMyTeam(prev => ({...prev, preferredTactic: t}))}
                isMatchDay={isMatchDay}
                matchDate={schedule.find(m => !m.isPlayed)?.date}
                onDevSim={(result) => {
                    handleMatchComplete({
                        enemyTeamName: nextOpponent.name,
                        finalScoreUs: result === 'win' ? 13 : 5,
                        finalScoreEnemy: result === 'win' ? 5 : 13,
                        logs: [],
                        mvpAlias: myTeam.players[0].alias,
                        earnings: 0,
                        summary: 'Dev Sim',
                        playerStatsUs: [],
                        playerStatsEnemy: [],
                        isPlayoff: seasonPhase === 'PLAYOFFS'
                    });
                }}
              />
          )}
          
          {view === GameView.PRACTICE && (
              <PracticeView 
                team={myTeam} 
                schedule={schedule}
                currentDate={currentDate}
                dailyActivities={dailyActivities}
                isDailyTrainingComplete={isDailyTrainingComplete}
                onTrain={(mapId, skill) => {
                    if (dailyActivities.mapTraining) return;
                    setDailyActivities(prev => ({...prev, mapTraining: true}));
                    // Logic to update team stats would go here
                    // For demo, we just toggle the daily activity state
                }}
                onIndividualTrain={(pid, drill) => {
                    if (dailyActivities.individualDrills >= 3) return;
                    setDailyActivities(prev => ({...prev, individualDrills: prev.individualDrills + 1}));
                }}
                onUpdateSchedule={(idx, intensity) => {
                    const newSched = [...myTeam.weeklySchedule];
                    newSched[idx] = intensity;
                    setMyTeam(prev => ({...prev, weeklySchedule: newSched}));
                }}
                onSetupComplete={(permaban, firstPick, focus) => {
                    setMyTeam(prev => ({
                        ...prev,
                        permaban,
                        firstPickMap: firstPick,
                        isMapPoolInitialized: true
                    }));
                }}
                onHireCoach={(type) => {
                    const newCoach: Coach = {
                        id: `c-${Date.now()}`,
                        name: 'New Coach',
                        type,
                        focus: 'BALANCED'
                    };
                    setMyTeam(prev => ({...prev, coaches: [...prev.coaches, newCoach]}));
                }}
                onAssignCoach={(cid, pid) => {
                    setMyTeam(prev => ({
                        ...prev,
                        coaches: prev.coaches.map(c => c.id === cid ? { ...c, assignedPlayerId: pid } : c)
                    }));
                }}
                onToggleAutomation={(key) => {
                    setMyTeam(prev => ({
                        ...prev,
                        automationConfig: { ...prev.automationConfig, [key]: !prev.automationConfig[key] }
                    }));
                }}
                onCoachFocusChange={(cid, focus) => {
                    setMyTeam(prev => ({
                        ...prev,
                        coaches: prev.coaches.map(c => c.id === cid ? { ...c, focus } : c)
                    }));
                }}
              />
          )}

          {view === GameView.LEAGUE && (
              <LeagueView 
                myTeam={myTeam} 
                opponents={leagueOpponents} 
                roundResults={latestRoundResults}
                seasonPhase={seasonPhase}
                playoffBracket={playoffBracket}
                onNextSeason={seasonPhase === 'PLAYOFFS' && (isPromotion || playoffBracket.some(m => m.round === 'F' && m.isPlayed)) ? startNewSeason : undefined}
              />
          )}

          {view === GameView.SCHEDULE && (
              <ScheduleView 
                tournaments={tournaments} 
                currentDate={currentDate} 
                team={myTeam} 
                schedule={schedule}
                onQualify={() => {}} 
              />
          )}

          {view === GameView.MARKET && (
              <MarketView 
                budget={myTeam.budget} 
                onHire={() => {}} 
                currentRosterCount={myTeam.players.length} 
              />
          )}

          {view === GameView.RANKINGS && (
              <RankingsView />
          )}

        </main>
      </div>
    </div>
  );
}
