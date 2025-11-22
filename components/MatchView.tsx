import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats, KillEvent, Tactic } from '../types';
import { Trophy, XCircle, FastForward, Pause, User, Brain, CheckCircle2, UserX } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { RoundState, simulateRound } from '../services/geminiService';

interface MatchViewProps {
  playerTeam: Team;
  enemyTeam: Team;
  mapId: string;
  context: string;
  onComplete: (result: MatchResult) => void;
  fatiguePenalty?: number;
}

const WEAPON_IMAGES: Record<string, string> = {
    'ak47': 'https://www.hltv.org/img/static/scoreboard/weapons/ak47.png',
    'm4a1': 'https://www.hltv.org/img/static/scoreboard/weapons/m4a1.png',
    'm4a4': 'https://www.hltv.org/img/static/scoreboard/weapons/m4a1.png', 
    'awp': 'https://www.hltv.org/img/static/scoreboard/weapons/awp.png',
    'deagle': 'https://www.hltv.org/img/static/scoreboard/weapons/deagle.png',
    'usp': 'https://www.hltv.org/img/static/scoreboard/weapons/usp_silencer.png',
    'hkp2000': 'https://www.hltv.org/img/static/scoreboard/weapons/hkp2000.png',
    'glock': 'https://www.hltv.org/img/static/scoreboard/weapons/glock.png',
    'galilar': 'https://www.hltv.org/img/static/scoreboard/weapons/galilar.png',
    'tec9': 'https://www.hltv.org/img/static/scoreboard/weapons/tec9.png',
    'elite': 'https://www.hltv.org/img/static/scoreboard/weapons/elite.png',
    'p250': 'https://www.hltv.org/img/static/scoreboard/weapons/p250.png',
    'fiveseven': 'https://www.hltv.org/img/static/scoreboard/weapons/fiveseven.png',
    'mp9': 'https://www.hltv.org/img/static/scoreboard/weapons/mp9.png',
    'mac10': 'https://www.hltv.org/img/static/scoreboard/weapons/mac10.png',
    'famas': 'https://www.hltv.org/img/static/scoreboard/weapons/famas.png',
    'ssg08': 'https://www.hltv.org/img/static/scoreboard/weapons/ssg08.png',
    'xm1014': 'https://www.hltv.org/img/static/scoreboard/weapons/xm1014.png',
    'hegrenade': 'https://www.hltv.org/img/static/scoreboard/weapons/hegrenade.png',
    'inferno': 'https://www.hltv.org/img/static/scoreboard/weapons/molotov.png',
    'knife': 'https://www.hltv.org/img/static/scoreboard/weapons/knife.png',
};

const ICONS = {
    headshot: 'https://www.hltv.org/img/static/scoreboard/weapons/headshot.png',
    smoke: 'https://www.hltv.org/img/static/scoreboard/weapons/through_smoke.png'
};

const KillFeedItem: React.FC<{ event: KillEvent, playerTeam: Team }> = ({ event, playerTeam }) => {
  if (!event || !event.killer) return null;
  const getTeamColor = (side: 'CT' | 'T') => side === 'CT' ? 'text-ct-blue' : 'text-t-red';
  const killerColor = getTeamColor(event.killerSide);
  const victimColor = getTeamColor(event.killerSide === 'CT' ? 'T' : 'CT'); 
  const weaponUrl = WEAPON_IMAGES[event.weapon] || WEAPON_IMAGES['ak47']; 

  return (
      <div className="flex items-center justify-center py-1.5 hover:bg-black/20 transition-colors rounded px-2 w-full max-w-3xl mx-auto border-b border-white/5 last:border-0 animate-fade-in">
          <div className={`flex-1 text-right font-bold text-sm sm:text-base truncate ${killerColor}`}>
              {event.killer}
          </div>
          <div className="flex items-center justify-center gap-2 mx-4 w-32 shrink-0">
               <img src={weaponUrl} alt={event.weapon} className="h-6 drop-shadow-md filter grayscale-[0.2]" />
               {event.isHeadshot && <img src={ICONS.headshot} alt="HS" className="h-5" />}
          </div>
          <div className={`flex-1 text-left font-bold text-sm sm:text-base truncate ${victimColor}`}>
              {event.victim}
          </div>
      </div>
  );
};

