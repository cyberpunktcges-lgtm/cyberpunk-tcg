/**
 * botAi.js
 * Inteligencia Artificial Táctica v2 para el Bot de Cyberpunk TCG (Set 01)
 *
 * Principios tácticos incorporados:
 * - Turno 1 saliendo primero (2 Leyendas giradas -> 1 €$ base): vende 1 carta -> 2 €$.
 *   Si tiene Unidad de coste 2 (o 1), la juega; si no, llama 1 Leyenda (Call) y pasa.
 * - Turno 1 saliendo segundo (3 Leyendas listas -> 3 €$ base, 4 €$ tras vender):
 *   Prioriza desplegar Unidades fuertes en mesa y llamar Leyendas progresivamente con el sobrante.
 * - Turnos siguientes: prioriza Unidades y Gears antes que Programas, salvo Programas de
 *   robo/ventaja de cartas o de destrucción/bottom-deck cuando el rival tiene objetivo válido.
 * - Nunca desperdicia Programas ni Quick sin objetivo útil; activa habilidades (↷) de Leyendas
 *   y Unidades cuando generan ventaja; equipa Gears al portador óptimo; evalúa Blockers y Johnny vs CORPO.
 */

import {
  getAvailableEddies,
  getEffectiveCardCost,
  getCardType,
  sellCardForEddies,
  playCard,
  playUnitCard,
  playGearCard,
  callLegendFaceUp,
  playLegendToField,
  attackRivalGigs,
  fightRivalUnit,
  resolveFight,
  passTurn,
  hasKeyword,
  calculateGigsToSteal,
  isCardVendible,
  parseCardCost,
  parseCardPower,
  canUnitAttack,
  executeStartPhase
} from './cyberpunkEngine.js';
import {
  executeUnitAttackTrigger,
  executeBlockerUsedTrigger,
  executeCardSpentTriggers,
  resolveCardId,
  getGigMaxFace
} from './cardEffects.js';
import {
  getCardActivatedAbilities,
  executeCardActivatedAbility
} from './activatedAbilities.js';

// =========================================================================
// HELPERS TÁCTICOS
// =========================================================================

function isCorpoUnit(u) {
  return /\bCORPO\b/i.test(`${u?.traits || ''} ${u?.cardType || ''}`);
}

function isJohnnyUnit(u) {
  return String(u?.id || '').toUpperCase() === 'CP-054';
}

/**
 * Ayudante para que la IA gire automáticamente sus cartas de Eddies o Leyendas
 * para reunir la cantidad necesaria de Eddies en bot.floatingEddies antes de pagar una acción.
 */
function botPrepareEddies(bot, neededAmount, preserveLegendId = null) {
  let current = bot.floatingEddies || 0;
  if (current >= neededAmount) return true;

  // 1. Girar cartas de Eddies del bot primero (preservar Leyendas listas para sus habilidades ↷)
  for (const ed of bot.eddies || []) {
    if (current >= neededAmount) break;
    if (!ed.isSpent) {
      ed.isSpent = true;
      current++;
    }
  }

  // 2. Si todavía faltan, girar Leyendas boca abajo primero, luego boca arriba (evitando preserveLegendId)
  const sortedLegends = [...(bot.legends || [])].sort((a, b) => (a.isFaceUp ? 1 : 0) - (b.isFaceUp ? 1 : 0));
  for (const leg of sortedLegends) {
    if (current >= neededAmount) break;
    if (!leg.isSpent && !leg.isOnField && !leg.isRemovedFromGame && leg.instanceId !== preserveLegendId) {
      leg.isSpent = true;
      current++;
    }
  }

  // 3. Como último recurso, girar también la leyenda preservada si hace falta
  if (current < neededAmount && preserveLegendId) {
    const preserved = (bot.legends || []).find((l) => l.instanceId === preserveLegendId);
    if (preserved && !preserved.isSpent && !preserved.isOnField && !preserved.isRemovedFromGame) {
      preserved.isSpent = true;
      current++;
    }
  }

  bot.floatingEddies = current;
  return current >= neededAmount;
}

/**
 * Calcula la capacidad total máxima de Eddies que el bot puede generar este turno.
 */
function getBotMaxCapacity(bot) {
  const current = bot.floatingEddies || 0;
  const readyEddies = (bot.eddies || []).filter((e) => !e.isSpent).length;
  const readyLegends = (bot.legends || []).filter(
    (l) => !l.isSpent && !l.isOnField && !l.isRemovedFromGame
  ).length;
  return current + readyEddies + readyLegends;
}

/**
 * Evalúa si un Programa es útil en el estado actual del tablero y devuelve una puntuación táctica:
 * - 0 = NO JUGAR (sin objetivo válido, desperdicio o Quick que debe guardarse para Reacción)
 * - 30..49 = Utilidad secundaria (solo tras jugar Unidades/Gears si sobran Eddies)
 * - 55..90 = Alta prioridad (robo de cartas o removal/bottom-deck contra amenaza rival real)
 */
function evaluateProgramScore(card, bot, player, gameState) {
  const cid = resolveCardId(card);
  const oppUnits = player.field || [];
  const myUnits = bot.field || [];
  const myGigs = bot.gigs || [];
  const oppGigs = player.gigs || [];
  const myHandSize = (bot.hand || []).length;

  // --- PROGRAMAS QUICK: reservar para Fase de Reacción (salvo Detonate si hay Gear rival) ---
  if (hasKeyword(card, 'Quick') || ['CP-021', 'CP-025', 'CP-036', 'CP-100', 'CP-112', 'CP-123', 'CP-125'].includes(cid)) {
    if (cid === 'CP-025') {
      // Detonate: destruir Gear rival con poder <= 2
      const hasRivalGear = oppUnits.some((u) => (u.gear || []).some((g) => (parseCardPower(g.power) || 0) <= 2));
      return hasRivalGear ? 62 : 0;
    }
    return 0; // Guardar el resto de Quick para Fase de Reacción
  }

  // --- EXCEPCIÓN DE ALTA PRIORIDAD 1: ROBO / VENTAJA DE CARTAS ---
  if (cid === 'CP-129') return (bot.deck?.length || 0) >= 2 ? 70 : 0; // Three Mouths, One Desire
  if (cid === 'CP-037') return (bot.deck?.length || 0) >= 2 ? 66 : 0; // Fool on the Hill
  if (cid === 'CP-006') return (bot.deck?.length || 0) >= 3 ? 64 : 0; // All Is Lost (Trash 3, add Unit)
  if (cid === 'CP-127') return (bot.deck?.length || 0) >= 4 ? 62 : 0; // The Heist (Trash 4, add Gear)
  if (cid === 'CP-085') return (bot.deck?.length || 0) >= 2 ? 72 : 0; // Nocturne Op55N1 (Draw 2)
  if (cid === 'CP-014') {
    // Bootleg Black Sapphire: vender top + robar 2 si tienes Gig par e impar
    const hasEven = myGigs.some((g) => Number(g.value) % 2 === 0);
    const hasOdd = myGigs.some((g) => Number(g.value) % 2 === 1);
    return hasEven && hasOdd ? 74 : 25;
  }
  if (cid === 'CP-120') {
    // Shattered Memories: solo si tiene pocas cartas en mano (<= 2) y el rival tiene más
    return myHandSize <= 2 && (bot.deck?.length || 0) >= 5 ? 70 : 0;
  }
  if (cid === 'CP-144') {
    // We Gotta Live Together: revivir hasta 2 Unidades de coste <= 3 desde Trash
    const trashUnits = (bot.trash || []).filter(
      (c) => getCardType(c) === 'UNIT' && (c.parsedCost || parseCardCost(c.cost) || 0) <= 3
    );
    if (trashUnits.length >= 2) return 84;
    if (trashUnits.length === 1) return 60;
    return 0;
  }

  // --- EXCEPCIÓN DE ALTA PRIORIDAD 2: DESTRUIR / BOTTOM-DECK UNIDAD RIVAL ---
  if (cid === 'CP-013') {
    // Bonnie and Clyde: derrotar unidad rival con poder <= 4
    const targets = oppUnits.filter((u) => (u.currentPower || 0) <= 4);
    return targets.length > 0 ? 74 + targets.length * 6 : 0;
  }
  if (cid === 'CP-016') {
    // Carnage at the Colosseum: derrotar unidad rival con menor poder que una unidad aliada
    const maxMyPower = Math.max(0, ...myUnits.map((u) => u.currentPower || 0));
    const hasTarget = oppUnits.some((u) => (u.currentPower || 0) < maxMyPower);
    return hasTarget ? 76 : 0;
  }
  if (cid === 'CP-028') {
    // (Don't Fear) The Reaper: girar todas las unidades rivales + destruir 1
    return oppUnits.length >= 2 ? 85 : oppUnits.length === 1 ? 66 : 0;
  }
  if (cid === 'CP-062') {
    // Les Éléments: bottom-deck la unidad rival de menor poder
    return oppUnits.length > 0 ? 72 : 0;
  }
  if (cid === 'CP-088') {
    // Over the Edge: derrotar unidad con poder <= valor de d20 aliado
    const myD20 = myGigs.find((g) => String(g.die || '').toLowerCase() === 'd20');
    if (!myD20) return 0;
    const hasTarget = oppUnits.some((u) => (u.currentPower || 0) <= (myD20.value || 0));
    return hasTarget ? 78 : 0;
  }
  if (cid === 'CP-098') {
    // Pyramid Song: -4 poder a unidad rival (o bottom-deck si poder 0)
    if (oppUnits.length === 0) return 0;
    const hasZero = oppUnits.some((u) => (u.currentPower || 0) === 0);
    const hasMinD4 = myGigs.some((g) => String(g.die || '').toLowerCase() === 'd4' && Number(g.value) === 1);
    if (hasZero || (hasMinD4 && oppUnits.some((u) => (u.currentPower || 0) <= 4))) return 82;
    // Útil si el bot va a combatir este turno contra esa unidad o bajar una amenaza grande
    const hasReadyAttacker = myUnits.some((u) => canUnitAttack(u, bot, gameState, 'UNIT'));
    return hasReadyAttacker || oppUnits.some((u) => (u.currentPower || 0) >= 5) ? 68 : 0;
  }
  if (cid === 'CP-130') {
    // Towerfall: -5 a todas las rivales (+ bottom-deck si 0)
    if (oppUnits.length === 0) return 0;
    return oppUnits.length >= 2 ? 86 : 64;
  }
  if (cid === 'CP-134') {
    // Unlikely Bond: bottom-deck aliada lista + rival gastada
    const readyAlly = myUnits.find((u) => !u.isSpent && (u.currentPower || 0) <= 3);
    const spentBigOpp = oppUnits.find((u) => u.isSpent && (u.currentPower || 0) >= 4);
    return readyAlly && spentBigOpp ? 72 : 0;
  }
  if (cid === 'CP-146') {
    // Wild in the Streets: derrotar unidad gastada
    const spentOpp = oppUnits.find((u) => u.isSpent);
    return spentOpp ? 75 : 0;
  }
  if (cid === 'CP-063') {
    // Live With the Aftermath: cada jugador destruye 1 unidad
    if (oppUnits.length === 0) return 0;
    const minMy = myUnits.length > 0 ? Math.min(...myUnits.map((u) => u.currentPower || 0)) : 0;
    const maxOpp = Math.max(...oppUnits.map((u) => u.currentPower || 0));
    return myUnits.length === 0 || maxOpp >= minMy + 2 ? 70 : 0;
  }

  // --- CONTROL DE UNIDADES RIVALES ---
  if (cid === 'CP-018') {
    // Chrome Reverie: congelar unidad rival (+ Call gratis si min Gig)
    return oppUnits.length > 0 ? 52 : 0;
  }
  if (cid === 'CP-020') {
    // Corporate Surveillance: girar unidad rival de coste <= 4
    const readyOpp = oppUnits.some((u) => !u.isSpent && (u.parsedCost || parseCardCost(u.cost) || 0) <= 4);
    return readyOpp ? 50 : 0;
  }
  if (cid === 'CP-074') {
    // Memory Relapse: girar rival + no endereza (+ robar si cred par)
    return oppUnits.length > 0 ? 58 : 0;
  }

  // --- AJUSTE DE GIGS (secundarios: solo si realmente dan robo o ventaja clara, tras Unidades/Gears) ---
  if (cid === 'CP-005') {
    // Afterparty at Lizzie's: ±1 Gig + robar si 2+ valores distintos
    if (myGigs.length + oppGigs.length === 0) return 0;
    return myGigs.length >= 2 ? 48 : 0;
  }
  if (cid === 'CP-048') {
    // Industrial Assembly: +4 Gig + robar si 8+
    const canGrow = myGigs.some((g) => (g.value || 1) < getGigMaxFace(g));
    if (!canGrow) return 0;
    const hitsEight = myGigs.some((g) => Math.min(getGigMaxFace(g), (g.value || 1) + 4) >= 8);
    return hitsEight ? 54 : 36;
  }
  if (cid === 'CP-132') {
    // Trust No One: -3 Gig + robar si min Gig (1)
    if (myGigs.length + oppGigs.length === 0) return 0;
    const hitsMin = myGigs.some((g) => g.value >= 2 && g.value <= 4);
    return hitsMin ? 56 : oppGigs.some((g) => g.value >= 6) ? 38 : 0;
  }
  if (cid === 'CP-094') {
    // Peace Offering: copiar valor + robar si pareja
    if (myGigs.length + oppGigs.length < 2) return 0;
    return myGigs.length >= 2 ? 46 : 0;
  }

  // --- BUFFOS DE COMBATE EN FASE PRINCIPAL ---
  if (cid === 'CP-010' || cid === 'CP-043') {
    const hasAttacker = myUnits.some((u) => canUnitAttack(u, bot, gameState));
    return hasAttacker && oppUnits.length > 0 ? 45 : 0;
  }

  return 30;
}

