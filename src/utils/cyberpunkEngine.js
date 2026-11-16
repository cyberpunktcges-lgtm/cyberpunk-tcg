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
  executeEndOfTurnTriggers
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
 * Lanza un dado poliédrico
 */
export function rollDie(dieType) {
  const config = DICE_CONFIG[dieType] || DICE_CONFIG.d6;
  return Math.floor(Math.random() * config.max) + 1;
}

/**
 * Comprueba si una carta tiene una palabra clave oficial (Blocker, Adrenaline, Go Solo, Quick, etc.)
 */
export function hasKeyword(card, keyword) {
  if (!card) return false;
  const kw = (card.keywords || '').toLowerCase();
  const target = keyword.toLowerCase();
  if (kw.includes(target)) return true;
  const traits = (card.traits || '').toLowerCase();
  if (traits.includes(target)) return true;
  const text = (card.rules || card.text || card.effect || '').toLowerCase();
  return text.includes(target);
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
  if (typeof powerStr === 'number') return powerStr;
  if (!powerStr) return 0;
  const match = String(powerStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Baraja una lista de cartas (algoritmo Fisher-Yates)
 */
export function shuffleDeck(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
export function createInitialGameState(playerDeckInput, botDeckInput, allCards = []) {
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
          ...found,
          ...c,
          cost: found.cost || c.cost,
          power: found.power || c.power,
          officialType: found.officialType || c.officialType,
          keywords: found.keywords || c.keywords,
          image: found.image || c.image
        }
      : c;

    return {
      ...merged,
      instanceId: `${prefix}-c-${idx}-${Date.now()}`,
      parsedCost: parseCardCost(merged.cost),
      parsedPower: parseCardPower(merged.power)
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

  // 1. Preparar mazo y leyendas del jugador
  const playerLegends = (playerDeckInput.legends || []).slice(0, 3).map((l, idx) =>
    enrichLegend(l, 'p', idx, idx < 2)
  );

  // Expandir mazo del jugador por qty
  const rawPlayerCards = [];
  (playerDeckInput.deckList || playerDeckInput.cards || []).forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawPlayerCards.push(enrichCard(c, 'p', rawPlayerCards.length));
    }
  });
  const shuffledPlayerDeck = shuffleDeck(rawPlayerCards);

  // 2. Preparar mazo y leyendas del Bot (jugador 2: no sufre penalización de leyendas)
  const botLegends = (botDeckInput.legends || []).slice(0, 3).map((l, idx) =>
    enrichLegend(l, 'b', idx, false)
  );

  const rawBotCards = [];
  (botDeckInput.deckList || botDeckInput.cards || []).forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawBotCards.push(enrichCard(c, 'b', rawBotCards.length));
    }
  });
  const shuffledBotDeck = shuffleDeck(rawBotCards);

  // REGLA OFICIAL: Mano inicial de 6 CARTAS para ambos jugadores
  const playerHand = shuffledPlayerDeck.splice(0, 6);
  const botHand = shuffledBotDeck.splice(0, 6);

  const initialLog = [
    '// SISTEMA DE COMBATE NETWATCH INICIALIZADO',
    '// REGLAMENTO OFICIAL NIGHT CITY (SET 01)',
    'Partida iniciada: Jugador 1 (Tú) vs Jugador 2 (Bot).',
    'Penalización de Turno 1: Tus 2 leyendas de la izquierda empiezan giradas y no se enderezan en este primer turno.',
    'Ambos jugadores tienen 6 dados en el Fixer (D4 hasta D20) y 6 cartas en mano.',
    'Decide si conservar tu mano o realizar tu único Mulligan de 6 cartas.'
  ];

  const state = {
    turnNumber: 1,
    activePlayer: 'player', // 'player' | 'bot'
    phase: 'START', // 'START' | 'MAIN' | 'END'
    isGameOver: false,
    winner: null,
    overtime: false,
    combatEvent: null, // Si hay un ataque o evento en curso
    mulliganDecided: false, // Control de fase inicial de Keep / Mulligan
    actionLog: initialLog,

    player: {
      id: 'player',
      name: 'Netrunner (Tú)',
      deck: shuffledPlayerDeck,
      hand: playerHand,
      field: [], // Unidades en juego
      trash: [], // Cementerio
      legends: playerLegends, // 3 slots de leyendas
      legendsDoNotReadyTurn1: true, // Penalización oficial del primer jugador
      eddies: [], // Cartas boca abajo que dan 1 €$ cada una
      floatingEddies: 0, // Eddies actualmente girados listos para gastar
      fixerDice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
      gigs: [], // Empieza vacío hasta la fase de inicio
      hasSoldThisTurn: false,
      hasCalledLegendThisTurn: false
    },

    bot: {
      id: 'bot',
      name: 'AI Netrunner (Bot)',
      deck: shuffledBotDeck,
      hand: botHand,
      field: [],
      trash: [],
      legends: botLegends,
      legendsDoNotReadyTurn1: false,
      eddies: [],
      floatingEddies: 0,
      fixerDice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
      gigs: [],
      hasSoldThisTurn: false,
      hasCalledLegendThisTurn: false
    }
  };

  return state;
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
  const readyLegends = (playerState.legends || []).filter((l) => !l.isSpent).length;
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
 * Comprueba las condiciones de victoria oficiales:
 * 1. Controlar 7 o más dados de Gig al inicio del turno (Start Phase) o en Overtime.
 * 2. Quedarse sin cartas en el mazo cuando es obligatorio robar (Deck out).
 */
