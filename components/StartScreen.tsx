import React, { useState } from 'react';
import { Trophy, Lock, UserPlus, Globe, ChevronRight, Shield } from 'lucide-react';
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
        <div className="min-h-screen bg-cs-darker flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat relative">
            <div className="absolute inset-0 bg-cs-darker/90 backdrop-blur-sm"></div>
            
            <div className="relative z-10 max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-black tracking-tighter italic text-white mb-2">
                        <span className="text-cs-yellow">CS</span>:MANAGER
                    </h1>
                    <p className="text-xl text-gray-400">The Ultimate AI-Powered Esports Simulator</p>
                </div>

                {mode === 'none' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Team Option */}
                        <button 
                            onClick={() => setMode('create')}
                            className="group bg-cs-dark border border-gray-700 p-8 rounded-xl hover:border-cs-yellow hover:scale-105 transition-all shadow-2xl text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UserPlus size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-cs-blue/20 rounded-full flex items-center justify-center text-cs-blue mb-6 group-hover:bg-cs-yellow/20 group-hover:text-cs-yellow transition-colors">
                                    <UserPlus size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Create New Team</h2>
                                <p className="text-gray-400 mb-6">Start from scratch in the Open League. Draft your own roster and climb the ranks to glory.</p>
                                <div className="flex items-center text-cs-yellow font-bold uppercase tracking-widest text-sm">
                                    Start Career <ChevronRight className="ml-1" size={16} />
                                </div>
                            </div>
                        </button>

                        {/* Existing Team Option (Locked) */}
                        <div className="bg-cs-dark/50 border border-gray-800 p-8 rounded-xl relative overflow-hidden grayscale opacity-75 cursor-not-allowed">
                             <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-[1px]">
                                <div className="flex items-center gap-2 text-gray-400 bg-black/80 px-4 py-2 rounded-full border border-gray-700">
                                    <Lock size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Coming Soon</span>
                                </div>
                             </div>
                             <div className="absolute top-0 right-0 p-6 opacity-10">
                                <Shield size={120} />
                            </div>
                             <div className="relative z-10 opacity-50">
                                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center text-gray-500 mb-6">
                                    <Shield size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-300 mb-2">Manage Pro Team</h2>
                                <p className="text-gray-500 mb-6">Take control of a real world powerhouse like Vitality or G2. Handle high budgets and superstar egos.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto animate-fade-in">
                        <div className="bg-cs-dark border border-gray-700 rounded-xl p-8 shadow-2xl">
                            <div className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white cursor-pointer w-fit transition-colors" onClick={() => setMode('none')}>
                                <ChevronRight size={16} className="rotate-180" />
                                <span className="text-xs font-bold uppercase tracking-widest">Back to Menu</span>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <UserPlus className="text-cs-yellow" /> 
                                Team Setup
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Team Name</label>
                                    <input 
                                        type="text" 
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cs-yellow focus:outline-none transition-colors font-bold text-lg"
                                        placeholder="e.g. Cloud99"
                                        maxLength={20}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Home Country</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {countries.map((c) => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => setCountry(c.code)}
                                                className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${
                                                    country === c.code 
                                                    ? 'bg-cs-blue/20 border-cs-blue text-white' 
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <CountryFlag countryCode={c.code} className="h-4" />
                                                <span className="text-[10px] font-bold uppercase">{c.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-cs-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded text-lg shadow-lg transition-transform transform hover:scale-105 mt-4"
                                >
                                    Create Team
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-gray-600 text-xs uppercase tracking-widest">
                    © 2024 CS:MANAGER AI • POWERED BY GEMINI
                </div>
            </div>
        </div>
    );
};