/**
 * Elige la mejor unidad aliada (o leyenda si es Gear de trigger al girar) para equipar un Gear.
 */
function chooseBestGearTarget(gear, bot, player, gameState) {
  const cid = resolveCardId(gear);
  const myUnits = bot.field || [];
  const isSpendTriggerGear = ['CP-011', 'CP-084', 'CP-126', 'CP-151'].includes(cid);
  const grantsBlocker = hasKeyword(gear, 'Blocker');

  if (myUnits.length > 0) {
    let best = null;
    let bestScore = -999;
    for (const u of myUnits) {
      let score = (u.currentPower || 0) * 2;
      if (!u.isSpent) score += 8;
      if (canUnitAttack(u, bot, gameState)) score += 10;
      if (grantsBlocker) {
        score += hasKeyword(u, 'Blocker') ? -20 : 18;
      }
      if (cid === 'CP-030' && /^V(\s|$|\/\/)/i.test(String(u.name || '').trim())) {
        score += 25; // Dying Night sobre V endereza 2 Eddies
      }
      if ((cid === 'CP-039' || cid === 'CP-116') && (u.currentPower || 0) >= 4) {
        score += 12; // Gorilla Arms / Satori sobre atacante fuerte
      }
      if (score > bestScore) {
        bestScore = score;
        best = u;
      }
    }
    return best;
  }

  // Solo equipar en Leyenda boca arriba si es un Gear con habilidad al girar (Zetatech Faceplate, NetWatch, Rippler, Radioport)
  if (isSpendTriggerGear) {
    return (bot.legends || []).find((l) => l.isFaceUp && !l.isRemovedFromGame && !l.isOnField) || null;
  }
  return null;
}

/**
 * Decide qué carta vender (si conviene vender) siguiendo la estrategia de curva de Eddies:
 * - Turno 1 saliendo primero (1 Leyenda lista): SIEMPRE vender para llegar a 2 €$,
 *   SIN vender tu única Unidad de coste 2.
 * - Turno 1 saliendo segundo (3 Leyendas listas): vender para llegar a 4 €$,
 *   SIN vender tu única Unidad de coste 3–4.
 * - Turnos posteriores: vender hasta alcanzar ~7 Eddies de capacidad o poder pagar cartas caras en mano.
 */
function chooseCardToSellForBot(bot, player, gameState) {
  if (bot.hasSoldThisTurn || !bot.hand || bot.hand.length === 0) return null;

  const vendible = bot.hand.filter((c) => isCardVendible(c));
  if (vendible.length === 0) return null;

  const currentCap = getBotMaxCapacity(bot);
  const isTurn1GoingFirst = gameState.turnNumber === 1;
  const isTurn1GoingSecond = gameState.turnNumber === 2;
  const maxHandCost = Math.max(0, ...bot.hand.map((c) => getEffectiveCardCost(c, bot, gameState)));

  // Si ya tiene mucha capacidad (>= 7) y puede pagar toda su mano con holgura, conservar cartas
  if (!isTurn1GoingFirst && !isTurn1GoingSecond && currentCap >= 7 && currentCap >= maxHandCost) {
    return null;
  }
  // Si solo le queda 1 carta y ya tiene >= 4 Eddies, no quedarse con la mano vacía salvo que no pueda jugarla
  if (bot.hand.length === 1 && currentCap >= 4 && getEffectiveCardCost(bot.hand[0], bot, gameState) <= currentCap) {
    return null;
  }

  const unitsOfCost2 = bot.hand.filter(
    (c) => getCardType(c) === 'UNIT' && getEffectiveCardCost(c, bot, gameState) === 2
  );
  const unitsOfCost3to4 = bot.hand.filter((c) => {
    const cost = getEffectiveCardCost(c, bot, gameState);
    return getCardType(c) === 'UNIT' && cost >= 3 && cost <= 4;
  });

  // Puntuar cada carta vendible: mayor puntuación = MEJOR candidata para vender
  let bestCard = null;
  let bestSellScore = -999;

  for (const card of vendible) {
    const type = getCardType(card);
    const cost = getEffectiveCardCost(card, bot, gameState);
    let sellScore = 0;

    // 1. Proteger la jugada clave de Turno 1
    if (isTurn1GoingFirst && type === 'UNIT' && cost === 2 && unitsOfCost2.length === 1) {
      sellScore -= 100; // NUNCA vender tu única unidad de coste 2 en Turno 1 saliendo primero
    }
    if (isTurn1GoingSecond && type === 'UNIT' && cost >= 3 && cost <= 4 && unitsOfCost3to4.length === 1) {
      sellScore -= 80; // Proteger tu unidad en curva de Turno 1 saliendo segundo
    }

    // 2. Cartas caras imposibles de jugar aún son las mejores para vender al inicio
    if (cost >= currentCap + 3) sellScore += 35;
    else if (cost >= currentCap + 2) sellScore += 22;
    else if (cost >= 5 && gameState.turnNumber <= 4) sellScore += 18;

    // 3. Copias duplicadas en mano se venden con mucha menos pena
    const copies = bot.hand.filter((c) => resolveCardId(c) === resolveCardId(card)).length;
    if (copies >= 2) sellScore += 20;

    // 4. Programas situacionales o inútiles ahora son excelentes para vender
    if (type === 'PROGRAM') {
      const progUtility = evaluateProgramScore(card, bot, player, gameState);
      if (progUtility === 0) sellScore += 25;
      else if (progUtility < 50) sellScore += 10;
      else sellScore -= 15; // Conservar robo/removal útil
    } else if (type === 'GEAR') {
      // Si aún no hay unidades en mesa, vender Gears sobrantes es buena idea
      if ((bot.field || []).length === 0) sellScore += 16;
      else sellScore += 6;
    } else if (type === 'UNIT') {
      // Evitar vender unidades en curva jugables este turno
      if (cost <= currentCap + 1) sellScore -= 20;
    }

    if (sellScore > bestSellScore) {
      bestSellScore = sellScore;
      bestCard = card;
    }
  }

  return bestCard;
}

