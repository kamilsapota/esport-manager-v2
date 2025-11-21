import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, MatchResult, Team, PlayerRole, OpponentAnalysis, PlayerMatchStats, MatchLog, KillEvent } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- FALLBACK GENERATORS (LOCAL) ---

const generateRandomPlayerLocal = (avgValue: number): Player => {
    const roles = [PlayerRole.IGL, PlayerRole.AWPER, PlayerRole.ENTRY, PlayerRole.SUPPORT, PlayerRole.LURKER];
    const countries = ['DK', 'SE', 'FR', 'DE', 'PL', 'RU', 'UA', 'US', 'BR'];
    const names = ['Ghost', 'Viper', 'Dash', 'Strike', 'Pixel', 'Glitch', 'Neon', 'Flux', 'Echo', 'Ace'];
    
    const role = roles[Math.floor(Math.random() * roles.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const alias = `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 99)}`;
    
    // Generate stats around 40-90
    const baseStat = 40 + Math.floor(Math.random() * 50);
    
    return {
        id: crypto.randomUUID(),
        alias,
        fullName: alias,
        age: 16 + Math.floor(Math.random() * 10),
        country,
        role,
        stats: {
            aim: Math.min(99, baseStat + Math.floor(Math.random() * 20 - 10)),
            reflex: Math.min(99, baseStat + Math.floor(Math.random() * 20 - 10)),
            strategy: Math.min(99, baseStat + Math.floor(Math.random() * 20 - 10)),
            utility: Math.min(99, baseStat + Math.floor(Math.random() * 20 - 10)),
            clutch: Math.min(99, baseStat + Math.floor(Math.random() * 20 - 10)),
        },
        marketValue: avgValue * (0.8 + Math.random() * 0.4),
        salary: avgValue * 0.05,
        morale: 50 + Math.floor(Math.random() * 40),
        matchHistory: []
    };
};

// Economy Types
type BuyType = 'PISTOL' | 'FORCE' | 'ECO' | 'ANTI_ECO' | 'FULL_BUY';

// Helper to generate realistic killfeed events that SUM up to the calculated stats
const generateDetailedMatchLogs = (
    finalScoreUs: number,
    finalScoreEnemy: number,
    usStats: PlayerMatchStats[],
    enemyStats: PlayerMatchStats[],
    myTeam: Team,
    enemyTeam: Team
): MatchLog[] => {
    const logs: MatchLog[] = [];
    let currentScoreUs = 0;
    let currentScoreEnemy = 0;
    
    // Determine Winner
    const winnerIsUs = finalScoreUs > finalScoreEnemy;
    const winnerScore = 13; // CS2 MR12
    const loserScore = winnerIsUs ? finalScoreEnemy : finalScoreUs;

    // Pre-calculate the sequence of wins to ensure we end EXACTLY at the target score without overshooting
    const roundWinners: ('us' | 'enemy')[] = [];
    
    // 1. Fill array with required wins
    for(let i=0; i<winnerScore-1; i++) roundWinners.push(winnerIsUs ? 'us' : 'enemy'); // -1 because last round is fixed
    for(let i=0; i<loserScore; i++) roundWinners.push(winnerIsUs ? 'enemy' : 'us');
    
    // 2. Shuffle rounds (except the last one)
    roundWinners.sort(() => Math.random() - 0.5);
    
    // 3. Append the game-winning round at the end
    roundWinners.push(winnerIsUs ? 'us' : 'enemy');

    // Create "Decks" of events for each player to distribute across rounds
    const usKillDeck = usStats.flatMap(p => Array(p.kills).fill(p.alias));
    const enemyKillDeck = enemyStats.flatMap(p => Array(p.kills).fill(p.alias));
    const usDeathDeck = usStats.flatMap(p => Array(p.deaths).fill(p.alias));
    const enemyDeathDeck = enemyStats.flatMap(p => Array(p.deaths).fill(p.alias));

    // Shuffle decks
    const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
    shuffle(usKillDeck); shuffle(enemyKillDeck); shuffle(usDeathDeck); shuffle(enemyDeathDeck);

    // Economy State Tracking
    let usBuy: BuyType = 'PISTOL';
    let enemyBuy: BuyType = 'PISTOL';
    let usPrevRoundResult: 'WIN' | 'LOSS' | null = null;
    let enemyPrevRoundResult: 'WIN' | 'LOSS' | null = null;

    // Helper to determine Next Round Buy
    const determineNextBuy = (
        prevBuy: BuyType, 
        result: 'WIN' | 'LOSS', 
        isPistolRound: boolean,
        roundNum: number,
        myScore: number,
        enemyScore: number
    ): BuyType => {
        if (isPistolRound) return 'PISTOL';

        // CRITICAL: Last Round of Half (12) or Match Point Logic (Enemy has 12)
        const isHalfLastRound = roundNum === 12;
        const isMatchPointForEnemy = enemyScore === 12;
        // If it's the last round, we MUST spend all money. 
        // If we were going to ECO or FORCE, we FORCE with everything we have.
        // If we were FULL_BUY, we stay FULL_BUY.
        const mustForce = isHalfLastRound || isMatchPointForEnemy;

        let nextBuy: BuyType = 'ECO';

        if (result === 'WIN') {
            if (prevBuy === 'PISTOL') nextBuy = 'ANTI_ECO'; // Won pistol -> Anti-Eco
            else if (prevBuy === 'FORCE') nextBuy = 'FULL_BUY'; // Won force -> Good money usually
            else nextBuy = 'FULL_BUY'; // Kept winning -> Full Buy
        } else {
            // LOST
            if (prevBuy === 'PISTOL') nextBuy = 'FORCE'; // Lost pistol -> Force round 2 (ALWAYS)
            else if (prevBuy === 'FORCE') nextBuy = 'ECO'; // Lost pistol AND force -> Eco round 3
            else if (prevBuy === 'ECO') nextBuy = 'FULL_BUY'; // Saved last round -> Buy now
            else if (prevBuy === 'FULL_BUY') nextBuy = 'FORCE'; // Lost full buy -> forced to save or half buy
            // Correction for Full Buy Loss: Usually you drop to Force/Eco. 
            // If loss bonus is high, maybe force. For sim simplicity:
            // If we lost a Full Buy, we usually need to Eco unless loss bonus is max. 
            // Let's alternate for variance:
            else nextBuy = Math.random() > 0.5 ? 'ECO' : 'FORCE'; 
        }

        // OVERRIDE: If Must Force, never Eco
        if (mustForce && nextBuy === 'ECO') {
            return 'FORCE';
        }

        return nextBuy;
    };

    const getWinProbability = (usBuy: BuyType, enemyBuy: BuyType): number => {
        // Returns probability (0-1) that US wins
        const strength = { 'ECO': 1, 'PISTOL': 2, 'FORCE': 3, 'ANTI_ECO': 4, 'FULL_BUY': 5 };
        
        const usStr = strength[usBuy];
        const enStr = strength[enemyBuy];
        
        if (usStr === enStr) return 0.5;
        
        // Eco vs Full = 1 vs 5. Diff = 4.
        // Full vs Eco = 5 vs 1. Diff = 4.
        const diff = usStr - enStr; // Range -4 to 4
        
        // Base chance 50% + (diff * 10%)
        // Eco(1) vs Full(5) = -4 -> 10% win chance
        // Force(3) vs Full(5) = -2 -> 30% win chance
        // Full(5) vs Force(3) = 2 -> 70% win chance
        let prob = 0.5 + (diff * 0.12); 
        
        // Clamp
        return Math.max(0.15, Math.min(0.85, prob));
    };

    for (let i = 0; i < roundWinners.length; i++) {
        const roundNum = i + 1;
        const isUserCT = roundNum <= 12; // CS2 MR12: Switch at 13

        // --- ECONOMY LOGIC ---
        const isPistolRound = roundNum === 1 || roundNum === 13;

        if (isPistolRound) {
            usBuy = 'PISTOL';
            enemyBuy = 'PISTOL';
            usPrevRoundResult = null; // Reset momentum on half switch
        } else {
             // Apply Logic
             usBuy = determineNextBuy(usBuy, usPrevRoundResult || 'LOSS', false, roundNum, currentScoreUs, currentScoreEnemy);
             enemyBuy = determineNextBuy(enemyBuy, enemyPrevRoundResult || 'LOSS', false, roundNum, currentScoreEnemy, currentScoreUs);
        }

        // --- REALISM CHECK & SWAP ---
        // Calculate probability of "us" winning this round based on economy
        const usWinProb = getWinProbability(usBuy, enemyBuy);
        const currentPlannedWinner = roundWinners[i]; // 'us' or 'enemy'

        // If result is highly unlikely (e.g. Eco winning vs Full Buy), try to swap with a future round
        let finalRoundWinner = currentPlannedWinner;
        
        const isUpset = (currentPlannedWinner === 'us' && usWinProb < 0.3) || 
                        (currentPlannedWinner === 'enemy' && usWinProb > 0.7);
        
        if (isUpset) {
            // Check if we actually get the upset (20% chance to keep the upset)
            const keepUpset = Math.random() < 0.20; 
            
            if (!keepUpset) {
                // Try to find a future round result that we can swap to make this round "Make Sense"
                // e.g. If we are meant to WIN but we are ECO, look for a LOSS later to swap here.
                const desiredWinner = currentPlannedWinner === 'us' ? 'enemy' : 'us';
                
                // Look ahead
                for (let j = i + 1; j < roundWinners.length; j++) {
                    if (roundWinners[j] === desiredWinner) {
                        // SWAP
                        roundWinners[j] = currentPlannedWinner;
                        roundWinners[i] = desiredWinner;
                        finalRoundWinner = desiredWinner;
                        break;
                    }
                }
            }
        }

        // Update Stats for NEXT round
        usPrevRoundResult = finalRoundWinner === 'us' ? 'WIN' : 'LOSS';
        enemyPrevRoundResult = finalRoundWinner === 'enemy' ? 'WIN' : 'LOSS';

        // Update Score
        if (finalRoundWinner === 'us') currentScoreUs++; else currentScoreEnemy++;

        // Generate Kills
        const roundEvents: KillEvent[] = [];
        let loserDeaths = Math.floor(Math.random() * 3) + 3; // 3-5
        let winnerDeaths = Math.floor(Math.random() * 3); // 0-2

        // Adjust deaths based on buy type (Ecos usually get wiped)
        const loserBuy = finalRoundWinner === 'us' ? enemyBuy : usBuy;
        if (loserBuy === 'ECO') loserDeaths = Math.min(5, loserDeaths + 1);

        if (finalRoundWinner === 'us') {
            loserDeaths = Math.min(loserDeaths, enemyDeathDeck.length, usKillDeck.length);
            winnerDeaths = Math.min(winnerDeaths, usDeathDeck.length, enemyKillDeck.length);
        } else {
            loserDeaths = Math.min(loserDeaths, usDeathDeck.length, enemyKillDeck.length);
            winnerDeaths = Math.min(winnerDeaths, enemyDeathDeck.length, usKillDeck.length);
        }

        // WEAPON SELECTION LOGIC
        const getWeapon = (side: 'CT' | 'T', buyType: BuyType, isAwper: boolean): KillEvent['weapon'] => {
             const rand = Math.random();
             
             if (buyType === 'PISTOL') {
                 if (side === 'CT') return rand > 0.6 ? 'usp' : 'hkp2000';
                 return rand > 0.7 ? 'tec9' : 'glock';
             }

             if (buyType === 'ECO') {
                 if (rand > 0.8) return 'deagle'; // Hero deagle
                 if (rand > 0.6) return 'p250';
                 return side === 'CT' ? 'usp' : 'glock';
             }

             if (buyType === 'FORCE') {
                 if (rand > 0.7) return 'deagle';
                 if (rand > 0.5) return 'ssg08'; // Scout
                 if (side === 'T') return rand > 0.5 ? 'galilar' : 'tec9';
                 return rand > 0.5 ? 'famas' : 'fiveseven';
             }

             if (buyType === 'ANTI_ECO') {
                 // SMGs and lesser rifles
                 if (side === 'CT') return rand > 0.5 ? 'mp9' : 'm4a1'; // 50% chance to keep bonus weapon
                 return rand > 0.5 ? 'mac10' : 'galilar';
             }

             if (buyType === 'FULL_BUY') {
                 if (isAwper && rand > 0.2) return 'awp';
                 if (rand > 0.95) return 'hegrenade'; // Rare nade kill
                 if (rand > 0.98) return 'inferno';
                 if (side === 'T') return 'ak47';
                 return rand > 0.5 ? 'm4a1' : 'm4a4';
             }

             return 'ak47'; // Fallback
        };

        // HEADSHOT LOGIC
        const determineHeadshot = (weapon: string): boolean => {
            if (weapon === 'hegrenade' || weapon === 'inferno' || weapon === 'knife') {
                return false;
            }
            if (weapon === 'awp') {
                return Math.random() < 0.10; // 10% HS chance for AWP
            }
            // Rifles and Pistols
            return Math.random() < 0.75; // 75% HS chance
        };

        // 1. WINNER KILLS (Loser Deaths)
        for (let k = 0; k < loserDeaths; k++) {
            const killer = finalRoundWinner === 'us' ? usKillDeck.pop() : enemyKillDeck.pop();
            const victim = finalRoundWinner === 'us' ? enemyDeathDeck.pop() : usDeathDeck.pop();
            
            if (killer && victim) {
                const killerSide = finalRoundWinner === 'us' ? (isUserCT ? 'CT' : 'T') : (isUserCT ? 'T' : 'CT');
                // Find Killer Role
                const killerTeam = finalRoundWinner === 'us' ? myTeam : enemyTeam;
                const playerObj = killerTeam.players.find(p => p.alias === killer);
                const isAwper = playerObj?.role === PlayerRole.AWPER;
                const buy = finalRoundWinner === 'us' ? usBuy : enemyBuy;
                const weapon = getWeapon(killerSide, buy, isAwper);

                roundEvents.push({
                    killer,
                    victim,
                    weapon: weapon,
                    isHeadshot: determineHeadshot(weapon),
                    killerSide: killerSide
                });
            }
        }

        // 2. LOSER KILLS (Winner Deaths)
        for (let k = 0; k < winnerDeaths; k++) {
            const killer = finalRoundWinner === 'us' ? enemyKillDeck.pop() : usKillDeck.pop();
            const victim = finalRoundWinner === 'us' ? usDeathDeck.pop() : enemyDeathDeck.pop();

            if (killer && victim) {
                const killerSide = finalRoundWinner === 'us' ? (isUserCT ? 'T' : 'CT') : (isUserCT ? 'CT' : 'T');
                const killerTeam = finalRoundWinner === 'us' ? enemyTeam : myTeam;
                const playerObj = killerTeam.players.find(p => p.alias === killer);
                const isAwper = playerObj?.role === PlayerRole.AWPER;
                const buy = finalRoundWinner === 'us' ? enemyBuy : usBuy;
                const weapon = getWeapon(killerSide, buy, isAwper);

                roundEvents.push({
                    killer,
                    victim,
                    weapon: weapon,
                    isHeadshot: determineHeadshot(weapon),
                    killerSide: killerSide
                });
            }
        }
        
        // KILLFEED LOGIC FIX: Ensure 5th kill ends the round if it's a wipe
        if (loserDeaths === 5) {
            // Identify the winning side string (CT or T)
            const winningSide = finalRoundWinner === 'us' ? (isUserCT ? 'CT' : 'T') : (isUserCT ? 'T' : 'CT');
            
            // Separate the events
            const winningKills = roundEvents.filter(e => e.killerSide === winningSide);
            const losingKills = roundEvents.filter(e => e.killerSide !== winningSide);
            
            // Take one kill from the winner to be the absolute final blow
            const finalKill = winningKills.pop();
            
            // Shuffle the rest together (all losing kills + winner kills minus the last one)
            const middleEvents = [...winningKills, ...losingKills].sort(() => Math.random() - 0.5);
            
            // Rebuild array: Middle events first, then the final kill
            roundEvents.length = 0;
            roundEvents.push(...middleEvents);
            if (finalKill) roundEvents.push(finalKill);
        } else {
            // If not a full team wipe (e.g. bomb explosion, time out, or surviving members), just shuffle normally
            roundEvents.sort(() => Math.random() - 0.5);
        }

        // Description Logic based on Economy
        let desc = "Standard gun round.";
        if (isPistolRound) desc = "Pistol Round.";
        else if (usBuy === 'ECO' && enemyBuy === 'ECO') desc = "Chaotic double eco.";
        else if (usBuy === 'ECO') desc = `${myTeam.name} on Eco.`;
        else if (enemyBuy === 'ECO') desc = `${enemyTeam.name} on Eco.`;
        else if (usBuy === 'FORCE' || enemyBuy === 'FORCE') desc = "Force buy skirmish.";
        else if (usBuy === 'FULL_BUY' && enemyBuy === 'FULL_BUY') desc = "Full Buy execution.";
        
        logs.push({
            roundNumber: roundNum,
            winner: finalRoundWinner,
            description: `${finalRoundWinner === 'us' ? myTeam.name : enemyTeam.name} wins. ${desc}`,
            scoreUs: currentScoreUs,
            scoreEnemy: currentScoreEnemy,
            events: roundEvents
        });

        // SAFETY BREAK
        if (currentScoreUs === 13 || currentScoreEnemy === 13) break;
    }

    return logs;
};

const simulateMatchLocal = (myTeam: Team, enemyTeam: Team, tacticalBonus: number = 0, mapBonus: number = 0): Partial<MatchResult> => {
    // Calculate Team Strengths
    const getTeamStrength = (t: Team) => t.players.reduce((acc, p) => acc + (p.stats.aim * 1.2 + p.stats.reflex + p.stats.strategy * 0.8), 0);
    
    const myStrength = getTeamStrength(myTeam);
    const enemyStrength = getTeamStrength(enemyTeam);
    
    const totalStrength = myStrength + enemyStrength;
    
    // Base probability calculated linearly
    let myWinProb = (myStrength / totalStrength); // e.g., 0.45 or 0.55

    // --- BALANCING FIX ---
    // Normalize probability to be closer to 50% for gameplay enjoyment.
    // If probability is 40%, we want it to feel like 48%. 
    // If it's 60%, we feel like 52%. 
    // We push everything towards 0.5 center.
    
    const diffFromCenter = myWinProb - 0.5; 
    // Dampen the difference by 50%
    myWinProb = 0.5 + (diffFromCenter * 0.5);

    // Add tactical/map bonuses
    myWinProb += tacticalBonus + mapBonus;

    // --- HARD FLOOR ---
    // Ensure the user never has less than ~40% chance in a "fair" league match
    // unless they are severely severely outclassed (which shouldn't happen in same league)
    if (myWinProb < 0.40) {
        myWinProb = 0.40 + (Math.random() * 0.05); // Boost to 40-45%
    }

    // Add variance
    const variance = (Math.random() * 0.10) - 0.05;
    myWinProb += variance;

    // Final Clamp
    const clampedProb = Math.max(0.35, Math.min(0.95, myWinProb));

    const isMyWin = Math.random() < clampedProb;
    
    // Generate Score
    const winnerScore = 13;
    
    // Calculate score tightness
    let loserScore = 0;
    const skillGap = Math.abs(myStrength - enemyStrength) / Math.max(myStrength, enemyStrength); 
    
    if (skillGap < 0.1 || clampedProb > 0.4 && clampedProb < 0.6) {
        // Very close game if stats are close OR probability was forced to be close
        loserScore = 9 + Math.floor(Math.random() * 4); // 9 to 12
    } else {
        // Wider gap
        loserScore = 5 + Math.floor(Math.random() * 6); // 5 to 10
    }
    
    // Occasional Overtime Logic (Rare)
    if (Math.random() > 0.92) {
        loserScore = 11 + Math.floor(Math.random() * 2); // 11-12
    }

    const finalScoreUs = isMyWin ? winnerScore : loserScore;
    const finalScoreEnemy = isMyWin ? loserScore : winnerScore;
    
    // MVP
    const winningTeam = isMyWin ? myTeam : enemyTeam;
    const sortedPlayers = [...winningTeam.players].sort((a,b) => b.stats.aim - a.stats.aim);
    const mvp = Math.random() > 0.5 ? sortedPlayers[0] : sortedPlayers[Math.floor(Math.random() * winningTeam.players.length)];

    return {
        finalScoreUs,
        finalScoreEnemy,
        mvpAlias: mvp.alias,
        summary: isMyWin 
            ? `A hard fought victory against ${enemyTeam.name}. The team showed great resilience.` 
            : `A tough loss against ${enemyTeam.name}. We need to improve our strategy.`,
        earnings: isMyWin ? 10000 : 3500,
        // Logs are generated later in simulateMatch wrapper to ensure consistency
        logs: [] 
    };
};

const analyzeMatchupFallback = (myTeam: Team, opponent: Team): OpponentAnalysis => {
     const myAvg = myTeam.players.reduce((a,b) => a + b.stats.aim, 0) / 5;
     const oppAvg = opponent.players.reduce((a,b) => a + b.stats.aim, 0) / 5;
     
     const diff = myAvg - oppAvg;
     // More forgiving analysis calculation
     // If stats are equal, 50%. If -5 diff, it used to be 40%, now make it 45%.
     let winProb = 50 + (diff * 1.5); 
     
     // Clamp visual probability to friendly numbers
     winProb = Math.max(40, Math.min(85, winProb));

     // Find opponent's best/worst maps locally
     let bestMap = "Mirage";
     let bestMapVal = 0;
     let worstMap = "Nuke";
     let worstMapVal = 100;

     if (opponent.mapStats) {
         Object.entries(opponent.mapStats).forEach(([k, v]) => {
             if (v > bestMapVal) { bestMap = k; bestMapVal = v; }
             if (v < worstMapVal) { worstMap = k; worstMapVal = v; }
         });
     }

     return {
         overview: `Local Analysis: A ${Math.abs(diff) < 5 ? 'close' : diff > 0 ? 'favorable' : 'challenging'} matchup based on stats.`,
         keyPlayer: opponent.players.reduce((prev, current) => (prev.stats.aim > current.stats.aim) ? prev : current).alias,
         keyPlayerReason: "Highest rated aimer on their team.",
         strengths: ["Raw Aim", "Aggression"],
         weaknesses: ["Tactical Depth", "Utility Usage"],
         strategy: "Focus on trading kills and playing safe.",
         winProbability: Math.round(winProb),
         bestMap: bestMap,
         bestMapWinRate: bestMapVal,
         worstMap: worstMap,
         worstMapWinRate: worstMapVal
     };
}

// --- MAIN EXPORTS ---

export const generateFreeAgents = async (count: number, budget: number): Promise<Player[]> => {
  const ai = getAiClient();
  
  const playerSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        alias: { type: Type.STRING },
        fullName: { type: Type.STRING },
        age: { type: Type.INTEGER },
        country: { type: Type.STRING },
        role: { type: Type.STRING, enum: Object.values(PlayerRole) },
        marketValue: { type: Type.INTEGER },
        salary: { type: Type.INTEGER },
        stats: {
          type: Type.OBJECT,
          properties: {
            aim: { type: Type.INTEGER },
            reflex: { type: Type.INTEGER },
            strategy: { type: Type.INTEGER },
            utility: { type: Type.INTEGER },
            clutch: { type: Type.INTEGER },
          },
          required: ['aim', 'reflex', 'strategy', 'utility', 'clutch']
        }
      },
      required: ['alias', 'fullName', 'age', 'country', 'role', 'marketValue', 'salary', 'stats']
    }
  };

  const prompt = `Generate ${count} Counter-Strike eSports free agent players. 
  The average market value should be around ${Math.floor(budget * 0.2)}.
  Vary the skill levels (stats 40-99). Ensure realistic stats for their roles.
  Use realistic nicknames.
  For 'country', use strict 2-letter ISO 3166-1 alpha-2 codes.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: playerSchema,
      }
    });

    const rawPlayers = JSON.parse(response.text || "[]");
    
    return rawPlayers.map((p: any) => ({
      ...p,
      id: crypto.randomUUID(),
      avatarSeed: p.alias,
      morale: 50 + Math.floor(Math.random() * 40),
      matchHistory: []
    }));
  } catch (error) {
    console.warn("Gemini API Error generating agents, using fallback:", error);
    // Fallback
    return Array.from({ length: count }).map(() => generateRandomPlayerLocal(budget * 0.2));
  }
};

const getTeamContext = (team: Team): string => {
  const avgStats = team.players.reduce((acc, p) => {
    return acc + (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility + p.stats.clutch) / 5;
  }, 0) / (team.players.length || 1);

  const rosterList = team.players.map(p => {
    return `- ${p.alias} (${p.country}, ${p.role}): OVR ${Math.round((p.stats.aim + p.stats.reflex + p.stats.strategy)/3)}`;
  }).join('\n');

  let mapStatsStr = "Map Proficiency:\n";
  if (team.mapStats) {
      Object.entries(team.mapStats).forEach(([map, val]) => {
          mapStatsStr += `${map}: ${val}%\n`;
      });
  }

  return `
  Team Name: ${team.name}
  Average Team Rating: ${avgStats.toFixed(1)} / 100
  Roster:
  ${rosterList}
  ${mapStatsStr}
  `;
};

export const analyzeMatchup = async (myTeam: Team, opponent: Team): Promise<OpponentAnalysis> => {
    const ai = getAiClient();
    const myTeamContext = getTeamContext(myTeam);
    const opponentContext = getTeamContext(opponent);
  
    const analysisSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        overview: { type: Type.STRING },
        keyPlayer: { type: Type.STRING },
        keyPlayerReason: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        strategy: { type: Type.STRING },
        winProbability: { type: Type.INTEGER },
        bestMap: { type: Type.STRING },
        bestMapWinRate: { type: Type.INTEGER },
        worstMap: { type: Type.STRING },
        worstMapWinRate: { type: Type.INTEGER },
      },
      required: ['overview', 'keyPlayer', 'keyPlayerReason', 'strengths', 'weaknesses', 'strategy', 'winProbability', 'bestMap', 'bestMapWinRate', 'worstMap', 'worstMapWinRate']
    };
  
    const prompt = `
      Analyze the upcoming Counter-Strike match between these two teams.
      
      MY TEAM:
      ${myTeamContext}
      
      OPPONENT TEAM:
      ${opponentContext}
      
      Provide a tactical analysis report. 
      1. Identify the opponent's biggest threat (key player).
      2. List 2 of their tactical strengths and 2 weaknesses based on their stats.
      3. Suggest a counter-strategy.
      4. Estimate my team's win probability (0-100%).
      5. Based on the Opponent's Map Stats provided in context, identify their single BEST map and single WORST map and their win rates on them.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        }
      });
  
      return JSON.parse(response.text || "{}") as OpponentAnalysis;
    } catch (error) {
      console.warn("Gemini API Error analyzing matchup, using fallback:", error);
      return analyzeMatchupFallback(myTeam, opponent);
    }
};

