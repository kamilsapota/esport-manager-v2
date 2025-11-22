
import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats, KillEvent, Tactic } from '../types';
import { Trophy, XCircle, PauseCircle, Play, Zap, CheckCircle, FastForward } from 'lucide-react';
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

// --- ASSETS ---
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
      <div className="flex items-center justify-center py-1.5 hover:bg-black/20 transition-colors rounded px-2 w-full max-w-3xl mx-auto border-b border-gray-800/30 last:border-0 animate-fade-in">
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
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 text-sm transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
           <CountryFlag countryCode={stats.country} />
           <span className={`font-bold ${isMvp ? 'text-yellow-500' : 'text-gray-200'}`}>
              {stats.alias}
              {isMvp && <Trophy size={12} className="inline ml-1" />}
           </span>
        </div>
      </td>
      <td className="py-2 px-3 text-center text-gray-300">{stats.kills}-{stats.deaths}</td>
      <td className={`py-2 px-3 text-center font-mono ${kdDiff > 0 ? 'text-green-400' : kdDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
         {kdDiff > 0 ? '+' : ''}{kdDiff}
      </td>
      <td className="py-2 px-3 text-center text-gray-400 hidden sm:table-cell">{stats.adr.toFixed(1)}</td>
      <td className={`py-2 px-3 text-center font-bold ${stats.rating >= 1.1 ? 'text-green-400' : 'text-gray-400'}`}>
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

  // --- GAMEPLAY STATE ---
  const [timeoutsRemaining, setTimeoutsRemaining] = useState(3);
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [currentTactic, setCurrentTactic] = useState<Tactic>(playerTeam.preferredTactic || Tactic.DEFAULT);
  const [moraleBoostRounds, setMoraleBoostRounds] = useState(0);
  
  // --- VIEW STATE ---
  const [displayedLogs, setDisplayedLogs] = useState<KillEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [viewMode, setViewMode] = useState<'feed' | 'scoreboard'>('feed');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);

  // Store the final calculated result to avoid recalculating on render/click
  const [finalResult, setFinalResult] = useState<MatchResult | null>(null);

  // --- HELPERS FOR WIN CONDITION (MR12 + OT) ---
  const getWinThreshold = (scoreA: number, scoreB: number) => {
      // Regular Time: Win at 13
      let target = 13;
      // Check if we are in OT territory (e.g., 12-12, 15-15)
      while (scoreA >= target - 1 && scoreB >= target - 1) {
          target += 3;
      }
      return target;
  };

  const getTeamSide = (r: number) => {
      if (r <= 12) return 'CT';
      if (r <= 24) return 'T';
      // OT: 25-27 CT, 28-30 T
      const otRound = r - 24;
      return Math.ceil(otRound / 3) % 2 === 1 ? 'CT' : 'T';
  };

  // --- EFFECT 1: WIN CHECK & END GAME ---
  useEffect(() => {
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) {
        if (timerRef.current) clearTimeout(timerRef.current);
        finishMatch();
    }
  }, [simState.scoreUs, simState.scoreEnemy]);

  // --- EFFECT 2: SIMULATION LOOP ---
  useEffect(() => {
    if (!isSimulating) return;
    if (isTimeoutActive) return;
    // If we already have a final result, stop.
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
  }, [roundNum, isSimulating, isTimeoutActive, finalResult]); 

  const runRound = (winThreshold: number) => {
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    isAnimatingRef.current = true;

    let enemyTactic = Tactic.DEFAULT;
    if (Math.random() > 0.7) enemyTactic = Tactic.AGGRESSIVE;
    else if (Math.random() > 0.5) enemyTactic = Tactic.PASSIVE;

    const boost = moraleBoostRounds > 0 ? 0.05 : 0;
    if (moraleBoostRounds > 0) setMoraleBoostRounds(prev => prev - 1);

    const currentLogs = [...simState.logs];
    const stateCopy = { ...simState, logs: currentLogs };

    // Halftime Reset
    if (roundNum === 13) {
        stateCopy.moneyUs = 4000;
        stateCopy.moneyEnemy = 4000;
        stateCopy.lossStreakUs = 0;
        stateCopy.lossStreakEnemy = 0;
        stateCopy.survivingCountUs = 0;
        stateCopy.survivingCountEnemy = 0;
        stateCopy.previousBuyUs = 'ECO';
        stateCopy.previousBuyEnemy = 'ECO';
    }

    // OT Reset
    if (roundNum >= 25 && (roundNum - 25) % 3 === 0) {
        stateCopy.moneyUs = 10000;
        stateCopy.moneyEnemy = 10000;
        stateCopy.lossStreakUs = 0;
        stateCopy.lossStreakEnemy = 0;
        stateCopy.survivingCountUs = 0;
        stateCopy.survivingCountEnemy = 0;
        stateCopy.previousBuyUs = 'ECO';
        stateCopy.previousBuyEnemy = 'ECO';
    }

    // PASS FATIGUE PENALTY TO SIMULATION
    const events = simulateRound(roundNum, stateCopy, playerTeam, enemyTeam, currentTactic, enemyTactic, mapId, boost, fatiguePenalty);

    let desc = `Standard Gun Round`;
    if (roundNum === 1 || roundNum === 13) desc = "Pistol Round";
    else if (roundNum >= 25) desc = "Overtime"; 
    else {
            const niceName = (b: string) => b.replace('_', ' ').toLowerCase();
            const buyUs = stateCopy.previousBuyUs; 
            const buyEnemy = stateCopy.previousBuyEnemy;
            
            if (buyUs === 'FULL_BUY' && buyEnemy === 'FULL_BUY') desc = "Full Buy vs Full Buy";
            else if (buyUs === 'FULL_BUY' && buyEnemy !== 'FULL_BUY') desc = `Full Buy vs ${niceName(buyEnemy)}`;
            else if (buyUs !== 'FULL_BUY' && buyEnemy === 'FULL_BUY') desc = `${niceName(buyUs)} vs Full Buy`;
            else desc = `${niceName(buyUs)} vs ${niceName(buyEnemy)}`;
            desc = desc.replace(/\b\w/g, l => l.toUpperCase());
    }
    
    const newLog: MatchLog = {
        roundNumber: roundNum,
        winner: stateCopy.scoreUs > simState.scoreUs ? 'us' : 'enemy',
        description: desc,
        scoreUs: stateCopy.scoreUs,
        scoreEnemy: stateCopy.scoreEnemy,
        events: events,
        moneyUs: stateCopy.moneyUs, 
        moneyEnemy: stateCopy.moneyEnemy
    };

    const nextState = { ...stateCopy, logs: [...currentLogs, newLog] };
    
    playRoundEvents(events, newLog, nextState);
  };

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

  const skipMatch = () => {
      if (finalResult || !isSimulating) return;

      setIsSimulating(false);
      setIsTimeoutActive(false);

      if (timerRef.current) clearTimeout(timerRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      isAnimatingRef.current = false;

      let currentState = { ...simState, logs: [...simState.logs] };
      let currentRound = roundNum;

      while (true) {
           const winThreshold = getWinThreshold(currentState.scoreUs, currentState.scoreEnemy);
           if (currentState.scoreUs >= winThreshold || currentState.scoreEnemy >= winThreshold) break;

           // Resets
           if (currentRound === 13 || (currentRound >= 25 && (currentRound - 25) % 3 === 0)) {
              const isOT = currentRound >= 25;
              currentState.moneyUs = isOT ? 10000 : 4000;
              currentState.moneyEnemy = isOT ? 10000 : 4000;
              currentState.lossStreakUs = 0;
              currentState.lossStreakEnemy = 0;
              currentState.survivingCountUs = 0;
              currentState.survivingCountEnemy = 0;
              currentState.previousBuyUs = 'ECO';
              currentState.previousBuyEnemy = 'ECO';
           }

           let enemyTactic = Tactic.DEFAULT;
           if (Math.random() > 0.7) enemyTactic = Tactic.AGGRESSIVE;
           else if (Math.random() > 0.5) enemyTactic = Tactic.PASSIVE;

           const boost = 0; 
           const prevScoreUs = currentState.scoreUs;

           // Note: currentTactic is from component state, which is fine.
           const events = simulateRound(currentRound, currentState, playerTeam, enemyTeam, currentTactic, enemyTactic, mapId, boost, fatiguePenalty);

           const winner = currentState.scoreUs > prevScoreUs ? 'us' : 'enemy';

           // Simple Desc for skip
           let desc = `Round ${currentRound}`;
           if (currentRound === 1 || currentRound === 13) desc = "Pistol Round";
           else if (currentRound >= 25) desc = "Overtime";
           else {
                 const niceName = (b: string) => b.replace('_', ' ').toLowerCase();
                 const buyUs = currentState.previousBuyUs;
                 const buyEnemy = currentState.previousBuyEnemy;
                 desc = `${niceName(buyUs)} vs ${niceName(buyEnemy)}`;
                 desc = desc.replace(/\b\w/g, l => l.toUpperCase());
           }

           currentState.logs.push({
               roundNumber: currentRound,
               winner,
               description: desc,
               scoreUs: currentState.scoreUs,
               scoreEnemy: currentState.scoreEnemy,
               events,
               moneyUs: currentState.moneyUs,
               moneyEnemy: currentState.moneyEnemy
           });

           currentRound++;
      }

      setSimState(currentState);
      setRoundNum(currentRound);
      finishMatch(currentState);
  };

  const finishMatch = (finalState?: RoundState) => {
    if (finalResult) return;
    
    const stateToUse = finalState || simState;

    setIsSimulating(false);
    
    // 1. Calculate Stats
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

    // 2. Determine MVP
    const allPlayers = [...playerStatsUs, ...playerStatsEnemy];
    const mvp = allPlayers.length > 0 ? allPlayers.reduce((prev, current) => (prev.rating > current.rating) ? prev : current) : playerStatsUs[0];
    const isWin = stateToUse.scoreUs > stateToUse.scoreEnemy;

    // 3. Create Final Result Object
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

  const handleCallTimeout = () => {
      if (timeoutsRemaining > 0 && !isTimeoutActive && isSimulating) {
          setIsTimeoutActive(true);
          setTimeoutsRemaining(prev => prev - 1);
      }
  };

  const confirmTimeout = () => {
      setMoraleBoostRounds(2); 
      setIsTimeoutActive(false);
  };

  const isWin = simState.scoreUs > simState.scoreEnemy;
  const playerSide = getTeamSide(roundNum);
  const enemySide = playerSide === 'CT' ? 'T' : 'CT';

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-cs-darker font-sans relative">
      
      {/* TACTICAL PAUSE OVERLAY */}
      {isTimeoutActive && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-cs-dark border border-gray-700 rounded-xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-cs-yellow"></div>
                  <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                      <PauseCircle className="text-cs-yellow" size={32} /> Tactical Timeout
                  </h2>
                  <p className="text-gray-400 mb-8">Call a play. Boost team mental (+5% Win Chance for 2 rounds).</p>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                      {[Tactic.AGGRESSIVE, Tactic.DEFAULT, Tactic.PASSIVE].map(t => (
                          <button 
                            key={t}
                            onClick={() => setCurrentTactic(t)}
                            className={`p-4 rounded border-2 transition-all ${currentTactic === t ? 'border-cs-yellow bg-yellow-900/20 text-white' : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                          >
                              <div className="font-bold uppercase tracking-wider text-sm">{t}</div>
                          </button>
                      ))}
                  </div>

                  <button 
                    onClick={confirmTimeout}
                    className="w-full py-4 bg-cs-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                      <Play className="fill-black" size={20} /> Resume Match
                  </button>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="bg-[#1b1b21] p-4 border-b border-gray-800 flex justify-center items-center shadow-xl z-20 shrink-0 relative">
        
        {/* SKIP BUTTON */}
        {isSimulating && (
            <button 
                onClick={skipMatch}
                className="absolute top-4 right-4 z-30 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:scale-105"
            >
                <FastForward size={14} className="fill-white" /> Skip to Result
            </button>
        )}

        <div className="flex-1 flex justify-end items-center gap-4 pr-6 text-right">
           {moraleBoostRounds > 0 && (
               <div className="flex items-center gap-1 bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded border border-yellow-600/30 text-[10px] font-bold uppercase animate-pulse" title="Mental Boost Active">
                   <Zap size={12} className="fill-yellow-500" /> +5% ({moraleBoostRounds})
               </div>
           )}
           <div className={`text-2xl font-black tracking-tight truncate drop-shadow-md ${playerSide === 'CT' ? 'text-ct-blue' : 'text-t-red'}`}>
               {playerTeam.name}
           </div>
        </div>
        
        <div className="flex-none flex items-center gap-6 bg-black/50 px-10 py-3 rounded-md border border-gray-700/50 shadow-inner mx-4 relative">
          {fatiguePenalty > 0 && (
             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap shadow-sm z-30 animate-pulse">
                -{fatiguePenalty * 100}% FATIGUE PENALTY
             </div>
          )}
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreUs > simState.scoreEnemy ? 'text-green-400' : 'text-white'}`}>{simState.scoreUs}</div>
          <div className="text-gray-600 font-thin text-4xl opacity-50">:</div>
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreEnemy > simState.scoreUs ? 'text-red-400' : 'text-white'}`}>{simState.scoreEnemy}</div>
        </div>

        <div className="flex-1 flex justify-start items-center gap-4 pl-6 text-left">
           <div className={`text-2xl font-black tracking-tight truncate drop-shadow-md ${enemySide === 'CT' ? 'text-ct-blue' : 'text-t-red'}`}>
               {enemyTeam.name}
           </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 overflow-hidden relative bg-[#15151a]">
        
        {viewMode === 'feed' && (
            <div className="h-full flex flex-col w-full relative">
                {/* Round Info */}
                <div className="sticky top-0 z-10 flex justify-center pt-4 pb-2 bg-gradient-to-b from-[#15151a] to-transparent shrink-0">
                    <div className="flex flex-col items-center w-full">
                        <div className={`bg-gray-800/90 border ${roundNum > 24 ? 'border-red-500 text-red-400' : 'border-gray-600 text-gray-200'} px-8 py-1 rounded-full text-lg font-bold uppercase tracking-widest mb-1 shadow-lg backdrop-blur-sm`}>
                            Round {roundNum} {roundNum > 24 && " (OT)"}
                        </div>
                        <div className="text-gray-500 text-xs font-mono uppercase tracking-widest">
                            {roundNum <= 12 ? "1st Half" : roundNum <= 24 ? "2nd Half" : "Overtime"}
                        </div>
                        <div className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-widest flex gap-4">
                            <span className={`${simState.moneyUs > 30000 ? 'text-green-400' : ''}`}>$ {simState.moneyUs.toLocaleString()}</span>
                            <span>vs</span>
                            <span className={`${simState.moneyEnemy > 30000 ? 'text-green-400' : ''}`}>$ {simState.moneyEnemy.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                {/* Logs */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth px-4 pb-20">
                    <div className="flex flex-col justify-start items-center w-full max-w-4xl mx-auto pt-4 space-y-1">
                        {displayedLogs.map((event, i) => (
                            <KillFeedItem key={i} event={event} playerTeam={playerTeam} />
                        ))}
                        {displayedLogs.length === 0 && isSimulating && (
                             <div className="text-center text-gray-600 uppercase font-bold tracking-widest mt-10 animate-pulse">
                                {isAnimatingRef.current ? "LIVE" : "PREPARING ROUND..."}
                            </div>
                        )}
                    </div>
                </div>

                {/* MANAGER CONTROLS */}
                {isSimulating && (
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                        <button 
                            onClick={handleCallTimeout}
                            disabled={timeoutsRemaining <= 0}
                            className={`group flex items-center gap-3 px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-lg transition-all border-2
                                ${timeoutsRemaining > 0 
                                    ? 'bg-cs-dark border-cs-yellow text-white hover:bg-gray-800 hover:scale-105' 
                                    : 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed'}`}
                        >
                            <PauseCircle size={20} className={timeoutsRemaining > 0 ? 'text-cs-yellow group-hover:animate-pulse' : 'text-gray-600'} />
                            Tactical Timeout
                            <div className="flex gap-1 ml-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${i <= timeoutsRemaining ? 'bg-cs-yellow' : 'bg-gray-700'}`}></div>
                                ))}
                            </div>
                        </button>
                    </div>
                )}
            </div>
        )}

        {viewMode === 'scoreboard' && (
            <div className="h-full overflow-y-auto p-6 animate-fade-in bg-[#15151a]">
                {!isSimulating && (
                    <div className="text-center mb-8">
                        {isWin ? (
                             <div className="text-yellow-400 flex flex-col items-center gap-2 animate-bounce-in">
                                 <Trophy size={64} className="drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                 <h1 className="text-5xl font-black uppercase tracking-widest text-white drop-shadow-lg">Victory</h1>
                             </div>
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center gap-2">
                                <XCircle size={64} />
                                <h1 className="text-5xl font-black uppercase tracking-widest text-gray-400">Defeat</h1>
                            </div>
                        )}
                        <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto">{simState.scoreUs > simState.scoreEnemy ? 'Victory achieved.' : 'Defeat.'}</p>
                        <div className="text-green-400 font-mono font-bold text-xl mt-2 border border-green-900/50 bg-green-900/20 inline-block px-6 py-2 rounded-full">
                            Earnings: +${(isWin ? 12500 : 4500).toLocaleString()}
                        </div>
                    </div>
                )}

                {/* --- STATS TABLE --- */}
                {finalResult && (
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* MY TEAM */}
                        <div className="bg-cs-dark border border-gray-800 rounded-lg overflow-hidden shadow-xl">
                            <div className="bg-gradient-to-r from-gray-900 to-cs-dark p-3 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold text-white uppercase tracking-wide">{playerTeam.name}</h3>
                                <span className="text-xs text-gray-500 uppercase">Player Stats</span>
                            </div>
                            <table className="w-full">
                                <thead className="bg-gray-900/50 text-xs text-gray-500 uppercase font-bold">
                                    <tr>
                                        <th className="py-2 px-3 text-left">Player</th>
                                        <th className="py-2 px-3 text-center">K-D</th>
                                        <th className="py-2 px-3 text-center">+/-</th>
                                        <th className="py-2 px-3 text-center hidden sm:table-cell">ADR</th>
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

                        {/* ENEMY TEAM */}
                        <div className="bg-cs-dark border border-gray-800 rounded-lg overflow-hidden shadow-xl opacity-90">
                            <div className="bg-gradient-to-r from-gray-900 to-cs-dark p-3 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold text-red-400 uppercase tracking-wide">{enemyTeam.name}</h3>
                                <span className="text-xs text-gray-500 uppercase">Player Stats</span>
                            </div>
                             <table className="w-full">
                                <thead className="bg-gray-900/50 text-xs text-gray-500 uppercase font-bold">
                                    <tr>
                                        <th className="py-2 px-3 text-left">Player</th>
                                        <th className="py-2 px-3 text-center">K-D</th>
                                        <th className="py-2 px-3 text-center">+/-</th>
                                        <th className="py-2 px-3 text-center hidden sm:table-cell">ADR</th>
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
                    className="bg-cs-yellow hover:bg-yellow-400 text-black font-black uppercase px-10 py-4 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all hover:scale-105 text-lg tracking-widest"
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
