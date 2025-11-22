
import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats, KillEvent, Tactic } from '../types';
import { Trophy, XCircle, Eye, List, PauseCircle, Play, Brain, Zap, Shield, Check, X } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { RoundState, simulateRound, determineBuy } from '../services/geminiService';

interface MatchViewProps {
  playerTeam: Team;
  enemyTeam: Team;
  mapId: string;
  context: string;
  onComplete: (result: MatchResult) => void;
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
      <td className="py-2 px-3 text-center text-gray-400 hidden md:table-cell">{stats.adr.toFixed(1)}</td>
      <td className={`py-2 px-3 text-center font-bold ${stats.rating >= 1.1 ? 'text-green-400' : 'text-gray-400'}`}>
         {stats.rating.toFixed(2)}
      </td>
    </tr>
  );
};

export const MatchView: React.FC<MatchViewProps> = ({ playerTeam, enemyTeam, mapId, context, onComplete }) => {
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
  const [currentLogData, setCurrentLogData] = useState<MatchLog | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);

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

  // --- EFFECT 1: WIN CHECK & END GAME ---
  // Triggers ONLY when score updates
  useEffect(() => {
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) {
        if (timerRef.current) clearTimeout(timerRef.current);
        finishMatch();
    }
  }, [simState.scoreUs, simState.scoreEnemy]);

  // --- EFFECT 2: SIMULATION LOOP ---
  // Triggers ONLY on round number or pause state changes. 
  // Does NOT trigger on score change to prevent double-firing during animations.
  useEffect(() => {
    if (!isSimulating) return;
    if (isTimeoutActive) return;

    // Safety check: if game is actually over, don't schedule next round
    const winThreshold = getWinThreshold(simState.scoreUs, simState.scoreEnemy);
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    // Delay before starting a round simulation (gives visual pacing)
    timerRef.current = setTimeout(() => {
        // Strict check: Don't run if animation is currently happening
        if (!isAnimatingRef.current) {
            runRound(winThreshold);
        }
    }, 3500); // 3.5s between rounds

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roundNum, isSimulating, isTimeoutActive]); 

  const runRound = (winThreshold: number) => {
    // Double check win condition
    if (simState.scoreUs >= winThreshold || simState.scoreEnemy >= winThreshold) return;

    // Lock animation
    isAnimatingRef.current = true;

    // 1. Determine Opponent Tactic
    let enemyTactic = Tactic.DEFAULT;
    if (Math.random() > 0.7) enemyTactic = Tactic.AGGRESSIVE;
    else if (Math.random() > 0.5) enemyTactic = Tactic.PASSIVE;

    // 2. Apply Boosts
    const boost = moraleBoostRounds > 0 ? 0.05 : 0;
    if (moraleBoostRounds > 0) setMoraleBoostRounds(prev => prev - 1);

    // 3. Prepare State
    const currentLogs = [...simState.logs];
    const stateCopy = { ...simState, logs: currentLogs };

    // --- ECONOMY RESETS ---
    
    // Halftime Reset (Round 13)
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

    // OVERTIME RESET LOGIC
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

    const events = simulateRound(roundNum, stateCopy, playerTeam, enemyTeam, currentTactic, enemyTactic, mapId, boost);

    // Create Log Entry
    let desc = `Standard Gun Round`;
    if (roundNum === 1 || roundNum === 13) desc = "Pistol Round";
    else if (roundNum >= 25) desc = "Overtime"; 
    else {
            const niceName = (b: string) => b.replace('_', ' ').toLowerCase();
            const buyUs = stateCopy.previousBuyUs; // simulateRound updates this
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

    // Update State
    setSimState({ ...stateCopy, logs: [...currentLogs, newLog] });
    setCurrentLogData(newLog);
    
    // 4. Play the events visually
    playRoundEvents(events, newLog);
  };

  const playRoundEvents = (events: KillEvent[], log: MatchLog) => {
    setDisplayedLogs([]);
    let eventIdx = 0;
    
    const interval = setInterval(() => {
        if (eventIdx < events.length) {
            setDisplayedLogs(prev => [...prev, events[eventIdx]]);
            eventIdx++;
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
            clearInterval(interval);
            // Next round trigger
            isAnimatingRef.current = false; // Unlock
            setRoundNum(prev => prev + 1);
        }
    }, 500); // Speed of events
  };

  const finishMatch = () => {
    setIsSimulating(false);
    setViewMode('scoreboard');

    // Calculate Stats
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

    simState.logs.forEach(log => {
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
            const kpr = s.kills / rounds;
            const dpr = s.deaths / rounds;
            const impact = kpr * 2.1;
            s.rating = (kpr * 0.7) + (impact * 0.3) + ((1-dpr) * 0.5);
        });
    };

    const totalRounds = simState.scoreUs + simState.scoreEnemy;
    calculateRating(playerStatsUs, totalRounds);
    calculateRating(playerStatsEnemy, totalRounds);

    const allPlayers = [...playerStatsUs, ...playerStatsEnemy];
    const mvp = allPlayers.length > 0 ? allPlayers.reduce((prev, current) => (prev.rating > current.rating) ? prev : current) : playerStatsUs[0];
    const isWin = simState.scoreUs > simState.scoreEnemy;

    const result: MatchResult = {
        enemyTeamName: enemyTeam.name,
        finalScoreUs: simState.scoreUs,
        finalScoreEnemy: simState.scoreEnemy,
        logs: simState.logs,
        mvpAlias: mvp?.alias || 'Unknown',
        earnings: isWin ? 12500 : 4500,
        summary: isWin ? "Victory achieved." : "Defeat.",
        playerStatsUs,
        playerStatsEnemy,
        mapPlayed: mapId
    };

    // Pass result to parent (App)
    // We don't call onComplete immediately so user can see scoreboard first
  };

  const handleCallTimeout = () => {
      if (timeoutsRemaining > 0 && !isTimeoutActive && isSimulating) {
          setIsTimeoutActive(true);
          setTimeoutsRemaining(prev => prev - 1);
      }
  };

  const confirmTimeout = () => {
      setMoraleBoostRounds(3);
      setIsTimeoutActive(false);
      // Match loop useEffect will re-trigger
  };

  const isWin = simState.scoreUs > simState.scoreEnemy;

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
                  <p className="text-gray-400 mb-8">Call a play. Boost team mental (+5% Win Chance for 3 rounds).</p>

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
      <div className="bg-[#1b1b21] p-4 border-b border-gray-800 flex justify-between items-center shadow-xl z-20 shrink-0">
        <div className="w-1/3 text-left flex items-center gap-3">
           <div className="text-2xl font-black text-ct-blue tracking-tight truncate drop-shadow-md">{playerTeam.name}</div>
           {moraleBoostRounds > 0 && (
               <div className="flex items-center gap-1 bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded border border-yellow-600/30 text-[10px] font-bold uppercase animate-pulse" title="Mental Boost Active">
                   <Zap size={12} className="fill-yellow-500" /> +5% ({moraleBoostRounds})
               </div>
           )}
        </div>
        
        <div className="flex items-center gap-6 bg-black/50 px-10 py-3 rounded-md border border-gray-700/50 shadow-inner">
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreUs > simState.scoreEnemy ? 'text-green-400' : 'text-white'}`}>{simState.scoreUs}</div>
          <div className="text-gray-600 font-thin text-4xl opacity-50">:</div>
          <div className={`text-6xl font-mono font-black tracking-tighter ${simState.scoreEnemy > simState.scoreUs ? 'text-red-400' : 'text-white'}`}>{simState.scoreEnemy}</div>
        </div>

        <div className="w-1/3 text-right">
           <div className="text-2xl font-black text-t-red tracking-tight truncate drop-shadow-md">{enemyTeam.name}</div>
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
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
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
                    <div className="text-center mb-10">
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

                {/* Reuse Scoreboard Table Logic (Simplified for brevity, assumes matchResult logic in parent handles final structure) */}
                 <div className="text-center mt-12 pb-12">
                    <p className="text-gray-500 italic mb-6">Match stats finalized.</p>
                    <button 
                    onClick={() => {
                         // Trigger real calculation if needed, or use current state
                         finishMatch(); // Ensure stats are calc
                         
                         const isWin = simState.scoreUs > simState.scoreEnemy;
                         const finalResult: MatchResult = {
                            enemyTeamName: enemyTeam.name,
                            finalScoreUs: simState.scoreUs,
                            finalScoreEnemy: simState.scoreEnemy,
                            logs: simState.logs,
                            mvpAlias: playerTeam.players[0].alias, 
                            earnings: isWin ? 12500 : 4500,
                            summary: isWin ? "Victory" : "Defeat",
                            playerStatsUs: [], 
                            playerStatsEnemy: [],
                            mapPlayed: mapId
                         };
                         // Recalculate stats properly before sending
                         const statsUs: PlayerMatchStats[] = playerTeam.players.map(p => ({
                            alias: p.alias, country: p.country, kills: 0, deaths: 0, assists: 0, adr: 0, kast: 0, rating: 0
                        }));
                        const statsEnemy: PlayerMatchStats[] = enemyTeam.players.map(p => ({
                            alias: p.alias, country: p.country, kills: 0, deaths: 0, assists: 0, adr: 0, kast: 0, rating: 0
                        }));

                        const process = (teamStats: PlayerMatchStats[], alias: string, type: 'kill' | 'death') => {
                            const p = teamStats.find(s => s.alias === alias);
                            if (p) type === 'kill' ? p.kills++ : p.deaths++;
                        };

                        simState.logs.forEach(log => {
                            log.events.forEach(ev => {
                                if (statsUs.find(p => p.alias === ev.killer)) process(statsUs, ev.killer, 'kill');
                                else process(statsEnemy, ev.killer, 'kill');
                                if (statsUs.find(p => p.alias === ev.victim)) process(statsUs, ev.victim, 'death');
                                else process(statsEnemy, ev.victim, 'death');
                            });
                        });

                        finalResult.playerStatsUs = statsUs;
                        finalResult.playerStatsEnemy = statsEnemy;
                        
                        onComplete(finalResult);
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
