/**
 * botAi.js
 * Inteligencia Artificial táctica para el Bot de Cyberpunk TCG
 * Toma decisiones en base al estado del juego, Eddies disponibles y prioridades de combate.
 */

import {
  getAvailableEddies,
  sellCardForEddies,
  playUnitCard,
  callLegendFaceUp,
  attackRivalGigs,
  fightRivalUnit,
  passTurn
} from './cyberpunkEngine.js';

/**
 * Ejecuta el turno del Bot paso a paso con pequeños retrasos para que el jugador
 * pueda observar las acciones en pantalla.
 */
export async function runBotTurn(gameState, updateCallback, delayMs = 700) {
  if (gameState.isGameOver || gameState.activePlayer !== 'bot') return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const bot = gameState.bot;
  const player = gameState.player;

  // Paso 1: Llamar a una leyenda si tiene alguna boca abajo
  const faceDownLegend = bot.legends.find((l) => !l.isFaceUp);
  if (faceDownLegend && !bot.hasCalledLegendThisTurn) {
    await wait(delayMs);
    callLegendFaceUp(gameState, 'bot', faceDownLegend.instanceId);
    updateCallback({ ...gameState });
  }

  // Paso 2: Si tiene cartas en mano y aún no ha vendido este turno, vender la más cara o prescindible
  if (bot.hand.length > 0 && !bot.hasSoldThisTurn) {
    // Si tiene más de 3 cartas, vende la de mayor coste o una no-unidad
    const cardToSell = bot.hand.find((c) => (c.parsedCost || 0) >= 6) || bot.hand[0];
    if (cardToSell) {
      await wait(delayMs);
      sellCardForEddies(gameState, 'bot', cardToSell.instanceId);
      updateCallback({ ...gameState });
    }
  }

  // Paso 3: Jugar la mejor unidad que pueda pagar
  let keepPlaying = true;
  while (keepPlaying && !gameState.isGameOver) {
    const availableEddies = getAvailableEddies(bot);
    const playableUnits = bot.hand
      .filter((c) => (c.parsedCost || 0) <= availableEddies)
      .sort((a, b) => (b.parsedPower || 0) - (a.parsedPower || 0)); // Priorizar la más fuerte

    if (playableUnits.length > 0) {
      await wait(delayMs);
      const chosenUnit = playableUnits[0];
      const res = playUnitCard(gameState, 'bot', chosenUnit.instanceId);
      if (res.success) {
        updateCallback({ ...gameState });
      } else {
        keepPlaying = false;
      }
    } else {
      keepPlaying = false;
    }
  }

  // Paso 4: Fase de Ataques con Unidades Listas (Ready y sin Lag)
  const readyUnits = bot.field.filter((u) => !u.isSpent && !u.isLagging);

  for (const unit of readyUnits) {
    if (gameState.isGameOver) break;
    await wait(delayMs);

    // Prioridad A: Si el jugador tiene una unidad girada (Spent) con menor o igual poder, atacarla
    const killableSpentEnemy = player.field.find(
      (pu) => pu.isSpent && (pu.currentPower || 0) <= unit.currentPower
    );

    if (killableSpentEnemy) {
      fightRivalUnit(gameState, 'bot', unit.instanceId, killableSpentEnemy.instanceId);
      updateCallback({ ...gameState });
      continue;
    }

    // Prioridad B: Atacar los Gigs del jugador para robar un dado de Gig
    if (player.gigs.length > 0) {
      attackRivalGigs(gameState, 'bot', unit.instanceId);
      updateCallback({ ...gameState });
      continue;
    }
  }

  // Paso 5: Finalizar turno y devolver control al Jugador
  await wait(delayMs);
  passTurn(gameState);
  updateCallback({ ...gameState });
}
