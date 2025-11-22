import React, { useState } from 'react';
import { Trophy, Lock, UserPlus, Globe, ChevronRight, Shield, Play } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface StartScreenProps {
    onStartGame: (teamName: string, country: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
    const [mode, setMode] = useState<'none' | 'create' | 'manage'>('none');
    const [teamName, setTeamName] = useState('');
    const [country, setCountry] = useState('US');

    const countries = [
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (teamName.trim()) {
            onStartGame(teamName, country);
        }
    };

    return (
        <div className="w-full min-h-screen bg-fm-bg flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-fm-accent/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-blue-600/5 blur-[120px] pointer-events-none"></div>
            
            <div className="relative z-10 max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-black tracking-tighter italic text-white mb-2 drop-shadow-lg">
                        <span className="text-fm-accent">CS</span>:MANAGER
                    </h1>
                    <p className="text-xl text-fm-muted font-light tracking-wide">The Ultimate AI-Powered Esports Simulator</p>
                </div>

                {mode === 'none' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Team Option */}
                        <button 
                            onClick={() => setMode('create')}
                            className="group bg-fm-card border border-fm-border hover:border-fm-accent p-8 rounded-2xl transition-all shadow-xl hover:shadow-[0_0_30px_rgba(217,70,239,0.2)] text-left relative overflow-hidden w-full"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <UserPlus size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-fm-accent/10 rounded-xl flex items-center justify-center text-fm-accent mb-6 group-hover:scale-110 transition-transform">
                                    <UserPlus size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Create New Team</h2>
                                <p className="text-fm-muted mb-6 text-sm leading-relaxed">Start from scratch in the Open League. Draft your own roster and climb the ranks to glory.</p>
                                <div className="flex items-center text-fm-accent font-bold uppercase tracking-widest text-sm group-hover:translate-x-1 transition-transform">
                                    Start Career <ChevronRight className="ml-1" size={16} />
                                </div>
                            </div>
                        </button>

                        {/* Existing Team Option (Locked) */}
                        <div className="bg-fm-card/50 border border-fm-border/50 p-8 rounded-2xl relative overflow-hidden w-full">
                             <div className="absolute inset-0 flex items-center justify-center z-20 bg-fm-bg/60 backdrop-blur-[1px]">
                                <div className="flex items-center gap-2 text-fm-muted bg-fm-card px-4 py-2 rounded-full border border-fm-border">
                                    <Lock size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Coming Soon</span>
                                </div>
                             </div>
                             <div className="relative z-10 opacity-40 grayscale">
                                <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 mb-6">
                                    <Shield size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-300 mb-2">Manage Pro Team</h2>
                                <p className="text-gray-500 mb-6 text-sm leading-relaxed">Take control of a real world powerhouse like Vitality or G2. Handle high budgets and superstar egos.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto animate-fade-in w-full">
                        <div className="bg-fm-card border border-fm-border rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center gap-2 mb-8 text-fm-muted hover:text-white cursor-pointer w-fit transition-colors group" onClick={() => setMode('none')}>
                                <div className="p-1 rounded-full bg-fm-bg border border-fm-border group-hover:border-fm-accent">
                                    <ChevronRight size={14} className="rotate-180" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">Back to Menu</span>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-fm-accent/10 flex items-center justify-center text-fm-accent">
                                    <UserPlus size={20} /> 
                                </div>
                                Team Setup
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-fm-muted uppercase tracking-widest mb-2">Team Name</label>
                                    <input 
                                        type="text" 
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="w-full bg-fm-bg border border-fm-border rounded-lg p-4 text-white focus:border-fm-accent focus:ring-1 focus:ring-fm-accent/50 focus:outline-none transition-all font-bold text-lg placeholder:text-gray-700"
                                        placeholder="e.g. Cloud99"
                                        maxLength={20}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-fm-muted uppercase tracking-widest mb-2">Home Country</label>
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {countries.map((c) => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => setCountry(c.code)}
                                                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                                                    country === c.code 
                                                    ? 'bg-fm-accent/20 border-fm-accent text-white shadow-[0_0_10px_rgba(217,70,239,0.2)]' 
                                                    : 'bg-fm-bg border-fm-border text-fm-muted hover:bg-fm-card-hover hover:border-gray-600'
                                                }`}
                                            >
                                                <CountryFlag countryCode={c.code} className="h-4 mb-1" />
                                                <span className="text-[10px] font-bold uppercase">{c.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-fm-accent hover:bg-fm-accent-hover text-white font-bold uppercase tracking-widest rounded-lg shadow-lg transition-all transform hover:scale-[1.02] mt-4 flex items-center justify-center gap-2"
                                >
                                    Create Team <Play size={16} className="fill-current" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-fm-muted text-[10px] uppercase tracking-widest opacity-50">
                    © 2025 CS:MANAGER AI • POWERED BY GEMINI
                </div>
            </div>
        </div>
    );
};