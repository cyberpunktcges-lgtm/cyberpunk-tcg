/**
 * cyberpunkEngine.js
 * Motor de reglas oficial para Cyberpunk TCG (Set 01 - Welcome to Night City)
 * Basado en Figure 4 y Comprehensive Rules (WeirdCo / CD Projekt Red)
 */

import {
  executeProgramEffect,
  executeUnitPlayTrigger,
  executeUnitAttackTrigger,
  executeCombatWinTrigger,
  executeCombatLossTrigger,
  executeUnitDefeatedTrigger,
  executeCallLegendTrigger,
  executeStartOfTurnTriggers,
  executeEndOfTurnTriggers,
  executeBlockerUsedTrigger,
  executeOnGigsStolenTriggers,
  executeJackiePourOneOutTrigger,
  executeKerryGigRollTrigger,
  executeCardSpentTriggers,
  tryJackieMamaSaveReplacement
} from './cardEffects.js';

// Dados poliédricos de Gigs y sus valores máximos
export const DICE_CONFIG = {
  d4: { name: 'D4', max: 4, sides: 4 },
  d6: { name: 'D6', max: 6, sides: 6 },
  d8: { name: 'D8', max: 8, sides: 8 },
  d10: { name: 'D10', max: 10, sides: 10 },
  d12: { name: 'D12', max: 12, sides: 12 },
  d20: { name: 'D20', max: 20, sides: 20 }
};

// Orden oficial de extracción de dados desde el Fixer (D4 primero, D20 siempre el último)
export const FIXER_DICE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/**
 * Lanza un dado D20 con entropía criptográfica uniforme (sin sesgos ni rachas repetitivas)
 */
export function rollSecureD20() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    // 2^32 = 4294967296. Múltiplo exacto de 20 más cercano: 4294967280 (evita sesgo de módulo)
    const limit = 4294967280;
    let rand;
    do {
      crypto.getRandomValues(buf);
      rand = buf[0];
    } while (rand >= limit);
    return (rand % 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Lanza un dado poliédrico con entropía segura
 */
export function rollDie(dieType) {
  const config = DICE_CONFIG[dieType] || DICE_CONFIG.d6;
  const max = config.max || 6;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = 4294967296 - (4294967296 % max);
    let rand;
    do {
      crypto.getRandomValues(buf);
      rand = buf[0];
    } while (rand >= limit);
    return (rand % max) + 1;
  }
  return Math.floor(Math.random() * max) + 1;
}

/**
 * Comprueba si una carta tiene una palabra clave oficial (Blocker, Adrenaline, Go Solo, Quick, etc.)
 */
