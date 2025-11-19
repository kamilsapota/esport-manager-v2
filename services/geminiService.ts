import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Player, MatchResult, Team, PlayerRole, OpponentAnalysis } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFreeAgents = async (count: number, budget: number): Promise<Player[]> => {
  const ai = getAiClient();
  
  // Define schema for players
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
  Vary the skill levels (stats 40-99). Ensure realistic stats for their roles (e.g. AWPer needs high reflex/aim).
  Use realistic nicknames.
  For 'country', use strict 2-letter ISO 3166-1 alpha-2 codes (e.g. "US", "FR", "PL", "SE", "DE", "UA", "RU").`;

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
    
    // Add IDs and random Morale client-side
    return rawPlayers.map((p: any) => ({
      ...p,
      id: crypto.randomUUID(),
      avatarSeed: p.alias,
      morale: 50 + Math.floor(Math.random() * 40) // Free agents usually have mixed morale (50-90)
    }));
  } catch (error) {
    console.error("Error generating agents:", error);
    return [];
  }
};

// Helper to calculate average team stats for the AI context
const getTeamContext = (team: Team): string => {
  const avgStats = team.players.reduce((acc, p) => {
    return acc + (p.stats.aim + p.stats.reflex + p.stats.strategy + p.stats.utility + p.stats.clutch) / 5;
  }, 0) / (team.players.length || 1);

  const rosterList = team.players.map(p => {
    let moraleDesc = "Neutral";
    if (p.morale >= 80) moraleDesc = "High (Confident)";
    if (p.morale <= 40) moraleDesc = "Low (Tilt prone)";
    
    return `- ${p.alias} (${p.country}, ${p.role}): OVR ${Math.round((p.stats.aim + p.stats.reflex + p.stats.strategy)/3)} | Morale: ${p.morale} (${moraleDesc})`;
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
      2. List 2 of their tactical strengths and 2 weaknesses based on their stats (e.g. low utility means bad executes).
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
      console.error("Error analyzing matchup:", error);
      throw error;
    }
};

export const simulateMatch = async (myTeam: Team, enemyTeam: Team, matchContext: string = "Practice Match"): Promise<MatchResult> => {
  const ai = getAiClient();

  const myTeamInfo = getTeamContext(myTeam);
  const enemyTeamInfo = getTeamContext(enemyTeam);

  // Schema for player stats
  const playerStatsSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            alias: { type: Type.STRING },
            country: { type: Type.STRING },
            kills: { type: Type.INTEGER },
            deaths: { type: Type.INTEGER },
            assists: { type: Type.INTEGER },
            adr: { type: Type.NUMBER },
            kast: { type: Type.NUMBER },
            rating: { type: Type.NUMBER }
        },
        required: ['alias', 'country', 'kills', 'deaths', 'assists', 'adr', 'kast', 'rating']
    }
  };

  const matchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      enemyTeamName: { type: Type.STRING },
      finalScoreUs: { type: Type.INTEGER },
      finalScoreEnemy: { type: Type.INTEGER },
      mvpAlias: { type: Type.STRING },
      summary: { type: Type.STRING },
      earnings: { type: Type.INTEGER },
      playerStatsUs: playerStatsSchema,
      playerStatsEnemy: playerStatsSchema,
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
    required: ['enemyTeamName', 'finalScoreUs', 'finalScoreEnemy', 'logs', 'mvpAlias', 'earnings', 'summary', 'playerStatsUs', 'playerStatsEnemy']
  };

  const prompt = `Simulate a competitive Counter-Strike match between two specific teams.
  
  CONTEXT: ${matchContext}

  MY TEAM (US):
  ${myTeamInfo}

  ENEMY TEAM (OPPONENT):
  ${enemyTeamInfo}

  INSTRUCTIONS:
  1. Compare the "Average Team Rating" and individual player stats heavily. 
     - If the Enemy Team has a significantly higher rating (e.g., +10 diff), they should win 90% of the time.
     - If ratings are close, it's a toss-up.
     - Upsets are possible but rare if the skill gap is huge.
  2. MORALE IMPACT:
     - Players with HIGH morale (80+) should perform slightly better (higher clutch %, higher rating).
     - Players with LOW morale (<40) are more likely to underperform or make mistakes.
  3. GENERATE RESULT:
     - 'enemyTeamName' MUST BE "${enemyTeam.name}".
     - Determine 'finalScoreUs' and 'finalScoreEnemy' (first to 13, unless overtime).
     - Pick an MVP from the winning team (use exact alias from roster).
     - 'earnings': Loss = $2000-$4000, Win = $8000-$12000.
  4. GENERATE STATS (Scoreboard):
     - Fill 'playerStatsUs' for all 5 players in MY TEAM.
     - Fill 'playerStatsEnemy' for all 5 players in ENEMY TEAM.
     - Ensure 'country' matches the 2-letter ISO code from the roster.
     - Ensure 'kills' and 'deaths' roughly correlate with the round count and score.
     - Winning team players should generally have higher Rating (>1.10) and positive K/D.
     - Losing team players generally lower Rating (<1.00).
     - 'adr' (Average Damage per Round) usually between 50-110.
     - 'kast' (Kill, Assist, Survive, Trade) usually 60-85%.
  5. GENERATE LOGS:
     - Generate 6-10 key rounds that tell the story.
     - Use player names from the provided rosters in the descriptions (e.g., "ZywOo lands a collat").
  `;

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
    const result = JSON.parse(response.text) as MatchResult;

    // --- POST-PROCESSING FOR MATH CONSISTENCY ---
    // Rule: Total Kills of Team A must equal Total Deaths of Team B.

    const syncKillsDeaths = (teamAStats: any[], teamBStats: any[]) => {
      const teamAKills = teamAStats.reduce((acc, p) => acc + p.kills, 0);
      const teamBDeaths = teamBStats.reduce((acc, p) => acc + p.deaths, 0);
      
      let diff = teamAKills - teamBDeaths;
      
      // We adjust Team B's deaths to match Team A's kills
      let loopGuard = 0;
      while (diff !== 0 && loopGuard < 200) {
          const randomPlayerIndex = Math.floor(Math.random() * teamBStats.length);
          const player = teamBStats[randomPlayerIndex];
          
          if (diff > 0) {
              // Team A has more kills than Team B has deaths -> Team B needs more deaths
              player.deaths++;
              diff--;
          } else {
              // Team A has fewer kills than Team B has deaths -> Team B needs fewer deaths
              if (player.deaths > 0) {
                  player.deaths--;
                  diff++;
              }
          }
          loopGuard++;
      }
    };

    // 1. Sum of Us Kills == Sum of Enemy Deaths
    syncKillsDeaths(result.playerStatsUs, result.playerStatsEnemy);
    
    // 2. Sum of Enemy Kills == Sum of Us Deaths
    syncKillsDeaths(result.playerStatsEnemy, result.playerStatsUs);

    return result;

  } catch (error) {
    console.error("Error simulating match:", error);
    throw error;
  }
};