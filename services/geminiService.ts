
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, MatchResult, Team, PlayerRole, OpponentAnalysis, PlayerMatchStats, MatchLog } from '../types';

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

const simulateMatchLocal = (myTeam: Team, enemyTeam: Team): Partial<MatchResult> => {
    // Calculate Team Strengths
    const getTeamStrength = (t: Team) => t.players.reduce((acc, p) => acc + (p.stats.aim * 1.2 + p.stats.reflex + p.stats.strategy * 0.8), 0);
    
    const myStrength = getTeamStrength(myTeam);
    const enemyStrength = getTeamStrength(enemyTeam);
    
    // Win Probability with some randomness variance (+/- 10%)
    const variance = (Math.random() * 0.2) - 0.1;
    const totalStrength = myStrength + enemyStrength;
    const myWinProb = (myStrength / totalStrength) + variance;
    
    const isMyWin = Math.random() < myWinProb;
    
    // Generate Score
    const winnerScore = 13;
    // Loser score depends on how close the strengths were
    const strengthDiffPct = Math.abs(myStrength - enemyStrength) / Math.max(myStrength, enemyStrength);
    let loserScore = Math.floor(11 - (strengthDiffPct * 10)); 
    loserScore = Math.max(0, Math.min(11, loserScore + Math.floor(Math.random() * 4 - 2)));
    
    // Occasional Overtime
    if (Math.random() > 0.9 && strengthDiffPct < 0.05) {
        loserScore = 11 + Math.floor(Math.random() * 2); // 11-12 close game
    }

    const finalScoreUs = isMyWin ? winnerScore : loserScore;
    const finalScoreEnemy = isMyWin ? loserScore : winnerScore;
    
    // MVP
    const winningTeam = isMyWin ? myTeam : enemyTeam;
    // Weighted random for MVP based on stats
    const sortedPlayers = [...winningTeam.players].sort((a,b) => b.stats.aim - a.stats.aim);
    // Top 2 aimers have higher chance
    const mvp = Math.random() > 0.5 ? sortedPlayers[0] : sortedPlayers[Math.floor(Math.random() * winningTeam.players.length)];

    // Logs
    const logs: MatchLog[] = [];
    const templates = [
        "Pistol round chaos, multiple trades in mid.",
        "Clean anti-eco execution.",
        "Massive clutch 1v2 to secure the round.",
        "Technical timeout pause...",
        "Fast B rush overwhelms the defense.",
        "Slow tactical default leads to a plant.",
        "Sniper duel in middle decides the round.",
        "Force buy works out miraculously.",
        "Save round, no weapons dropped.",
        "Explosive A site execute with full utility."
    ];

    // Generate ~8 logs
    let currentUs = 0;
    let currentEnemy = 0;
    const totalRounds = finalScoreUs + finalScoreEnemy;
    
    for (let i = 1; i <= totalRounds; i++) {
        // Determine who won this specific round (roughly following the final score trend)
        let winner: 'us' | 'enemy';
        
        // Logic to ensure we reach final score exactly
        const roundsLeft = totalRounds - i;
        const usNeeds = finalScoreUs - currentUs;
        const enemyNeeds = finalScoreEnemy - currentEnemy;
        
        if (currentUs === finalScoreUs) winner = 'enemy';
        else if (currentEnemy === finalScoreEnemy) winner = 'us';
        else {
            // Probability weighted by remaining needs
            const probUs = usNeeds / (usNeeds + enemyNeeds);
            winner = Math.random() < probUs ? 'us' : 'enemy';
        }

        if (winner === 'us') currentUs++; else currentEnemy++;

        // Only push logs for some rounds to not clutter
        if (i === 1 || i === totalRounds || i === 13 || Math.random() > 0.7) {
             const winnerName = winner === 'us' ? myTeam.name : enemyTeam.name;
             const desc = `${winnerName}: ${templates[Math.floor(Math.random() * templates.length)]}`;
             logs.push({
                 roundNumber: i,
                 winner,
                 description: desc,
                 scoreUs: currentUs,
                 scoreEnemy: currentEnemy
             });
        }
    }

    return {
        finalScoreUs,
        finalScoreEnemy,
        mvpAlias: mvp.alias,
        summary: isMyWin 
            ? `A hard fought victory against ${enemyTeam.name}. The team showed great resilience.` 
            : `A tough loss against ${enemyTeam.name}. We need to improve our strategy.`,
        earnings: isMyWin ? 10000 : 3500,
        logs
    };
};

