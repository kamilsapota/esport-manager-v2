
import React, { useState } from 'react';
import { Team, Player } from '../types';
import { Target, Swords, Zap, Brain, Activity, CheckCircle, Lock, Trophy } from 'lucide-react';

interface PracticeViewProps {
  team: Team;
}

// HLTV static images for maps
const MAP_POOL = [
    { 
        id: 'Dust2', 
        name: 'Dust 2', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png', 
        desc: 'The classic. Aim heavy, simple layout.',
        logoColor: 'text-yellow-500'
    },
    { 
        id: 'Mirage', 
        name: 'Mirage', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png', 
        desc: 'Balanced middle. Execution heavy.',
        logoColor: 'text-orange-500'
    },
    { 
        id: 'Inferno', 
        name: 'Inferno', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png', 
        desc: 'Narrow chokepoints. Utility king.',
        logoColor: 'text-blue-500'
    },
    { 
        id: 'Nuke', 
        name: 'Nuke', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png', 
        desc: 'Vertical gameplay. Rotation speed.',
        logoColor: 'text-yellow-400'
    },
    { 
        id: 'Train', 
        name: 'Train', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/train.png', 
        desc: 'Long angles. AWP dominance.',
        logoColor: 'text-green-600'
    },
    { 
        id: 'Overpass', 
        name: 'Overpass', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png', 
        desc: 'Complex rotations. CT Aggression.',
        logoColor: 'text-orange-400'
    },
    { 
        id: 'Ancient', 
        name: 'Ancient', 
        img: 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png', 
        desc: 'Green maze. Close quarters.',
        logoColor: 'text-green-500'
    }
];

