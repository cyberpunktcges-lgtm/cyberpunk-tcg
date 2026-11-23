/**
 * rankingSystem.js
 * Sistema oficial de Ranking (Night City Leaderboard) y Dificultad Progresiva del Bot
 * para el Simulador de Cyberpunk TCG.
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
    color: '#0dfceb',
    description: 'IA táctica equilibrada. Ideal para aprender el simulador y probar mazos.'
  },
  {
    level: 2,
    id: 'edgerunner',
    name: 'Edgerunner',
    shortLabel: 'NV.2 EDGERUNNER',
    minWins: 3,
    winPoints: 35,
    color: '#FCEE0A',
    description: 'Desbloqueado con 3 victorias. Optimiza bloqueos, Gears, removal y guarda Quick.'
  },
  {
    level: 3,
    id: 'smasher',
    name: 'Adam Smasher',
    shortLabel: 'NV.3 ADAM SMASHER',
    minWins: 8,
    winPoints: 50,
    color: '#FF003C',
    description: 'Desbloqueado con 8 victorias. Modo competitivo sin piedad: busca letal exacto y castiga cada error.'
  }
];

export const LOSS_POINTS_PENALTY = 10;
export const STREAK_BONUS_THRESHOLD = 3;
export const STREAK_BONUS_POINTS = 5;

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
 * Calcula de forma pura la actualización del perfil de Ranking tras finalizar una partida legal.
 */
export function computeMatchRankingUpdate(existingStats = null, matchResult = {}) {
  const prev = existingStats || {};
  const matchId = String(matchResult.matchId || '');
  if (matchId && prev.lastMatchId && prev.lastMatchId === matchId) {
    return { alreadyRecorded: true, updatedStats: prev, pointsDelta: 0, streakBonus: 0, leveledUpBotTo: null };
  }

  const prevPoints = Math.max(0, Number(prev.points) || 0);
  const prevWins = Math.max(0, Number(prev.wins) || 0);
  const prevLosses = Math.max(0, Number(prev.losses) || 0);
  const prevStreak = Math.max(0, Number(prev.currentStreak) || 0);
  const prevBestStreak = Math.max(0, Number(prev.bestStreak) || 0);
  const prevUnlocked = getUnlockedBotDifficulty(prevWins).level;

  const isWin = Boolean(matchResult.won);
  const diffMeta = getBotDifficultyMeta(matchResult.botDifficulty || 1);

  let nextWins = prevWins;
  let nextLosses = prevLosses;
  let nextStreak = prevStreak;
  let nextBestStreak = prevBestStreak;
  let streakBonus = 0;
  let pointsDelta = 0;
  let nextPoints = prevPoints;

  if (isWin) {
    nextWins = prevWins + 1;
    nextStreak = prevStreak + 1;
    nextBestStreak = Math.max(prevBestStreak, nextStreak);
    streakBonus = nextStreak >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_POINTS : 0;
    pointsDelta = diffMeta.winPoints + streakBonus;
    nextPoints = prevPoints + pointsDelta;
  } else {
    nextLosses = prevLosses + 1;
    nextStreak = 0;
    nextPoints = Math.max(0, prevPoints - LOSS_POINTS_PENALTY);
    pointsDelta = nextPoints - prevPoints; // ej: -10 o 0 si ya estaba en 0
  }

  const nextUnlocked = getUnlockedBotDifficulty(nextWins).level;
  const leveledUpBotTo = nextUnlocked > prevUnlocked ? getBotDifficultyMeta(nextUnlocked) : null;

  // Seguimiento compacto de mazo más jugado
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
    pointsDelta,
    streakBonus,
    leveledUpBotTo,
    rankUp: rankAfter.minPoints > rankBefore.minPoints ? rankAfter : null,
    rankBefore,
    rankAfter,
    updatedStats: {
      points: nextPoints,
      wins: nextWins,
      losses: nextLosses,
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      unlockedBotLevel: nextUnlocked,
      highestBotDefeated: isWin
        ? Math.max(Number(prev.highestBotDefeated) || 0, diffMeta.level)
        : Number(prev.highestBotDefeated) || 0,
      favoriteDeck,
      deckCounts,
      lastMatchId: matchId || `m_${Date.now()}`
    }
  };
}