/**
 * Elige qué Leyenda boca abajo revelar (Call) SIN hacer trampas:
 * Las Leyendas boca abajo están ocultas para ambos jugadores, así que el Bot
 * solo usa información pública (preferir una ya girada si existe) y elige al azar.
 */
function chooseBestLegendToCall(bot) {
  const faceDown = (bot.legends || []).filter((l) => !l.isFaceUp && !l.isRemovedFromGame && !l.isOnField);
  if (faceDown.length === 0) return null;

  const spentFaceDown = faceDown.filter((l) => l.isSpent);
  const pool = spentFaceDown.length > 0 ? spentFaceDown : faceDown;
  const pickIdx = Math.floor(Math.random() * pool.length);
  return pool[pickIdx];
}

let botArrowBatchSeq = 1;

function shortArrowName(card, fallback = 'RIVAL') {
  const raw = String(card?.name || fallback).split(':')[0].trim();
  return raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
}

function captureBotActionSnapshot(gameState) {
  const p = gameState?.player || {};
  const b = gameState?.bot || {};
  return {
    playerField: (p.field || []).map((u) => ({
      instanceId: u.instanceId,
      name: u.name || 'Unidad',
      currentPower: Number(u.currentPower ?? u.parsedPower ?? 0),
      isSpent: Boolean(u.isSpent),
      cannotReadyNextTurn: Boolean(u.cannotReadyNextTurn),
      cannotBlock: Boolean(u.cannotBlock || u.cannotBlockThisTurn),
      mustAttackNextTurn: Boolean(u.mustAttackNextTurn),
      gearCount: (u.gear || []).length
    })),
    playerGigsSig: (p.gigs || []).map((g) => `${g.die}:${g.value}`).join('|'),
    playerGigsCount: (p.gigs || []).length,
    playerHandLen: (p.hand || []).length,
    playerLegends: (p.legends || []).map((l) => ({
      instanceId: l.instanceId,
      isFaceUp: Boolean(l.isFaceUp),
      isSpent: Boolean(l.isSpent)
    })),
    botField: (b.field || []).map((u) => ({
      instanceId: u.instanceId,
      name: u.name || 'Unidad',
      currentPower: Number(u.currentPower ?? u.parsedPower ?? 0),
      gearCount: (u.gear || []).length
    })),
    botGigsSig: (b.gigs || []).map((g) => `${g.die}:${g.value}`).join('|'),
    botGigsCount: (b.gigs || []).length,
    hadModalChoice: Boolean(gameState?.pendingModalChoice),
    logLen: (gameState?.actionLog || []).length
  };
}

function findBotGearHostInstanceId(botState, gearInstanceId) {
  if (!botState || !gearInstanceId) return null;
  for (const u of botState.field || []) {
    if ((u.gear || []).some((g) => g.instanceId === gearInstanceId)) return u.instanceId;
  }
  for (const l of botState.legends || []) {
    if ((l.gear || []).some((g) => g.instanceId === gearInstanceId)) return l.instanceId;
  }
  return null;
}

function recordBotActionArrows(
  beforeSnap,
  gameState,
  { actionType = 'ACTION', card = null, sourceAnchor = null, explicitTargetId = null, extraArrows = [] } = {}
) {
  if (!beforeSnap || !gameState) return [];
  const p = gameState.player || {};
  const b = gameState.bot || {};
  const labelBase = shortArrowName(card, actionType);

  let sourceCandidates = ['bot-trash', 'bot-pill', 'bot-field'];
  if (sourceAnchor) {
    const rawList = Array.isArray(sourceAnchor) ? sourceAnchor : [sourceAnchor];
    const resolvedList = rawList.flatMap((anc) => {
      if (!anc) return [];
      const hostId = findBotGearHostInstanceId(b, anc);
      return hostId ? [hostId, anc] : [anc];
    });
    sourceCandidates = [...new Set([...resolvedList, 'bot-trash', 'bot-pill'])];
  } else if (card) {
    if (actionType === 'GEAR') {
      sourceCandidates = ['bot-pill', 'bot-trash', 'bot-field'];
    } else if (actionType === 'PROGRAM') {
      sourceCandidates = ['bot-trash', 'bot-pill', 'bot-field'];
    } else {
      const matchingFieldUnit = (b.field || []).find(
        (u) => u.instanceId === card.instanceId || u.legendInstanceId === card.instanceId
      );
      const gearHostId = findBotGearHostInstanceId(b, card.instanceId);
      sourceCandidates = [
        ...new Set(
          [
            matchingFieldUnit?.instanceId,
            gearHostId,
            card.instanceId,
            'bot-trash',
            'bot-pill',
            'bot-field'
          ].filter(Boolean)
        )
      ];
    }
  }

  const primarySourceId =
    sourceCandidates.find((c) => c && !['bot-trash', 'bot-pill', 'bot-field'].includes(c)) ||
    card?.instanceId ||
    null;

  const arrows = [...extraArrows];
  const afterPlayerField = p.field || [];
  const afterPlayerFieldMap = new Map(afterPlayerField.map((u) => [u.instanceId, u]));
  const afterPlayerTrashIds = new Set((p.trash || []).map((c) => c.instanceId));
  const afterPlayerHandIds = new Set((p.hand || []).map((c) => c.instanceId));

  // 1. Cambios sobre unidades del jugador (debuff, giro/congelado, cannotBlock, mustAttack, quitar gear, destrucción/bounce)
  for (const prevU of beforeSnap.playerField) {
    const curU = afterPlayerFieldMap.get(prevU.instanceId);
    if (curU) {
      const curPow = Number(curU.currentPower ?? curU.parsedPower ?? 0);
      const curCannotBlock = Boolean(curU.cannotBlock || curU.cannotBlockThisTurn);
      const curMustAttack = Boolean(curU.mustAttackNextTurn);
      if (curPow < prevU.currentPower) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: curU.instanceId,
          color: '#FF003C',
          dashed: true,
          label: `⚡ ${labelBase} (-${prevU.currentPower - curPow})`,
          targetPlayerUnitId: curU.instanceId
        });
      } else if ((!prevU.isSpent && curU.isSpent) || (!prevU.cannotReadyNextTurn && curU.cannotReadyNextTurn)) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: curU.instanceId,
          color: '#ff4fd8',
          dashed: true,
          label: `🔒 ${labelBase}`,
          targetPlayerUnitId: curU.instanceId
        });
      } else if ((!prevU.cannotBlock && curCannotBlock) || (!prevU.mustAttackNextTurn && curMustAttack)) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: curU.instanceId,
          color: '#ff4fd8',
          dashed: true,
          label: !prevU.cannotBlock && curCannotBlock ? `🚫 ${labelBase}` : `🎯 ${labelBase}`,
          targetPlayerUnitId: curU.instanceId
        });
      } else if ((curU.gear || []).length < prevU.gearCount) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: curU.instanceId,
          color: '#FF003C',
          dashed: true,
          label: `💥 ${labelBase} (-GEAR)`,
          targetPlayerUnitId: curU.instanceId
        });
      }
    } else {
      const uShort = shortArrowName(prevU, 'UNIDAD');
      if (afterPlayerTrashIds.has(prevU.instanceId)) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: ['player-trash', 'player-field'],
          color: '#FF003C',
          dashed: true,
          label: `☠️ ${labelBase} → ${uShort}`
        });
      } else if (afterPlayerHandIds.has(prevU.instanceId)) {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: ['player-hand', 'player-field'],
          color: '#ff4fd8',
          dashed: true,
          label: `↩️ ${labelBase} → ${uShort}`
        });
      } else {
        arrows.push({
          fromAnchor: sourceCandidates,
          toAnchor: ['player-deck', 'player-field'],
          color: '#FF003C',
          dashed: true,
          label: `⚡ ${labelBase} → ${uShort}`
        });
      }
    }
  }

  // 2. Cambios sobre Gigs del jugador (robo, ajuste, intercambio)
  const afterPlayerGigsSig = (p.gigs || []).map((g) => `${g.die}:${g.value}`).join('|');
  if (afterPlayerGigsSig !== beforeSnap.playerGigsSig) {
    const stoleGig = (p.gigs || []).length < beforeSnap.playerGigsCount;
    arrows.push({
      fromAnchor: sourceCandidates,
      toAnchor: ['player-gigs', 'player-field'],
      color: '#FF003C',
      dashed: true,
      label: stoleGig ? `🎲 ${labelBase} (ROBA GIG)` : `🎲 ${labelBase} (GIGS)`
    });
  }

  // 3. Descarte forzado en mano del jugador
  if ((p.hand || []).length < beforeSnap.playerHandLen) {
    arrows.push({
      fromAnchor: sourceCandidates,
      toAnchor: ['player-hand', 'player-trash', 'player-field'],
      color: '#ff4fd8',
      dashed: true,
      label: `🃏 ${labelBase} (MANO)`
    });
  }

  // 4. Leyendas del jugador afectadas
  const afterPlayerLegendsMap = new Map((p.legends || []).map((l) => [l.instanceId, l]));
  for (const prevL of beforeSnap.playerLegends) {
    const curL = afterPlayerLegendsMap.get(prevL.instanceId);
    if (curL && (Boolean(curL.isFaceUp) !== prevL.isFaceUp || Boolean(curL.isSpent) !== prevL.isSpent)) {
      arrows.push({
        fromAnchor: sourceCandidates,
        toAnchor: [curL.instanceId, 'player-field'],
        color: '#ff4fd8',
        dashed: true,
        label: `⚡ ${labelBase}`
      });
    }
  }

  // 5. Gear equipado por el rival sobre su propia unidad
  if (actionType === 'GEAR' && explicitTargetId) {
    arrows.push({
      fromAnchor: ['bot-pill', 'bot-trash'],
      toAnchor: [explicitTargetId, 'bot-field'],
      color: '#FCEE0A',
      dashed: true,
      label: `🔧 ${labelBase}`
    });
  }

  // 6. Buffs a unidades del rival por Programa / Habilidad / Trigger PLAY
  const afterBotFieldMap = new Map((b.field || []).map((u) => [u.instanceId, u]));
  for (const prevB of beforeSnap.botField) {
    const curB = afterBotFieldMap.get(prevB.instanceId);
    if (!curB || curB.instanceId === explicitTargetId) continue;
    const curPow = Number(curB.currentPower ?? curB.parsedPower ?? 0);
    if (curPow > prevB.currentPower) {
      arrows.push({
        fromAnchor: sourceCandidates,
        toAnchor: curB.instanceId,
        color: '#FCEE0A',
        dashed: true,
        label: `⚡ ${labelBase} (+${curPow - prevB.currentPower})`
      });
    }
  }

  // 7. Gigs del propio rival modificados por Programa o Habilidad
  const afterBotGigsSig = (b.gigs || []).map((g) => `${g.die}:${g.value}`).join('|');
  if (afterBotGigsSig !== beforeSnap.botGigsSig && actionType !== 'END_BOT_TURN') {
    arrows.push({
      fromAnchor: sourceCandidates,
      toAnchor: 'bot-gigs',
      color: '#FCEE0A',
      dashed: true,
      label: `🎲 ${labelBase}`
    });
  }

  // 8. Decisión interactiva lanzada al jugador (ej: Fool on the Hill)
  if (!beforeSnap.hadModalChoice && gameState.pendingModalChoice && arrows.length === 0) {
    arrows.push({
      fromAnchor: sourceCandidates,
      toAnchor: ['player-field', 'player-pill'],
      color: '#ff4fd8',
      dashed: true,
      label: `⚡ ${labelBase}`
    });
  }

  // 9. Respaldo por log recién añadido (solo para efectos que no cambian stats/flags rastreados;
  // evita falsos positivos con cartas homónimas desplegadas por el rival o duplicadas en mesa)
  if (arrows.length === 0 && typeof beforeSnap.logLen === 'number') {
    const newCount = Math.max(0, (gameState.actionLog || []).length - beforeSnap.logLen);
    if (newCount > 0) {
      const rawRecentLogs = (gameState.actionLog || []).slice(0, newCount);
      const effectLogs = rawRecentLogs
        .filter((line) => {
          const txt = String(line || '');
          // Ignorar líneas de despliegue/venta/llamada/declaración que solo nombran la carta jugada por el rival
          if (/paga\s+\d+\s+€\$\s+y\s+(despliega|lleva\s+a\s+su\s+Leyenda|juega)/i.test(txt)) return false;
          if (/FASE 1: DECLARACIÓN DE ATAQUE|FASE 2: REACCIÓN|vende\s+"/i.test(txt)) return false;
          return true;
        })
        .map((line) => String(line || '').replace(/\[[^\]]+\]/g, '').trim());

      const effectLogsText = effectLogs.join(' \n ');
      if (effectLogsText) {
        const isAoELog = /todas\s+las\s+unidades|a\s+todas|all\s+rival/i.test(effectLogsText);
        for (const pu of afterPlayerField) {
          const puName = String(pu.name || '').trim();
          const puShort = puName.split('//')[0].split(':')[0].trim();
          if (
            (puName && effectLogsText.includes(`"${puName}"`)) ||
            (puName && effectLogsText.includes(puName)) ||
            (puShort && puShort.length >= 5 && effectLogsText.includes(`"${puShort}`))
          ) {
            arrows.push({
              fromAnchor: sourceCandidates,
              toAnchor: pu.instanceId,
              color: '#ff4fd8',
              dashed: true,
              label: `⚡ ${labelBase}`,
              targetPlayerUnitId: pu.instanceId
            });
            // Si hay varias copias con el mismo nombre y el efecto no es global (AoE),
            // apuntar como máximo a 1 instancia y nunca duplicar flechas por nombre.
            if (!isAoELog) break;
          }
        }
        if (arrows.length === 0 && /tus gigs|gig rival|roba.*gig|reduce.*gig/i.test(effectLogsText)) {
          arrows.push({
            fromAnchor: sourceCandidates,
            toAnchor: ['player-gigs', 'player-field'],
            color: '#FF003C',
            dashed: true,
            label: `🎲 ${labelBase}`
          });
        }
      }
    }
  }

  const batchId = `bot-arr-${Date.now()}-${botArrowBatchSeq++}`;
  if (arrows.length > 0) {
    gameState.lastBotActionArrows = {
      batchId,
      actionType,
      sourceInstanceId: primarySourceId,
      arrows: arrows.map((a, idx) => ({
        ...a,
        sourceInstanceId: a.sourceInstanceId || primarySourceId,
        id: `${batchId}-${idx}`
      }))
    };
  } else if (actionType !== 'COMBAT_RESULT') {
    // Limpiar explícitamente flechas de acciones previas para que nunca convivan
    // flechas viejas de una copia anterior con la nueva acción/ataque de otra copia.
    gameState.lastBotActionArrows = {
      batchId,
      actionType,
      sourceInstanceId: primarySourceId,
      arrows: []
    };
  }
  return arrows;
}

