
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
    <div className="flex items-center gap-2 mb-1">
      <Icon size={12} className="text-gray-500" />
      <div className="text-xs text-gray-400 w-14">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${value > 85 ? 'bg-yellow-500' : value > 70 ? 'bg-green-500' : 'bg-gray-600'}`} 
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs text-gray-300 font-mono w-6 text-right">{value}</div>
    </div>
  );

  const MentalBar = ({ value }: { value: number }) => {
      let color = 'bg-red-500';
      if (value > 80) color = 'bg-green-400';
      else if (value > 50) color = 'bg-yellow-500';
      else if (value > 30) color = 'bg-orange-500';

      return (
        <div className="flex items-center gap-2 mb-1">
            <Smile size={12} className="text-gray-500" />
            <div className="text-xs text-gray-400 w-14">MENTAL</div>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                className={`h-full rounded-full ${color} transition-all duration-500`} 
                style={{ width: `${value}%` }}
                />
            </div>
            <div className="text-xs text-gray-300 font-mono w-6 text-right">{value}</div>
        </div>
      );
  }

  return (
    <div className={`bg-cs-dark border border-gray-800 rounded-lg p-4 hover:border-cs-yellow transition-colors shadow-lg flex flex-col ${isCompact ? 'p-3' : ''} ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center border border-gray-600 relative overflow-hidden">
             {/* Fallback icon if avatarSeed not used for image yet */}
             <User className="text-gray-400 relative z-10" size={24} />
          </div>
          <div className="min-w-0 overflow-hidden flex-1">
            <h3 className="text-lg font-bold text-white leading-none truncate" title={player.alias}>{player.alias}</h3>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                <span className="truncate">{player.fullName}</span>
                <span className="w-0.5 h-3 bg-gray-700 shrink-0"></span>
                <CountryFlag countryCode={player.country} className="h-3 shrink-0" />
            </div>
            <div className={`text-xs font-bold mt-1 ${getRoleColor(player.role)}`}>{player.role}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-green-400 font-mono font-bold">${player.marketValue.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide whitespace-nowrap">CONTRACT</div>
        </div>
      </div>

      <div className="space-y-1 flex-1">
        <StatBar label="AIM" value={player.stats.aim} icon={Crosshair} />
        <StatBar label="RFLX" value={player.stats.reflex} icon={Zap} />
        <StatBar label="STRAT" value={player.stats.strategy} icon={Brain} />
        <StatBar label="UTIL" value={player.stats.utility} icon={Shield} />
        <StatBar label="CLUTCH" value={player.stats.clutch} icon={Activity} />
        
        {/* Mental & Teamwork Section */}
        <div className="mt-2 pt-2 border-t border-gray-800/50">
            {showTeamwork && (
                <StatBar label="TEAM" value={player.stats.teamwork} icon={Users} />
            )}
            <MentalBar value={player.morale ?? 50} />
        </div>
      </div>

      {onAction && (
        <button
          onClick={() => onAction(player)}
          disabled={actionDisabled}
          className={`mt-4 w-full py-2 rounded font-bold text-sm uppercase tracking-wider transition-all shrink-0
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
