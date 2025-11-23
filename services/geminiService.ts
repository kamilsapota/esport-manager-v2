
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, MatchResult, Team, PlayerRole, OpponentAnalysis, PlayerMatchStats, MatchLog, KillEvent, Tactic } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- ECONOMY CONSTANTS ---
const TEAM_SIZE = 5;
const WIN_BONUS = 3250;
const BOMB_BONUS = 250; 
const BASE_LOSS_BONUS = 1400;
const LOSS_BONUS_STEP = 500;
const MAX_LOSS_BONUS = 3400;
const MAX_MONEY_PER_PLAYER = 16000;
const MAX_TEAM_MONEY = MAX_MONEY_PER_PLAYER * TEAM_SIZE; 

const COST_FULL_BUY = 19500; 
const COST_FORCE_BUY = 9500; 
const COST_SEMI_ECO = 2500; 
const COST_ECO = 0;

const VALUE_SAVED_FULL = 3700; 
const VALUE_SAVED_FORCE = 1200; 

export type BuyType = 'FULL_BUY' | 'FORCE_BUY' | 'SEMI_ECO' | 'ECO';

export interface RoundState {
    moneyUs: number;
    moneyEnemy: number;
    lossStreakUs: number;
    lossStreakEnemy: number;
    scoreUs: number;
    scoreEnemy: number;
    logs: MatchLog[];
    survivingCountUs: number;
    survivingCountEnemy: number;
    previousBuyUs: BuyType;
    previousBuyEnemy: BuyType;
}

// --- LOGIC ENGINE ---

export const determineBuy = (money: number, roundNum: number, isMatchPoint: boolean, scoreEnemy: number, scoreUs: number, lossStreak: number): BuyType => {
    if (roundNum === 1 || roundNum === 13 || (roundNum > 24 && (roundNum - 25) % 3 === 0)) return 'ECO'; 

    if (roundNum === 12 || roundNum === 24 || isMatchPoint || scoreEnemy >= 12) {
        return money >= COST_FULL_BUY ? 'FULL_BUY' : 'FORCE_BUY';
    }

    if (lossStreak === 0 && roundNum > 1) {
        if (money >= 18000) return 'FULL_BUY';
        if (money >= 10000) return 'FORCE_BUY'; 
    }

    if (money >= COST_FULL_BUY) return 'FULL_BUY';
    
    if (money >= 8000) {
        const isDesperate = scoreEnemy > 10 || (scoreEnemy - scoreUs > 4);
        if (isDesperate) return 'FORCE_BUY';
        return 'SEMI_ECO';
    }

    return 'ECO';
};

const getBuyPower = (buy: BuyType): number => {
    switch (buy) {
        case 'FULL_BUY': return 1.0;
        case 'FORCE_BUY': return 0.65;
        case 'SEMI_ECO': return 0.35;
        case 'ECO': return 0.15;
        default: return 0.5;
    }
};

const spendMoney = (state: RoundState, buyUs: BuyType, buyEnemy: BuyType) => {
    
    const calculateCost = (buy: BuyType, currentMoney: number, survivors: number, prevBuy: BuyType) => {
        let baseCost = 0;
        if (buy === 'FULL_BUY') baseCost = COST_FULL_BUY;
        else if (buy === 'FORCE_BUY') baseCost = COST_FORCE_BUY;
        else if (buy === 'SEMI_ECO') baseCost = COST_SEMI_ECO;
        else return 0;

        let discount = 0;
        if (prevBuy === 'FULL_BUY' && buy === 'FULL_BUY') {
            discount = survivors * VALUE_SAVED_FULL;
        } else if (prevBuy === 'FORCE_BUY' && (buy === 'FORCE_BUY' || buy === 'FULL_BUY')) {
            discount = survivors * VALUE_SAVED_FORCE;
        }

        const finalCost = Math.max(survivors * 600, baseCost - discount);
        return Math.min(currentMoney, finalCost);
    };

    const costUs = calculateCost(buyUs, state.moneyUs, state.survivingCountUs, state.previousBuyUs);
    const costEnemy = calculateCost(buyEnemy, state.moneyEnemy, state.survivingCountEnemy, state.previousBuyEnemy);

    state.moneyUs = Math.max(0, state.moneyUs - costUs);
    state.moneyEnemy = Math.max(0, state.moneyEnemy - costEnemy);

    state.previousBuyUs = buyUs;
    state.previousBuyEnemy = buyEnemy;
};