// --- LOCAL STATS GENERATION ---

const calculateDerivedStats = (stats: PlayerMatchStats[], totalRounds: number) => {
  stats.forEach(s => {
      if (s.assists === undefined || s.assists === 0) s.assists = Math.floor(Math.random() * 5); 

      const killDmg = s.kills * 82;
      const assistDmg = s.assists * 40;
      const tagDmg = (totalRounds - s.kills) * (Math.random() * 12); 
      
      let calculatedAdr = (killDmg + assistDmg + tagDmg) / (totalRounds || 1);
      calculatedAdr = Math.max(40, Math.min(130, calculatedAdr)); 
      s.adr = calculatedAdr;

      const survivedRounds = Math.max(0, totalRounds - s.deaths);
      const impactFactor = (s.kills + s.assists) / (totalRounds || 1);
      const usefulDeathChance = 0.20 + (impactFactor * 0.4); 
      const usefulDeaths = Math.floor(s.deaths * Math.min(0.9, usefulDeathChance));
      
      const kastRounds = survivedRounds + usefulDeaths;
      s.kast = Math.min(100, (kastRounds / (totalRounds || 1)) * 100);
      s.kast = Math.max(45, s.kast); 

      const kpr = s.kills / (totalRounds || 1);
      const dpr = s.deaths / (totalRounds || 1);
      
      const killRating = kpr / 0.67; 
      const survivalRating = (1 - dpr) / 0.33;
      const impactRating = ((kpr * 1.3) + (s.assists/(totalRounds||1) * 0.4)); 
      
      let rating = (killRating * 0.45) + (survivalRating * 0.2) + (impactRating * 0.25) + ((s.kast/100) * 0.1);
      s.rating = Math.max(0.35, Math.min(2.6, rating));
  });
};

