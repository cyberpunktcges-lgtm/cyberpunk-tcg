/**
 * rankingSystem.js
 * Sistema oficial de Ranking (Night City Leaderboard — Formato Suizo BO3 al Mejor de 3)
 * y Dificultad Progresiva del Bot para el Simulador de Cyberpunk TCG.
 *
 * Reglas de Puntuación BO3 (solo en Modo Ranked con mazo rival aleatorio):
 * - Victoria 2-0 (Impecable): puntos base del nivel + 10 ⭐ bonus 2-0
 *     · Nivel 1 Choom:        +35 ⭐ (25 + 10)
 *     · Nivel 2 Edgerunner:   +45 ⭐ (35 + 10)
 *     · Nivel 3 Adam Smasher: +60 ⭐ (50 + 10)
 * - Victoria 2-1: puntos base del nivel (+25 / +35 / +50 ⭐)
 * - Bonus de Racha (3+ series BO3 ganadas seguidas): +10 ⭐ extra
 * - Derrota ajustada 1-2: -5 ⭐ (mínimo 0)
 * - Derrota 0-2: -15 ⭐ (mínimo 0)
 */

export const STREET_CRED_RANKS = [
  { id: 'street_kid', name: 'Street Kid', minPoints: 0, color: '#9ca3af', emoji: '🕶️' },
  { id: 'merc', name: 'Merc', minPoints: 100, color: '#0dfceb', emoji: '🔫' },
  { id: 'edgerunner', name: 'Edgerunner', minPoints: 250, color: '#FCEE0A', emoji: '⚡' },
  { id: 'elite_solo', name: 'Solo de Élite', minPoints: 500, color: '#ff7b00', emoji: '💀' },
  { id: 'afterlife_legend', name: 'Leyenda de Afterlife', minPoints: 1000, color: '#FF003C', emoji: '👑' }
];

export const BOT_DIFFICULTY_LEVELS = [
  {
    level: 1,
    id: 'choom',
    name: 'Choom',
    shortLabel: 'NV.1 CHOOM',
    minWins: 0,
    winPoints: 25,
    sweepPoints: 35,
    color: '#0dfceb',
    description: 'IA táctica equilibrada. Ideal para iniciarse en Ranked BO3.'
  },
  {
    level: 2,
    id: 'edgerunner',
    name: 'Edgerunner',
    shortLabel: 'NV.2 EDGERUNNER',
    minWins: 3,
    winPoints: 35,
    sweepPoints: 45,
    color: '#FCEE0A',
    description: 'Desbloqueado con 3 series BO3 ganadas. Optimiza bloqueos, Gears, removal y guarda Quick.'
  },
  {
    level: 3,
    id: 'smasher',
    name: 'Adam Smasher',
    shortLabel: 'NV.3 ADAM SMASHER',
    minWins: 8,
    winPoints: 50,
    sweepPoints: 60,
    color: '#FF003C',
    description: 'Desbloqueado con 8 series BO3 ganadas. Modo competitivo sin piedad: busca letal exacto.'
  }
];

export const CLEAN_SWEEP_BONUS = 10; // Bonus por ganar 2-0 en BO3
export const CLOSE_LOSS_PENALTY = 5; // Derrota 1-2
export const SWEEP_LOSS_PENALTY = 15; // Derrota 0-2
export const STREAK_BONUS_THRESHOLD = 3;
export const STREAK_BONUS_POINTS = 10;

export function getRankForPoints(points = 0) {
  const safePts = Math.max(0, Number(points) || 0);
  let current = STREET_CRED_RANKS[0];
  let next = STREET_CRED_RANKS[1] || null;

  for (let i = 0; i < STREET_CRED_RANKS.length; i++) {
    if (safePts >= STREET_CRED_RANKS[i].minPoints) {
      current = STREET_CRED_RANKS[i];
      next = STREET_CRED_RANKS[i + 1] || null;
    }
  }

  return {
    ...current,
    nextRank: next,
    pointsToNext: next ? Math.max(0, next.minPoints - safePts) : 0
  };
}

export function getBotDifficultyMeta(level = 1) {
  const lvl = Number(level) || 1;
  return BOT_DIFFICULTY_LEVELS.find((d) => d.level === lvl) || BOT_DIFFICULTY_LEVELS[0];
}

export function getUnlockedBotDifficulty(totalWins = 0) {
  const wins = Math.max(0, Number(totalWins) || 0);
  let unlocked = BOT_DIFFICULTY_LEVELS[0];
  for (const tier of BOT_DIFFICULTY_LEVELS) {
    if (wins >= tier.minWins) unlocked = tier;
  }
  const nextTier = BOT_DIFFICULTY_LEVELS.find((d) => d.level === unlocked.level + 1) || null;
  return {
    level: unlocked.level,
    meta: unlocked,
    nextTier,
    winsToNextLevel: nextTier ? Math.max(0, nextTier.minWins - wins) : 0
  };
}

export function computeWinRate(wins = 0, losses = 0) {
  const total = (Number(wins) || 0) + (Number(losses) || 0);
  if (total <= 0) return 0;
  return Math.round(((Number(wins) || 0) / total) * 100);
}

/**
 * Calcula de forma pura la actualización del perfil de Ranking tras finalizar una serie Ranked BO3.
 * matchResult: {
 *   matchId: string,
 *   isRanked: boolean,
 *   won: boolean,
 *   playerGamesWon: number, // 0, 1, or 2
 *   botGamesWon: number,    // 0, 1, or 2
 *   botDifficulty: 1|2|3,
 *   deckName: string
 * }
 */