export function hasKeyword(card, keyword) {
  if (!card) return false;
  const target = keyword.toLowerCase();
  const cardId = String(card.id || '').toUpperCase();
  const text = String(card.rulesText || card.rules || card.text || card.effect || card.ability || '');
  const lineRegex = new RegExp('(^|\\n)\\s*' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');

  if (target === 'adrenaline') {
    if (card.hasAdrenaline) return true;
    // CP-139 Valentino Street Racer solo OTORGA Adrenaline a otra unidad; CP-004 Adrenaline Converter es condicional (≥2 Gigs de diferencia)
    if (cardId === 'CP-139' || cardId === 'CP-004') return false;
    if (cardId === 'CP-078' || cardId === 'CP-101') return true;
    return lineRegex.test(text);
  }

  if (target === 'blocker') {
    if (card.isTemporaryBlockerThisTurn) return true;
    // Gears equipados que conceden BLOCKER a la unidad portadora (CP-068 Mandibular Upgrade, CP-102 Riot Shield)
    if (Array.isArray(card.gear) && card.gear.length > 0) {
      if (card.gear.some((g) => hasKeyword(g, 'Blocker'))) return true;
    }
    // CP-138 Valentino Guerrera y CP-042 Takemura Legend solo mencionan Blocker en su texto, NO tienen Blocker
    if (cardId === 'CP-138' || cardId === 'CP-042') return false;
    if (cardId === 'CP-068' || cardId === 'CP-102') return true;
    if (lineRegex.test(text)) return true;
    // Reglas con BLOCKER tras otra frase (ej: CP-019 Corpo Security, CP-080 Mox Inciters)
    if (/(?:^|\n|\.\s+)BLOCKER\b/.test(text)) return true;
    return false;
  }

  if (target === 'go solo') {
    // Excluir cartas que solo mencionan Go Solo en su texto (CP-011 Radioport, CP-085 Nocturne, CP-102 Riot Shield)
    if (cardId === 'CP-011' || cardId === 'CP-085' || cardId === 'CP-102') return false;
    if (lineRegex.test(text) || /\bGO SOLO\s*\(/.test(text)) return true;
  }

  const rawKw = Array.isArray(card.keywords) ? card.keywords.join(', ') : String(card.keywords || '');
  if (rawKw.toLowerCase().includes(target)) return true;

  const rawTraits = Array.isArray(card.traits) ? card.traits.join(', ') : String(card.traits || '');
  if (rawTraits.toLowerCase().includes(target)) return true;

  return lineRegex.test(text);
}

/**
 * Comprueba si una Leyenda puede desplegarse al campo de batalla.
 * Regla oficial de Cyberpunk TCG:
 * 1. Debe poseer la palabra clave oficial 'Go Solo'.
 * 2. Su coste NO puede ser '-' ni '(-)'.
 * 3. Debe tener un coste numérico en Eddies mayor que 0.
 */
/**
 * Comprueba si una carta es Leyenda (en Zona de Leyendas o desplegada en el campo de batalla).
 * REGLA OFICIAL: Una Leyenda en el campo de batalla sigue siendo Leyenda y ADEMÁS es Unidad.
 */
export function isCardLegend(card) {
  if (!card) return false;
  return Boolean(
    card.isLegend ||
    card.isLegendUnit ||
    String(card.officialType || '').toUpperCase() === 'LEGEND' ||
    String(card.cardType || card.type || '').toUpperCase().includes('LEGEND')
  );
}

/**
 * Comprueba si una carta cuenta como Unidad.
 * REGLA OFICIAL: Cualquier Leyenda en el campo de batalla (con Go Solo o sin Go Solo)
 * cuenta simultáneamente como LEYENDA y como UNIDAD.
 */
export function isCardUnit(card, isOnField = false) {
  if (!card) return false;
  if (card.isUnit || card.isLegendUnit) return true;
  if (isOnField && isCardLegend(card)) return true;
  const ot = String(card.officialType || '').toUpperCase();
  const ct = String(card.cardType || card.type || '').toUpperCase();
  return ot === 'UNIT' || (ct.includes('UNIT') && !ct.includes('LEGEND'));
}

export function canLegendDeployToField(card) {
  if (!card) return false;
  const hasGoSolo = hasKeyword(card, 'Go Solo');
  if (!hasGoSolo) return false;

  const rawCost = String(card.cost || '').trim();
  if (rawCost === '-' || rawCost === '(-)' || rawCost === '--') return false;

  const cost = card.parsedCost || (typeof card.costNum === 'number' ? card.costNum : parseCardCost(card.cost));
  return typeof cost === 'number' && cost > 0;
}

/**
 * Comprueba si una Unidad en el campo puede atacar bajo las reglas oficiales de Cyberpunk TCG.
 * @param {Object} unit - La unidad a evaluar
 * @param {Object} playerState - El estado del jugador controlador (para verificar programas jugados, etc.)
 * @param {Object} gameState - El estado global de la partida
 * @param {'GIGS'|'UNIT'|null} targetType - Tipo de objetivo si está especificado
 * @returns {boolean}
 */
export function canUnitAttack(unit, playerState = null, gameState = null, targetType = null) {
  if (!unit) return false;

  // 1. Estados básicos: Una unidad girada (Spent) o con Lag no puede atacar
  if (unit.isSpent) return false;

  const cardId = String(unit.id || '').toUpperCase();
  const oppStateForChecks =
    gameState && playerState
      ? (playerState === gameState.player || playerState.id === 'player' ? gameState.bot : gameState.player)
      : null;

  // Comprobar Adrenaline condicional de CP-004 Adrenaline Converter (si el rival controla ≥ 2 Gigs más que tú)
  const hasConditionalAdrenalineConverter =
    Array.isArray(unit.gear) &&
    unit.gear.some((g) => String(g.id || '').toUpperCase() === 'CP-004') &&
    oppStateForChecks &&
    ((oppStateForChecks.gigs?.length || 0) - (playerState?.gigs?.length || 0) >= 2);

  // Comprobar habilidad oficial de CP-083 Nadia // Fighting Through Grief (atacar Gigs el turno que entra si el rival tiene más Gigs)
  const hasNadiaGigRush =
    cardId === 'CP-083' &&
    oppStateForChecks &&
    ((oppStateForChecks.gigs?.length || 0) > (playerState?.gigs?.length || 0));

  if (unit.isLagging && !hasConditionalAdrenalineConverter) {
    const canUnitRush = Boolean(unit.canAttackSpentUnitsTurnPlayed) && (targetType === 'UNIT' || targetType === null);
    const canGigRush = hasNadiaGigRush && (targetType === 'GIGS' || targetType === null);
    if (!canUnitRush && !canGigRush) {
      return false;
    }
  }
  // Si tiene Lag pero canAttackSpentUnitsTurnPlayed, NO puede atacar Gigs ese turno (salvo Nadia o Adrenaline Converter activo)
  if (unit.isLagging && !hasConditionalAdrenalineConverter && unit.canAttackSpentUnitsTurnPlayed && targetType === 'GIGS' && !hasNadiaGigRush) {
    return false;
  }

  // 2. Efectos temporales de congelación (Chrome Reverie, Nocturne Op55N1, etc.)
  if (typeof unit.cannotAttackUntilTurn === 'number' && gameState) {
    if (gameState.turnNumber < unit.cannotAttackUntilTurn) return false;
  } else if (unit.cannotAttackUntilNextTurn) {
    return false;
  }

  const cardName = String(unit.name || '').toLowerCase();
  const rules = String(unit.rulesText || unit.ability || '').toLowerCase();

  // 3. Jacked-In Voodoo Boy (CP-049):
  // Regla oficial: "This Unit can't attack unless you played a Program this turn."
  if (
    cardId === 'CP-049' ||
    cardName.includes('jacked-in voodoo boy') ||
    rules.includes('unless you played a program this turn')
  ) {
    const programsPlayed = playerState ? (playerState.programsPlayedThisTurn || 0) : 0;
    if (programsPlayed <= 0) {
      return false;
    }
  }

  // 4. Unidades que nunca pueden atacar (Corpo Security CP-019, Misty Olszewski CP-077, etc.)
  // "This Unit can't attack." (excluyendo "unless")
  if (
    cardId === 'CP-019' ||
    cardId === 'CP-077' ||
    (rules.includes("this unit can't attack") && !rules.includes('unless'))
  ) {
    return false;
  }

  // 5. Ruthless Lowlife (CP-110): Solo puede atacar a Unidades rivales, no a zonas de Gigs
  // "This Unit can only attack rival Units. (It can't attack Gig areas.)"
  if (targetType === 'GIGS') {
    if (
      cardId === 'CP-110' ||
      cardName.includes('ruthless lowlife') ||
      rules.includes('only attack rival units') ||
      rules.includes("can't attack gig areas")
    ) {
      return false;
    }
  }

  // 6. MaxTac Suppression Team (CP-073): Las unidades rivales no pueden atacar el turno en que son jugadas
  if (gameState && playerState) {
    const oppKey = playerState.id === 'player' ? 'bot' : 'player';
    const opp = gameState[oppKey];
    if (
      opp &&
      (opp.field || []).some(
        (u) =>
          String(u.id || '').toUpperCase() === 'CP-073' ||
          String(u.name || '').toLowerCase().includes('maxtac suppression team')
      )
    ) {
      if (unit.turnEntered === gameState.turnNumber) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Comprueba si una unidad atacante puede ser bloqueada por un BLOCKER en este instante.
 * - CP-081 MT0D12 Flathead: "If you have less ☆ (Street Cred) than a Rival, this Unit can't be blocked."
 */
export function canUnitBeBlocked(attackerUnit, attackerPlayerKey, gameState) {
  if (!attackerUnit || !gameState || !attackerPlayerKey) return true;
  if (attackerUnit.cannotBeBlockedThisTurn) return false;
  const cid = String(attackerUnit.id || '').toUpperCase();
  const slug = String(attackerUnit.slug || '').toLowerCase();
  const name = String(attackerUnit.name || '').toLowerCase();
  const isFlathead = cid === 'CP-081' || slug.includes('flathead') || name.includes('flathead');
  if (isFlathead) {
    const attacker = gameState[attackerPlayerKey];
    const defender = gameState[attackerPlayerKey === 'player' ? 'bot' : 'player'];
    const myCred = calculateStreetCred(attacker?.gigs || []);
    const oppCred = calculateStreetCred(defender?.gigs || []);
    if (myCred < oppCred) {
      return false;
    }
  }
  return true;
}

/**
 * Devuelve el motivo por el cual una Unidad no puede atacar (para mensajes UI / Holocall)
 */
export function getUnitAttackRestriction(unit, playerState = null, gameState = null, targetType = null) {
  if (!unit) return 'Unidad no válida.';
  if (unit.isSpent) return 'La unidad ya está girada (Spent).';
  if (unit.isLagging) return 'La unidad tiene Lag (no puede atacar el turno en que entra en juego).';
  if (typeof unit.cannotAttackUntilTurn === 'number' && gameState) {
    if (gameState.turnNumber < unit.cannotAttackUntilTurn) {
      return 'Esta unidad tiene el ataque bloqueado hasta el próximo turno del oponente.';
    }
  } else if (unit.cannotAttackUntilNextTurn) {
    return 'Esta unidad tiene el ataque bloqueado hasta tu próximo turno.';
  }

  const cardId = String(unit.id || '').toUpperCase();
  const cardName = String(unit.name || '').toLowerCase();
  const rules = String(unit.rulesText || unit.ability || '').toLowerCase();

  if (
    cardId === 'CP-049' ||
    cardName.includes('jacked-in voodoo boy') ||
    rules.includes('unless you played a program this turn')
  ) {
    const programsPlayed = playerState ? (playerState.programsPlayedThisTurn || 0) : 0;
    if (programsPlayed <= 0) {
      return 'Jacked-In Voodoo Boy no puede atacar a menos que hayas jugado un Programa este turno.';
    }
  }

  if (cardId === 'CP-019') {
    return 'Corpo Security no puede atacar (es un Blocker puramente defensivo).';
  }

  if (cardId === 'CP-077') {
    return 'Misty Olszewski no puede atacar (es una unidad de apoyo).';
  }

  if (rules.includes("this unit can't attack") && !rules.includes('unless')) {
    return `${unit.name} no puede atacar.`;
  }

  if (
    targetType === 'GIGS' &&
    (cardId === 'CP-110' ||
      cardName.includes('ruthless lowlife') ||
      rules.includes('only attack rival units') ||
      rules.includes("can't attack gig areas"))
  ) {
    return 'Ruthless Lowlife solo puede atacar a Unidades rivales (no puede atacar al Área de Gigs).';
  }

  if (gameState && playerState) {
    const oppKey = playerState.id === 'player' ? 'bot' : 'player';
    const opp = gameState[oppKey];
    if (
      opp &&
      (opp.field || []).some(
        (u) =>
          String(u.id || '').toUpperCase() === 'CP-073' ||
          String(u.name || '').toLowerCase().includes('maxtac suppression team')
      )
    ) {
      if (unit.turnEntered === gameState.turnNumber) {
        return 'MaxTac Suppression Team en el rival impide que las unidades ataquen el turno que entran en juego.';
      }
    }
  }

  return null;
}

/**
 * Tabla oficial de robo de Gigs según el Poder de la Unidad atacante:
 * - Poder 0: 0 Gigs
 * - Poder 1–9: 1 Gig
 * - Poder 10–19: 2 Gigs
 * - Poder 20–29: 3 Gigs
 * (Fórmula: 1 + Math.floor(power / 10))
 */
export function calculateGigsToSteal(attackerPower) {
  const p = Number(attackerPower) || 0;
  if (p <= 0) return 0;
  return 1 + Math.floor(p / 10);
}

/**
 * Regla oficial de Venta (Sell for Turn):
 * "reveal a card with a Sell Tag from your hand and place it face-down in your Eddies area. It is now an Eddie."
 * En Cyberpunk TCG (Set 01), sólo tienen Sell Tag:
 * - Todos los PROGRAMAS (PROGRAM)
 * - Todos los GEARS (GEAR)
 * - La unidad especial MT0D12 FLATHEAD (y ninguna otra unidad o leyenda).
 */
export function isCardVendible(card) {
  if (!card) return false;
  const officialType = (card.officialType || '').toUpperCase();
  const cardType = (card.cardType || card.type || '').toUpperCase();
  const name = (card.name || '').toUpperCase();
  const slug = (card.slug || '').toLowerCase();

  // Programas y Gears son vendibles
  if (officialType === 'PROGRAM' || cardType.includes('PROGRAM')) return true;
  if (officialType === 'GEAR' || cardType.includes('GEAR')) return true;

  // La unidad MT0D12 FLATHEAD es la única unidad vendible del juego
  if (name.includes('FLATHEAD') || slug.includes('flathead') || card.id === 'CP-081') {
    return true;
  }

  return false;
}

/**
 * Parsea el coste numérico en Eddies de una carta (ej: "4 EDDIES" -> 4)
 */
export function parseCardCost(costStr) {
  if (typeof costStr === 'number') return costStr;
  if (!costStr) return 0;
  const match = String(costStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Parsea el poder numérico de una carta (ej: "6 FUERZA" -> 6)
 */
export function parseCardPower(powerStr) {
  if (typeof powerStr === 'number') return Number.isNaN(powerStr) ? 0 : powerStr;
  if (!powerStr) return 0;
  const match = String(powerStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Devuelve siempre la fuerza numérica real de una unidad en mesa (evita que 0 sea falsy y concatene strings como "0 FUERZA1").
 */
export function getNumericUnitPower(unit) {
  if (!unit) return 0;
  if (typeof unit.currentPower === 'number' && !Number.isNaN(unit.currentPower)) {
    return unit.currentPower;
  }
  return parseCardPower(unit.currentPower ?? unit.powerVal ?? unit.power ?? 0);
}

/**
 * Calcula el desglose visual de fuerza de una unidad en mesa (Fase 2: Buffs / Debuffs):
 * - basePower: fuerza impresa base de la carta
 * - gearBonus: suma de bonificadores de Gears equipados
 * - tempDelta: modificadores temporales de este turno (ej. -4 de Pyramid Song, +2 de Dexter)
 * - status: 'debuffed' | 'buffed' | 'normal'
 */
export function isRoycePsychoOnTheEdge(unit) {
  if (!unit) return false;
  const cid = String(unit.id || '').toUpperCase();
  const slug = String(unit.slug || '').toLowerCase();
  const name = String(unit.name || '').toLowerCase();
  return cid === 'CP-109' || slug.includes('psycho-on-the-edge') || name.includes('psycho on the edge');
}

/**
 * Sincroniza la habilidad pasiva oficial de CP-109 Royce // Psycho on the Edge:
 * "During your turn, this Legend has +2 power for each of its equipped Gear."
 */
export function syncRoyceTurnPassiveBonus(unit, isOwnersTurn) {
  if (!isRoycePsychoOnTheEdge(unit)) return 0;
  const gearCount = Array.isArray(unit.gear) ? unit.gear.length : 0;
  const desired = isOwnersTurn ? gearCount * 2 : 0;
  const prevApplied = Number(unit._royceTurnGearBonus || 0);
  if (desired !== prevApplied) {
    unit.currentPower = Math.max(0, Number(unit.currentPower || 0) - prevApplied + desired);
    unit._royceTurnGearBonus = desired;
  }
  return desired;
}

export function getUnitPowerBreakdown(unit) {
  if (!unit) {
    return {
      basePower: 0,
      gearBonus: 0,
      tempDelta: 0,
      totalDelta: 0,
      currentPower: 0,
      status: 'normal',
      deltaBadge: '',
      tooltip: ''
    };
  }
  const basePower =
    unit.parsedPower !== undefined && unit.parsedPower !== null
      ? Number(unit.parsedPower)
      : parseCardPower(unit.powerVal ?? unit.power);
  const gearBonus = (unit.gear || []).reduce(
    (sum, g) => sum + (Number(g.parsedPower) || parseCardPower(g.powerVal ?? g.power) || 0),
    0
  );
  const normalExpected = Math.max(0, basePower + gearBonus);
  const currentPower =
    unit.currentPower !== undefined && unit.currentPower !== null
      ? Number(unit.currentPower)
      : normalExpected;
  const tempDelta = currentPower - normalExpected;
  const totalDelta = currentPower - basePower;

  let status = 'normal';
  if (tempDelta < 0 || totalDelta < 0) status = 'debuffed';
  else if (tempDelta > 0 || gearBonus > 0) status = 'buffed';

  const parts = [`Base ${basePower}`];
  if (gearBonus > 0) parts.push(`Gear +${gearBonus}`);
  if (tempDelta > 0) parts.push(`Buff +${tempDelta} (turno)`);
  if (tempDelta < 0) parts.push(`Debuff ${tempDelta} (turno)`);

  let deltaBadge = '';
  if (tempDelta < 0) deltaBadge = `${tempDelta}`;
  else if (totalDelta > 0) deltaBadge = `+${totalDelta}`;

  return {
    basePower,
    gearBonus,
    tempDelta,
    totalDelta,
    currentPower,
    status,
    deltaBadge,
    tooltip: `${parts.join(' · ')} = ${currentPower} Fuerza`
  };
}

/**
 * Entero aleatorio uniforme en [0, maxExclusive) usando crypto.getRandomValues (sin sesgo de módulo)
 */
function getSecureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      let val = 0;
      do {
        globalThis.crypto.getRandomValues(buf);
        val = buf[0];
      } while (val >= limit);
      return val % maxExclusive;
    }
  } catch {}
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Baraja una lista de cartas (algoritmo Fisher-Yates con entropía criptográfica uniforme)
 */
export function shuffleDeck(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Inicializa un nuevo estado de partida para Jugador vs Bot siguiendo las reglas oficiales:
 * 1. Mazo de 40-50 cartas barajado.
 * 2. 3 Leyendas barajadas y colocadas boca abajo.
 * 3. El Jugador 1 gira (spends) sus dos leyendas de la izquierda como penalización de turno 1.
 * 4. 6 dados en el Fixer (D4 en base hasta D20 en cúspide).
 * 5. Mano inicial de 6 cartas.
 * 6. Opción de 1 Mulligan por partida.
 */
export function createInitialGameState(playerDeckInput, botDeckInput, allCards = [], options = {}) {
  // Mapa de búsqueda rápida de la base de datos oficial
  const cardLookup = new Map();
  allCards.forEach((c) => {
    if (c.id) cardLookup.set(String(c.id).toUpperCase(), c);
    if (c.slug) cardLookup.set(String(c.slug).toLowerCase(), c);
    if (c.name) cardLookup.set(String(c.name).toLowerCase().trim(), c);
  });

  const enrichCard = (c, prefix, idx) => {
    const key = (c.id ? String(c.id).toUpperCase() : '') ||
                (c.slug ? String(c.slug).toLowerCase() : '') ||
                (c.name ? String(c.name).toLowerCase().trim() : '');
    const found = cardLookup.get(key) ||
                  (c.name ? cardLookup.get(String(c.name).toLowerCase().trim()) : null) ||
                  (c.slug ? cardLookup.get(String(c.slug).toLowerCase()) : null);

    const merged = found
      ? {
          ...c,
          ...found,
          cost: found.cost || c.cost,
          power: found.power || c.power,
          officialType: found.officialType || c.officialType,
          keywords: found.keywords || c.keywords,
          image: found.image || c.image
        }
      : c;

    const parsedCost = found && (found.costNum !== undefined && found.costNum !== null)
      ? Number(found.costNum)
      : parseCardCost(merged.cost);

    const parsedPower = found && (found.powerVal !== undefined && found.powerVal !== null)
      ? parseCardPower(found.powerVal)
      : parseCardPower(merged.power);

    return {
      ...merged,
      instanceId: `${prefix}-c-${idx}-${Date.now()}`,
      parsedCost,
      parsedPower
    };
  };

  const enrichLegend = (l, prefix, idx, isSpent) => {
    const key = (l.id ? String(l.id).toUpperCase() : '') ||
                (l.slug ? String(l.slug).toLowerCase() : '') ||
                (l.name ? String(l.name).toLowerCase().trim() : '');
    const found = cardLookup.get(key) ||
                  (l.name ? cardLookup.get(String(l.name).toLowerCase().trim()) : null) ||
                  (l.slug ? cardLookup.get(String(l.slug).toLowerCase()) : null);
    const merged = found ? { ...found, ...l, image: found.image || l.image } : l;

    return {
      ...merged,
      instanceId: `${prefix}-leg-${idx}-${Date.now()}`,
      isFaceUp: false,
      isSpent
    };
  };

  const extractLegendsAndCards = (deckInput) => {
    const rawList = deckInput?.deckList || deckInput?.cards || [];
    const isLeg = (c) =>
      String(c?.officialType || '').toUpperCase() === 'LEGEND' ||
      String(c?.cardType || c?.type || '').toUpperCase().includes('LEGEND');
    let legs = Array.isArray(deckInput?.legends) && deckInput.legends.length > 0
      ? [...deckInput.legends]
      : rawList.filter(isLeg);
    let mainCards = Array.isArray(deckInput?.legends) && deckInput.legends.length > 0
      ? rawList.filter((c) => !isLeg(c))
      : rawList.filter((c) => !isLeg(c));
    return { legs: legs.slice(0, 3), mainCards };
  };

  // 1. Preparar mazo y leyendas del jugador (posicionadas aleatoriamente al inicio de cada partida)
  const playerSplit = extractLegendsAndCards(playerDeckInput);
  const shuffledRawPlayerLegends = shuffleDeck(playerSplit.legs);

  // Expandir mazo del jugador por qty
  const rawPlayerCards = [];
  playerSplit.mainCards.forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawPlayerCards.push(enrichCard(c, 'p', rawPlayerCards.length));
    }
  });
  const shuffledPlayerDeck = shuffleDeck(rawPlayerCards);

  // 2. Preparar mazo y leyendas del Bot (posicionadas aleatoriamente al inicio de cada partida)
  const botSplit = extractLegendsAndCards(botDeckInput);
  const shuffledRawBotLegends = shuffleDeck(botSplit.legs);

  const rawBotCards = [];
  botSplit.mainCards.forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawBotCards.push(enrichCard(c, 'b', rawBotCards.length));
    }
  });
  const shuffledBotDeck = shuffleDeck(rawBotCards);

  // REGLA OFICIAL: Mano inicial de 6 CARTAS para ambos jugadores
  const playerHand = shuffledPlayerDeck.splice(0, 6);
  const botHand = shuffledBotDeck.splice(0, 6);

  // Determinación de quién empieza:
  // Si se especifica startingPlayer (ej. en una revancha decidida por la IA):
  let initialActivePlayer = options.startingPlayer || 'player';
  let pendingFirstPlayerSelection = null;
  let initialLog = [];

  if (options.startingPlayer) {
    const isBot = options.startingPlayer === 'bot';
    initialLog = [
      '// SISTEMA DE COMBATE NETWATCH INICIALIZADO',
      '// REGLAMENTO OFICIAL NIGHT CITY (SET 01)',
      options.isRematch
        ? `⚔️ PARTIDA DE REVANCHA: ¡El rival aceptó la revancha y decidió que ${isBot ? 'sale ÉL primero' : 'sales TÚ primero'}!`
        : `Partida iniciada: El primer turno lo jugará ${isBot ? 'AI Netrunner (Bot)' : 'Netrunner (Tú)'}.`,
      `Penalización de Turno 1: Las 2 leyendas izquierdas de ${isBot ? 'el Bot' : 'tu zona'} empiezan giradas y no se enderezan este primer turno.`,
      'Ambos jugadores tienen 6 dados en el Fixer (D4 hasta D20) y 6 cartas en mano.',
      'Decide si conservar tu mano o realizar tu único Mulligan de 6 cartas.'
    ];
  } else {
    // Primera partida: Tirada de D20 inicial entre ambos jugadores con entropía uniforme
    let pRoll = rollSecureD20();
    let bRoll = rollSecureD20();
    while (pRoll === bRoll) {
      bRoll = rollSecureD20();
    }
    const rollWinner = pRoll > bRoll ? 'player' : 'bot';
    // Si gana el bot la tirada, la IA decide quién empieza (50% jugador, 50% bot)
    const botDecidedStarter = rollWinner === 'bot' ? (rollSecureD20() <= 10 ? 'bot' : 'player') : null;

    pendingFirstPlayerSelection = {
      playerRoll: pRoll,
      botRoll: bRoll,
      rollWinner,
      botDecidedStarter
    };

    initialLog = [
      '// SISTEMA DE COMBATE NETWATCH INICIALIZADO',
      '// REGLAMENTO OFICIAL NIGHT CITY (SET 01)',
      `🎲 Tirada de D20 inicial: Tú [${pRoll}] vs Rival [${bRoll}].`,
      rollWinner === 'player'
        ? '🏆 ¡Has ganado la tirada de D20! Elige si sales tú primero o sale el oponente.'
        : `🤖 El rival ha ganado la tirada de D20 y ha decidido: ${botDecidedStarter === 'bot' ? 'Salir él primero' : 'Que salgas tú primero'}.`
    ];
  }

  // Leyendas con penalización de Turno 1 (solo para el jugador inicial si ya está determinado)
  const isPlayerFirst = options.startingPlayer ? options.startingPlayer === 'player' : true;
  const isBotFirst = options.startingPlayer ? options.startingPlayer === 'bot' : false;

  const playerLegends = shuffledRawPlayerLegends.map((l, idx) =>
    enrichLegend(l, 'p', idx, isPlayerFirst ? idx < 2 : false)
  );

  const botLegends = shuffledRawBotLegends.map((l, idx) =>
    enrichLegend(l, 'b', idx, isBotFirst ? idx < 2 : false)
  );

  const botDifficulty = Math.max(1, Math.min(3, Number(options.botDifficulty) || 1));
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const state = {
    matchId,
    botDifficulty,
    turnNumber: 1,
    activePlayer: initialActivePlayer, // 'player' | 'bot'
    phase: 'START', // 'START' | 'MAIN' | 'END'
    isGameOver: false,
    winner: null,
    overtime: false,
    consecutiveEmptyFixerTurns: 0,
    combatEvent: null, // Si hay un ataque o evento en curso
    mulliganDecided: false, // Control de fase inicial de Keep / Mulligan
    pendingFirstPlayerSelection, // Activo durante la tirada inicial de D20
    actionLog: initialLog,

    player: {
      id: 'player',
      name: 'Netrunner (Tú)',
      deck: shuffledPlayerDeck,
      hand: playerHand,
      field: [], // Unidades en juego
      trash: [], // Cementerio
      legends: playerLegends, // 3 slots de leyendas
      legendsDoNotReadyTurn1: isPlayerFirst, // Penalización oficial del primer jugador
      eddies: [], // Cartas boca abajo que dan 1 €$ cada una
      floatingEddies: 0, // Eddies actualmente girados listos para gastar
      fixerDice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
      gigs: [], // Empieza vacío hasta la fase de inicio
      hasSoldThisTurn: false,
      hasCalledLegendThisTurn: false,
      programsPlayedThisTurn: 0
    },

    bot: {
      id: 'bot',
      name: 'AI Netrunner (Bot)',
      deck: shuffledBotDeck,
      hand: botHand,
      field: [],
      trash: [],
      legends: botLegends,
      legendsDoNotReadyTurn1: isBotFirst,
      eddies: [],
      floatingEddies: 0,
      fixerDice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
      gigs: [],
      hasSoldThisTurn: false,
      hasCalledLegendThisTurn: false,
      programsPlayedThisTurn: 0
    }
  };

  return state;
}

/**
 * Aplica la elección del jugador inicial tras la tirada de D20 o revancha:
 * Ajusta activePlayer y la penalización oficial de Turno 1 en las 2 primeras leyendas.
 */
export function applyStartingPlayer(state, starterKey) {
  if (!state) return;
  state.activePlayer = starterKey;
  if (starterKey === 'player') {
    state.player.legendsDoNotReadyTurn1 = true;
    state.bot.legendsDoNotReadyTurn1 = false;
    (state.player.legends || []).forEach((l, idx) => {
      l.isSpent = idx < 2;
    });
    (state.bot.legends || []).forEach((l) => {
      l.isSpent = false;
    });
  } else {
    state.bot.legendsDoNotReadyTurn1 = true;
    state.player.legendsDoNotReadyTurn1 = false;
    (state.bot.legends || []).forEach((l, idx) => {
      l.isSpent = idx < 2;
    });
    (state.player.legends || []).forEach((l) => {
      l.isSpent = false;
    });
  }
}

/**
 * Calcula la Credibilidad en la Calle (Street Cred ⭐) sumando los valores de los dados de Gig
 */
export function calculateStreetCred(gigs = []) {
  return gigs.reduce((acc, g) => acc + (g.value || 0), 0);
}

/**
 * Retorna los Eddies actualmente girados y listos en la reserva para gastar (€$):
 * REGLA: "cuando gire eddies, haz que aparezcan en tus eddies"
 */
export function getAvailableEddies(playerState) {
  if (!playerState) return 0;
  return playerState.floatingEddies || 0;
}

/**
 * Retorna la capacidad total de Eddies que el jugador puede llegar a gastar este turno:
 * (Eddies ya girados + cartas de Eddies enderezadas + Leyendas enderezadas)
 */
export function getTotalAvailableEddies(playerState) {
  if (!playerState) return 0;
  const floating = playerState.floatingEddies || 0;
  const readyEddies = (playerState.eddies || []).filter((e) => !e.isSpent).length;
  const readyLegends = (playerState.legends || []).filter(
    (l) => !l.isSpent && !l.isOnField && !l.isRemovedFromGame
  ).length;
  return floating + readyEddies + readyLegends;
}

/**
 * Gasta N Eddies de la reserva del jugador:
 * REGLA SOLICITADA POR EL USUARIO:
 * "cuando lanze un programa, unidad o gear, no gires automaticamente las leyendas, usa esos eddies."
 * Los costes se descuentan directamente de los Eddies girados (floatingEddies), NUNCA giran automáticamente leyendas.
 */
export function spendEddies(playerState, amount) {
  if (!playerState) return false;
  const current = playerState.floatingEddies || 0;
  if (current < amount) return false;
  playerState.floatingEddies = current - amount;
  return true;
}

/**
 * Calcula el total de Eddies gastables (flotantes + Eddies sin girar + Leyendas sin girar)
 * excluyendo opcionalmente la carta que se está girando para pagar su propio coste (↷).
 */
export function getSpendableEddiesExcludingCard(playerState, excludedCardInstanceId = null) {
  if (!playerState) return 0;
  const floating = playerState.floatingEddies || 0;
  const readyEddies = (playerState.eddies || []).filter(
    (e) => !e.isSpent && e.instanceId !== excludedCardInstanceId
  ).length;
  const readyLegends = (playerState.legends || []).filter(
    (l) => !l.isSpent && !l.isOnField && !l.isRemovedFromGame && l.instanceId !== excludedCardInstanceId
  ).length;
  return floating + readyEddies + readyLegends;
}

/**
 * Paga un coste en Eddies usando primero los flotantes (floatingEddies) y, si falta,
 * girando Eddies de la Zona de Eddies (NUNCA gira automáticamente Leyendas).
 */
export function payEddieCostWithAutoTap(playerState, amount, excludedCardInstanceId = null) {
  const cost = Math.max(0, Number(amount) || 0);
  if (cost === 0) return true;
  const floating = playerState.floatingEddies || 0;
  const readyEddies = (playerState.eddies || []).filter(
    (e) => !e.isSpent && e.instanceId !== excludedCardInstanceId
  );
  if (floating + readyEddies.length < cost) return false;

  let needed = cost;
  if (floating > 0) {
    const usedFloat = Math.min(floating, needed);
    playerState.floatingEddies = floating - usedFloat;
    needed -= usedFloat;
  }

  for (const ed of readyEddies) {
    if (needed <= 0) break;
    ed.isSpent = true;
    needed--;
  }

  return needed === 0;
}

/**
 * Calcula el coste efectivo actual de una carta aplicando todos los descuentos oficiales activos
 * (ej: Alt Cunningham CP-008, Carnage at the Colosseum CP-016, Nocturne Op55N1 CP-085,
 *  MaxTac Heavy CP-071, Octant CP-086, Trauma Team CP-131, Zetatech Berserk CP-150, Viktor CP-140).
 */
export function getEffectiveCardCost(card, playerState = null, gameState = null) {
  if (!card) return 0;
  const baseCost =
    typeof card.parsedCost === 'number' && !Number.isNaN(card.parsedCost)
      ? card.parsedCost
      : typeof card.costNum === 'number' && !Number.isNaN(card.costNum)
      ? card.costNum
      : parseCardCost(card.cost);

  if (!playerState) return baseCost;

  const cId = String(card.id || '').toUpperCase();
  const slug = String(card.slug || '').toLowerCase();
  const cardType = getCardType(card);
  let cost = baseCost;

  if (cardType === 'PROGRAM') {
    // CP-085 Nocturne Op55N1: "If your fixer area is empty, play this Program for 1 €$"
    if ((cId === 'CP-085' || slug.includes('nocturne')) && (playerState.fixerDice || []).length === 0) {
      cost = Math.min(cost, 1);
    }
    // CP-016 Carnage at the Colosseum: -1 €$ for each friendly Gig with 8+ value, min 1
    if (cId === 'CP-016' || slug.includes('carnage-at-the-colosseum')) {
      const highGigs = (playerState.gigs || []).filter((g) => (g.value || 0) >= 8).length;
      if (highGigs > 0) cost = Math.min(cost, Math.max(1, cost - highGigs));
    }
    // CP-008 Alt Cunningham // Soulkiller Architect (Habilidad 1):
    // "Your next Program this turn plays for -1 €$ for each friendly min Gig, to a minimum of 1 €$"
    const stacks = playerState.altCunninghamDiscountStacks || (playerState.altCunninghamProgramDiscount > 0 ? 1 : 0);
    if (stacks > 0) {
      const minGigsNow = (playerState.gigs || []).filter((g) => Number(g.value) === 1).length;
      const totalDiscount = minGigsNow * stacks;
      if (totalDiscount > 0) {
        cost = Math.min(cost, Math.max(1, cost - totalDiscount));
      }
    }
  } else if (cardType === 'UNIT') {
    const opp = gameState ? gameState[playerState.id === 'player' ? 'bot' : 'player'] : null;
    if (cId === 'CP-071' || slug.includes('maxtac-heavy')) {
      const oppUnitsCount = (opp?.field || []).length;
      if (oppUnitsCount > 0) cost = Math.min(cost, Math.max(1, cost - oppUnitsCount));
    }
    if (cId === 'CP-086' || slug.includes('octant')) {
      const highGigs = (playerState.gigs || []).filter((g) => (g.value || 0) >= 8).length;
      if (highGigs > 0) cost = Math.min(cost, Math.max(1, cost - highGigs));
    }
    if (cId === 'CP-131' || slug.includes('trauma-team-operatives')) {
      const trashUnits = (playerState.trash || []).filter(
        (c) => String(c.officialType || '').toUpperCase() === 'UNIT' || String(c.type || '').toUpperCase().includes('UNIT')
      ).length;
      if (trashUnits > 0) cost = Math.min(cost, Math.max(1, cost - trashUnits));
    }
  } else if (cardType === 'GEAR') {
    if (cId === 'CP-150' || slug.includes('zetatech-berserk')) {
      const faceUpLegends = (playerState.legends || []).filter((l) => l.isFaceUp && !l.isRemovedFromGame).length;
      if (faceUpLegends > 0) cost = Math.min(cost, Math.max(1, cost - faceUpLegends));
    }
    const hasViktor = (playerState.field || []).some((u) => String(u.id || '').toUpperCase() === 'CP-140');
    const isCyberware = String(card.traits || card.cardType || '').toUpperCase().includes('CYBERWARE');
    if (hasViktor && isCyberware && !playerState.usedViktorCyberwareDiscountThisTurn) {
      cost = Math.min(cost, Math.max(1, cost - 3));
    }
  }

  return cost;
}

/**
 * Comprueba las condiciones de victoria oficiales:
 * 1. Controlar 7 o más dados de Gig al inicio del turno (Start Phase) o en Overtime.
 * 2. Quedarse sin cartas en el mazo cuando es obligatorio robar (Deck out).
 */
export function checkWinCondition(state, targetPlayerKey) {
  if (state.isGameOver) return true;
  const p = state[targetPlayerKey];

  // Victoria por 7 Gigs al inicio del turno
  if (p.gigs.length >= 7) {
    state.isGameOver = true;
    state.winner = targetPlayerKey;
    state.actionLog.unshift(
      `🏆 ¡VICTORIA! ${p.name} controla ${p.gigs.length} Gigs (7 requeridos) y domina Night City.`
    );
    return true;
  }

  return false;
}

/**
 * Comprobación oficial de muerte súbita en OVERTIME:
 * Una vez activo el Overtime, si CUALQUIER jugador controla 7 o más Gigs en cualquier instante,
 * gana la partida inmediatamente (sin esperar al inicio de su siguiente turno).
 */
export function checkOvertimeInstantWin(state) {
  if (!state || !state.overtime || state.isGameOver) return false;
  for (const key of ['player', 'bot']) {
    const side = state[key];
    if (side && (side.gigs || []).length >= 7) {
      state.isGameOver = true;
      state.winner = key;
      (state.actionLog = state.actionLog || []).unshift(
        `🏆 ¡VICTORIA EN OVERTIME! ${side.name} controla ${side.gigs.length} Gigs y gana la partida al instante.`
      );
      return true;
    }
  }
  return false;
}

/**
 * Vende una carta de la mano a la zona de Eddies boca abajo (1 vez por turno).
 * REGLA OFICIAL: Solo se pueden vender cartas con Sell Tag (Programas, Gears y MT0D12 Flathead).
 * La carta entra lista (ready) para gastar 1 €$ inmediatamente.
 */
export function sellCardForEddies(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  if (p.hasSoldThisTurn) return { success: false, reason: 'Ya has vendido una carta este turno.' };

  const cardIdx = p.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Carta no encontrada en mano.' };

  const card = p.hand[cardIdx];
  if (!isCardVendible(card)) {
    return {
      success: false,
      reason: `"${card.name}" no tiene Sell Tag. Solo son vendibles los Programas, los Gears y la unidad MT0D12 Flathead.`
    };
  }

  p.hand.splice(cardIdx, 1);
  p.eddies.push({
    ...card,
    isSpent: false, // Entra lista para usarse este turno
    soldAtTurn: state.turnNumber
  });
  p.hasSoldThisTurn = true;

  state.actionLog.unshift(
    `💰 ${p.name} vende "${card.name}" [${card.officialType || 'SELL TAG'}] a su Zona de Eddies (+1 €$).`
  );

  return { success: true };
}

/**
 * Gira o endereza manualmente una carta en la Zona de Eddies para generar o devolver 1 €$:
 * - Si está enderezada: se gira 90° y suma +1 €$ a floatingEddies.
 * - Si está girada: si floatingEddies > 0 (no ha sido consumido), se endereza y resta 1 €$.
 */
export function toggleEddieSpent(state, playerKey, eddieInstanceId) {
  const p = state[playerKey];
  const ed = (p.eddies || []).find((e) => e.instanceId === eddieInstanceId);
  if (!ed) return { success: false, reason: 'Eddie no encontrado.' };

  if (!ed.isSpent) {
    // Girar para obtener 1 €$
    ed.isSpent = true;
    p.floatingEddies = (p.floatingEddies || 0) + 1;
    (state.actionLog = state.actionLog || []).unshift(
      `💶 ${p.name} gira 1 carta en su Zona de Eddies (+1 €$). Total listos: ${p.floatingEddies} €$.`
    );
    return { success: true, isSpent: true, floatingEddies: p.floatingEddies };
  } else {
    // REGLA: No se puede enderezar manualmente. Si el jugador se equivoca, debe usar DESHACER.
    return {
      success: false,
      reason: 'Las cartas no se pueden enderezar manualmente. Si te has equivocado, usa el botón DESHACER (1 solo uso).'
    };
  }
}

/**
 * Gira o endereza manualmente una Leyenda para obtener o devolver 1 €$:
 * Según reglas oficiales de Cyberpunk TCG:
 * "To pay, you spend (turn sideways) Eddies and Legends, each worth 1 €$."
 */
export function toggleLegendSpent(state, playerKey, legendInstanceId) {
  const p = state[playerKey];
  const leg = (p.legends || []).find((l) => l.instanceId === legendInstanceId);
  if (!leg) return { success: false, reason: 'Leyenda no encontrada.' };
  if (leg.isOnField) {
    return { success: false, reason: 'Esta Leyenda está en el campo de batalla como Unidad (Go Solo).' };
  }
  if (leg.isRemovedFromGame) {
    return { success: false, reason: 'Esta Leyenda ha sido eliminada de la partida (Removed from the game).' };
  }

  if (!leg.isSpent) {
    // Girar leyenda para obtener 1 €$ (sin revelar el nombre si está boca abajo)
    leg.isSpent = true;
    p.floatingEddies = (p.floatingEddies || 0) + 1;
    const slotNum = (p.legends || []).findIndex((l) => l.instanceId === legendInstanceId) + 1;
    const legLabel = leg.isFaceUp ? `"${leg.name}"` : `Leyenda #${slotNum} (boca abajo)`;
    (state.actionLog = state.actionLog || []).unshift(
      `👑 ${p.name} gira su ${legLabel} (+1 €$). Total listos: ${p.floatingEddies} €$.`
    );
    executeCardSpentTriggers(state, playerKey, leg);
    return { success: true, isSpent: true, floatingEddies: p.floatingEddies };
  } else {
    // REGLA: Las Leyendas no se pueden enderezar manualmente. Si el jugador se equivoca, debe usar DESHACER.
    return {
      success: false,
      reason: 'Las Leyendas no se pueden enderezar manualmente. Si te has equivocado, usa el botón DESHACER (1 solo uso).'
    };
  }
}

/**
 * Identifica el tipo de carta (UNIT, PROGRAM, GEAR, LEGEND):
 */
export function getCardType(card) {
  if (!card) return 'UNKNOWN';
  const official = (card.officialType || '').toUpperCase();
  if (official) return official;
  const t = (card.type || card.cardType || '').toUpperCase();
  if (t.includes('PROGRAM')) return 'PROGRAM';
  if (t.includes('GEAR')) return 'GEAR';
  if (t.includes('LEGEND')) return 'LEGEND';
  if (t.includes('UNIT')) return 'UNIT';
  return 'UNIT';
}

/**
 * Lanza un PROGRAMA desde la mano:
 * REGLA OFICIAL: "los programas cuando se lanzan, se van al trash"
 * - Paga su coste en Eddies.
 * - Va directamente a la Basura (Trash) tras lanzarse.
 */
export function playProgramCard(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  const cardIdx = (p.hand || []).findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Programa no encontrado en mano.' };

  const card = p.hand[cardIdx];
  const baseCost = card.parsedCost || parseCardCost(card.cost);
  const cost = getEffectiveCardCost(card, p, state);
  const discount = Math.max(0, baseCost - cost);
  const available = getAvailableEddies(p);

  if (available < cost) {
    const missing = cost - available;
    return {
      success: false,
      missingEddies: missing,
      cardName: card.name,
      cost,
      reason: `Eddies insuficientes. "${card.name}" cuesta ${cost} €$${discount > 0 ? ` (reducido de ${baseCost} €$ por descuento activo)` : ''} y solo has girado ${available} €$. Te faltan ${missing} €$ (gira más cartas de Eddies o Leyendas antes de jugar).`
    };
  }

  // Pagar coste de los Eddies girados y consumir descuento de Alt Cunningham si estaba activo
  spendEddies(p, cost);
  if (p.altCunninghamDiscountStacks || p.altCunninghamProgramDiscount) {
    delete p.altCunninghamDiscountStacks;
    delete p.altCunninghamProgramDiscount;
  delete p.altCunninghamDiscountStacks;
    if (discount > 0) {
      (state.actionLog = state.actionLog || []).unshift(
        `🌐 [Alt Cunningham] Descuento de -${discount} €$ aplicado a "${card.name}" (coste final: ${cost} €$, por Gigs mínimos).`
      );
    }
  }
  p.hand.splice(cardIdx, 1);

  // El programa va directo al descarte (Trash)
  if (!p.trash) p.trash = [];
  p.trash.push(card);

  // Registrar programa jugado este turno para reglas oficiales (ej: Jacked-In Voodoo Boy)
  p.programsPlayedThisTurn = (p.programsPlayedThisTurn || 0) + 1;
  card.playedAtTurn = state.turnNumber;

  (state.actionLog = state.actionLog || []).unshift(
    `💾 ${p.name} usa ${cost} €$ girados, lanza el Programa "${card.name}" y va al Descarte (Trash).`
  );

  // Ejecuta la habilidad específica del Programa (ej: robar cartas, vender top del mazo, etc.)
  executeProgramEffect(state, playerKey, card);

  return { success: true, type: 'PROGRAM', card };
}

/**
 * Equipa un GEAR desde la mano a una Unidad o Leyenda:
 * REGLA OFICIAL: "los gears se equipan a las unidades o las leyendas (se suelen poner por debajo de la unidad o leyenda sobresaliendo un poco)"
 * - Paga su coste en Eddies.
 * - Se anexa al objetivo (unidad o leyenda).
 * - Otorga su bono de Fuerza (+X Fuerza) y palabras clave (ej: Adrenaline).
 */
export function playGearCard(state, playerKey, cardInstanceId, targetInstanceId = null) {
  const p = state[playerKey];
  const cardIdx = (p.hand || []).findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Gear no encontrado en mano.' };

  const card = p.hand[cardIdx];
  let cost = card.parsedCost || parseCardCost(card.cost);
  const cId = String(card.id || '').toUpperCase();
  // CP-150 Zetatech Berserk: -1 €$ por cada Leyenda aliada boca arriba (mín 1 €$)
  if (cId === 'CP-150' || (card.slug || '').includes('zetatech-berserk')) {
    const faceUpLegends = (p.legends || []).filter((l) => l.isFaceUp && !l.isRemovedFromGame).length;
    if (faceUpLegends > 0) cost = Math.max(1, cost - faceUpLegends);
  }
  // CP-140 Viktor Vektor // Drop Your Illusions: primer Gear CYBERWARE cada turno -3 €$ (mín 1 €$)
  const hasViktorDiscount = (p.field || []).some((u) => String(u.id || '').toUpperCase() === 'CP-140');
  const isCyberware = String(card.traits || card.cardType || '').toUpperCase().includes('CYBERWARE');
  let usedViktor = false;
  if (hasViktorDiscount && isCyberware && !p.usedViktorCyberwareDiscountThisTurn) {
    cost = Math.max(1, cost - 3);
    usedViktor = true;
  }
  const available = getAvailableEddies(p);

  if (available < cost) {
    const missing = cost - available;
    return {
      success: false,
      missingEddies: missing,
      cardName: card.name,
      cost,
      reason: `Eddies insuficientes. "${card.name}" cuesta ${cost} €$ y solo has girado ${available} €$. Te faltan ${missing} €$ (gira más cartas de Eddies o Leyendas antes de jugar).`
    };
  }

  // Buscar objetivo: Unidad en campo o Leyenda
  let target = null;
  let targetType = 'unit';

  if (targetInstanceId) {
    target = (p.field || []).find((u) => u.instanceId === targetInstanceId);
    if (!target) {
      target = (p.legends || []).find((l) => l.instanceId === targetInstanceId);
      if (target) targetType = 'legend';
    }
  } else {
    // Si no se especificó, auto-asignar a la primera unidad en campo o primera leyenda
    if (p.field && p.field.length > 0) {
      target = p.field[0];
      targetType = 'unit';
    } else if (p.legends && p.legends.length > 0) {
      target = p.legends.find((l) => l.isFaceUp) || p.legends[0];
      targetType = 'legend';
    }
  }

  if (!target) {
    return {
      success: false,
      reason: 'No hay ninguna Unidad ni Leyenda en juego a la que equipar este Gear.'
    };
  }

  // Pagar coste
  spendEddies(p, cost);
  p.hand.splice(cardIdx, 1);

  // Bono de Fuerza del Gear (ej: "+3 FUERZA" -> 3)
  const powerBonus = card.powerVal
    ? parseInt(card.powerVal, 10)
    : parseCardPower(card.power);

  if (!target.gear) target.gear = [];
  target.gear.push(card);

  if (powerBonus && target.currentPower !== undefined) {
    target.currentPower = Math.max(0, target.currentPower + powerBonus);
  }
  // CP-109 Royce // Psycho on the Edge: +2 de fuerza adicional por cada Gear equipado durante tu turno
  if (targetType === 'unit') {
    syncRoyceTurnPassiveBonus(target, state.activePlayer === playerKey);
  }

  // CP-004 Adrenaline Converter: solo concede ADRENALINE si el rival controla al menos 2 Gigs más que tú
  const opp = state[playerKey === 'player' ? 'bot' : 'player'];
  const isAdrenalineConverter = cId === 'CP-004' || (card.slug || '').includes('adrenaline-converter');
  const adrenalineConverterActive = isAdrenalineConverter && ((opp?.gigs?.length || 0) - (p.gigs?.length || 0) >= 2);
  if (adrenalineConverterActive || (!isAdrenalineConverter && hasKeyword(card, 'Adrenaline'))) {
    target.hasAdrenaline = true;
    target.isLagging = false;
  }

  const grantsBlocker = hasKeyword(card, 'Blocker');
  const bonusParts = [];
  if (powerBonus > 0) bonusParts.push(`+${powerBonus} Fuerza`);
  if (grantsBlocker) bonusParts.push('🛡️ BLOCKER');
  if (adrenalineConverterActive) bonusParts.push('⚡ ADRENALINE');
  const bonusText = bonusParts.length > 0 ? ` (${bonusParts.join(' • ')})` : '';
  (state.actionLog = state.actionLog || []).unshift(
    `🔧 ${p.name} paga ${cost} €$ y equipa el Gear "${card.name}"${bonusText} a "${target.name}".`
  );

  // Trigger pasivo CP-051 Jackie Welles // Pour One Out for Me (primer Gear o Unidad Azul del turno)
  executeJackiePourOneOutTrigger(state, playerKey, card);

  return { success: true, type: 'GEAR', gear: card, target, targetType };
}

/**
 * Juega una carta de Unidad desde la mano al campo:
 * - Requiere pagar su coste en Eddies (mínimo 1 €$).
 * - Entra con LAG excepto si posee la palabra clave ADRENALINE.
 */
export function playUnitCard(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  const opp = state[playerKey === 'player' ? 'bot' : 'player'];
  const cardIdx = (p.hand || []).findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Carta no encontrada en mano.' };

  const card = p.hand[cardIdx];
  let cost = card.parsedCost || parseCardCost(card.cost);
  const cId = String(card.id || '').toUpperCase();
  // CP-071 MaxTac Heavy: -1 €$ por cada Unidad rival (mín 1 €$)
  if (cId === 'CP-071' || (card.slug || '').includes('maxtac-heavy')) {
    const oppUnitsCount = (opp?.field || []).length;
    if (oppUnitsCount > 0) cost = Math.max(1, cost - oppUnitsCount);
  }
  // CP-086 Octant: -1 €$ por cada Gig aliado con valor 8+ (mín 1 €$)
  if (cId === 'CP-086' || (card.slug || '').includes('octant')) {
    const highGigs = (p.gigs || []).filter((g) => (g.value || 0) >= 8).length;
    if (highGigs > 0) cost = Math.max(1, cost - highGigs);
  }
  // CP-131 Trauma Team Operatives: -1 €$ por cada Unidad en tu Basura (mín 1 €$)
  if (cId === 'CP-131' || (card.slug || '').includes('trauma-team-operatives')) {
    const trashUnits = (p.trash || []).filter((c) => String(c.officialType || '').toUpperCase() === 'UNIT' || String(c.type || '').toUpperCase().includes('UNIT')).length;
    if (trashUnits > 0) cost = Math.max(1, cost - trashUnits);
  }
  const available = getAvailableEddies(p);

  if (available < cost) {
    const missing = cost - available;
    return {
      success: false,
      missingEddies: missing,
      cardName: card.name,
      cost,
      reason: `Eddies insuficientes. "${card.name}" cuesta ${cost} €$ y solo has girado ${available} €$. Te faltan ${missing} €$ (gira más cartas de Eddies o Leyendas antes de jugar).`
    };
  }

  // Pagar coste de los Eddies girados
  spendEddies(p, cost);
  p.hand.splice(cardIdx, 1);

  // REGLA OFICIAL DE LAG Y ADRENALINE:
  // "Every Unit enters the field with Lag... Units with Adrenaline can attack the turn they arrive."
  const hasAdrenaline = hasKeyword(card, 'Adrenaline');

  const unitInstance = {
    ...card,
    isSpent: false,
    isLagging: !hasAdrenaline,
    hasAdrenaline,
    turnEntered: state.turnNumber,
    currentPower: card.parsedPower || parseCardPower(card.power),
    gear: []
  };

  if (!p.field) p.field = [];
  p.field.push(unitInstance);

  (state.actionLog = state.actionLog || []).unshift(
    `${p.name} paga ${cost} €$ y despliega a "${card.name}" [Fuerza: ${unitInstance.currentPower}]${
      hasAdrenaline ? ' ⚡ [ADRENALINE: Sin Lag, puede atacar ya!]' : ' [Con Lag]'
    }.`
  );

  // Ejecutar habilidades al entrar al campo (On-Play triggers)
  executeUnitPlayTrigger(state, playerKey, unitInstance);

  // Trigger pasivo CP-051 Jackie Welles // Pour One Out for Me (primera Unidad o Gear Azul del turno)
  executeJackiePourOneOutTrigger(state, playerKey, unitInstance);

  return { success: true, type: 'UNIT', unit: unitInstance };
}

/**
 * Función unificada para jugar cualquier carta desde la mano:
 * Despacha según el tipo: PROGRAM -> va a Trash, GEAR -> se equipa, UNIT -> entra a Battlefield.
 */
export function playCard(state, playerKey, cardInstanceId, targetInstanceId = null) {
  const p = state[playerKey];
  const card = (p.hand || []).find((c) => c.instanceId === cardInstanceId);
  if (!card) return { success: false, reason: 'Carta no encontrada en mano.' };

  const type = getCardType(card);
  if (type === 'PROGRAM') {
    return playProgramCard(state, playerKey, cardInstanceId);
  }
  if (type === 'GEAR') {
    return playGearCard(state, playerKey, cardInstanceId, targetInstanceId);
  }
  return playUnitCard(state, playerKey, cardInstanceId);
}

/**
 * Llama a una Leyenda boca arriba en la zona de Leyendas:
 * REGLA OFICIAL: "Call a Legend (once per turn): spend 1 €$ to flip a face-down Legend face-up."
 */
export function callLegendFaceUp(state, playerKey, legendInstanceId) {
  const p = state[playerKey];
  if (p.hasCalledLegendThisTurn) {
    return { success: false, reason: 'Solo puedes llamar a 1 Leyenda boca arriba por turno.' };
  }

  const leg = p.legends.find((l) => l.instanceId === legendInstanceId);
  if (!leg) return { success: false, reason: 'Leyenda no encontrada.' };
  if (leg.isFaceUp) return { success: false, reason: 'Esta Leyenda ya está boca arriba.' };

  // Comprobar coste oficial de 1 €$
  const available = getAvailableEddies(p);
  if (available < 1) {
    return {
      success: false,
      missingEddies: 1,
      reason: 'Llamar a una Leyenda cuesta 1 €$. Gira 1 carta en tu Zona de Eddies o una Leyenda primero para obtener 1 €$.'
    };
  }

  // Pagar 1 €$
  spendEddies(p, 1);
  leg.isFaceUp = true;
  p.hasCalledLegendThisTurn = true;

  if (!state.actionLog) state.actionLog = [];
  state.actionLog.unshift(
    `👑 ${p.name} usa 1 €$ girado y llama a su Leyenda "${leg.name || 'Leyenda'}" boca arriba.`
  );

  // Disparar habilidad CALL de la Leyenda si posee
  executeCallLegendTrigger(state, playerKey, leg);

  return { success: true };
}

/**
 * Despliega una Leyenda desde la Zona de Leyendas al Campo de Batalla (Go Solo o Despliegue normal):
 * REGLA OFICIAL:
 * "GO SOLO (Pay this Legend's cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.)"
 *
 * REGLA SOLICITADA POR EL USUARIO:
 * "yo puedo pagar el coste de la leyenda (que tenga go solo) y la leyenda saldría al campo de batalla pero con lag y girada si la giré,
 *  pero si pago el coste de la leyenda con go solo, la leyenda entrará ready y sin lag"
 */
export function playLegendToField(state, playerKey, legendInstanceId, isGoSolo = true) {
  const p = state[playerKey];
  const leg = (p.legends || []).find((l) => l.instanceId === legendInstanceId);
  if (!leg) return { success: false, reason: 'Leyenda no encontrada en tu zona.' };

  if (leg.isOnField) {
    return { success: false, reason: `"${leg.name}" ya está en el campo de batalla.` };
  }
  if (leg.isRemovedFromGame) {
    return { success: false, reason: `"${leg.name}" ha sido eliminada de la partida (Remove from the game).` };
  }
  if (!leg.isFaceUp) {
    return {
      success: false,
      reason: 'Debes hacer Call (dar la vuelta) a la Leyenda antes de poder activar Go Solo o desplegarla al campo de batalla.'
    };
  }

  if (!canLegendDeployToField(leg)) {
    return {
      success: false,
      reason: `"${leg.name}" no tiene la palabra clave "Go Solo" o su coste es (-). Las Leyendas sin Go Solo no pueden desplegarse al campo de batalla.`
    };
  }

  const cost = leg.parsedCost || parseCardCost(leg.cost) || leg.costNum || 0;
  const available = getAvailableEddies(p);

  if (available < cost) {
    const missing = cost - available;
    return {
      success: false,
      missingEddies: missing,
      cardName: leg.name,
      cost,
      reason: `Eddies insuficientes. "${leg.name}" cuesta ${cost} €$ y solo has girado ${available} €$. Te faltan ${missing} €$ (gira más cartas de Eddies o Leyendas antes de jugar).`
    };
  }

  // Pagar coste de los Eddies girados
  spendEddies(p, cost);

  // Al salir al campo, se revela boca arriba si estaba boca abajo
  leg.isFaceUp = true;
  leg.isOnField = true;

  // Estado previo de giro de la leyenda (por si se giró para pagar antes de Go Solo)
  const wasSpent = Boolean(leg.isSpent);

  // Si se paga con GO SOLO: entra READY (isSpent = false) y SIN LAG (isLagging = false)
  // Si se despliega normalmente: entra CON LAG (isLagging = true) y si estaba girada, entra girada (isSpent = wasSpent)
  const entersReady = isGoSolo ? true : !wasSpent;
  const entersLagging = isGoSolo ? false : true;

  const baseLegendPower =
    leg.parsedPower || parseCardPower(leg.power) || (leg.powerVal ? parseInt(leg.powerVal, 10) : 0);
  const equippedGearBonus = (leg.gear || []).reduce(
    (sum, g) => sum + (g.powerBonus || g.parsedPower || parseCardPower(g.power) || 0),
    0
  );

  const unitInstance = {
    ...leg,
    instanceId: `${leg.instanceId}_unit`,
    legendInstanceId: leg.instanceId,
    isLegend: true,
    isUnit: true,
    isLegendUnit: true,
    hasGoSolo: Boolean(isGoSolo),
    isSpent: !entersReady,
    isLagging: entersLagging,
    turnEntered: state.turnNumber,
    currentPower: baseLegendPower + equippedGearBonus,
    gear: leg.gear || []
  };

  leg.unitInstanceId = unitInstance.instanceId;

  // CP-109 Royce // Psycho on the Edge: +2 de fuerza por cada Gear equipado durante tu turno
  syncRoyceTurnPassiveBonus(unitInstance, state.activePlayer === playerKey);

  if (!p.field) p.field = [];
  p.field.push(unitInstance);

  const modeText = isGoSolo
    ? '🔥 [GO SOLO: Entra LISTA y SIN LAG, ¡puede atacar este turno!]'
    : `⚔️ [DESPLIEGUE NORMAL: Entra con Lag${unitInstance.isSpent ? ' y girada' : ''}]`;

  (state.actionLog = state.actionLog || []).unshift(
    `👑 ${p.name} paga ${cost} €$ y lleva a su Leyenda "${leg.name}" al campo de batalla [Fuerza: ${unitInstance.currentPower}] ${modeText}.`
  );

  // Ejecutar habilidades ON-PLAY de la leyenda (ej: CP-002 Adam Smasher)
  executeUnitPlayTrigger(state, playerKey, unitInstance);

  return { success: true, isGoSolo, unit: unitInstance, legend: leg };
}

/**
 * Declara un ataque de una unidad contra los Gigs del rival para robar dados de Gig:
 * REGLA OFICIAL:
 * - Solo unidades listas (ready) y sin Lag pueden atacar.
 * - Cantidad de Gigs robados según la tabla de poder:
 *     0 poder: 0 Gigs
 *     1–9 poder: 1 Gig
 *     10–19 poder: 2 Gigs
 *     20–29 poder: 3 Gigs
 * - Si el rival intercepta con Blocker, no se roba ningún Gig y se convierte en pelea contra el Blocker.
 */
export function attackRivalGigs(
  state,
  attackerPlayerKey,
  attackerUnitId,
  blockerUnitId = null,
  preferredDice = []
) {
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];

  const unit = attacker.field.find((u) => u.instanceId === attackerUnitId);
  if (!unit) return { success: false, reason: 'Unidad atacante no encontrada.' };
  const isMidAttack = Boolean(
    unit.hasTriggeredAttackThisDeclaration ||
    (state.pendingReaction && state.pendingReaction.attackerUnitId === attackerUnitId)
  );
  if (!isMidAttack) {
    if (unit.isSpent) {
      return { success: false, reason: 'La unidad ya está girada (Spent).' };
    }
    if (unit.isLagging) return { success: false, reason: 'La unidad tiene Lag (no puede atacar este turno).' };
    if (!canUnitAttack(unit, attacker, state, 'GIGS')) {
      const restriction = getUnitAttackRestriction(unit, attacker, state, 'GIGS') || 'Esta unidad no puede atacar a los Gigs.';
      return { success: false, reason: restriction };
    }
  }
  if (defender.gigs.length === 0) return { success: false, reason: 'El rival no tiene Gigs para robar.' };

  // Girar la unidad atacante y cumplir obligación de ataque si existía
  const wasAttackerSpent = Boolean(unit.isSpent);
  unit.isSpent = true;
  delete unit.mustAttackNextTurn;
  if (!isMidAttack && !wasAttackerSpent) {
    executeCardSpentTriggers(state, attackerPlayerKey, unit);
  }

  // FASE 1: Disparar habilidades de ataque (ej: Sketchy Ripper, El Sombrerón) antes de la reacción del rival
  if (!unit.hasTriggeredAttackThisDeclaration) {
    unit.hasTriggeredAttackThisDeclaration = true;
    executeUnitAttackTrigger(state, attackerPlayerKey, unit);
  }

  // FASE 2: Intercepción por BLOCKER (si fue asignado en la Fase de Reacción):
  if (blockerUnitId && canUnitBeBlocked(unit, attackerPlayerKey, state)) {
    const blocker = defender.field.find((u) => u.instanceId === blockerUnitId);
    if (blocker && hasKeyword(blocker, 'Blocker') && !blocker.cannotBlock && !blocker.cannotBlockThisTurn) {
      blocker.isSpent = true;
      state.actionLog.unshift(
        `🛡️ [FASE 2: REACCIÓN] ¡BLOCKER! ${defender.name} gira a "${blocker.name}" para interceptar el asalto a sus Gigs. ¡El combate se convierte en lucha contra el bloqueador y NO se roba ningún Gig!`
      );
      executeCardSpentTriggers(state, defenderKey, blocker);
      // Disparar triggers de BLOCKER (ej: Goro Takemura CP-042, Augmented Negotiators CP-012, La Llorona CP-061)
      executeBlockerUsedTrigger(state, defenderKey, blocker);
      // FASE 3: Resolver pelea contra el Blocker
      const fightRes = resolveFight(state, attackerPlayerKey, unit, defenderKey, blocker);
      delete unit.hasTriggeredAttackThisDeclaration;
      return { ...fightRes, isBlocked: true, blocker };
    }
  }

  // FASE 4: ROBO DE GIGS (si el objetivo eran los Gigs y no hubo Blocker)
  delete unit.hasTriggeredAttackThisDeclaration;

  // Cálculo oficial de Gigs a robar según tabla de poder
  const gigsToSteal = calculateGigsToSteal(unit.currentPower);
  if (gigsToSteal <= 0) {
    state.actionLog.unshift(
      `⚠️ [FASE 4: ROBO DE GIGS] "${unit.name}" tiene 0 de poder y no puede robar ningún Gig.`
    );
    return { success: true, stolenCount: 0 };
  }

  // Filtrar Gigs elegibles según protecciones activas (Chrome Fang CP-017 / Westbrook Netrunner CP-145)
  const isAttackerLegend = unit.officialType === 'LEGEND' || unit.isLegendUnit || Boolean(unit.isLegend);
  const isGigStealable = (g) => {
    if (defender.chromeFangProtectionActive && (g.value || 0) > (unit.currentPower || 0)) return false;
    if (defender.westbrookProtectionActive && isAttackerLegend && (g.value || 0) < (unit.currentPower || 0)) return false;
    return true;
  };
  const stealableCount = defender.gigs.filter(isGigStealable).length;
  if (stealableCount === 0) {
    state.actionLog.unshift(
      `🛡️ [PROTECCIÓN DE GIGS] Ningún Gig de ${defender.name} puede ser robado por "${unit.name}" debido a protección activa (Chrome Fang / Westbrook Netrunner).`
    );
    return { success: true, stolenCount: 0, stolenDice: [] };
  }

  // Se roban hasta gigsToSteal dados elegibles (priorizando dados elegidos por el usuario)
  const countToSteal = Math.min(gigsToSteal, stealableCount);
  const stolenDice = [];
  const prefs = [...(preferredDice || [])];

  for (let i = 0; i < countToSteal; i++) {
    let chosenIdx = -1;

    // Si el usuario eligió un dado específico (por id exacto o por tipo de dado ej: 'd20'), buscarlo entre los gigs elegibles del defensor
    if (prefs.length > 0) {
      const pref = prefs.shift();
      if (pref && typeof pref === 'object') {
        if (pref.id) {
          chosenIdx = defender.gigs.findIndex((g) => g.id === pref.id && isGigStealable(g));
        }
        if (chosenIdx === -1 && pref.die) {
          const targetDie = String(pref.die).toLowerCase();
          chosenIdx = defender.gigs.findIndex(
            (g) => g.die.toLowerCase() === targetDie && (pref.value === undefined || g.value === pref.value) && isGigStealable(g)
          );
        }
      } else {
        const targetDie = String(pref).toLowerCase();
        chosenIdx = defender.gigs.findIndex(
          (g) => g.die.toLowerCase() === targetDie && isGigStealable(g)
        );
      }
    }

    // Si no se encontró el preferido o no quedan preferencias, escoger el elegible de mayor valor
    if (chosenIdx === -1) {
      for (let j = 0; j < defender.gigs.length; j++) {
        if (!isGigStealable(defender.gigs[j])) continue;
        if (chosenIdx === -1 || (defender.gigs[j].value || 0) > (defender.gigs[chosenIdx].value || 0)) {
          chosenIdx = j;
        }
      }
    }

    if (chosenIdx === -1) break;
    const [stolenDie] = defender.gigs.splice(chosenIdx, 1);
    stolenDie.stolenFrom = defenderKey;
    attacker.gigs.push(stolenDie);
    stolenDice.push(stolenDie);
  }

  const diceNames = stolenDice.map((d) => `${d.die.toUpperCase()} (Valor: ${d.value})`).join(', ');
  state.actionLog.unshift(
    `💎 [FASE 4: ROBO DE GIGS] ¡ASALTO EXITOSO! "${unit.name}" [Fuerza: ${unit.currentPower}] asalta los Gigs de ${defender.name} y ROBA ${countToSteal} Gig(s): ${diceNames}.`
  );

  // Trigger pasivo CP-033 Evelyn Parker // Beautiful Enigma:
  // "When a friendly CORPO or GANGER Unit steals 1 or more Gigs, ready 1 Eddie."
  if (stolenDice.length > 0) {
    const unitMeta = (String(unit.traits || '') + ' ' + String(unit.cardType || '') + ' ' + String(unit.faction || '')).toUpperCase();
    const isCorpoOrGanger = unitMeta.includes('CORPO') || unitMeta.includes('GANGER');
    if (isCorpoOrGanger) {
      const evelyns = (attacker.legends || []).filter(
        (l) => l.isFaceUp && !l.isRemovedFromGame && (String(l.id || '').toUpperCase() === 'CP-033' || (l.slug || '').includes('evelyn-parker'))
      );
      evelyns.forEach(() => {
        const spentEddie = (attacker.eddies || []).find((e) => e.isSpent);
        if (spentEddie) {
          spentEddie.isSpent = false;
          state.actionLog.unshift(
            `💋 [Evelyn Parker] ¡Habilidad Pasiva! "${unit.name}" (CORPO/GANGER) robó Gig(s): se endereza 1 Eddie.`
          );
        }
      });
    }
  }

  // Comprobar victoria inmediata en Overtime
  checkOvertimeInstantWin(state);

  // Disparadores al robar Gigs (CP-001 6th Street Recruits, CP-136 V // Roamer, CP-039 Gorilla Arms)
  if (stolenDice.length > 0 && !state.isGameOver) {
    executeOnGigsStolenTriggers(state, attackerPlayerKey, unit, stolenDice);
  }

  return { success: true, stolenCount: countToSteal, stolenDice };
}

/**
 * Envía una unidad derrotada al descarte (Trash) o al exilio (Removed from the game):
 * REGLA OFICIAL DE GO SOLO / LEYENDAS:
 * "If it leaves the field, remove it from the game."
 * Si una unidad tiene Go Solo o proviene de una Leyenda, al abandonar el campo queda eliminada de la partida.
 */
export function sendDefeatedUnitToGraveyardOrExile(playerState, unit, state = null, options = {}) {
  if (!unit || !playerState) return { intercepted: false };

  const jackieCheck = tryJackieMamaSaveReplacement(playerState, unit, state, options);
  if (jackieCheck?.intercepted) return jackieCheck;

  const equippedGears = Array.isArray(unit.gear) ? [...unit.gear] : [];
  unit.lastEquippedGear = equippedGears;
  unit.gear = [];

  const isGoSoloOrLegend = Boolean(unit.hasGoSolo || unit.isLegendUnit);

  if (isGoSoloOrLegend) {
    const legendId = unit.legendInstanceId || (unit.instanceId ? unit.instanceId.replace(/_unit$/, '') : null);
    if (legendId && playerState.legends) {
      const leg = playerState.legends.find((l) => l.instanceId === legendId);
      if (leg) {
        leg.isOnField = false;
        leg.isRemovedFromGame = true;
        leg.gear = [];
      }
    }

    if (!playerState.removedFromGame) playerState.removedFromGame = [];
    playerState.removedFromGame.push(unit);

    if (state && state.actionLog) {
      state.actionLog.unshift(
        `🚫 [GO SOLO / LEYENDA] "${unit.name}" abandona el campo de batalla y queda ELIMINADA DE LA PARTIDA (Remove from the game).`
      );
    }
  } else {
    if (!playerState.trash) playerState.trash = [];
    playerState.trash.push(unit);
  }

  // Los Gears equipados a la unidad derrotada van al Trash normalmente
  if (equippedGears.length > 0) {
    if (!playerState.trash) playerState.trash = [];
    equippedGears.forEach((g) => playerState.trash.push(g));
  }
  return { intercepted: false };
}

/**
 * Envía una unidad (o Leyenda en campo) al fondo del mazo según las reglas oficiales:
 * - Si es una Leyenda / Go Solo: la Leyenda queda ELIMINADA DE LA PARTIDA (Remove from the game),
 *   y sus Gears equipados van al FONDO DEL MAZO (como cartas independientes).
 * - Si es una Unidad normal: la Unidad va al FONDO DEL MAZO, y sus Gears equipados también van al FONDO DEL MAZO.
 */
export function sendUnitToBottomDeck(playerState, unit, state = null) {
  if (!unit || !playerState) return;
  if (!playerState.deck) playerState.deck = [];

  const equippedGears = Array.isArray(unit.gear) ? [...unit.gear] : [];
  unit.lastEquippedGear = equippedGears;
  unit.gear = [];

  const isGoSoloOrLegend = Boolean(unit.hasGoSolo || unit.isLegendUnit);

  if (isGoSoloOrLegend) {
    const legendId = unit.legendInstanceId || (unit.instanceId ? unit.instanceId.replace(/_unit$/, '') : null);
    if (legendId && playerState.legends) {
      const leg = playerState.legends.find((l) => l.instanceId === legendId);
      if (leg) {
        leg.isOnField = false;
        leg.isRemovedFromGame = true;
        leg.gear = [];
      }
    }

    if (!playerState.removedFromGame) playerState.removedFromGame = [];
    playerState.removedFromGame.push(unit);

    // Regla oficial: si la Leyenda equipada se envía al fondo del mazo, la Leyenda se remueve del juego y sus Gears van al fondo del mazo
    equippedGears.forEach((g) => playerState.deck.push(g));

    if (state && state.actionLog) {
      state.actionLog.unshift(
        `🚫 [GO SOLO / BOTTOM-DECK] "${unit.name}" queda ELIMINADA DE LA PARTIDA${
          equippedGears.length > 0
            ? ` y sus ${equippedGears.length} Gear(s) equipado(s) (${equippedGears.map((g) => g.name).join(', ')}) van al fondo del mazo.`
            : '.'
        }`
      );
    }
  } else {
    playerState.deck.push(unit);
    // Regla oficial: si la Unidad equipada va al fondo del mazo, sus Gears equipados también van al fondo del mazo
    equippedGears.forEach((g) => playerState.deck.push(g));

    if (state && state.actionLog) {
      state.actionLog.unshift(
        `🌊 [BOTTOM-DECK] "${unit.name}" fue enviada al fondo del mazo${
          equippedGears.length > 0
            ? ` junto con sus ${equippedGears.length} Gear(s) equipado(s) (${equippedGears.map((g) => g.name).join(', ')})`
            : ''
        }.`
      );
    }
  }
}

/**
 * Resuelve una pelea entre dos unidades según las reglas oficiales de combate:
 * - Poder mayor derrota a poder menor.
 * - EMPATE: "Both Units lose the fight and both are defeated. Defeated Units go to the trash."
 * - "A Unit with 0 power can't defeat anything."
 */
export function resolveFight(state, attPlayerKey, attUnit, defPlayerKey, defUnit) {
  const attacker = state[attPlayerKey];
  const defender = state[defPlayerKey];

  const attPower = attUnit.currentPower || 0;
  const defPower = defUnit.currentPower || 0;

  const isJohnnyUnit = (u) =>
    String(u?.id || '').toUpperCase() === 'CP-054' ||
    String(u?.name || '').toLowerCase().includes('never stop fighting');
  const isCorpoUnit = (u) =>
    /\bCORPO\b/i.test(`${u?.traits || ''} ${u?.cardType || ''}`);

  const johnnyAttBeatsCorpo = isJohnnyUnit(attUnit) && isCorpoUnit(defUnit);
  const johnnyDefBeatsCorpo = isJohnnyUnit(defUnit) && isCorpoUnit(attUnit);

  state.actionLog.unshift(
    `🥊 [FASE 3: COMBATE] "${attUnit.name}" [Fuerza: ${attPower}] vs "${defUnit.name}" [Fuerza: ${defPower}].`
  );

  let result = {
    success: true,
    attPower,
    defPower,
    attUnitName: attUnit.name,
    defUnitName: defUnit.name
  };

  if (johnnyAttBeatsCorpo || (!johnnyDefBeatsCorpo && attPower > defPower)) {
    // Atacante gana (por fuerza mayor o habilidad oficial de Johnny Silverhand CP-054 contra CORPO)
    const idx = defender.field.findIndex((u) => u.instanceId === defUnit.instanceId);
    if (idx !== -1) {
      if (defUnit.cannotBeDefeatedThisTurn) {
        state.actionLog.unshift(
          `🛡️ [INMUNIDAD EN COMBATE] "${defUnit.name}" no puede ser derrotada en combate este turno y sobrevive en el campo (${defPower} vs ${attPower}).`
        );
        executeCombatWinTrigger(state, attPlayerKey, attUnit, defUnit);
        executeCombatLossTrigger(state, defPlayerKey, defUnit, attUnit);
        result = {
          ...result,
          winnerKey: attPlayerKey,
          winnerUnit: attUnit,
          loserKey: defPlayerKey,
          loserUnit: defUnit,
          loserSurvivedByImmunity: true,
          isTie: false,
          johnnyAntiCorpoWin: johnnyAttBeatsCorpo
        };
      } else {
        const [defeated] = defender.field.splice(idx, 1);
        const defOutcome = sendDefeatedUnitToGraveyardOrExile(defender, defeated, state);
        if (!defOutcome?.intercepted) {
          if (johnnyAttBeatsCorpo) {
            state.actionLog.unshift(
              `🎸 [Johnny Silverhand // Never Stop Fighting] ¡Gana SIEMPRE contra unidades CORPO! Derrota automáticamente a "${defUnit.name}" (${attPower} vs ${defPower})${
                defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
              }.`
            );
          } else {
            state.actionLog.unshift(
              `💀 [FASE 3: DERROTA] "${defUnit.name}" tiene menor fuerza (${defPower} < ${attPower}) y es derrotada${
                defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
              }.`
            );
          }
        }
        executeCombatWinTrigger(state, attPlayerKey, attUnit, defeated);
        executeCombatLossTrigger(state, defPlayerKey, defeated, attUnit);
        if (!defOutcome?.intercepted) {
          executeUnitDefeatedTrigger(state, defPlayerKey, defeated);
        }
        result = {
          ...result,
          winnerKey: attPlayerKey,
          winnerUnit: attUnit,
          loserKey: defPlayerKey,
          loserUnit: defeated,
          isTie: false,
          johnnyAntiCorpoWin: johnnyAttBeatsCorpo
        };
      }
    }
  } else if (johnnyDefBeatsCorpo || defPower > attPower) {
    // Defensor gana (por fuerza mayor o habilidad oficial de Johnny Silverhand CP-054 contra CORPO)
    const idx = attacker.field.findIndex((u) => u.instanceId === attUnit.instanceId);
    if (idx !== -1) {
      if (attUnit.cannotBeDefeatedThisTurn) {
        state.actionLog.unshift(
          `🛡️ [INMUNIDAD EN COMBATE] "${attUnit.name}" no puede ser derrotada en combate este turno y sobrevive en el campo (${attPower} vs ${defPower}).`
        );
        executeCombatWinTrigger(state, defPlayerKey, defUnit, attUnit);
        executeCombatLossTrigger(state, attPlayerKey, attUnit, defUnit);
        result = {
          ...result,
          winnerKey: defPlayerKey,
          winnerUnit: defUnit,
          loserKey: attPlayerKey,
          loserUnit: attUnit,
          loserSurvivedByImmunity: true,
          isTie: false,
          johnnyAntiCorpoWin: johnnyDefBeatsCorpo
        };
      } else {
        const [defeated] = attacker.field.splice(idx, 1);
        const attOutcome = sendDefeatedUnitToGraveyardOrExile(attacker, defeated, state);
        if (!attOutcome?.intercepted) {
          if (johnnyDefBeatsCorpo) {
            state.actionLog.unshift(
              `🎸 [Johnny Silverhand // Never Stop Fighting] ¡Gana SIEMPRE contra unidades CORPO! Derrota automáticamente al atacante "${attUnit.name}" (${defPower} vs ${attPower})${
                defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
              }.`
            );
          } else {
            state.actionLog.unshift(
              `💥 [FASE 3: CONTRAATAQUE] "${attUnit.name}" tiene menor fuerza (${attPower} < ${defPower}) y es derrotada${
                defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
              }.`
            );
          }
        }
        executeCombatWinTrigger(state, defPlayerKey, defUnit, defeated);
        executeCombatLossTrigger(state, attPlayerKey, defeated, defUnit);
        if (!attOutcome?.intercepted) {
          executeUnitDefeatedTrigger(state, attPlayerKey, defeated);
        }
        result = {
          ...result,
          winnerKey: defPlayerKey,
          winnerUnit: defUnit,
          loserKey: attPlayerKey,
          loserUnit: defeated,
          isTie: false,
          johnnyAntiCorpoWin: johnnyDefBeatsCorpo
        };
      }
    }
  } else {
    // REGLA OFICIAL DE EMPATE: ¡Ambas unidades tienen la misma fuerza y son derrotadas (salvo inmunidad en combate)!
    if (attPower > 0 || defPower > 0) {
      const defIdx = defender.field.findIndex((u) => u.instanceId === defUnit.instanceId);
      let defeatedDef = null;
      let defTieOutcome = null;
      if (defIdx !== -1) {
        if (defUnit.cannotBeDefeatedThisTurn) {
          state.actionLog.unshift(
            `🛡️ [INMUNIDAD EN COMBATE] "${defUnit.name}" sobrevive al empate (${defPower} vs ${attPower}) gracias a su inmunidad.`
          );
        } else {
          [defeatedDef] = defender.field.splice(defIdx, 1);
          defTieOutcome = sendDefeatedUnitToGraveyardOrExile(defender, defeatedDef, state);
        }
      }
      const attIdx = attacker.field.findIndex((u) => u.instanceId === attUnit.instanceId);
      let defeatedAtt = null;
      let attTieOutcome = null;
      if (attIdx !== -1) {
        if (attUnit.cannotBeDefeatedThisTurn) {
          state.actionLog.unshift(
            `🛡️ [INMUNIDAD EN COMBATE] "${attUnit.name}" sobrevive al empate (${attPower} vs ${defPower}) gracias a su inmunidad.`
          );
        } else {
          [defeatedAtt] = attacker.field.splice(attIdx, 1);
          attTieOutcome = sendDefeatedUnitToGraveyardOrExile(attacker, defeatedAtt, state);
        }
      }
      if (defeatedDef && !defTieOutcome?.intercepted) executeUnitDefeatedTrigger(state, defPlayerKey, defeatedDef);
      if (defeatedAtt && !attTieOutcome?.intercepted) executeUnitDefeatedTrigger(state, attPlayerKey, defeatedAtt);
      if (defeatedDef && defeatedAtt) {
        state.actionLog.unshift(
          `☠️ [FASE 3: EMPATE LETAL] (${attPower} vs ${defPower}): Ambas unidades tienen la misma fuerza: ¡AMBAS SON DERROTADAS!`
        );
      }
      result = {
        ...result,
        isTie: true,
        winnerKey: null,
        defeatedUnits: [defeatedDef, defeatedAtt].filter(Boolean)
      };
    } else {
      state.actionLog.unshift(
        `⚠️ [FASE 3: COMBATE] Ambas unidades tienen 0 de poder y no pueden derrotar nada.`
      );
      result = {
        ...result,
        isZeroTie: true
      };
    }
  }

  return result;
}

/**
 * Pelea directa de una unidad contra una unidad enemiga girada (Spent)
 */
export function fightRivalUnit(
  state,
  attackerPlayerKey,
  attackerUnitId,
  targetUnitId,
  blockerUnitId = null,
  blockerAlreadyCommitted = false
) {
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];

  const attUnit = attacker.field.find((u) => u.instanceId === attackerUnitId);
  const defUnit = defender.field.find((u) => u.instanceId === targetUnitId);

  if (!attUnit || !defUnit) return { success: false, reason: 'Unidades no encontradas.' };
  const isMidAttack = Boolean(
    attUnit.hasTriggeredAttackThisDeclaration ||
    (state.pendingReaction && state.pendingReaction.attackerUnitId === attackerUnitId)
  );
  if (!isMidAttack) {
    if (attUnit.isSpent) {
      return { success: false, reason: 'Tu unidad está girada.' };
    }
    if (attUnit.isLagging && !attUnit.canAttackSpentUnitsTurnPlayed) return { success: false, reason: 'Tu unidad tiene Lag.' };
    if (!canUnitAttack(attUnit, attacker, state, 'UNIT')) {
      const restriction = getUnitAttackRestriction(attUnit, attacker, state, 'UNIT') || 'Esta unidad no puede atacar a unidades rivales.';
      return { success: false, reason: restriction };
    }
  }
  if (!defUnit.isSpent && !blockerUnitId && !attUnit.canAttackReadyUnits) {
    return { success: false, reason: 'Solo puedes atacar a unidades rivales giradas (Spent). Las unidades enderezadas no pueden ser atacadas.' };
  }

  const wasAttSpent = Boolean(attUnit.isSpent);
  attUnit.isSpent = true;
  delete attUnit.mustAttackNextTurn;
  if (!isMidAttack && !wasAttSpent) {
    executeCardSpentTriggers(state, attackerPlayerKey, attUnit);
  }

  // FASE 1: Disparar habilidad ATTACK antes de la reacción del rival
  if (!attUnit.hasTriggeredAttackThisDeclaration) {
    attUnit.hasTriggeredAttackThisDeclaration = true;
    executeUnitAttackTrigger(state, attackerPlayerKey, attUnit);
  }

  // Intercepción por Blocker
  if (blockerUnitId && canUnitBeBlocked(attUnit, attackerPlayerKey, state)) {
    const blocker = defender.field.find((u) => u.instanceId === blockerUnitId);
    if (blocker && (blockerAlreadyCommitted || (hasKeyword(blocker, 'Blocker') && !blocker.cannotBlock && !blocker.cannotBlockThisTurn))) {
      if (!blockerAlreadyCommitted) {
        blocker.isSpent = true;
        state.actionLog.unshift(
          `🛡️ [FASE 2: REACCIÓN] ¡BLOCKER! "${blocker.name}" se interpone para proteger a "${defUnit.name}".`
        );
        executeCardSpentTriggers(state, defenderKey, blocker);
        executeBlockerUsedTrigger(state, defenderKey, blocker);
      }
      const fightRes = resolveFight(state, attackerPlayerKey, attUnit, defenderKey, blocker);
      delete attUnit.hasTriggeredAttackThisDeclaration;
      return fightRes;
    }
  }

  const fightRes = resolveFight(state, attackerPlayerKey, attUnit, defenderKey, defUnit);
  delete attUnit.hasTriggeredAttackThisDeclaration;
  return fightRes;
}

