
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, MatchResult, Team, PlayerRole, OpponentAnalysis, PlayerMatchStats, MatchLog, KillEvent, Tactic } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- ECONOMY CONSTANTS ---
const TEAM_SIZE = 5;
const WIN_BONUS = 3250;
const BOMB_BONUS = 250; 
const BASE_LOSS_BONUS = 1400;
const LOSS_BONUS_STEP = 500;
const MAX_LOSS_BONUS = 3400;
const MAX_MONEY_PER_PLAYER = 16000;
const MAX_TEAM_MONEY = MAX_MONEY_PER_PLAYER * TEAM_SIZE; // 80,000

// COSTS (Total for 5 players from 0)
const COST_FULL_BUY = 19500; // Reduced from 21500 to be less strict (allows ~3900 avg buy)
const COST_FORCE_BUY = 9500; // ~1900 per player (SMG/Deagle + Armor)
const COST_SEMI_ECO = 2500; // P250s
const COST_ECO = 0;

// SAVED EQUIPMENT VALUE (Per player)
const VALUE_SAVED_FULL = 3700; // Value of keeping Rifle + Armor
const VALUE_SAVED_FORCE = 1200; // Value of keeping SMG + Armor

export type BuyType = 'FULL_BUY' | 'FORCE_BUY' | 'SEMI_ECO' | 'ECO';

export interface RoundState {
    moneyUs: number;
    moneyEnemy: number;
    lossStreakUs: number;
    lossStreakEnemy: number;
    scoreUs: number;
    scoreEnemy: number;
    logs: MatchLog[];
    // New Economy Tracking
    survivingCountUs: number;
    survivingCountEnemy: number;
    previousBuyUs: BuyType;
    previousBuyEnemy: BuyType;
}

// --- LOGIC ENGINE ---

// Buy Logic State Machine
export const determineBuy = (money: number, roundNum: number, isMatchPoint: boolean, scoreEnemy: number, scoreUs: number, lossStreak: number): BuyType => {
    // PISTOL ROUNDS
    if (roundNum === 1 || roundNum === 13 || (roundNum > 24 && (roundNum - 25) % 3 === 0)) return 'ECO'; 

    // MUST WIN (Last round of half or match point)
    if (roundNum === 12 || roundNum === 24 || isMatchPoint || scoreEnemy >= 12) {
        return money >= COST_FULL_BUY ? 'FULL_BUY' : 'FORCE_BUY';
    }

    // WINNER MOMENTUM: If we won previous round (lossStreak === 0), we shouldn't eco unless absolutely broke.
    // If we have decent money, we force the advantage.
    if (lossStreak === 0 && roundNum > 1) {
        if (money >= 18000) return 'FULL_BUY';
        if (money >= 10000) return 'FORCE_BUY'; // Bonus round / Anti-Eco
    }

    if (money >= COST_FULL_BUY) return 'FULL_BUY';
    
    if (money >= 8000) {
        const isDesperate = scoreEnemy > 10 || (scoreEnemy - scoreUs > 4);
        if (isDesperate) return 'FORCE_BUY';
        return 'SEMI_ECO';
    }

    return 'ECO';
};

// Firepower Multiplier based on Buy Type
const getBuyPower = (buy: BuyType): number => {
    switch (buy) {
        case 'FULL_BUY': return 1.0;
        case 'FORCE_BUY': return 0.65;
        case 'SEMI_ECO': return 0.35;
        case 'ECO': return 0.15;
        default: return 0.5;
    }
};

