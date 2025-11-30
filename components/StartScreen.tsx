import React, { useState } from 'react';
import { Crosshair, Trophy, PlusCircle, Globe, ChevronLeft } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface StartScreenProps {
  onStartGame: (teamName: string, country: string) => void;
}

const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FR', name: 'France' },
    { code: 'SE', name: 'Sweden' },
    { code: 'BR', name: 'Brazil' },
    { code: 'RU', name: 'Russia' },
    { code: 'PL', name: 'Poland' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'DE', name: 'Germany' },
    { code: 'FI', name: 'Finland' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'CN', name: 'China' },
    { code: 'ES', name: 'Spain' },
];

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [step, setStep] = useState<'MODE_SELECTION' | 'CREATE_TEAM'>('MODE_SELECTION');
  const [teamName, setTeamName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('US');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length > 0) {
      onStartGame(teamName, selectedCountry);
    }
  };

  if (step === 'MODE_SELECTION') {
      return (
          <div className="w-full h-full bg-fm-bg flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fm-card/50 via-fm-bg to-black opacity-60"></div>
              
              <div className="relative z-10 max-w-4xl w-full animate-fade-in">
                  <div className="text-center mb-12">
                      <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 bg-fm-accent rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(217,70,239,0.3)] border-4 border-white/10">
                            <Crosshair size={48} className="text-white" />
                        </div>
                      </div>
                      <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter mb-4">
                          SELECT GAME MODE
                      </h1>
                      <div className="h-1 w-24 bg-fm-accent mx-auto rounded-full"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                      {/* OPTION 1: CREATE CLUB */}
                      <button 
                          onClick={() => setStep('CREATE_TEAM')}
                          className="bg-fm-card border border-fm-border hover:border-fm-accent group p-8 rounded-2xl text-left transition-all hover:shadow-[0_0_30px_rgba(217,70,239,0.2)] hover:-translate-y-1 relative overflow-hidden"
                      >
                          <div className="absolute top-0 right-0 p-24 bg-fm-accent blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity"></div>
                          <div className="w-16 h-16 bg-fm-accent rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                              <PlusCircle size={32} className="text-white" />
                          </div>
                          <h2 className="text-2xl font-black text-white italic uppercase mb-2">Create Your Club</h2>
                          <p className="text-fm-muted text-sm leading-relaxed">
                              Start from scratch in ESEA Open. Scout unknown talents, manage finances, and climb the ladder to the Major.
                          </p>
                          <div className="mt-6 flex items-center gap-2 text-fm-accent font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                              Start Career <ChevronLeft className="rotate-180" size={14} />
                          </div>
                      </button>

                      {/* OPTION 2: REAL TEAM */}
                      <button 
                          disabled
                          className="bg-fm-bg border border-fm-border p-8 rounded-2xl text-left relative overflow-hidden opacity-60 cursor-not-allowed grayscale"
                      >
                          <div className="absolute inset-0 bg-stripes opacity-5"></div>
                          <div className="w-16 h-16 bg-fm-card border border-fm-border rounded-xl flex items-center justify-center mb-6">
                              <Globe size={32} className="text-gray-500" />
                          </div>
                          <div className="flex justify-between items-start">
                              <h2 className="text-2xl font-black text-gray-400 italic uppercase mb-2">Real Team</h2>
                              <span className="bg-fm-card border border-fm-border px-2 py-1 text-[9px] font-bold text-gray-500 uppercase rounded">Coming Soon</span>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed">
                              Take control of an existing powerhouse like FaZe, Vitality, or G2. Manage superstars and win trophies immediately.
                          </p>
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  // CREATE TEAM SCREEN
  return (
    <div className="w-full h-full bg-fm-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fm-card/50 via-fm-bg to-black opacity-60"></div>
      
      <div className="relative z-10 w-full max-w-2xl bg-fm-card border border-fm-border rounded-2xl shadow-2xl p-8 animate-fade-in">
        
        <button 
            onClick={() => setStep('MODE_SELECTION')}
            className="absolute top-8 left-8 text-fm-muted hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"
        >
            <ChevronLeft size={16} /> Back
        </button>

        <div className="text-center mb-8 mt-4">
             <div className="w-16 h-16 bg-fm-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.3)] mx-auto mb-4 border-2 border-white/10">
                <Trophy size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black italic text-white tracking-tighter mb-2">TEAM CREATION</h1>
            <p className="text-fm-muted text-sm">Define your identity.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 max-w-md mx-auto">
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Team Name</label>
                <input 
                    type="text" 
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Astralis"
                    className="w-full bg-fm-bg border border-fm-border rounded-lg px-4 py-3 text-white font-bold placeholder-gray-700 focus:border-fm-accent focus:ring-1 focus:ring-fm-accent outline-none transition-all"
                    autoFocus
                />
            </div>

            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Region</label>
                <div className="grid grid-cols-5 gap-2">
                    {COUNTRIES.map(c => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => setSelectedCountry(c.code)}
                            className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${selectedCountry === c.code ? 'bg-fm-accent/20 border-fm-accent ring-1 ring-fm-accent/50' : 'bg-fm-bg border-fm-border hover:border-gray-500 opacity-60 hover:opacity-100'}`}
                            title={c.name}
                        >
                            <CountryFlag countryCode={c.code} className="h-4 w-auto" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4">
                <button 
                    type="submit" 
                    disabled={!teamName.trim()}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2
                        ${teamName.trim() 
                            ? 'bg-fm-accent hover:bg-fm-accent-hover text-white shadow-lg hover:shadow-purple-500/30 hover:-translate-y-1' 
                            : 'bg-fm-bg border border-fm-border text-gray-600 cursor-not-allowed'}`
                    }
                >
                    Sign Contract & Begin
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};