const calculateMatchStats = (team: Team, scoreFor: number, scoreAgainst: number): PlayerMatchStats[] => {
    const totalRounds = scoreFor + scoreAgainst;
    const totalSkill = team.players.reduce((sum, p) => 
        sum + p.stats.aim * 1.5 + p.stats.reflex + p.stats.clutch * 0.5 + (p.morale / 10), 0);
    
    const killShares = team.players.map(p => {
        const skill = p.stats.aim * 1.5 + p.stats.reflex + p.stats.clutch * 0.5 + (p.morale / 10);
        return { player: p, share: (skill / totalSkill) * (0.85 + Math.random() * 0.3) };
    });

    const baseKills = (scoreFor * 5) + (scoreAgainst * 2.5); 
    const variance = Math.floor(Math.random() * 10) - 5;
    let totalKills = Math.max(5, baseKills + variance);

    const totalKillShare = killShares.reduce((sum, s) => sum + s.share, 0);
    
    const stats: PlayerMatchStats[] = killShares.map(({ player, share }) => {
        return {
            alias: player.alias,
            country: player.country,
            kills: Math.round(totalKills * (share / totalKillShare)),
            deaths: 0, // Filled later based on opponent kills
            assists: 0, 
            adr: 0,
            kast: 0,
            rating: 0
        };
    });

    const deathWeights = team.players.map(p => {
        let roleFactor = 1.0;
        if (p.role === PlayerRole.ENTRY) roleFactor = 1.4; 
        if (p.role === PlayerRole.AWPER) roleFactor = 0.7; 
        if (p.role === PlayerRole.LURKER) roleFactor = 0.8;
        if (p.role === PlayerRole.SUPPORT) roleFactor = 1.1;

        const survivalSkill = p.stats.strategy * 1.0 + p.stats.reflex * 0.5;
        const baseWeight = (200 - survivalSkill) * roleFactor;
        return { alias: p.alias, weight: Math.max(10, baseWeight * (0.8 + Math.random() * 0.4)) };
    });

    const totalWeight = deathWeights.reduce((s, w) => s + w.weight, 0);
    const approxTotalDeaths = (scoreAgainst * 5) + (scoreFor * 2); 

    stats.forEach(s => {
        const w = deathWeights.find(dw => dw.alias === s.alias)!;
        s.deaths = Math.round(approxTotalDeaths * (w.weight / totalWeight));
        if (s.deaths > totalRounds) s.deaths = totalRounds;
    });

    calculateDerivedStats(stats, totalRounds);
    return stats;
};