// Deduct money based on buy, accounting for survivors
const spendMoney = (state: RoundState, buyUs: BuyType, buyEnemy: BuyType) => {
    
    const calculateCost = (buy: BuyType, currentMoney: number, survivors: number, prevBuy: BuyType) => {
        let baseCost = 0;
        if (buy === 'FULL_BUY') baseCost = COST_FULL_BUY;
        else if (buy === 'FORCE_BUY') baseCost = COST_FORCE_BUY;
        else if (buy === 'SEMI_ECO') baseCost = COST_SEMI_ECO;
        else return 0;

        // DISCOUNTS FOR SURVIVORS
        // Only apply discount if we are buying similar or better tier
        let discount = 0;
        if (prevBuy === 'FULL_BUY' && buy === 'FULL_BUY') {
            discount = survivors * VALUE_SAVED_FULL;
        } else if (prevBuy === 'FORCE_BUY' && (buy === 'FORCE_BUY' || buy === 'FULL_BUY')) {
            discount = survivors * VALUE_SAVED_FORCE;
        }

        // Determine actual cost, ensuring we don't go negative cost (though unlikely)
        // Min cost represents utility replenishment for survivors
        const finalCost = Math.max(survivors * 600, baseCost - discount);
        
        return Math.min(currentMoney, finalCost);
    };

    const costUs = calculateCost(buyUs, state.moneyUs, state.survivingCountUs, state.previousBuyUs);
    const costEnemy = calculateCost(buyEnemy, state.moneyEnemy, state.survivingCountEnemy, state.previousBuyEnemy);

    state.moneyUs = Math.max(0, state.moneyUs - costUs);
    state.moneyEnemy = Math.max(0, state.moneyEnemy - costEnemy);

    // Update History for next round logic
    state.previousBuyUs = buyUs;
    state.previousBuyEnemy = buyEnemy;
};

// Tactical Rock-Paper-Scissors
const getTacticalBonus = (myTactic: Tactic, enemyTactic: Tactic): number => {
    if (myTactic === enemyTactic) return 0;
    if (myTactic === Tactic.AGGRESSIVE) return enemyTactic === Tactic.PASSIVE ? 0.08 : -0.08;
    if (myTactic === Tactic.PASSIVE) return enemyTactic === Tactic.DEFAULT ? 0.08 : -0.08;
    if (myTactic === Tactic.DEFAULT) return enemyTactic === Tactic.AGGRESSIVE ? 0.08 : -0.08;
    return 0;
};

