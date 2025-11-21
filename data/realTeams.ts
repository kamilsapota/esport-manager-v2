
import { Team, Player, PlayerRole, League } from '../types';

// Helper to create player with league-adjusted stats and value
const createPlayer = (
  alias: string, 
  country: string, 
  role: PlayerRole, 
  baseRating: number, // 0-100 scale roughly
  valueMultiplier: number,
  specificRating?: number // Optional override
): Player => {
  
  // If specificRating is provided, use it as the base, otherwise use team average
  const rating = specificRating || baseRating;

  // Random variance is smaller if specific rating is provided
  const variance = specificRating ? 4 : 12; 
  const getStat = () => Math.min(99, Math.max(10, rating + Math.floor(Math.random() * variance - (variance/2))));

  // Exponential Value Curve
  const adjustedValue = Math.pow(rating - 35, 3) * 10 * valueMultiplier;

  return {
    id: `p-${alias.toLowerCase().replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`,
    alias,
    fullName: alias, // Simplified for generated
    age: 16 + Math.floor(Math.random() * 10),
    country,
    role,
    stats: {
      aim: getStat(),
      reflex: getStat(),
      strategy: getStat(),
      utility: getStat(),
      clutch: getStat(),
    },
    marketValue: Math.max(500, Math.floor(adjustedValue)),
    salary: Math.max(100, Math.floor(rating * 20 * valueMultiplier)),
    morale: 75 + Math.floor(Math.random() * 15), // Default morale 75-90
    matchHistory: [] // Initialize empty history
  };
};

export const generateRoster = (countryCode: string, avgRating: number, multiplier: number): Player[] => {
  const roles = [PlayerRole.IGL, PlayerRole.AWPER, PlayerRole.ENTRY, PlayerRole.SUPPORT, PlayerRole.LURKER];
  const generatedNames = [
    'Slayer', 'Phantom', 'K1ng', 'Joker', 'Ghost', 'Viper', 'Neo', 'Dash', 'Blaze', 'Frost',
    'Shadow', 'Storm', 'Ace', 'Zero', 'N1nja', 'Pixel', 'Glitch', 'Toxic', 'Savage', 'Beast',
    'Cr1m', 'Duggy', 'FalleN_Jr', 'S1mple_Fan', 'R0cky', 'Bull', 'Shark', 'Eagle', 'Wolf'
  ];
  
  return roles.map((role, i) => {
    const alias = `${generatedNames[Math.floor(Math.random() * generatedNames.length)]}_${Math.floor(Math.random()*99)}`;
    return createPlayer(alias, countryCode, role, avgRating, multiplier);
  });
};

interface RosterPlayer extends Partial<Player> {
    rating?: number; // Allow manual rating override
}

const createTeam = (name: string, country: string, league: League, avgRating: number, multiplier: number, realPlayers?: RosterPlayer[]): Team => {
  let players: Player[];

  if (realPlayers && realPlayers.length > 0) {
      // Fill missing roles if any, but usually we provide full 5
      players = realPlayers.map((rp, idx) => {
          const role = rp.role || [PlayerRole.IGL, PlayerRole.AWPER, PlayerRole.ENTRY, PlayerRole.SUPPORT, PlayerRole.LURKER][idx % 5];
          return createPlayer(rp.alias!, rp.country || country, role, avgRating, multiplier, rp.rating);
      });
  } else {
      players = generateRoster(country, avgRating, multiplier);
  }

  // Generate POLARIZED proficiency for maps (Not random)
  const maps = ['Dust2', 'Mirage', 'Inferno', 'Nuke', 'Train', 'Overpass', 'Ancient'];
  // Shuffle maps to assign strengths/weaknesses randomly per team
  const shuffledMaps = [...maps].sort(() => Math.random() - 0.5);
  
  const mapStats: Record<string, number> = {};

  // 1. Best Map (Stronghold) - 80-95% (scaled by avgRating)
  const bestMap = shuffledMaps[0];
  mapStats[bestMap] = Math.min(98, Math.floor(avgRating * 1.1) + 10 + Math.floor(Math.random() * 10));

  // 2. Good Maps (2) - 60-80%
  mapStats[shuffledMaps[1]] = Math.min(90, Math.floor(avgRating) + 5 + Math.floor(Math.random() * 10));
  mapStats[shuffledMaps[2]] = Math.min(90, Math.floor(avgRating) + Math.floor(Math.random() * 10));

  // 3. Average Maps (3) - 30-60%
  mapStats[shuffledMaps[3]] = Math.max(30, Math.floor(avgRating * 0.8) + Math.floor(Math.random() * 10 - 5));
  mapStats[shuffledMaps[4]] = Math.max(25, Math.floor(avgRating * 0.7) + Math.floor(Math.random() * 10 - 5));
  mapStats[shuffledMaps[5]] = Math.max(25, Math.floor(avgRating * 0.7) + Math.floor(Math.random() * 10 - 5));

  // 4. Permaban / Worst Map (1) - 10-30%
  const permaban = shuffledMaps[6];
  mapStats[permaban] = Math.max(10, Math.floor(avgRating * 0.4) + Math.floor(Math.random() * 10));

  return {
    id: name.toLowerCase().replace(/\s/g, '-'),
    name,
    league,
    players,
    budget: 0,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    leaguePoints: 0,
    roundDifference: 0,
    rankingPoints: Math.floor(avgRating * 10), // Default
    mapStats,
    permaban: permaban // Assign the worst map as their permaban
  };
};

