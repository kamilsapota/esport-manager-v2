
import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { Shield, Ban, CheckCircle, Play } from 'lucide-react';

interface MapVetoProps {
    userTeam: Team;
    enemyTeam: Team;
    onComplete: (mapId: string) => void;
}

const MAP_POOL = [
    { id: 'Dust2', name: 'Dust 2', img: 'https://www.hltv.org/img/static/statsmatchmaps/dust2.png' },
    { id: 'Mirage', name: 'Mirage', img: 'https://www.hltv.org/img/static/statsmatchmaps/mirage.png' },
    { id: 'Inferno', name: 'Inferno', img: 'https://www.hltv.org/img/static/statsmatchmaps/inferno.png' },
    { id: 'Nuke', name: 'Nuke', img: 'https://www.hltv.org/img/static/statsmatchmaps/nuke.png' },
    { id: 'Train', name: 'Train', img: 'https://www.hltv.org/img/static/statsmatchmaps/train.png' },
    { id: 'Overpass', name: 'Overpass', img: 'https://www.hltv.org/img/static/statsmatchmaps/overpass.png' },
    { id: 'Ancient', name: 'Ancient', img: 'https://www.hltv.org/img/static/statsmatchmaps/ancient.png' }
];

export const MapVeto: React.FC<MapVetoProps> = ({ userTeam, enemyTeam, onComplete }) => {
    const [bannedMaps, setBannedMaps] = useState<string[]>([]);
    const [turn, setTurn] = useState<'user' | 'enemy'>('user');
    const [actionLog, setActionLog] = useState<string[]>([]);

    const getStats = (team: Team, mapId: string) => team.mapStats?.[mapId] || 0;

    useEffect(() => {
        if (bannedMaps.length === 6) {
            // Veto complete
            return;
        }

        if (turn === 'enemy') {
            const timer = setTimeout(() => {
                const availableMaps = MAP_POOL.filter(m => !bannedMaps.includes(m.id));
                let mapToBan;

                // AI LOGIC 2.0
                // 1. Always ban Permaban if available
                if (enemyTeam.permaban && !bannedMaps.includes(enemyTeam.permaban)) {
                    mapToBan = availableMaps.find(m => m.id === enemyTeam.permaban);
                }

                // 2. If Permaban already gone, ban the map where User has biggest advantage
                if (!mapToBan) {
                    let maxDanger = -Infinity;

                    availableMaps.forEach(m => {
                        const userStat = getStats(userTeam, m.id);
                        const enemyStat = getStats(enemyTeam, m.id);
                        // Danger = User Skill - Enemy Skill. Higher is worse for enemy.
                        const danger = userStat - enemyStat;
                        
                        if (danger > maxDanger) {
                            maxDanger = danger;
                            mapToBan = m;
                        }
                    });
                }

                // Fallback if something fails
                if (!mapToBan) mapToBan = availableMaps[0];

                setBannedMaps(prev => [...prev, mapToBan.id]);
                setActionLog(prev => [`${enemyTeam.name} banned ${mapToBan.name}`, ...prev]);
                setTurn('user');

            }, 1500); // Delay for dramatic effect
            return () => clearTimeout(timer);
        }
    }, [turn, bannedMaps, enemyTeam, userTeam]);

    const handleUserBan = (mapId: string) => {
        if (turn !== 'user') return;
        setBannedMaps(prev => [...prev, mapId]);
        setActionLog(prev => [`You banned ${MAP_POOL.find(m => m.id === mapId)?.name}`, ...prev]);
        setTurn('enemy');
    };

    const remainingMap = bannedMaps.length === 6 
        ? MAP_POOL.find(m => !bannedMaps.includes(m.id)) 
        : null;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-cs-darker p-6 flex flex-col items-center">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Map Veto</h2>
                <p className="text-gray-400">Ban phase: Best of 1</p>
            </div>

            {/* STATUS BAR */}
            <div className="w-full max-w-5xl bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8 flex justify-between items-center">
                <div className={`flex items-center gap-3 ${turn === 'user' && !remainingMap ? 'opacity-100' : 'opacity-50'}`}>
                    <Shield className="text-cs-blue" />
                    <div className="text-left">
                        <div className="text-xs text-gray-500 uppercase font-bold">Your Team</div>
                        <div className={`font-bold ${turn === 'user' && !remainingMap ? 'text-white' : 'text-gray-500'}`}>
                            {turn === 'user' && !remainingMap ? 'Your Turn to Ban' : 'Waiting...'}
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-1">
                    {Array.from({length: 6}).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${i < bannedMaps.length ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                    ))}
                </div>

                <div className={`flex items-center gap-3 ${turn === 'enemy' && !remainingMap ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase font-bold">{enemyTeam.name}</div>
                        <div className={`font-bold ${turn === 'enemy' && !remainingMap ? 'text-t-red' : 'text-gray-500'}`}>
                            {turn === 'enemy' && !remainingMap ? 'Banning...' : 'Waiting...'}
                        </div>
                    </div>
                    <Shield className="text-t-red" />
                </div>
            </div>

            {/* MAP GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl w-full mb-8">
                {MAP_POOL.map(map => {
                    const isBanned = bannedMaps.includes(map.id);
                    const userStat = getStats(userTeam, map.id);
                    const enemyStat = getStats(enemyTeam, map.id);
                    const isUserAdvantage = userStat >= enemyStat;

                    return (
                        <div 
                            key={map.id} 
                            onClick={() => !isBanned && turn === 'user' && !remainingMap ? handleUserBan(map.id) : null}
                            className={`relative h-48 rounded-xl overflow-hidden border-2 transition-all ${
                                isBanned 
                                ? 'border-red-900/50 opacity-40 grayscale cursor-not-allowed' 
                                : remainingMap?.id === map.id 
                                    ? 'border-green-500 scale-105 ring-4 ring-green-500/20 z-10' 
                                    : turn === 'user' 
                                        ? 'border-gray-700 hover:border-red-500 hover:scale-105 cursor-pointer' 
                                        : 'border-gray-700 opacity-80'
                            }`}
                        >
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.img})` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                            {/* Map Name */}
                            <div className="absolute top-3 left-3 font-black text-2xl text-white italic uppercase tracking-tighter drop-shadow-md">
                                {map.name}
                            </div>

                            {isBanned && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                    <div className="transform -rotate-12 border-4 border-red-500 text-red-500 font-black text-3xl uppercase px-4 py-2 tracking-widest">
                                        BANNED
                                    </div>
                                </div>
                            )}
                            
                            {remainingMap?.id === map.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-900/20">
                                    <div className="flex flex-col items-center gap-2 text-green-400 font-bold text-lg uppercase tracking-widest animate-pulse">
                                        <CheckCircle size={32} />
                                        Decider
                                    </div>
                                </div>
                            )}

                            {/* Stats Footer (Only visible if not banned) */}
                            {!isBanned && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 flex justify-between items-center text-xs font-mono">
                                    <div className="text-cs-blue flex flex-col">
                                        <span className="text-[9px] text-gray-500 uppercase">Your Prof.</span>
                                        <span className="font-bold text-sm">{userStat}%</span>
                                    </div>
                                    <div className={`font-bold ${isUserAdvantage ? 'text-green-400' : 'text-red-400'}`}>
                                        {isUserAdvantage ? '+' : ''}{userStat - enemyStat}%
                                    </div>
                                    <div className="text-t-red flex flex-col text-right">
                                        <span className="text-[9px] text-gray-500 uppercase">Enemy Prof.</span>
                                        <span className="font-bold text-sm">{enemyStat}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {remainingMap && (
                <div className="animate-fade-in flex flex-col items-center gap-4">
                    <div className="text-xl text-gray-300">Map Selected: <span className="text-white font-bold">{remainingMap.name}</span></div>
                    <button 
                        onClick={() => onComplete(remainingMap.id)}
                        className="px-12 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest rounded shadow-lg text-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Play size={24} className="fill-black" />
                        Start Match
                    </button>
                </div>
            )}

            {/* LOGS */}
            {actionLog.length > 0 && (
                <div className="mt-8 w-full max-w-xl">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Veto History</div>
                    <div className="space-y-2 flex flex-col items-center">
                        {actionLog.slice(0, 3).map((log, i) => (
                            <div key={i} className="text-sm text-gray-400 animate-fade-in">{log}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};