/**
 * Retorna los dados disponibles para rodar desde el Fixer:
 * REGLA OFICIAL: Puedes tirar cualquier dado, excepto el D20, que siempre se tira el último.
 */
export function getEligibleFixerDice(fixerDice = []) {
  if (fixerDice.length <= 1) return [...fixerDice];
  return fixerDice.filter((d) => d.toLowerCase() !== 'd20');
}

/**
 * Extrae y rueda un dado elegido del Fixer hacia la zona de Gigs.
 */
export function rollInGig(state, playerKey, dieType, specificRollValue = null) {
  const p = state[playerKey];
  const normDie = dieType.toLowerCase();

  const idx = p.fixerDice.findIndex((d) => d.toLowerCase() === normDie);
  if (idx === -1) {
    return { success: false, reason: `El dado ${normDie.toUpperCase()} no está disponible en el Fixer.` };
  }

  // Validación oficial: D20 siempre el último
  if (p.fixerDice.length > 1 && normDie === 'd20') {
    return { success: false, reason: 'El D20 no se puede elegir hasta que sea el último dado restante en el Fixer.' };
  }

  // Extraer el dado del Fixer
  p.fixerDice.splice(idx, 1);
  const rollValue = specificRollValue !== null ? specificRollValue : rollDie(normDie);

  const gigEntry = {
    die: normDie,
    value: rollValue,
    rolledAtTurn: state.turnNumber,
    rolledBy: playerKey,
    stolenFrom: null,
    id: `${playerKey}-gig-${normDie}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  };
  p.gigs.push(gigEntry);

  state.pendingGigRoll = false;
  state.phase = 'MAIN';

  state.actionLog.unshift(
    `🎲 ${p.name} lanza su dado ${normDie.toUpperCase()} del Fixer y obtiene un ${rollValue} (Credibilidad en la Calle: ⭐ ${calculateStreetCred(p.gigs)}).`
  );

  // Trigger pasivo CP-058 Kerry Eurodyne // Axe, Attitude, Audience (repetir tirada 1 vez + robar en mín/máx)
  executeKerryGigRollTrigger(state, playerKey, p.gigs.length - 1, false);

  return { success: true, die: normDie, value: rollValue, gigEntry };
}

/**
 * Ejecuta los pasos obligatorios de la FASE DE INICIO (Start Phase) de un jugador:
 * 1. Comprobar victoria (7 o más dados de Gig).
 * 2. Efectos de inicio de turno.
 * 3. Enderezar (Ready) cartas de Leyendas, Campo y Eddies (respetando penalización turno 1).
 * 4. Robar 1 carta del mazo (Derrota si no puede robar).
 * 5. Roll in a Gig:
 *    - Para el Jugador: activa la selección interactiva de dados (D20 reservado al final).
 *    - Para el Bot: elige un dado elegible y lo rueda automáticamente.
 */
export function executeStartPhase(state, playerKey) {
  delete state.pendingStartPhase;
  const p = state[playerKey];

  state.actionLog.unshift(
    `// ==========================================`,
    `// INICIO DE TURNO ${state.turnNumber} // ${p.name.toUpperCase()}`,
    `// ==========================================`
  );

  // 1. COMPROBAR VICTORIA AL INICIO DEL TURNO (7+ Gigs) o muerte súbita si ya estamos en Overtime
  if (checkWinCondition(state, playerKey) || checkOvertimeInstantWin(state)) {
    return state;
  }

  // 2. FASE DE PREPARACIÓN (READY STEP)
  p.eddies.forEach((e) => (e.isSpent = false));
  p.floatingEddies = 0; // Reiniciar reserva de Eddies girados al inicio del turno

  // Enderezar Leyendas (solo las que no estén combatiendo en el campo de batalla ni eliminadas):
  if (p.legendsDoNotReadyTurn1) {
    // En Turno 1 del Jugador 1: las dos de la izquierda no se enderezan
    if (p.legends[2] && !p.legends[2].isOnField && !p.legends[2].isRemovedFromGame) {
      p.legends[2].isSpent = false;
    }
    p.legendsDoNotReadyTurn1 = false; // Se libera para su próximo turno
    state.actionLog.unshift(
      `🔒 Penalización de Turno 1: Tus 2 leyendas izquierdas permanecen giradas en este turno.`
    );
  } else {
    p.legends.forEach((l) => {
      if (!l.isOnField && !l.isRemovedFromGame) {
        l.isSpent = false;
      }
    });
  }

  // Enderezar Unidades y limpiar Lag (respetando Pacifica Netrunner: cannotReadyUntilNextTurn)
  p.field.forEach((u) => {
    if (u.cannotReadyUntilNextTurn) {
      delete u.cannotReadyUntilNextTurn;
      state.actionLog.unshift(`💻 "${u.name}" no se endereza en esta Fase de Inicio (efecto de bloqueo de enderezado).`);
    } else {
      u.isSpent = false;
    }
    u.isLagging = false;
    delete u.canAttackSpentUnitsTurnPlayed;
    delete u.usedGorillaArmsThisTurn;
    delete u.usedYorinobuArasakaDrawThisTurn;
    // CP-109 Royce // Psycho on the Edge: activa +2 fuerza por cada Gear equipado al iniciar tu turno
    syncRoyceTurnPassiveBonus(u, true);
  });

  // Expirar efectos "no puede atacar hasta tu próximo turno" (Chrome Reverie / Nocturne Op55N1)
  // en ambos bandos cuando llega el próximo turno del lanzador (cannotAttackUntilTurn <= turnNumber)
  [state.player, state.bot].forEach((side) => {
    (side?.field || []).forEach((u) => {
      const expiredByTurn =
        typeof u.cannotAttackUntilTurn === 'number' && state.turnNumber >= u.cannotAttackUntilTurn;
      const expiredByLegacyFlag =
        u.cannotAttackUntilNextTurn &&
        typeof u.cannotAttackUntilTurn !== 'number' &&
        (u.frozenByPlayerKey
          ? u.frozenByPlayerKey === playerKey
          : !u.frozenAtTurn || state.turnNumber >= u.frozenAtTurn + 2);
      if (expiredByTurn || expiredByLegacyFlag) {
        delete u.cannotAttackUntilNextTurn;
        delete u.cannotAttackUntilTurn;
        delete u.frozenAtTurn;
        delete u.frozenByPlayerKey;
      }
    });
  });

  p.hasSoldThisTurn = false;
  p.hasCalledLegendThisTurn = false;
  p.programsPlayedThisTurn = 0;
  delete p.altCunninghamProgramDiscount;
  delete p.chromeFangProtectionActive;
  delete p.westbrookProtectionActive;
  delete p.usedViktorCyberwareDiscountThisTurn;
  delete p.usedJackiePourOneOutThisTurn;

  // 3. ROBO DE CARTA (DRAW 1 CARD)
  if (p.deck.length > 0) {
    const drawn = p.deck.shift();
    if (playerKey === 'player') {
      drawn.isJustDrawn = true;
    }
    p.hand.push(drawn);
    state.actionLog.unshift(
      `📥 ${p.name} roba 1 carta de su mazo (Mazo: ${p.deck.length} cartas restantes).`
    );
  } else {
    // Deck out loss oficial
    state.isGameOver = true;
    state.winner = playerKey === 'player' ? 'bot' : 'player';
    state.actionLog.unshift(
      `💀 DECK OUT: ${p.name} no puede robar cartas de su mazo y pierde la partida.`
    );
    return state;
  }

  // Disparar habilidades de inicio de turno (Start Phase Triggers)
  executeStartOfTurnTriggers(state, playerKey);

  // 4. ROLL IN A GIG (Selección y lanzamiento de dado del Fixer)
  // Regla oficial de OVERTIME:
  // El Overtime comienza DESPUÉS de que ambos jugadores hayan iniciado 2 turnos consecutivos
  // con su Zona del Fixer vacía (típicamente al terminar el Turno 7 de cada jugador, entrando al Turno 8 / turno 15).
  const otherKey = playerKey === 'player' ? 'bot' : 'player';
  const bothFixersEmptyAtStart =
    (p.fixerDice || []).length === 0 && (state[otherKey]?.fixerDice || []).length === 0;

  if (p.fixerDice.length > 0) {
    state.consecutiveEmptyFixerTurns = 0;
    if (playerKey === 'player') {
      // El jugador elegirá su dado interactivamente
      state.pendingGigRoll = true;
      state.phase = 'START_GIG_SELECT';
      state.actionLog.unshift(
        `🎲 ${p.name}: Elige un dado de tu Fixer para rodarlo a la zona de Gigs (el D20 será el último).`
      );
    } else {
      // El bot escoge un dado elegible (cualquiera excepto D20 mientras queden otros)
      const eligible = getEligibleFixerDice(p.fixerDice);
      const chosen = eligible[0] || p.fixerDice[0];
      rollInGig(state, 'bot', chosen);
    }
  } else {
    state.pendingGigRoll = false;
    state.phase = 'MAIN';

    if (bothFixersEmptyAtStart && !state.overtime) {
      state.consecutiveEmptyFixerTurns = (state.consecutiveEmptyFixerTurns || 0) + 1;
      if (state.consecutiveEmptyFixerTurns === 1) {
        state.actionLog.unshift(
          `⏳ [OVERTIME 1/2] Ambos Fixers están vacíos al inicio del turno. Al finalizar el siguiente turno rival comenzará el Overtime.`
        );
      } else if (state.consecutiveEmptyFixerTurns >= 2) {
        state.actionLog.unshift(
          `⏳ [OVERTIME 2/2] Último turno regular con Fixers vacíos: al terminar este turno comenzará el OVERTIME (7+ Gigs gana al instante).`
        );
      }
    } else if (!bothFixersEmptyAtStart) {
      state.consecutiveEmptyFixerTurns = 0;
    }
  }

  return state;
}