/**
 * Evalúa si conviene activar una habilidad (↷) gratuita o rentable de una Leyenda/Unidad del bot.
 */
function tryActivateBotAbilities(gameState, bot, player) {
  let activatedAny = false;
  const candidates = [
    ...(bot.legends || []).filter((l) => l.isFaceUp && !l.isSpent && !l.isOnField && !l.isRemovedFromGame),
    ...(bot.field || []).filter((u) => !u.isSpent && !u.isLagging)
  ];

  for (const card of candidates) {
    const cid = resolveCardId(card);
    const abilities = getCardActivatedAbilities(card, 'bot', gameState);
    for (const ab of abilities) {
      if (!ab.canActivateNow) continue;
      // Solo activar habilidades gratuitas (costEddie === 0) o de alto impacto cuando realmente convenga
      if (ab.costEddie > 0) continue;

      let shouldUse = false;
      if (cid === 'CP-059') shouldUse = true; // Kerry Unit: robar 2 si Gig >= 8
      else if (cid === 'CP-057') shouldUse = true; // Judy Legend: filtrar top deck (si Programa -> mano)
      else if (cid === 'CP-026') {
        // Dexter Legend: +2 a Gig si alguno no está al máximo
        shouldUse = (bot.gigs || []).some((g) => (g.value || 1) < getGigMaxFace(g));
      } else if (cid === 'CP-082') {
        // Muamar Reyes: +1 a Gig si alguno puede subir
        shouldUse = (bot.gigs || []).some((g) => (g.value || 1) < getGigMaxFace(g));
      } else if (cid === 'CP-143') {
        // Wakako: -2 a un Gig rival con valor > 1
        shouldUse = (player.gigs || []).some((g) => (g.value || 1) > 1);
      } else if (cid === 'CP-045') {
        // Hanako: intercambiar solo si el mayor Gig del jugador es superior al menor Gig del bot
        const minBot = Math.min(...(bot.gigs || []).map((g) => g.value || 99));
        const maxPlayer = Math.max(0, ...(player.gigs || []).map((g) => g.value || 0));
        shouldUse = maxPlayer > minBot + 1;
      } else if (cid === 'CP-091') {
        // Padre: igualar Gig propio al mayor del jugador si mejora valor
        const minBot = Math.min(...(bot.gigs || []).map((g) => g.value || 99));
        const maxPlayer = Math.max(0, ...(player.gigs || []).map((g) => g.value || 0));
        shouldUse = maxPlayer > minBot + 1;
      } else if (cid === 'CP-008' && ab.id === 'CP-008-DISCOUNT') {
        // Alt Cunningham: solo activar descuento si tiene un Programa jugable en mano y algún min Gig
        const hasMinGig = (bot.gigs || []).some((g) => Number(g.value) === 1);
        const hasProg = (bot.hand || []).some((c) => getCardType(c) === 'PROGRAM');
        shouldUse = hasMinGig && hasProg;
      }

      if (shouldUse) {
        const snapBeforeAb = captureBotActionSnapshot(gameState);
        const res = executeCardActivatedAbility(gameState, 'bot', card.instanceId, ab.id);
        if (res && res.success) {
          recordBotActionArrows(snapBeforeAb, gameState, {
            actionType: 'ABILITY',
            card,
            sourceAnchor: card.instanceId
          });
          activatedAny = { card, ability: ab };
          break;
        }
      }
    }
    if (activatedAny) break;
  }
  return activatedAny;
}

// =========================================================================
// 1. FASE DE REACCIÓN DEL BOT (BLOCKER / CALL / QUICK)
// =========================================================================

/**
 * Decide si el bot desea interceptar un ataque del jugador usando una de sus unidades con Blocker.
 * Respeta la regla de Johnny Silverhand (CP-054) contra unidades CORPO.
 */
