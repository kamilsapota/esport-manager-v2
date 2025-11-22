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
                let mapToBan: typeof MAP_POOL[0] | undefined;

                // AI LOGIC 2.0
                if (enemyTeam.permaban && !bannedMaps.includes(enemyTeam.permaban)) {
                    mapToBan = availableMaps.find(m => m.id === enemyTeam.permaban);
                }

                if (!mapToBan) {
                    let maxDanger = -Infinity;

                    availableMaps.forEach(m => {
                        const userStat = getStats(userTeam, m.id);
                        const enemyStat = getStats(enemyTeam, m.id);
                        const danger = userStat - enemyStat;
                        
                        if (danger > maxDanger) {
                            maxDanger = danger;
                            mapToBan = m;
                        }
                    });
                }

                if (!mapToBan) mapToBan = availableMaps[0];

                if (mapToBan) {
                    const selectedMap = mapToBan; 
                    setBannedMaps(prev => [...prev, selectedMap.id]);
                    setActionLog(prev => [`${enemyTeam.name} banned ${selectedMap.name}`, ...prev]);
                    setTurn('user');
                }

            }, 1500); 
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
        <div className="min-h-full bg-fm-bg p-6 flex flex-col items-center animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Map Veto</h2>
                <p className="text-fm-muted text-sm">Phase: Best of 1</p>
            </div>

            {/* STATUS BAR */}
            <div className="w-full max-w-5xl bg-fm-card border border-fm-border rounded-xl p-4 mb-8 flex justify-between items-center shadow-lg">
                <div className={`flex items-center gap-3 ${turn === 'user' && !remainingMap ? 'opacity-100' : 'opacity-50'}`}>
                    <Shield className="text-fm-accent" />
                    <div className="text-left">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">Your Team</div>
                        <div className={`font-bold text-sm ${turn === 'user' && !remainingMap ? 'text-white' : 'text-fm-muted'}`}>
                            {turn === 'user' && !remainingMap ? 'Your Turn to Ban' : 'Waiting...'}
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-1">
                    {Array.from({length: 6}).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < bannedMaps.length ? 'bg-fm-red' : 'bg-fm-bg border border-fm-border'}`}></div>
                    ))}
                </div>

                <div className={`flex items-center gap-3 ${turn === 'enemy' && !remainingMap ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="text-right">
                        <div className="text-[10px] text-fm-muted uppercase font-bold">{enemyTeam.name}</div>
                        <div className={`font-bold text-sm ${turn === 'enemy' && !remainingMap ? 'text-fm-red' : 'text-fm-muted'}`}>
                            {turn === 'enemy' && !remainingMap ? 'Banning...' : 'Waiting...'}
                        </div>
                    </div>
                    <Shield className="text-fm-red" />
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
                                ? 'border-fm-red/30 opacity-30 grayscale cursor-not-allowed' 
                                : remainingMap?.id === map.id 
                                    ? 'border-fm-green scale-105 ring-4 ring-fm-green/20 z-10 shadow-2xl' 
                                    : turn === 'user' 
                                        ? 'border-fm-border hover:border-fm-red hover:scale-105 cursor-pointer' 
                                        : 'border-fm-border opacity-80'
                            }`}
                        >
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.img})` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                            {/* Map Name */}
                            <div className="absolute top-3 left-3 font-black text-2xl text-white italic uppercase tracking-tighter drop-shadow-md">
                                {map.name}
                            </div>

                            {isBanned && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                    <div className="transform -rotate-12 border-4 border-fm-red text-fm-red font-black text-3xl uppercase px-4 py-2 tracking-widest">
                                        BANNED
                                    </div>
                                </div>
                            )}
                            
                            {remainingMap?.id === map.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-fm-green/20">
                                    <div className="flex flex-col items-center gap-2 text-fm-green font-bold text-lg uppercase tracking-widest animate-pulse">
                                        <CheckCircle size={32} />
                                        Decider
                                    </div>
                                </div>
                            )}

                            {/* Stats Footer (Only visible if not banned) */}
                            {!isBanned && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-2 flex justify-between items-center text-xs font-mono">
                                    <div className="text-fm-accent flex flex-col">
                                        <span className="text-[9px] text-gray-500 uppercase">Your Prof.</span>
                                        <span className="font-bold text-sm">{userStat}%</span>
                                    </div>
                                    <div className={`font-bold ${isUserAdvantage ? 'text-fm-green' : 'text-fm-red'}`}>
                                        {isUserAdvantage ? '+' : ''}{userStat - enemyStat}%
                                    </div>
                                    <div className="text-fm-red flex flex-col text-right">
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
                    <div className="text-xl text-fm-muted">Map Selected: <span className="text-white font-bold">{remainingMap.name}</span></div>
                    <button 
                        onClick={() => onComplete(remainingMap.id)}
                        className="px-12 py-4 bg-fm-green hover:bg-fm-green/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg text-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Play size={24} className="fill-current" />
                        Start Match
                    </button>
                </div>
            )}

            {/* LOGS */}
            {actionLog.length > 0 && (
                <div className="mt-8 w-full max-w-xl">
                    <div className="text-[10px] font-bold text-fm-muted uppercase tracking-widest mb-2 text-center">Veto History</div>
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