const getSide = (roundNum: number): 'CT' | 'T' => {
    if (roundNum <= 12) return 'CT';
    if (roundNum <= 24) return 'T';
    const otRound = roundNum - 24;
    return Math.ceil(otRound / 3) % 2 === 1 ? 'CT' : 'T';
};

export const simulateRound = (
    roundNum: number,
    state: RoundState,
    usTeam: Team,
    enemyTeam: Team,
    mapId: string,
    moraleBoostUs: number = 0,
    fatiguePenaltyUs: number = 0,
    usTactic: Tactic = Tactic.DEFAULT,
    enemyTactic: Tactic = Tactic.DEFAULT
): KillEvent[] => {
    const isPistol = roundNum === 1 || roundNum === 13 || (roundNum > 24 && (roundNum - 25) % 3 === 0);
    const isMatchPointUs = state.scoreUs === 12;
    const isMatchPointEnemy = state.scoreEnemy === 12;

    // 1. Determine Buys 
    let buyUs = determineBuy(state.moneyUs, roundNum, isMatchPointEnemy, state.scoreEnemy, state.scoreUs, state.lossStreakUs);
    let buyEnemy = determineBuy(state.moneyEnemy, roundNum, isMatchPointUs, state.scoreUs, state.scoreEnemy, state.lossStreakEnemy);

    if (isPistol) {
        buyUs = 'ECO';
        buyEnemy = 'ECO';
        state.survivingCountUs = 0;
        state.survivingCountEnemy = 0;
    }

    spendMoney(state, buyUs, buyEnemy);

    // 2. Calculate Tactical Modifier
    let tacticalMod = 0;

    if (usTactic === Tactic.PASSIVE && enemyTactic === Tactic.AGGRESSIVE) tacticalMod = 0.05;
    else if (usTactic === Tactic.AGGRESSIVE && enemyTactic === Tactic.DEFAULT) tacticalMod = 0.05;
    else if (usTactic === Tactic.DEFAULT && enemyTactic === Tactic.PASSIVE) tacticalMod = 0.05;

    if (enemyTactic === Tactic.PASSIVE && usTactic === Tactic.AGGRESSIVE) tacticalMod = -0.05;
    else if (enemyTactic === Tactic.AGGRESSIVE && usTactic === Tactic.DEFAULT) tacticalMod = -0.05;
    else if (enemyTactic === Tactic.DEFAULT && usTactic === Tactic.PASSIVE) tacticalMod = -0.05;

    // 3. Calculate Team Strengths
    const getSkill = (t: Team) => t.players.reduce((acc, p) => {
        const mentalMultiplier = (p.morale !== undefined && p.morale < 50) ? 0.8 : 1.0;
        const playerPower = (p.stats.aim * 1.2 + p.stats.reflex + p.stats.teamwork) * mentalMultiplier;
        return acc + playerPower;
    }, 0);

    let skillUs = getSkill(usTeam);
    const skillEnemy = getSkill(enemyTeam);

    if (fatiguePenaltyUs > 0) {
        skillUs = skillUs * (1.0 - fatiguePenaltyUs);
    }

    const equipUs = getBuyPower(buyUs);
    const equipEnemy = getBuyPower(buyEnemy);

    const masteryUs = (usTeam.mapStats?.[mapId] || 0) / 1000;
    const masteryEnemy = (enemyTeam.mapStats?.[mapId] || 0) / 1000;

    const utilUs = usTeam.players.reduce((a,b) => a + b.stats.utility, 0) / 500;
    const utilEnemy = enemyTeam.players.reduce((a,b) => a + b.stats.utility, 0) / 500;

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
        winChanceUs += (utilUs - utilEnemy) * 0.1;
    }
    
    // APPLY TACTICAL MODIFIER
    winChanceUs += tacticalMod;
    winChanceUs += moraleBoostUs;

    winChanceUs = Math.max(0.10, Math.min(0.90, winChanceUs));
    const usWins = Math.random() < winChanceUs;

    // --- KILL GENERATION (SEQUENTIAL LOGIC) ---
    const events: KillEvent[] = [];
    const usSide = getSide(roundNum);
    const enemySide = usSide === 'CT' ? 'T' : 'CT';

    const getKillReward = (weapon: string) => {
        if (['knife', 'zeus'].includes(weapon)) return 1500;
        if (['awp'].includes(weapon)) return 100;
        if (['mac10', 'mp9', 'ump45', 'xm1014'].includes(weapon)) return 600;
        return 300;
    };

    const winnerTeam = usWins ? usTeam : enemyTeam;
    const loserTeam = usWins ? enemyTeam : usTeam;
    const winnerSide = usWins ? usSide : enemySide;
    const loserSide = usWins ? enemySide : usSide;
    const winnerBuy = usWins ? buyUs : buyEnemy;
    const loserBuy = usWins ? buyEnemy : buyUs;

    let aliveWinner = [...winnerTeam.players];
    let aliveLoser = [...loserTeam.players];

    // Reduced winner deaths to ensure they survive to finish off the enemy team. Max 1 death most of the time.
    const winnerDeaths = Math.random() > 0.8 ? 1 : 0;
    // Force minimum 4 kills for the winning team (so loser dies at least 4 times). High chance of Ace.
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

    // FAILSAFE: Ensure winning team gets at least 4 kills
    // Count unique victims from loser team
    const deadLoserAliases = new Set(events.filter(e => {
        return loserTeam.players.some(p => p.alias === e.victim);
    }).map(e => e.victim));

    // While we haven't killed 4 losers, and there are still losers alive, force more kills
    while (deadLoserAliases.size < 4 && aliveLoser.length > 0) {
        const victimIdx = Math.floor(Math.random() * aliveLoser.length);
        const victim = aliveLoser.splice(victimIdx, 1)[0]; 
        deadLoserAliases.add(victim.alias);

        // Pick a killer from alive winners (or just any winner if somehow all dead, but logic prevents that mostly)
        const killer = aliveWinner.length > 0 
            ? aliveWinner[Math.floor(Math.random() * aliveWinner.length)]
            : winnerTeam.players[Math.floor(Math.random() * winnerTeam.players.length)];

        const weapon = getWeapon(winnerBuy, killer.role, winnerSide);
        const reward = getKillReward(weapon);

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
            killerSide: winnerSide
        });
    }

    // Update Survivors
    if (usWins) {
        state.survivingCountUs = aliveWinner.length;
        state.survivingCountEnemy = aliveLoser.length;
    } else {
        state.survivingCountUs = aliveLoser.length;
        state.survivingCountEnemy = aliveWinner.length;
    }

    // Update Economy
    if (usWins) {
        state.scoreUs++;
        state.moneyUs = Math.min(MAX_TEAM_MONEY, state.moneyUs + (WIN_BONUS * TEAM_SIZE) + (BOMB_BONUS * TEAM_SIZE));
        state.lossStreakUs = 0;

        let bonus = BASE_LOSS_BONUS + (state.lossStreakEnemy * LOSS_BONUS_STEP);
        if (bonus > MAX_LOSS_BONUS) bonus = MAX_LOSS_BONUS;
        state.moneyEnemy = Math.min(MAX_TEAM_MONEY, state.moneyEnemy + (bonus * TEAM_SIZE));
        state.lossStreakEnemy++;
    } else {
        state.scoreEnemy++;
        state.moneyEnemy = Math.min(MAX_TEAM_MONEY, state.moneyEnemy + (WIN_BONUS * TEAM_SIZE) + (BOMB_BONUS * TEAM_SIZE));
        state.lossStreakEnemy = 0;

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

  const prompt = `Generate ${count} Counter-Strike eSports free agent players.`;

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