export const simulateRound = (
    roundNum: number,
    state: RoundState,
    usTeam: Team,
    enemyTeam: Team,
    usTactic: Tactic,
    enemyTactic: Tactic,
    mapId: string,
    moraleBoostUs: number = 0 // NEW: Manager intervention boost
): KillEvent[] => {
    const isPistol = roundNum === 1 || roundNum === 13 || (roundNum > 24 && (roundNum - 25) % 3 === 0);
    const isMatchPointUs = state.scoreUs === 12;
    const isMatchPointEnemy = state.scoreEnemy === 12;

    // 1. Determine Buys (Now includes lossStreak to prevent Eco after Win)
    let buyUs = determineBuy(state.moneyUs, roundNum, isMatchPointEnemy, state.scoreEnemy, state.scoreUs, state.lossStreakUs);
    let buyEnemy = determineBuy(state.moneyEnemy, roundNum, isMatchPointUs, state.scoreUs, state.scoreEnemy, state.lossStreakEnemy);

    // Pistol Override
    if (isPistol) {
        buyUs = 'ECO';
        buyEnemy = 'ECO';
        // Reset survivor counts on pistol rounds (halves or start)
        state.survivingCountUs = 0;
        state.survivingCountEnemy = 0;
    }

    // 2. Deduct Spending (Logic now handles discounts)
    spendMoney(state, buyUs, buyEnemy);

    // 3. Calculate Team Strengths
    const getSkill = (t: Team) => t.players.reduce((acc, p) => acc + (p.stats.aim * 1.2 + p.stats.reflex + p.stats.teamwork), 0);
    const skillUs = getSkill(usTeam);
    const skillEnemy = getSkill(enemyTeam);

    const equipUs = getBuyPower(buyUs);
    const equipEnemy = getBuyPower(buyEnemy);

    const masteryUs = (usTeam.mapStats?.[mapId] || 0) / 1000;
    const masteryEnemy = (enemyTeam.mapStats?.[mapId] || 0) / 1000;

    const tacticBonus = getTacticalBonus(usTactic, enemyTactic);

    const utilUs = usTeam.players.reduce((a,b) => a + b.stats.utility, 0) / 500;
    const utilEnemy = enemyTeam.players.reduce((a,b) => a + b.stats.utility, 0) / 500;

    // FINAL CALCULATION
    const totalSkill = skillUs + skillEnemy;
    const skillFactor = (skillUs - skillEnemy) / totalSkill;

    let winChanceUs = 0.5;
    
    if (isPistol) {
        winChanceUs += skillFactor * 1.5;
        winChanceUs += (masteryUs - masteryEnemy);
    } else {
        const equipFactor = (equipUs - equipEnemy) * 0.45; 
        winChanceUs += skillFactor;
        winChanceUs += equipFactor;
        winChanceUs += (masteryUs - masteryEnemy);
        winChanceUs += tacticBonus;
        winChanceUs += (utilUs - utilEnemy) * 0.1;
    }
    
    // Apply Manager Boost
    winChanceUs += moraleBoostUs;

    winChanceUs = Math.max(0.10, Math.min(0.90, winChanceUs));
    const usWins = Math.random() < winChanceUs;

    // --- KILL GENERATION (SEQUENTIAL LOGIC) ---
    const events: KillEvent[] = [];
    
    const getKillReward = (weapon: string) => {
        if (['knife', 'zeus'].includes(weapon)) return 1500;
        if (['awp'].includes(weapon)) return 100;
        if (['mac10', 'mp9', 'ump45', 'xm1014'].includes(weapon)) return 600;
        return 300;
    };

    // SIDE DETERMINATION (Standard MR12 + OT MR3)
    let usSide: 'CT' | 'T';
    if (roundNum <= 12) usSide = 'CT';
    else if (roundNum <= 24) usSide = 'T';
    else {
        // OT logic: Swap every 3 rounds. 
        // 25-27: CT (Same as start usually, or swapped? Let's assume reset to start logic: A=CT)
        const otRound = roundNum - 24;
        usSide = otRound <= 3 ? 'CT' : 'T';
        // Note: If OT goes further (31+), logic repeats but we keep it simple for now
    }

    const enemySide = usSide === 'CT' ? 'T' : 'CT';

    const winnerTeam = usWins ? usTeam : enemyTeam;
    const loserTeam = usWins ? enemyTeam : usTeam;
    const winnerSide = usWins ? usSide : enemySide;
    const loserSide = usWins ? enemySide : usSide;
    const winnerBuy = usWins ? buyUs : buyEnemy;
    const loserBuy = usWins ? buyEnemy : buyUs;

    let aliveWinner = [...winnerTeam.players];
    let aliveLoser = [...loserTeam.players];

    // WINNER DEATHS: 0, 1, or 2 usually.
    const winnerDeaths = Math.floor(Math.random() * 3); 
    
    // LOSER DEATHS: At least 4 kills for the winner (so loser deaths >= 4)
    // Either 4 or 5 (mostly 5 for decisive wins)
    let loserDeaths = Math.random() > 0.3 ? 5 : 4;

    let eventQueue: ('W' | 'L')[] = []; 
    for(let i=0; i<winnerDeaths; i++) eventQueue.push('W');
    for(let i=0; i<loserDeaths; i++) eventQueue.push('L');
    
    eventQueue = eventQueue.sort(() => Math.random() - 0.5);

    for (const victimType of eventQueue) {
        if (aliveWinner.length === 0 || aliveLoser.length === 0) break;

        let killer: Player;
        let victim: Player;
        let killerSideStr: 'CT' | 'T';
        let killerBuyType: BuyType;

        if (victimType === 'L') {
            const victimIdx = Math.floor(Math.random() * aliveLoser.length);
            victim = aliveLoser.splice(victimIdx, 1)[0]; 

            killer = aliveWinner[Math.floor(Math.random() * aliveWinner.length)]; 
            killerSideStr = winnerSide;
            killerBuyType = winnerBuy;
        } else {
            const victimIdx = Math.floor(Math.random() * aliveWinner.length);
            victim = aliveWinner.splice(victimIdx, 1)[0]; 

            killer = aliveLoser[Math.floor(Math.random() * aliveLoser.length)]; 
            killerSideStr = loserSide;
            killerBuyType = loserBuy;
        }

        const weapon = getWeapon(killerBuyType, killer.role, killerSideStr);
        const reward = getKillReward(weapon);

        // Credit Money immediately
        if (usTeam.players.some(p => p.id === killer.id)) {
            state.moneyUs += reward;
        } else {
            state.moneyEnemy += reward;
        }

        events.push({
            killer: killer.alias,
            victim: victim.alias,
            weapon: weapon,
            isHeadshot: determineHeadshot(weapon),
            killerSide: killerSideStr
        });
    }

    // --- UPDATE SURVIVORS FOR NEXT ROUND ---
    // Note: We use aliveWinner.length and aliveLoser.length
    if (usWins) {
        state.survivingCountUs = aliveWinner.length;
        state.survivingCountEnemy = aliveLoser.length;
    } else {
        state.survivingCountUs = aliveLoser.length;
        state.survivingCountEnemy = aliveWinner.length;
    }

    // --- UPDATE ECONOMY (ROUND END) ---
    if (usWins) {
        state.scoreUs++;
        state.moneyUs = Math.min(MAX_TEAM_MONEY, state.moneyUs + (WIN_BONUS * TEAM_SIZE) + (BOMB_BONUS * TEAM_SIZE));
        state.lossStreakUs = 0;

        // Enemy Loss
        let bonus = BASE_LOSS_BONUS + (state.lossStreakEnemy * LOSS_BONUS_STEP);
        if (bonus > MAX_LOSS_BONUS) bonus = MAX_LOSS_BONUS;
        state.moneyEnemy = Math.min(MAX_TEAM_MONEY, state.moneyEnemy + (bonus * TEAM_SIZE));
        state.lossStreakEnemy++;
    } else {
        state.scoreEnemy++;
        state.moneyEnemy = Math.min(MAX_TEAM_MONEY, state.moneyEnemy + (WIN_BONUS * TEAM_SIZE) + (BOMB_BONUS * TEAM_SIZE));
        state.lossStreakEnemy = 0;

        // Us Loss
        let bonus = BASE_LOSS_BONUS + (state.lossStreakUs * LOSS_BONUS_STEP);
        if (bonus > MAX_LOSS_BONUS) bonus = MAX_LOSS_BONUS;
        state.moneyUs = Math.min(MAX_TEAM_MONEY, state.moneyUs + (bonus * TEAM_SIZE));
        state.lossStreakUs++;
    }
    
    return events;
};