// --- 1. ESEA OPEN (20 Teams) --- 
// Buffed ratings by ~5-7 points to increase difficulty
const OPEN_TEAMS: Team[] = [
    createTeam('Zeal22', 'RO', League.OPEN, 53, 0.5),
    createTeam('yologang420', 'PL', League.OPEN, 52, 0.5),
    createTeam('Next In Line', 'UK', League.OPEN, 51, 0.5),
    createTeam('born2flex', 'UA', League.OPEN, 51, 0.5),
    createTeam('The NEXT Prodigies', 'FR', League.OPEN, 50, 0.5),
    createTeam('QMISTRY', 'DE', League.OPEN, 50, 0.5),
    createTeam('REDragen', 'RU', League.OPEN, 49, 0.5),
    createTeam('kontencja', 'PL', League.OPEN, 49, 0.5),
    createTeam('UFG', 'GE', League.OPEN, 48, 0.5),
    createTeam('GameAgents', 'RS', League.OPEN, 48, 0.5),
    createTeam('JetFire', 'RU', League.OPEN, 47, 0.5),
    createTeam('ESC Gaming', 'UA', League.OPEN, 47, 0.5),
    createTeam('niskalaukaus', 'FI', League.OPEN, 46, 0.5),
    createTeam('normtipu', 'UA', League.OPEN, 46, 0.5),
    createTeam('Coolermaster', 'RU', League.OPEN, 45, 0.5),
    createTeam('VKBEST', 'RU', League.OPEN, 45, 0.5),
    createTeam('Pirates Esports', 'UK', League.OPEN, 45, 0.5),
    createTeam('E-Gaming', 'RU', League.OPEN, 45, 0.5),
    createTeam('n00rg CS', 'ES', League.OPEN, 44, 0.5),
    createTeam('Archangel5', 'RU', League.OPEN, 44, 0.5),
];

// --- 2. ESEA INTERMEDIATE (20 Teams) ---
// Buffed ratings by ~4-6 points
const INTERMEDIATE_TEAMS: Team[] = [
    createTeam('this slot is for sell', 'PL', League.INTERMEDIATE, 64, 0.6),
    createTeam('Proskilled Kingz', 'PL', League.INTERMEDIATE, 63, 0.6),
    createTeam('Unity Esports', 'RS', League.INTERMEDIATE, 62, 0.6),
    createTeam('kolon3', 'SE', League.INTERMEDIATE, 62, 0.6),
    createTeam('The glecs', 'UA', League.INTERMEDIATE, 61, 0.6),
    createTeam('eSuba', 'CZ', League.INTERMEDIATE, 61, 0.6),
    createTeam('Sashi Academy', 'DK', League.INTERMEDIATE, 60, 0.6),
    createTeam('SoulFrost eSports', 'DE', League.INTERMEDIATE, 59, 0.6),
    createTeam('They sent matrix agents', 'UA', League.INTERMEDIATE, 59, 0.6),
    createTeam('Illes Akademia', 'HU', League.INTERMEDIATE, 58, 0.6),
    createTeam('Veldora', 'RU', League.INTERMEDIATE, 57, 0.6),
    createTeam('ToTheBitterEnd', 'RU', League.INTERMEDIATE, 56, 0.6),
    createTeam('Game Pulse', 'CZ', League.INTERMEDIATE, 56, 0.6),
    createTeam('Blazing Parrots', 'PL', League.INTERMEDIATE, 55, 0.6),
    createTeam('yengi', 'FI', League.INTERMEDIATE, 54, 0.6),
    createTeam('Fallen_Legion', 'UA', League.INTERMEDIATE, 54, 0.6),
    createTeam('EstViki', 'EE', League.INTERMEDIATE, 53, 0.6),
    createTeam('TopTab Club', 'RU', League.INTERMEDIATE, 53, 0.6),
    createTeam('nomatter-', 'UA', League.INTERMEDIATE, 52, 0.6),
    createTeam('Whykick', 'RU', League.INTERMEDIATE, 52, 0.6),
];

