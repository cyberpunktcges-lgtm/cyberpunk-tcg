/**
 * botAi.js
 * Inteligencia Artificial táctica para el Bot de Cyberpunk TCG
 * Respeta el reglamento oficial: costes de 1 €$ para llamar leyendas, palabras clave
 * (Blocker, Adrenaline, Go Solo), tabla de robo de Gigs por poder y resolución de empates.
 */

import {
  getAvailableEddies,
  sellCardForEddies,
  playCard,
  playUnitCard,
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
  canUnitAttack,
  executeStartPhase
} from './cyberpunkEngine.js';
import { executeUnitAttackTrigger, executeBlockerUsedTrigger, executeCardSpentTriggers } from './cardEffects.js';

/**
 * Decide si el bot desea interceptar un ataque del jugador usando una de sus unidades con Blocker.
 */
export function decideBotBlocker(botState, attackerPower, isGigAttack = false) {
  // REGLA OFICIAL: Las unidades con Blocker pueden bloquear aunque tengan Lag (solo deben estar Ready/no giradas)
  const readyBlockers = (botState.field || []).filter(
    (u) => !u.isSpent && hasKeyword(u, 'Blocker')
  );

  if (readyBlockers.length === 0) return null;

  // Si es un ataque a los Gigs del bot, bloquear es prioritario si el atacante va a robar Gigs valiosos
  if (isGigAttack) {
    // Escoger el mejor blocker (el que pueda empatar o sobrevivir, o el más débil si salva el Gig)
    const winningBlocker = readyBlockers.find((b) => (b.currentPower || 0) >= attackerPower);
    if (winningBlocker) return winningBlocker;
    // Si no tiene ganador pero el atacante roba Gigs, bloquear con el más débil si le quedan pocos gigs
    if (calculateGigsToSteal(attackerPower) >= 1 && botState.gigs.length <= 4) {
      return [...readyBlockers].sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0))[0];
    }
  } else {
    // Si ataca una unidad enemiga, bloquear si el blocker gana al atacante
    const winningBlocker = readyBlockers.find((b) => (b.currentPower || 0) > attackerPower);
    if (winningBlocker) return winningBlocker;
  }

  return null;
}

/**
 * Evalúa y ejecuta la Fase de Respuesta (React Phase) del Bot cuando el Jugador declara un ataque:
 * REGLAS OFICIALES:
 * 1. Puede bloquear con una unidad (Blocker)
 * 2. Puede llamar a una leyenda (si no ha llamado este turno y tiene 1 €$)
 * 3. Puede jugar cartas o efectos con Quick
 */
