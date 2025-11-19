import React from 'react';
import { Tournament, Team } from '../types';
import { Trophy, Calendar, AlertCircle, CheckCircle, XCircle, Play } from 'lucide-react';

interface ScheduleViewProps {
  tournaments: Tournament[];
  currentDate: Date;
  team: Team;
  onQualify: (tournamentId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ tournaments, currentDate, team, onQualify }) => {
  
  // Helper to check if a date is passed
  const isPast = (dateStr: string) => new Date(dateStr) < currentDate;
  
  // Helper to format currency
  const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <div className="p-6 w-full max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Tournament Schedule</h2>
        <p className="text-gray-400">Compete in qualifiers to earn your spot in major events.</p>
      </div>

      <div className="space-y-4">
        {tournaments.map((t) => {
          const tournamentDate = new Date(t.startDate);
          const daysUntil = Math.ceil((tournamentDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
          const isTournamentPast = isPast(t.startDate);

          let StatusBadge;
          let ActionButton = null;

          if (t.participationStatus === 'invited') {
            StatusBadge = (
              <div className="flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-900/50 text-xs font-bold uppercase">
                <Trophy size={12} /> Invited
              </div>
            );
          } else if (t.participationStatus === 'qualified') {
            StatusBadge = (
              <div className="flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-900/50 text-xs font-bold uppercase">
                <CheckCircle size={12} /> Qualified
              </div>
            );
          } else if (t.participationStatus === 'eliminated') {
            StatusBadge = (
              <div className="flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50 text-xs font-bold uppercase">
                <XCircle size={12} /> Failed Qual
              </div>
            );
          } else if (isTournamentPast) {
             StatusBadge = (
              <div className="text-gray-600 text-xs font-bold uppercase">Concluded</div>
             );
          } else {
             StatusBadge = (
                <div className="text-gray-500 text-xs font-bold uppercase">Open Qualifier</div>
             );
             
             // Can only qualify if roster is full and event hasn't started
             if (team.players.length === 5 && daysUntil > 0 && daysUntil < 60) { // Open qualifiers 2 months before
                 ActionButton = (
                    <button 
                        onClick={() => onQualify(t.id)}
                        className="flex items-center gap-2 bg-cs-blue hover:bg-blue-600 text-white text-xs font-bold uppercase px-4 py-2 rounded transition-colors"
                    >
                        <Play size={14} /> Play Qualifier
                    </button>
                 );
             }
          }

          return (
            <div key={t.id} className={`bg-cs-dark border ${t.participationStatus === 'invited' || t.participationStatus === 'qualified' ? 'border-cs-yellow/50' : 'border-gray-800'} rounded-lg p-5 flex flex-col md:flex-row items-center gap-6 hover:border-gray-600 transition-all relative overflow-hidden`}>
               {/* Date Block */}
               <div className="flex flex-col items-center justify-center bg-gray-900/50 p-3 rounded w-20 text-center border border-gray-800 shrink-0">
                  <span className="text-xs text-gray-500 uppercase">{tournamentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-2xl font-bold text-white">{tournamentDate.getDate()}</span>
                  <span className="text-xs text-gray-600">{tournamentDate.getFullYear()}</span>
               </div>

               {/* Info Block */}
               <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                     <h3 className="text-xl font-bold text-gray-100">{t.name}</h3>
                     {StatusBadge}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 justify-center md:justify-start">
                     <div className="flex items-center gap-1">
                        <Trophy size={14} className="text-yellow-600" />
                        <span>Prize Pool: <span className="text-white font-mono">{formatMoney(t.prizePool)}</span></span>
                     </div>
                     <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{daysUntil > 0 ? `Starts in ${daysUntil} days` : 'Event has passed'}</span>
                     </div>
                  </div>
               </div>

               {/* Action Block */}
               <div>
                  {ActionButton}
                  {!ActionButton && team.players.length < 5 && !isTournamentPast && t.participationStatus === 'none' && (
                      <span className="text-xs text-gray-600 italic">Full roster needed</span>
                  )}
               </div>

               {/* Decorative background glow for major events */}
               {t.prizePool >= 1000000 && (
                   <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};