// --- 3. ESEA MAIN (20 Teams) ---
// Slightly Buffed
const MAIN_TEAMS: Team[] = [
    createTeam('HOTU eSports', 'AU', League.MAIN, 70, 0.7),
    createTeam('Nemiga academy', 'BY', League.MAIN, 69, 0.7),
    createTeam('The Prodigies France', 'FR', League.MAIN, 68, 0.7),
    createTeam('Nemiga Gaming', 'BY', League.MAIN, 68, 0.7),
    createTeam('Permitta Academy', 'PL', League.MAIN, 67, 0.7),
    createTeam('YNT', 'RU', League.MAIN, 67, 0.7),
    createTeam('Pepsilon', 'SE', League.MAIN, 66, 0.7),
    createTeam('Nightmare eSports', 'RU', League.MAIN, 65, 0.7),
    createTeam('Arctic Raptors', 'DK', League.MAIN, 64, 0.7),
    createTeam('Chosen Few', 'TR', League.MAIN, 63, 0.7),
    createTeam('RoundsGG', 'FI', League.MAIN, 63, 0.7),
    createTeam('Entropy Main', 'DE', League.MAIN, 62, 0.7),
    createTeam('FLuffyGangsters', 'RU', League.MAIN, 62, 0.7),
    createTeam('K10', 'IE', League.MAIN, 61, 0.7),
    createTeam('TeamOWL', 'RU', League.MAIN, 61, 0.7),
    createTeam('AVANGAR', 'KZ', League.MAIN, 60, 0.7),
    createTeam('Catchii', 'DK', League.MAIN, 60, 0.7),
    createTeam('GTZ ESPORTS', 'PT', League.MAIN, 59, 0.7),
    createTeam('kyoto', 'PL', League.MAIN, 59, 0.7),
    createTeam('TeamOrange', 'DE', League.MAIN, 58, 0.7),
];

// --- 4. ESEA ADVANCED (20 Teams) ---
const ADVANCED_TEAMS: Team[] = [
    createTeam('ALTERNATE aTTaX', 'DE', League.ADVANCED, 78, 0.8),
    createTeam('00Prospects', 'NO', League.ADVANCED, 77, 0.8),
    createTeam('Aurora Gaming', 'RS', League.ADVANCED, 76, 0.8),
    createTeam('Katuna', 'BG', League.ADVANCED, 75, 0.8),
    createTeam('IKLA', 'UA', League.ADVANCED, 74, 0.8),
    createTeam('iNation', 'RS', League.ADVANCED, 73, 0.8),
    createTeam('SINNERS Esports', 'CZ', League.ADVANCED, 73, 0.8),
    createTeam('Hydra Team', 'KG', League.ADVANCED, 72, 0.8),
    createTeam('Dynamo Eclot', 'CZ', League.ADVANCED, 71, 0.8),
    createTeam('LnG', 'UA', League.ADVANCED, 70, 0.8),
    createTeam('MOUZ NXT', 'DK', League.ADVANCED, 70, 0.8),
    createTeam('FTW Esports', 'PT', League.ADVANCED, 69, 0.8),
    createTeam('L00kingF0r0rg', 'BY', League.ADVANCED, 69, 0.8),
    createTeam('Websterz', 'BY', League.ADVANCED, 68, 0.8),
    createTeam('The Prodigies', 'PL', League.ADVANCED, 68, 0.8),
    createTeam('9 Pandas', 'RU', League.ADVANCED, 67, 0.8),
    createTeam('TEAM MOON', 'RU', League.ADVANCED, 67, 0.8),
    createTeam('sYnck', 'EE', League.ADVANCED, 66, 0.8),
    createTeam('ARCRED', 'RU', League.ADVANCED, 66, 0.8),
    createTeam('Coalesce', 'UK', League.ADVANCED, 65, 0.8),
];

// --- 5. ESL CHALLENGER (20 Teams) ---
const CHALLENGER_TEAMS: Team[] = [
    createTeam('Spirit Academy', 'EE', League.CHALLENGER, 85, 1.0),
    createTeam('Apeks', 'NO', League.CHALLENGER, 88, 1.0),
    createTeam('Monte', 'UA', League.CHALLENGER, 87, 1.0),
    createTeam('SproutGG', 'DE', League.CHALLENGER, 84, 1.0),
    createTeam('1WIN', 'RU', League.CHALLENGER, 83, 1.0),
    createTeam('SAW', 'PT', League.CHALLENGER, 86, 1.0),
    createTeam('Sangal', 'DE', League.CHALLENGER, 82, 1.0),
    createTeam('Team Falcons', 'FR', League.CHALLENGER, 89, 1.2),
    createTeam('Movistar KOI', 'ES', League.CHALLENGER, 82, 1.0),
    createTeam('B8', 'UA', League.CHALLENGER, 81, 1.0),
    createTeam('9INE', 'PL', League.CHALLENGER, 81, 1.0),
    createTeam('EYEBALLERS', 'SE', League.CHALLENGER, 80, 1.0),
    createTeam('BIG Academy', 'DE', League.CHALLENGER, 79, 1.0),
    createTeam('LDLC OL', 'FR', League.CHALLENGER, 79, 1.0),
    createTeam('Looking4org', 'FR', League.CHALLENGER, 78, 1.0),
    createTeam('k23', 'KZ', League.CHALLENGER, 78, 1.0),
    createTeam('forZe', 'RU', League.CHALLENGER, 77, 1.0),
    createTeam('Let us cook', 'DE', League.CHALLENGER, 77, 1.0),
    createTeam('ORKS', 'PL', League.CHALLENGER, 76, 1.0),
    createTeam('Iron-Branch', 'CZ', League.CHALLENGER, 75, 1.0),
];

