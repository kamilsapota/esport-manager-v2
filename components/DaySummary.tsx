
import React from 'react';
import { DailyGain } from '../types';
import { Calendar, Zap, ArrowRight, X } from 'lucide-react';

interface DaySummaryProps {
    dailyGains: DailyGain[];
    onClose: () => void;
}

export const DaySummary: React.FC<DaySummaryProps> = ({ dailyGains, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
            <div className="max-w-md w-full bg-fm-card border border-fm-border rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-fm-accent" /> Daily Report
                    </h3>
                    <button onClick={onClose} className="text-fm-muted hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {dailyGains.length > 0 ? dailyGains.map((g, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-fm-border pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                                {g.type === 'map' && <span className="bg-blue-500/20 text-blue-400 p-1 rounded"><Zap size={12} /></span>}
                                {g.type === 'xp' && <span className="bg-fm-green/20 text-fm-green p-1 rounded"><ArrowRight size={12} /></span>}
                                {g.type === 'mental' && <span className={`p-1 rounded ${g.value > 0 ? 'bg-fm-green/20 text-fm-green' : 'bg-fm-red/20 text-fm-red'}`}><Zap size={12} /></span>}
                                <span className="text-sm font-bold text-gray-200">
                                    {g.type === 'map' ? `Map: ${g.subject}` : g.subject}
                                </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-fm-muted">
                                {g.type === 'xp' ? `+1 ${g.stat?.toUpperCase()}` : g.type === 'map' ? `+${g.value.toFixed(1)}%` : `${g.value > 0 ? '+' : ''}${g.value} Morale`}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center text-fm-muted italic py-4">No significant training gains today.</div>
                    )}
                </div>
                <button onClick={onClose} className="w-full py-3 bg-fm-accent hover:bg-fm-accent-hover text-white font-bold uppercase rounded shadow-lg">
                    Continue
                </button>
            </div>
        </div>
    );
};
