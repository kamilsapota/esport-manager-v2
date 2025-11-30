import React, { useState } from 'react';
import { Team, ScheduledMatch, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { Trophy, Calendar, TrendingUp, Mail, AlertCircle, Crosshair, X, Search, Info } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface DashboardProps {
  team: Team;
  nextScheduledMatch?: ScheduledMatch;
  nextOpponent: Team | null;
  leagueRank: number;
  leagueOpponents: Team[];
  onPlayMatch: () => void;
  onViewLeague: () => void;
  isAnalyzing: boolean;
  messages: Array<{id: number, subject: string, sender: string, read: boolean, body?: string, date: string}>;
  onMarkMessageRead: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    team, 
    nextScheduledMatch, 
    nextOpponent, 
    leagueRank, 
    leagueOpponents,
    onPlayMatch,
    onViewLeague,
    isAnalyzing,
    messages,
    onMarkMessageRead
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<{id: number, subject: string, sender: string, body?: string, date: string} | null>(null);
  
  // Helper for FM-style card
  const WidgetCard = ({ title, icon: Icon, children, className = '', action }: any) => (
      <div className={`bg-fm-card border border-fm-border rounded-xl overflow-hidden flex flex-col ${className}`}>
          <div className="px-4 py-3 bg-fm-card-hover border-b border-fm-border flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-fm-accent">
                  <Icon size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">{title}</h3>
              </div>
              {action}
          </div>
          <div className="p-4 flex-1 overflow-auto custom-scrollbar relative">
              {children}
          </div>
      </div>
  );

  // Calculate Real Team Stats
  const calculateAvgRating = () => {
      if (team.players.length === 0) return 0;
      const totalStats = team.players.reduce((acc: number, p) => {
          const avgP = (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility + p.stats.teamwork + p.stats.clutch) / 6;
          return acc + avgP;
      }, 0);
      return (totalStats / team.players.length).toFixed(1);
  };

  const calculateMapMastery = () => {
      const maps = Object.values(team.mapStats) as number[];
      if (maps.length === 0) return 0;
      const total = maps.reduce((acc, val) => acc + val, 0);
      return (total / maps.length).toFixed(0);
  };

  const avgRating = calculateAvgRating();
  const mapMastery = calculateMapMastery();

  // Prepare Mini League Table
  // Combine myTeam and opponents, sort, take slice around my rank
  const allTeams = [team, ...leagueOpponents].sort((a, b) => {
       if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
       return b.roundDifference - a.roundDifference;
  });
  
  const myIndex = allTeams.findIndex(t => t.id === team.id);
  // Show top 5 if I am high, or slice around me
  let tableSlice = allTeams.slice(0, 5);
  if (myIndex > 3) {
      tableSlice = allTeams.slice(myIndex - 2, myIndex + 3);
  }

  const getFormattedName = (p: Player) => {
      const names = p.fullName.split(' ');
      return `${names[0]} "${p.alias}" ${names.slice(1).join(' ')}`;
  };

  const handleAcknowledgeMessage = () => {
      if (selectedMessage) {
          onMarkMessageRead(selectedMessage.id);
          setSelectedMessage(null);
      }
  };

  return (
    <div className="h-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
        
        {/* COLUMN 1: INBOX & REPORT (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
            <WidgetCard title="Inbox" icon={Mail} className="flex-1 min-h-[300px]">
                <div className="space-y-1">
                    {messages.length > 0 ? messages.map((msg, idx) => (
                        <div key={idx} onClick={() => setSelectedMessage(msg)} className={`p-3 rounded cursor-pointer transition-colors border-l-2 ${msg.read ? 'bg-transparent border-transparent hover:bg-fm-bg' : 'bg-fm-bg border-fm-accent hover:bg-black/20'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-fm-muted uppercase">{msg.sender}</span>
                                    <span className="text-[9px] text-gray-600 font-mono">{msg.date}</span>
                                </div>
                                {!msg.read && <div className="w-2 h-2 rounded-full bg-fm-accent mt-1"></div>}
                            </div>
                            <div className={`text-xs mt-1 ${msg.read ? 'text-gray-400' : 'text-white font-bold'}`}>{msg.subject}</div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-600 py-10 text-xs italic">No new messages</div>
                    )}
                </div>
            </WidgetCard>

            <WidgetCard title="Team Report" icon={TrendingUp} className="h-auto">
                 <div className="space-y-4">
                     <div>
                         <div className="flex justify-between text-xs mb-1">
                             <span className="text-fm-muted">Avg Rating</span>
                             <span className="text-white font-bold">{avgRating} / 99</span>
                         </div>
                         <div className="w-full h-1.5 bg-fm-bg rounded-full overflow-hidden">
                             <div className="h-full bg-fm-accent" style={{ width: `${avgRating}%` }}></div>
                         </div>
                     </div>
                     <div>
                         <div className="flex justify-between text-xs mb-1">
                             <span className="text-fm-muted">Map Pool Depth</span>
                             <span className="text-white font-bold">{mapMastery}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-fm-bg rounded-full overflow-hidden">
                             <div className="h-full bg-fm-yellow" style={{ width: `${mapMastery}%` }}></div>
                         </div>
                     </div>
                     <div className="pt-2 border-t border-fm-border/50">
                        <div className="flex justify-between text-xs">
                             <span className="text-fm-muted">Roster Size</span>
                             <span className="text-white font-bold">{team.players.length} / 5</span>
                         </div>
                     </div>
                 </div>
            </WidgetCard>
        </div>

        {/* COLUMN 2: MAIN ACTION & NEXT MATCH (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* NEXT FIXTURE HERO */}
            <div className="bg-gradient-to-br from-fm-card to-[#231a2e] border border-fm-border rounded-xl p-0 overflow-hidden shadow-2xl relative min-h-[280px] flex flex-col">
                <div className="absolute top-0 right-0 p-32 bg-fm-accent blur-[120px] opacity-10 rounded-full pointer-events-none"></div>
                
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-fm-accent" size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest text-white">Next Fixture</span>
                    </div>
                    {nextScheduledMatch && (
                        <span className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-gray-300">
                             {new Date(nextScheduledMatch.date).toLocaleDateString()}
                        </span>
                    )}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                    {nextScheduledMatch ? (
                        <>
                            <div className="flex items-center justify-center gap-8 md:gap-16 w-full mb-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-fm-bg rounded-full flex items-center justify-center border-4 border-fm-card shadow-xl mb-3">
                                        <span className="text-2xl font-black text-fm-accent">US</span>
                                    </div>
                                    <div className="text-xl font-black text-white uppercase tracking-tight">{team.name}</div>
                                </div>
                                
                                <div className="flex flex-col items-center gap-1">
                                    <div className="text-4xl font-black text-white italic">VS</div>
                                    <div className="text-[10px] uppercase font-bold text-fm-muted bg-fm-bg px-2 py-1 rounded">
                                        {nextScheduledMatch.type === 'LEAGUE' ? nextScheduledMatch.leagueName : 'Tournament'}
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-fm-bg rounded-full flex items-center justify-center border-4 border-fm-card shadow-xl mb-3">
                                        <span className="text-2xl font-black text-red-500">{nextOpponent?.name.substring(0,2) || "?"}</span>
                                    </div>
                                    <div className="text-xl font-black text-white uppercase tracking-tight">{nextOpponent?.name || "TBD"}</div>
                                </div>
                            </div>

                            <button 
                                onClick={onPlayMatch}
                                disabled={isAnalyzing}
                                className={`w-full max-w-md py-4 font-black uppercase tracking-widest rounded transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3
                                    ${isAnalyzing 
                                        ? 'bg-fm-card text-gray-500 cursor-not-allowed border border-fm-border' 
                                        : 'bg-fm-accent hover:bg-fm-accent-hover text-white shadow-purple-900/30'}`}
                            >
                                <Crosshair size={20} />
                                Go To Match Lobby
                            </button>
                        </>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold">No upcoming fixtures.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SQUAD STATUS */}
            <WidgetCard title="Active Roster" icon={AlertCircle} className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {team.players.map(p => {
                         // Determine Display Rating: Use history if available, otherwise show placeholder
                         let displayRating = "-.--";
                         if (p.matchHistory && p.matchHistory.length > 0) {
                             const totalRating = p.matchHistory.reduce((acc, m) => acc + m.rating, 0);
                             displayRating = (totalRating / p.matchHistory.length).toFixed(2);
                         }
                         
                         const ratingValue = parseFloat(displayRating);
                         const ratingColor = isNaN(ratingValue) 
                            ? 'text-white' 
                            : ratingValue > 1.1 
                                ? 'text-fm-green' 
                                : ratingValue < 0.9 
                                    ? 'text-fm-red' 
                                    : 'text-white';
                         
                         return (
                             <div 
                                key={p.id} 
                                onClick={() => setSelectedPlayer(p)}
                                className="bg-fm-bg p-3 rounded border border-fm-border flex items-center gap-3 hover:border-fm-accent cursor-pointer transition-all hover:bg-gray-800 group"
                            >
                                 <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative ${p.morale < 50 ? 'bg-red-900/20 text-red-500' : 'bg-fm-card text-gray-300 border border-fm-border'}`}>
                                     {p.imageUrl ? (
                                         <img src={p.imageUrl} alt={p.alias} className="w-full h-full object-cover" />
                                     ) : (
                                         p.alias.charAt(0)
                                     )}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                         <CountryFlag countryCode={p.country} />
                                         <div className="text-sm font-bold text-white truncate group-hover:text-fm-accent">{p.alias}</div>
                                     </div>
                                     <div className="text-[10px] text-gray-500 font-medium truncate flex items-center gap-2">
                                         <span>{p.age} y/o</span>
                                     </div>
                                     <div className="flex items-center gap-2 mt-1">
                                         <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                             p.role.includes('IGL') ? 'bg-yellow-900/30 text-yellow-500' : 
                                             p.role.includes('AWP') ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-400'
                                         }`}>
                                             {p.role}
                                         </div>
                                         {p.morale < 60 && <span className="text-[9px] text-red-400 font-bold">⚠ LOW MORALE</span>}
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-[10px] text-fm-muted uppercase">Rating</div>
                                     <div className={`text-sm font-mono font-bold ${ratingColor}`}>
                                         {displayRating}
                                     </div>
                                 </div>
                             </div>
                         )
                     })}
                     {team.players.length < 5 && (
                         <div className="border border-dashed border-fm-border rounded flex flex-col items-center justify-center p-4 text-fm-muted hover:text-white hover:border-fm-accent cursor-pointer transition-colors">
                             <span className="text-2xl mb-1">+</span>
                             <span className="text-xs font-bold uppercase">Sign Player</span>
                         </div>
                     )}
                </div>
            </WidgetCard>

        </div>

        {/* COLUMN 3: LEAGUE & INFO (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
            <WidgetCard title="League Table" icon={Trophy} className="flex-1">
                 <div className="grid grid-cols-2 gap-2 mb-3">
                     <div className="bg-fm-bg rounded border border-fm-border p-2 text-center">
                         <div className="text-[10px] uppercase font-bold text-fm-muted">Rank</div>
                         <div className="text-2xl font-black text-white">{leagueRank}<span className="text-xs align-top opacity-50">th</span></div>
                     </div>
                     <div className="bg-fm-bg rounded border border-fm-border p-2 text-center">
                         <div className="text-[10px] uppercase font-bold text-fm-muted">Season Progress</div>
                         <div className="text-2xl font-black text-white">{team.matchesPlayed}<span className="text-gray-500 text-lg">/15</span></div>
                     </div>
                 </div>
                 
                 <div className="overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-fm-muted border-b border-fm-border">
                                <th className="py-2 text-left pl-2">#</th>
                                <th className="py-2 text-left">Team</th>
                                <th className="py-2 text-right pr-2">Pts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-fm-border/50">
                            {tableSlice.map((t, i) => {
                                const realRank = allTeams.findIndex(x => x.id === t.id) + 1;
                                const isMe = t.id === team.id;
                                return (
                                    <tr key={t.id} className={isMe ? "bg-fm-accent/20" : ""}>
                                        <td className={`py-2 font-mono pl-2 ${isMe ? 'text-fm-accent font-bold' : 'text-gray-500'}`}>{realRank}</td>
                                        <td className={`py-2 font-bold truncate max-w-[80px] ${isMe ? 'text-white' : 'text-gray-400'}`}>{t.name}</td>
                                        <td className="py-2 text-right font-mono pr-2 text-white">{t.leaguePoints}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                 </div>
                 <button 
                    onClick={onViewLeague}
                    className="w-full mt-4 py-2 text-xs font-bold text-fm-muted hover:text-white border border-fm-border rounded hover:bg-fm-bg transition-colors"
                >
                     View Full Table
                 </button>
            </WidgetCard>
        </div>

        {/* MESSAGE MODAL */}
        {selectedMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMessage(null)}>
                <div className="max-w-2xl w-full bg-fm-card border border-fm-border rounded-xl shadow-2xl relative overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="bg-fm-card-hover p-4 flex justify-between items-center border-b border-fm-border">
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-fm-accent" />
                            <span className="text-sm font-bold uppercase tracking-widest text-white">{selectedMessage.subject}</span>
                        </div>
                        <button onClick={() => setSelectedMessage(null)} className="text-fm-muted hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-8 bg-fm-bg max-h-[600px] overflow-y-auto custom-scrollbar">
                        <div className="flex gap-4 mb-6">
                            <div className="w-12 h-12 bg-fm-card border border-fm-border rounded-full flex items-center justify-center text-fm-accent shrink-0">
                                <Info size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                     <h3 className="text-lg font-black text-white italic uppercase mb-1">{selectedMessage.subject}</h3>
                                     <div className="text-right">
                                         <span className="text-[10px] font-bold text-fm-muted uppercase border border-fm-border px-2 py-0.5 rounded block mb-1">{selectedMessage.sender}</span>
                                         <span className="text-[10px] font-mono text-gray-600">{selectedMessage.date}</span>
                                     </div>
                                </div>
                                <div 
                                    className="text-sm text-gray-400 leading-relaxed mt-2 prose prose-invert max-w-none prose-p:mb-4 prose-ul:mb-4"
                                    dangerouslySetInnerHTML={{ __html: selectedMessage.body || "No content." }} 
                                />
                            </div>
                        </div>
                        
                        {/* Conditionally render roster view only if it's the scouting message (id 4) */}
                        {selectedMessage.id === 4 && (
                             <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden mt-6">
                                <div className="bg-fm-card-hover px-4 py-2 text-[10px] font-bold uppercase text-fm-muted tracking-wider border-b border-fm-border">
                                    Scouting Report • Initial Intake
                                </div>
                                <div className="divide-y divide-fm-border/50">
                                    {team.players.map(p => (
                                        <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-fm-bg rounded flex items-center justify-center font-bold text-xs text-gray-500 border border-fm-border overflow-hidden relative">
                                                    {p.imageUrl ? (
                                                        <img src={p.imageUrl} alt={p.alias} className="w-full h-full object-cover" />
                                                    ) : (
                                                        p.alias.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{getFormattedName(p)}</div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <CountryFlag countryCode={p.country} />
                                                        <span>{p.age} years old</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-xs font-bold uppercase px-2 py-1 rounded border ${
                                                p.role.includes('IGL') ? 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50' : 
                                                p.role.includes('AWP') ? 'bg-red-900/20 text-red-500 border-red-900/50' : 'bg-blue-900/20 text-blue-400 border-blue-900/50'
                                            }`}>
                                                {p.role}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button onClick={handleAcknowledgeMessage} className="px-6 py-2 bg-fm-accent hover:bg-fm-accent-hover text-white font-bold uppercase text-xs rounded">
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PLAYER MODAL */}
        {selectedPlayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
                <div className="max-w-sm w-full bg-cs-darker border border-gray-700 rounded-xl shadow-2xl relative overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="bg-gray-900 p-3 flex justify-between items-center border-b border-gray-800">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Player Details</span>
                        <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 bg-cs-darker">
                        <PlayerCard player={selectedPlayer} isCompact={false} showTeamwork={true} />
                        <div className="mt-4 text-center pt-4 border-t border-gray-800">
                           <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Weekly Wage</div>
                           <div className="text-xl font-mono font-bold text-white">${selectedPlayer.salary.toLocaleString()}/wk</div>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};