/**
 * botAi.js
 * Inteligencia Artificial táctica para el Bot de Cyberpunk TCG
 * Respeta el reglamento oficial: costes de 1 €$ para llamar leyendas, palabras clave
 * (Blocker, Adrenaline, Go Solo), tabla de robo de Gigs por poder y resolución de empates.
 */

import {
  getAvailableEddies,
  sellCardForEddies,
  playUnitCard,
  callLegendFaceUp,
  attackRivalGigs,
  fightRivalUnit,
  passTurn,
  hasKeyword,
  calculateGigsToSteal,
  isCardVendible
} from './cyberpunkEngine.js';

/**
 * Decide si el bot desea interceptar un ataque del jugador usando una de sus unidades con Blocker.
 */
export function decideBotBlocker(botState, attackerPower, isGigAttack = false) {
  const readyBlockers = botState.field.filter(
    (u) => !u.isSpent && !u.isLagging && hasKeyword(u, 'Blocker')
  );

  if (readyBlockers.length === 0) return null;

  // Si es un ataque a los Gigs del bot, bloquear es prioritario si el atacante va a robar Gigs valiosos
  if (isGigAttack) {
    // Escoger el mejor blocker (el que pueda empatar o sobrevivir, o el más prescindible para salvar el Gig)
    const winningBlocker = readyBlockers.find((b) => (b.currentPower || 0) >= attackerPower);
    if (winningBlocker) return winningBlocker;
    // Si no tiene ganador, pero el atacante roba 2 o más Gigs, sacrificar el blocker más débil para anular el robo
    if (calculateGigsToSteal(attackerPower) >= 1 && botState.gigs.length <= 3) {
      return readyBlockers.sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0))[0];
    }
  }

  return null;
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
    const availableEddies = getAvailableEddies(bot);
    if (availableEddies >= 1) {
      await wait(delayMs);
      callLegendFaceUp(gameState, 'bot', faceDownLegend.instanceId);
      updateCallback({ ...gameState });
    }
  }

  // Paso 3: Jugar unidades desde la mano (priorizando mayor relación poder/coste)
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

    // Prioridad A: Destruir unidades enemigas giradas (Spent) donde el bot gana o empata favorablemente
    const killableSpentEnemy = player.field.find(
      (pu) => pu.isSpent && (pu.currentPower || 0) < (unit.currentPower || 0)
    );

    if (killableSpentEnemy) {
      fightRivalUnit(gameState, 'bot', unit.instanceId, killableSpentEnemy.instanceId);
      updateCallback({ ...gameState });
      continue;
    }

    // Prioridad B: Atacar los Gigs del jugador para robar dados de Gig según la tabla de poder
    if (player.gigs.length > 0) {
      // Comprobar si el jugador tiene Blocker listo
      const playerBlocker = player.field.find(
        (u) => !u.isSpent && !u.isLagging && hasKeyword(u, 'Blocker')
      );

      // Si el jugador tiene blocker con poder superior, evitar suicidarse a menos que el bot tenga ventaja
      if (playerBlocker && (playerBlocker.currentPower || 0) > (unit.currentPower || 0)) {
        // Atacar unidad enemiga o pasar
        const tieSpentEnemy = player.field.find(
          (pu) => pu.isSpent && (pu.currentPower || 0) === (unit.currentPower || 0)
        );
        if (tieSpentEnemy) {
          fightRivalUnit(gameState, 'bot', unit.instanceId, tieSpentEnemy.instanceId);
          updateCallback({ ...gameState });
          continue;
        }
      }

      attackRivalGigs(gameState, 'bot', unit.instanceId);
      updateCallback({ ...gameState });
      continue;
    }

    // Prioridad C: Empate contra unidad girada enemiga si es de alto poder
    const tieEnemy = player.field.find(
      (pu) => pu.isSpent && (pu.currentPower || 0) === (unit.currentPower || 0) && (pu.currentPower || 0) >= 4
    );
    if (tieEnemy) {
      fightRivalUnit(gameState, 'bot', unit.instanceId, tieEnemy.instanceId);
      updateCallback({ ...gameState });
      continue;
    }
  }

  // Paso 5: Finalizar turno y devolver control al Jugador (Start Phase del Jugador)
  await wait(delayMs);
  passTurn(gameState);
  updateCallback({ ...gameState });
}