const StatRow: React.FC<{ stats: PlayerMatchStats, isMvp: boolean }> = ({ stats, isMvp }) => {
  const kdDiff = stats.kills - stats.deaths;
  return (
    <tr className="border-b border-fm-border hover:bg-fm-card-hover text-sm transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
           <CountryFlag countryCode={stats.country} />
           <span className={`font-bold ${isMvp ? 'text-fm-accent' : 'text-white'}`}>
              {stats.alias}
              {isMvp && <Trophy size={12} className="inline ml-1" />}
           </span>
        </div>
      </td>
      <td className="py-2 px-3 text-center text-fm-muted">{stats.kills}-{stats.deaths}</td>
      <td className={`py-2 px-3 text-center font-mono ${kdDiff > 0 ? 'text-fm-green' : kdDiff < 0 ? 'text-fm-red' : 'text-fm-muted'}`}>
         {kdDiff > 0 ? '+' : ''}{kdDiff}
      </td>
      <td className="py-2 px-3 text-center text-fm-muted hidden sm:table-cell">{stats.adr.toFixed(1)}</td>
      <td className={`py-2 px-3 text-center font-bold ${stats.rating >= 1.1 ? 'text-fm-green' : 'text-fm-muted'}`}>
         {stats.rating.toFixed(2)}
      </td>
    </tr>
  );
};