export function computeMatchRankingUpdate(existingStats = null, matchResult = {}) {
  const prev = existingStats || {};

  // Las partidas de práctica/testeo nunca modifican el ranking
  if (matchResult.isRanked === false) {
    return {
      alreadyRecorded: false,
      skippedUnranked: true,
      updatedStats: prev,
      pointsDelta: 0,
      cleanSweepBonus: 0,
      streakBonus: 0,
      leveledUpBotTo: null
    };
  }

  const matchId = String(matchResult.matchId || '');
  if (matchId && prev.lastMatchId && prev.lastMatchId === matchId) {
    return {
      alreadyRecorded: true,
      updatedStats: prev,
      pointsDelta: 0,
      cleanSweepBonus: 0,
      streakBonus: 0,
      leveledUpBotTo: null
    };
  }

  const prevPoints = Math.max(0, Number(prev.points) || 0);
  const prevWins = Math.max(0, Number(prev.wins) || 0);
  const prevLosses = Math.max(0, Number(prev.losses) || 0);
  const prevCleanSweeps = Math.max(0, Number(prev.cleanSweeps) || 0);
  const prevStreak = Math.max(0, Number(prev.currentStreak) || 0);
  const prevBestStreak = Math.max(0, Number(prev.bestStreak) || 0);
  const prevUnlocked = getUnlockedBotDifficulty(prevWins).level;

  const pGames = Number(matchResult.playerGamesWon ?? (matchResult.won ? 2 : 0));
  const bGames = Number(matchResult.botGamesWon ?? (matchResult.won ? 0 : 2));
  const isWin = matchResult.won !== undefined ? Boolean(matchResult.won) : pGames > bGames;
  const isCleanSweep = isWin && pGames === 2 && bGames === 0;
  const isCloseLoss = !isWin && pGames === 1 && bGames === 2;
  const seriesScore = `${pGames}-${bGames}`;

  const diffMeta = getBotDifficultyMeta(matchResult.botDifficulty || 1);

  let nextWins = prevWins;
  let nextLosses = prevLosses;
  let nextCleanSweeps = prevCleanSweeps;
  let nextStreak = prevStreak;
  let nextBestStreak = prevBestStreak;
  let cleanSweepBonus = 0;
  let streakBonus = 0;
  let pointsDelta = 0;
  let nextPoints = prevPoints;

  if (isWin) {
    nextWins = prevWins + 1;
    if (isCleanSweep) {
      nextCleanSweeps = prevCleanSweeps + 1;
      cleanSweepBonus = CLEAN_SWEEP_BONUS;
    }
    nextStreak = prevStreak + 1;
    nextBestStreak = Math.max(prevBestStreak, nextStreak);
    streakBonus = nextStreak >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_POINTS : 0;
    pointsDelta = diffMeta.winPoints + cleanSweepBonus + streakBonus;
    nextPoints = prevPoints + pointsDelta;
  } else {
    nextLosses = prevLosses + 1;
    nextStreak = 0;
    const penalty = isCloseLoss ? CLOSE_LOSS_PENALTY : SWEEP_LOSS_PENALTY;
    nextPoints = Math.max(0, prevPoints - penalty);
    pointsDelta = nextPoints - prevPoints; // -5 en 1-2, -15 en 0-2 (nunca baja de 0)
  }

  const nextUnlocked = getUnlockedBotDifficulty(nextWins).level;
  const leveledUpBotTo = nextUnlocked > prevUnlocked ? getBotDifficultyMeta(nextUnlocked) : null;

  // Seguimiento compacto de mazo más jugado en Ranked
  const deckCounts = { ...(prev.deckCounts && typeof prev.deckCounts === 'object' ? prev.deckCounts : {}) };
  const deckName = String(matchResult.deckName || '').trim().slice(0, 60);
  if (deckName) {
    deckCounts[deckName] = (Number(deckCounts[deckName]) || 0) + 1;
  }

  let favoriteDeck = prev.favoriteDeck || deckName || 'Mazo Edgerunner';
  let maxDeckCount = -1;
  for (const [dName, count] of Object.entries(deckCounts)) {
    if (Number(count) > maxDeckCount) {
      maxDeckCount = Number(count);
      favoriteDeck = dName;
    }
  }

  const rankBefore = getRankForPoints(prevPoints);
  const rankAfter = getRankForPoints(nextPoints);

  return {
    alreadyRecorded: false,
    skippedUnranked: false,
    seriesScore,
    isCleanSweep,
    isCloseLoss,
    cleanSweepBonus,
    streakBonus,
    pointsDelta,
    leveledUpBotTo,
    rankUp: rankAfter.minPoints > rankBefore.minPoints ? rankAfter : null,
    rankBefore,
    rankAfter,
    updatedStats: {
      points: nextPoints,
      wins: nextWins,
      losses: nextLosses,
      cleanSweeps: nextCleanSweeps,
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      unlockedBotLevel: nextUnlocked,
      highestBotDefeated: isWin
        ? Math.max(Number(prev.highestBotDefeated) || 0, diffMeta.level)
        : Number(prev.highestBotDefeated) || 0,
      favoriteDeck,
      deckCounts,
      lastMatchId: matchId || `bo3_${Date.now()}`
    }
  };
}