export function decideBotBlocker(botState, attackerPower, isGigAttack = false, attackerUnit = null) {
  const readyBlockers = (botState.field || []).filter(
    (u) => !u.isSpent && hasKeyword(u, 'Blocker')
  );
  if (readyBlockers.length === 0) return null;

  const attIsJohnny = isJohnnyUnit(attackerUnit);

  const canBlockerWin = (b) => {
    if (attIsJohnny && isCorpoUnit(b)) return false; // Johnny siempre gana a CORPO
    if (isJohnnyUnit(b) && isCorpoUnit(attackerUnit)) return true;
    return (b.currentPower || 0) > attackerPower;
  };
  const canBlockerTieOrWin = (b) => {
    if (attIsJohnny && isCorpoUnit(b)) return false;
    if (isJohnnyUnit(b) && isCorpoUnit(attackerUnit)) return true;
    return (b.currentPower || 0) >= attackerPower;
  };

  if (isGigAttack) {
    // 1. Mejor blocker que gane o empate limpiamente
    const strongBlocker = [...readyBlockers]
      .filter(canBlockerTieOrWin)
      .sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0))[0];
    if (strongBlocker) return strongBlocker;

    // 2. Si el atacante va a robar Gigs (especialmente si el jugador se acerca a 7 o bot tiene pocos), sacrificar el blocker más débil
    const gigsStolen = calculateGigsToSteal(attackerPower);
    if (gigsStolen >= 1 && ((botState.gigs || []).length <= 4 || gigsStolen >= 2)) {
      return [...readyBlockers].sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0))[0];
    }
  } else {
    // Ataque a una unidad del bot: solo bloquear si el blocker GANA limpiamente al atacante
    const winningBlocker = [...readyBlockers]
      .filter(canBlockerWin)
      .sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0))[0];
    if (winningBlocker) return winningBlocker;
  }

  return null;
}

/**
 * Evalúa y ejecuta la Fase de Respuesta (React Phase) del Bot cuando el Jugador declara un ataque:
 * 1. Decide primero si intercepta con Blocker (para saber si habrá combate o robo de Gigs).
 * 2. Juega cartas Quick SOLO si realmente impactan el combate o el robo de Gigs actual.
 * 3. Llama una Leyenda boca arriba solo si le sobra 1 €$ y resulta provechoso.
 */
export function executeBotReaction(gameState, attackerUnit, targetType, targetUnitId = null) {
  const bot = gameState.bot;
  const isGigAttack = targetType === 'GIGS';

  // 1. Evaluar Blocker primero (respetando Johnny vs CORPO)
  const chosenBlocker = decideBotBlocker(bot, attackerUnit.currentPower || 0, isGigAttack, attackerUnit);
  const willFight = Boolean(chosenBlocker || targetType === 'UNIT');

  // 2. Evaluar cartas Quick útiles para ESTA situación concreta
  const quickCards = (bot.hand || []).filter((c) => {
    const cid = resolveCardId(c);
    const isQuick = hasKeyword(c, 'Quick') || ['CP-021', 'CP-025', 'CP-036', 'CP-100', 'CP-112', 'CP-123', 'CP-125'].includes(cid);
    if (!isQuick) return false;
    const cost = getEffectiveCardCost(c, bot, gameState);
    if (cost > getBotMaxCapacity(bot)) return false;

    // Filtrar según relevancia real en esta reacción:
    if (cid === 'CP-125') return isGigAttack && !chosenBlocker && calculateGigsToSteal(attackerUnit.currentPower || 0) >= 1; // Take Control
    if (cid === 'CP-036') return true; // Floor It! (-1 poder + robar 1 siempre es bueno en combate/asalto)
    if (cid === 'CP-100' || cid === 'CP-112' || cid === 'CP-123') return willFight; // Solo si habrá pelea
    if (cid === 'CP-021') return willFight && (bot.field || []).some((u) => (u.gear || []).length > 0);
    return false;
  });

  if (quickCards.length > 0) {
    const qCard = quickCards[0];
    const cost = getEffectiveCardCost(qCard, bot, gameState);
    const snapBeforeQuick = captureBotActionSnapshot(gameState);
    botPrepareEddies(bot, cost);
    playCard(gameState, 'bot', qCard.instanceId);
    recordBotActionArrows(snapBeforeQuick, gameState, {
      actionType: 'PROGRAM',
      card: qCard,
      sourceAnchor: ['bot-trash', 'bot-pill']
    });
    gameState.actionLog.unshift(
      `⚡ [FASE 2: REACCIÓN] ¡QUICK! El rival responde jugando "${qCard.name}".`
    );
  }

  // 3. Evaluar si el Bot llama a una Leyenda en Reacción (solo si le sobra >= 1 €$ y tiene leyenda boca abajo)
  if (!bot.hasCalledLegendThisTurn && getBotMaxCapacity(bot) >= 1) {
    const uncalledLeg = chooseBestLegendToCall(bot, gameState.player);
    if (uncalledLeg) {
      const snapBeforeCall = captureBotActionSnapshot(gameState);
      botPrepareEddies(bot, 1, uncalledLeg.instanceId);
      callLegendFaceUp(gameState, 'bot', uncalledLeg.instanceId);
      recordBotActionArrows(snapBeforeCall, gameState, {
        actionType: 'CALL_LEGEND',
        card: uncalledLeg,
        sourceAnchor: uncalledLeg.instanceId
      });
      gameState.actionLog.unshift(
        `👑 [FASE 2: REACCIÓN] ¡CALL! El rival responde llamando a su Leyenda "${uncalledLeg.name}" boca arriba.`
      );
    }
  }

  if (chosenBlocker) {
    const snapBeforeBlock = captureBotActionSnapshot(gameState);
    chosenBlocker.isSpent = true;
    recordBotActionArrows(snapBeforeBlock, gameState, {
      actionType: 'BLOCKER',
      card: chosenBlocker,
      sourceAnchor: chosenBlocker.instanceId,
      extraArrows: attackerUnit?.instanceId
        ? [
            {
              fromAnchor: chosenBlocker.instanceId,
              toAnchor: attackerUnit.instanceId,
              color: '#FF003C',
              dashed: false,
              label: `🛡️ BLOCK: ${shortArrowName(chosenBlocker)}`,
              targetPlayerUnitId: attackerUnit.instanceId
            }
          ]
        : []
    });
    gameState.actionLog.unshift(
      `🛡️ [FASE 2: REACCIÓN] ¡BLOCKER! El rival gira a "${chosenBlocker.name}" [Fuerza: ${chosenBlocker.currentPower}] para interceptar el ataque.`
    );
  } else {
    gameState.actionLog.unshift(
      `🛡️ [FASE 2: REACCIÓN] El rival decide pasar sin bloquear.`
    );
  }

  return chosenBlocker;
}

// =========================================================================
// 2. TURNO PRINCIPAL DEL BOT (IA TÁCTICA v2)
// =========================================================================

/**
 * Ejecuta el turno del Bot paso a paso con decisiones tácticas reales.
 * Si se proporciona `pauseForAck`, el Bot se detiene tras cada carta/habilidad jugada
 * hasta que el jugador pulsa "OK" para revisar exactamente qué ha ocurrido.
 */
