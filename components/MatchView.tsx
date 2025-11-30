import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats, KillEvent, Tactic } from '../types';
import { Trophy, XCircle, FastForward, Pause, User, Brain, CheckCircle2, Shield, Crosshair } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { RoundState, simulateRound } from '../services/geminiService';

interface MatchViewProps {
  playerTeam: Team;
  enemyTeam: Team;
  mapId: string;
  context: string;
  onComplete: (result: MatchResult) => void;
  fatiguePenalty?: number;
  analysisActive?: boolean; 
}

// Maps MapID to image URL
const MAP_IMAGES: Record<string, string> = {
    'Dust2': 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png',
    'Mirage': 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png',
    'Inferno': 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png',
    'Nuke': 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png',
    'Train': 'https://www.hltv.org/img/static/statsmatchmaps/train.png',
    'Overpass': 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png',
    'Ancient': 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png'
};

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

const KillFeedItem: React.FC<{ event: KillEvent }> = ({ event }) => {
  if (!event || !event.killer) return null;
  const getTeamColor = (side: 'CT' | 'T') => side === 'CT' ? 'text-ct-blue drop-shadow-sm' : 'text-t-red drop-shadow-sm';
  const killerColor = getTeamColor(event.killerSide);
  const victimColor = getTeamColor(event.killerSide === 'CT' ? 'T' : 'CT'); 
  const weaponUrl = WEAPON_IMAGES[event.weapon] || WEAPON_IMAGES['ak47']; 

  return (
      <div className="flex items-center justify-center py-2 px-4 w-full animate-fade-in-up bg-black/40 backdrop-blur-sm border border-white/5 rounded-lg mb-2 shadow-lg">
          <div className={`flex-1 text-right font-black text-lg truncate ${killerColor} drop-shadow-md tracking-tight`}>
              {event.killer}
          </div>
          <div className="flex items-center justify-center gap-3 mx-4 w-32 shrink-0">
               <img src={weaponUrl} alt={event.weapon} className="h-6 drop-shadow-md filter grayscale-[0.2]" />
               {event.isHeadshot && <img src={ICONS.headshot} alt="HS" className="h-5" />}
          </div>
          <div className={`flex-1 text-left font-black text-lg truncate ${victimColor} drop-shadow-md tracking-tight`}>
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

export const MatchView: React.FC<MatchViewProps> = ({ playerTeam, enemyTeam, mapId, context, onComplete, fatiguePenalty = 0, analysisActive = false }) => {
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
  
  // Strict Concurrency Refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);
  const isProcessingRef = useRef(false);

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

  // Check for Match End
  useEffect(() => {
    if (finalResult) return;
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) {
        if (timerRef.current) clearTimeout(timerRef.current);
        finishMatch();
    }
  }, [simState.scoreUs, simState.scoreEnemy, finalResult]);

  // Main Game Loop
  useEffect(() => {
    if (!isSimulating || isPaused || isSkipping || finalResult) return;

    // Check if match is already over
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    // Strict lock to prevent double execution
    if (isProcessingRef.current || isAnimatingRef.current) return;

    timerRef.current = setTimeout(() => {
        // Double check locks before running
        if (!isProcessingRef.current && !isAnimatingRef.current) {
            runRound(winThreshold);
        }
    }, 600); 

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

    isProcessingRef.current = true;
    isAnimatingRef.current = true;

    const currentLogs = [...simState.logs];
    const stateCopy = { ...simState, logs: currentLogs };

    // HALFTIME ECONOMY RESET
    if (roundNum === 13) {
        stateCopy.moneyUs = 4000; stateCopy.moneyEnemy = 4000;
        stateCopy.lossStreakUs = 0; stateCopy.lossStreakEnemy = 0;
        stateCopy.survivingCountUs = 0; stateCopy.survivingCountEnemy = 0;
        stateCopy.previousBuyUs = 'ECO'; stateCopy.previousBuyEnemy = 'ECO';
    }

    // OVERTIME ECONOMY RESET
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

    const events = simulateRound(roundNum, stateCopy, playerTeam, enemyTeam, mapId, 0, fatiguePenalty, currentTactic, enemyTactic, analysisActive);
    
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
        isProcessingRef.current = false;
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
      isAnimatingRef.current = false;
      isProcessingRef.current = false;
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
                isProcessingRef.current = false;
                setRoundNum(prev => prev + 1);
            }, 1800);
        }
    }, 120); 
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
      isProcessingRef.current = false;
  };

  const bgImage = MAP_IMAGES[mapId] || MAP_IMAGES['Mirage'];

  return (
    <div className="fixed inset-0 z-50 bg-fm-bg font-sans flex flex-col overflow-hidden text-white">
      {/* Background with Blur */}
      <div className="absolute inset-0 bg-cover bg-center z-0 scale-105" style={{ backgroundImage: `url(${bgImage})`, filter: 'blur(8px) brightness(0.4)' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0"></div>

      {/* HEADER / SCOREBOARD */}
      <div className="relative z-20 w-full pt-8 pb-4 flex flex-col items-center">
         <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 grid grid-cols-3 items-center w-full max-w-6xl shadow-2xl">
             {/* LEFT TEAM */}
             <div className="text-right pr-6 justify-self-end w-full">
                 <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${playerSide === 'CT' ? 'text-ct-blue' : 'text-t-red'} drop-shadow-lg truncate`}>
                     {playerTeam.name}
                 </h2>
                 <div className="flex items-center justify-end gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
                     <span>Rank #{playerTeam.rankingPoints}</span>
                     {fatiguePenalty > 0 && <span className="bg-red-500/20 text-red-400 px-1 rounded animate-pulse">FATIGUED</span>}
                 </div>
             </div>

             {/* SCORE (CENTERED) */}
             <div className="flex items-center justify-center gap-6 w-full">
                 <div className="text-7xl font-mono font-black text-white leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                     {simState.scoreUs}
                 </div>
                 <div className="flex flex-col items-center gap-1">
                     <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white/60">ROUND {roundNum}</span>
                     <span className="text-4xl font-black text-white/20">-</span>
                 </div>
                 <div className="text-7xl font-mono font-black text-white leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                     {simState.scoreEnemy}
                 </div>
             </div>

             {/* RIGHT TEAM */}
             <div className="text-left pl-6 justify-self-start w-full">
                 <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${enemySide === 'CT' ? 'text-ct-blue' : 'text-t-red'} drop-shadow-lg truncate`}>
                     {enemyTeam.name}
                 </h2>
                 <div className="flex items-center justify-start gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
                     <span>Rank #{enemyTeam.rankingPoints}</span>
                 </div>
             </div>
         </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex-1 flex justify-center items-start overflow-hidden pt-4 pb-24 px-8">
        
        {viewMode === 'feed' && (
            <div className="w-full max-w-7xl grid grid-cols-12 gap-8 h-full">
                {/* LEFT HUD: ECONOMY & UTILITY */}
                <div className="col-span-3 flex flex-col gap-4 pt-12">
                    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-4">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2">My Economy</div>
                        <div className="text-2xl font-mono font-bold text-fm-green mb-1">${simState.moneyUs.toLocaleString()}</div>
                        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-fm-green transition-all duration-500" style={{ width: `${Math.min(100, (simState.moneyUs / 16000) * 100)}%` }}></div>
                        </div>
                        <div className="mt-4 text-xs font-bold text-gray-400 uppercase mb-2">Equipment Value</div>
                        <div className="flex gap-1">
                            {['full', 'full', 'half', 'eco', 'force'].map((s, i) => (
                                <div key={i} className={`h-8 flex-1 rounded ${i < simState.survivingCountUs ? (playerSide === 'CT' ? 'bg-ct-blue' : 'bg-t-red') : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-4">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                             <Brain size={12} className="text-fm-accent" /> Coach Intel
                        </div>
                        <div className={`text-lg font-black italic ${coachData.color} leading-tight`}>{coachData.trend}</div>
                        <div className="text-xs text-white mt-1 opacity-80">{coachData.advice}</div>
                    </div>
                </div>

                {/* CENTER: KILLFEED */}
                <div className="col-span-6 relative h-full flex flex-col justify-end pb-8">
                    <div ref={scrollRef} className="w-full max-h-full overflow-y-auto flex flex-col-reverse gap-2 no-scrollbar px-4">
                         {displayedLogs.slice().reverse().map((event, i) => (
                            <KillFeedItem key={i} event={event} />
                        ))}
                    </div>
                </div>

                {/* RIGHT HUD: ENEMY STATUS */}
                <div className="col-span-3 flex flex-col gap-4 pt-12 items-end text-right">
                    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-4 w-full">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Enemy Economy (Est)</div>
                        <div className="text-2xl font-mono font-bold text-fm-red mb-1">${simState.moneyEnemy.toLocaleString()}</div>
                        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-fm-red transition-all duration-500" style={{ width: `${Math.min(100, (simState.moneyEnemy / 16000) * 100)}%` }}></div>
                        </div>
                         <div className="mt-4 text-xs font-bold text-gray-400 uppercase mb-2">Survivors</div>
                        <div className="flex gap-1 justify-end">
                            {Array.from({length: 5}).map((_, i) => (
                                <div key={i} className={`h-8 w-2 rounded ${i < simState.survivingCountEnemy ? 'bg-fm-red' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'scoreboard' && (
            <div className="w-full max-w-5xl bg-fm-card border border-fm-border rounded-xl shadow-2xl p-6 animate-scale-in max-h-full overflow-y-auto custom-scrollbar flex flex-col items-center">
                 {!isSimulating && (
                    <div className="text-center mb-4 shrink-0">
                        {simState.scoreUs > simState.scoreEnemy ? (
                             <div className="text-fm-accent flex flex-col items-center gap-2 animate-bounce-in">
                                 <Trophy size={48} className="drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" />
                                 <h1 className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-lg">Victory</h1>
                             </div>
                        ) : (
                            <div className="text-fm-muted flex flex-col items-center gap-2">
                                <XCircle size={48} />
                                <h1 className="text-4xl font-black uppercase tracking-widest text-gray-500">Defeat</h1>
                            </div>
                        )}
                        <div className="text-fm-green font-mono font-bold text-sm mt-2 border border-fm-green/50 bg-fm-green/10 inline-block px-4 py-1 rounded-full">
                            Earnings: +${(simState.scoreUs > simState.scoreEnemy ? 12500 : 4500).toLocaleString()}
                        </div>
                    </div>
                )}
                 {finalResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6">
                         <div className="border border-fm-border rounded-xl overflow-hidden shadow-xl bg-fm-bg/50">
                            <div className="bg-fm-card-hover p-2 border-b border-fm-border flex justify-between items-center">
                                <h3 className="font-bold text-white uppercase tracking-wide text-sm">{playerTeam.name}</h3>
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
                         <div className="border border-fm-border rounded-xl overflow-hidden shadow-xl bg-fm-bg/50">
                            <div className="bg-fm-card-hover p-2 border-b border-fm-border flex justify-between items-center">
                                <h3 className="font-bold text-fm-red uppercase tracking-wide text-sm">{enemyTeam.name}</h3>
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

                <div className="text-center pb-2 shrink-0">
                    <button 
                    onClick={() => {
                         if (finalResult) {
                             onComplete(finalResult);
                         }
                    }}
                    className="bg-fm-accent hover:bg-fm-accent-hover text-white font-black uppercase px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all hover:scale-105 text-lg tracking-widest"
                >
                    Continue Season
                </button>
                </div>
            </div>
        )}
      </div>

      {/* FOOTER CONTROLS */}
      {viewMode === 'feed' && (
          <div className="relative z-20 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 flex justify-between items-center px-8">
              <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded font-bold text-sm text-white border border-white/5 uppercase tracking-wide flex items-center gap-2">
                       <span className="text-fm-muted">Tactic:</span> 
                       <span className="text-fm-accent">{currentTactic}</span>
                  </div>
              </div>

              <div className="flex items-center gap-4">
                 <button 
                    onClick={handleTacticalPause}
                    disabled={tacticalPauses <= 0 || isSkipping}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest transition-all shadow-lg border text-xs
                     ${tacticalPauses > 0 
                        ? 'bg-white text-black hover:bg-gray-200' 
                        : 'bg-transparent text-gray-500 border-gray-700 cursor-not-allowed'}`}
                 >
                     <Pause size={14} className="fill-current" />
                     Timeout ({tacticalPauses})
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
      )}

      {/* TACTICAL PAUSE MODAL */}
      {isPaused && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
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
  );
};