/**
 * Finaliza el turno actual y pasa el control al siguiente jugador ejecutando su Start Phase.
 */
export function passTurn(state, options = {}) {
  if (state.isGameOver) return state;

  // Disparar habilidades de fin de turno (End of Turn Triggers)
  executeEndOfTurnTriggers(state, state.activePlayer);

  // Limpiar mustAttackNextTurn de las unidades del jugador que acaba de terminar su turno
  (state[state.activePlayer]?.field || []).forEach((u) => {
    delete u.mustAttackNextTurn;
  });

  // Limpiar TODOS los efectos y contadores "hasta el final del turno" ("this turn" / "each turn") en ambos jugadores
  [state.player, state.bot].forEach((side) => {
    if (!side) return;
    side.hasCalledLegendThisTurn = false;
    side.hasSoldThisTurn = false;
    side.programsPlayedThisTurn = 0;
    side.floatingEddies = 0;
    delete side.altCunninghamProgramDiscount;
    delete side.chromeFangProtectionActive;
    delete side.westbrookProtectionActive;
    delete side.usedViktorCyberwareDiscountThisTurn;
    delete side.usedJackiePourOneOutThisTurn;
    (side.field || []).forEach((u) => {
      // Restaurar fuerza base + bonos de Gear (elimina +X / -X power "this turn" sin deriva)
      const basePower =
        typeof u.parsedPower === 'number' && !Number.isNaN(u.parsedPower)
          ? u.parsedPower
          : parseCardPower(u.power || u.powerVal || 0);
      const gearBonus = (u.gear || []).reduce(
        (sum, g) => sum + (g.powerBonus || g.parsedPower || parseCardPower(g.power || g.powerVal || 0) || 0),
        0
      );
      u.currentPower = Math.max(0, basePower + gearBonus);
      delete u._royceTurnGearBonus;
      delete u.tempPowerMod;
      delete u.cannotBeDefeatedThisTurn;
      delete u.hasReadiedThisTurn;
      delete u.usedYorinobuArasakaDrawThisTurn;
      delete u.stolenReduction;
      delete u.canAttackReadyUnits;
      if (u.hasTemporaryAdrenalineThisTurn) {
        delete u.hasTemporaryAdrenalineThisTurn;
        delete u.hasAdrenaline;
      }
      if (u.isTemporaryBlockerThisTurn) {
        delete u.isTemporaryBlockerThisTurn;
        if (Array.isArray(u.keywords)) {
          u.keywords = u.keywords.filter((k) => String(k).toLowerCase() !== 'blocker');
        }
      }
    });
  });

  const nextPlayerKey = state.activePlayer === 'player' ? 'bot' : 'player';
  state.activePlayer = nextPlayerKey;
  state.turnNumber += 1;

  // Regla oficial de OVERTIME: tras completarse el 2º turno consecutivo iniciado con ambos Fixers vacíos
  // (normalmente al terminar el Turno 7 del segundo jugador), el Overtime entra en vigor de inmediato.
  if (!state.overtime && (state.consecutiveEmptyFixerTurns || 0) >= 2) {
    state.overtime = true;
    state.actionLog.unshift(
      `⚡ ¡OVERTIME ACTIVADO! Ambos jugadores completaron 2 turnos consecutivos iniciando con el Fixer vacío. Desde ahora, controlar 7 o más Gigs en cualquier instante gana la partida al acto.`
    );
    if (checkOvertimeInstantWin(state)) {
      return state;
    }
  }

  if (options && options.deferStartPhase) {
    state.pendingStartPhase = true;
    return state;
  }

  return executeStartPhase(state, nextPlayerKey);
}