const reconcileStats = (usStats: PlayerMatchStats[], enemyStats: PlayerMatchStats[], totalRounds: number) => {
    const usKills = usStats.reduce((a,b) => a+b.kills, 0);
    const enemyDeaths = enemyStats.reduce((a,b) => a+b.deaths, 0);
    let diff = usKills - enemyDeaths;

    let indices = Array.from({ length: enemyStats.length }, (_, i) => i);

    while (diff !== 0) {
        indices.sort(() => Math.random() - 0.5); 
        let changed = false;
        
        for (const i of indices) {
            if (diff === 0) break;
            const target = enemyStats[i];

            if (diff > 0) {
                if (target.deaths < totalRounds) {
                    target.deaths++;
                    diff--;
                    changed = true;
                }
            } else {
                if (target.deaths > 0) {
                    target.deaths--;
                    diff++;
                    changed = true;
                }
            }
        }
        if (!changed) break; 
    }

    const enemyKills = enemyStats.reduce((a,b) => a+b.kills, 0);
    const usDeaths = usStats.reduce((a,b) => a+b.deaths, 0);
    let diff2 = enemyKills - usDeaths;
    
    indices = Array.from({ length: usStats.length }, (_, i) => i);

    while (diff2 !== 0) {
        indices.sort(() => Math.random() - 0.5);
        let changed = false;

        for (const i of indices) {
            if (diff2 === 0) break;
            const target = usStats[i];
            
            if (diff2 > 0) {
                if (target.deaths < totalRounds) {
                    target.deaths++;
                    diff2--;
                    changed = true;
                }
            } else {
                if (target.deaths > 0) {
                    target.deaths--;
                    diff2++;
                    changed = true;
                }
            }
        }
        if (!changed) break;
    }

    calculateDerivedStats(usStats, totalRounds);
    calculateDerivedStats(enemyStats, totalRounds);
};