export const PracticeView: React.FC<PracticeViewProps> = ({ team }) => {
    const [selectedMap, setSelectedMap] = useState<string | null>(null);
    const [isTraining, setIsTraining] = useState(false);

    const getProficiency = (mapId: string) => {
        return team.mapStats ? team.mapStats[mapId] || 0 : 0;
    };

    const handleTrain = () => {
        setIsTraining(true);
        setTimeout(() => {
            setIsTraining(false);
        }, 2000);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-600/20 text-green-500 rounded-lg border border-green-500/30">
                    <Target size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">Practice Facility</h2>
                    <p className="text-gray-400">Develop player skills and master the map pool.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* MAP VETO / TACTICS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Swords className="text-cs-yellow" size={20} /> Map Pool Tactics
                        </h3>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Active Duty</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {MAP_POOL.map((map) => {
                            const proficiency = getProficiency(map.id);
                            const isSelected = selectedMap === map.id;

                            return (
                                <button 
                                    key={map.id}
                                    onClick={() => setSelectedMap(map.id)}
                                    className={`relative group h-32 rounded-lg overflow-hidden border-2 transition-all shadow-lg text-left ${isSelected ? 'border-cs-yellow scale-[1.02] ring-4 ring-cs-yellow/20' : 'border-gray-800 hover:border-gray-600'}`}
                                >
                                    {/* Background Image */}
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                        style={{ backgroundImage: `url(${map.img})` }}
                                    ></div>
                                    
                                    {/* Overlay Gradient - Darker for HLTV style text contrast */}
                                    <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity ${isSelected ? 'opacity-80' : 'opacity-60 group-hover:opacity-70'}`}></div>

                                    {/* Content */}
                                    <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                {/* Fake Logo/Icon using first letter styled */}
                                                <div className={`w-6 h-6 rounded bg-gray-900/80 flex items-center justify-center font-black text-xs border border-white/10 ${map.logoColor}`}>
                                                    {map.name.charAt(0)}
                                                </div>
                                                <span className="font-black text-lg uppercase italic tracking-tighter text-white drop-shadow-md shadow-black">
                                                    {map.name}
                                                </span>
                                            </div>
                                            {proficiency > 70 && <CheckCircle size={16} className="text-green-500" />}
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-300 mb-1 drop-shadow-md">
                                                <span>Proficiency</span>
                                                <span>{proficiency}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                                <div 
                                                    className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${proficiency > 80 ? 'bg-green-500 text-green-500' : proficiency > 50 ? 'bg-cs-yellow text-cs-yellow' : 'bg-red-500 text-red-500'}`}
                                                    style={{ width: `${proficiency}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Map Detail */}
                    <div className="bg-cs-dark border border-gray-800 rounded-lg p-0 shadow-xl transition-all overflow-hidden relative">
                        {selectedMap ? (
                            <>
                                <div className="h-40 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${MAP_POOL.find(m => m.id === selectedMap)?.img})` }}>
                                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cs-dark/60 to-cs-dark"></div>
                                     <div className="absolute bottom-4 left-6">
                                        <h4 className="text-5xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg shadow-black">
                                            {MAP_POOL.find(m => m.id === selectedMap)?.name}
                                        </h4>
                                        <p className="text-gray-200 text-sm font-medium drop-shadow-md max-w-md bg-black/30 px-2 py-1 rounded backdrop-blur-sm inline-block mt-1">{MAP_POOL.find(m => m.id === selectedMap)?.desc}</p>
                                     </div>
                                </div>
                                
                                <div className="p-6 flex justify-between items-center bg-cs-dark">
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold">Current Level</span>
                                            <span className="text-white font-mono font-bold text-lg">{getProficiency(selectedMap)}%</span>
                                        </div>
                                        <div className="w-px h-10 bg-gray-800"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold">Win Rate</span>
                                            <span className="text-white font-mono font-bold text-lg">--%</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleTrain}
                                        disabled={isTraining}
                                        className={`px-8 py-3 font-black uppercase tracking-widest rounded transition-all flex items-center gap-2 ${
                                            isTraining 
                                            ? 'bg-gray-800 text-gray-500 cursor-wait' 
                                            : 'bg-cs-yellow hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(222,155,53,0.3)] hover:shadow-[0_0_30px_rgba(222,155,53,0.5)]'
                                        }`}
                                    >
                                        {isTraining ? <Activity className="animate-spin" /> : <Trophy size={18} />}
                                        {isTraining ? 'Practicing...' : 'Train Map'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-500 py-12 italic flex flex-col items-center gap-2">
                                <Target size={48} className="text-gray-800" />
                                Select a map from the pool to view tactics and run drills.
                            </div>
                        )}
                    </div>
                </div>

                {/* PLAYER DEVELOPMENT */}
                <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-green-400" size={20} /> Individual Drills
                        </h3>
                    </div>

                    <div className="bg-cs-dark border border-gray-800 rounded-lg p-6 shadow-lg space-y-4">
                        <p className="text-xs text-gray-400 mb-4">
                            Assign daily training focus for the team. (Feature in development)
                        </p>

                        <div className="space-y-3">
                            <button className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-cs-yellow rounded flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-900/20 text-red-400 rounded group-hover:bg-red-500 group-hover:text-white transition-colors">
                                        <Target size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-200 text-sm group-hover:text-white">Aim Botz</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider group-hover:text-gray-400">Boosts Aim & Reflex</div>
                                    </div>
                                </div>
                                <Lock size={14} className="text-gray-600" />
                            </button>

                            <button className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-cs-yellow rounded flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-900/20 text-blue-400 rounded group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Brain size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-200 text-sm group-hover:text-white">Demo Review</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider group-hover:text-gray-400">Boosts Strategy</div>
                                    </div>
                                </div>
                                <Lock size={14} className="text-gray-600" />
                            </button>

                            <button className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-cs-yellow rounded flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-900/20 text-yellow-400 rounded group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-200 text-sm group-hover:text-white">Retake Servers</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider group-hover:text-gray-400">Boosts Clutch & Utility</div>
                                    </div>
                                </div>
                                <Lock size={14} className="text-gray-600" />
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                            <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-1 rounded uppercase font-bold">
                                Drill Functionality Coming Soon
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
