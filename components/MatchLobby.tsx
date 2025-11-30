

import React, { useState, useEffect } from 'react';
import { Team, Tactic, OpponentAnalysis, Player } from '../types';
import { Trophy, Shield, Swords, Play, Brain, Search, Loader2, Crosshair, Lock, Calendar, CheckCircle, TrendingUp, AlertTriangle, Bug } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface MatchLobbyProps {
  myTeam: Team;
  opponent: Team;
  analysis: OpponentAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onStartMatch: () => void;
  onSetTactic: (tactic: Tactic) => void;
  isMatchDay: boolean;
  matchDate?: string;
  onDevSim?: (result: 'win' | 'loss') => void;
}

const RosterRow: React.FC<{ player: Player; isEnemy?: boolean }> = ({ player, isEnemy }) => {
    const getDisplayRating = () => {
        if (isEnemy) {
            const avgStat = (player.stats.aim + player.stats.reflex + player.stats.strategy + player.stats.utility + player.stats.teamwork + player.stats.clutch) / 6;
            const estimatedRating = 0.35 + (avgStat / 100);
            return estimatedRating.toFixed(2);
        }

        if (!player.matchHistory || player.matchHistory.length === 0) {
            return "-.--";
        }

        const totalRating = player.matchHistory.reduce((acc, match) => acc + match.rating, 0);
        return (totalRating / player.matchHistory.length).toFixed(2);
    };

    const rating = getDisplayRating();
    const ratingColor = rating === "-.--" 
        ? "text-gray-600" 
        : parseFloat(rating) >= 1.10 
            ? "text-fm-green" 
            : parseFloat(rating) < 0.95 
                ? "text-fm-red" 
                : "text-fm-muted";

    return (
        <div className={`flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:bg-fm-card-hover transition-colors ${isEnemy ? 'flex-row-reverse text-right' : ''}`}>
            <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border overflow-hidden ${isEnemy ? 'bg-fm-red/10 border-fm-red/30 text-fm-red' : 'bg-fm-accent/10 border-fm-accent/30 text-fm-accent'}`}>
                    {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.alias} className="w-full h-full object-cover" />
                    ) : (
                        player.alias.charAt(0)
                    )}
                </div>
                <div className={`absolute -bottom-1 -right-1 text-[8px] font-bold px-1 rounded border ${isEnemy ? 'bg-fm-bg border-fm-red/30 text-fm-red' : 'bg-fm-bg border-fm-accent/30 text-fm-accent'}`}>
                    {player.role.substring(0, 3).toUpperCase()}
                </div>
            </div>
            <div className="min-w-0 flex-1">
                <div className={`font-bold text-white text-sm truncate flex items-center gap-2 ${isEnemy ? 'justify-end' : ''}`}>
                    {!isEnemy && <CountryFlag countryCode={player.country} />}
                    {player.alias}
                    {isEnemy && <CountryFlag countryCode={player.country} />}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isEnemy ? 'justify-end' : ''}`}>
                    <span className="text-fm-muted opacity-70">RATING 2.0:</span>
                    <span className={ratingColor}>{rating}</span>
                </div>
            </div>
        </div>
    );
};

