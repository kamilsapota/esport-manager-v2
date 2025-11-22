import React from 'react';
import { Player, PlayerRole } from '../types';
import { User, Crosshair, Brain, Zap, Shield, Activity, Smile, Users } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface PlayerCardProps {
  player: Player;
  actionLabel?: string;
  onAction?: (player: Player) => void;
  actionDisabled?: boolean;
  isCompact?: boolean;
  className?: string;
  showTeamwork?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
    player, 
    actionLabel, 
    onAction, 
    actionDisabled, 
    isCompact, 
    className = '',
    showTeamwork = false 
}) => {
  
  const getRoleColor = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.AWPER: return 'text-red-400';
      case PlayerRole.IGL: return 'text-yellow-400';
      case PlayerRole.ENTRY: return 'text-orange-400';
      case PlayerRole.SUPPORT: return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const StatBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => (
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-16 text-[10px] font-bold text-fm-muted uppercase tracking-wider">{label}</div>
      <div className="flex-1 h-1.5 bg-fm-bg rounded-sm overflow-hidden border border-fm-border/50">
        <div 
          className={`h-full rounded-sm ${value > 85 ? 'bg-fm-accent' : value > 70 ? 'bg-fm-green' : 'bg-gray-600'}`} 
          style={{ width: `${value}%` }}
        />
      </div>
      <div className={`text-[10px] font-mono font-bold w-6 text-right ${value > 85 ? 'text-fm-accent' : 'text-gray-400'}`}>{value}</div>
    </div>
  );

  return (
    <div className={`bg-fm-card border border-fm-border rounded-xl p-4 hover:border-fm-accent/30 transition-all shadow-lg flex flex-col group ${isCompact ? 'p-3' : ''} ${className}`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-10 h-10 shrink-0 bg-fm-bg rounded-lg flex items-center justify-center border border-fm-border text-fm-muted font-bold text-lg">
             {player.alias.charAt(0)}
          </div>
          <div className="min-w-0 overflow-hidden flex-1">
            <h3 className="text-base font-bold text-white leading-none truncate mb-1">{player.alias}</h3>
            <div className="flex items-center gap-2">
                <CountryFlag countryCode={player.country} className="h-2.5 opacity-80" />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${getRoleColor(player.role)}`}>{player.role}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-fm-green font-mono font-bold bg-fm-green/10 px-2 py-0.5 rounded border border-fm-green/20">
              ${(player.marketValue/1000).toFixed(1)}k
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 flex-1 bg-fm-bg/30 p-3 rounded-lg border border-fm-border/30">
        <StatBar label="Aim" value={player.stats.aim} icon={Crosshair} />
        <StatBar label="Reflex" value={player.stats.reflex} icon={Zap} />
        <StatBar label="Strategy" value={player.stats.strategy} icon={Brain} />
        <StatBar label="Utility" value={player.stats.utility} icon={Shield} />
        <StatBar label="Clutch" value={player.stats.clutch} icon={Activity} />
        {showTeamwork && <StatBar label="Team" value={player.stats.teamwork} icon={Users} />}
      </div>

      {/* Footer / Morale */}
      <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${player.morale > 70 ? 'bg-fm-green' : player.morale > 40 ? 'bg-fm-yellow' : 'bg-fm-red'}`}></div>
              <span className="text-[10px] text-fm-muted font-bold uppercase">Morale: {player.morale}%</span>
          </div>
          <div className="text-[10px] text-fm-muted font-bold uppercase">{player.age} Years Old</div>
      </div>

      {onAction && (
        <button
          onClick={() => onAction(player)}
          disabled={actionDisabled}
          className={`mt-4 w-full py-2 rounded font-bold text-xs uppercase tracking-widest transition-all shrink-0
            ${actionDisabled 
              ? 'bg-fm-bg text-fm-muted cursor-not-allowed border border-fm-border' 
              : 'bg-fm-card hover:bg-fm-accent hover:text-white text-fm-muted border border-fm-border hover:border-fm-accent'}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};