export const simulateMatch = async (myTeam: Team, enemyTeam: Team, matchContext: string = "Practice Match", tacticalBonus: number = 0, mapId?: string): Promise<MatchResult> => {
  const ai = getAiClient();
  const myTeamInfo = getTeamContext(myTeam);
  const enemyTeamInfo = getTeamContext(enemyTeam);

  let mapBonus = 0;
  let mapContext = "";
  if (mapId && myTeam.mapStats && enemyTeam.mapStats) {
      const myProf = myTeam.mapStats[mapId] || 0;
      const enemyProf = enemyTeam.mapStats[mapId] || 0;
      mapBonus = ((myProf - enemyProf) / 100) * 0.3;
      mapContext = `Map Played: ${mapId}. User Proficiency: ${myProf}%, Enemy Proficiency: ${enemyProf}%.`;
  }

  const matchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      finalScoreUs: { type: Type.INTEGER },
      finalScoreEnemy: { type: Type.INTEGER },
      mvpAlias: { type: Type.STRING },
      summary: { type: Type.STRING },
      earnings: { type: Type.INTEGER }
    },
    required: ['finalScoreUs', 'finalScoreEnemy', 'mvpAlias', 'earnings', 'summary']
  };

  const prompt = `Simulate a Counter-Strike match.
  CONTEXT: ${matchContext}
  ${mapContext}
  TACTICAL: ${tacticalBonus > 0 ? `User Advantage (+${(tacticalBonus*100).toFixed(0)}%)` : "Neutral"}

  MY TEAM (US): ${myTeamInfo}
  ENEMY TEAM: ${enemyTeamInfo}

  INSTRUCTIONS:
  1. Decide winner and score (to 13).
  2. Pick MVP.
  3. Write short summary.
  `;

  let result: Partial<MatchResult>;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: matchSchema,
      }
    });
    if (!response.text) throw new Error("No response");
    result = JSON.parse(response.text);
  } catch (error) {
    console.warn("Gemini failed, using local sim:", error);
    result = simulateMatchLocal(myTeam, enemyTeam, tacticalBonus, mapBonus);
  }
  
  // Force cap at 13 win for MR12 logic safety
  if (result.finalScoreUs! > 13) result.finalScoreUs = 13;
  if (result.finalScoreEnemy! > 13) result.finalScoreEnemy = 13;

  // --- STATS & LOGS GENERATION (LOCAL TO ENSURE CONSISTENCY) ---
  
  const playerStatsUs = calculateMatchStats(myTeam, result.finalScoreUs!, result.finalScoreEnemy!);
  const playerStatsEnemy = calculateMatchStats(enemyTeam, result.finalScoreEnemy!, result.finalScoreUs!);
  reconcileStats(playerStatsUs, playerStatsEnemy, result.finalScoreUs! + result.finalScoreEnemy!);

  // Boost MVP
  if (result.mvpAlias) {
      const mvpStats = playerStatsUs.find(p => p.alias === result.mvpAlias) || playerStatsEnemy.find(p => p.alias === result.mvpAlias);
      if (mvpStats) {
          mvpStats.rating = Math.max(mvpStats.rating, 1.35);
          mvpStats.kills = Math.max(mvpStats.kills, 20);
          if (mvpStats.kills <= mvpStats.deaths) {
              mvpStats.deaths = Math.max(5, mvpStats.kills - 2);
          }
          const totalRounds = result.finalScoreUs! + result.finalScoreEnemy!;
          const survived = Math.max(0, totalRounds - mvpStats.deaths);
          const kastRounds = survived + Math.floor(mvpStats.deaths * 0.75);
          mvpStats.kast = Math.min(100, (kastRounds / totalRounds) * 100);
      }
  }

  // Generate Detailed Logs that match the stats exactly
  const detailedLogs = generateDetailedMatchLogs(
      result.finalScoreUs!,
      result.finalScoreEnemy!,
      playerStatsUs,
      playerStatsEnemy,
      myTeam, // Pass full team objects for roles
      enemyTeam
  );

  return {
      enemyTeamName: enemyTeam.name,
      finalScoreUs: result.finalScoreUs!,
      finalScoreEnemy: result.finalScoreEnemy!,
      logs: detailedLogs,
      mvpAlias: result.mvpAlias!,
      earnings: result.earnings!,
      summary: result.summary!,
      playerStatsUs,
      playerStatsEnemy,
      mapPlayed: mapId
  };
};