/**
 * Realiza Mulligan de la mano inicial:
 * Baraja las 6 cartas iniciales de vuelta al mazo y roba 6 cartas nuevas.
 * Luego ejecuta la Start Phase del Turno 1 para el jugador 1.
 */
export function mulliganHand(state, playerKey = 'player') {
  const p = state[playerKey];
  p.deck = shuffleDeck([...p.deck, ...p.hand]);
  p.hand = p.deck.splice(0, 6);
  state.mulliganDecided = true;
  state.phase = 'MAIN';

  state.actionLog.unshift(
    `🔄 ${p.name} realiza MULLIGAN: baraja su mano y roba 6 cartas nuevas.`
  );

  // Ejecutar Start Phase del jugador inicial real (puede ser 'player' o 'bot' según el D20)
  return executeStartPhase(state, state.activePlayer || playerKey);
}

/**
 * Mantiene la mano inicial (KEEP) y ejecuta la Start Phase del Turno 1.
 */
export function keepHand(state, playerKey = 'player') {
  const p = state[playerKey];
  state.mulliganDecided = true;
  state.phase = 'MAIN';

  state.actionLog.unshift(
    `✅ ${p.name} decide MANTENER (Keep) su mano inicial de 6 cartas.`
  );

  // Ejecutar Start Phase del jugador inicial real (puede ser 'player' o 'bot' según el D20)
  return executeStartPhase(state, state.activePlayer || playerKey);
}