// --- 6. GLOBAL WORLD RANKING (Fixed Rosters from Screenshot) ---
export const WORLD_RANKING: Team[] = [
    createTeam('Vitality', 'FR', League.PRO, 93, 1.5, [
        {alias: 'apEX', role: PlayerRole.IGL, country: 'FR', rating: 83},
        {alias: 'ropz', role: PlayerRole.LURKER, country: 'EE', rating: 93},
        {alias: 'ZywOo', role: PlayerRole.AWPER, country: 'FR', rating: 99},
        {alias: 'flameZ', role: PlayerRole.ENTRY, country: 'IL', rating: 91},
        {alias: 'mezii', role: PlayerRole.SUPPORT, country: 'UK', rating: 86}
    ]),
    createTeam('FURIA', 'BR', League.PRO, 91, 1.4, [
        {alias: 'FalleN', role: PlayerRole.IGL, country: 'BR', rating: 85},
        {alias: 'yuurih', role: PlayerRole.LURKER, country: 'BR', rating: 92},
        {alias: 'YEKINDAR', role: PlayerRole.ENTRY, country: 'LV', rating: 88},
        {alias: 'KSCERATO', role: PlayerRole.LURKER, country: 'BR', rating: 94},
        {alias: 'molodoy', role: PlayerRole.AWPER, country: 'RU', rating: 89}
    ]),
    createTeam('Falcons', 'SA', League.PRO, 92, 1.5, [
        {alias: 'NiKo', role: PlayerRole.ENTRY, country: 'BA', rating: 96},
        {alias: 'TeSeS', role: PlayerRole.SUPPORT, country: 'DK', rating: 86},
        {alias: 'm0NESY', role: PlayerRole.AWPER, country: 'RU', rating: 98},
        {alias: 'kyxsan', role: PlayerRole.IGL, country: 'MK', rating: 84},
        {alias: 'kyousuke', role: PlayerRole.ENTRY, country: 'JP', rating: 85}
    ]),
    createTeam('MOUZ', 'EU', League.PRO, 91, 1.4, [
        {alias: 'Brollan', role: PlayerRole.IGL, country: 'SE', rating: 87},
        {alias: 'torzsi', role: PlayerRole.AWPER, country: 'HU', rating: 90},
        {alias: 'Spinx', role: PlayerRole.LURKER, country: 'IL', rating: 91},
        {alias: 'Jimpphat', role: PlayerRole.LURKER, country: 'FI', rating: 93},
        {alias: 'xertioN', role: PlayerRole.ENTRY, country: 'IL', rating: 89}
    ]),
    createTeam('The MongolZ', 'MN', League.PRO, 90, 1.2, [
        {alias: 'bLitz', role: PlayerRole.IGL, country: 'MN', rating: 88},
        {alias: 'Techno', role: PlayerRole.ENTRY, country: 'MN', rating: 89},
        {alias: 'mzinho', role: PlayerRole.LURKER, country: 'MN', rating: 87},
        {alias: '910', role: PlayerRole.AWPER, country: 'MN', rating: 92},
        {alias: 'Senzu', role: PlayerRole.ENTRY, country: 'MN', rating: 90}
    ]),
    createTeam('Spirit', 'RU', League.PRO, 92, 1.5, [
        {alias: 'chopper', role: PlayerRole.IGL, country: 'RU', rating: 82},
        {alias: 'sh1ro', role: PlayerRole.AWPER, country: 'RU', rating: 94},
        {alias: 'tN1R', role: PlayerRole.ENTRY, country: 'RU', rating: 85},
        {alias: 'donk', role: PlayerRole.ENTRY, country: 'RU', rating: 99},
        {alias: 'zweih', role: PlayerRole.SUPPORT, country: 'RU', rating: 84}
    ]),
    createTeam('Aurora', 'TR', League.PRO, 89, 1.3, [
        {alias: 'MAJ3R', role: PlayerRole.IGL, country: 'TR', rating: 84},
        {alias: 'XANTARES', role: PlayerRole.ENTRY, country: 'TR', rating: 93},
        {alias: 'woxic', role: PlayerRole.AWPER, country: 'TR', rating: 90},
        {alias: 'Wicadia', role: PlayerRole.ENTRY, country: 'TR', rating: 88},
        {alias: 'jottAAA', role: PlayerRole.SUPPORT, country: 'BR', rating: 85}
    ]),
    createTeam('G2', 'EU', League.PRO, 91, 1.5, [
        {alias: 'huNter-', role: PlayerRole.IGL, country: 'BA', rating: 88},
        {alias: 'malbsMd', role: PlayerRole.ENTRY, country: 'GT', rating: 90},
        {alias: 'SunPayus', role: PlayerRole.AWPER, country: 'ES', rating: 91},
        {alias: 'HeavyGod', role: PlayerRole.ENTRY, country: 'IL', rating: 89},
        {alias: 'MATYS', role: PlayerRole.SUPPORT, country: 'SK', rating: 87}
    ]),
    createTeam('Natus Vincere', 'UA', League.PRO, 92, 1.5, [
        {alias: 'Aleksib', role: PlayerRole.IGL, country: 'FI', rating: 85},
        {alias: 'iM', role: PlayerRole.ENTRY, country: 'RO', rating: 92},
        {alias: 'b1t', role: PlayerRole.ENTRY, country: 'UA', rating: 94},
        {alias: 'w0nderful', role: PlayerRole.AWPER, country: 'UA', rating: 91},
        {alias: 'makazze', role: PlayerRole.SUPPORT, country: 'UA', rating: 88}
    ]),
    createTeam('paiN', 'BR', League.PRO, 88, 1.2, [
        {alias: 'dgt', role: PlayerRole.ENTRY, country: 'BR', rating: 89},
        {alias: 'biguzera', role: PlayerRole.IGL, country: 'BR', rating: 90},
        {alias: 'dav1deuS', role: PlayerRole.SUPPORT, country: 'BR', rating: 86},
        {alias: 'nqz', role: PlayerRole.AWPER, country: 'BR', rating: 88},
        {alias: 'snow', role: PlayerRole.ENTRY, country: 'BR', rating: 87}
    ]),
    createTeam('Astralis', 'DK', League.PRO, 89, 1.4, [
        {alias: 'device', role: PlayerRole.AWPER, country: 'DK', rating: 93},
        {alias: 'Magisk', role: PlayerRole.LURKER, country: 'DK', rating: 90},
        {alias: 'HooXi', role: PlayerRole.IGL, country: 'DK', rating: 80},
        {alias: 'jabbi', role: PlayerRole.ENTRY, country: 'DK', rating: 91},
        {alias: 'Staehr', role: PlayerRole.SUPPORT, country: 'DK', rating: 87}
    ]),
    createTeam('3DMAX', 'FR', League.PRO, 86, 1.2, [
        {alias: 'bodyy', role: PlayerRole.LURKER, country: 'FR', rating: 87},
        {alias: 'Maka', role: PlayerRole.AWPER, country: 'FR', rating: 88},
        {alias: 'Lucky', role: PlayerRole.ENTRY, country: 'FR', rating: 85},
        {alias: 'Ex3rcice', role: PlayerRole.SUPPORT, country: 'FR', rating: 84},
        {alias: 'Graviti', role: PlayerRole.IGL, country: 'FR', rating: 83}
    ]),
    createTeam('FaZe', 'EU', League.PRO, 90, 1.5, [
        {alias: 'karrigan', role: PlayerRole.IGL, country: 'DK', rating: 82},
        {alias: 'frozen', role: PlayerRole.LURKER, country: 'SK', rating: 93},
        {alias: 'Twistzz', role: PlayerRole.ENTRY, country: 'CA', rating: 92},
        {alias: 'broky', role: PlayerRole.AWPER, country: 'LV', rating: 94},
        {alias: 'jcobbb', role: PlayerRole.SUPPORT, country: 'DK', rating: 85}
    ]),
    createTeam('Legacy', 'BR', League.PRO, 85, 1.1, [
        {alias: 'dumau', role: PlayerRole.ENTRY, country: 'BR', rating: 88},
        {alias: 'latto', role: PlayerRole.SUPPORT, country: 'BR', rating: 85},
        {alias: 'n1ssim', role: PlayerRole.ENTRY, country: 'BR', rating: 84},
        {alias: 'lux', role: PlayerRole.IGL, country: 'BR', rating: 83},
        {alias: 'saadzin', role: PlayerRole.AWPER, country: 'BR', rating: 87}
    ]),
    createTeam('Liquid', 'US', League.PRO, 88, 1.4, [
        {alias: 'NAF', role: PlayerRole.LURKER, country: 'CA', rating: 91},
        {alias: 'EliGE', role: PlayerRole.ENTRY, country: 'US', rating: 92},
        {alias: 'NertZ', role: PlayerRole.ENTRY, country: 'IL', rating: 90},
        {alias: 'siuhy', role: PlayerRole.IGL, country: 'PL', rating: 88},
        {alias: 'ultimate', role: PlayerRole.AWPER, country: 'PL', rating: 87}
    ]),
    createTeam('HEROIC', 'NO', League.PRO, 84, 1.3, [
        {alias: 'xfl0ud', role: PlayerRole.ENTRY, country: 'TR', rating: 85},
        {alias: 'LNZ', role: PlayerRole.IGL, country: 'SE', rating: 82},
        {alias: 'nilo', role: PlayerRole.ENTRY, country: 'SE', rating: 89},
        {alias: 'yxngstxr', role: PlayerRole.LURKER, country: 'SE', rating: 84},
        {alias: 'Alkaren', role: PlayerRole.AWPER, country: 'SE', rating: 86}
    ]),
    createTeam('GamerLegion', 'EU', League.PRO, 83, 1.2, [
        {alias: 'REZ', role: PlayerRole.ENTRY, country: 'SE', rating: 88},
        {alias: 'ztr', role: PlayerRole.IGL, country: 'SE', rating: 83},
        {alias: 'Tauson', role: PlayerRole.LURKER, country: 'DK', rating: 84},
        {alias: 'PR', role: PlayerRole.SUPPORT, country: 'RO', rating: 82},
        {alias: 'hypex', role: PlayerRole.AWPER, country: 'DK', rating: 85}
    ]),
    createTeam('Gentle Mates', 'FR', League.PRO, 82, 1.1, [
        {alias: 'alex', role: PlayerRole.IGL, country: 'ES', rating: 84},
        {alias: 'mopoz', role: PlayerRole.ENTRY, country: 'ES', rating: 85},
        {alias: 'sausol', role: PlayerRole.ENTRY, country: 'ES', rating: 83},
        {alias: 'dav1g', role: PlayerRole.SUPPORT, country: 'ES', rating: 81},
        {alias: 'MartinezSa', role: PlayerRole.AWPER, country: 'ES', rating: 86}
    ]),
    createTeam('SAW', 'PT', League.PRO, 83, 1.1, [
        {alias: 'MUTiRiS', role: PlayerRole.IGL, country: 'PT', rating: 85},
        {alias: 'story', role: PlayerRole.AWPER, country: 'PT', rating: 87},
        {alias: 'Ag1l', role: PlayerRole.ENTRY, country: 'PT', rating: 84},
        {alias: 'aragornN', role: PlayerRole.LURKER, country: 'PT', rating: 83},
        {alias: 'krazy', role: PlayerRole.SUPPORT, country: 'PT', rating: 82}
    ]),
    createTeam('Passion UA', 'UA', League.PRO, 81, 1.0, [
        {alias: 'JT', role: PlayerRole.IGL, country: 'ZA', rating: 84},
        {alias: 'hallzerk', role: PlayerRole.AWPER, country: 'US', rating: 86},
        {alias: 'Grim', role: PlayerRole.ENTRY, country: 'US', rating: 85},
        {alias: 'Kvem', role: PlayerRole.LURKER, country: 'UA', rating: 82},
        {alias: 'nicx', role: PlayerRole.SUPPORT, country: 'UA', rating: 80}
    ]),
    createTeam('B8', 'UA', League.PRO, 80, 1.0, [
        {alias: 'headtr1ck', role: PlayerRole.AWPER, country: 'UA', rating: 85},
        {alias: 'alex666', role: PlayerRole.ENTRY, country: 'UA', rating: 83},
        {alias: 'npl', role: PlayerRole.LURKER, country: 'UA', rating: 84},
        {alias: 'kensizor', role: PlayerRole.SUPPORT, country: 'UA', rating: 81},
        {alias: 'esenthial', role: PlayerRole.ENTRY, country: 'UA', rating: 82}
    ]),
    createTeam('Lynn Vision', 'CN', League.PRO, 79, 1.0, [
        {alias: 'Westmelon', role: PlayerRole.IGL, country: 'CN', rating: 81},
        {alias: 'z4kr', role: PlayerRole.AWPER, country: 'CN', rating: 85},
        {alias: 'Starry', role: PlayerRole.ENTRY, country: 'CN', rating: 84},
        {alias: 'EmiliaQAQ', role: PlayerRole.LURKER, country: 'CN', rating: 82},
        {alias: 'C4LLM3SU3', role: PlayerRole.SUPPORT, country: 'CN', rating: 80}
    ]),
    createTeam('Virtus.pro', 'RU', League.PRO, 84, 1.4, [
        {alias: 'FL1T', role: PlayerRole.LURKER, country: 'RU', rating: 88},
        {alias: 'Perfecto', role: PlayerRole.IGL, country: 'RU', rating: 86},
        {alias: 'fame', role: PlayerRole.ENTRY, country: 'RU', rating: 87},
        {alias: 'b1st', role: PlayerRole.AWPER, country: 'RU', rating: 85},
        {alias: 't00RO', role: PlayerRole.ENTRY, country: 'RU', rating: 84}
    ]),
    createTeam('HOTU', 'RU', League.PRO, 78, 1.0, [
        {alias: 'n0rb3r7', role: PlayerRole.ENTRY, country: 'RU', rating: 84},
        {alias: 'dukefissura', role: PlayerRole.IGL, country: 'RU', rating: 80},
        {alias: 'mizu', role: PlayerRole.AWPER, country: 'RU', rating: 83},
        {alias: 'kAlash', role: PlayerRole.LURKER, country: 'RU', rating: 82},
        {alias: 'frontales', role: PlayerRole.ENTRY, country: 'RU', rating: 81}
    ]),
    createTeam('TYLOO', 'CN', League.PRO, 77, 1.0, [
        {alias: 'Attacker', role: PlayerRole.ENTRY, country: 'CN', rating: 83},
        {alias: 'JamYoung', role: PlayerRole.LURKER, country: 'CN', rating: 82},
        {alias: 'Jee', role: PlayerRole.AWPER, country: 'CN', rating: 81},
        {alias: 'Mercury', role: PlayerRole.IGL, country: 'CN', rating: 79},
        {alias: 'Moseyuh', role: PlayerRole.SUPPORT, country: 'CN', rating: 80}
    ]),
    createTeam('M80', 'US', League.PRO, 76, 1.1, [
        {alias: 'slaxz-', role: PlayerRole.AWPER, country: 'US', rating: 84},
        {alias: 'Swisher', role: PlayerRole.ENTRY, country: 'US', rating: 83},
        {alias: 'HexT', role: PlayerRole.ENTRY, country: 'US', rating: 81},
        {alias: 's1n', role: PlayerRole.IGL, country: 'DE', rating: 80},
        {alias: 'Lake', role: PlayerRole.LURKER, country: 'US', rating: 82}
    ]),
    createTeam('fnatic', 'EU', League.PRO, 75, 1.3, [
        {alias: 'KRIMZ', role: PlayerRole.SUPPORT, country: 'SE', rating: 85},
        {alias: 'blameF', role: PlayerRole.LURKER, country: 'DK', rating: 88},
        {alias: 'fEAR', role: PlayerRole.IGL, country: 'UA', rating: 81},
        {alias: 'jambo', role: PlayerRole.AWPER, country: 'UA', rating: 80},
        {alias: 'jackasmo', role: PlayerRole.ENTRY, country: 'UA', rating: 79}
    ]),
    createTeam('Inner Circle', 'RU', League.PRO, 74, 0.9, [
        {alias: 'Flierax', role: PlayerRole.AWPER, country: 'RU', rating: 82},
        {alias: 'onic', role: PlayerRole.IGL, country: 'RU', rating: 79},
        {alias: 'Dawy', role: PlayerRole.LURKER, country: 'RU', rating: 80},
        {alias: 'cairne', role: PlayerRole.SUPPORT, country: 'RU', rating: 78},
        {alias: 'Magnus', role: PlayerRole.ENTRY, country: 'RU', rating: 81}
    ]),
    createTeam('BetBoom', 'RU', League.PRO, 73, 1.2, [
        {alias: 'Boombl4', role: PlayerRole.IGL, country: 'RU', rating: 85},
        {alias: 's1ren', role: PlayerRole.SUPPORT, country: 'RU', rating: 82},
        {alias: 'd1Ledez', role: PlayerRole.LURKER, country: 'RU', rating: 81},
        {alias: 'ArtFr0st', role: PlayerRole.AWPER, country: 'RU', rating: 84},
        {alias: 'Magnojez', role: PlayerRole.ENTRY, country: 'RU', rating: 80}
    ]),
    createTeam('Ninjas in Pyjamas', 'SE', League.PRO, 72, 1.3, [
        {alias: 'Snappi', role: PlayerRole.IGL, country: 'DK', rating: 82},
        {alias: 'sjuush', role: PlayerRole.SUPPORT, country: 'DK', rating: 85},
        {alias: 'r1nkle', role: PlayerRole.AWPER, country: 'UA', rating: 87},
        {alias: 'ewjerkz', role: PlayerRole.ENTRY, country: 'PT', rating: 83},
        {alias: 'xKacpersky', role: PlayerRole.LURKER, country: 'PL', rating: 84}
    ]),
    createTeam('FUT', 'TR', League.PRO, 71, 1.0, [
        {alias: 'dem0n', role: PlayerRole.ENTRY, country: 'TR', rating: 83},
        {alias: 'lauNX', role: PlayerRole.LURKER, country: 'RO', rating: 82},
        {alias: 'Krabeni', role: PlayerRole.SUPPORT, country: 'TR', rating: 80},
        {alias: 'cmtry', role: PlayerRole.IGL, country: 'TR', rating: 79},
        {alias: 'dziugss', role: PlayerRole.AWPER, country: 'TR', rating: 81}
    ]),
    createTeam('FlyQuest', 'AU', League.PRO, 70, 1.1, [
        {alias: 'jks', role: PlayerRole.LURKER, country: 'AU', rating: 88},
        {alias: 'INS', role: PlayerRole.IGL, country: 'AU', rating: 84},
        {alias: 'Vexite', role: PlayerRole.ENTRY, country: 'AU', rating: 83},
        {alias: 'nettik', role: PlayerRole.SUPPORT, country: 'NZ', rating: 80},
        {alias: 'regali', role: PlayerRole.AWPER, country: 'RO', rating: 85}
    ]),
    createTeam('ENCE', 'FI', League.PRO, 69, 1.2, [
        {alias: 'rigoN', role: PlayerRole.ENTRY, country: 'XK', rating: 84},
        {alias: 'sdy', role: PlayerRole.IGL, country: 'UA', rating: 86},
        {alias: 'myltsi', role: PlayerRole.SUPPORT, country: 'FI', rating: 80},
        {alias: 'podi', role: PlayerRole.AWPER, country: 'FI', rating: 82},
        {alias: 'Neityu', role: PlayerRole.ENTRY, country: 'FR', rating: 81}
    ]),
    createTeam('9INE', 'SE', League.PRO, 68, 1.0, [
        {alias: 'raalz', role: PlayerRole.IGL, country: 'DK', rating: 82},
        {alias: 'faveN', role: PlayerRole.LURKER, country: 'DE', rating: 84},
        {alias: 'kraghen', role: PlayerRole.ENTRY, country: 'DK', rating: 81},
        {alias: 'MoDo', role: PlayerRole.AWPER, country: 'BG', rating: 83},
        {alias: 'cej0t', role: PlayerRole.SUPPORT, country: 'PL', rating: 80}
    ]),
    createTeam('PARIVISION', 'RU', League.PRO, 67, 1.0, [
        {alias: 'Jame', role: PlayerRole.AWPER, country: 'RU', rating: 91},
        {alias: 'BELCHONOKK', role: PlayerRole.ENTRY, country: 'RU', rating: 80},
        {alias: 'AW', role: PlayerRole.SUPPORT, country: 'RU', rating: 79},
        {alias: 'xiELO', role: PlayerRole.LURKER, country: 'RU', rating: 82},
        {alias: 'nota', role: PlayerRole.ENTRY, country: 'RU', rating: 81}
    ]),
    createTeam('MIBR', 'BR', League.PRO, 66, 1.1, [
        {alias: 'exit', role: PlayerRole.IGL, country: 'BR', rating: 83},
        {alias: 'Qikert', role: PlayerRole.SUPPORT, country: 'KZ', rating: 82},
        {alias: 'brnz4n', role: PlayerRole.ENTRY, country: 'BR', rating: 84},
        {alias: 'insani', role: PlayerRole.ENTRY, country: 'BR', rating: 85},
        {alias: 'kl1m', role: PlayerRole.AWPER, country: 'RU', rating: 80}
    ]),
    createTeam('EYEBALLERS', 'SE', League.PRO, 65, 1.0, [
        {alias: 'JW', role: PlayerRole.AWPER, country: 'SE', rating: 85},
        {alias: 'maxster', role: PlayerRole.ENTRY, country: 'SE', rating: 83},
        {alias: 'Ro1f', role: PlayerRole.SUPPORT, country: 'SE', rating: 80},
        {alias: 'bobeksde', role: PlayerRole.LURKER, country: 'SE', rating: 81},
        {alias: 'dex', role: PlayerRole.ENTRY, country: 'SE', rating: 82}
    ]),
    createTeam('NRG', 'US', League.PRO, 64, 1.2, [
        {alias: 'nitr0', role: PlayerRole.IGL, country: 'US', rating: 86},
        {alias: 'Sonic', role: PlayerRole.LURKER, country: 'ZA', rating: 82},
        {alias: 'XotiC', role: PlayerRole.AWPER, country: 'US', rating: 84},
        {alias: 'br0', role: PlayerRole.LURKER, country: 'DK', rating: 83},
        {alias: 'Jeorge', role: PlayerRole.SUPPORT, country: 'US', rating: 81}
    ]),
    createTeam('Fluxo', 'BR', League.PRO, 63, 1.0, [
        {alias: 'arT', role: PlayerRole.IGL, country: 'BR', rating: 85},
        {alias: 'Lucaozy', role: PlayerRole.ENTRY, country: 'BR', rating: 84},
        {alias: 'zevy', role: PlayerRole.AWPER, country: 'BR', rating: 83},
        {alias: 'decenty', role: PlayerRole.LURKER, country: 'BR', rating: 81},
        {alias: 'kye', role: PlayerRole.SUPPORT, country: 'BR', rating: 80}
    ]),
    createTeam('OG', 'EU', League.PRO, 62, 1.2, [
        {alias: 'cadian', role: PlayerRole.IGL, country: 'DK', rating: 87},
        {alias: 'spooke', role: PlayerRole.LURKER, country: 'DK', rating: 82},
        {alias: 'arrozdoce', role: PlayerRole.ENTRY, country: 'PT', rating: 83},
        {alias: 'adamb', role: PlayerRole.SUPPORT, country: 'CZ', rating: 81},
        {alias: 'F1KU', role: PlayerRole.ENTRY, country: 'PL', rating: 84}
    ])
].map((t, i) => ({...t, rankingPoints: 934 - (i * 23)})); // Descending points starting from 934

const PRO_TEAMS: Team[] = WORLD_RANKING.filter(t => t.league === League.PRO);

export const TEAMS_BY_LEAGUE = {
    [League.OPEN]: OPEN_TEAMS,
    [League.INTERMEDIATE]: INTERMEDIATE_TEAMS,
    [League.MAIN]: MAIN_TEAMS,
    [League.ADVANCED]: ADVANCED_TEAMS,
    [League.CHALLENGER]: CHALLENGER_TEAMS,
    [League.PRO]: PRO_TEAMS
};