export const MatchLobby: React.FC<MatchLobbyProps> = ({ 
    myTeam, 
    opponent, 
    analysis, 
    isAnalyzing, 
    onAnalyze, 
    onStartMatch, 
    onSetTactic,
    isMatchDay,
    matchDate,
    onDevSim
}) => {
  const [selectedTactic, setSelectedTactic] = useState<Tactic>(myTeam.preferredTactic || Tactic.DEFAULT);
  const [loadingText, setLoadingText] = useState('Initializing scan...');
  const [showDevTools, setShowDevTools] = useState(false);

  const isTBD = opponent.id === 'temp-id' || opponent.name === 'TBD';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
        const statuses = [
            "Connecting to HLTV Database...",
            "Downloading Recent Demos...",
            "Analyzing Player Pathing...",
            "Identifying Weaknesses...",
            "Simulating Tactical Outcomes...",
            "Finalizing Coach Report..."
        ];
        let i = 0;
        setLoadingText(statuses[0]);
        interval = setInterval(() => {
            i = (i + 1) % statuses.length;
            setLoadingText(statuses[i]);
        }, 1600); // Change text every 1.6s
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleTacticChange = (tactic: Tactic) => {
      setSelectedTactic(tactic);
      onSetTactic(tactic);
  };

  const formattedDate = matchDate ? new Date(matchDate).toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long'
  }) : "Upcoming";

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto p-6 animate-fade-in pb-20">
        {/* Match Header */}
        <div className="text-center mb-8 shrink-0 relative">
            <div className="flex items-center justify-center gap-2 mb-2 text-fm-accent font-bold uppercase tracking-widest text-xs bg-fm-accent/10 inline-block px-3 py-1 rounded-full border border-fm-accent/20">
                <Trophy size={12} /> {myTeam.league} Matchday
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">
                MATCH LOBBY
            </h1>
            
            {/* DEV TOOLS TOGGLE */}
            {onDevSim && !isTBD && (
                <button 
                    onClick={() => setShowDevTools(!showDevTools)}
                    className="absolute right-0 top-0 p-2 text-fm-muted hover:text-white opacity-20 hover:opacity-100 transition-opacity"
                    title="Developer Tools"
                >
                    <Bug size={16} />
                </button>
            )}
        </div>
        
        {/* DEV TOOLS BAR */}
        {showDevTools && onDevSim && isMatchDay && !isTBD && (
            <div className="bg-fm-card border border-fm-red/50 p-4 rounded-xl mb-6 flex items-center justify-between shadow-xl animate-fade-in">
                <div className="flex items-center gap-2 text-fm-red font-bold uppercase text-xs">
                    <Bug size={16} /> Developer Quick Sim
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => onDevSim('win')}
                        className="bg-fm-green text-black px-4 py-2 rounded font-black uppercase text-xs hover:bg-white transition-colors"
                    >
                        Force Win (13-5)
                    </button>
                    <button 
                        onClick={() => onDevSim('loss')}
                        className="bg-fm-red text-white px-4 py-2 rounded font-black uppercase text-xs hover:bg-red-400 transition-colors"
                    >
                        Force Loss (5-13)
                    </button>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
             
             {/* LEFT: MY TEAM */}
             <div className="lg:col-span-3 bg-fm-card border border-fm-border rounded-xl p-0 overflow-hidden shadow-lg flex flex-col">
                 <div className="p-5 border-b border-fm-border bg-fm-card-hover text-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{myTeam.name}</h2>
                    <div className="text-fm-accent font-bold text-[10px] uppercase tracking-widest mt-1">Rank #{myTeam.rankingPoints}</div>
                 </div>
                 <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {myTeam.players.map(p => <RosterRow key={p.id} player={p} />)}
                 </div>
                 <div className="p-4 bg-fm-bg border-t border-fm-border">
                    <div className="text-[10px] font-bold text-fm-muted uppercase tracking-widest mb-2 text-center">Team Tactics</div>
                    <div className="flex flex-col gap-2">
                         {[Tactic.DEFAULT, Tactic.AGGRESSIVE, Tactic.PASSIVE].map(t => (
                             <button
                                key={t}
                                onClick={() => handleTacticChange(t)}
                                className={`w-full py-2.5 rounded-lg text-[10px] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${selectedTactic === t ? 'bg-fm-accent text-white border-fm-accent shadow-lg' : 'bg-fm-card text-fm-muted border-fm-border hover:bg-fm-card-hover hover:text-white'}`}
                             >
                                 {selectedTactic === t && <Brain size={12} />}
                                 {t}
                             </button>
                         ))}
                    </div>
                 </div>
             </div>

             {/* CENTER: ACTIONS & ANALYSIS */}
             <div className="lg:col-span-6 flex flex-col gap-6">
                {/* VS CARD */}
                <div className="bg-gradient-to-br from-fm-card via-[#1a1520] to-black border border-fm-border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden min-h-[200px]">
                    <div className="absolute inset-0 bg-[url('https://www.hltv.org/img/static/statsmatchmaps/mirage.png')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                    <div className="relative z-10">
                         <div className="flex items-center justify-center gap-12 mb-4">
                             <div className="text-6xl font-black text-white drop-shadow-lg">{myTeam.name.substring(0,3).toUpperCase()}</div>
                             <Swords size={40} className="text-fm-accent animate-pulse" />
                             <div className="text-6xl font-black text-fm-red drop-shadow-lg">
                                 {isTBD ? '???' : opponent.name.substring(0,3).toUpperCase()}
                             </div>
                         </div>
                         <div className="text-fm-muted font-mono text-xs uppercase tracking-widest">Best of 1 • Map Veto Next</div>
                    </div>
                </div>

                {/* ANALYSIS CARD */}
                <div className="bg-fm-card border border-fm-border rounded-xl p-6 flex-1 flex flex-col shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                                <Brain className="text-fm-accent" size={16} /> Tactical Analysis
                            </h3>
                            {analysis && (
                                <span className="text-[10px] font-bold bg-fm-green/20 text-fm-green px-2 py-0.5 rounded border border-fm-green/50 flex items-center gap-1 animate-pulse">
                                    <TrendingUp size={10} /> +2% Win Chance
                                </span>
                            )}
                        </div>
                        {!analysis && !isAnalyzing && !isTBD && (
                            <button 
                                onClick={onAnalyze}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors"
                            >
                                <Search size={12} /> Scout Enemy ($1500)
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-fm-bg rounded-xl border border-fm-border p-4 relative overflow-hidden">
                        {isTBD ? (
                            <div className="flex flex-col items-center justify-center h-full text-fm-muted gap-2">
                                <Lock size={48} className="opacity-10" />
                                <p className="text-sm font-bold">Opponent Pending</p>
                                <p className="text-xs opacity-60">Waiting for other matches to conclude...</p>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-fm-bg/95 z-10">
                                <Loader2 size={40} className="text-fm-accent animate-spin" />
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-white font-mono font-bold text-sm tracking-wider animate-pulse">{loadingText}</span>
                                    <div className="w-32 h-1 bg-fm-card rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-fm-accent animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-4 animate-fade-in h-full overflow-y-auto custom-scrollbar pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-fm-card p-3 rounded border border-fm-border">
                                        <div className="text-[10px] text-fm-muted font-bold uppercase mb-1">Coach Suggests</div>
                                        <div className="text-fm-accent font-black text-lg uppercase">{analysis.suggestedTactic}</div>
                                        <div className="text-[9px] text-gray-500">Best counter to their style.</div>
                                    </div>
                                    <div className="bg-fm-card p-3 rounded border border-fm-border">
                                        <div className="text-[10px] text-fm-muted font-bold uppercase mb-1">Opponent Style</div>
                                        <div className="text-white font-black text-lg uppercase">{analysis.strategy}</div>
                                        <div className="text-[9px] text-gray-500">{analysis.overview}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                     <div>
                                         <div className="text-[10px] font-bold text-fm-green uppercase mb-1 flex items-center gap-1">
                                             <TrendingUp size={10} /> Best Map
                                         </div>
                                         <div className="font-bold text-white">{analysis.bestMap}</div>
                                         <div className="text-[9px] text-gray-500">{analysis.bestMapWinRate}% Proficiency</div>
                                     </div>
                                     <div>
                                         <div className="text-[10px] font-bold text-fm-red uppercase mb-1 flex items-center gap-1">
                                             <AlertTriangle size={10} /> Worst Map
                                         </div>
                                         <div className="font-bold text-white">{analysis.worstMap}</div>
                                         <div className="text-[9px] text-gray-500">{analysis.worstMapWinRate}% Proficiency</div>
                                     </div>
                                </div>
                                
                                <div className="bg-fm-card border border-fm-border p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-fm-bg rounded flex items-center justify-center font-bold text-white border border-fm-border">
                                            {analysis.keyPlayer.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-fm-muted uppercase font-bold">Key Player</div>
                                            <div className="font-bold text-white text-sm">{analysis.keyPlayer}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400 italic">"{analysis.keyPlayerReason}"</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-fm-muted gap-2">
                                <Shield size={48} className="opacity-10" />
                                <p className="text-sm font-bold">Analysis Unavailable</p>
                                <p className="text-xs opacity-60">Scout the enemy to reveal their strategy and key stats.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {isMatchDay && !isTBD ? (
                    <button 
                        onClick={onStartMatch}
                        className="w-full py-5 bg-fm-accent hover:bg-fm-accent-hover text-white font-black text-xl uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(217,70,239,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-4"
                    >
                        <Play size={24} className="fill-current" />
                        Start Veto Phase
                    </button>
                ) : (
                    <div className="w-full py-5 bg-fm-card border border-fm-border text-fm-muted font-bold uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-2 cursor-not-allowed relative overflow-hidden group">
                         <div className="absolute inset-0 bg-stripes opacity-5"></div>
                         <div className="flex items-center gap-2 text-sm">
                            <Lock size={16} /> {isTBD ? 'Awaiting Opponent' : 'Locked'}
                         </div>
                         <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {isTBD ? 'Proceed to Schedule' : `Match Date: ${formattedDate}`}
                         </div>
                    </div>
                )}
             </div>

             {/* RIGHT: ENEMY TEAM */}
             <div className="lg:col-span-3 bg-fm-card border border-fm-border rounded-xl p-0 overflow-hidden shadow-lg flex flex-col">
                 <div className="p-5 border-b border-fm-border bg-fm-card-hover text-center">
                    <h2 className="text-xl font-black text-fm-red uppercase tracking-tight">
                        {isTBD ? 'Awaiting...' : opponent.name}
                    </h2>
                    <div className="text-fm-red/70 font-bold text-[10px] uppercase tracking-widest mt-1">
                        Rank #{opponent.rankingPoints || '---'}
                    </div>
                 </div>
                 <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {isTBD ? (
                        <div className="h-full flex flex-col items-center justify-center text-fm-muted italic text-xs">
                            Opponent TBD
                        </div>
                    ) : (
                        opponent.players.map(p => <RosterRow key={p.id} player={p} isEnemy={true} />)
                    )}
                 </div>
                 <div className="p-4 bg-fm-bg border-t border-fm-border text-center">
                    <div className="text-[10px] font-bold text-fm-muted uppercase tracking-widest mb-2">Enemy Focus</div>
                    <div className="text-sm font-bold text-gray-300 flex items-center justify-center gap-2">
                        {analysis ? (
                            <>
                                <Crosshair size={14} className="text-fm-red" />
                                {analysis.strategy}
                            </>
                        ) : (
                            <>
                                <Shield size={14} /> Hidden
                            </>
                        )}
                    </div>
                 </div>
             </div>

        </div>
    </div>
  );
};