const getWeapon = (buy: BuyType, role: PlayerRole, side: 'CT' | 'T'): KillEvent['weapon'] => {
    const rand = Math.random();
    
    if (buy === 'ECO') {
        if (rand > 0.8) return 'deagle';
        if (side === 'CT') return rand > 0.5 ? 'usp' : 'p250';
        return rand > 0.5 ? 'glock' : 'p250';
    }
    
    if (buy === 'FORCE_BUY') {
        if (rand > 0.5) return side === 'CT' ? 'mp9' : 'mac10';
        if (rand > 0.3) return 'deagle';
        if (rand > 0.2) return 'ssg08';
        if (side === 'T') return 'galilar';
        return 'famas';
    }

    if (buy === 'SEMI_ECO') {
         if (rand > 0.4) return 'deagle';
         return 'p250';
    }

    // FULL BUY
    if (role === PlayerRole.AWPER && rand > 0.1) return 'awp';
    
    if (rand > 0.96) return 'hegrenade';
    if (rand > 0.98) return 'inferno';
    
    if (side === 'T') return 'ak47';
    return rand > 0.4 ? 'm4a1' : 'm4a4';
};

const determineHeadshot = (weapon: string): boolean => {
    if (['hegrenade', 'inferno', 'knife'].includes(weapon)) return false;
    if (weapon === 'awp') return Math.random() < 0.10;
    if (['ak47', 'm4a4', 'm4a1', 'galilar', 'famas'].includes(weapon)) return Math.random() < 0.55;
    return Math.random() < 0.40;
};

// --- GENERATORS & ANALYSIS ---

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
            teamwork: { type: Type.INTEGER },
            clutch: { type: Type.INTEGER },
          },
          required: ['aim', 'reflex', 'strategy', 'utility', 'teamwork', 'clutch']
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
      xp: { aim: 0, reflex: 0, strategy: 0, clutch: 0, utility: 0, teamwork: 0 },
      matchHistory: []
    }));
  } catch (error) {
    console.warn("Gemini API Error generating agents, using fallback:", error);
    return []; 
  }
};

export const analyzeMatchup = async (myTeam: Team, opponent: Team): Promise<OpponentAnalysis> => {
    const ai = getAiClient();
    
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
  
    const prompt = `Analyze CS2 match: ${myTeam.name} vs ${opponent.name}. Return JSON.`;
  
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
       return {
         overview: "Gemini unavailable. Analysis based on raw stats.",
         keyPlayer: opponent.players[0].alias,
         keyPlayerReason: "Top rated player.",
         strengths: ["Aim"],
         weaknesses: ["Economy"],
         strategy: "Play Default",
         winProbability: 50,
         bestMap: "Mirage",
         bestMapWinRate: 60,
         worstMap: "Nuke",
         worstMapWinRate: 40
       };
    }
};
