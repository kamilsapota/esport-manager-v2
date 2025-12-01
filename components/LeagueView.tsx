

import React from 'react';
import { Team, LeagueRoundResult, SeasonPhase, PlayoffMatch } from '../types';
import { Shield, Calendar, Check, X, Trophy, Swords, Crown, ArrowRight } from 'lucide-react';

interface LeagueViewProps {
    myTeam: Team;
    opponents: Team[];
    roundResults?: LeagueRoundResult[];
    seasonPhase?: SeasonPhase;
    playoffBracket?: PlayoffMatch[];
    onNextSeason?: () => void;
}

export const LeagueView: React.FC<LeagueViewProps> = ({ myTeam, opponents, roundResults, seasonPhase = 'REGULAR', playoffBracket = [], onNextSeason }) => {
  
  const allTeams = [myTeam, ...opponents];
  
  // Sort by Points (DESC), then RD (DESC), then Wins (DESC)
  const sortedTeams = allTeams.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      return b.wins - a.wins;
  });

  const getBracketMatch = (id: string) => playoffBracket.find(m => m.id === id);

  // Helper for bracket rendering
  const MatchNode = ({ matchId }: { matchId: string }) => {
      const match = getBracketMatch(matchId);
      if (!match) return <div className="h-20 w-48 bg-fm-bg/50 border border-fm-border rounded flex items-center justify-center text-xs text-fm-muted">TBD</div>;

      const isMyTeam = match.teamA.id === myTeam.id || match.teamB.id === myTeam.id;
      const winnerId = match.winner?.id;

      return (
          <div className={`w-52 bg-fm-card border rounded overflow-hidden relative ${isMyTeam ? 'border-fm-accent' : 'border-fm-border'}`}>
              <div className={`px-3 py-2 flex justify-between items-center ${winnerId === match.teamA.id ? 'bg-fm-green/10' : ''}`}>
                  <span className={`text-xs font-bold truncate max-w-[120px] ${winnerId === match.teamA.id ? 'text-fm-green' : 'text-white'}`}>{match.teamA.name}</span>
                  <span className="font-mono text-xs font-bold">{match.scoreA ?? '-'}</span>
              </div>
              <div className="h-px bg-fm-border"></div>
              <div className={`px-3 py-2 flex justify-between items-center ${winnerId === match.teamB.id ? 'bg-fm-green/10' : ''}`}>
                  <span className={`text-xs font-bold truncate max-w-[120px] ${winnerId === match.teamB.id ? 'text-fm-green' : 'text-white'}`}>{match.teamB.name}</span>
                  <span className="font-mono text-xs font-bold">{match.scoreB ?? '-'}</span>
              </div>
              {match.isPlayed && !match.winner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-white">LIVE</div>}
          </div>
      );
  };

  // Check if user is eliminated or season is over
  const isUserEliminated = React.useMemo(() => {
      if (seasonPhase !== 'PLAYOFFS') return false;
      // Find the last match the user played
      const userMatches = playoffBracket.filter(m => (m.teamA.id === myTeam.id || m.teamB.id === myTeam.id) && m.isPlayed);
      if (userMatches.length === 0) return false;
      
      // Check if they lost any of them
      const lostMatch = userMatches.find(m => m.winner?.id !== myTeam.id);
      return !!lostMatch;
  }, [playoffBracket, myTeam.id, seasonPhase]);

  const isSeasonOver = isUserEliminated || (playoffBracket.find(m => m.round === 'F')?.isPlayed);

  return (
    <div className="p-6 w-full max-w-7xl mx-auto animate-fade-in pb-24">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-fm-card border border-fm-border rounded-xl flex items-center justify-center shadow-lg">
             <Trophy className="text-fm-accent" size={32} />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white">
                  {seasonPhase === 'PLAYOFFS' ? `${myTeam.league} Playoffs` : myTeam.league}
              </h2>
              <p className="text-fm-muted text-sm">
                  {seasonPhase === 'PLAYOFFS' ? 'Single Elimination Bracket. Winner Promotes.' : 'Current season standings. Top 8 teams advance to playoffs.'}
              </p>
          </div>
      </div>

      {seasonPhase === 'PLAYOFFS' ? (
          <div className="flex flex-col gap-8">
            <div className="bg-fm-card border border-fm-border rounded-xl p-8 overflow-x-auto">
                <div className="min-w-[800px] flex justify-between items-center relative">
                    {/* QUARTER FINALS */}
                    <div className="space-y-8 relative z-10">
                        <div className="text-center text-[10px] font-bold text-fm-muted uppercase mb-4">Quarter Finals</div>
                        <div className="space-y-4">
                            <MatchNode matchId="qf-1" /> {/* 1 vs 8 */}
                            <MatchNode matchId="qf-2" /> {/* 4 vs 5 */}
                        </div>
                        <div className="h-8"></div>
                        <div className="space-y-4">
                            <MatchNode matchId="qf-3" /> {/* 3 vs 6 */}
                            <MatchNode matchId="qf-4" /> {/* 2 vs 7 */}
                        </div>
                    </div>

                    {/* SEMI FINALS */}
                    <div className="space-y-24 relative z-10 pt-8">
                        <div className="text-center text-[10px] font-bold text-fm-muted uppercase mb-4 absolute -top-10 w-full">Semi Finals</div>
                        <div className="space-y-4">
                            <MatchNode matchId="sf-1" />
                            <MatchNode matchId="sf-2" />
                        </div>
                    </div>

                    {/* FINAL */}
                    <div className="space-y-4 relative z-10 pt-4">
                        <div className="text-center text-[10px] font-bold text-fm-muted uppercase mb-4 absolute -top-6 w-full">Grand Final</div>
                        <div className="flex flex-col items-center">
                            <Crown size={32} className="text-fm-yellow mb-2 animate-bounce" />
                            <MatchNode matchId="f-1" />
                            <div className="mt-2 text-[10px] text-fm-green font-bold uppercase tracking-widest">Promotion Match</div>
                        </div>
                    </div>

                    {/* CONNECTORS (CSS Lines) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none text-fm-border" style={{zIndex: 0}}>
                        {/* QF to SF Top */}
                        <path d="M 210 50 L 250 50 L 250 140 L 380 140" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 210 130 L 250 130 L 250 140" fill="none" stroke="currentColor" strokeWidth="2" />
                        
                        {/* QF to SF Bottom */}
                        <path d="M 210 250 L 250 250 L 250 340 L 380 340" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 210 330 L 250 330 L 250 340" fill="none" stroke="currentColor" strokeWidth="2" />

                        {/* SF to Final */}
                        <path d="M 590 140 L 630 140 L 630 240 L 680 240" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 590 340 L 630 340 L 630 240" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </div>
            </div>

            {/* ACTION BUTTON FOR NEXT SEASON */}
            {isSeasonOver && onNextSeason && (
                <div className="fixed bottom-0 left-64 right-0 p-6 bg-black/80 backdrop-blur-md border-t border-fm-border flex justify-center z-50 animate-slide-in-right">
                    <button 
                        onClick={onNextSeason}
                        className="bg-fm-accent hover:bg-fm-accent-hover text-white font-black uppercase px-12 py-4 rounded-full shadow-[0_0_30px_rgba(217,70,239,0.5)] transition-all hover:scale-105 flex items-center gap-3 text-lg tracking-widest"
                    >
                        Start Next Season <ArrowRight size={24} />
                    </button>
                </div>
            )}
          </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* STANDINGS */}
            <div className="lg:col-span-2 bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-lg">
                <div className="bg-fm-card-hover px-4 py-3 border-b border-fm-border">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                        <Shield size={14} className="text-fm-accent" /> Season Standings
                    </h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-fm-bg/50 text-left border-b border-fm-border">
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider w-16 text-center">Rank</th>
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider">Team</th>
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">M</th>
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">W-L</th>
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">RD</th>
                            <th className="p-4 text-[10px] font-bold text-fm-muted uppercase tracking-wider text-center">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTeams.map((team, idx) => {
                            const isMyTeam = team.id === myTeam.id;
                            const isPlayoffSpot = idx < 8;
                            return (
                                <tr key={team.id} className={`border-b border-fm-border/50 transition-colors ${isMyTeam ? 'bg-fm-accent/10' : 'hover:bg-fm-card-hover'}`}>
                                    <td className="p-3 text-center font-mono text-sm text-fm-muted relative">
                                        {idx + 1}
                                        {isPlayoffSpot && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-fm-green"></div>}
                                    </td>
                                    <td className="p-3">
                                        <div className={`font-bold text-sm ${isMyTeam ? 'text-fm-accent' : 'text-white'}`}>
                                            {team.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-gray-400 font-mono text-sm">
                                        {team.matchesPlayed}
                                    </td>
                                    <td className="p-3 text-center text-gray-400 font-mono text-sm">
                                        <span className="text-fm-green">{team.wins}</span> - <span className="text-fm-red">{team.losses}</span>
                                    </td>
                                    <td className={`p-3 text-center font-mono text-sm ${team.roundDifference > 0 ? 'text-fm-green' : team.roundDifference < 0 ? 'text-fm-red' : 'text-gray-400'}`}>
                                        {team.roundDifference > 0 ? '+' : ''}{team.roundDifference}
                                    </td>
                                    <td className="p-3 text-center font-black text-white font-mono text-base">
                                        {team.leaguePoints}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* RIGHT: Latest Matches */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-fm-card border border-fm-border rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-fm-card-hover px-4 py-3 border-b border-fm-border flex items-center gap-2">
                        <Calendar size={14} className="text-fm-accent" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white">Latest Results</h3>
                    </div>
                    <div className="p-0">
                        {roundResults && roundResults.length > 0 ? (
                            <div className="divide-y divide-fm-border/50">
                                {roundResults.map((match, idx) => {
                                    const isUserMatch = match.teamA === myTeam.name || match.teamB === myTeam.name;
                                    return (
                                        <div key={idx} className={`p-3 text-sm ${isUserMatch ? 'bg-fm-accent/5' : ''}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold truncate w-5/12 text-right ${match.winner === match.teamA ? 'text-fm-green' : 'text-fm-muted'}`}>
                                                    {match.teamA}
                                                </span>
                                                <div className="w-2/12 text-center bg-fm-bg border border-fm-border rounded px-1 py-0.5 font-mono text-white text-xs mx-1">
                                                    {match.scoreA} : {match.scoreB}
                                                </div>
                                                <span className={`font-bold truncate w-5/12 text-left ${match.winner === match.teamB ? 'text-fm-green' : 'text-fm-muted'}`}>
                                                    {match.teamB}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-fm-muted text-sm italic">
                                No matches played yet this season.
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-fm-bg/50 border border-fm-border p-4 rounded-xl">
                    <h4 className="text-white font-bold mb-2 text-xs uppercase tracking-wide">Competition Format</h4>
                    <p className="text-xs text-fm-muted leading-relaxed">
                        Teams play a round-robin format (15 Matches). Top 8 teams advance to playoffs. Only 1 team wins promotion to the next division.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};