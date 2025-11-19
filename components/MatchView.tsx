import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, MatchLog, Team, PlayerMatchStats } from '../types';
import { Trophy, XCircle } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface MatchViewProps {
  matchResult: MatchResult | null;
  playerTeam: Team;
  onComplete: (result: MatchResult) => void;
}

export const MatchView: React.FC<MatchViewProps> = ({ matchResult, playerTeam, onComplete }) => {
  const [visibleLogs, setVisibleLogs] = useState<MatchLog[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchResult) return;

    if (currentRoundIndex < matchResult.logs.length) {
      const timer = setTimeout(() => {
        setVisibleLogs(prev => [...prev, matchResult.logs[currentRoundIndex]]);
        setCurrentRoundIndex(prev => prev + 1);
      }, 1500); // Delay between rounds for suspense
      return () => clearTimeout(timer);
    } else {
      setIsSimulating(false);
    }
  }, [matchResult, currentRoundIndex]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs]);

  if (!matchResult) return <div className="text-center p-10 animate-pulse">Initializing Server...</div>;

  const currentScoreUs = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1].scoreUs : 0;
  const currentScoreEnemy = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1].scoreEnemy : 0;
  const isWin = matchResult.finalScoreUs > matchResult.finalScoreEnemy;

  // Helper for Scoreboard Rows
  const StatRow: React.FC<{ stats: PlayerMatchStats, isMvp: boolean }> = ({ stats, isMvp }) => {
    const kdDiff = stats.kills - stats.deaths;
    const diffColor = kdDiff > 0 ? 'text-green-400' : kdDiff < 0 ? 'text-red-400' : 'text-gray-400';
    const diffSign = kdDiff > 0 ? '+' : '';
    
    let ratingColor = 'text-gray-400';
    if (stats.rating >= 1.30) ratingColor = 'text-yellow-400 font-bold';
    else if (stats.rating >= 1.10) ratingColor = 'text-green-400';
    else if (stats.rating < 0.90) ratingColor = 'text-red-400';

    return (
      <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-sm">
        <td className="py-2 px-3">
          <div className="flex items-center gap-3">
             <div className="w-5 flex justify-center">
                <CountryFlag countryCode={stats.country} />
             </div>
             <span className={`font-medium ${isMvp ? 'text-yellow-500' : 'text-gray-200'}`}>
                {stats.alias}
                {isMvp && <Trophy size={12} className="inline ml-1" />}
             </span>
          </div>
        </td>
        <td className="py-2 px-3 text-center text-gray-300">
           {stats.kills}-{stats.deaths}
        </td>
        <td className={`py-2 px-3 text-center font-mono ${diffColor}`}>
           {diffSign}{kdDiff}
        </td>
        <td className="py-2 px-3 text-center text-gray-400">
           {stats.adr.toFixed(1)}
        </td>
        <td className="py-2 px-3 text-center text-gray-400">
           {stats.kast.toFixed(1)}%
        </td>
        <td className={`py-2 px-3 text-center font-mono ${ratingColor}`}>
           {stats.rating.toFixed(2)}
        </td>
      </tr>
    );
  };

  const TeamTable: React.FC<{ teamName: string, stats: PlayerMatchStats[], isUserTeam: boolean }> = ({ teamName, stats, isUserTeam }) => (
     <div className="mb-6">
        <div className={`flex items-center gap-2 mb-2 px-1 ${isUserTeam ? 'text-ct-blue' : 'text-t-red'}`}>
            <h3 className="font-bold uppercase tracking-widest text-lg">{teamName}</h3>
            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">
                {isUserTeam ? matchResult.finalScoreUs : matchResult.finalScoreEnemy} Rounds
            </span>
        </div>
        <div className="bg-cs-dark border border-gray-800 rounded-lg overflow-hidden shadow-lg">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-900 text-xs uppercase text-gray-500 font-bold">
                        <th className="py-2 px-3 text-left w-1/3">Player</th>
                        <th className="py-2 px-3 text-center">K-D</th>
                        <th className="py-2 px-3 text-center">+/-</th>
                        <th className="py-2 px-3 text-center">ADR</th>
                        <th className="py-2 px-3 text-center">KAST</th>
                        <th className="py-2 px-3 text-center">Rating 2.0</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map((p, i) => (
                        <StatRow key={i} stats={p} isMvp={p.alias === matchResult.mvpAlias} />
                    ))}
                </tbody>
            </table>
        </div>
     </div>
  );

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden">
      {/* Header Scoreboard */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex flex-col items-center w-1/3">
          <h2 className="text-xl font-bold text-ct-blue tracking-widest">{playerTeam.name}</h2>
        </div>
        
        <div className="flex items-center gap-4 w-1/3 justify-center">
          <div className={`text-4xl font-mono font-black ${currentScoreUs > currentScoreEnemy ? 'text-white' : 'text-gray-500'}`}>
            {currentScoreUs}
          </div>
          <div className="text-gray-600 font-thin text-2xl">:</div>
          <div className={`text-4xl font-mono font-black ${currentScoreEnemy > currentScoreUs ? 'text-t-red' : 'text-gray-500'}`}>
            {currentScoreEnemy}
          </div>
        </div>

        <div className="flex flex-col items-center w-1/3">
          <h2 className="text-xl font-bold text-t-red tracking-widest">{matchResult.enemyTeamName}</h2>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-cs-darker p-4 md:p-6 relative">
        
        {/* Live Logs (only show while simulating) */}
        {isSimulating ? (
            <div className="max-w-3xl mx-auto space-y-3 mb-20">
                {visibleLogs.map((log, idx) => (
                    <div key={idx} className={`p-3 rounded border-l-4 animate-fade-in ${log.winner === 'us' ? 'bg-blue-900/10 border-ct-blue' : 'bg-red-900/10 border-t-red'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Round {log.roundNumber}</span>
                            <span className={`text-[10px] font-bold uppercase ${log.winner === 'us' ? 'text-ct-blue' : 'text-t-red'}`}>
                                {log.winner === 'us' ? 'Round Won' : 'Round Lost'}
                            </span>
                        </div>
                        <p className="text-gray-300 text-sm md:text-base font-mono">{log.description}</p>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        ) : (
            /* Final Scoreboard Table */
            <div className="max-w-5xl mx-auto animate-fade-in">
                <div className="text-center mb-8">
                    {isWin ? (
                         <div className="flex items-center justify-center gap-2 text-yellow-500 mb-2">
                             <Trophy size={32} />
                             <h1 className="text-3xl font-black tracking-tighter uppercase text-white">Victory</h1>
                         </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                            <XCircle size={32} />
                            <h1 className="text-3xl font-black tracking-tighter uppercase text-white">Defeat</h1>
                        </div>
                    )}
                    <p className="text-gray-400">{matchResult.summary}</p>
                    <div className="text-sm font-mono mt-2">
                        Earnings: <span className={isWin ? 'text-green-400' : 'text-red-400'}>${matchResult.earnings.toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
                    <TeamTable teamName={playerTeam.name} stats={matchResult.playerStatsUs} isUserTeam={true} />
                    <TeamTable teamName={matchResult.enemyTeamName} stats={matchResult.playerStatsEnemy} isUserTeam={false} />
                </div>

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => onComplete(matchResult)}
                        className="px-12 py-3 bg-cs-yellow hover:bg-yellow-400 text-black font-bold uppercase tracking-widest rounded shadow-lg transition-transform transform hover:scale-105"
                    >
                        Return to Lobby
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
