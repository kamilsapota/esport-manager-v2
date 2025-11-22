import React from 'react';
import { Tournament, Team, ScheduledMatch } from '../types';
import { Trophy, Calendar, Play, ChevronLeft, ChevronRight, Swords, Lock } from 'lucide-react';

interface ScheduleViewProps {
  tournaments: Tournament[];
  currentDate: Date;
  team: Team;
  schedule: ScheduledMatch[];
  onQualify: (tournamentId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ tournaments, currentDate, team, schedule, onQualify }) => {
  
  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && 
             d1.getMonth() === d2.getMonth() && 
             d1.getFullYear() === d2.getFullYear();
  };

  const getMatchForDate = (day: number) => {
      const checkDate = new Date(currentYear, currentMonth, day);
      return schedule.find(m => isSameDay(new Date(m.date), checkDate));
  };

  const getTournamentForDate = (day: number) => {
      const checkDate = new Date(currentYear, currentMonth, day);
      return tournaments.find(t => isSameDay(new Date(t.startDate), checkDate));
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CALENDAR SECTION */}
          <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Calendar className="text-cs-yellow" />
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-gray-400 text-sm">Current Date: <span className="text-white font-bold">{currentDate.toLocaleDateString()}</span></p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-gray-800 rounded text-gray-500 cursor-not-allowed"><ChevronLeft size={20} /></button>
                    <button className="p-2 bg-gray-800 rounded text-gray-500 cursor-not-allowed"><ChevronRight size={20} /></button>
                </div>
              </div>

              <div className="bg-cs-dark border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-800">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="py-3 text-center text-xs font-bold uppercase text-gray-500 tracking-widest">
                              {d}
                          </div>
                      ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 bg-gray-800/50 gap-px">
                      {blanksArray.map(i => (
                          <div key={`blank-${i}`} className="bg-cs-dark h-28 md:h-32"></div>
                      ))}
                      
                      {daysArray.map(day => {
                          const dateObj = new Date(currentYear, currentMonth, day);
                          const isToday = isSameDay(dateObj, currentDate);
                          const match = getMatchForDate(day);
                          const tournament = getTournamentForDate(day);
                          const isPast = dateObj < currentDate && !isToday;

                          return (
                              <div key={day} className={`bg-cs-dark h-28 md:h-32 p-2 relative transition-colors group ${isToday ? 'bg-gray-800 shadow-inner ring-1 ring-inset ring-cs-yellow/50' : 'hover:bg-gray-800'}`}>
                                  <span className={`text-sm font-bold ${isToday ? 'text-cs-yellow' : isPast ? 'text-gray-600' : 'text-gray-300'}`}>
                                      {day}
                                  </span>
                                  
                                  {isToday && (
                                      <span className="absolute top-2 right-2 w-2 h-2 bg-cs-yellow rounded-full animate-pulse"></span>
                                  )}

                                  <div className="mt-2 space-y-1">
                                      {match && (
                                          <div className={`text-[10px] p-1 rounded border truncate flex items-center gap-1 ${
                                              match.isPlayed 
                                                ? 'bg-gray-800 border-gray-700 text-gray-500 line-through' 
                                                : isToday 
                                                    ? 'bg-green-900/30 border-green-500 text-green-400 font-bold' 
                                                    : 'bg-blue-900/20 border-blue-800 text-blue-300'
                                          }`}>
                                              <Swords size={10} />
                                              {match.type === 'LEAGUE' && match.leagueName ? match.leagueName : 'Match Day'}
                                          </div>
                                      )}
                                      {tournament && (
                                          <div className="text-[10px] p-1 rounded border border-yellow-600/50 bg-yellow-900/20 text-yellow-500 truncate flex items-center gap-1">
                                              <Trophy size={10} />
                                              {tournament.name}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* UPCOMING EVENTS LIST */}
          <div className="space-y-6">
              <div className="bg-cs-dark border border-gray-800 rounded-lg p-5 shadow-lg">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy size={18} className="text-gray-400" /> 
                    Major Events
                 </h3>
                 <div className="space-y-3">
                    {tournaments.filter(t => new Date(t.startDate) >= currentDate).slice(0, 5).map(t => {
                        const daysUntil = Math.ceil((new Date(t.startDate).getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
                        return (
                            <div key={t.id} className="bg-gray-900/50 p-3 rounded border border-gray-800">
                                <div className="text-sm font-bold text-gray-200">{t.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500">Prize: ${(t.prizePool/1000)}k</span>
                                    <span className="text-xs font-mono text-cs-yellow">{daysUntil} days</span>
                                </div>
                                {daysUntil > 0 && (
                                     <button 
                                        disabled={true}
                                        className="w-full mt-2 py-1.5 bg-black/40 border border-gray-700 text-xs text-gray-500 rounded cursor-not-allowed uppercase font-bold flex items-center justify-center gap-2 transition-all hover:border-red-900/50 hover:bg-red-900/10"
                                     >
                                        <Lock size={10} /> 
                                        Qualifiers Coming Soon
                                     </button>
                                )}
                            </div>
                        )
                    })}
                    {tournaments.filter(t => new Date(t.startDate) >= currentDate).length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-4">No upcoming majors this season.</div>
                    )}
                 </div>
              </div>

              {/* Upcoming Matches List */}
              <div className="bg-cs-dark border border-gray-800 rounded-lg p-5 shadow-lg">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" /> 
                    Next Matches
                 </h3>
                 <div className="space-y-3">
                    {schedule.filter(m => !m.isPlayed).slice(0, 5).map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-800/50">
                             <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-mono">{new Date(m.date).toLocaleDateString()}</span>
                                <span className="text-sm font-bold text-white">{m.type === 'LEAGUE' ? m.leagueName : 'Match'}</span>
                             </div>
                             <div className="text-[10px] uppercase font-bold bg-gray-800 text-gray-500 px-2 py-1 rounded">Pending</div>
                        </div>
                    ))}
                    {schedule.filter(m => !m.isPlayed).length === 0 && (
                        <div className="text-gray-500 text-xs italic">Season Complete.</div>
                    )}
                 </div>
              </div>
          </div>

      </div>
    </div>
  );
};