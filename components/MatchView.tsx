
import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats, KillEvent } from '../types';
import { Trophy, XCircle, Eye, List } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface MatchViewProps {
  matchResult: MatchResult | null;
  playerTeam: Team;
  onComplete: (result: MatchResult) => void;
}

// --- IMAGE ASSETS MAP ---
const WEAPON_IMAGES: Record<string, string> = {
    'ak47': 'https://www.hltv.org/img/static/scoreboard/weapons/ak47.png',
    'm4a1': 'https://www.hltv.org/img/static/scoreboard/weapons/m4a1.png',
    'm4a4': 'https://www.hltv.org/img/static/scoreboard/weapons/m4a1.png', // Fallback
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

  // CT Color = Blue (#5d79ae / #0c8ce9), T Color = Orange/Yellow (#de9b35)
  // We rely on event.killerSide ('CT' or 'T') to determine color, matching HLTV style
  const getTeamColor = (side: 'CT' | 'T') => side === 'CT' ? 'text-ct-blue' : 'text-t-red';
  
  // Note: event.killerSide is set in geminiService based on Round #.
  const killerColor = getTeamColor(event.killerSide);
  const victimColor = getTeamColor(event.killerSide === 'CT' ? 'T' : 'CT'); 

  const weaponUrl = WEAPON_IMAGES[event.weapon] || WEAPON_IMAGES['ak47']; // Fallback

  return (
      <div className="flex items-center justify-center py-1.5 hover:bg-black/20 transition-colors rounded px-2 w-full max-w-3xl mx-auto border-b border-gray-800/30 last:border-0 animate-fade-in">
          {/* KILLER */}
          <div className={`flex-1 text-right font-bold text-sm sm:text-base truncate ${killerColor}`}>
              {event.killer}
          </div>
          
          {/* ICONS CENTER */}
          <div className="flex items-center justify-center gap-2 mx-4 w-32 shrink-0">
               {/* Assist? Could add here if needed later */}
               <img src={weaponUrl} alt={event.weapon} className="h-6 drop-shadow-md filter grayscale-[0.2]" />
               {event.isHeadshot && (
                   <img src={ICONS.headshot} alt="HS" className="h-5" />
               )}
          </div>

          {/* VICTIM */}
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

export const MatchView: React.FC<MatchViewProps> = ({ matchResult, playerTeam, onComplete }) => {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [displayedLogs, setDisplayedLogs] = useState<KillEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [currentRoundLog, setCurrentRoundLog] = useState<MatchLog | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'scoreboard'>('feed');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Score State - Initialize at 0-0 to avoid spoilers!
  const [scoreUs, setScoreUs] = useState(0);
  const [scoreEnemy, setScoreEnemy] = useState(0);

  useEffect(() => {
    if (!matchResult) return;

    // Main Simulation Loop
    if (currentRoundIndex < matchResult.logs.length) {
        const roundData = matchResult.logs[currentRoundIndex];
        setCurrentRoundLog(roundData);
        
        // Clear previous round events initially
        setDisplayedLogs([]); 

        // Animate events one by one
        let eventIdx = 0;
        
        const eventInterval = setInterval(() => {
            if (eventIdx < roundData.events.length) {
                const nextEvent = roundData.events[eventIdx];
                if (nextEvent) {
                    setDisplayedLogs(prev => [...prev, nextEvent]);
                }
                eventIdx++;
                // Scroll to bottom
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            } else {
                clearInterval(eventInterval);
                // Update Score ONLY after round events finish
                setScoreUs(roundData.scoreUs);
                setScoreEnemy(roundData.scoreEnemy);
                
                // Delay before next round
                setTimeout(() => {
                    setCurrentRoundIndex(prev => prev + 1);
                }, 1500); 
            }
        }, 600); // Speed of killfeed events

        return () => clearInterval(eventInterval);
    } else {
        setIsSimulating(false);
        setViewMode('scoreboard'); // Auto switch to scoreboard when done
    }
  }, [matchResult, currentRoundIndex]);

  if (!matchResult) return <div className="flex h-screen items-center justify-center text-cs-yellow animate-pulse">INITIALIZING SERVER...</div>;

  const isWin = matchResult.finalScoreUs > matchResult.finalScoreEnemy;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-cs-darker font-sans">
      {/* HEADER: SCOREBOARD */}
      <div className="bg-[#1b1b21] p-4 border-b border-gray-800 flex justify-between items-center shadow-xl z-20 shrink-0">
        <div className="w-1/3 text-left">
           <div className="text-2xl font-black text-ct-blue tracking-tight truncate drop-shadow-md">{playerTeam.name}</div>
        </div>
        
        <div className="flex items-center gap-6 bg-black/50 px-10 py-3 rounded-md border border-gray-700/50 shadow-inner">
          <div className={`text-6xl font-mono font-black tracking-tighter ${scoreUs > scoreEnemy ? 'text-green-400' : 'text-white'}`}>{scoreUs}</div>
          <div className="text-gray-600 font-thin text-4xl opacity-50">:</div>
          <div className={`text-6xl font-mono font-black tracking-tighter ${scoreEnemy > scoreUs ? 'text-red-400' : 'text-white'}`}>{scoreEnemy}</div>
        </div>

        <div className="w-1/3 text-right">
           <div className="text-2xl font-black text-t-red tracking-tight truncate drop-shadow-md">{matchResult.enemyTeamName}</div>
        </div>
      </div>

      {/* CONTROLS - Only show when simulation is DONE to prevent spoilers */}
      {!isSimulating && (
          <div className="bg-gray-800/50 p-2 flex justify-center gap-4 shrink-0 border-b border-gray-700">
              <button 
                onClick={() => setViewMode('feed')} 
                className={`px-6 py-2 rounded text-sm font-bold uppercase flex items-center gap-2 transition-all ${viewMode === 'feed' ? 'bg-cs-blue text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
              >
                  <List size={16} /> Match Log
              </button>
              <button 
                onClick={() => setViewMode('scoreboard')} 
                className={`px-6 py-2 rounded text-sm font-bold uppercase flex items-center gap-2 transition-all ${viewMode === 'scoreboard' ? 'bg-cs-blue text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
              >
                  <Eye size={16} /> Scoreboard
              </button>
          </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative bg-[#15151a]">
        
        {/* LIVE FEED VIEW */}
        {viewMode === 'feed' && (
            <div className="h-full flex flex-col w-full relative">
                
                {/* Round Indicator Overlay */}
                {isSimulating && currentRoundLog && (
                    <div className="sticky top-0 z-10 flex justify-center pt-4 pb-2 bg-gradient-to-b from-[#15151a] to-transparent shrink-0">
                        <div className="flex flex-col items-center w-full">
                            <div className="bg-gray-800/90 border border-gray-600 px-8 py-1 rounded-full text-lg font-bold text-gray-200 uppercase tracking-widest mb-1 shadow-lg backdrop-blur-sm">
                                Round {currentRoundLog.roundNumber}
                            </div>
                            <div className="text-gray-500 text-xs font-mono uppercase tracking-widest">
                                {currentRoundIndex < 12 ? "1st Half" : "2nd Half"}
                            </div>
                            {/* REMOVED DESCRIPTION TO PREVENT SPOILERS */}
                        </div>
                    </div>
                )}

                {/* Killfeed Area - Now aligned closer to top */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto scroll-smooth px-4 pb-10"
                >
                    <div className="flex flex-col justify-start items-center w-full max-w-4xl mx-auto pt-4 space-y-1">
                        {displayedLogs.length === 0 && isSimulating && (
                            <div className="text-center text-gray-600 uppercase font-bold tracking-widest mt-10 animate-pulse">
                                FREEZE TIME...
                            </div>
                        )}
                        {displayedLogs.map((event, i) => (
                            <KillFeedItem key={i} event={event} playerTeam={playerTeam} />
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* SCOREBOARD VIEW */}
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
                        <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto">{matchResult.summary}</p>
                        <div className="text-green-400 font-mono font-bold text-xl mt-2 border border-green-900/50 bg-green-900/20 inline-block px-6 py-2 rounded-full">
                            Earnings: +${matchResult.earnings.toLocaleString()}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* My Team Table */}
                    <div className="bg-[#1e1e24] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 border-b border-gray-800 text-ct-blue font-black text-lg uppercase tracking-wide flex justify-between items-center">
                             {playerTeam.name}
                             <span className="text-white text-2xl">{matchResult.finalScoreUs}</span>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-900/50 text-xs text-gray-500 uppercase font-bold">
                                <tr>
                                    <th className="text-left py-3 px-4">Player</th>
                                    <th className="py-3 px-3 text-center">K-D</th>
                                    <th className="py-3 px-3 text-center">+/-</th>
                                    <th className="py-3 px-3 text-center hidden md:table-cell">ADR</th>
                                    <th className="py-3 px-3 text-center">Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/30">
                                {matchResult.playerStatsUs.map((p, i) => (
                                    <StatRow key={i} stats={p} isMvp={p.alias === matchResult.mvpAlias} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Enemy Team Table */}
                    <div className="bg-[#1e1e24] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 border-b border-gray-800 text-t-red font-black text-lg uppercase tracking-wide flex justify-between items-center">
                             {matchResult.enemyTeamName}
                             <span className="text-white text-2xl">{matchResult.finalScoreEnemy}</span>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-900/50 text-xs text-gray-500 uppercase font-bold">
                                <tr>
                                    <th className="text-left py-3 px-4">Player</th>
                                    <th className="py-3 px-3 text-center">K-D</th>
                                    <th className="py-3 px-3 text-center">+/-</th>
                                    <th className="py-3 px-3 text-center hidden md:table-cell">ADR</th>
                                    <th className="py-3 px-3 text-center">Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/30">
                                {matchResult.playerStatsEnemy.map((p, i) => (
                                    <StatRow key={i} stats={p} isMvp={p.alias === matchResult.mvpAlias} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!isSimulating && (
                    <div className="text-center mt-12 pb-12">
                         <button 
                            onClick={() => onComplete(matchResult)}
                            className="bg-cs-yellow hover:bg-yellow-400 text-black font-black uppercase px-10 py-4 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all hover:scale-105 text-lg tracking-widest"
                        >
                            Continue Season
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