const analyzeMatchupFallback = (myTeam: Team, opponent: Team): OpponentAnalysis => {
     const myAvg = myTeam.players.reduce((a,b) => a + b.stats.aim, 0) / 5;
     const oppAvg = opponent.players.reduce((a,b) => a + b.stats.aim, 0) / 5;
     
     const diff = myAvg - oppAvg;
     const winProb = Math.min(95, Math.max(5, 50 + (diff * 2)));

     return {
         overview: `Local Analysis: A ${Math.abs(diff) < 5 ? 'close' : diff > 0 ? 'favorable' : 'difficult'} matchup based on raw aim stats.`,
         keyPlayer: opponent.players.reduce((prev, current) => (prev.stats.aim > current.stats.aim) ? prev : current).alias,
         keyPlayerReason: "Highest rated aimer on their team.",
         strengths: ["Raw Aim", "Aggression"],
         weaknesses: ["Tactical Depth", "Utility Usage"],
         strategy: "Focus on trading kills and playing safe.",
         winProbability: Math.round(winProb)
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

// Helper to calculate average team stats for the AI context
const getTeamContext = (team: Team): string => {
  const avgStats = team.players.reduce((acc, p) => {
    return acc + (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility + p.stats.clutch) / 5;
  }, 0) / (team.players.length || 1);

  const rosterList = team.players.map(p => {
    return `- ${p.alias} (${p.country}, ${p.role}): OVR ${Math.round((p.stats.aim + p.stats.reflex + p.stats.strategy)/3)}`;
  }).join('\n');

  return `
  Team Name: ${team.name}
  Average Team Rating: ${avgStats.toFixed(1)} / 100
  Roster:
  ${rosterList}
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
      },
      required: ['overview', 'keyPlayer', 'keyPlayerReason', 'strengths', 'weaknesses', 'strategy', 'winProbability']
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

// Reusable function to calculate derived stats (Rating, KAST, ADR)
// This is used initially and then re-used after reconciliation
const calculateDerivedStats = (stats: PlayerMatchStats[], totalRounds: number) => {
  stats.forEach(s => {
      // ASSISTS
      if (s.assists === undefined || s.assists === 0) {
          // Typically 0-5 assists
          s.assists = Math.floor(Math.random() * 5); 
      }

      // ADR (Average Damage per Round)
      // Realistic: 60 (low), 80 (avg), 110 (high)
      // Kill = ~82 dmg avg (some HS 100, some finish 10)
      // Assist = ~40 dmg avg
      const killDmg = s.kills * 82;
      const assistDmg = s.assists * 40;
      // Tagging damage (damage without kill/assist) - random but capped
      const tagDmg = (totalRounds - s.kills) * (Math.random() * 12); 
      
      let calculatedAdr = (killDmg + assistDmg + tagDmg) / (totalRounds || 1);
      calculatedAdr = Math.max(40, Math.min(130, calculatedAdr)); // Realistic clamp
      s.adr = calculatedAdr;

      // KAST (Kill, Assist, Survived, Traded) %
      // Formula: (Survived Rounds + Useful Deaths) / Total Rounds
      const survivedRounds = Math.max(0, totalRounds - s.deaths);
      
      // Estimation of Useful Deaths (Traded or Impact kill before death)
      // Base 20% chance + impact factor
      const impactFactor = (s.kills + s.assists) / (totalRounds || 1);
      const usefulDeathChance = 0.20 + (impactFactor * 0.4); // Max around 60-70% for high fraggers
      const usefulDeaths = Math.floor(s.deaths * Math.min(0.9, usefulDeathChance));
      
      const kastRounds = survivedRounds + usefulDeaths;
      s.kast = Math.min(100, (kastRounds / (totalRounds || 1)) * 100);
      s.kast = Math.max(45, s.kast); // Hard floor

      // RATING 2.0 (Approximation)
      // Average is ~1.06. 
      const kpr = s.kills / (totalRounds || 1);
      const dpr = s.deaths / (totalRounds || 1);
      
      const killRating = kpr / 0.67; // 0.67 avg KPR
      const survivalRating = (1 - dpr) / 0.33; // 0.67 avg survival (0.33 death rate)
      const impactRating = ((kpr * 1.3) + (s.assists/(totalRounds||1) * 0.4)); 
      
      // Weighted sum
      // Heavily weights Kills and Impact, moderately Survival and KAST
      let rating = (killRating * 0.45) + (survivalRating * 0.2) + (impactRating * 0.25) + ((s.kast/100) * 0.1);
      
      // Consistency check: 20-13 should be around 1.30
      // 1.0 KPR, 0.65 DPR. -> 1.49 KR, 1.06 SR, 1.3 IMP, 0.8 KAST
      // .67 + .21 + .32 + .08 = 1.28. Perfect.

      s.rating = Math.max(0.35, Math.min(2.6, rating));
  });
};

const calculateMatchStats = (team: Team, scoreFor: number, scoreAgainst: number): PlayerMatchStats[] => {
    const totalRounds = scoreFor + scoreAgainst;

    // 1. Calculate Kill Shares based on stats
    const totalSkill = team.players.reduce((sum, p) => 
        sum + p.stats.aim * 1.5 + p.stats.reflex + p.stats.clutch * 0.5 + (p.morale / 10), 0);
    
    const killShares = team.players.map(p => {
        const skill = p.stats.aim * 1.5 + p.stats.reflex + p.stats.clutch * 0.5 + (p.morale / 10);
        return { player: p, share: (skill / totalSkill) * (0.85 + Math.random() * 0.3) };
    });

    // 2. Estimate Team Total Kills
    // Winning 13 rounds = approx 75-95 kills.
    const baseKills = (scoreFor * 5) + (scoreAgainst * 2.5); 
    const variance = Math.floor(Math.random() * 10) - 5;
    let totalKills = Math.max(5, baseKills + variance);

    // 3. Distribute Kills
    const totalKillShare = killShares.reduce((sum, s) => sum + s.share, 0);
    
    const stats: PlayerMatchStats[] = killShares.map(({ player, share }) => {
        return {
            alias: player.alias,
            country: player.country,
            kills: Math.round(totalKills * (share / totalKillShare)),
            deaths: 0, // Filled later based on opponent kills
            assists: 0, // Filled in calculateDerivedStats
            adr: 0,
            kast: 0,
            rating: 0
        };
    });

    // 4. Calculate Initial Death Distribution (Used as weight later)
    // Entry fraggers die more, lurkers/awpers die less
    const deathWeights = team.players.map(p => {
        let roleFactor = 1.0;
        if (p.role === PlayerRole.ENTRY) roleFactor = 1.4; // High risk
        if (p.role === PlayerRole.AWPER) roleFactor = 0.7; // Safer
        if (p.role === PlayerRole.LURKER) roleFactor = 0.8;
        if (p.role === PlayerRole.SUPPORT) roleFactor = 1.1;

        // Higher strategy/reflex = slightly better survival
        const survivalSkill = p.stats.strategy * 1.0 + p.stats.reflex * 0.5;
        const baseWeight = (200 - survivalSkill) * roleFactor;
        return { alias: p.alias, weight: Math.max(10, baseWeight * (0.8 + Math.random() * 0.4)) };
    });

    const totalWeight = deathWeights.reduce((s, w) => s + w.weight, 0);
    
    // Approximate total deaths (will be reconciled exactly later)
    const approxTotalDeaths = (scoreAgainst * 5) + (scoreFor * 2); 

    stats.forEach(s => {
        const w = deathWeights.find(dw => dw.alias === s.alias)!;
        s.deaths = Math.round(approxTotalDeaths * (w.weight / totalWeight));
        // Hard cap: cannot die more than rounds played
        if (s.deaths > totalRounds) s.deaths = totalRounds;
    });

    // 5. Initial pass on derived stats (will be re-run after reconciliation)
    calculateDerivedStats(stats, totalRounds);

    return stats;
};

// Helper to smooth out stats so Team A Kills === Team B Deaths
const reconcileStats = (usStats: PlayerMatchStats[], enemyStats: PlayerMatchStats[], totalRounds: number) => {
    // 1. Total Kills for Us must equal Total Deaths for Enemy
    const usKills = usStats.reduce((a,b) => a+b.kills, 0);
    const enemyDeaths = enemyStats.reduce((a,b) => a+b.deaths, 0);
    let diff = usKills - enemyDeaths;

    // Shuffle enemy stats to distribute deaths randomly
    // We create indices array to shuffle to prevent dumping all on one player
    let indices = Array.from({ length: enemyStats.length }, (_, i) => i);

    while (diff !== 0) {
        indices.sort(() => Math.random() - 0.5); // reshuffle
        let changed = false;
        
        for (const i of indices) {
            if (diff === 0) break;
            const target = enemyStats[i];

            if (diff > 0) {
                // Need more deaths (enemy died more than we thought)
                if (target.deaths < totalRounds) {
                    target.deaths++;
                    diff--;
                    changed = true;
                }
            } else {
                // Too many deaths (enemy died less than we thought)
                if (target.deaths > 0) {
                    target.deaths--;
                    diff++;
                    changed = true;
                }
            }
        }
        // Safety break if we can't distribute (e.g. everyone capped at 0 or max)
        if (!changed) break; 
    }

    // 2. Total Kills for Enemy must equal Total Deaths for Us
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

    // CRITICAL: Recalculate derived stats (Rating, KAST) because deaths changed
    calculateDerivedStats(usStats, totalRounds);
    calculateDerivedStats(enemyStats, totalRounds);
};

export const simulateMatch = async (myTeam: Team, enemyTeam: Team, matchContext: string = "Practice Match"): Promise<MatchResult> => {
  const ai = getAiClient();

  const myTeamInfo = getTeamContext(myTeam);
  const enemyTeamInfo = getTeamContext(enemyTeam);

  // Reduced Schema: AI only decides the winner and story. Stats are local.
  const matchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      finalScoreUs: { type: Type.INTEGER },
      finalScoreEnemy: { type: Type.INTEGER },
      mvpAlias: { type: Type.STRING },
      summary: { type: Type.STRING },
      earnings: { type: Type.INTEGER },
      logs: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            roundNumber: { type: Type.INTEGER },
            winner: { type: Type.STRING, enum: ['us', 'enemy'] },
            description: { type: Type.STRING },
            scoreUs: { type: Type.INTEGER },
            scoreEnemy: { type: Type.INTEGER },
          },
          required: ['roundNumber', 'winner', 'description', 'scoreUs', 'scoreEnemy']
        }
      }
    },
    required: ['finalScoreUs', 'finalScoreEnemy', 'logs', 'mvpAlias', 'earnings', 'summary']
  };

  const prompt = `Simulate a Counter-Strike match.
  
  CONTEXT: ${matchContext}

  MY TEAM (US):
  ${myTeamInfo}

  ENEMY TEAM:
  ${enemyTeamInfo}

  INSTRUCTIONS:
  1. Decide winner based on Team Rating + Morale.
  2. Generate score (First to 13).
  3. Pick MVP.
  4. 'earnings': Loss=$2000-$4000, Win=$8000-$12000.
  5. Generate 6-8 key round logs describing the action using player names.
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

    if (!response.text) throw new Error("No response from AI");
    result = JSON.parse(response.text);

  } catch (error) {
    console.warn("Gemini API Failed (Quota or Network), using local simulation:", error);
    result = simulateMatchLocal(myTeam, enemyTeam);
  }

    // --- SHARED STATS GENERATION ---
    // We generate stats locally to save 90% of AI tokens and reduce latency by 15s.
    
    const playerStatsUs = calculateMatchStats(myTeam, result.finalScoreUs!, result.finalScoreEnemy!);
    const playerStatsEnemy = calculateMatchStats(enemyTeam, result.finalScoreEnemy!, result.finalScoreUs!);

    // Reconcile to ensure Kills Team A = Deaths Team B, without dumping on one player
    reconcileStats(playerStatsUs, playerStatsEnemy, result.finalScoreUs! + result.finalScoreEnemy!);

    // Ensure MVP has good stats
    if (result.mvpAlias) {
        const mvpStats = playerStatsUs.find(p => p.alias === result.mvpAlias) || playerStatsEnemy.find(p => p.alias === result.mvpAlias);
        if (mvpStats) {
            mvpStats.rating = Math.max(mvpStats.rating, 1.35);
            mvpStats.kills = Math.max(mvpStats.kills, 20);
            // Ensure positive K/D for MVP usually
            if (mvpStats.kills <= mvpStats.deaths) {
                mvpStats.deaths = Math.max(5, mvpStats.kills - 2);
            }
            // Re-calc derived for MVP to match new K/D
            const totalRounds = result.finalScoreUs! + result.finalScoreEnemy!;
            // Approximate recalc inline to boost MVP specific stats
            const survived = Math.max(0, totalRounds - mvpStats.deaths);
            const kastRounds = survived + Math.floor(mvpStats.deaths * 0.75); // MVP usually traded efficiently
            mvpStats.kast = Math.min(100, (kastRounds / totalRounds) * 100);
            const killDmg = mvpStats.kills * 85;
            mvpStats.adr = Math.max(80, (killDmg + 300) / totalRounds);
        }
    }

    return {
        enemyTeamName: enemyTeam.name,
        finalScoreUs: result.finalScoreUs!,
        finalScoreEnemy: result.finalScoreEnemy!,
        logs: result.logs!,
        mvpAlias: result.mvpAlias!,
        earnings: result.earnings!,
        summary: result.summary!,
        playerStatsUs,
        playerStatsEnemy
    };
};