export function executeBotReaction(gameState, attackerUnit, targetType, targetUnitId = null) {
  const bot = gameState.bot;
  let chosenBlocker = null;

  // 1. Evaluar si el Bot llama a una Leyenda durante su reacción
  // REGLA OFICIAL: Al hacer call a la leyenda se da la vuelta a la carta;
  // si está girada se queda girada, y si no, se queda enderezada.
  if (!bot.hasCalledLegendThisTurn) {
    const uncalledLeg = (bot.legends || []).find((l) => !l.isFaceUp);
    const capacity = getBotMaxCapacity(bot);
    if (uncalledLeg && capacity >= 1) {
      botPrepareEddies(bot, 1, uncalledLeg.instanceId);
      callLegendFaceUp(gameState, 'bot', uncalledLeg.instanceId);
      gameState.actionLog.unshift(
        `👑 [FASE 2: REACCIÓN] ¡CALL! El rival responde llamando a su Leyenda "${uncalledLeg.name}" boca arriba.`
      );
    }
  }

  // 2. Evaluar si el Bot juega un Programa con Quick
  const quickCards = (bot.hand || []).filter(
    (c) => hasKeyword(c, 'Quick') && (c.parsedCost || 0) <= getBotMaxCapacity(bot)
  );
  if (quickCards.length > 0) {
    const qCard = quickCards[0];
    botPrepareEddies(bot, qCard.parsedCost || 0);
    playCard(gameState, 'bot', qCard.instanceId);
    gameState.actionLog.unshift(
      `⚡ [FASE 2: REACCIÓN] ¡QUICK! El rival responde jugando "${qCard.name}".`
    );
  }

  // 3. Evaluar si el Bot intercepta con una unidad Blocker
  const isGigAttack = targetType === 'GIGS';
  chosenBlocker = decideBotBlocker(bot, attackerUnit.currentPower, isGigAttack);

  if (chosenBlocker) {
    chosenBlocker.isSpent = true;
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

/**
 * Ayudante para que la IA gire automáticamente sus cartas de Eddies o Leyendas
 * para reunir la cantidad necesaria de Eddies en bot.floatingEddies antes de pagar una acción.
 */
function botPrepareEddies(bot, neededAmount, preserveLegendId = null) {
  let current = bot.floatingEddies || 0;
  if (current >= neededAmount) return true;

  // 1. Girar cartas de Eddies del bot
  for (const ed of (bot.eddies || [])) {
    if (current >= neededAmount) break;
    if (!ed.isSpent) {
      ed.isSpent = true;
      current++;
    }
  }

  // 2. Si todavía faltan, girar Leyendas del bot (evitando girar la leyenda que se desea llamar si hay otras opciones)
  if (current < neededAmount) {
    for (const leg of (bot.legends || [])) {
      if (current >= neededAmount) break;
      if (!leg.isSpent && leg.instanceId !== preserveLegendId) {
        leg.isSpent = true;
        current++;
      }
    }
    // Si aún falta y la única opción es la leyenda preservada
    if (current < neededAmount && preserveLegendId) {
      const presLeg = (bot.legends || []).find((l) => l.instanceId === preserveLegendId && !l.isSpent);
      if (presLeg) {
        presLeg.isSpent = true;
        current++;
      }
    }
  }

  bot.floatingEddies = current;
  return current >= neededAmount;
}

function getBotMaxCapacity(bot) {
  const current = bot.floatingEddies || 0;
  const readyEddies = (bot.eddies || []).filter((e) => !e.isSpent).length;
  const readyLegends = (bot.legends || []).filter((l) => !l.isSpent).length;
  return current + readyEddies + readyLegends;
}

/**
 * Ejecuta el turno del Bot paso a paso con pequeños retrasos para que el jugador
 * pueda observar las acciones en pantalla.
 */
export async function runBotTurn(gameState, updateCallback, delayMs = 700) {
  if (gameState.isGameOver || gameState.activePlayer !== 'bot') return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const bot = gameState.bot;
  const player = gameState.player;

  // Salvaguarda de Turno 1: si el bot empieza la partida y aún no se ejecutó su Fase de Inicio (0 dados lanzados), lanzarla ahora
  if (gameState.turnNumber === 1 && (bot.gigs || []).length === 0 && (bot.fixerDice || []).length === 6) {
    executeStartPhase(gameState, 'bot');
    updateCallback({ ...gameState });
  }

  // Paso 1: Si tiene cartas en mano y aún no ha vendido este turno, vender una carta vendible (Programas, Gears o Flathead)
  if (bot.hand.length > 0 && !bot.hasSoldThisTurn) {
    const vendibleCards = bot.hand.filter((c) => isCardVendible(c));
    if (vendibleCards.length > 0) {
      // Priorizar vender un programa o gear prescindible
      const cardToSell =
        vendibleCards.find((c) => (c.parsedCost || 0) >= 4) ||
        vendibleCards[vendibleCards.length - 1];
      if (cardToSell) {
        await wait(delayMs);
        sellCardForEddies(gameState, 'bot', cardToSell.instanceId);
        updateCallback({ ...gameState });
      }
    }
  }

  // Paso 2: Llamar a una leyenda boca arriba si tiene alguna boca abajo y puede pagar el coste oficial de 1 €$
  const faceDownLegend = bot.legends.find((l) => !l.isFaceUp);
  if (faceDownLegend && !bot.hasCalledLegendThisTurn) {
    const maxCapacity = getBotMaxCapacity(bot);
    if (maxCapacity >= 1) {
      await wait(delayMs);
      botPrepareEddies(bot, 1, faceDownLegend.instanceId);
      callLegendFaceUp(gameState, 'bot', faceDownLegend.instanceId);
      updateCallback({ ...gameState });
    }
  }

  // Paso 2.B: Si tiene una leyenda boca arriba con Go Solo disponible y suficiente capacidad, activar Go Solo
  const goSoloLegend = (bot.legends || []).find(
    (l) =>
      !l.isOnField &&
      !l.isRemovedFromGame &&
      l.isFaceUp &&
      hasKeyword(l, 'Go Solo')
  );
  if (goSoloLegend) {
    const cost = goSoloLegend.parsedCost || parseCardCost(goSoloLegend.cost) || goSoloLegend.costNum || 0;
    const maxCapacity = getBotMaxCapacity(bot);
    if (cost > 0 && maxCapacity >= cost) {
      await wait(delayMs);
      botPrepareEddies(bot, cost);
      playLegendToField(gameState, 'bot', goSoloLegend.instanceId, true);
      updateCallback({ ...gameState });
    }
  }

  // Paso 3: Jugar cartas desde la mano (priorizando mayor relación poder/coste)
  let keepPlaying = true;
  while (keepPlaying && !gameState.isGameOver) {
    const maxCapacity = getBotMaxCapacity(bot);
    const playableCards = bot.hand
      .filter((c) => (c.parsedCost || 0) <= maxCapacity)
      .sort((a, b) => (b.parsedPower || 0) - (a.parsedPower || 0)); // Priorizar la más fuerte

    if (playableCards.length > 0) {
      await wait(delayMs);
      const chosenCard = playableCards[0];
      botPrepareEddies(bot, chosenCard.parsedCost || 0);
      const res = playCard(gameState, 'bot', chosenCard.instanceId);
      if (res.success) {
        updateCallback({ ...gameState });
      } else {
        keepPlaying = false;
      }
    } else {
      keepPlaying = false;
    }
  }

  // Paso 4: Fase de Ataques con Unidades Listas (Ready, sin Lag y sin restricciones de ataque)
  const readyUnits = (bot.field || [])
    .filter((u) => canUnitAttack(u, bot, gameState))
    .sort((a, b) => (b.mustAttackNextTurn ? 1 : 0) - (a.mustAttackNextTurn ? 1 : 0));

  for (const unit of readyUnits) {
    if (gameState.isGameOver) break;

    // Prioridad A: Destruir unidades enemigas giradas (Spent) donde el bot gana o empata favorablemente
    const killableSpentEnemy = (player.field || []).find(
      (pu) => pu.isSpent && (pu.currentPower || 0) < (unit.currentPower || 0)
    );

    if (killableSpentEnemy && canUnitAttack(unit, bot, gameState, 'UNIT')) {
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeUnitAttackTrigger(gameState, 'bot', unit);

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
      return; // Cede el control y espera la respuesta del jugador humano en la UI
    }

    // Prioridad B: Atacar los Gigs del jugador para robar dados de Gig según la tabla de poder
    if (player.gigs && player.gigs.length > 0 && canUnitAttack(unit, bot, gameState, 'GIGS')) {
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeUnitAttackTrigger(gameState, 'bot', unit);

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
      return; // Cede el control y espera la respuesta del jugador humano en la UI
    }

    // Prioridad C: Empate contra unidad girada enemiga si es de alto poder
    const tieEnemy = (player.field || []).find(
      (pu) => pu.isSpent && (pu.currentPower || 0) === (unit.currentPower || 0) && (pu.currentPower || 0) >= 4
    );
    if (tieEnemy && canUnitAttack(unit, bot, gameState, 'UNIT')) {
      unit.isSpent = true;
      unit.hasTriggeredAttackThisDeclaration = true;
      executeUnitAttackTrigger(gameState, 'bot', unit);

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

  // Paso 5: Finalizar turno si no quedan más ataques y devolver control al Jugador (Start Phase del Jugador)
  await wait(delayMs);
  passTurn(gameState);
  updateCallback({ ...gameState });
}

/**
 * Resuelve el combate pendiente tras la Fase de Respuesta del Jugador,
 * y continúa con los siguientes ataques del bot o finaliza el turno del bot.
 */
export async function resolvePendingAttackAndContinueBot(gameState, updateCallback, delayMs = 700) {
  if (!gameState.pendingReaction) return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reaction = gameState.pendingReaction;
  const bot = gameState.bot;
  const player = gameState.player;
  const attackerUnit = (bot.field || []).find((u) => u.instanceId === reaction.attackerUnitId);

  if (attackerUnit) {
    if (reaction.targetType === 'GIGS') {
      if (reaction.blockerUnitId) {
        const blocker = (player.field || []).find((u) => u.instanceId === reaction.blockerUnitId);
        if (blocker) {
          blocker.isSpent = true;
          gameState.actionLog.unshift(
            `🛡️ ¡BLOCKER! "${blocker.name}" intercepta el ataque a tus Gigs. ¡No se roba ningún Gig!`
          );
          executeCardSpentTriggers(gameState, 'player', blocker);
          executeBlockerUsedTrigger(gameState, 'player', blocker);
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
        reaction.blockerUnitId
      );
    }
  }

  gameState.pendingReaction = null;
  updateCallback({ ...gameState });

  if (gameState.isGameOver) return;

  await wait(delayMs);

  // Continuar con los siguientes ataques del bot si tiene más unidades listas
  const remainingReadyUnits = (bot.field || []).filter((u) => canUnitAttack(u, bot, gameState));
  if (remainingReadyUnits.length > 0) {
    return runBotTurn(gameState, updateCallback, delayMs);
  } else {
    passTurn(gameState);
    updateCallback({ ...gameState });
  }
}