export async function runBotTurn(gameState, updateCallback, delayMs = 1450, pauseForAck = null) {
  if (gameState.isGameOver || gameState.activePlayer !== 'bot' || gameState.pendingStartPhase) return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const bot = gameState.bot;
  const player = gameState.player;
  const stepPreDelay = Math.max(550, Math.round(delayMs * 0.55));
  const autoReadDelay = Math.max(1750, Math.round(delayMs * 1.25));

  const captureLogsSince = (prevLen) => {
    const all = gameState.actionLog || [];
    const addedCount = Math.max(0, all.length - prevLen);
    return all.slice(0, addedCount).reverse();
  };

  let aborted = false;
  const pauseAfterPlay = async (actionType, card, prevLogLen, targetName = '', subtitle = '') => {
    if (card && actionType !== 'END_BOT_TURN') {
      gameState.lastBotLiveAction = {
        id: `bot-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actionType,
        card,
        targetName,
        logs: prevLogLen !== null ? captureLogsSince(prevLogLen) : []
      };
    }
    updateCallback({ ...gameState });
    // Si la jugada del Bot abrió una decisión interactiva para el jugador (ej: Fool on the Hill, descarte forzado),
    // detenemos aquí el bucle del Bot y se reanudará automáticamente en cuanto el jugador resuelva el modal.
    if (gameState.pendingModalChoice || gameState.pendingCardChoice || gameState.pendingTargetSelection) {
      aborted = true;
      return false;
    }
    let waitedManually = false;
    if (typeof pauseForAck === 'function' && !gameState.isGameOver) {
      const ack = await pauseForAck({
        actionType,
        card: card || null,
        targetName,
        subtitle,
        logs: prevLogLen !== null ? captureLogsSince(prevLogLen) : []
      });
      if (ack?.cancelled || gameState.isGameOver || gameState.activePlayer !== 'bot') {
        aborted = true;
        return false;
      }
      waitedManually = !ack?.autoSkipped;
    }
    // En modo fluido (sin pausa manual), dar tiempo amplio y claro para leer la carta y las flechas sobre el tablero
    if (!waitedManually && !gameState.isGameOver && gameState.activePlayer === 'bot') {
      await wait(actionType === 'END_BOT_TURN' ? Math.max(950, Math.round(delayMs * 0.7)) : autoReadDelay);
    }
    return true;
  };

  // Tras enderezar cartas y lanzar el dado del Bot, esperar un respiro visual (~950ms) antes de su primera jugada
  if (gameState._botIntroWaitedTurn !== gameState.turnNumber) {
    gameState._botIntroWaitedTurn = gameState.turnNumber;
    await wait(950);
    if (gameState.isGameOver || gameState.activePlayer !== 'bot') return;
  }

  // Salvaguarda de Turno 1: si el bot empieza la partida y aún no se ejecutó su Fase de Inicio (0 dados lanzados)
  if (gameState.turnNumber === 1 && (bot.gigs || []).length === 0 && (bot.fixerDice || []).length === 6) {
    executeStartPhase(gameState, 'bot');
    updateCallback({ ...gameState });
  }

  const isBotTurn1GoingFirst = gameState.turnNumber === 1;
  const isBotTurn1GoingSecond = gameState.turnNumber === 2;

  // -----------------------------------------------------------------------
  // PASO 1: VENDER 1 CARTA PARA EDDIES (CON PROTECCIÓN DE CURVA)
  // -----------------------------------------------------------------------
  const cardToSell = chooseCardToSellForBot(bot, player, gameState);
  if (cardToSell) {
    await wait(stepPreDelay);
    sellCardForEddies(gameState, 'bot', cardToSell.instanceId);
    updateCallback({ ...gameState });
    await wait(Math.max(850, Math.round(delayMs * 0.65)));
  }

  // -----------------------------------------------------------------------
  // PASO 2: APERTURA DE TURNO 1 SALIENDO PRIMERO (2 €$ DISPONIBLES)
  // Regla táctica oficial del jugador:
  // - Si tiene Unidad de coste 2 (o 1) -> Juega la Unidad (NO gasta 1 €$ en Call antes!)
  // - Si NO tiene Unidad de coste 2 (ni 1) -> Hace Call a 1 Leyenda y pasa.
  // -----------------------------------------------------------------------
  if (isBotTurn1GoingFirst) {
    const cap = getBotMaxCapacity(bot);
    const playableOpeningUnits = (bot.hand || [])
      .filter((c) => getCardType(c) === 'UNIT' && getEffectiveCardCost(c, bot, gameState) <= cap)
      .sort((a, b) => {
        // Priorizar Unidad de coste 2 en curva, luego mayor poder
        const costDiff = getEffectiveCardCost(b, bot, gameState) - getEffectiveCardCost(a, bot, gameState);
        if (costDiff !== 0) return costDiff;
        return (b.parsedPower || parseCardPower(b.power) || 0) - (a.parsedPower || parseCardPower(a.power) || 0);
      });

    if (playableOpeningUnits.length > 0) {
      const unitToPlay = playableOpeningUnits[0];
      const uCost = getEffectiveCardCost(unitToPlay, bot, gameState);
      await wait(stepPreDelay);
      const logBefore = (gameState.actionLog || []).length;
      const snapBefore = captureBotActionSnapshot(gameState);
      botPrepareEddies(bot, uCost);
      const res = playUnitCard(gameState, 'bot', unitToPlay.instanceId);
      if (res.success) {
        recordBotActionArrows(snapBefore, gameState, { actionType: 'UNIT', card: unitToPlay });
        const cont = await pauseAfterPlay('UNIT', unitToPlay, logBefore);
        if (!cont) return;
      }
    } else {
      // Sin unidad de coste 2 (ni 1): llamar 1 Leyenda boca arriba y pasar turno
      if (!bot.hasCalledLegendThisTurn && getBotMaxCapacity(bot) >= 1) {
        const leg = chooseBestLegendToCall(bot, player);
        if (leg) {
          await wait(stepPreDelay);
          const logBefore = (gameState.actionLog || []).length;
          const snapBefore = captureBotActionSnapshot(gameState);
          botPrepareEddies(bot, 1, leg.instanceId);
          callLegendFaceUp(gameState, 'bot', leg.instanceId);
          recordBotActionArrows(snapBefore, gameState, {
            actionType: 'CALL_LEGEND',
            card: leg,
            sourceAnchor: leg.instanceId
          });
          const cont = await pauseAfterPlay('CALL_LEGEND', leg, logBefore);
          if (!cont) return;
        }
      }
      // Si la unidad jugada tuviera Adrenaline (no hubo) -> aquí no hay ataques posibles en Turno 1 sin unidades
      const contEnd1 = await pauseAfterPlay(
        'END_BOT_TURN',
        null,
        null,
        '',
        'El rival ha terminado su Turno 1. Revisa la mesa y pulsa «EMPEZAR MI TURNO» para robar carta y lanzar tu dado de Gig.'
      );
      if (!contEnd1) return;
      passTurn(gameState, { deferStartPhase: true });
      updateCallback({ ...gameState });
      return;
    }
  } else {
    // ---------------------------------------------------------------------
    // PASO 3: FASE PRINCIPAL (TURNO 1 SALIENDO SEGUNDO Y TURNOS SIGUIENTES)
    // Prioridad:
    //   1. Programas de robo o destrucción/bottom-deck con objetivo real
    //   2. Unidades (en curva, priorizando presencia de mesa) y Gears al mejor portador
    //   3. Go Solo cuando sea rentable o remate partida
    //   4. Llamar a 1 Leyenda (Call) progresivamente sin ahogar el despliegue de Unidades
    //   5. Habilidades activadas (↷) de Leyendas y Unidades
    // ---------------------------------------------------------------------

    // 3.A: Activar habilidades (↷) gratuitas de robo/filtro/buff antes de jugar si convienen
    const logBeforeAb1 = (gameState.actionLog || []).length;
    const activated1 = tryActivateBotAbilities(gameState, bot, player);
    if (activated1) {
      await wait(stepPreDelay);
      const cont = await pauseAfterPlay(
        'ABILITY',
        activated1.card,
        logBeforeAb1,
        activated1.ability?.title || ''
      );
      if (!cont) return;
    }

    // 3.B: Bucle táctico de despliegue (Unidades, Gears, Programas de alto valor, Go Solo)
    const botDifficulty = Math.max(1, Math.min(3, Number(gameState?.botDifficulty || 1)));
    let keepPlaying = true;
    let safetyCounter = 0;
    while (keepPlaying && !aborted && !gameState.isGameOver && safetyCounter < 12) {
      safetyCounter++;
      const rawMaxCapacity = getBotMaxCapacity(bot);
      if (rawMaxCapacity <= 0) break;

      // Nivel 2+ (Edgerunner / Adam Smasher): reservar Eddies para 1 carta Quick defensiva si el jugador amenaza mesa
      let reservedQuickCost = 0;
      if (botDifficulty >= 2 && (player.field || []).length > 0 && !gameState.overtime) {
        const defensiveQuick = (bot.hand || [])
          .filter(
            (c) =>
              hasKeyword(c, 'Quick') &&
              getCardType(c) === 'PROGRAM' &&
              getEffectiveCardCost(c, bot, gameState) <= Math.max(2, rawMaxCapacity - 2)
          )
          .sort((a, b) => getEffectiveCardCost(a, bot, gameState) - getEffectiveCardCost(b, bot, gameState))[0];
        if (defensiveQuick) {
          reservedQuickCost = getEffectiveCardCost(defensiveQuick, bot, gameState);
        }
      }
      const maxCapacity = Math.max(0, rawMaxCapacity - reservedQuickCost);

      const actions = [];
      const playerMaxBlockerPower = Math.max(
        0,
        ...(player.field || [])
          .filter((u) => !u.isSpent && hasKeyword(u, 'Blocker'))
          .map((u) => u.currentPower || 0)
      );

      // Evaluar cartas en mano
      for (const card of bot.hand || []) {
        const cost = getEffectiveCardCost(card, bot, gameState);
        const type = getCardType(card);
        // En Nivel 3 (Adam Smasher), permitir romper la reserva Quick si es Go Solo / Adrenaline / removal crítico
        const effectiveCap =
          botDifficulty >= 3 && (hasKeyword(card, 'Adrenaline') || type === 'PROGRAM')
            ? rawMaxCapacity
            : maxCapacity;
        if (cost > effectiveCap) continue;

        if (type === 'UNIT') {
          const power = card.parsedPower || parseCardPower(card.power) || 0;
          let score = 62 + power * 4 + cost * 2.5;
          if (hasKeyword(card, 'Adrenaline')) score += botDifficulty >= 3 ? 24 : 14;
          if (hasKeyword(card, 'Blocker') && (player.field || []).length > (bot.field || []).length) {
            score += botDifficulty >= 2 ? 18 : 10;
          }
          if (isJohnnyUnit(card) && (player.field || []).some(isCorpoUnit)) score += botDifficulty >= 2 ? 24 : 16;
          if (botDifficulty >= 2 && power >= 5 && (bot.gigs?.length || 0) >= 4) score += 8;
          // En Turno 1 saliendo segundo, priorizar aún más desplegar Unidades fuertes en curva
          if (isBotTurn1GoingSecond) score += 15;
          actions.push({ kind: 'CARD', card, cost, score, targetId: null });
        } else if (type === 'GEAR') {
          const target = chooseBestGearTarget(card, bot, player, gameState);
          if (!target) continue; // Nunca jugar Gear sin portador válido útil
          const pBonus = parseCardPower(card.power) || 0;
          let score = 54 + pBonus * 5;
          if (hasKeyword(card, 'Blocker') && !hasKeyword(target, 'Blocker')) score += 12;
          if (['CP-030', 'CP-039', 'CP-114', 'CP-116', 'CP-151'].includes(resolveCardId(card))) score += 10;
          // Nivel 2+: priorizar equipar Gear si permite superar al Blocker rival o alcanzar el umbral de 2 Gigs (>= 5 fuerza)
          if (botDifficulty >= 2 && !target.isSpent && !target.isLagging) {
            const curPow = target.currentPower || 0;
            const newPow = curPow + pBonus;
            if (curPow < 5 && newPow >= 5) score += 14;
            if (playerMaxBlockerPower > 0 && curPow <= playerMaxBlockerPower && newPow > playerMaxBlockerPower) {
              score += botDifficulty >= 3 ? 20 : 12;
            }
          }
          actions.push({ kind: 'CARD', card, cost, score, targetId: target.instanceId, targetName: target.name });
        } else if (type === 'PROGRAM') {
          let score = evaluateProgramScore(card, bot, player, gameState);
          if (score > 0) {
            // En Nivel 2+, valorar aún más removal/debuff contra amenazas grandes o Blockers del jugador
            if (botDifficulty >= 2 && score >= 65 && (playerMaxBlockerPower >= 3 || (player.field || []).some((u) => (u.currentPower || 0) >= 5))) {
              score += botDifficulty >= 3 ? 16 : 10;
            }
            // En Turno 1 saliendo segundo, solo jugar Programas si son robo o removal real (>= 60)
            if (isBotTurn1GoingSecond && score < 60) continue;
            actions.push({ kind: 'CARD', card, cost, score, targetId: null });
          }
        }
      }

      // Evaluar Leyendas boca arriba con Go Solo
      for (const leg of bot.legends || []) {
        if (leg.isOnField || leg.isRemovedFromGame || !leg.isFaceUp || !hasKeyword(leg, 'Go Solo')) continue;
        const cost = getEffectiveCardCost(leg, bot, gameState);
        if (cost <= 0 || cost > rawMaxCapacity) continue;
        const power = leg.parsedPower || parseCardPower(leg.power) || 0;
        let score = 66 + power * 4;
        if (gameState.overtime && (bot.gigs?.length || 0) >= 5) score += 25;
        if (botDifficulty >= 2 && (bot.gigs?.length || 0) >= 4) score += 10;
        if (botDifficulty >= 3 && (power > playerMaxBlockerPower || (player.field || []).length === 0)) score += 16;
        actions.push({ kind: 'GO_SOLO', card: leg, cost, score });
      }

      if (actions.length === 0) {
        keepPlaying = false;
        break;
      }

      actions.sort((a, b) => b.score - a.score);
      const best = actions[0];

      await wait(stepPreDelay);
      const logBefore = (gameState.actionLog || []).length;
      const snapBefore = captureBotActionSnapshot(gameState);
      if (best.kind === 'GO_SOLO') {
        botPrepareEddies(bot, best.cost);
        const res = playLegendToField(gameState, 'bot', best.card.instanceId, true);
        if (res.success) {
          recordBotActionArrows(snapBefore, gameState, { actionType: 'GO_SOLO', card: best.card });
          const cont = await pauseAfterPlay('GO_SOLO', best.card, logBefore);
          if (!cont) return;
        } else {
          keepPlaying = false;
        }
      } else {
        botPrepareEddies(bot, best.cost);
        const cardType = getCardType(best.card);
        const res =
          cardType === 'GEAR'
            ? playGearCard(gameState, 'bot', best.card.instanceId, best.targetId)
            : playCard(gameState, 'bot', best.card.instanceId, best.targetId);
        if (res.success) {
          recordBotActionArrows(snapBefore, gameState, {
            actionType: cardType || 'UNIT',
            card: best.card,
            explicitTargetId: best.targetId || null
          });
          const cont = await pauseAfterPlay(cardType || 'UNIT', best.card, logBefore, best.targetName || '');
          if (!cont) return;
        } else {
          keepPlaying = false;
        }
      }
    }

    if (aborted || gameState.isGameOver) return;

    // 3.C: Llamar a 1 Leyenda boca arriba progresivamente si queda >= 1 €$ disponible
    if (!bot.hasCalledLegendThisTurn && getBotMaxCapacity(bot) >= 1 && !gameState.isGameOver) {
      const faceDownLegend = chooseBestLegendToCall(bot, player);
      if (faceDownLegend) {
        await wait(stepPreDelay);
        const logBefore = (gameState.actionLog || []).length;
        const snapBeforeCall = captureBotActionSnapshot(gameState);
        botPrepareEddies(bot, 1, faceDownLegend.instanceId);
        callLegendFaceUp(gameState, 'bot', faceDownLegend.instanceId);
        recordBotActionArrows(snapBeforeCall, gameState, {
          actionType: 'CALL_LEGEND',
          card: faceDownLegend,
          sourceAnchor: faceDownLegend.instanceId
        });
        const cont = await pauseAfterPlay('CALL_LEGEND', faceDownLegend, logBefore);
        if (!cont) return;
      }
    }

    // 3.D: Reintentar habilidades activadas (↷) de Leyendas recién llamadas o tras jugar cartas
    if (!aborted && !gameState.isGameOver) {
      const logBeforeAb2 = (gameState.actionLog || []).length;
      const activated2 = tryActivateBotAbilities(gameState, bot, player);
      if (activated2) {
        await wait(stepPreDelay);
        const cont = await pauseAfterPlay(
          'ABILITY',
          activated2.card,
          logBeforeAb2,
          activated2.ability?.title || ''
        );
        if (!cont) return;
      }
    }
  }

  if (aborted || gameState.isGameOver) return;

  // -----------------------------------------------------------------------
  // PASO 4: FASE DE ATAQUES CON CONCIENCIA DE BLOCKERS, LETHAL Y JOHNNY
  // -----------------------------------------------------------------------
  const attackDifficulty = Math.max(1, Math.min(3, Number(gameState?.botDifficulty || 1)));
  const playerReadyBlockers = (player.field || []).filter(
    (u) => !u.isSpent && hasKeyword(u, 'Blocker')
  );
  const maxPlayerBlockerPower = Math.max(0, ...playerReadyBlockers.map((b) => b.currentPower || 0));

  const preReadyUnits = (bot.field || []).filter((u) => canUnitAttack(u, bot, gameState));
  if (preReadyUnits.length > 0) {
    await wait(Math.max(850, Math.round(delayMs * 0.65)));
    if (gameState.isGameOver || gameState.activePlayer !== 'bot') return;
  }

  const readyUnits = (bot.field || [])
    .filter((u) => canUnitAttack(u, bot, gameState))
    .sort((a, b) => {
      // Obligadas a atacar primero
      if (a.mustAttackNextTurn !== b.mustAttackNextTurn) {
        return (b.mustAttackNextTurn ? 1 : 0) - (a.mustAttackNextTurn ? 1 : 0);
      }
      // Nivel 3 (Adam Smasher): si el jugador tiene Blocker y el Bot tiene varios atacantes,
      // atacar primero con Johnny anti-Corpo o el atacante capaz de baitear al Blocker para dejar pasar al grande
      if (attackDifficulty >= 3 && playerReadyBlockers.length > 0 && (bot.field || []).length >= 2) {
        const aJohnnyEdge = isJohnnyUnit(a) && playerReadyBlockers.some(isCorpoUnit) ? 1 : 0;
        const bJohnnyEdge = isJohnnyUnit(b) && playerReadyBlockers.some(isCorpoUnit) ? 1 : 0;
        if (aJohnnyEdge !== bJohnnyEdge) return bJohnnyEdge - aJohnnyEdge;
        return (a.currentPower || 0) - (b.currentPower || 0);
      }
      return (b.currentPower || 0) - (a.currentPower || 0);
    });

  for (const unit of readyUnits) {
    if (gameState.isGameOver) break;

    const unitPower = unit.currentPower || 0;
    const isBotJohnny = isJohnnyUnit(unit);
    const botUnitIsCorpo = isCorpoUnit(unit);

    // 4.A: Victoria inmediata en Overtime (si robar Gigs da 7+ Gigs y no hay Blocker invencible)
    const gigsToSteal = calculateGigsToSteal(unitPower);
    const canOvertimeWin =
      gameState.overtime &&
      (bot.gigs?.length || 0) + gigsToSteal >= 7 &&
      (player.gigs?.length || 0) > 0 &&
      canUnitAttack(unit, bot, gameState, 'GIGS');

    if (canOvertimeWin) {
      const snapBeforeAtk = captureBotActionSnapshot(gameState);
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeCardSpentTriggers(gameState, 'bot', unit);
      executeUnitAttackTrigger(gameState, 'bot', unit);
      recordBotActionArrows(snapBeforeAtk, gameState, {
        actionType: 'ATTACK_TRIGGER',
        card: unit,
        sourceAnchor: unit.instanceId
      });
      gameState.pendingReaction = {
        attackerPlayerKey: 'bot',
        attackerUnitId: unit.instanceId,
        attackerName: unit.name,
        attackerPower: unit.currentPower,
        attackerImage: unit.image,
        targetType: 'GIGS',
        targetUnitId: null,
        targetName: 'Tus Gigs',
        targetPower: null,
        targetImage: null,
        blockerUnitId: null
      };
      gameState.actionLog.unshift(
        `⚔️ [FASE 1: DECLARACIÓN DE ATAQUE] "${unit.name}" [Fuerza: ${unit.currentPower}] del rival asalta tus Gigs buscando la victoria. Se activa tu Fase de Reacción.`
      );
      updateCallback({ ...gameState });
      return;
    }

    // 4.B: Destruir unidades enemigas giradas (Spent) donde el bot gana limpiamente (o Johnny vs CORPO)
    const killableSpentEnemy = [...(player.field || [])]
      .filter((pu) => {
        if (!pu.isSpent) return false;
        if (isBotJohnny && isCorpoUnit(pu)) return true;
        if (isJohnnyUnit(pu) && botUnitIsCorpo) return false;
        return (pu.currentPower || 0) < unitPower;
      })
      .sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];

    if (killableSpentEnemy && canUnitAttack(unit, bot, gameState, 'UNIT')) {
      const snapBeforeAtk = captureBotActionSnapshot(gameState);
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeCardSpentTriggers(gameState, 'bot', unit);
      executeUnitAttackTrigger(gameState, 'bot', unit);
      recordBotActionArrows(snapBeforeAtk, gameState, {
        actionType: 'ATTACK_TRIGGER',
        card: unit,
        sourceAnchor: unit.instanceId
      });

      gameState.pendingReaction = {
        attackerPlayerKey: 'bot',
        attackerUnitId: unit.instanceId,
        attackerName: unit.name,
        attackerPower: unit.currentPower,
        attackerImage: unit.image,
        targetType: 'UNIT',
        targetUnitId: killableSpentEnemy.instanceId,
        targetName: killableSpentEnemy.name,
        targetPower: killableSpentEnemy.currentPower,
        targetImage: killableSpentEnemy.image,
        blockerUnitId: null
      };
      gameState.actionLog.unshift(
        `⚔️ [FASE 1: DECLARACIÓN DE ATAQUE] "${unit.name}" [Fuerza: ${unit.currentPower}] del rival ataca a tu unidad gastada "${killableSpentEnemy.name}". Se activa tu Fase de Reacción.`
      );
      updateCallback({ ...gameState });
      return;
    }

    // 4.C: Atacar los Gigs del jugador (evitar suicidarse contra un Blocker más grande salvo si hay más atacantes o mustAttack)
    if (player.gigs && player.gigs.length > 0 && canUnitAttack(unit, bot, gameState, 'GIGS')) {
      const blockedByStronger =
        playerReadyBlockers.length > 0 &&
        maxPlayerBlockerPower > unitPower &&
        !(isBotJohnny && playerReadyBlockers.every(isCorpoUnit));
      const hasBackupAttackers = readyUnits.filter((u) => !u.isSpent && u.instanceId !== unit.instanceId).length > 0;

      if (!blockedByStronger || hasBackupAttackers || unit.mustAttackNextTurn || gigsToSteal === 0) {
        // Si tiene poder 0, solo atacar si tiene habilidad ATTACK útil (ej: Sketchy Ripper, Evelyn)
        if (gigsToSteal > 0 || ['CP-034', 'CP-121'].includes(resolveCardId(unit)) || unit.mustAttackNextTurn) {
          const snapBeforeAtk = captureBotActionSnapshot(gameState);
          unit.isSpent = true;
          unit.hasTriggeredAttackThisDeclaration = true;
          executeCardSpentTriggers(gameState, 'bot', unit);
          executeUnitAttackTrigger(gameState, 'bot', unit);
          recordBotActionArrows(snapBeforeAtk, gameState, {
            actionType: 'ATTACK_TRIGGER',
            card: unit,
            sourceAnchor: unit.instanceId
          });

          gameState.pendingReaction = {
            attackerPlayerKey: 'bot',
            attackerUnitId: unit.instanceId,
            attackerName: unit.name,
            attackerPower: unit.currentPower,
            attackerImage: unit.image,
            targetType: 'GIGS',
            targetUnitId: null,
            targetName: 'Tus Gigs',
            targetPower: null,
            targetImage: null,
            blockerUnitId: null
          };
          gameState.actionLog.unshift(
            `⚔️ [FASE 1: DECLARACIÓN DE ATAQUE] "${unit.name}" [Fuerza: ${unit.currentPower}] del rival asalta tus Gigs. Se activa tu Fase de Reacción.`
          );
          updateCallback({ ...gameState });
          return;
        }
      }
    }

    // 4.D: Empate favorable contra unidad girada peligrosa (>= 5 poder) o si está obligada a atacar
    const tieEnemy = (player.field || []).find(
      (pu) =>
        pu.isSpent &&
        !(isJohnnyUnit(pu) && botUnitIsCorpo) &&
        ((pu.currentPower || 0) === unitPower && (pu.currentPower || 0) >= 5 || unit.mustAttackNextTurn)
    );
    if (tieEnemy && canUnitAttack(unit, bot, gameState, 'UNIT')) {
      const snapBeforeAtk = captureBotActionSnapshot(gameState);
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeCardSpentTriggers(gameState, 'bot', unit);
      executeUnitAttackTrigger(gameState, 'bot', unit);
      recordBotActionArrows(snapBeforeAtk, gameState, {
        actionType: 'ATTACK_TRIGGER',
        card: unit,
        sourceAnchor: unit.instanceId
      });

      gameState.pendingReaction = {
        attackerPlayerKey: 'bot',
        attackerUnitId: unit.instanceId,
        attackerName: unit.name,
        attackerPower: unit.currentPower,
        attackerImage: unit.image,
        targetType: 'UNIT',
        targetUnitId: tieEnemy.instanceId,
        targetName: tieEnemy.name,
        targetPower: tieEnemy.currentPower,
        targetImage: tieEnemy.image,
        blockerUnitId: null
      };
      gameState.actionLog.unshift(
        `⚔️ [FASE 1: DECLARACIÓN DE ATAQUE] "${unit.name}" [Fuerza: ${unit.currentPower}] del rival ataca a "${tieEnemy.name}". Se activa tu Fase de Reacción.`
      );
      updateCallback({ ...gameState });
      return;
    }
  }

  // Paso 5: Pausa de fin de turno del rival antes de abrir la tirada de dado del Jugador
  if (!gameState.isGameOver && gameState.activePlayer === 'bot') {
    const contEnd = await pauseAfterPlay(
      'END_BOT_TURN',
      null,
      null,
      '',
      'El rival ha terminado sus acciones. Revisa tranquilamente la mesa y pulsa «EMPEZAR MI TURNO» cuando estés listo para robar y tirar tu dado de Gig.'
    );
    if (!contEnd) return;
    passTurn(gameState, { deferStartPhase: true });
    updateCallback({ ...gameState });
  }
}

/**
 * Resuelve el combate pendiente tras la Fase de Respuesta del Jugador,
 * muestra el resultado antes de continuar, y sigue con los siguientes ataques o fin de turno del bot.
 */
export async function resolvePendingAttackAndContinueBot(gameState, updateCallback, delayMs = 1450, pauseForAck = null) {
  if (!gameState.pendingReaction) return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reaction = gameState.pendingReaction;
  const bot = gameState.bot;
  const player = gameState.player;
  const attackerUnit = (bot.field || []).find((u) => u.instanceId === reaction.attackerUnitId);
  const logLenBeforeCombat = (gameState.actionLog || []).length;
  const snapBeforeCombat = captureBotActionSnapshot(gameState);

  if (attackerUnit) {
    if (reaction.targetType === 'GIGS') {
      if (reaction.blockerUnitId) {
        const blocker = (player.field || []).find((u) => u.instanceId === reaction.blockerUnitId);
        if (blocker) {
          if (!reaction.blockerAlreadyCommitted) {
            blocker.isSpent = true;
            gameState.actionLog.unshift(
              `🛡️ ¡BLOCKER! "${blocker.name}" intercepta el ataque a tus Gigs. ¡No se roba ningún Gig!`
            );
            executeCardSpentTriggers(gameState, 'player', blocker);
            executeBlockerUsedTrigger(gameState, 'player', blocker);
          }
          resolveFight(gameState, 'bot', attackerUnit, 'player', blocker);
        }
      } else {
        attackRivalGigs(gameState, 'bot', attackerUnit.instanceId);
      }
    } else if (reaction.targetType === 'UNIT') {
      fightRivalUnit(
        gameState,
        'bot',
        attackerUnit.instanceId,
        reaction.targetUnitId,
        reaction.blockerUnitId,
        Boolean(reaction.blockerAlreadyCommitted)
      );
    }
    recordBotActionArrows(snapBeforeCombat, gameState, {
      actionType: 'COMBAT_RESULT',
      card: attackerUnit,
      sourceAnchor: [attackerUnit.instanceId, 'bot-trash', 'bot-pill']
    });
  }

  gameState.pendingReaction = null;
  updateCallback({ ...gameState });

  if (gameState.isGameOver) return;

  const combatLogs = (gameState.actionLog || [])
    .slice(0, Math.max(0, (gameState.actionLog || []).length - logLenBeforeCombat))
    .reverse();

  // Continuar con los siguientes ataques del bot si tiene más unidades listas que quieran atacar
  const remainingReadyUnits = (bot.field || []).filter((u) => canUnitAttack(u, bot, gameState));
  if (remainingReadyUnits.length > 0) {
    if (typeof pauseForAck === 'function') {
      const ack = await pauseForAck({
        actionType: 'COMBAT_RESULT',
        card: attackerUnit || null,
        targetName: reaction.targetName || '',
        subtitle: 'Combate resuelto. Revisa la mesa antes de la siguiente acción del rival.',
        logs: combatLogs
      });
      if (ack?.cancelled || gameState.isGameOver || gameState.activePlayer !== 'bot') return;
      if (ack?.autoSkipped) await wait(Math.max(1250, delayMs));
    } else {
      await wait(delayMs);
    }
    return runBotTurn(gameState, updateCallback, delayMs, pauseForAck);
  } else {
    if (typeof pauseForAck === 'function') {
      const ack = await pauseForAck({
        actionType: 'END_BOT_TURN',
        card: null,
        targetName: '',
        subtitle:
          'Combate resuelto y fin del turno rival. Revisa la mesa tranquilamente y pulsa «EMPEZAR MI TURNO» para robar y tirar tu dado de Gig.',
        logs: combatLogs
      });
      if (ack?.cancelled || gameState.isGameOver || gameState.activePlayer !== 'bot') return;
      if (ack?.autoSkipped) await wait(Math.max(1150, Math.round(delayMs * 0.85)));
    } else {
      await wait(delayMs);
    }
    passTurn(gameState, { deferStartPhase: true });
    updateCallback({ ...gameState });
  }
}