export function checkWinCondition(state, targetPlayerKey) {
  const p = state[targetPlayerKey];

  // Victoria por 7 Gigs
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
    // Intentar enderezar (cancelar)
    if ((p.floatingEddies || 0) > 0) {
      ed.isSpent = false;
      p.floatingEddies = Math.max(0, p.floatingEddies - 1);
      (state.actionLog = state.actionLog || []).unshift(
        `💶 ${p.name} endereza 1 carta en su Zona de Eddies (-1 €$). Total listos: ${p.floatingEddies} €$.`
      );
      return { success: true, isSpent: false, floatingEddies: p.floatingEddies };
    } else {
      return {
        success: false,
        reason: 'Esta carta de Eddies ya ha sido consumida este turno para pagar cartas.'
      };
    }
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

  if (!leg.isSpent) {
    // Girar leyenda para obtener 1 €$
    leg.isSpent = true;
    p.floatingEddies = (p.floatingEddies || 0) + 1;
    (state.actionLog = state.actionLog || []).unshift(
      `👑 ${p.name} gira a su Leyenda "${leg.name}" (+1 €$). Total listos: ${p.floatingEddies} €$.`
    );
    return { success: true, isSpent: true, floatingEddies: p.floatingEddies };
  } else {
    // Intentar enderezar (cancelar)
    if ((p.floatingEddies || 0) > 0) {
      leg.isSpent = false;
      p.floatingEddies = Math.max(0, p.floatingEddies - 1);
      (state.actionLog = state.actionLog || []).unshift(
        `👑 ${p.name} endereza a su Leyenda "${leg.name}" (-1 €$). Total listos: ${p.floatingEddies} €$.`
      );
      return { success: true, isSpent: false, floatingEddies: p.floatingEddies };
    } else {
      return {
        success: false,
        reason: 'Esta Leyenda ya ha sido consumida este turno para pagar cartas.'
      };
    }
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
  const cost = card.parsedCost || parseCardCost(card.cost);
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

  // El programa va directo al descarte (Trash)
  if (!p.trash) p.trash = [];
  p.trash.push(card);

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
  const cost = card.parsedCost || parseCardCost(card.cost);
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

  if (hasKeyword(card, 'Adrenaline')) {
    target.hasAdrenaline = true;
    target.isLagging = false;
  }

  const bonusText = powerBonus > 0 ? ` (+${powerBonus} Fuerza)` : '';
  (state.actionLog = state.actionLog || []).unshift(
    `🔧 ${p.name} paga ${cost} €$ y equipa el Gear "${card.name}"${bonusText} a "${target.name}".`
  );

  return { success: true, type: 'GEAR', gear: card, target, targetType };
}

/**
 * Juega una carta de Unidad desde la mano al campo:
 * - Requiere pagar su coste en Eddies (mínimo 1 €$).
 * - Entra con LAG excepto si posee la palabra clave ADRENALINE.
 */
export function playUnitCard(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  const cardIdx = (p.hand || []).findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Carta no encontrada en mano.' };

  const card = p.hand[cardIdx];
  const cost = card.parsedCost || parseCardCost(card.cost);
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
  if (unit.isSpent && (!state.pendingReaction || state.pendingReaction.attackerUnitId !== attackerUnitId)) {
    return { success: false, reason: 'La unidad ya está girada (Spent).' };
  }
  if (unit.isLagging) return { success: false, reason: 'La unidad tiene Lag (no puede atacar este turno).' };
  if (defender.gigs.length === 0) return { success: false, reason: 'El rival no tiene Gigs para robar.' };

  // Girar la unidad atacante
  unit.isSpent = true;

  // FASE 1: Disparar habilidades de ataque (ej: Sketchy Ripper, El Sombrerón) antes de la reacción del rival
  if (!unit.hasTriggeredAttackThisDeclaration) {
    unit.hasTriggeredAttackThisDeclaration = true;
    executeUnitAttackTrigger(state, attackerPlayerKey, unit);
  }

  // FASE 2: Intercepción por BLOCKER (si fue asignado en la Fase de Reacción):
  if (blockerUnitId) {
    const blocker = defender.field.find((u) => u.instanceId === blockerUnitId);
    if (blocker && hasKeyword(blocker, 'Blocker')) {
      blocker.isSpent = true;
      state.actionLog.unshift(
        `🛡️ [FASE 2: REACCIÓN] ¡BLOCKER! ${defender.name} gira a "${blocker.name}" para interceptar el asalto a sus Gigs. ¡El combate se convierte en lucha contra el bloqueador y NO se roba ningún Gig!`
      );
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

  // Se roban hasta gigsToSteal dados (priorizando dados elegidos por el usuario)
  const countToSteal = Math.min(gigsToSteal, defender.gigs.length);
  const stolenDice = [];
  const prefs = [...(preferredDice || [])];

  for (let i = 0; i < countToSteal; i++) {
    let chosenIdx = -1;

    // Si el usuario eligió un dado específico (ej: 'd20'), buscarlo en los gigs del defensor
    if (prefs.length > 0) {
      const targetDie = String(prefs.shift()).toLowerCase();
      chosenIdx = defender.gigs.findIndex(
        (g) => g.die.toLowerCase() === targetDie
      );
    }

    // Si no se encontró el preferido o no quedan preferencias, escoger el de mayor valor
    if (chosenIdx === -1) {
      chosenIdx = 0;
      for (let j = 1; j < defender.gigs.length; j++) {
        if ((defender.gigs[j].value || 0) > (defender.gigs[chosenIdx].value || 0)) {
          chosenIdx = j;
        }
      }
    }

    const [stolenDie] = defender.gigs.splice(chosenIdx, 1);
    stolenDie.stolenFrom = defenderKey;
    attacker.gigs.push(stolenDie);
    stolenDice.push(stolenDie);
  }

  const diceNames = stolenDice.map((d) => `${d.die.toUpperCase()} (Valor: ${d.value})`).join(', ');
  state.actionLog.unshift(
    `💎 [FASE 4: ROBO DE GIGS] ¡ASALTO EXITOSO! "${unit.name}" [Fuerza: ${unit.currentPower}] asalta los Gigs de ${defender.name} y ROBA ${countToSteal} Gig(s): ${diceNames}.`
  );

  // Comprobar victoria inmediata en Overtime
  if (state.overtime && attacker.gigs.length >= 7) {
    state.isGameOver = true;
    state.winner = attackerPlayerKey;
    state.actionLog.unshift(`🏆 ¡OVERTIME WIN! ${attacker.name} alcanza 7 Gigs y gana la partida.`);
  }

  return { success: true, stolenCount: countToSteal, stolenDice };
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

  state.actionLog.unshift(
    `🥊 [FASE 3: COMBATE] "${attUnit.name}" [Fuerza: ${attPower}] vs "${defUnit.name}" [Fuerza: ${defPower}].`
  );

  if (attPower > defPower) {
    // Atacante gana
    const idx = defender.field.findIndex((u) => u.instanceId === defUnit.instanceId);
    if (idx !== -1) {
      const [defeated] = defender.field.splice(idx, 1);
      defender.trash.push(defeated);
      if (defeated.gear && defeated.gear.length > 0) {
        defeated.gear.forEach((g) => defender.trash.push(g));
      }
      state.actionLog.unshift(
        `💀 [FASE 3: DERROTA] "${defUnit.name}" de ${defender.name} es DERROTADA y enviada a la Basura${
          defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
        }.`
      );
      // Disparar habilidades de victoria y derrota (Johnny Silverhand, Satori, Safety Override)
      executeCombatWinTrigger(state, attPlayerKey, attUnit, defeated);
      executeCombatLossTrigger(state, defPlayerKey, defeated, attUnit);
      executeUnitDefeatedTrigger(state, defPlayerKey, defeated);
    }
  } else if (defPower > attPower) {
    // Defensor gana (contraataque)
    if (defPower > 0) {
      const idx = attacker.field.findIndex((u) => u.instanceId === attUnit.instanceId);
      if (idx !== -1) {
        const [defeated] = attacker.field.splice(idx, 1);
        attacker.trash.push(defeated);
        if (defeated.gear && defeated.gear.length > 0) {
          defeated.gear.forEach((g) => attacker.trash.push(g));
        }
        state.actionLog.unshift(
          `💥 [FASE 3: CONTRAATAQUE] "${attUnit.name}" fue superada en poder y enviada a la Basura${
            defeated.gear?.length ? ` junto con ${defeated.gear.length} Gear(s)` : ''
          }.`
        );
        // Disparar habilidades de victoria y derrota (Johnny Silverhand, Satori, Safety Override)
        executeCombatWinTrigger(state, defPlayerKey, defUnit, defeated);
        executeCombatLossTrigger(state, attPlayerKey, defeated, defUnit);
        executeUnitDefeatedTrigger(state, attPlayerKey, defeated);
      }
    }
  } else {
    // REGLA OFICIAL DE EMPATE: Ambas unidades son derrotadas y van a la basura!
    if (attPower > 0 && defPower > 0) {
      const defIdx = defender.field.findIndex((u) => u.instanceId === defUnit.instanceId);
      let defeatedDef = null;
      if (defIdx !== -1) {
        [defeatedDef] = defender.field.splice(defIdx, 1);
        defender.trash.push(defeatedDef);
        if (defeatedDef.gear && defeatedDef.gear.length > 0) {
          defeatedDef.gear.forEach((g) => defender.trash.push(g));
        }
      }
      const attIdx = attacker.field.findIndex((u) => u.instanceId === attUnit.instanceId);
      let defeatedAtt = null;
      if (attIdx !== -1) {
        [defeatedAtt] = attacker.field.splice(attIdx, 1);
        attacker.trash.push(defeatedAtt);
        if (defeatedAtt.gear && defeatedAtt.gear.length > 0) {
          defeatedAtt.gear.forEach((g) => attacker.trash.push(g));
        }
      }
      if (defeatedDef) executeUnitDefeatedTrigger(state, defPlayerKey, defeatedDef);
      if (defeatedAtt) executeUnitDefeatedTrigger(state, attPlayerKey, defeatedAtt);
      state.actionLog.unshift(
        `☠️ [FASE 3: EMPATE LETAL] (${attPower} vs ${defPower}): Ambas unidades pierden el combate y van a la Basura.`
      );
    } else {
      state.actionLog.unshift(
        `⚠️ [FASE 3: COMBATE] Las unidades tienen 0 de poder y no pueden derrotar nada.`
      );
    }
  }

  return { success: true };
}

/**
 * Pelea directa de una unidad contra una unidad enemiga girada (Spent)
 */
export function fightRivalUnit(state, attackerPlayerKey, attackerUnitId, targetUnitId, blockerUnitId = null) {
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];

  const attUnit = attacker.field.find((u) => u.instanceId === attackerUnitId);
  const defUnit = defender.field.find((u) => u.instanceId === targetUnitId);

  if (!attUnit || !defUnit) return { success: false, reason: 'Unidades no encontradas.' };
  if (attUnit.isSpent && (!state.pendingReaction || state.pendingReaction.attackerUnitId !== attackerUnitId)) {
    return { success: false, reason: 'Tu unidad está girada.' };
  }
  if (attUnit.isLagging) return { success: false, reason: 'Tu unidad tiene Lag.' };
  if (!defUnit.isSpent && !blockerUnitId && !attUnit.canAttackReadyUnits) {
    return { success: false, reason: 'Solo puedes atacar a unidades rivales giradas (Spent). Las unidades enderezadas no pueden ser atacadas.' };
  }

  attUnit.isSpent = true;

  // FASE 1: Disparar habilidad ATTACK antes de la reacción del rival
  if (!attUnit.hasTriggeredAttackThisDeclaration) {
    attUnit.hasTriggeredAttackThisDeclaration = true;
    executeUnitAttackTrigger(state, attackerPlayerKey, attUnit);
  }

  // Intercepción por Blocker
  if (blockerUnitId) {
    const blocker = defender.field.find((u) => u.instanceId === blockerUnitId);
    if (blocker && hasKeyword(blocker, 'Blocker')) {
      blocker.isSpent = true;
      state.actionLog.unshift(
        `🛡️ [FASE 2: REACCIÓN] ¡BLOCKER! "${blocker.name}" se interpone para proteger a "${defUnit.name}".`
      );
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
    stolenFrom: null,
    id: `${playerKey}-gig-${p.gigs.length}`
  };
  p.gigs.push(gigEntry);

  state.pendingGigRoll = false;
  state.phase = 'MAIN';

  state.actionLog.unshift(
    `🎲 ${p.name} lanza su dado ${normDie.toUpperCase()} del Fixer y obtiene un ${rollValue} (Credibilidad en la Calle: ⭐ ${calculateStreetCred(p.gigs)}).`
  );

  // Si ambos han vaciado el Fixer, empieza el OVERTIME
  const otherKey = playerKey === 'player' ? 'bot' : 'player';
  if (state[otherKey].fixerDice.length === 0 && p.fixerDice.length === 0 && !state.overtime) {
    state.overtime = true;
    state.actionLog.unshift(
      `⚡ ¡OVERTIME ACTIVADO! Ambos Fixers están vacíos. El primer jugador en controlar 7 Gigs gana inmediatamente.`
    );
  }

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
  const p = state[playerKey];

  state.actionLog.unshift(
    `// ==========================================`,
    `// INICIO DE TURNO ${state.turnNumber} // ${p.name.toUpperCase()}`,
    `// ==========================================`
  );

  // 1. COMPROBAR VICTORIA AL INICIO DEL TURNO (7+ Gigs)
  if (checkWinCondition(state, playerKey)) {
    return state;
  }

  // 2. FASE DE PREPARACIÓN (READY STEP)
  p.eddies.forEach((e) => (e.isSpent = false));
  p.floatingEddies = 0; // Reiniciar reserva de Eddies girados al inicio del turno

  // Enderezar Leyendas:
  if (p.legendsDoNotReadyTurn1) {
    // En Turno 1 del Jugador 1: las dos de la izquierda no se enderezan
    if (p.legends[2]) p.legends[2].isSpent = false;
    p.legendsDoNotReadyTurn1 = false; // Se libera para su próximo turno
    state.actionLog.unshift(
      `🔒 Penalización de Turno 1: Tus 2 leyendas izquierdas permanecen giradas en este turno.`
    );
  } else {
    p.legends.forEach((l) => (l.isSpent = false));
  }

  // Enderezar Unidades y limpiar Lag
  p.field.forEach((u) => {
    u.isSpent = false;
    u.isLagging = false;
  });

  p.hasSoldThisTurn = false;
  p.hasCalledLegendThisTurn = false;

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
  if (p.fixerDice.length > 0) {
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

    // Si ambos han vaciado el Fixer, empieza el OVERTIME
    const otherKey = playerKey === 'player' ? 'bot' : 'player';
    if (state[otherKey].fixerDice.length === 0 && !state.overtime) {
      state.overtime = true;
      state.actionLog.unshift(
        `⚡ ¡OVERTIME ACTIVADO! El primer jugador en controlar 7 Gigs gana inmediatamente.`
      );
    }
  }

  return state;
}

/**
 * Finaliza el turno actual y pasa el control al siguiente jugador ejecutando su Start Phase.
 */
export function passTurn(state) {
  if (state.isGameOver) return state;

  // Disparar habilidades de fin de turno (End of Turn Triggers)
  executeEndOfTurnTriggers(state, state.activePlayer);

  const nextPlayerKey = state.activePlayer === 'player' ? 'bot' : 'player';
  state.activePlayer = nextPlayerKey;
  state.turnNumber += 1;

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

  // Ejecutar Start Phase del Jugador 1
  return executeStartPhase(state, playerKey);
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

  // Ejecutar Start Phase del Jugador 1
  return executeStartPhase(state, playerKey);
}
