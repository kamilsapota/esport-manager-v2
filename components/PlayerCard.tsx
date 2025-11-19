import React from 'react';
import { Player, PlayerRole } from '../types';
import { User, Crosshair, Brain, Zap, Shield, Activity } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  actionLabel?: string;
  onAction?: (player: Player) => void;
  actionDisabled?: boolean;
  isCompact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, actionLabel, onAction, actionDisabled, isCompact }) => {
  
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
    <div className="flex items-center gap-2 mb-1">
      <Icon size={12} className="text-gray-500" />
      <div className="text-xs text-gray-400 w-16">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${value > 85 ? 'bg-yellow-500' : value > 70 ? 'bg-green-500' : 'bg-gray-600'}`} 
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs text-gray-300 font-mono w-6 text-right">{value}</div>
    </div>
  );

  return (
    <div className={`bg-cs-dark border border-gray-800 rounded-lg p-4 hover:border-cs-yellow transition-colors shadow-lg ${isCompact ? 'p-3' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center border border-gray-600">
             <User className="text-gray-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-none">{player.alias}</h3>
            <div className="text-xs text-gray-500 mt-1">{player.fullName} • {player.country}</div>
            <div className={`text-xs font-bold mt-1 ${getRoleColor(player.role)}`}>{player.role}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-green-400 font-mono">${player.marketValue.toLocaleString()}</div>
          <div className="text-xs text-gray-500">/ contract</div>
        </div>
      </div>

      <div className="space-y-1">
        <StatBar label="AIM" value={player.stats.aim} icon={Crosshair} />
        <StatBar label="RFLX" value={player.stats.reflex} icon={Zap} />
        <StatBar label="STRAT" value={player.stats.strategy} icon={Brain} />
        {!isCompact && (
            <>
                <StatBar label="UTIL" value={player.stats.utility} icon={Shield} />
                <StatBar label="CLUTCH" value={player.stats.clutch} icon={Activity} />
            </>
        )}
      </div>

      {onAction && (
        <button
          onClick={() => onAction(player)}
          disabled={actionDisabled}
          className={`mt-4 w-full py-2 rounded font-bold text-sm uppercase tracking-wider transition-all
            ${actionDisabled 
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-cs-blue hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};