export const MatchView: React.FC<MatchViewProps> = ({ playerTeam, enemyTeam, mapId, context, onComplete, fatiguePenalty = 0 }) => {
  // --- SIMULATION STATE ---
  const [roundNum, setRoundNum] = useState(1);
  const [simState, setSimState] = useState<RoundState>({
    moneyUs: 4000, moneyEnemy: 4000,
    lossStreakUs: 0, lossStreakEnemy: 0,
    scoreUs: 0, scoreEnemy: 0,
    logs: [],
    survivingCountUs: 0,
    survivingCountEnemy: 0,
    previousBuyUs: 'ECO',
    previousBuyEnemy: 'ECO'
  });

  // --- TACTICAL STATE ---
  const [tacticalPauses, setTacticalPauses] = useState(3);
  const [currentTactic, setCurrentTactic] = useState<Tactic>(playerTeam.preferredTactic || Tactic.DEFAULT);
  const [isPaused, setIsPaused] = useState(false);
  const [enemyHistory, setEnemyHistory] = useState<Tactic[]>([]);
  const [lastRoundEnemyTactic, setLastRoundEnemyTactic] = useState<Tactic | null>(null);

  // --- VIEW STATE ---
  const [displayedLogs, setDisplayedLogs] = useState<KillEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [isSkipping, setIsSkipping] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'scoreboard'>('feed');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);

  const [finalResult, setFinalResult] = useState<MatchResult | null>(null);

  const getWinThreshold = (scoreA: number, scoreB: number) => {
      let target = 13;
      while (scoreA >= target - 1 && scoreB >= target - 1) {
          target += 3;
      }
      return target;
  };

  const getTeamSide = (r: number) => {
      if (r <= 12) return 'CT';
      if (r <= 24) return 'T';
      const otRound = r - 24;
      return Math.ceil(otRound / 3) % 2 === 1 ? 'CT' : 'T';
  };

  useEffect(() => {
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) {
        if (timerRef.current) clearTimeout(timerRef.current);
        finishMatch();
    }
  }, [simState.scoreUs, simState.scoreEnemy]);

  useEffect(() => {
    if (!isSimulating || isPaused || isSkipping) return;
    if (finalResult) return;

    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    timerRef.current = setTimeout(() => {
        if (!isAnimatingRef.current) {
            runRound(winThreshold);
        }
    }, 3000); 

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roundNum, isSimulating, finalResult, isPaused, isSkipping]); 

  const getRandomEnemyTactic = (prevTactic?: Tactic): Tactic => {
      if (prevTactic && Math.random() > 0.3) return prevTactic;
      const tactics = [Tactic.DEFAULT, Tactic.AGGRESSIVE, Tactic.PASSIVE];
      return tactics[Math.floor(Math.random() * tactics.length)];
  }

  const runRound = (winThreshold: number) => {
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    isAnimatingRef.current = true;

    const currentLogs = [...simState.logs];
    const stateCopy = { ...simState, logs: currentLogs };

    if (roundNum === 13) {
        stateCopy.moneyUs = 4000; stateCopy.moneyEnemy = 4000;
        stateCopy.lossStreakUs = 0; stateCopy.lossStreakEnemy = 0;
        stateCopy.survivingCountUs = 0; stateCopy.survivingCountEnemy = 0;
        stateCopy.previousBuyUs = 'ECO'; stateCopy.previousBuyEnemy = 'ECO';
    }

    if (roundNum >= 25 && (roundNum - 25) % 3 === 0) {
        stateCopy.moneyUs = 10000; stateCopy.moneyEnemy = 10000;
        stateCopy.lossStreakUs = 0; stateCopy.lossStreakEnemy = 0;
        stateCopy.survivingCountUs = 0; stateCopy.survivingCountEnemy = 0;
        stateCopy.previousBuyUs = 'ECO'; stateCopy.previousBuyEnemy = 'ECO';
    }

    const prevEnemyTactic = enemyHistory.length > 0 ? enemyHistory[enemyHistory.length - 1] : undefined;
    const enemyTactic = getRandomEnemyTactic(prevEnemyTactic);
    
    setLastRoundEnemyTactic(enemyTactic);
    setEnemyHistory(prev => [...prev, enemyTactic]);

    const events = simulateRound(roundNum, stateCopy, playerTeam, enemyTeam, mapId, 0, fatiguePenalty, currentTactic, enemyTactic);
    
    const newLog: MatchLog = {
        roundNumber: roundNum,
        winner: stateCopy.scoreUs > simState.scoreUs ? 'us' : 'enemy',
        description: stateCopy.scoreUs > simState.scoreUs ? `Round Won by ${playerTeam.name}` : `Round Won by ${enemyTeam.name}`,
        scoreUs: stateCopy.scoreUs,
        scoreEnemy: stateCopy.scoreEnemy,
        events: events,
        moneyUs: stateCopy.moneyUs, 
        moneyEnemy: stateCopy.moneyEnemy
    };

    const nextState = { ...stateCopy, logs: [...currentLogs, newLog] };
    
    if (isSkipping) {
        setSimState(nextState);
        setRoundNum(prev => prev + 1);
        isAnimatingRef.current = false;
    } else {
        playRoundEvents(events, newLog, nextState);
    }
  };

  const handleSkipMatch = () => {
      setIsSkipping(true);
      setIsPaused(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      setDisplayedLogs([]);
  };

  useEffect(() => {
      if (isSkipping && !finalResult) {
          const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
          if (simState.scoreUs < winThreshold && simState.scoreEnemy < winThreshold) {
              runRound(winThreshold);
          } else {
              finishMatch();
          }
      }
  }, [isSkipping, simState.scoreUs, simState.scoreEnemy, roundNum]);

  const playRoundEvents = (events: KillEvent[], log: MatchLog, nextState: RoundState) => {
    setDisplayedLogs([]);
    let eventIdx = 0;
    
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);

    playbackIntervalRef.current = setInterval(() => {
        if (eventIdx < events.length) {
            setDisplayedLogs(prev => [...prev, events[eventIdx]]);
            eventIdx++;
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
            setSimState(nextState);
            setTimeout(() => {
                isAnimatingRef.current = false;
                setRoundNum(prev => prev + 1);
            }, 1500);
        }
    }, 600);
  };

  const finishMatch = (finalState?: RoundState) => {
    if (finalResult) return;
    const stateToUse = finalState || simState;
    setIsSimulating(false);
    setIsSkipping(false);
    
    const playerStatsUs: PlayerMatchStats[] = playerTeam.players.map(p => ({
        alias: p.alias, country: p.country, kills: 0, deaths: 0, assists: 0, adr: 0, kast: 0, rating: 0
    }));
    const playerStatsEnemy: PlayerMatchStats[] = enemyTeam.players.map(p => ({
        alias: p.alias, country: p.country, kills: 0, deaths: 0, assists: 0, adr: 0, kast: 0, rating: 0
    }));

    const processStats = (teamStats: PlayerMatchStats[], alias: string, type: 'kill' | 'death') => {
        const p = teamStats.find(s => s.alias === alias);
        if (p) {
            if (type === 'kill') p.kills++;
            else p.deaths++;
        }
    };

    stateToUse.logs.forEach(log => {
        log.events.forEach(ev => {
            if (playerStatsUs.find(p => p.alias === ev.killer)) processStats(playerStatsUs, ev.killer, 'kill');
            else processStats(playerStatsEnemy, ev.killer, 'kill');

            if (playerStatsUs.find(p => p.alias === ev.victim)) processStats(playerStatsUs, ev.victim, 'death');
            else processStats(playerStatsEnemy, ev.victim, 'death');
        });
    });

    const calculateRating = (stats: PlayerMatchStats[], rounds: number) => {
        stats.forEach(s => {
            s.adr = (s.kills * 85) / (rounds || 1);
            const kpr = s.kills / (rounds || 1);
            const dpr = s.deaths / (rounds || 1);
            const impact = kpr * 2.1;
            s.rating = (kpr * 0.7) + (impact * 0.3) + ((1-dpr) * 0.5);
        });
    };

    const totalRounds = stateToUse.scoreUs + stateToUse.scoreEnemy;
    calculateRating(playerStatsUs, totalRounds);
    calculateRating(playerStatsEnemy, totalRounds);

    const allPlayers = [...playerStatsUs, ...playerStatsEnemy];
    const mvp = allPlayers.length > 0 ? allPlayers.reduce((prev, current) => (prev.rating > current.rating) ? prev : current) : playerStatsUs[0];
    const isWin = stateToUse.scoreUs > stateToUse.scoreEnemy;

    const result: MatchResult = {
        enemyTeamName: enemyTeam.name,
        finalScoreUs: stateToUse.scoreUs,
        finalScoreEnemy: stateToUse.scoreEnemy,
        logs: stateToUse.logs,
        mvpAlias: mvp?.alias || 'Unknown',
        earnings: isWin ? 12500 : 4500,
        summary: isWin ? "Victory achieved." : "Defeat.",
        playerStatsUs,
        playerStatsEnemy,
        mapPlayed: mapId
    };

    setFinalResult(result);
    setViewMode('scoreboard');
  };

  const getCoachAnalysis = () => {
      if (enemyHistory.length < 3) return { trend: 'ANALYZING...', color: 'text-gray-500', advice: 'Wait for more data.' };
      
      const recent = enemyHistory.slice(-5);
      const aggCount = recent.filter(t => t === Tactic.AGGRESSIVE).length;
      const passCount = recent.filter(t => t === Tactic.PASSIVE).length;
      
      if (aggCount >= 3) return { trend: 'FAST / AGGRESSIVE', color: 'text-fm-red', advice: 'Play PASSIVE to hold their rush.' };
      if (passCount >= 3) return { trend: 'SLOW / PASSIVE', color: 'text-blue-400', advice: 'Play AGGRESSIVE to take map control.' };
      return { trend: 'BALANCED / DEFAULT', color: 'text-fm-yellow', advice: 'Play PASSIVE or DEFAULT.' };
  };

  const coachData = getCoachAnalysis();
  const playerSide = getTeamSide(roundNum);
  const enemySide = playerSide === 'CT' ? 'T' : 'CT';

  const handleTacticalPause = () => {
      if (tacticalPauses > 0 && !isSkipping && isSimulating) {
          setIsPaused(true);
      }
  };

  const applyTacticalChange = (newTactic: Tactic) => {
      setCurrentTactic(newTactic);
      setTacticalPauses(prev => prev - 1);
      setIsPaused(false);
      isAnimatingRef.current = false; 
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-fm-bg font-sans relative">
      
      {/* HEADER */}
      <div className="bg-fm-card p-4 border-b border-fm-border flex justify-center items-center shadow-lg z-20 shrink-0 relative">
        <div className="flex-1 flex justify-end items-center gap-4 pr-6 text-right">
           <div className={`text-2xl font-black tracking-tight truncate drop-shadow-md ${playerSide === 'CT' ? 'text-ct-blue' : 'text-t-red'}`}>
               {playerTeam.name}
           </div>
        </div>
        
        <div className="flex-none flex items-center gap-6 bg-black/50 px-10 py-3 rounded-xl border border-white/5 shadow-inner mx-4 relative">
          {fatiguePenalty > 0 && (
             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fm-red text-white text-[8px] px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap shadow-sm z-30 animate-pulse">
                -{fatiguePenalty * 100}% FATIGUE PENALTY
             </div>
          )}
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreUs > simState.scoreEnemy ? 'text-fm-green' : 'text-white'}`}>{simState.scoreUs}</div>
          <div className="text-gray-600 font-thin text-4xl opacity-50">:</div>
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreEnemy > simState.scoreUs ? 'text-fm-red' : 'text-white'}`}>{simState.scoreEnemy}</div>
        </div>

        <div className="flex-1 flex justify-start items-center gap-4 pl-6 text-left">
           <div className={`text-2xl font-black tracking-tight truncate drop-shadow-md ${enemySide === 'CT' ? 'text-ct-blue' : 'text-t-red'}`}>
               {enemyTeam.name}
           </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 overflow-hidden relative bg-fm-bg flex">
        
        {viewMode === 'feed' && (
            <div className="flex-1 flex flex-col w-full relative">
                {/* Round Info */}
                <div className="sticky top-0 z-10 flex justify-center pt-4 pb-2 bg-gradient-to-b from-fm-bg to-transparent shrink-0">
                    <div className="flex flex-col items-center w-full">
                        <div className={`bg-fm-card border ${roundNum > 24 ? 'border-fm-red text-fm-red' : 'border-fm-border text-gray-300'} px-8 py-1 rounded-full text-lg font-bold uppercase tracking-widest mb-1 shadow-lg`}>
                            Round {roundNum} {roundNum > 24 && " (OT)"}
                        </div>
                        <div className="flex gap-4">
                            <div className="text-fm-muted text-xs font-mono uppercase tracking-widest">
                                {roundNum <= 12 ? "1st Half" : roundNum <= 24 ? "2nd Half" : "Overtime"}
                            </div>
                            {lastRoundEnemyTactic && (
                                 <div className="text-xs font-mono uppercase tracking-widest text-gray-600 flex items-center gap-1">
                                     Last Enemy: {lastRoundEnemyTactic}
                                 </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Logs */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth px-4 pb-44">
                    <div className="flex flex-col justify-start items-center w-full max-w-4xl mx-auto pt-4 space-y-1">
                        {displayedLogs.map((event, i) => (
                            <KillFeedItem key={i} event={event} playerTeam={playerTeam} />
                        ))}
                        {displayedLogs.length === 0 && isSimulating && (
                             <div className="text-center text-fm-muted uppercase font-bold tracking-widest mt-10 animate-pulse">
                                {isAnimatingRef.current ? "LIVE" : isPaused ? "PAUSED - TACTICAL TIMEOUT" : "PREPARING ROUND..."}
                            </div>
                        )}
                    </div>
                </div>

                {/* TACTICAL OVERLAY (Bottom) */}
                <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-fm-bg via-fm-bg/95 to-transparent pointer-events-none z-20 flex items-end justify-between">
                     {/* COACH WIDGET (Left) */}
                     <div className="bg-fm-card border border-fm-border rounded-xl p-4 shadow-2xl pointer-events-auto w-64">
                         <div className="flex items-center gap-2 mb-2 border-b border-fm-border pb-2">
                             <User className="text-fm-accent" size={16} />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-white">Assistant Coach</span>
                         </div>
                         <div className="text-[10px] font-bold text-fm-muted uppercase mb-1">Recent Enemy Trend</div>
                         <div className={`font-black text-lg leading-tight ${coachData.color} mb-2`}>
                             {coachData.trend}
                         </div>
                         <div className="bg-fm-bg p-2 rounded border border-fm-border">
                             <div className="flex items-start gap-2">
                                 <Brain size={14} className="text-fm-green mt-0.5" />
                                 <div>
                                     <span className="text-[9px] font-bold text-gray-400 block">ADVICE</span>
                                     <span className="text-xs font-bold text-white">{coachData.advice}</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* CONTROLS (Center/Right) */}
                     <div className="flex items-center gap-4 pointer-events-auto">
                         <div className="bg-fm-card border border-fm-border px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 shadow-lg">
                             <span className="text-fm-muted text-[10px] uppercase">Current:</span>
                             <span className="text-fm-accent uppercase">{currentTactic}</span>
                         </div>

                         <button 
                            onClick={handleTacticalPause}
                            disabled={tacticalPauses <= 0 || isSkipping}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-widest transition-all shadow-lg border
                             ${tacticalPauses > 0 
                                ? 'bg-fm-card hover:bg-fm-accent text-white border-fm-border hover:border-fm-accent' 
                                : 'bg-fm-bg text-fm-muted border-fm-border cursor-not-allowed'}`}
                         >
                             <Pause size={18} className="fill-current" />
                             Tactical Pause
                             <span className="ml-2 bg-black/30 px-2 py-0.5 rounded text-[10px]">{tacticalPauses} Left</span>
                         </button>

                         <button 
                             onClick={handleSkipMatch}
                             disabled={isSkipping}
                             className="bg-fm-card hover:bg-fm-card-hover text-white p-3 rounded-full border border-fm-border transition-all shadow-lg"
                             title="Skip Match"
                         >
                             <FastForward size={20} className={isSkipping ? "animate-pulse text-fm-accent" : ""} />
                         </button>
                     </div>
                </div>

                {/* TACTICAL PAUSE MODAL */}
                {isPaused && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                        <div className="bg-fm-card border border-fm-accent rounded-xl shadow-[0_0_50px_rgba(217,70,239,0.3)] p-8 max-w-2xl w-full mx-4">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-fm-accent/20 text-fm-accent px-4 py-1 rounded-full border border-fm-accent/50 mb-4">
                                    <Pause size={16} /> TACTICAL TIMEOUT
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Adjust Strategy</h2>
                                <p className="text-fm-muted mt-2">Select a new approach to counter {enemyTeam.name}.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {[Tactic.AGGRESSIVE, Tactic.DEFAULT, Tactic.PASSIVE].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => applyTacticalChange(t)}
                                        className={`p-4 rounded-lg border-2 transition-all text-left relative overflow-hidden group
                                            ${currentTactic === t 
                                                ? 'bg-fm-accent border-fm-accent text-white' 
                                                : 'bg-fm-bg border-fm-border text-fm-muted hover:border-fm-muted hover:bg-fm-card-hover'}`}
                                    >
                                        <div className="font-black uppercase text-lg mb-1">{t}</div>
                                        <div className={`text-[10px] ${currentTactic === t ? 'text-white/80' : 'text-gray-500'}`}>
                                            {t === Tactic.AGGRESSIVE && "High Pace. Counters Passive."}
                                            {t === Tactic.PASSIVE && "Slow Pace. Counters Aggressive."}
                                            {t === Tactic.DEFAULT && "Balanced. Counters Passive?"}
                                        </div>
                                        {currentTactic === t && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={() => setIsPaused(false)}
                                    className="text-fm-muted hover:text-white text-sm font-bold uppercase tracking-widest"
                                >
                                    Cancel & Resume
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {viewMode === 'scoreboard' && (
            <div className="h-full w-full overflow-y-auto p-6 animate-fade-in bg-fm-bg">
                 {!isSimulating && (
                    <div className="text-center mb-8">
                        {simState.scoreUs > simState.scoreEnemy ? (
                             <div className="text-fm-accent flex flex-col items-center gap-2 animate-bounce-in">
                                 <Trophy size={64} className="drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" />
                                 <h1 className="text-5xl font-black uppercase tracking-widest text-white drop-shadow-lg">Victory</h1>
                             </div>
                        ) : (
                            <div className="text-fm-muted flex flex-col items-center gap-2">
                                <XCircle size={64} />
                                <h1 className="text-5xl font-black uppercase tracking-widest text-gray-500">Defeat</h1>
                            </div>
                        )}
                        <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto">{simState.scoreUs > simState.scoreEnemy ? 'Victory achieved.' : 'Defeat.'}</p>
                        <div className="text-fm-green font-mono font-bold text-xl mt-2 border border-fm-green/50 bg-fm-green/10 inline-block px-6 py-2 rounded-full">
                            Earnings: +${(simState.scoreUs > simState.scoreEnemy ? 12500 : 4500).toLocaleString()}
                        </div>
                    </div>
                )}
                 {finalResult && (
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                         <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-xl">
                            <div className="bg-fm-card-hover p-3 border-b border-fm-border flex justify-between items-center">
                                <h3 className="font-bold text-white uppercase tracking-wide">{playerTeam.name}</h3>
                            </div>
                            <table className="w-full">
                                <thead className="bg-fm-bg text-[10px] text-fm-muted uppercase font-bold">
                                    <tr>
                                        <th className="py-2 px-3 text-left">Player</th>
                                        <th className="py-2 px-3 text-center">K-D</th>
                                        <th className="py-2 px-3 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalResult.playerStatsUs.sort((a,b) => b.kills - a.kills).map(stats => (
                                        <StatRow key={stats.alias} stats={stats} isMvp={finalResult.mvpAlias === stats.alias} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                         <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-xl">
                            <div className="bg-fm-card-hover p-3 border-b border-fm-border flex justify-between items-center">
                                <h3 className="font-bold text-fm-red uppercase tracking-wide">{enemyTeam.name}</h3>
                            </div>
                             <table className="w-full">
                                <thead className="bg-fm-bg text-[10px] text-fm-muted uppercase font-bold">
                                    <tr>
                                        <th className="py-2 px-3 text-left">Player</th>
                                        <th className="py-2 px-3 text-center">K-D</th>
                                        <th className="py-2 px-3 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalResult.playerStatsEnemy.sort((a,b) => b.kills - a.kills).map(stats => (
                                        <StatRow key={stats.alias} stats={stats} isMvp={finalResult.mvpAlias === stats.alias} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 )}

                <div className="text-center pb-12">
                    <button 
                    onClick={() => {
                         if (finalResult) {
                             onComplete(finalResult);
                         }
                    }}
                    className="bg-fm-accent hover:bg-fm-accent-hover text-white font-black uppercase px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all hover:scale-105 text-lg tracking-widest"
                >
                    Continue Season
                </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};