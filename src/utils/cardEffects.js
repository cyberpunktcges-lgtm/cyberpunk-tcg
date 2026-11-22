/**
 * MOTOR DE EFECTOS Y REGLAS DE CARTAS DE CYBERPUNK TCG (SET 01: WELCOME TO NIGHT CITY)
 * Contiene el catálogo oficial completo de las 151 cartas y los manejadores
 * de lógica para Programas, Unidades (On-Play, On-Attack, Combate, Derrota),
 * Leyendas (Call, ↷ Spend) y Gears.
 */

import allCardRules from '../data/allCardRules.json' with { type: 'json' };
import { executeCardActivatedAbility, getCardActivatedAbilities } from './activatedAbilities.js';

export const CARD_RULES_TEXT = allCardRules;

/**
 * Retorna el texto de reglas oficial de una carta según su ID, slug o nombre.
 */
export function getCardRulesText(card) {
  if (!card) return '';
  if (card.rulesText) return card.rulesText;
  if (CARD_RULES_TEXT[card.id]?.rulesText) return CARD_RULES_TEXT[card.id].rulesText;

  // Búsqueda por coincidencia normalizada de nombre
  const clean = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const cName = clean(card.name);
  const entry = Object.values(CARD_RULES_TEXT).find((item) => clean(item.name) === cName);
  return entry ? entry.rulesText : (card.ability || '');
}

/**
 * Resuelve de forma infalible el ID canónico (CP-XXX) de una carta por id, slug o nombre normalizado.
 */
export function resolveCardId(card) {
  if (!card) return '';
  const rawId = String(card.id || '').toUpperCase().trim();
  if (rawId && CARD_RULES_TEXT[rawId]) return rawId;

  const slug = String(card.slug || '').toLowerCase().trim();
  if (slug) {
    const bySlug = Object.values(CARD_RULES_TEXT).find((item) => item.slug === slug);
    if (bySlug) return bySlug.id;
  }

  const clean = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const cName = clean(card.name);
  if (cName) {
    const byName = Object.values(CARD_RULES_TEXT).find((item) => clean(item.name) === cName);
    if (byName) return byName.id;
  }

  return rawId;
}

/**
 * Obtiene el coste numérico exacto en Eddies de una carta (evita errores de comparación con strings como "2 EDDIES").
 */
export function getNumericCost(card) {
  if (!card) return 0;
  if (typeof card.parsedCost === 'number' && !Number.isNaN(card.parsedCost)) return card.parsedCost;
  if (typeof card.costNum === 'number' && !Number.isNaN(card.costNum)) return card.costNum;
  const match = String(card.cost || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function isProgramCard(c) {
  if (!c) return false;
  const ot = String(c.officialType || '').toUpperCase();
  const ct = String(c.cardType || c.type || '').toUpperCase();
  return ot === 'PROGRAM' || ct.includes('PROGRAM');
}

function isGearCard(c) {
  if (!c) return false;
  const ot = String(c.officialType || '').toUpperCase();
  const ct = String(c.cardType || c.type || '').toUpperCase();
  return ot === 'GEAR' || ct.includes('GEAR');
}

function isUnitCard(c) {
  if (!c) return false;
  if (c.isUnit || c.isLegendUnit) return true;
  const ot = String(c.officialType || '').toUpperCase();
  const ct = String(c.cardType || c.type || '').toUpperCase();
  return ot === 'UNIT' || (ct.includes('UNIT') && !ct.includes('LEGEND'));
}

function countGigValuePairs(gigs = []) {
  const counts = {};
  gigs.forEach((g) => {
    const v = Number(g.value);
    if (!Number.isNaN(v)) counts[v] = (counts[v] || 0) + 1;
  });
  let pairs = 0;
  Object.values(counts).forEach((cnt) => {
    pairs += Math.floor(cnt / 2);
  });
  return pairs;
}

/**
 * Helper para robar N cartas del mazo de un jugador
 */
function drawCards(player, count, state, sourceName) {
  if (!player.deck || player.deck.length === 0) return [];
  const drawn = player.deck.splice(0, Math.min(count, player.deck.length));
  if (!player.hand) player.hand = [];
  drawn.forEach((c) => {
    c.isJustDrawn = true;
  });
  player.hand.push(...drawn);
  state.actionLog.unshift(
    `🃏 [${sourceName}] ${player.name} roba ${drawn.length} carta(s): ${drawn.map((c) => c.name).join(', ')}.`
  );
  return drawn;
}

/**
 * Helper para descartar N cartas de la mano.
 * Si afecta al jugador humano y debe descartar menos cartas de las que tiene en mano, abre el selector interactivo.
 */
function discardCards(player, count, state, sourceName, sourceCardImage = null) {
  if (!player.hand || player.hand.length === 0 || count <= 0) return [];
  const actualCount = Math.min(count, player.hand.length);
  if (state && player === state.player && actualCount < player.hand.length && !state.pendingCardChoice) {
    state.pendingCardChoice = {
      type: 'FORCED_DISCARD_HAND',
      playerKey: 'player',
      sourceCardName: sourceName || 'Descarte',
      sourceCardImage,
      title: `🗑️ ${(sourceName || 'DESCARTE').toUpperCase()} // ELEGIR DESCARTE`,
      prompt: `Por efecto de "${sourceName}", debes elegir ${actualCount} carta(s) de tu mano para descartarla(s) a tu Basura (Trash):`,
      cards: [...player.hand],
      eligibleIds: player.hand.map((c) => c.instanceId),
      maxChoices: actualCount,
      minChoices: actualCount,
      selectedIds: [],
      filterDescription: `Elige exactamente ${actualCount} carta(s) de tu mano para descartar`
    };
    state.actionLog.unshift(
      `🗑️ [${sourceName}] ${player.name} debe elegir ${actualCount} carta(s) de su mano para descartar.`
    );
    return [];
  }
  const discarded = player.hand.splice(0, actualCount);
  if (!player.trash) player.trash = [];
  player.trash.push(...discarded);
  state.actionLog.unshift(
    `🗑️ [${sourceName}] ${player.name} descarta ${discarded.length} carta(s): ${discarded.map((c) => c.name).join(', ')}.`
  );
  return discarded;
}

/**
 * Helper para enviar las N cartas superiores del mazo al Trash (Trash N)
 */
function trashFromDeck(player, count, state, sourceName) {
  if (!player.deck || player.deck.length === 0) return [];
  const trashed = player.deck.splice(0, Math.min(count, player.deck.length));
  if (!player.trash) player.trash = [];
  player.trash.push(...trashed);
  state.actionLog.unshift(
    `☣️ [${sourceName}] ${player.name} envía ${trashed.length} carta(s) del mazo a la Basura: ${trashed.map((c) => c.name).join(', ')}.`
  );
  return trashed;
}

/**
 * Devuelve el valor máximo de caras de un dado de Gig (d4 -> 4, d6 -> 6, ..., d20 -> 20).
 */
export function getGigMaxFace(gig) {
  const dieStr = String(gig?.die || gig?.dieType || 'd20');
  return parseInt(dieStr.replace(/\D/g, ''), 10) || 20;
}

/**
 * Encola una selección interactiva de objetivos (Kiroshi Targeting System) para que múltiples
 * disparos de dados (ej: Dexter + Dying Night + Zetatech Faceplate) nunca se sobrescriban.
 */
export function queueTargetSelection(state, selection) {
  if (!state || !selection) return;
  if (!state.pendingTargetSelection) {
    state.pendingTargetSelection = selection;
  } else {
    if (!Array.isArray(state.pendingTargetSelectionQueue)) {
      state.pendingTargetSelectionQueue = [];
    }
    state.pendingTargetSelectionQueue.push(selection);
  }
}

/**
 * CP-075 Meredith Stout // Stone-Cold Corpo:
 * "When a Rival adjusts or swaps 1 or more friendly Gigs, you may add a card from your trash to your hand."
 */
export function triggerMeredithStoutOnRivalGigModify(state, affectedOwnerKey) {
  if (!state || !affectedOwnerKey) return;
  const owner = state[affectedOwnerKey];
  if (!owner || !owner.trash || owner.trash.length === 0) return;
  const merediths = (owner.field || []).filter((u) => resolveCardId(u) === 'CP-075');
  if (merediths.length === 0) return;

  if (affectedOwnerKey === 'player') {
    if (!state.pendingCardChoice) {
      state.pendingCardChoice = {
        type: 'MEREDITH_TRASH_TO_HAND',
        playerKey: 'player',
        sourceCardId: 'CP-075',
        sourceCardName: 'Meredith Stout // Stone-Cold Corpo',
        sourceCardImage: merediths[0].image,
        title: '💼 MEREDITH STOUT // REACCIÓN A GIG MODIFICADO',
        prompt: '¡El rival ajustó o intercambió uno de tus Gigs! Puedes añadir 1 carta de tu Basura (Trash) a tu mano (o omitir):',
        cards: [...owner.trash],
        eligibleIds: owner.trash.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: 0,
        selectedIds: [],
        filterDescription: 'Cualquier carta de tu Basura (opcional)'
      };
    }
  } else {
    const recovered = owner.trash.pop();
    if (recovered) {
      if (!owner.hand) owner.hand = [];
      owner.hand.push(recovered);
      state.actionLog.unshift(
        `💼 [Meredith Stout Rival] ¡Reacción! Al modificar su Gig, recupera "${recovered.name}" de su Basura a su mano.`
      );
    }
  }
}

/**
 * Disparadores cuando una Unidad o Leyenda aliada es girada (spent):
 * - CP-151 Zetatech Faceplate: "When this Unit or Legend is spent, adjust a Gig by up to 1. Then, if you control 3 or more Gigs with different values, draw 1."
 * - CP-007 Alt Cunningham // Mother of Daemons: "When a friendly equipped Unit or Legend is spent, draw 1."
 */
export function executeCardSpentTriggers(state, playerKey, spentCard) {
  if (!state || !spentCard) return;
  const p = state[playerKey];
  const opp = state[playerKey === 'player' ? 'bot' : 'player'];
  if (!p) return;

  const equippedGears = spentCard.gear || [];
  // CP-007 Alt Cunningham // Mother of Daemons (en campo)
  if (equippedGears.length > 0) {
    const alts = (p.field || []).filter((u) => resolveCardId(u) === 'CP-007');
    alts.forEach(() => {
      drawCards(p, 1, state, 'Alt Cunningham // Mother of Daemons');
    });
  }

  // CP-151 Zetatech Faceplate (en los gears equipados a la carta girada)
  const faceplates = equippedGears.filter((g) => resolveCardId(g) === 'CP-151');
  if (faceplates.length === 0) return;

  const totalGigs = (p.gigs || []).length + (opp?.gigs || []).length;
  faceplates.forEach((gearCard) => {
    if (totalGigs === 0) {
      state.actionLog.unshift(
        `🎭 [Zetatech Faceplate] "${spentCard.name}" fue girada, pero no hay Gigs en juego para ajustar.`
      );
      return;
    }
    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'ADJUST_GIG',
        sourceCardId: 'CP-151',
        sourceCardName: 'Zetatech Faceplate',
        sourceCardImage: gearCard.image || spentCard.image,
        title: '🎭 ZETATECH FACEPLATE // AL GIRAR PORTADOR',
        prompt: `"${spentCard.name}" ha sido girada. Elige cualquier Gig en juego para ajustarlo en +1, -1 o dejarlo igual (si controlas 3+ Gigs con valores distintos, robas 1 carta):`,
        canIncrease: true,
        canDecrease: true,
        maxDelta: 1,
        allowZero: true,
        secondaryEffect: 'ZETATECH_3_DIFF_DRAW'
      });
    } else {
      const targetGig = (p.gigs || [])[0];
      if (targetGig) {
        const maxFace = getGigMaxFace(targetGig);
        const oldVal = targetGig.value;
        targetGig.value = Math.min(maxFace, (targetGig.value || 1) + 1);
        state.actionLog.unshift(
          `🎭 [Zetatech Faceplate Rival] "${spentCard.name}" girada: ajusta su Gig ${String(targetGig.die || targetGig.dieType || 'GIG').toUpperCase()} de ${oldVal} a ${targetGig.value}.`
        );
      }
      const distinct = new Set((p.gigs || []).map((g) => Number(g.value))).size;
      if (distinct >= 3) {
        drawCards(p, 1, state, 'Zetatech Faceplate Rival');
      }
    }
  });
}

/**
 * Disparadores cuando una Unidad roba 1 o más Gigs del rival:
 * - CP-001 6th Street Recruits: "When a friendly Unit steals a d6, increase a Gig by up to 6."
 * - CP-136 V // Roamer of the Badlands: "When this Unit steals a Gig, increase it by up to 5."
 * - CP-039 Gorilla Arms: "The first time this Unit steals 1 or more Gigs each turn, steal a rival Gig with a value not shared by a friendly Gig."
 */
export function executeOnGigsStolenTriggers(state, attackerPlayerKey, attackerUnit, stolenDice = [], options = {}) {
  if (!state || !attackerUnit || !Array.isArray(stolenDice) || stolenDice.length === 0) return;
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];
  if (!attacker || !defender) return;

  const attackerId = resolveCardId(attackerUnit);

  // 1. CP-136 V // Roamer of the Badlands: "When this Unit steals a Gig, increase it by up to 5."
  if (attackerId === 'CP-136') {
    stolenDice.forEach((stolenDie) => {
      const gigIdx = (attacker.gigs || []).indexOf(stolenDie);
      if (gigIdx === -1) return;
      const maxFace = getGigMaxFace(stolenDie);
      if (attackerPlayerKey === 'player') {
        queueTargetSelection(state, {
          actionType: 'ADJUST_GIG',
          sourceCardId: 'CP-136',
          sourceCardName: 'V // Roamer of the Badlands',
          sourceCardImage: attackerUnit.image,
          title: '🏜️ V // ROAMER OF THE BADLANDS — AUMENTAR GIG ROBADO',
          prompt: `¡V ha robado el dado ${String(stolenDie.die).toUpperCase()} (Valor actual: ${stolenDie.value}/${maxFace})! Elige cuánto aumentarlo (hasta +5, o déjalo igual):`,
          canIncrease: true,
          canDecrease: false,
          maxDelta: 5,
          allowZero: true,
          targetScope: 'SPECIFIC_GIG',
          onlyGig: { owner: 'player', gigIndex: gigIdx, die: String(stolenDie.die).toLowerCase() }
        });
      } else {
        const oldVal = stolenDie.value;
        stolenDie.value = Math.min(maxFace, (stolenDie.value || 1) + 5);
        state.actionLog.unshift(
          `🏜️ [V // Roamer Rival] Aumenta su Gig robado ${String(stolenDie.die).toUpperCase()} de ${oldVal} a ${stolenDie.value}.`
        );
      }
    });
  }

  // 2. CP-001 6th Street Recruits: "When a friendly Unit steals a d6, increase a Gig by up to 6."
  const stolenD6Count = stolenDice.filter((d) => String(d.die || d.dieType || '').toLowerCase() === 'd6').length;
  if (stolenD6Count > 0) {
    const recruits = (attacker.field || []).filter((u) => resolveCardId(u) === 'CP-001');
    recruits.forEach((recruit) => {
      for (let k = 0; k < stolenD6Count; k++) {
        const totalGigs = (attacker.gigs || []).length + (defender.gigs || []).length;
        if (totalGigs === 0) break;
        if (attackerPlayerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'ADJUST_GIG',
            sourceCardId: 'CP-001',
            sourceCardName: '6th Street Recruits',
            sourceCardImage: recruit.image,
            title: '🔫 6TH STREET RECRUITS // ROBO DE D6 (+HASTA 6)',
            prompt: '¡Una Unidad aliada robó un D6! Elige cualquier Gig en juego (tuyo o del rival) para aumentar su valor en hasta +6 (o déjalo igual):',
            canIncrease: true,
            canDecrease: false,
            maxDelta: 6,
            allowZero: true
          });
        } else {
          const targetGig = [...(attacker.gigs || [])]
            .sort((a, b) => (getGigMaxFace(b) - b.value) - (getGigMaxFace(a) - a.value))[0];
          if (targetGig) {
            const oldVal = targetGig.value;
            targetGig.value = Math.min(getGigMaxFace(targetGig), (targetGig.value || 1) + 6);
            state.actionLog.unshift(
              `🔫 [6th Street Recruits Rival] ¡Robo de D6! Aumenta su Gig ${String(targetGig.die).toUpperCase()} de ${oldVal} a ${targetGig.value}.`
            );
          }
        }
      }
    });
  }

  // 3. CP-039 Gorilla Arms: "The first time this Unit steals 1 or more Gigs each turn, steal a rival Gig with a value not shared by a friendly Gig."
  if (!options.isGorillaBonus && !attackerUnit.usedGorillaArmsThisTurn) {
    const gorillaGear = (attackerUnit.gear || []).find((g) => resolveCardId(g) === 'CP-039');
    if (gorillaGear) {
      attackerUnit.usedGorillaArmsThisTurn = true;
      const friendlyVals = new Set((attacker.gigs || []).map((g) => Number(g.value)));
      const eligibleIndices = [];
      (defender.gigs || []).forEach((g, idx) => {
        if (!friendlyVals.has(Number(g.value))) eligibleIndices.push(idx);
      });

      if (eligibleIndices.length === 0) {
        state.actionLog.unshift(
          `🦾 [Gorilla Arms] "${attackerUnit.name}" robó Gig(s), pero el rival no tiene ningún Gig adicional cuyo valor no compartas ya.`
        );
      } else if (attackerPlayerKey === 'player') {
        queueTargetSelection(state, {
          actionType: 'STEAL_RIVAL_GIG',
          sourceCardId: 'CP-039',
          sourceCardName: 'Gorilla Arms',
          sourceCardImage: gorillaGear.image || attackerUnit.image,
          title: '🦾 GORILLA ARMS // ROBO EXTRA DE GIG',
          prompt: `¡Primera vez este turno que "${attackerUnit.name}" roba un Gig! Elige 1 Gig del rival con un valor que NO compartas con tus Gigs para robarlo:`,
          eligibleGigIndices: eligibleIndices,
          attackerUnitId: attackerUnit.instanceId
        });
      } else {
        // Bot AI: roba el Gig elegible del jugador con mayor valor
        let bestIdx = eligibleIndices[0];
        eligibleIndices.forEach((idx) => {
          if ((defender.gigs[idx]?.value || 0) > (defender.gigs[bestIdx]?.value || 0)) bestIdx = idx;
        });
        const [bonusDie] = defender.gigs.splice(bestIdx, 1);
        if (bonusDie) {
          bonusDie.stolenFrom = defenderKey;
          attacker.gigs.push(bonusDie);
          state.actionLog.unshift(
            `🦾 [Gorilla Arms Rival] ¡Robo extra! "${attackerUnit.name}" roba además tu Gig ${String(bonusDie.die).toUpperCase()} (Valor ${bonusDie.value}).`
          );
          if (state.overtime && attacker.gigs.length >= 7) {
            state.isGameOver = true;
            state.winner = attackerPlayerKey;
            state.actionLog.unshift(`🏆 ¡OVERTIME WIN! ${attacker.name} alcanza 7 Gigs y gana la partida.`);
          }
          executeOnGigsStolenTriggers(state, attackerPlayerKey, attackerUnit, [bonusDie], { isGorillaBonus: true });
        }
      }
    }
  }
}

/**
 * CP-051 Jackie Welles // Pour One Out for Me:
 * "The first time you play a Blue Unit or Blue Gear each turn, you may decrease a friendly Gig by up to 2. If it becomes a min Gig, draw 1."
 */
export function executeJackiePourOneOutTrigger(state, playerKey, playedCard) {
  if (!state || !playedCard) return;
  const p = state[playerKey];
  if (!p || p.usedJackiePourOneOutThisTurn) return;

  const isBlue = String(playedCard.aspect || '').toLowerCase() === 'blue';
  const cType = String(playedCard.officialType || playedCard.type || '').toUpperCase();
  const isUnitOrGear = cType.includes('UNIT') || cType.includes('GEAR');
  if (!isBlue || !isUnitOrGear) return;

  const jackie =
    (p.legends || []).find((l) => l.isFaceUp && !l.isRemovedFromGame && resolveCardId(l) === 'CP-051') ||
    (p.field || []).find((u) => resolveCardId(u) === 'CP-051');
  if (!jackie) return;

  p.usedJackiePourOneOutThisTurn = true;
  if (!p.gigs || p.gigs.length === 0) {
    state.actionLog.unshift(
      `🥃 [Jackie Welles] Jugaste tu primera carta Azul del turno ("${playedCard.name}"), pero no controlas Gigs para reducir.`
    );
    return;
  }

  if (playerKey === 'player') {
    queueTargetSelection(state, {
      actionType: 'ADJUST_GIG',
      sourceCardId: 'CP-051',
      sourceCardName: 'Jackie Welles // Pour One Out for Me',
      sourceCardImage: jackie.image,
      title: '🥃 JACKIE WELLES // POUR ONE OUT FOR ME',
      prompt: `¡Primera Unidad o Gear Azul del turno ("${playedCard.name}")! Puedes reducir 1 de TUS Gigs en -1 o -2 (si pasa a ser Gig mínimo [valor 1], robas 1 carta):`,
      targetScope: 'FRIENDLY_GIGS',
      canIncrease: false,
      canDecrease: true,
      maxDelta: 2,
      allowZero: true,
      secondaryEffect: 'JACKIE_MIN_GIG_DRAW'
    });
  } else {
    // Bot AI: prioriza un Gig aliado con valor 2 o 3 para convertirlo en 1 y robar carta
    const idealGig = (p.gigs || []).find((g) => g.value === 2 || g.value === 3);
    if (idealGig) {
      const oldVal = idealGig.value;
      idealGig.value = 1;
      state.actionLog.unshift(
        `🥃 [Jackie Welles Rival] Reduce su Gig ${String(idealGig.die).toUpperCase()} de ${oldVal} a 1 (Gig mínimo) y roba 1 carta.`
      );
      drawCards(p, 1, state, 'Jackie Welles Rival');
    }
  }
}

/**
 * CP-058 Kerry Eurodyne // Axe, Attitude, Audience:
 * "When you roll in a Gig from your fixer area, you may ignore the result and reroll it once.
 *  When you roll a min or max value on a Gig, draw 1. If it's a d20, draw 3 instead."
 */
export function executeKerryGigRollTrigger(state, playerKey, gigIndex, isAfterReroll = false) {
  if (!state) return;
  const p = state[playerKey];
  if (!p || !p.gigs || !p.gigs[gigIndex]) return;

  const kerry =
    (p.legends || []).find((l) => l.isFaceUp && !l.isRemovedFromGame && resolveCardId(l) === 'CP-058') ||
    (p.field || []).find((u) => resolveCardId(u) === 'CP-058');
  if (!kerry) return;

  const gig = p.gigs[gigIndex];
  const dieStr = String(gig.die || 'd20').toLowerCase();
  const maxFace = getGigMaxFace(gig);

  // Paso 1 (antes de repetir tirada): ofrecer al jugador decidir si mantiene o repite tirada 1 vez
  if (!isAfterReroll) {
    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'KERRY_REROLL',
        sourceCardId: 'CP-058',
        sourceCardName: 'Kerry Eurodyne // Axe, Attitude, Audience',
        sourceCardImage: kerry.image,
        title: '🎸 KERRY EURODYNE // REPETIR TIRADA DE GIG',
        prompt: `Has sacado un ${gig.value} en tu dado ${dieStr.toUpperCase()} (Mín: 1 / Máx: ${maxFace}). ¿Quieres mantener este resultado o ignorarlo y volver a tirarlo 1 vez? (Si sacas Mín o Máx robas ${dieStr === 'd20' ? '3 cartas' : '1 carta'}).`,
        gigIndex,
        die: dieStr,
        rolledValue: gig.value,
        maxFace
      });
      return;
    } else {
      // Bot AI: si no es mín ni máx y está por debajo de la mitad, repite 1 vez
      if (gig.value !== 1 && gig.value !== maxFace && gig.value < Math.ceil(maxFace / 2)) {
        const oldVal = gig.value;
        const newVal = Math.floor(Math.random() * maxFace) + 1;
        gig.value = newVal;
        state.actionLog.unshift(
          `🎸 [Kerry Eurodyne Rival] Ignora el ${oldVal} en su ${dieStr.toUpperCase()} y vuelve a tirar: ¡obtiene un ${newVal}!`
        );
      }
    }
  }

  // Paso 2 (resultado final): si es valor mínimo (1) o máximo (maxFace), robar 1 (o 3 si es d20)
  if (gig.value === 1 || gig.value === maxFace) {
    const drawCount = dieStr === 'd20' ? 3 : 1;
    state.actionLog.unshift(
      `🎸 [Kerry Eurodyne] ¡Resultado ${gig.value === 1 ? 'MÍNIMO (1)' : `MÁXIMO (${maxFace})`} en ${dieStr.toUpperCase()}! ${p.name} roba ${drawCount} carta(s).`
    );
    drawCards(p, drawCount, state, 'Kerry Eurodyne // Axe, Attitude, Audience');
  }
}

// =========================================================================
// 1. MOTOR DE PROGRAMAS (34 CARTAS)
// =========================================================================

export function executeProgramEffect(state, playerKey, card) {
  if (!state || !card) return { executed: false };
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = card.id || '';
  const cardName = card.name || 'Programa';

  // CP-005: Afterparty at Lizzie's
  // "Adjust a Gig by up to 1. If you control 2 or more Gigs with different values, draw 1."
  if (cardId === 'CP-005') {
    const totalGigs = (p.gigs || []).length + (opp.gigs || []).length;
    if (totalGigs === 0) {
      state.actionLog.unshift(`🎉 [Afterparty at Lizzie's] No hay Gigs en juego para ajustar.`);
      return { executed: true };
    }
    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'ADJUST_GIG',
        sourceCardId: 'CP-005',
        sourceCardName: "Afterparty at Lizzie's",
        sourceCardImage: card.image,
        title: "🎉 AFTERPARTY AT LIZZIE'S // AJUSTAR GIG",
        prompt: 'Selecciona cualquier Gig (tuyo o del rival) y elige ajustarlo en +1, -1 o dejarlo igual:',
        maxDelta: 1,
        canIncrease: true,
        canDecrease: true,
        allowZero: true,
        secondaryEffect: 'AFTERPARTY_DRAW'
      });
    } else {
      if (p.gigs && p.gigs.length > 0) {
        const g = p.gigs[0];
        g.value = Math.min(getGigMaxFace(g), (g.value || 1) + 1);
        state.actionLog.unshift(`🎉 [Afterparty at Lizzie's Rival] Ajusta su Gig ${String(g.die).toUpperCase()} a ${g.value}.`);
      }
      const values = (p.gigs || []).map((g) => g.value);
      if (new Set(values).size >= 2) {
        drawCards(p, 1, state, cardName);
      }
    }
    return { executed: true };
  }

  // CP-006: All Is Lost
  // "Trash 3. Add a Unit from among them to your hand."
  if (cardId === 'CP-006') {
    const trashed = trashFromDeck(p, 3, state, cardName);
    const eligibleUnits = trashed.filter((c) => c.officialType === 'UNIT' || c.type?.includes('UNIT'));
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'TRASH_AND_CHOOSE',
        sourceZone: 'TRASH_FROM_DECK',
        sourceCardId: 'CP-006',
        sourceCardName: 'All Is Lost',
        sourceCardImage: card.image,
        title: '☠️ ALL IS LOST // PROGRAMA',
        prompt: trashed.length > 0
          ? 'Has enviado cartas de tu mazo a la Basura. Selecciona 1 Unidad entre ellas para recuperarla a tu mano:'
          : 'Tu mazo está vacío. No hay cartas que enviar a la Basura.',
        cards: trashed,
        eligibleIds: eligibleUnits.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: eligibleUnits.length > 0 ? 1 : 0,
        filterDescription: 'Solo cartas de tipo Unidad',
        destination: 'HAND'
      };
    } else {
      if (eligibleUnits.length > 0) {
        const [unit] = eligibleUnits;
        const tIdx = p.trash.lastIndexOf(unit);
        if (tIdx !== -1) p.trash.splice(tIdx, 1);
        p.hand.push(unit);
        state.actionLog.unshift(`🔎 [All Is Lost Rival] Recupera la Unidad "${unit.name}" a la mano.`);
      }
    }
    return { executed: true };
  }

  // CP-010: Appetite for Destruction
  // "The next time a friendly Unit wins a fight by 3+ power this turn, it also steals a Gig."
  if (cardId === 'CP-010') {
    p.appetiteForDestructionActive = true;
    state.actionLog.unshift(`🔥 [Appetite for Destruction] Activado: la próxima vez que una unidad gane por 3+ de poder, también robará un Gig.`);
    return { executed: true };
  }

  // CP-013: Bonnie and Clyde
  // "Defeat a rival Unit with power 4 or less. You may defeat 2 instead if a Rival controls at least 2 Gigs more than you."
  if (cardId === 'CP-013') {
    const eligibleUnits = (opp.field || []).filter((u) => (u.currentPower || u.power || 0) <= 4);
    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`ℹ️ [Bonnie and Clyde] El rival no tiene unidades con poder 4 o menos.`);
      return { executed: true };
    }
    if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        const [dead] = opp.field.splice(opp.field.indexOf(eligibleUnits[0]), 1);
        if (!opp.trash) opp.trash = [];
        opp.trash.push(dead);
        state.actionLog.unshift(`💥 [Bonnie and Clyde] Destruye a la unidad rival "${dead.name}" (Poder <= 4).`);
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-013',
          sourceCardName: 'Bonnie and Clyde',
          sourceCardImage: card.image,
          title: '🔫 BONNIE AND CLYDE // DESTRUIR UNIDAD',
          prompt: 'Selecciona la unidad rival que deseas destruir (Poder <= 4):',
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS',
          maxPower: 4
        };
      }
    } else {
      const target = [...eligibleUnits].sort((a,b) => b.currentPower - a.currentPower)[0];
      const idx = opp.field.indexOf(target);
      const [dead] = opp.field.splice(idx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💥 [Bonnie and Clyde Rival] Destruye a tu unidad "${dead.name}".`);
    }
    return { executed: true };
  }

  // CP-014: Bootleg Black Sapphire Show
  // "Sell the top card of your deck. If you control a Gig with an even value and a Gig with an odd value, draw 2."
  if (cardId === 'CP-014' || cardName.includes('Black Sapphire')) {
    if (p.deck && p.deck.length > 0) {
      const topCard = p.deck.shift();
      if (!p.eddies) p.eddies = [];
      p.eddies.push({ ...topCard, isSpent: false, soldAtTurn: state.turnNumber });
      state.actionLog.unshift(`💰 [${cardName}] Vende "${topCard.name}" a la Zona de Eddies (+1 €$).`);
    }
    const hasEven = (p.gigs || []).some((g) => typeof g.value === 'number' && g.value % 2 === 0);
    const hasOdd = (p.gigs || []).some((g) => typeof g.value === 'number' && g.value % 2 !== 0);
    if (hasEven && hasOdd) {
      drawCards(p, 2, state, cardName);
    } else {
      state.actionLog.unshift(`ℹ️ [${cardName}] No se cumplió la condición de tener un Gig par y un Gig impar.`);
    }
    return { executed: true };
  }

  // CP-016: Carnage at the Colosseum
  // "Defeat a rival Unit with less power than a friendly Unit."
  if (cardId === 'CP-016') {
    const maxFriendlyPower = Math.max(0, ...(p.field || []).map((u) => u.currentPower || 0));
    const targetIdx = (opp.field || []).findIndex((u) => (u.currentPower || 0) < maxFriendlyPower);
    if (targetIdx !== -1) {
      const [dead] = opp.field.splice(targetIdx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`⚔️ [Carnage at the Colosseum] Destruye a "${dead.name}" (su poder es menor que el de tus unidades).`);
    } else {
      state.actionLog.unshift(`ℹ️ [Carnage at the Colosseum] No hay unidades rivales con menor poder que tus unidades.`);
    }
    return { executed: true };
  }

  // CP-018: Chrome Reverie
  // "A rival Unit can't attack until your next turn. If you control a min Gig, you may Call a Legend for free."
  if (cardId === 'CP-018') {
    const eligibleUnits = opp.field || [];
    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`🛑 [Chrome Reverie] El rival no tiene unidades en campo para congelar.`);
    } else if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        eligibleUnits[0].cannotAttackUntilNextTurn = true;
        state.actionLog.unshift(`🛑 [Chrome Reverie] "${eligibleUnits[0].name}" no puede atacar hasta tu próximo turno.`);
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-018',
          sourceCardName: 'Chrome Reverie',
          sourceCardImage: card.image,
          title: '🛑 CHROME REVERIE // BLOQUEAR ATAQUE',
          prompt: 'Selecciona una unidad rival: no podrá atacar hasta tu próximo turno:',
          effectType: 'FREEZE',
          targetScope: 'RIVAL_UNITS'
        };
      }
    } else {
      const target = [...eligibleUnits].sort((a,b) => b.currentPower - a.currentPower)[0];
      target.cannotAttackUntilNextTurn = true;
      state.actionLog.unshift(`🛑 [Chrome Reverie Rival] "${target.name}" no podrá atacar hasta su próximo turno.`);
    }
    const hasMinGig = (p.gigs || []).some((g) => g.value === 1);
    if (hasMinGig) {
      const faceDownLegend = (p.legends || []).find((l) => !l.isFaceUp);
      if (faceDownLegend) {
        faceDownLegend.isFaceUp = true;
        state.actionLog.unshift(`👑 [Chrome Reverie] ¡Condición de Gig mínimo! Llama gratis a la Leyenda "${faceDownLegend.name}".`);
      }
    }
    return { executed: true };
  }

  // CP-020: Corporate Surveillance
  // "Spend a rival Unit with cost 4 or less."
  if (cardId === 'CP-020') {
    const target = (opp.field || []).find((u) => !u.isSpent && (u.costNum || u.cost || 0) <= 4);
    if (target) {
      target.isSpent = true;
      state.actionLog.unshift(`👁️ [Corporate Surveillance] Gira (Spend) a la unidad rival "${target.name}".`);
    }
    return { executed: true };
  }

  // CP-021: Cyberpsychosis
  // "Give an equipped Unit +3 power this turn for each of its equipped Gears."
  if (cardId === 'CP-021') {
    const target = (p.field || []).find((u) => u.gear && u.gear.length > 0);
    if (target) {
      const bonus = target.gear.length * 3;
      target.currentPower = (target.currentPower || target.power || 0) + bonus;
      state.actionLog.unshift(`⚡ [Cyberpsychosis] "${target.name}" gana +${bonus} de poder este turno.`);
    }
    return { executed: true };
  }

  // CP-025: Detonate
  // "QUICK Defeat a rival Gear with power 2 or less."
  if (cardId === 'CP-025' || cardName.toLowerCase() === 'detonate') {
    let defeated = false;
    for (const unit of opp.field || []) {
      if (unit.gear && unit.gear.length > 0) {
        const idx = unit.gear.findIndex((g) => (g.powerBonus || g.parsedPower || 0) <= 2);
        if (idx !== -1) {
          const [gear] = unit.gear.splice(idx, 1);
          if (!opp.trash) opp.trash = [];
          opp.trash.push(gear);
          state.actionLog.unshift(`💥 [Detonate] Destruye el Gear rival "${gear.name}" de "${unit.name}".`);
          defeated = true;
          break;
        }
      }
    }
    if (!defeated) {
      state.actionLog.unshift(`ℹ️ [Detonate] No se encontraron Gears rivales con poder 2 o menos.`);
    }
    return { executed: true };
  }

  // CP-028: (Don't Fear) The Reaper
  // "Spend all rival Units. Then, defeat a spent Unit."
  if (cardId === 'CP-028') {
    (opp.field || []).forEach((u) => (u.isSpent = true));
    state.actionLog.unshift(`💀 [(Don't Fear) The Reaper] Gira a todas las unidades rivales.`);
    if (opp.field && opp.field.length > 0) {
      const [dead] = opp.field.splice(0, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💀 [(Don't Fear) The Reaper] Destruye a la unidad girada "${dead.name}".`);
    }
    return { executed: true };
  }

  // CP-036: Floor It!
  // "Give a rival Unit -1 power this turn. Draw 1."
  if (cardId === 'CP-036') {
    if (opp.field && opp.field.length > 0) {
      opp.field[0].currentPower = Math.max(0, (opp.field[0].currentPower || 1) - 1);
      state.actionLog.unshift(`🏎️ [Floor It!] Reduce el poder de "${opp.field[0].name}" en 1.`);
    }
    drawCards(p, 1, state, cardName);
    return { executed: true };
  }

  // CP-037: Fool on the Hill
  // "Reveal the top 2 cards of your deck. A Rival chooses whether you add them to your hand or trash them. If you trash them, draw 2."
  if (cardId === 'CP-037') {
    trashFromDeck(p, 2, state, cardName);
    drawCards(p, 2, state, cardName);
    return { executed: true };
  }

  // CP-043: Gunpoint Diplomacy
  // "Give a friendly Unit +3 power this turn and may attack ready Units."
  if (cardId === 'CP-043') {
    if (p.field && p.field.length > 0) {
      p.field[0].currentPower = (p.field[0].currentPower || 0) + 3;
      p.field[0].canAttackReadyUnits = true;
      state.actionLog.unshift(`🔫 [Gunpoint Diplomacy] "${p.field[0].name}" gana +3 de poder y puede atacar unidades enderezadas.`);
    }
    return { executed: true };
  }

  // CP-048: Industrial Assembly
  // "Increase a Gig by up to 4. If you control a Gig with 8+ value, draw 1."
  if (cardId === 'CP-048') {
    const totalGigs = (p.gigs || []).length + (opp.gigs || []).length;
    if (totalGigs === 0) {
      state.actionLog.unshift(`🏭 [Industrial Assembly] No hay Gigs en juego.`);
      return { executed: true };
    }
    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'ADJUST_GIG',
        sourceCardId: 'CP-048',
        sourceCardName: 'Industrial Assembly',
        sourceCardImage: card.image,
        title: '🏭 INDUSTRIAL ASSEMBLY // AUMENTAR GIG',
        prompt: 'Selecciona cualquier Gig (tuyo o del rival) para aumentar su valor en hasta +4 (o déjalo igual):',
        maxDelta: 4,
        canIncrease: true,
        canDecrease: false,
        allowZero: true,
        secondaryEffect: 'INDUSTRIAL_DRAW'
      });
    } else {
      if (p.gigs && p.gigs.length > 0) {
        const bestGig = [...p.gigs].sort((a, b) => (getGigMaxFace(b) - b.value) - (getGigMaxFace(a) - a.value))[0];
        const oldVal = bestGig.value;
        bestGig.value = Math.min(getGigMaxFace(bestGig), (bestGig.value || 1) + 4);
        state.actionLog.unshift(`🏭 [Industrial Assembly Rival] Aumenta el Gig ${String(bestGig.die).toUpperCase()} de ${oldVal} a ${bestGig.value}.`);
      }
      if ((p.gigs || []).some((g) => g.value >= 8)) {
        drawCards(p, 1, state, cardName);
      }
    }
    return { executed: true };
  }

  // CP-062: Les Éléments
  // "Bottom-deck a Rival's lowest-power Unit."
  if (cardId === 'CP-062') {
    if (opp.field && opp.field.length > 0) {
      opp.field.sort((a, b) => (a.currentPower || 0) - (b.currentPower || 0));
      const [lowest] = opp.field.splice(0, 1);
      if (!opp.deck) opp.deck = [];
      opp.deck.push(lowest);
      state.actionLog.unshift(`🌊 [Les Éléments] Envía a "${lowest.name}" (la de menor poder) al fondo del mazo rival.`);
    }
    return { executed: true };
  }

  // CP-063: Live With the Aftermath
  // "Each player defeats one of their Units."
  if (cardId === 'CP-063' || cardName.includes('Aftermath')) {
    if (p.field && p.field.length > 0) {
      const [deadFriendly] = p.field.splice(0, 1);
      if (!p.trash) p.trash = [];
      p.trash.push(deadFriendly);
      state.actionLog.unshift(`💀 [Live With the Aftermath] ${p.name} destruye a su unidad "${deadFriendly.name}".`);
    }
    if (opp.field && opp.field.length > 0) {
      const [deadRival] = opp.field.splice(0, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(deadRival);
      state.actionLog.unshift(`💀 [Live With the Aftermath] ${opp.name} destruye a su unidad "${deadRival.name}".`);
    }
    return { executed: true };
  }

  // CP-074: Memory Relapse
  // "Spend a rival Unit. It can't ready until your next turn. If your Street Cred is an even number, draw 1."
  if (cardId === 'CP-074') {
    const eligibleUnits = (opp.field || []).filter((u) => !u.isSpent);
    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`🧠 [Memory Relapse] El rival no tiene unidades enderezadas para girar.`);
    } else if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        eligibleUnits[0].isSpent = true;
        eligibleUnits[0].cannotReadyUntilNextTurn = true;
        state.actionLog.unshift(`🧠 [Memory Relapse] Gira a "${eligibleUnits[0].name}" y no podrá enderezarse hasta tu próximo turno.`);
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-074',
          sourceCardName: 'Memory Relapse',
          sourceCardImage: card.image,
          title: '🧠 MEMORY RELAPSE // GIRAR UNIDAD RIVAL',
          prompt: 'Selecciona la unidad rival que deseas girar (no podrá enderezarse en su turno):',
          effectType: 'SPEND',
          targetScope: 'RIVAL_UNITS'
        };
      }
    } else {
      const target = eligibleUnits[0];
      target.isSpent = true;
      target.cannotReadyUntilNextTurn = true;
      state.actionLog.unshift(`🧠 [Memory Relapse Rival] Gira a "${target.name}".`);
    }
    const streetCred = (p.gigs || []).reduce((sum, g) => sum + (g.value || 0), 0);
    if (streetCred % 2 === 0) {
      drawCards(p, 1, state, cardName);
    }
    return { executed: true };
  }

  // CP-085: Nocturne Op55N1
  // "Choose one effect. Draw 2. // A Unit can't attack until your next turn."
  if (cardId === 'CP-085') {
    const hasRivalUnits = (opp.field || []).length > 0;
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-085',
        sourceCardName: 'Nocturne Op55N1',
        sourceCardImage: card.image,
        title: '🎶 NOCTURNE OP55N1 // PROGRAMA: ELIGE UN EFECTO',
        prompt: 'Elige uno de los efectos oficiales del Programa Nocturne Op55N1:',
        options: [
          {
            id: 'NOCTURNE_DRAW_2',
            title: 'ROBAR 2 CARTAS',
            description: 'Roba 2 cartas de tu mazo a tu mano.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          },
          {
            id: 'NOCTURNE_FREEZE_RIVAL',
            title: 'CONGELAR UNIDAD RIVAL',
            description: 'Una unidad rival no puede atacar hasta tu próximo turno.',
            isEligible: hasRivalUnits,
            ineligibleReason: 'El rival no tiene unidades en su campo de batalla.'
          }
        ]
      };
    } else {
      drawCards(p, 2, state, cardName);
    }
    return { executed: true };
  }

  // CP-088: Over the Edge
  // "Defeat a Unit with power equal to or less than the value of a friendly d20."
  if (cardId === 'CP-088') {
    const d20 = (p.gigs || []).find((g) => g.die.toLowerCase() === 'd20') || p.gigs?.[0];
    const maxVal = d20 ? d20.value || 0 : 0;
    const eligibleUnits = (opp.field || []).filter((u) => (u.currentPower || 0) <= maxVal);

    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`ℹ️ [Over the Edge] No hay unidades rivales con poder <= ${maxVal} (d20).`);
      return { executed: true };
    }

    if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        const [dead] = opp.field.splice(opp.field.indexOf(eligibleUnits[0]), 1);
        if (!opp.trash) opp.trash = [];
        opp.trash.push(dead);
        state.actionLog.unshift(`💥 [Over the Edge] Destruye a "${dead.name}" (Poder <= ${maxVal} del Gig d20).`);
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-088',
          sourceCardName: 'Over the Edge',
          sourceCardImage: card.image,
          title: '💥 OVER THE EDGE // DESTRUIR UNIDAD',
          prompt: `Selecciona la unidad rival que deseas destruir (Poder <= ${maxVal}):`,
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS',
          maxPower: maxVal
        };
      }
    } else {
      const target = [...eligibleUnits].sort((a,b) => b.currentPower - a.currentPower)[0];
      const idx = opp.field.indexOf(target);
      const [dead] = opp.field.splice(idx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💥 [Over the Edge Rival] Destruye a tu unidad "${dead.name}".`);
    }
    return { executed: true };
  }

  // CP-094: Peace Offering
  // "You may set a Gig's value to the value of another Gig. Then, if you control a value-pair, draw 1."
  if (cardId === 'CP-094') {
    const totalGigs = (p.gigs || []).length + (opp.gigs || []).length;
    if (totalGigs < 2) {
      state.actionLog.unshift(`🕊️ [Peace Offering] No hay suficientes Gigs en juego (se requieren al menos 2 Gigs en total entre ambos jugadores).`);
      return { executed: true };
    }

    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'PEACE_OFFERING',
        sourceCardId: 'CP-094',
        sourceCardName: 'Peace Offering',
        sourceCardImage: card.image,
        title: '🕊️ PEACE OFFERING // PROGRAMA: COPIAR VALOR DE GIG',
        prompt: 'PASO 1 DE 2: Haz clic en el Gig (dado) cuyo valor deseas MODIFICAR (puede ser tu Gig o del rival):',
        step: 1,
        targetScope: 'ALL_GIGS',
        selectedTargetGig: null
      });
    } else {
      // Lógica de IA para el rival
      const allFriendly = p.gigs || [];
      const allRival = opp.gigs || [];
      let targetGig = null;
      let sourceGig = null;

      const allGigs = [...allFriendly, ...allRival];
      const highestVal = Math.max(...allGigs.map((g) => g.value || 0));
      const sourceObj = allGigs.find((g) => (g.value || 0) === highestVal);

      const lowestFriendly = [...allFriendly].sort((a, b) => (a.value || 0) - (b.value || 0))[0];
      if (lowestFriendly && sourceObj && (lowestFriendly.value || 0) < highestVal) {
        targetGig = lowestFriendly;
        sourceGig = sourceObj;
      } else if (allFriendly.length >= 2) {
        targetGig = allFriendly[1];
        sourceGig = allFriendly[0];
      }

      if (targetGig && sourceGig) {
        targetGig.value = sourceGig.value;
        state.actionLog.unshift(
          `🕊️ [Peace Offering Rival] El rival igualó su Gig ${targetGig.die.toUpperCase()} al valor ${sourceGig.value} del ${sourceGig.die.toUpperCase()}.`
        );
      }

      // Comprobar par de valores del rival
      const botVals = (p.gigs || []).map((g) => g.value);
      if (new Set(botVals).size < botVals.length) {
        drawCards(p, 1, state, cardName);
        state.actionLog.unshift(`🕊️ [Peace Offering Rival] ¡El rival controla un par de Gigs con el mismo valor y roba 1 carta!`);
      }
    }
    return { executed: true };
  }

  // CP-098: Pyramid Song
  // "Choose one effect. If a friendly d4 is a min Gig, choose both instead. Give a rival Unit -4 power this turn. // Bottom-deck a rival Unit with power 0."
  if (cardId === 'CP-098') {
    const hasMinD4 = (p.gigs || []).some((g) => g.die.toLowerCase() === 'd4' && g.value === 1);
    const hasRivalUnits = (opp.field || []).length > 0;
    const hasZeroPowerRival = (opp.field || []).some((u) => (u.currentPower || 0) === 0);

    if (hasMinD4) {
      state.actionLog.unshift(`🌊 [Pyramid Song] ¡Condición de dado d4 mínimo activa! Se ejecutan AMBOS efectos.`);
      if (hasRivalUnits) {
        opp.field[0].currentPower = Math.max(0, (opp.field[0].currentPower || 0) - 4);
        state.actionLog.unshift(`🌊 [Pyramid Song] Reduce el poder de "${opp.field[0].name}" en 4.`);
      }
      for (let i = (opp.field?.length || 0) - 1; i >= 0; i--) {
        if ((opp.field[i].currentPower || 0) === 0) {
          const [dead] = opp.field.splice(i, 1);
          if (!opp.deck) opp.deck = [];
          opp.deck.push(dead);
          state.actionLog.unshift(`🌊 [Pyramid Song] Al tener 0 de poder, "${dead.name}" va al fondo del mazo.`);
        }
      }
    } else if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-098',
        sourceCardName: 'Pyramid Song',
        sourceCardImage: card.image,
        title: '🌊 PYRAMID SONG // PROGRAMA: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de Pyramid Song:',
        options: [
          {
            id: 'PYRAMID_DEBUFF',
            title: 'DEBILITAR UNIDAD RIVAL (-4 PODER)',
            description: 'Reduce el poder de una unidad rival en 4 este turno.',
            isEligible: hasRivalUnits,
            ineligibleReason: 'El rival no tiene unidades en su campo de batalla.'
          },
          {
            id: 'PYRAMID_BOTTOM_ZERO',
            title: 'BOTTOM-DECK A UNIDAD CON 0 DE PODER',
            description: 'Envía una unidad rival con poder 0 al fondo de su mazo.',
            isEligible: hasZeroPowerRival,
            ineligibleReason: 'El rival no tiene ninguna unidad con poder 0.'
          }
        ]
      };
    } else {
      if (hasRivalUnits) {
        opp.field[0].currentPower = Math.max(0, (opp.field[0].currentPower || 0) - 4);
      }
    }
    return { executed: true };
  }

  // CP-100: Reboot Optics
  // "The next time a rival Unit fights this turn, it doesn't defeat the opposing friendly Unit."
  if (cardId === 'CP-100') {
    p.rebootOpticsActive = true;
    state.actionLog.unshift(`👁️ [Reboot Optics] Activado: la próxima vez que una unidad rival luche este turno, no podrá derrotar a tu unidad.`);
    return { executed: true };
  }

  // CP-112: Safety Override
  // "QUICK The next time a friendly Unit loses a fight this turn, defeat the opposing rival Unit."
  if (cardId === 'CP-112' || cardName.includes('Safety Override')) {
    p.safetyOverrideActive = true;
    state.actionLog.unshift(`🛡️ [Safety Override] Activado: la próxima vez que una unidad tuya pierda un combate este turno, destruirá también a la rival.`);
    return { executed: true };
  }

  // CP-120: Shattered Memories
  // "Each player discards their hand and may draw 5."
  if (cardId === 'CP-120') {
    discardCards(p, p.hand?.length || 0, state, cardName);
    drawCards(p, 5, state, cardName);
    discardCards(opp, opp.hand?.length || 0, state, cardName);
    drawCards(opp, 5, state, cardName);
    return { executed: true };
  }

  // CP-123: Synapse Burnout
  // "A friendly Unit has +1 power for each friendly face-up Legend while fighting rival Units this turn."
  if (cardId === 'CP-123') {
    const faceUpLegends = (p.legends || []).filter((l) => l.isFaceUp).length;
    if (p.field && p.field.length > 0) {
      p.field[0].currentPower = (p.field[0].currentPower || 0) + faceUpLegends;
      state.actionLog.unshift(`⚡ [Synapse Burnout] "${p.field[0].name}" gana +${faceUpLegends} de poder por tus Leyendas activas.`);
    }
    return { executed: true };
  }

  // CP-125: Take Control
  // "A rival Unit steals 1 fewer Gig this turn. If that Unit is an AI, DRONE, or VEHICLE, draw 1."
  if (cardId === 'CP-125') {
    if (opp.field && opp.field.length > 0) {
      opp.field[0].stolenReduction = 1;
      state.actionLog.unshift(`🎮 [Take Control] "${opp.field[0].name}" robará 1 Gig menos este turno.`);
    }
    drawCards(p, 1, state, cardName);
    return { executed: true };
  }

  // CP-127: The Heist
  // "Trash 4. Add a Gear from among them to your hand."
  if (cardId === 'CP-127') {
    const trashed = trashFromDeck(p, 4, state, cardName);
    const eligibleGears = trashed.filter((c) => c.officialType === 'GEAR' || c.type?.includes('GEAR'));
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'TRASH_AND_CHOOSE',
        sourceZone: 'TRASH_FROM_DECK',
        sourceCardId: 'CP-127',
        sourceCardName: 'The Heist',
        sourceCardImage: card.image,
        title: '💎 THE HEIST // PROGRAMA',
        prompt: trashed.length > 0
          ? 'Has enviado 4 cartas de tu mazo a la Basura. Selecciona 1 Gear entre ellas para añadirlo a tu mano:'
          : 'Tu mazo está vacío. No hay cartas que enviar a la Basura.',
        cards: trashed,
        eligibleIds: eligibleGears.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: eligibleGears.length > 0 ? 1 : 0,
        filterDescription: 'Solo cartas de tipo Gear',
        destination: 'HAND'
      };
    } else {
      if (eligibleGears.length > 0) {
        const [gear] = eligibleGears;
        const tIdx = p.trash.lastIndexOf(gear);
        if (tIdx !== -1) p.trash.splice(tIdx, 1);
        p.hand.push(gear);
        state.actionLog.unshift(`💎 [The Heist Rival] ¡Encontró el Gear "${gear.name}"! Añadido a su mano.`);
      }
    }
    return { executed: true };
  }

  // CP-129: Three Mouths, One Desire
  // "Search the top 3 cards of your deck. Add 1 to your hand. Bottom-deck the rest."
  if (cardId === 'CP-129') {
    const top3 = (p.deck || []).splice(0, Math.min(3, p.deck?.length || 0));
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'SEARCH_AND_CHOOSE',
        sourceZone: 'DECK',
        sourceCardId: 'CP-129',
        sourceCardName: 'Three Mouths, One Desire',
        sourceCardImage: card.image,
        title: '🎭 THREE MOUTHS, ONE DESIRE // PROGRAMA',
        prompt: top3.length > 0
          ? 'Se han revelado las 3 primeras cartas de tu mazo. Selecciona 1 carta para añadir a tu mano (el resto irá al fondo del mazo):'
          : 'Tu mazo está vacío. No hay cartas que examinar.',
        cards: top3,
        eligibleIds: top3.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: top3.length > 0 ? 1 : 0,
        filterDescription: 'Cualquier carta',
        remainingDestination: 'BOTTOM_DECK',
        destination: 'HAND'
      };
    } else {
      if (top3.length > 0) {
        const chosen = top3.shift();
        p.hand.push(chosen);
        p.deck.push(...top3);
        state.actionLog.unshift(`🎭 [Three Mouths, One Desire Rival] Añade "${chosen.name}" a su mano.`);
      }
    }
    return { executed: true };
  }

  // CP-130: Towerfall
  // "Choose one effect. If you have less ☆ (Street Cred) than a Rival, choose both instead. Give all rival Units -5 power this turn. // Bottom-deck all rival Units with power 0."
  if (cardId === 'CP-130') {
    const myCred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const oppCred = (opp.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const hasLessCred = myCred < oppCred;
    const hasRivalUnits = (opp.field || []).length > 0;
    const hasZeroUnits = (opp.field || []).some((u) => (u.currentPower || 0) === 0);

    if (hasLessCred) {
      state.actionLog.unshift(`🏢 [Towerfall] ¡Tienes menor Credibilidad en la Calle que el rival! Se ejecutan AMBOS efectos.`);
      (opp.field || []).forEach((u) => {
        u.currentPower = Math.max(0, (u.currentPower || 0) - 5);
      });
      state.actionLog.unshift(`🏢 [Towerfall] Reduce el poder de todas las unidades rivales en 5.`);
      for (let i = (opp.field?.length || 0) - 1; i >= 0; i--) {
        if ((opp.field[i].currentPower || 0) === 0) {
          const [dead] = opp.field.splice(i, 1);
          if (!opp.deck) opp.deck = [];
          opp.deck.push(dead);
          state.actionLog.unshift(`🏢 [Towerfall] "${dead.name}" cae a 0 de poder y va al fondo del mazo.`);
        }
      }
    } else if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-130',
        sourceCardName: 'Towerfall',
        sourceCardImage: card.image,
        title: '🏢 TOWERFALL // PROGRAMA: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de Towerfall:',
        options: [
          {
            id: 'TOWERFALL_DEBUFF_ALL',
            title: 'DEBILITAR A TODAS LAS UNIDADES RIVALES (-5 PODER)',
            description: 'Reduce el poder de todas las unidades rivales en 5 este turno.',
            isEligible: hasRivalUnits,
            ineligibleReason: 'El rival no tiene unidades en su campo de batalla.'
          },
          {
            id: 'TOWERFALL_BOTTOM_ZEROS',
            title: 'BOTTOM-DECK A UNIDADES CON 0 DE PODER',
            description: 'Envía todas las unidades rivales con poder 0 al fondo de su mazo.',
            isEligible: hasZeroUnits,
            ineligibleReason: 'El rival no tiene ninguna unidad con poder 0.'
          }
        ]
      };
    } else {
      (opp.field || []).forEach((u) => {
        u.currentPower = Math.max(0, (u.currentPower || 0) - 5);
      });
    }
    return { executed: true };
  }

  // CP-132: Trust No One
  // "Decrease a Gig by up to 3. Then, if you control a min Gig, draw 1."
  if (cardId === 'CP-132') {
    const totalGigs = (p.gigs || []).length + (opp.gigs || []).length;
    if (totalGigs === 0) {
      state.actionLog.unshift(`🗡️ [Trust No One] No hay Gigs en juego para reducir.`);
      return { executed: true };
    }
    if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'ADJUST_GIG',
        sourceCardId: 'CP-132',
        sourceCardName: 'Trust No One',
        sourceCardImage: card.image,
        title: '🗡️ TRUST NO ONE // REDUCIR GIG (-HASTA 3)',
        prompt: 'Selecciona cualquier Gig en juego (tuyo o del rival) para reducir su valor en -1, -2 o -3 (si controlas un Gig mínimo tras esto, robas 1):',
        canIncrease: false,
        canDecrease: true,
        maxDelta: 3,
        allowZero: true,
        secondaryEffect: 'TRUST_NO_ONE_DRAW'
      });
    } else {
      // Bot AI: prioriza llevar un Gig aliado de valor 2..4 a 1 para robar carta; si no, baja el mayor Gig rival
      const ownNearMin = (p.gigs || []).find((g) => g.value >= 2 && g.value <= 4);
      if (ownNearMin) {
        const oldVal = ownNearMin.value;
        ownNearMin.value = 1;
        state.actionLog.unshift(`🗡️ [Trust No One Rival] Reduce su Gig ${String(ownNearMin.die).toUpperCase()} de ${oldVal} a 1.`);
      } else if (opp.gigs && opp.gigs.length > 0) {
        const highestOpp = [...opp.gigs].sort((a, b) => b.value - a.value)[0];
        const oldVal = highestOpp.value;
        highestOpp.value = Math.max(1, (highestOpp.value || 1) - 3);
        state.actionLog.unshift(`🗡️ [Trust No One Rival] Reduce tu Gig ${String(highestOpp.die).toUpperCase()} de ${oldVal} a ${highestOpp.value}.`);
        triggerMeredithStoutOnRivalGigModify(state, oppKey);
      } else if (p.gigs && p.gigs.length > 0) {
        const g = p.gigs[0];
        g.value = Math.max(1, (g.value || 1) - 3);
        state.actionLog.unshift(`🗡️ [Trust No One Rival] Reduce su Gig ${String(g.die).toUpperCase()} a ${g.value}.`);
      }
      if ((p.gigs || []).some((g) => g.value === 1)) {
        drawCards(p, 1, state, cardName);
      }
    }
    return { executed: true };
  }

  // CP-134: Unlikely Bond
  // "Bottom-deck a ready friendly Unit. If you do, bottom-deck a spent rival Unit."
  if (cardId === 'CP-134') {
    const readyIdx = (p.field || []).findIndex((u) => !u.isSpent);
    const spentRivalIdx = (opp.field || []).findIndex((u) => u.isSpent);
    if (readyIdx !== -1 && spentRivalIdx !== -1) {
      const [fUnit] = p.field.splice(readyIdx, 1);
      p.deck.push(fUnit);
      const [rUnit] = opp.field.splice(spentRivalIdx, 1);
      opp.deck.push(rUnit);
      state.actionLog.unshift(`🤝 [Unlikely Bond] Envía a "${fUnit.name}" y a la rival "${rUnit.name}" al fondo de sus mazos.`);
    }
    return { executed: true };
  }

  // CP-144: We Gotta Live Together
  // "Play up to 2 Units with cost 3 or less from your trash for free."
  if (cardId === 'CP-144') {
    const allTrash = p.trash || [];
    const eligibleUnits = allTrash.filter(
      (c) => (c.officialType === 'UNIT' || c.type?.includes('UNIT')) && (c.costNum || c.cost || 0) <= 3
    );
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'CHOOSE_FROM_TRASH',
        sourceZone: 'TRASH',
        sourceCardId: 'CP-144',
        sourceCardName: 'We Gotta Live Together',
        sourceCardImage: card.image,
        title: '⛺ WE GOTTA LIVE TOGETHER // PROGRAMA',
        prompt: allTrash.length > 0
          ? 'Selecciona hasta 2 Unidades con coste ≤ 3 €$ de tu Basura para desplegarlas gratis:'
          : 'Tu Basura está vacía.',
        cards: allTrash,
        eligibleIds: eligibleUnits.map((c) => c.instanceId),
        maxChoices: 2,
        minChoices: 0,
        filterDescription: 'Unidades en Basura con coste ≤ 3 €$',
        destination: 'FIELD'
      };
    } else {
      let revived = 0;
      for (let i = (p.trash?.length || 0) - 1; i >= 0 && revived < 2; i--) {
        const c = p.trash[i];
        if ((c.officialType === 'UNIT' || c.type?.includes('UNIT')) && (c.costNum || c.cost || 0) <= 3) {
          const [unit] = p.trash.splice(i, 1);
          p.field.push({ ...unit, isSpent: false, isLagging: true, currentPower: unit.parsedPower || 1, gear: [] });
          revived++;
          state.actionLog.unshift(`⛺ [We Gotta Live Together Rival] Despliega a "${unit.name}" gratis desde la Basura.`);
        }
      }
    }
    return { executed: true };
  }

  // CP-146: Wild in the Streets
  // "Defeat a spent Unit."
  if (cardId === 'CP-146') {
    const spentIdx = (opp.field || []).findIndex((u) => u.isSpent);
    if (spentIdx !== -1) {
      const [dead] = opp.field.splice(spentIdx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`🔥 [Wild in the Streets] Destruye a la unidad rival girada "${dead.name}".`);
    } else {
      state.actionLog.unshift(`ℹ️ [Wild in the Streets] No hay unidades rivales giradas.`);
    }
    return { executed: true };
  }

  return { executed: false };
}

// =========================================================================
// 2. MOTOR DE UNIDADES AL ENTRAR AL CAMPO (ON-PLAY TRIGGERS)
// =========================================================================

/**
 * CP-050 Jackie Welles // Mama's Favorite:
 * "If a friendly Unit would be defeated, you may pay 1 €$ to defeat this Legend instead. (Remove it from the game.)"
 * Comprueba si el controlador de `unit` tiene a Jackie CP-050 boca arriba (en Leyendas o en Campo)
 * y al menos 1 €$ disponible para ofrecer/ejecutar la sustitución de derrota.
 */
export function tryJackieMamaSaveReplacement(playerState, unit, state, options = {}) {
  if (!state || !playerState || !unit || options?.skipJackieReplacement) return null;

  const unitLegendId = unit.legendInstanceId || (unit.instanceId ? String(unit.instanceId).replace(/_unit$/, '') : null);

  // Buscar un Jackie Welles // Mama's Favorite (CP-050) boca arriba y no eliminado que NO sea la propia unidad derrotada
  const jackieFieldUnit = (playerState.field || []).find(
    (u) => resolveCardId(u) === 'CP-050' && u.instanceId !== unit.instanceId
  );
  const jackieLegend = (playerState.legends || []).find((l) => {
    if (!l.isFaceUp || l.isRemovedFromGame || resolveCardId(l) !== 'CP-050') return false;
    if (l.instanceId === unitLegendId || l.instanceId === unit.instanceId) return false;
    return true;
  });

  const jackieSource = jackieFieldUnit || jackieLegend;
  if (!jackieSource) return null;

  // Comprobar si dispone de al menos 1 €$ (en reserva, Eddies listos o Leyendas listas)
  const floating = playerState.floatingEddies || 0;
  const readyEddies = (playerState.eddies || []).filter((e) => !e.isSpent).length;
  const readyLegends = (playerState.legends || []).filter(
    (l) => !l.isSpent && !l.isOnField && !l.isRemovedFromGame
  ).length;
  if (floating + readyEddies + readyLegends < 1) return null;

  // Jugador humano: abrir modal de elección si no hay otro modal bloqueante abierto
  if (playerState === state.player) {
    if (state.pendingModalChoice) return null;
    state.pendingModalChoice = {
      type: 'JACKIE_MAMA_SAVE_UNIT',
      sourceCardId: 'CP-050',
      sourceCardName: "Jackie Welles // Mama's Favorite",
      sourceCardImage: jackieSource.image,
      title: "💔 JACKIE WELLES // MAMA'S FAVORITE — SALVAR UNIDAD",
      prompt: `Tu unidad "${unit.name}" [Fuerza ${unit.currentPower ?? unit.parsedPower ?? 0}] va a ser derrotada. ¿Quieres pagar 1 €$ y sacrificar a Jackie Welles (se elimina de la partida) en su lugar?`,
      unitToSave: unit,
      jackieLegendInstanceId: jackieLegend?.instanceId || jackieFieldUnit?.legendInstanceId || null,
      jackieFieldInstanceId: jackieFieldUnit?.instanceId || null,
      options: [
        {
          id: 'JACKIE_MAMA_SACRIFICE',
          title: `💔 PAGAR 1 €$ Y SACRIFICAR A JACKIE (SALVAR A "${unit.name}")`,
          description: `Pagas 1 €$, Jackie Welles // Mama's Favorite queda derrotado y eliminado de la partida, y "${unit.name}" sobrevive en el campo con todos sus Gears intactos.`,
          isEligible: true
        },
        {
          id: 'JACKIE_MAMA_DECLINE',
          title: `💀 DEJAR QUE "${unit.name}" SEA DERROTADA (CONSERVAR A JACKIE)`,
          description: `No pagas nada. "${unit.name}" es derrotada normalmente y Jackie Welles permanece activo.`,
          isEligible: true
        }
      ]
    };
    if (state.actionLog) {
      state.actionLog.unshift(
        `💔 [Jackie Welles // Mama's Favorite] "${unit.name}" iba a ser derrotada: puedes pagar 1 €$ y sacrificar a Jackie para salvarla.`
      );
    }
    return { intercepted: true, pending: true };
  }

  // Bot AI: sacrificar a Jackie si la unidad salvada es valiosa (fuerza >= 5, tiene Gears o es Leyenda)
  const isValuable =
    (unit.currentPower || unit.parsedPower || 0) >= 5 ||
    (Array.isArray(unit.gear) && unit.gear.length > 0) ||
    Boolean(unit.isLegendUnit || unit.hasGoSolo);
  if (!isValuable) return null;

  // Pagar 1 Eddie del bot (priorizando reserva -> Eddie -> otra Leyenda -> el propio Jackie)
  if ((playerState.floatingEddies || 0) >= 1) {
    playerState.floatingEddies -= 1;
  } else {
    const ed = (playerState.eddies || []).find((e) => !e.isSpent);
    if (ed) {
      ed.isSpent = true;
    } else {
      const otherLeg = (playerState.legends || []).find(
        (l) => !l.isSpent && !l.isOnField && !l.isRemovedFromGame && l.instanceId !== jackieLegend?.instanceId
      );
      if (otherLeg) otherLeg.isSpent = true;
      else if (jackieLegend) jackieLegend.isSpent = true;
    }
  }

  // Derrotar y eliminar de la partida a Jackie (CP-050) + enviar sus Gears al Trash
  if (!playerState.trash) playerState.trash = [];
  if (!playerState.removedFromGame) playerState.removedFromGame = [];
  if (jackieFieldUnit) {
    const fIdx = (playerState.field || []).findIndex((u) => u.instanceId === jackieFieldUnit.instanceId);
    if (fIdx !== -1) playerState.field.splice(fIdx, 1);
    (jackieFieldUnit.gear || []).forEach((g) => playerState.trash.push(g));
    jackieFieldUnit.gear = [];
  }
  if (jackieLegend) {
    (jackieLegend.gear || []).forEach((g) => playerState.trash.push(g));
    jackieLegend.gear = [];
    jackieLegend.isOnField = false;
    jackieLegend.isRemovedFromGame = true;
    jackieLegend.isSpent = true;
  }
  playerState.removedFromGame.push(jackieSource);

  // Devolver la unidad salvada al campo con todos sus Gears intactos
  if (!playerState.field) playerState.field = [];
  playerState.field.push(unit);

  if (state.actionLog) {
    state.actionLog.unshift(
      `💔 [Jackie Welles Rival // Mama's Favorite] El rival paga 1 €$ y sacrifica a Jackie (eliminado de la partida) para SALVAR a "${unit.name}"!`
    );
  }
  return { intercepted: true, saved: true };
}

/**
 * Envía una unidad derrotada al descarte (Trash) o al exilio (Removed from the game):
 * REGLA OFICIAL DE GO SOLO / LEYENDAS:
 * "If it leaves the field, remove it from the game."
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
 * - Si es Leyenda / Go Solo: la Leyenda se remueve del juego y sus Gears equipados van al fondo del mazo.
 * - Si es Unidad normal: la Unidad y sus Gears equipados van al fondo del mazo.
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

export function executeUnitPlayTrigger(state, playerKey, unitInstance) {
  if (!state || !unitInstance) return;
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = resolveCardId(unitInstance);
  const cardName = unitInstance.name || 'Unidad';

  // Limpiar notificación previa de trigger
  delete state.lastTriggerNotification;

  const notifyTrigger = (title, message, type = 'info') => {
    if (playerKey === 'player') {
      state.lastTriggerNotification = { title, message, type, cardName };
    }
  };

  // -------------------------------------------------------------------------
  // CP-002: Adam Smasher // Ender of Legends
  // "GO SOLO // PLAY Defeat a rival Unit."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-002') {
    const oppUnits = opp.field || [];
    if (oppUnits.length === 0) {
      state.actionLog.unshift(
        `💥 [Adam Smasher // Ender of Legends] ¡PLAY activado! Pero el rival no controla ninguna Unidad en el campo de batalla.`
      );
      notifyTrigger('💥 ADAM SMASHER // PLAY', 'Habilidad PLAY activada, pero el rival no tiene unidades en el campo de batalla.', 'info');
    } else if (oppUnits.length === 1) {
      const [dead] = opp.field.splice(0, 1);
      sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
      state.actionLog.unshift(
        `💥 [Adam Smasher // Ender of Legends] ¡PLAY! Ha destruido a la unidad rival "${dead.name}".`
      );
      notifyTrigger('💥 ADAM SMASHER // PLAY', `¡Ender of Legends! Has destruido a la unidad rival "${dead.name}".`, 'success');
    } else {
      if (playerKey === 'player') {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-002',
          sourceCardName: 'Adam Smasher // Ender of Legends',
          sourceCardImage: unitInstance.image,
          title: '💥 ADAM SMASHER // HABILIDAD PLAY',
          prompt: 'Elige una Unidad del rival para DESTRUIRLA inmediatamente:',
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS'
        };
      } else {
        let highestIdx = 0;
        for (let i = 1; i < oppUnits.length; i++) {
          if ((oppUnits[i].currentPower || 0) > (oppUnits[highestIdx].currentPower || 0)) highestIdx = i;
        }
        const [dead] = opp.field.splice(highestIdx, 1);
        sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
        state.actionLog.unshift(`💥 [Adam Smasher Rival] ¡PLAY! Destruye a tu unidad "${dead.name}".`);
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-003: Adam Smasher // Metal Over Meat
  // "PLAY Defeat all other Units."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-003') {
    const allOthersFriendly = (p.field || []).filter((u) => u.instanceId !== unitInstance.instanceId);
    p.field = [unitInstance];
    allOthersFriendly.forEach((u) => sendDefeatedUnitToGraveyardOrExile(p, u, state));

    const allRival = opp.field || [];
    opp.field = [];
    allRival.forEach((u) => sendDefeatedUnitToGraveyardOrExile(opp, u, state));

    const totalDestroyed = allOthersFriendly.length + allRival.length;
    state.actionLog.unshift(
      `💥 [Adam Smasher // Metal Over Meat] ¡PLAY! Destruye a TODAS las demás unidades en el campo (${totalDestroyed} unidades destruidas).`
    );
    notifyTrigger('💥 METAL OVER MEAT // PLAY', `Todas las demás unidades en juego (${totalDestroyed}) han sido destruidas.`, 'success');
    return;
  }

  // -------------------------------------------------------------------------
  // CP-015: Caliber // Totentanz's Top Dog
  // "PLAY Defeat a rival Unit with cost 2 or less."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-015') {
    const eligible = (opp.field || []).filter((u) => getNumericCost(u) <= 2);
    if (eligible.length === 0) {
      state.actionLog.unshift(`🐕 [Caliber] ¡PLAY activado! El rival no tiene unidades con coste ≤ 2 €$.`);
      notifyTrigger('🐕 CALIBER // PLAY', 'Habilidad PLAY activada, pero el rival no controla unidades con coste ≤ 2 €$.', 'info');
    } else if (playerKey === 'player') {
      if (eligible.length === 1) {
        const idx = opp.field.indexOf(eligible[0]);
        const [dead] = opp.field.splice(idx, 1);
        sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
        state.actionLog.unshift(`🐕 [Caliber] ¡PLAY! Destruye a la unidad rival "${dead.name}" (Coste ≤ 2).`);
        notifyTrigger('🐕 CALIBER // PLAY', `Has destruido a la unidad rival "${dead.name}" (coste ≤ 2).`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-015',
          sourceCardName: 'Caliber',
          sourceCardImage: unitInstance.image,
          title: '🐕 CALIBER // HABILIDAD PLAY',
          prompt: 'Selecciona una Unidad rival con coste ≤ 2 €$ para destruirla:',
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS',
          maxCost: 2
        };
      }
    } else {
      const target = [...eligible].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
      const idx = opp.field.indexOf(target);
      const [dead] = opp.field.splice(idx, 1);
      sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
      state.actionLog.unshift(`🐕 [Caliber Rival] ¡PLAY! Destruye a tu unidad "${dead.name}" (Coste ≤ 2).`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-017: Chrome Fang
  // "PLAY Until your next turn, rival Units can't steal friendly Gigs with value higher than their power."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-017') {
    p.chromeFangProtectionActive = true;
    state.actionLog.unshift(
      `🦷 [Chrome Fang] ¡PLAY! Hasta tu próximo turno, las Unidades rivales no pueden robar tus Gigs cuyo valor sea superior a su Fuerza.`
    );
    notifyTrigger('🦷 CHROME FANG // PLAY', 'Protección activa hasta tu próximo turno: el rival no podrá robar tus Gigs con valor superior a la fuerza de su atacante.', 'success');
    return;
  }

  // -------------------------------------------------------------------------
  // CP-024: Delamain // Rideshare AI
  // "PLAY Draw 2."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-024') {
    const drawn = drawCards(p, 2, state, cardName);
    notifyTrigger('🚕 DELAMAIN // PLAY', `Robaste ${drawn.length} carta(s): ${drawn.map((c) => c.name).join(', ') || 'Mazo vacío'}.`, 'success');
    return;
  }

  // -------------------------------------------------------------------------
  // CP-027: Dexter DeShawn // One Last Chance
  // "PLAY ATTACK Adjust a Gig by up to 1."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-027') {
    const allGigs = [...(p.gigs || []), ...(opp.gigs || [])];
    if (allGigs.length === 0) {
      state.actionLog.unshift(`🎲 [Dexter DeShawn] ¡PLAY activado! No hay Gigs en juego para ajustar.`);
      notifyTrigger('🎲 DEXTER DESHAWN // PLAY', 'No hay dados de Gig en juego para ajustar.', 'info');
    } else if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'ADJUST_GIG',
        sourceCardId: 'CP-027',
        sourceCardName: 'Dexter DeShawn // One Last Chance',
        sourceCardImage: unitInstance.image,
        title: '🎲 DEXTER DESHAWN // HABILIDAD PLAY',
        prompt: 'Elige cualquier Gig en juego (tuyo o del rival) para ajustarlo en +1, -1 o dejarlo igual:',
        canIncrease: true,
        canDecrease: true,
        maxDelta: 1,
        allowZero: true
      });
    } else {
      const targetGig = (p.gigs || [])[0];
      if (targetGig) {
        const dieLabel = (targetGig.die || targetGig.dieType || 'GIG').toUpperCase();
        targetGig.value = Math.min(getGigMaxFace(targetGig), (targetGig.value || 1) + 1);
        state.actionLog.unshift(`🎲 [Dexter DeShawn Rival] ¡PLAY! Ajusta su Gig ${dieLabel} a ${targetGig.value}.`);
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-035: Field Operator
  // "PLAY If your Street Cred is an even number, draw 1."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-035') {
    const cred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    if (cred % 2 === 0) {
      const drawn = drawCards(p, 1, state, cardName);
      notifyTrigger('📡 FIELD OPERATOR // PLAY', `Tu Street Cred (${cred}) es par: robas 1 carta (${drawn[0]?.name || ''}).`, 'success');
    } else {
      state.actionLog.unshift(`📡 [Field Operator] ¡PLAY! Tu Street Cred es ${cred} (impar): no se roba carta.`);
      notifyTrigger('📡 FIELD OPERATOR // PLAY', `Tu Street Cred es ${cred} (impar). Solo roba carta si es par.`, 'info');
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-038: Gilded Matón
  // "PLAY You may defeat a friendly Gear. If you do, defeat a rival Unit with cost 3 or less."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-038') {
    const friendlyGears = [];
    (p.field || []).forEach((u) => (u.gear || []).forEach((g) => friendlyGears.push({ gear: g, unit: u })));
    if (friendlyGears.length === 0) {
      state.actionLog.unshift(`🔫 [Gilded Matón] ¡PLAY activado! No controlas ningún Gear aliado para sacrificar.`);
      notifyTrigger('🔫 GILDED MATÓN // PLAY', 'Habilidad PLAY activada, pero no tienes ningún Gear equipado para sacrificar.', 'info');
    } else if (playerKey === 'player') {
      state.pendingTargetSelection = {
        actionType: 'TARGET_GEAR',
        gearAction: 'GILDED_MATON_REWARD',
        targetScope: 'FRIENDLY_GEARS',
        sourceCardId: 'CP-038',
        sourceCardName: 'Gilded Matón',
        sourceCardImage: unitInstance.image,
        title: '🔫 GILDED MATÓN // HABILIDAD PLAY',
        prompt: 'Puedes destruir 1 Gear aliado. Si lo haces, podrás destruir una Unidad rival con coste ≤ 3 €$. (Pulsa Cancelar para omitir)'
      };
    } else {
      const targetOpp = (opp.field || []).find((u) => getNumericCost(u) <= 3);
      if (targetOpp) {
        const sacItem = friendlyGears[0];
        const gIdx = sacItem.unit.gear.indexOf(sacItem.gear);
        if (gIdx !== -1) {
          const [sac] = sacItem.unit.gear.splice(gIdx, 1);
          if (!p.trash) p.trash = [];
          p.trash.push(sac);
        }
        const oIdx = opp.field.indexOf(targetOpp);
        if (oIdx !== -1) {
          const [dead] = opp.field.splice(oIdx, 1);
          sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
          state.actionLog.unshift(`🔫 [Gilded Matón Rival] ¡PLAY! Sacrifica "${sacItem.gear.name}" y destruye a "${dead.name}".`);
        }
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-044: Hacked Corpo
  // "PLAY Trash 3. Add a Program from among them to your hand."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-044') {
    const trashed = trashFromDeck(p, 3, state, cardName);
    const eligibleProgs = trashed.filter((c) => isProgramCard(c));
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'TRASH_AND_CHOOSE',
        sourceZone: 'TRASH_FROM_DECK',
        sourceCardId: 'CP-044',
        sourceCardName: 'Hacked Corpo',
        sourceCardImage: unitInstance.image,
        title: '💻 HACKED CORPO // HABILIDAD PLAY',
        prompt: trashed.length > 0
          ? 'Has enviado 3 cartas de tu mazo a la Basura. Selecciona 1 Programa entre ellas para añadir a tu mano:'
          : 'Tu mazo está vacío. No hay cartas que enviar a la Basura.',
        cards: trashed,
        eligibleIds: eligibleProgs.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: eligibleProgs.length > 0 ? 1 : 0,
        filterDescription: 'Solo cartas de tipo Programa',
        destination: 'HAND'
      };
    } else if (eligibleProgs.length > 0) {
      const [prog] = eligibleProgs;
      const tIdx = p.trash.lastIndexOf(prog);
      if (tIdx !== -1) p.trash.splice(tIdx, 1);
      p.hand.push(prog);
      state.actionLog.unshift(`💻 [Hacked Corpo Rival] ¡PLAY! Añade el Programa "${prog.name}" a su mano.`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-046: Hanako Arasaka // In a Gilded Cage
  // "PLAY Search the top 4 cards of your deck. Reveal any number of cards with cost equal to any friendly Gig values and add them to your hand. Bottom-deck the rest."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-046') {
    const top4 = (p.deck || []).splice(0, Math.min(4, (p.deck || []).length));
    const gigVals = new Set((p.gigs || []).map((g) => Number(g.value)));
    const eligible = top4.filter((c) => gigVals.has(getNumericCost(c)));

    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'SEARCH_AND_CHOOSE',
        sourceZone: 'DECK',
        sourceCardId: 'CP-046',
        sourceCardName: 'Hanako Arasaka // In a Gilded Cage',
        sourceCardImage: unitInstance.image,
        title: '🏯 HANAKO ARASAKA // HABILIDAD PLAY',
        prompt: `Cartas reveladas del tope de tu mazo. Puedes añadir a tu mano cualquier carta cuyo coste coincida con tus Gigs (${[...gigVals].join(', ') || 'ninguno'}). El resto irá al fondo del mazo.`,
        cards: top4,
        eligibleIds: eligible.map((c) => c.instanceId),
        maxChoices: Math.max(eligible.length, 0),
        minChoices: 0,
        filterDescription: `Coste igual a tus Gigs (${[...gigVals].join(', ') || 'ninguno'})`,
        destination: 'HAND',
        remainingDestination: 'BOTTOM_DECK'
      };
    } else {
      eligible.forEach((c) => p.hand.push(c));
      const rest = top4.filter((c) => !eligible.includes(c));
      p.deck.push(...rest);
      state.actionLog.unshift(`🏯 [Hanako Arasaka Rival] ¡PLAY! Revela 4 cartas y añade ${eligible.length} a su mano.`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-047: Heywood Ripperdoc
  // "PLAY You may defeat a Gear. If its cost equals the value of a friendly Gig, draw 1."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-047') {
    const allGears = [];
    (p.field || []).forEach((u) => (u.gear || []).forEach((g) => allGears.push({ gear: g, unit: u, ownerKey: playerKey })));
    (opp.field || []).forEach((u) => (u.gear || []).forEach((g) => allGears.push({ gear: g, unit: u, ownerKey: oppKey })));

    if (allGears.length === 0) {
      state.actionLog.unshift(`🩺 [Heywood Ripperdoc] ¡PLAY activado! No hay ningún Gear equipado en juego.`);
      notifyTrigger('🩺 HEYWOOD RIPPERDOC // PLAY', 'Habilidad PLAY activada, pero no hay ningún Gear equipado en el campo de batalla.', 'info');
    } else if (playerKey === 'player') {
      state.pendingTargetSelection = {
        actionType: 'TARGET_GEAR',
        gearAction: 'HEYWOOD_RIPPERDOC_REWARD',
        targetScope: 'ALL',
        sourceCardId: 'CP-047',
        sourceCardName: 'Heywood Ripperdoc',
        sourceCardImage: unitInstance.image,
        title: '🩺 HEYWOOD RIPPERDOC // HABILIDAD PLAY',
        prompt: 'Puedes destruir cualquier Gear en juego (tuyo o del rival). Si su coste coincide con el valor de uno de tus Gigs, robas 1 carta.'
      };
    } else {
      const rivalGear = allGears.find((item) => item.ownerKey === oppKey);
      if (rivalGear) {
        const gIdx = rivalGear.unit.gear.indexOf(rivalGear.gear);
        if (gIdx !== -1) {
          const [deadGear] = rivalGear.unit.gear.splice(gIdx, 1);
          if (!opp.trash) opp.trash = [];
          opp.trash.push(deadGear);
          const gigVals = new Set((p.gigs || []).map((g) => Number(g.value)));
          if (gigVals.has(getNumericCost(deadGear))) drawCards(p, 1, state, cardName);
          state.actionLog.unshift(`🩺 [Heywood Ripperdoc Rival] ¡PLAY! Destruye tu Gear "${deadGear.name}".`);
        }
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-053: Japantown Jonin
  // "PLAY Give a friendly Unit +2 power this turn."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-053') {
    const friendlyUnits = p.field || [];
    if (playerKey === 'player' && friendlyUnits.length > 1) {
      state.pendingTargetSelection = {
        actionType: 'TARGET_UNIT',
        sourceCardId: 'CP-053',
        sourceCardName: 'Japantown Jonin',
        sourceCardImage: unitInstance.image,
        title: '🥷 JAPANTOWN JONIN // HABILIDAD PLAY',
        prompt: 'Selecciona una Unidad aliada para otorgarle +2 de Fuerza este turno:',
        effectType: 'BUFF',
        amount: 2,
        targetScope: 'FRIENDLY_UNITS'
      };
    } else {
      const target = friendlyUnits[0] || unitInstance;
      target.currentPower = (target.currentPower || 0) + 2;
      state.actionLog.unshift(`🥷 [Japantown Jonin] ¡PLAY! Otorga +2 de Fuerza a "${target.name}" este turno (Poder actual: ${target.currentPower}).`);
      notifyTrigger('🥷 JAPANTOWN JONIN // PLAY', `"${target.name}" recibe +2 de Fuerza este turno (Total: ${target.currentPower}).`, 'success');
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-064: Lizzy Wizzy // Delicate Weapon
  // "PLAY You may play a Program with cost 3 or less from your hand or trash for free. Bottom-deck it after you play it. // BLOCKER"
  // -------------------------------------------------------------------------
  if (cardId === 'CP-064') {
    const handProgs = (p.hand || [])
      .filter((c) => isProgramCard(c) && getNumericCost(c) <= 3)
      .map((c) => ({ ...c, _lizzyZone: 'HAND' }));
    const trashProgs = (p.trash || [])
      .filter((c) => isProgramCard(c) && getNumericCost(c) <= 3)
      .map((c) => ({ ...c, _lizzyZone: 'TRASH' }));
    const eligibleProgs = [...handProgs, ...trashProgs];

    if (playerKey === 'player') {
      if (eligibleProgs.length === 0) {
        state.actionLog.unshift(
          `🎤 [Lizzy Wizzy // Delicate Weapon] ¡PLAY activado! No tienes Programas de coste ≤ 3 €$ en tu Mano ni en tu Basura.`
        );
        notifyTrigger(
          '🎤 LIZZY WIZZY // HABILIDAD PLAY',
          'Habilidad PLAY disparada: puedes jugar gratis un Programa de coste ≤ 3 €$ de tu Mano o Basura (y enviarlo al fondo del mazo), pero actualmente no tienes ninguno elegible.',
          'info'
        );
      } else {
        state.pendingCardChoice = {
          type: 'LIZZY_WIZZY_PLAY_FREE_PROGRAM',
          playerKey: 'player',
          sourceCardId: 'CP-064',
          sourceCardName: 'Lizzy Wizzy // Delicate Weapon',
          sourceCardImage: unitInstance.image,
          title: '🎤 LIZZY WIZZY // HABILIDAD PLAY',
          prompt: `Tienes ${eligibleProgs.length} Programa(s) de coste ≤ 3 €$ en Mano/Basura. Elige 1 para jugarlo GRATIS ahora mismo (irá al fondo de tu mazo tras resolverse), o omite:`,
          cards: eligibleProgs,
          eligibleIds: eligibleProgs.map((c) => c.instanceId),
          maxChoices: 1,
          minChoices: 0,
          selectedIds: [],
          filterDescription: 'Programas de Mano o Basura con coste ≤ 3 €$'
        };
      }
    } else if (eligibleProgs.length > 0) {
      const chosen = eligibleProgs[0];
      if (chosen._lizzyZone === 'HAND') {
        const hIdx = (p.hand || []).findIndex((c) => c.instanceId === chosen.instanceId);
        if (hIdx !== -1) p.hand.splice(hIdx, 1);
      } else {
        const tIdx = (p.trash || []).findIndex((c) => c.instanceId === chosen.instanceId);
        if (tIdx !== -1) p.trash.splice(tIdx, 1);
      }
      p.programsPlayedThisTurn = (p.programsPlayedThisTurn || 0) + 1;
      executeProgramEffect(state, 'bot', chosen);
      if (!p.deck) p.deck = [];
      p.deck.push(chosen);
      state.actionLog.unshift(`🎤 [Lizzy Wizzy Rival] ¡PLAY! Juega gratis el Programa "${chosen.name}" y lo envía al fondo de su mazo.`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-067: Maman Brigitte // Spirit of Death
  // "PLAY You may discard 2 Programs. If you do, bottom-deck a rival unequipped Unit."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-067') {
    const handProgs = (p.hand || []).filter((c) => isProgramCard(c));
    const rivalUnequipped = (opp.field || []).filter((u) => !u.gear || u.gear.length === 0);

    if (playerKey === 'player') {
      if (handProgs.length < 2 || rivalUnequipped.length === 0) {
        const why = handProgs.length < 2
          ? 'necesitas al menos 2 Programas en tu mano para descartar'
          : 'el rival no tiene unidades sin Gear equipado';
        state.actionLog.unshift(`🕯️ [Maman Brigitte] ¡PLAY activado! No se puede ejecutar (${why}).`);
        notifyTrigger('🕯️ MAMAN BRIGITTE // PLAY', `Habilidad PLAY disparada, pero ${why}.`, 'info');
      } else {
        state.pendingCardChoice = {
          type: 'MAMAN_BRIGITTE_DISCARD_2',
          playerKey: 'player',
          sourceCardId: 'CP-067',
          sourceCardName: 'Maman Brigitte // Spirit of Death',
          sourceCardImage: unitInstance.image,
          title: '🕯️ MAMAN BRIGITTE // HABILIDAD PLAY',
          prompt: 'Puedes descartar 2 Programas de tu mano. Si lo haces, enviarás al fondo del mazo una Unidad rival sin Gear equipado:',
          cards: handProgs,
          eligibleIds: handProgs.map((c) => c.instanceId),
          maxChoices: 2,
          minChoices: 0,
          selectedIds: [],
          filterDescription: 'Selecciona exactamente 2 Programas (o ninguno para omitir)'
        };
      }
    } else if (handProgs.length >= 2 && rivalUnequipped.length > 0) {
      for (let i = 0; i < 2; i++) {
        const idx = p.hand.indexOf(handProgs[i]);
        if (idx !== -1) p.trash.push(p.hand.splice(idx, 1)[0]);
      }
      const target = [...rivalUnequipped].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
      const oIdx = opp.field.indexOf(target);
      if (oIdx !== -1) {
        const [removed] = opp.field.splice(oIdx, 1);
        sendUnitToBottomDeck(opp, removed, state);
        state.actionLog.unshift(`🕯️ [Maman Brigitte Rival] ¡PLAY! Descarta 2 Programas y envía a "${removed.name}" al fondo de tu mazo.`);
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-070: MaxTac AV
  // "PLAY You may swap a friendly Gig with a rival Gig."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-070') {
    const friendlyGigs = p.gigs || [];
    const rivalGigs = opp.gigs || [];
    if (friendlyGigs.length === 0 || rivalGigs.length === 0) {
      state.actionLog.unshift(`🚁 [MaxTac AV] ¡PLAY activado! Se requieren al menos 1 Gig aliado y 1 Gig rival para intercambiar.`);
      notifyTrigger('🚁 MAXTAC AV // PLAY', 'Se necesita al menos 1 Gig tuyo y 1 del rival para poder intercambiar.', 'info');
    } else if (playerKey === 'player') {
      queueTargetSelection(state, {
        actionType: 'SWAP_GIGS',
        sourceCardId: 'CP-070',
        sourceCardName: 'MaxTac AV',
        sourceCardImage: unitInstance.image,
        title: '🚁 MAXTAC AV // HABILIDAD PLAY',
        prompt: 'PASO 1 DE 2: Selecciona TU Gig que deseas intercambiar por completo con un Gig del rival (o ESC para omitir):',
        step: 1
      });
    } else {
      let minIdx = 0;
      friendlyGigs.forEach((g, idx) => {
        if (g.value < friendlyGigs[minIdx].value) minIdx = idx;
      });
      let maxIdx = 0;
      rivalGigs.forEach((g, idx) => {
        if (g.value > rivalGigs[maxIdx].value) maxIdx = idx;
      });
      if (rivalGigs[maxIdx].value > friendlyGigs[minIdx].value) {
        const [myDie] = p.gigs.splice(minIdx, 1);
        const [oppDie] = opp.gigs.splice(maxIdx, 1);
        p.gigs.push(oppDie);
        opp.gigs.push(myDie);
        state.actionLog.unshift(
          `🚁 [MaxTac AV Rival] ¡PLAY! Intercambió su ${String(myDie.die).toUpperCase()} (${myDie.value}) por tu ${String(oppDie.die).toUpperCase()} (${oppDie.value}).`
        );
        triggerMeredithStoutOnRivalGigModify(state, oppKey);
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-076: Minotaur
  // "PLAY If you have more Street Cred than a Rival, defeat a rival Unit with power 5 or less."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-076') {
    const myCred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const oppCred = (opp.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    if (myCred <= oppCred) {
      state.actionLog.unshift(`🤖 [Minotaur] ¡PLAY activado! Tu Street Cred (${myCred}) no supera al del rival (${oppCred}).`);
      notifyTrigger('🤖 MINOTAUR // PLAY', `Tu Street Cred (${myCred}) no es mayor que el del rival (${oppCred}).`, 'info');
      return;
    }
    const eligibleUnits = (opp.field || []).filter((u) => (u.currentPower || 0) <= 5);
    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`🤖 [Minotaur] ¡PLAY activado! El rival no tiene unidades con Fuerza ≤ 5.`);
      notifyTrigger('🤖 MINOTAUR // PLAY', 'El rival no controla unidades con Fuerza ≤ 5.', 'info');
    } else if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        const [dead] = opp.field.splice(opp.field.indexOf(eligibleUnits[0]), 1);
        sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
        state.actionLog.unshift(`🤖 [Minotaur] ¡PLAY! Destruye a la unidad rival "${dead.name}" (Fuerza ≤ 5).`);
        notifyTrigger('🤖 MINOTAUR // PLAY', `Has destruido a "${dead.name}" (Fuerza ≤ 5).`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-076',
          sourceCardName: 'Minotaur',
          sourceCardImage: unitInstance.image,
          title: '🤖 MINOTAUR // HABILIDAD PLAY',
          prompt: 'Selecciona la unidad rival que deseas destruir (Fuerza ≤ 5):',
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS',
          maxPower: 5
        };
      }
    } else {
      const target = [...eligibleUnits].sort((a, b) => b.currentPower - a.currentPower)[0];
      const [dead] = opp.field.splice(opp.field.indexOf(target), 1);
      sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
      state.actionLog.unshift(`🤖 [Minotaur Rival] ¡PLAY! Destruye a tu unidad "${dead.name}".`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-080: Mox Inciters
  // "PLAY A rival Unit must attack next turn if it can. // BLOCKER"
  // -------------------------------------------------------------------------
  if (cardId === 'CP-080') {
    const oppUnits = opp.field || [];
    if (oppUnits.length === 0) {
      state.actionLog.unshift(`⚡ [Mox Inciters] ¡PLAY activado! El rival no tiene unidades en el campo.`);
      notifyTrigger('⚡ MOX INCITERS // PLAY', 'El rival no controla unidades para provocar.', 'info');
    } else if (playerKey === 'player') {
      if (oppUnits.length === 1) {
        oppUnits[0].mustAttackNextTurn = true;
        state.actionLog.unshift(`⚡ [Mox Inciters] ¡PLAY! "${oppUnits[0].name}" del rival deberá atacar en su próximo turno si puede.`);
        notifyTrigger('⚡ MOX INCITERS // PLAY', `"${oppUnits[0].name}" del rival está obligada a atacar en su próximo turno.`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-080',
          sourceCardName: 'Mox Inciters',
          sourceCardImage: unitInstance.image,
          title: '⚡ MOX INCITERS // HABILIDAD PLAY',
          prompt: 'Selecciona una Unidad rival: deberá atacar en su próximo turno si puede:',
          effectType: 'MUST_ATTACK',
          targetScope: 'RIVAL_UNITS'
        };
      }
    } else {
      oppUnits[0].mustAttackNextTurn = true;
      state.actionLog.unshift(`⚡ [Mox Inciters Rival] ¡PLAY! Tu unidad "${oppUnits[0].name}" debe atacar el próximo turno.`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-087: Off-Duty Malfini
  // "PLAY Spend this Unit and a rival Unit."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-087') {
    unitInstance.isSpent = true;
    const eligibleUnits = (opp.field || []).filter((u) => !u.isSpent);
    if (eligibleUnits.length === 0) {
      state.actionLog.unshift(`🦅 [Off-Duty Malfini] ¡PLAY! Se gira a sí mismo (el rival no tiene unidades listas para girar).`);
      notifyTrigger('🦅 OFF-DUTY MALFINI // PLAY', 'Se gira a sí mismo. El rival no tiene unidades enderezadas para girar.', 'info');
    } else if (playerKey === 'player') {
      if (eligibleUnits.length === 1) {
        eligibleUnits[0].isSpent = true;
        state.actionLog.unshift(`🦅 [Off-Duty Malfini] ¡PLAY! Se gira a sí mismo y gira a la unidad rival "${eligibleUnits[0].name}".`);
        notifyTrigger('🦅 OFF-DUTY MALFINI // PLAY', `Girada la unidad rival "${eligibleUnits[0].name}".`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-087',
          sourceCardName: 'Off-Duty Malfini',
          sourceCardImage: unitInstance.image,
          title: '🦅 OFF-DUTY MALFINI // HABILIDAD PLAY',
          prompt: 'Selecciona la unidad rival que deseas girar (Spend):',
          effectType: 'SPEND',
          targetScope: 'RIVAL_UNITS'
        };
      }
    } else {
      eligibleUnits[0].isSpent = true;
      state.actionLog.unshift(`🦅 [Off-Duty Malfini Rival] ¡PLAY! Gira a tu unidad "${eligibleUnits[0].name}".`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-090: Pacifica Netrunner
  // "PLAY If your Street Cred is an even number, a rival Unit can't ready until your next turn."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-090') {
    const myCred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    if (myCred % 2 !== 0) {
      state.actionLog.unshift(`💻 [Pacifica Netrunner] ¡PLAY! Tu Street Cred (${myCred}) es impar; requiere número par.`);
      notifyTrigger('💻 PACIFICA NETRUNNER // PLAY', `Tu Street Cred es ${myCred} (impar). Solo bloquea enderezado si es par.`, 'info');
      return;
    }
    const oppUnits = opp.field || [];
    if (oppUnits.length === 0) {
      state.actionLog.unshift(`💻 [Pacifica Netrunner] ¡PLAY! Street Cred par (${myCred}), pero el rival no tiene unidades.`);
      notifyTrigger('💻 PACIFICA NETRUNNER // PLAY', 'Street Cred par, pero el rival no tiene unidades en el campo.', 'info');
    } else if (playerKey === 'player') {
      if (oppUnits.length === 1) {
        oppUnits[0].cannotReadyUntilNextTurn = true;
        state.actionLog.unshift(`💻 [Pacifica Netrunner] ¡PLAY! "${oppUnits[0].name}" del rival no podrá enderezarse hasta tu próximo turno.`);
        notifyTrigger('💻 PACIFICA NETRUNNER // PLAY', `"${oppUnits[0].name}" no podrá enderezarse hasta tu próximo turno.`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-090',
          sourceCardName: 'Pacifica Netrunner',
          sourceCardImage: unitInstance.image,
          title: '💻 PACIFICA NETRUNNER // HABILIDAD PLAY',
          prompt: `Tu Street Cred (${myCred}) es par. Selecciona una Unidad rival que NO podrá enderezarse hasta tu próximo turno:`,
          effectType: 'CANNOT_READY',
          targetScope: 'RIVAL_UNITS'
        };
      }
    } else {
      oppUnits[0].cannotReadyUntilNextTurn = true;
      state.actionLog.unshift(`💻 [Pacifica Netrunner Rival] ¡PLAY! Tu unidad "${oppUnits[0].name}" no podrá enderezarse.`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-096: Placide // Voodoo Sentinel
  // "PLAY ATTACK You may discard 1 Program. If you do, bottom-deck a rival Unit."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-096') {
    const handProgs = (p.hand || []).filter((c) => isProgramCard(c));
    const oppUnits = opp.field || [];
    if (playerKey === 'player') {
      if (handProgs.length === 0 || oppUnits.length === 0) {
        const why = handProgs.length === 0 ? 'no tienes Programas en mano para descartar' : 'el rival no tiene unidades en el campo';
        state.actionLog.unshift(`📡 [Placide] ¡PLAY activado! No se puede ejecutar (${why}).`);
        notifyTrigger('📡 PLACIDE // PLAY', `Habilidad PLAY disparada, pero ${why}.`, 'info');
      } else {
        state.pendingCardChoice = {
          type: 'PLACIDE_DISCARD_1',
          playerKey: 'player',
          sourceCardId: 'CP-096',
          sourceCardName: 'Placide // Voodoo Sentinel',
          sourceCardImage: unitInstance.image,
          title: '📡 PLACIDE // HABILIDAD PLAY',
          prompt: 'Puedes descartar 1 Programa de tu mano. Si lo haces, enviarás una Unidad rival al fondo de su mazo:',
          cards: handProgs,
          eligibleIds: handProgs.map((c) => c.instanceId),
          maxChoices: 1,
          minChoices: 0,
          selectedIds: [],
          filterDescription: 'Elige 1 Programa para descartar (o ninguno para omitir)'
        };
      }
    } else if (handProgs.length > 0 && oppUnits.length > 0) {
      const idx = p.hand.indexOf(handProgs[0]);
      if (idx !== -1) p.trash.push(p.hand.splice(idx, 1)[0]);
      const target = [...oppUnits].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
      const oIdx = opp.field.indexOf(target);
      if (oIdx !== -1) {
        const [removed] = opp.field.splice(oIdx, 1);
        sendUnitToBottomDeck(opp, removed, state);
        state.actionLog.unshift(`📡 [Placide Rival] ¡PLAY! Descarta 1 Programa y envía a "${removed.name}" al fondo de tu mazo.`);
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-108: Royce // Don't Call Me Simon
  // "PLAY Defeat a rival Unit with power 2 or less. If you have more Street Cred than a Rival, defeat a rival Unit with power 3 or less instead."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-108') {
    const myCred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const oppCred = (opp.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const maxPower = myCred > oppCred ? 3 : 2;
    const eligible = (opp.field || []).filter((u) => (u.currentPower || 0) <= maxPower);

    if (eligible.length === 0) {
      state.actionLog.unshift(`🦾 [Royce] ¡PLAY activado! El rival no tiene unidades con Fuerza ≤ ${maxPower}.`);
      notifyTrigger('🦾 ROYCE // PLAY', `El rival no tiene unidades con Fuerza ≤ ${maxPower}.`, 'info');
    } else if (playerKey === 'player') {
      if (eligible.length === 1) {
        const [dead] = opp.field.splice(opp.field.indexOf(eligible[0]), 1);
        sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
        state.actionLog.unshift(`🦾 [Royce] ¡PLAY! Destruye a la unidad rival "${dead.name}" (Fuerza ≤ ${maxPower}).`);
        notifyTrigger('🦾 ROYCE // PLAY', `Has destruido a la unidad rival "${dead.name}" (Fuerza ≤ ${maxPower}).`, 'success');
      } else {
        state.pendingTargetSelection = {
          actionType: 'TARGET_UNIT',
          sourceCardId: 'CP-108',
          sourceCardName: 'Royce // Don\'t Call Me Simon',
          sourceCardImage: unitInstance.image,
          title: '🦾 ROYCE // HABILIDAD PLAY',
          prompt: `Selecciona una Unidad rival con Fuerza ≤ ${maxPower} para destruirla:`,
          effectType: 'DEFEAT',
          targetScope: 'RIVAL_UNITS',
          maxPower
        };
      }
    } else {
      const target = [...eligible].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
      const [dead] = opp.field.splice(opp.field.indexOf(target), 1);
      sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
      state.actionLog.unshift(`🦾 [Royce Rival] ¡PLAY! Destruye a tu unidad "${dead.name}" (Fuerza ≤ ${maxPower}).`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-113: Sandayu Oda // Hanako's Guardian
  // "PLAY Spend a rival Unit for each friendly value-pair of Gigs. // This Unit can attack rival Units the turn it's played."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-113') {
    unitInstance.canAttackSpentUnitsTurnPlayed = true;
    const pairs = countGigValuePairs(p.gigs || []);
    const readyOppUnits = (opp.field || []).filter((u) => !u.isSpent);
    if (pairs === 0 || readyOppUnits.length === 0) {
      state.actionLog.unshift(
        `⚔️ [Sandayu Oda] ¡PLAY! Puede atacar a unidades rivales este turno. (Parejas de Gigs: ${pairs}, rivales listas: ${readyOppUnits.length}).`
      );
      notifyTrigger(
        '⚔️ SANDAYU ODA // PLAY',
        pairs === 0
          ? 'Sandayu Oda entra listo para atacar a unidades rivales este turno (no controlas parejas de Gigs para girar rivales).'
          : 'Sandayu Oda entra listo para atacar a unidades rivales este turno (el rival no tiene unidades listas para girar).',
        'info'
      );
    } else if (playerKey === 'player' && pairs < readyOppUnits.length) {
      state.pendingTargetSelection = {
        actionType: 'TARGET_UNIT',
        sourceCardId: 'CP-113',
        sourceCardName: 'Sandayu Oda // Hanako\'s Guardian',
        sourceCardImage: unitInstance.image,
        title: '⚔️ SANDAYU ODA // HABILIDAD PLAY',
        prompt: `Tienes ${pairs} pareja(s) de Gigs de igual valor. Selecciona una Unidad rival para girarla (Spend):`,
        effectType: 'SPEND',
        targetScope: 'RIVAL_UNITS',
        remainingSpends: pairs - 1
      };
    } else {
      const toSpend = readyOppUnits.slice(0, pairs);
      toSpend.forEach((u) => { u.isSpent = true; });
      state.actionLog.unshift(
        `⚔️ [Sandayu Oda] ¡PLAY! Por tus ${pairs} pareja(s) de Gigs, gira a: ${toSpend.map((u) => u.name).join(', ')}.`
      );
      notifyTrigger('⚔️ SANDAYU ODA // PLAY', `Giradas ${toSpend.length} unidad(es) rival(es): ${toSpend.map((u) => u.name).join(', ')}.`, 'success');
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-133: Tyger's Whisper
  // "PLAY You may Call a Legend for free. (You can only Call a Legend once per turn.)"
  // -------------------------------------------------------------------------
  if (cardId === 'CP-133') {
    if (p.hasCalledLegendThisTurn) {
      state.actionLog.unshift(`🐯 [Tyger's Whisper] ¡PLAY activado! Pero ya llamaste a una Leyenda este turno (máximo 1/turno).`);
      notifyTrigger("🐯 TYGER'S WHISPER // PLAY", 'Ya has llamado a una Leyenda este turno (límite oficial: 1 vez por turno).', 'info');
      return;
    }
    const faceDownLegends = (p.legends || []).filter((l) => !l.isFaceUp);
    if (faceDownLegends.length === 0) {
      state.actionLog.unshift(`🐯 [Tyger's Whisper] ¡PLAY activado! Todas tus Leyendas ya están boca arriba.`);
      notifyTrigger("🐯 TYGER'S WHISPER // PLAY", 'Todas tus Leyendas ya están boca arriba.', 'info');
    } else {
      const targetLeg = faceDownLegends[0];
      targetLeg.isFaceUp = true;
      p.hasCalledLegendThisTurn = true;
      state.actionLog.unshift(`🐯 [Tyger's Whisper] ¡PLAY! Llama GRATIS a la Leyenda "${targetLeg.name}" boca arriba.`);
      executeCallLegendTrigger(state, playerKey, targetLeg);
      if (!state.pendingModalChoice && !state.pendingCardChoice && !state.pendingTargetSelection) {
        notifyTrigger("🐯 TYGER'S WHISPER // PLAY", `Has llamado gratis a la Leyenda "${targetLeg.name}".`, 'success');
      }
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-139: Valentino Street Racer
  // "PLAY Give another friendly Unit with cost 5 or less ADRENALINE this turn."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-139') {
    const eligible = (p.field || []).filter(
      (u) => u.instanceId !== unitInstance.instanceId && getNumericCost(u) <= 5
    );
    if (eligible.length === 0) {
      state.actionLog.unshift(`🏎️ [Valentino Street Racer] ¡PLAY activado! No tienes otra Unidad aliada con coste ≤ 5 €$.`);
      notifyTrigger('🏎️ VALENTINO STREET RACER // PLAY', 'No controlas otra unidad aliada con coste ≤ 5 €$.', 'info');
    } else if (playerKey === 'player' && eligible.length > 1) {
      state.pendingTargetSelection = {
        actionType: 'TARGET_UNIT',
        sourceCardId: 'CP-139',
        sourceCardName: 'Valentino Street Racer',
        sourceCardImage: unitInstance.image,
        title: '🏎️ VALENTINO STREET RACER // HABILIDAD PLAY',
        prompt: 'Selecciona otra Unidad aliada con coste ≤ 5 €$ para otorgarle ADRENALINE este turno:',
        effectType: 'ADRENALINE',
        targetScope: 'FRIENDLY_UNITS',
        maxCost: 5,
        excludeInstanceId: unitInstance.instanceId
      };
    } else {
      const otherUnit = eligible[0];
      otherUnit.isLagging = false;
      otherUnit.hasAdrenaline = true;
      otherUnit.hasTemporaryAdrenalineThisTurn = true;
      state.actionLog.unshift(`🏎️ [Valentino Street Racer] ¡PLAY! Otorga ADRENALINE a "${otherUnit.name}" (puede atacar ya).`);
      notifyTrigger('🏎️ VALENTINO STREET RACER // PLAY', `"${otherUnit.name}" gana ADRENALINE y puede atacar este turno.`, 'success');
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-142: Viktor Vektor // You Might Feel a Little Pinch
  // "PLAY Play a CYBERWARE Gear with cost 2 or less from your trash for free. Equip it only to another friendly Unit."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-142') {
    const otherUnits = (p.field || []).filter((u) => u.instanceId !== unitInstance.instanceId);
    const eligibleGears = (p.trash || []).filter((c) => {
      if (!isGearCard(c) || getNumericCost(c) > 2) return false;
      const meta = String(c.traits || c.cardType || '').toUpperCase();
      return meta.includes('CYBERWARE') || !meta;
    });

    if (otherUnits.length === 0 || eligibleGears.length === 0) {
      const why = otherUnits.length === 0
        ? 'no tienes otra Unidad aliada a la que equipar el Gear'
        : 'no tienes ningún Gear CYBERWARE de coste ≤ 2 €$ en tu Basura';
      state.actionLog.unshift(`💉 [Viktor Vektor] ¡PLAY activado! No se puede ejecutar (${why}).`);
      notifyTrigger('💉 VIKTOR VEKTOR // PLAY', `Habilidad PLAY disparada, pero ${why}.`, 'info');
    } else if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'VIKTOR_PLAY_TRASH_GEAR',
        playerKey: 'player',
        sourceCardId: 'CP-142',
        sourceCardName: 'Viktor Vektor // You Might Feel a Little Pinch',
        sourceCardImage: unitInstance.image,
        excludeUnitId: unitInstance.instanceId,
        title: '💉 VIKTOR VEKTOR // HABILIDAD PLAY',
        prompt: 'Elige 1 Gear CYBERWARE de coste ≤ 2 €$ de tu Basura para equiparlo GRATIS a otra Unidad aliada:',
        cards: eligibleGears,
        eligibleIds: eligibleGears.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: 0,
        selectedIds: [],
        filterDescription: 'Gear CYBERWARE con coste ≤ 2 €$'
      };
    } else {
      const gear = eligibleGears[0];
      const gIdx = p.trash.indexOf(gear);
      if (gIdx !== -1) p.trash.splice(gIdx, 1);
      const targetUnit = otherUnits[0];
      targetUnit.gear = targetUnit.gear || [];
      targetUnit.gear.push(gear);
      const bonus = gear.powerBonus || gear.parsedPower || 1;
      targetUnit.currentPower = (targetUnit.currentPower || 0) + bonus;
      state.actionLog.unshift(`💉 [Viktor Vektor Rival] ¡PLAY! Equipa gratis "${gear.name}" desde la Basura a "${targetUnit.name}".`);
    }
    return;
  }

  // -------------------------------------------------------------------------
  // CP-145: Westbrook Netrunner
  // "PLAY Until your next turn, rival Legends can't steal friendly Gigs with value less than their power."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-145') {
    p.westbrookProtectionActive = true;
    state.actionLog.unshift(
      `🌐 [Westbrook Netrunner] ¡PLAY! Hasta tu próximo turno, las Leyendas rivales no pueden robar tus Gigs con valor inferior a su Fuerza.`
    );
    notifyTrigger('🌐 WESTBROOK NETRUNNER // PLAY', 'Protección activa hasta tu próximo turno contra robo de Gigs por Leyendas rivales.', 'success');
    return;
  }

  // -------------------------------------------------------------------------
  // CP-149: Yorinobu Arasaka // Steel Dragon
  // "PLAY You may play a Unit with cost 4 or less from your hand or trash for free. It can attack rival Units this turn."
  // -------------------------------------------------------------------------
  if (cardId === 'CP-149') {
    const handUnits = (p.hand || [])
      .filter((c) => isUnitCard(c) && getNumericCost(c) <= 4)
      .map((c) => ({ ...c, _yorinobuZone: 'HAND' }));
    const trashUnits = (p.trash || [])
      .filter((c) => isUnitCard(c) && getNumericCost(c) <= 4)
      .map((c) => ({ ...c, _yorinobuZone: 'TRASH' }));
    const eligibleUnits = [...handUnits, ...trashUnits];

    if (playerKey === 'player') {
      if (eligibleUnits.length === 0) {
        state.actionLog.unshift(`🐉 [Yorinobu Arasaka] ¡PLAY activado! No tienes Unidades con coste ≤ 4 €$ en Mano ni en Basura.`);
        notifyTrigger('🐉 YORINOBU ARASAKA // PLAY', 'No tienes Unidades de coste ≤ 4 €$ en tu Mano ni en tu Basura.', 'info');
      } else {
        state.pendingCardChoice = {
          type: 'YORINOBU_PLAY_FREE_UNIT',
          playerKey: 'player',
          sourceCardId: 'CP-149',
          sourceCardName: 'Yorinobu Arasaka // Steel Dragon',
          sourceCardImage: unitInstance.image,
          title: '🐉 YORINOBU ARASAKA // HABILIDAD PLAY',
          prompt: `Elige 1 Unidad con coste ≤ 4 €$ de tu Mano o Basura para jugarla GRATIS (podrá atacar a Unidades rivales este turno):`,
          cards: eligibleUnits,
          eligibleIds: eligibleUnits.map((c) => c.instanceId),
          maxChoices: 1,
          minChoices: 0,
          selectedIds: [],
          filterDescription: 'Unidades de Mano o Basura con coste ≤ 4 €$'
        };
      }
    } else if (eligibleUnits.length > 0) {
      const chosen = [...eligibleUnits].sort((a, b) => (b.parsedPower || 0) - (a.parsedPower || 0))[0];
      if (chosen._yorinobuZone === 'HAND') {
        const idx = p.hand.findIndex((c) => c.instanceId === chosen.instanceId);
        if (idx !== -1) p.hand.splice(idx, 1);
      } else {
        const idx = p.trash.findIndex((c) => c.instanceId === chosen.instanceId);
        if (idx !== -1) p.trash.splice(idx, 1);
      }
      const chosenId = resolveCardId(chosen);
      const hasInnateAdrenaline = chosenId === 'CP-078' || chosenId === 'CP-101';
      const deployed = {
        ...chosen,
        isSpent: false,
        isLagging: !hasInnateAdrenaline,
        hasAdrenaline: hasInnateAdrenaline,
        canAttackSpentUnitsTurnPlayed: true,
        turnEntered: state.turnNumber,
        currentPower: chosen.parsedPower || Number(chosen.powerVal) || 1,
        gear: []
      };
      p.field.push(deployed);
      state.actionLog.unshift(`🐉 [Yorinobu Arasaka Rival] ¡PLAY! Despliega gratis a "${deployed.name}".`);
      executeUnitPlayTrigger(state, 'bot', deployed);
    }
    return;
  }
}

// =========================================================================
// 3. MOTOR DE DISPARADORES DE ATAQUE (ON-ATTACK TRIGGERS)
// =========================================================================

export function executeUnitAttackTrigger(state, playerKey, attackerUnit) {
  if (!state || !attackerUnit) return;
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = resolveCardId(attackerUnit);
  const cardName = attackerUnit.name || 'Unidad';

  // CP-095: Pepe Najarro // Working Doubles
  // "ATTACK If you control a value-pair of Gigs, ready up to 2 MERC Legends in your Legends area."
  if (cardId === 'CP-095') {
    const pairs = countGigValuePairs(p.gigs || []);
    if (pairs <= 0) {
      state.actionLog.unshift(
        `🍸 [Pepe Najarro] ¡ATTACK activado! No controlas ninguna pareja de Gigs con el mismo valor.`
      );
      return;
    }
    const spentMercLegends = (p.legends || []).filter((l) => {
      if (!l.isFaceUp || !l.isSpent || l.isOnField || l.isRemovedFromGame) return false;
      const meta = `${l.traits || ''} ${l.cardType || ''}`;
      return /\bMERC\b/i.test(meta);
    });
    if (spentMercLegends.length === 0) {
      state.actionLog.unshift(
        `🍸 [Pepe Najarro] ¡ATTACK! Controlas pareja de Gigs, pero no tienes Leyendas MERC boca arriba y giradas en tu Zona de Leyendas.`
      );
      return;
    }
    if (playerKey === 'player' && spentMercLegends.length > 2) {
      state.pendingCardChoice = {
        type: 'PEPE_READY_MERC_LEGENDS',
        playerKey: 'player',
        sourceCardId: 'CP-095',
        sourceCardName: 'Pepe Najarro // Working Doubles',
        sourceCardImage: attackerUnit.image,
        title: '🍸 PEPE NAJARRO // HABILIDAD ATTACK',
        prompt: '¡Controlas una pareja de Gigs! Elige hasta 2 Leyendas MERC giradas en tu Zona de Leyendas para enderezarlas:',
        cards: spentMercLegends,
        eligibleIds: spentMercLegends.map((l) => l.instanceId),
        maxChoices: 2,
        minChoices: 0,
        selectedIds: [],
        filterDescription: 'Hasta 2 Leyendas MERC giradas en tu Zona de Leyendas'
      };
      return;
    }
    const toReady = spentMercLegends.slice(0, 2);
    toReady.forEach((l) => {
      l.isSpent = false;
    });
    state.actionLog.unshift(
      `🍸 [Pepe Najarro] ¡ATTACK! ¡Pareja de Gigs confirmada! Endereza ${toReady.length} Leyenda(s) MERC: ${toReady.map((l) => l.name).join(', ')}.`
    );
    return;
  }

  // CP-096: Placide // Voodoo Sentinel ("PLAY ATTACK You may discard 1 Program. If you do, bottom-deck a rival Unit.")
  if (cardId === 'CP-096') {
    const handProgs = (p.hand || []).filter((c) => isProgramCard(c));
    const oppUnits = opp.field || [];
    if (playerKey === 'player' && handProgs.length > 0 && oppUnits.length > 0) {
      state.pendingCardChoice = {
        type: 'PLACIDE_DISCARD_1',
        playerKey: 'player',
        sourceCardId: 'CP-096',
        sourceCardName: 'Placide // Voodoo Sentinel',
        sourceCardImage: attackerUnit.image,
        title: '📡 PLACIDE // HABILIDAD ATTACK',
        prompt: 'Puedes descartar 1 Programa de tu mano. Si lo haces, enviarás una Unidad rival al fondo de su mazo:',
        cards: handProgs,
        eligibleIds: handProgs.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: 0,
        selectedIds: [],
        filterDescription: 'Elige 1 Programa para descartar (o ninguno para omitir)'
      };
    } else if (playerKey === 'bot' && handProgs.length > 0 && oppUnits.length > 0) {
      const idx = p.hand.indexOf(handProgs[0]);
      if (idx !== -1) p.trash.push(p.hand.splice(idx, 1)[0]);
      const target = [...oppUnits].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
      const oIdx = opp.field.indexOf(target);
      if (oIdx !== -1) {
        const [removed] = opp.field.splice(oIdx, 1);
        sendUnitToBottomDeck(opp, removed, state);
        state.actionLog.unshift(`📡 [Placide Rival] ¡ATTACK! Descarta 1 Programa y envía a "${removed.name}" al fondo de tu mazo.`);
      }
    }
  }

  // CP-031: El Sombrerón
  if (cardId === 'CP-031') {
    const maxGig = Math.max(1, ...(p.gigs || []).map((g) => g.value || 1));
    attackerUnit.currentPower = (attackerUnit.currentPower || 0) + maxGig;
    state.actionLog.unshift(`🤠 [El Sombrerón] Suma el valor de tu mayor Gig (+${maxGig} poder) al ataque.`);
  }

  // CP-034: Evelyn Parker // Scheming Siren
  if (cardId === 'CP-034') {
    drawCards(p, 1, state, cardName);
    discardCards(p, 1, state, cardName);
  }

  // CP-041: Goro Takemura // Losing His Way
  if (cardId === 'CP-041') {
    const allFaceUp = (p.legends || []).every((l) => l.isFaceUp);
    if (allFaceUp && p.legends?.length > 0) {
      attackerUnit.currentPower = (attackerUnit.currentPower || 0) + 5;
      state.actionLog.unshift(`⚔️ [Goro Takemura] ¡Todas las leyendas activas! +5 de poder al ataque.`);
    }
  }

  // CP-052: Jackie Welles // Ride or Die Choom
  if (cardId === 'CP-052') {
    const evenGigs = (p.gigs || []).filter((g) => (g.value || 0) % 2 === 0).length;
    if (evenGigs > 0) {
      const bonus = evenGigs * 2;
      attackerUnit.currentPower = (attackerUnit.currentPower || 0) + bonus;
      state.actionLog.unshift(`🏍️ [Jackie Welles] +${bonus} de poder por tus ${evenGigs} Gig(s) pares.`);
    }
  }

  // CP-115: Sasha Yakovleva // Won't Let You Down
  if (cardId === 'CP-115') {
    if (p.deck && p.deck.length > 0) {
      const revealed = p.deck.shift();
      p.hand.push(revealed);
      const bonus = revealed.costNum || 1;
      attackerUnit.currentPower = (attackerUnit.currentPower || 0) + bonus;
      state.actionLog.unshift(`🐱 [Sasha Yakovleva] Revela "${revealed.name}" (+${bonus} poder al ataque).`);
    }
  }

  // CP-121: Sketchy Ripper
  if (cardId === 'CP-121' || attackerUnit.name.includes('Sketchy Ripper')) {
    const examined = (p.deck || []).splice(0, Math.min(3, p.deck?.length || 0));
    const gears = examined.filter((c) => c.officialType === 'GEAR' || c.type?.includes('GEAR'));

    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'SEARCH_AND_CHOOSE',
        sourceZone: 'DECK',
        sourceCardId: 'CP-121',
        sourceCardName: attackerUnit.name,
        sourceCardImage: attackerUnit.image,
        title: '🔧 SKETCHY RIPPER // HABILIDAD ATTACK',
        prompt: examined.length > 0
          ? 'Se han examinado las 3 cartas superiores de tu mazo. Selecciona 1 Gear para añadir a tu mano (el resto irá al fondo de tu mazo):'
          : 'Tu mazo está vacío. No hay cartas que examinar.',
        cards: examined,
        eligibleIds: gears.map((g) => g.instanceId),
        maxChoices: 1,
        minChoices: gears.length > 0 ? 1 : 0,
        filterDescription: 'Solo cartas de tipo Gear',
        remainingDestination: 'BOTTOM_DECK',
        destination: 'HAND'
      };
    } else {
      // Bot auto-resolves
      if (gears.length > 0) {
        const found = gears[0];
        const remaining = examined.filter((c) => c.instanceId !== found.instanceId);
        p.hand.push(found);
        p.deck.push(...remaining);
        state.actionLog.unshift(`🔧 [Sketchy Ripper] ¡El rival encontró "${found.name}"! Añadido a su mano.`);
      } else {
        p.deck.push(...examined);
        state.actionLog.unshift(`🔍 [Sketchy Ripper] El rival revisó 3 cartas pero no encontró ningún Gear.`);
      }
    }
  }

  // CP-122: Swordwise Huscle
  if (cardId === 'CP-122') {
    if ((attackerUnit.currentPower || 0) >= 5) {
      drawCards(p, 1, state, cardName);
    }
  }

  // CP-027: Dexter DeShawn // One Last Chance ("PLAY ATTACK Adjust a Gig by up to 1.")
  if (cardId === 'CP-027') {
    const allGigs = [...(p.gigs || []), ...(opp.gigs || [])];
    if (allGigs.length > 0) {
      if (playerKey === 'player') {
        queueTargetSelection(state, {
          actionType: 'ADJUST_GIG',
          sourceCardId: 'CP-027',
          sourceCardName: 'Dexter DeShawn // One Last Chance',
          sourceCardImage: attackerUnit.image,
          title: '🎲 DEXTER DESHAWN // HABILIDAD ATTACK',
          prompt: '¡Dexter ataca! Elige cualquier Gig en juego (tuyo o del rival) para ajustarlo en +1, -1 o dejarlo igual:',
          canIncrease: true,
          canDecrease: true,
          maxDelta: 1,
          allowZero: true
        });
      } else {
        const targetGig = (p.gigs || [])[0] || (opp.gigs || [])[0];
        if (targetGig) {
          const oldVal = targetGig.value;
          const isOwn = (p.gigs || []).includes(targetGig);
          targetGig.value = isOwn
            ? Math.min(getGigMaxFace(targetGig), (targetGig.value || 1) + 1)
            : Math.max(1, (targetGig.value || 1) - 1);
          state.actionLog.unshift(
            `🎲 [Dexter DeShawn Rival] ¡ATTACK! Ajusta el Gig ${String(targetGig.die).toUpperCase()} de ${oldVal} a ${targetGig.value}.`
          );
          if (!isOwn) triggerMeredithStoutOnRivalGigModify(state, oppKey);
        }
      }
    }
  }

  // GEARS EQUIPADOS CON TRIGGER ATTACK:
  // CP-030: Dying Night // V's Pistol ("ATTACK Decrease a Gig by up to 2.")
  const dyingNights = (attackerUnit.gear || []).filter((g) => resolveCardId(g) === 'CP-030');
  if (dyingNights.length > 0) {
    const allGigs = [...(p.gigs || []), ...(opp.gigs || [])];
    dyingNights.forEach((pistol) => {
      if (allGigs.length === 0) return;
      if (playerKey === 'player') {
        queueTargetSelection(state, {
          actionType: 'ADJUST_GIG',
          sourceCardId: 'CP-030',
          sourceCardName: "Dying Night // V's Pistol",
          sourceCardImage: pistol.image || attackerUnit.image,
          title: "🔫 DYING NIGHT // HABILIDAD ATTACK (-HASTA 2)",
          prompt: `"${attackerUnit.name}" ataca con Dying Night. Elige cualquier Gig en juego (tuyo o del rival) para reducirlo en -1, -2 o dejarlo igual:`,
          canIncrease: false,
          canDecrease: true,
          maxDelta: 2,
          allowZero: true
        });
      } else {
        const targetGig =
          (opp.gigs && opp.gigs.length > 0 ? [...opp.gigs].sort((a, b) => b.value - a.value)[0] : null) ||
          (p.gigs || [])[0];
        if (targetGig) {
          const isOpp = (opp.gigs || []).includes(targetGig);
          const oldVal = targetGig.value;
          targetGig.value = Math.max(1, (targetGig.value || 1) - 2);
          state.actionLog.unshift(
            `🔫 [Dying Night Rival] ¡ATTACK! Reduce el Gig ${String(targetGig.die).toUpperCase()} de ${oldVal} a ${targetGig.value}.`
          );
          if (isOpp) triggerMeredithStoutOnRivalGigModify(state, oppKey);
        }
      }
    });
  }
}

// =========================================================================
// 4. MOTOR DE VICTORIA EN COMBATE (ON COMBAT WIN TRIGGERS)
// =========================================================================

export function executeCombatWinTrigger(state, winnerPlayerKey, winningUnit, defeatedUnit) {
  if (!state || !winningUnit) return;
  const p = state[winnerPlayerKey];
  const cardId = winningUnit.id || '';

  // CP-054: Johnny Silverhand // Never Stop Fighting
  if (cardId === 'CP-054' || winningUnit.name.includes('Never Stop Fighting')) {
    if (!winningUnit.hasReadiedThisTurn) {
      winningUnit.isSpent = false;
      winningUnit.hasReadiedThisTurn = true;
      state.actionLog.unshift(`🎸 [Johnny Silverhand] "Never Stop Fighting": ¡Gana el combate y se ENDEREZA!`);
    }
  }

  // CP-116: Satori // Sword of Saburo (Gear)
  const hasSatori = (winningUnit.gear || []).some((g) => g.id === 'CP-116' || g.name.includes('Satori'));
  if (hasSatori) {
    drawCards(p, 1, state, 'Satori // Sword of Saburo');
  }

  // CP-010: Appetite for Destruction
  if (p.appetiteForDestructionActive) {
    const oppKey = winnerPlayerKey === 'player' ? 'bot' : 'player';
    const opp = state[oppKey];
    if (opp.gigs && opp.gigs.length > 0) {
      const [stolen] = opp.gigs.splice(0, 1);
      p.gigs.push(stolen);
      state.actionLog.unshift(`🔥 [Appetite for Destruction] ¡Robo de combate! Roba el Gig ${stolen.die.toUpperCase()}.`);
    }
  }
}

// =========================================================================
// 5. MOTOR DE DERROTA EN COMBATE (ON COMBAT LOSS TRIGGERS)
// =========================================================================

export function executeCombatLossTrigger(state, losingPlayerKey, losingUnit, winningRivalUnit) {
  if (!state) return;
  const p = state[losingPlayerKey];
  const oppKey = losingPlayerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];

  // CP-066: Maelstrom Zealots
  if (losingUnit.id === 'CP-066' && winningRivalUnit) {
    const idx = (opp.field || []).findIndex((u) => u.instanceId === winningRivalUnit.instanceId);
    if (idx !== -1) {
      const [dead] = opp.field.splice(idx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💀 [Maelstrom Zealots] Al ser derrotado, destruye a la unidad rival victoriosa "${dead.name}".`);
    }
  }

  // CP-112: Safety Override
  if (p.safetyOverrideActive && winningRivalUnit) {
    p.safetyOverrideActive = false;
    const idx = (opp.field || []).findIndex((u) => u.instanceId === winningRivalUnit.instanceId);
    if (idx !== -1) {
      const [dead] = opp.field.splice(idx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💥 [Safety Override] ¡Venganza automática! Destruye a "${dead.name}".`);
    }
  }
}

// =========================================================================
// 6. MOTOR DE DERROTA DE UNIDAD (DEFEATED TRIGGERS)
// =========================================================================

export function executeUnitDefeatedTrigger(state, ownerKey, defeatedUnit) {
  if (!state || !defeatedUnit) return;
  const p = state[ownerKey];
  const oppKey = ownerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = defeatedUnit.id || '';

  // CP-015: Caliber
  if (cardId === 'CP-015') {
    discardCards(opp, 1, state, 'Caliber');
  }

  // CP-052: Jackie Welles
  if (cardId === 'CP-052') {
    const oddGigs = (p.gigs || []).filter((g) => (g.value || 0) % 2 !== 0).length;
    if (oddGigs > 0) {
      drawCards(p, oddGigs, state, 'Jackie Welles // Ride or Die Choom');
    }
  }

  // CP-115: Sasha Yakovleva
  if (cardId === 'CP-115') {
    discardCards(opp, 1, state, 'Sasha Yakovleva');
  }

  // CP-118: Screw // Lovelorn Fool
  if (cardId === 'CP-118') {
    const allTrash = p.trash || [];
    const eligibleUnits = allTrash.filter(
      (c) => (c.officialType === 'UNIT' || c.type?.includes('UNIT')) && c.instanceId !== defeatedUnit.instanceId
    );
    if (ownerKey === 'player') {
      state.pendingCardChoice = {
        type: 'CHOOSE_FROM_TRASH',
        sourceZone: 'TRASH',
        sourceCardId: 'CP-118',
        sourceCardName: 'Screw // Lovelorn Fool',
        sourceCardImage: defeatedUnit.image,
        title: '💔 SCREW // HABILIDAD DEFEATED',
        prompt: allTrash.length > 0
          ? 'Screw ha sido derrotado. Selecciona otra Unidad de tu Basura para añadirla a tu mano:'
          : 'Tu Basura está vacía.',
        cards: allTrash,
        eligibleIds: eligibleUnits.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: eligibleUnits.length > 0 ? 1 : 0,
        filterDescription: 'Solo Unidades de tu Basura (distintas de Screw)',
        destination: 'HAND'
      };
    } else {
      if (eligibleUnits.length > 0) {
        const [recovered] = eligibleUnits;
        const idx = p.trash.findIndex((c) => c.instanceId === recovered.instanceId);
        if (idx !== -1) p.trash.splice(idx, 1);
        p.hand.push(recovered);
        state.actionLog.unshift(`💔 [Screw Rival] Recupera a "${recovered.name}" del Trash a la mano.`);
      }
    }
  }

  // CP-124: T-Bug // Amateur Philosopher
  if (cardId === 'CP-124') {
    const faceDownLegend = (p.legends || []).find((l) => !l.isFaceUp);
    if (faceDownLegend) {
      faceDownLegend.isFaceUp = true;
      state.actionLog.unshift(`🐛 [T-Bug] Llama gratis a la Leyenda "${faceDownLegend.name}".`);
    }
  }

  // Gears que estaban equipados a la unidad en el momento de ser derrotada
  const priorGears =
    Array.isArray(defeatedUnit.gear) && defeatedUnit.gear.length > 0
      ? defeatedUnit.gear
      : Array.isArray(defeatedUnit.lastEquippedGear)
      ? defeatedUnit.lastEquippedGear
      : [];

  // CP-128: The Relic // Experimental Biochip (Gear)
  // "DEFEATED Play another Unit with cost 9 or less from your trash for free. Then, bottom-deck this Unit."
  const relicGear = priorGears.find(
    (g) => resolveCardId(g) === 'CP-128' || String(g.slug || '').includes('the-relic')
  );
  if (relicGear) {
    const isLegendOrGoSolo = Boolean(defeatedUnit.hasGoSolo || defeatedUnit.isLegendUnit);
    if (!isLegendOrGoSolo && Array.isArray(p.trash)) {
      const tIdx = p.trash.findIndex((c) => c.instanceId === defeatedUnit.instanceId);
      if (tIdx !== -1) {
        const [moved] = p.trash.splice(tIdx, 1);
        if (!p.deck) p.deck = [];
        p.deck.push(moved);
      }
    }

    const allTrash = p.trash || [];
    const eligibleUnits = allTrash.filter((c) => {
      const isUnit =
        c.officialType === 'UNIT' ||
        String(c.type || c.cardType || '').toUpperCase().includes('UNIT');
      const cost = getNumericCost(c);
      return isUnit && cost <= 9 && c.instanceId !== defeatedUnit.instanceId;
    });

    if (ownerKey === 'player') {
      if (eligibleUnits.length > 0) {
        state.pendingCardChoice = {
          type: 'CHOOSE_FROM_TRASH',
          sourceZone: 'TRASH',
          sourceCardId: 'CP-128',
          sourceCardName: 'The Relic // Experimental Biochip',
          sourceCardImage: relicGear.image || '',
          title: '🧬 THE RELIC // BIOCHIP EXPERIMENTAL (DEFEATED)',
          prompt: `Tu unidad "${defeatedUnit.name}" (equipada con The Relic) ha sido derrotada y enviada al fondo del mazo. Elige otra Unidad de coste 9 o menos de tu Basura para jugarla GRATIS:`,
          cards: allTrash,
          eligibleIds: eligibleUnits.map((c) => c.instanceId),
          maxChoices: 1,
          minChoices: 1,
          filterDescription: 'Solo Unidades en tu Basura con coste ≤ 9 €$',
          destination: 'FIELD',
          triggerPlayEffect: true
        };
      }
      state.actionLog.unshift(
        `🧬 [The Relic // Experimental Biochip] "${defeatedUnit.name}" va al fondo del mazo${
          eligibleUnits.length > 0
            ? ' — elige otra Unidad (coste ≤ 9) de tu Basura para jugarla gratis.'
            : ' (no hay otras Unidades de coste ≤ 9 en tu Basura).'
        }`
      );
    } else if (eligibleUnits.length > 0) {
      const best = [...eligibleUnits].sort(
        (a, b) => (b.parsedPower || 0) - (a.parsedPower || 0)
      )[0];
      const bIdx = p.trash.findIndex((c) => c.instanceId === best.instanceId);
      if (bIdx !== -1) p.trash.splice(bIdx, 1);
      const revived = {
        ...best,
        isSpent: false,
        isLagging: true,
        currentPower: best.parsedPower || best.power || 1,
        gear: []
      };
      if (!p.field) p.field = [];
      p.field.push(revived);
      executeUnitPlayTrigger(state, ownerKey, revived);
      state.actionLog.unshift(
        `🧬 [The Relic Rival] "${defeatedUnit.name}" va al fondo del mazo y despliega gratis a "${revived.name}" desde la Basura.`
      );
    } else {
      state.actionLog.unshift(
        `🧬 [The Relic Rival] "${defeatedUnit.name}" va al fondo del mazo (sin Unidades elegibles en Basura).`
      );
    }
  }

  // CP-104: River Ward // Detective on the Hunt (Habilidad Pasiva)
  // "When a friendly equipped Unit is defeated, search the top 2 cards of your deck and trash 1."
  const hasEquippedGear = priorGears.length > 0;
  if (hasEquippedGear) {
    const riverWard = (p.legends || []).find((l) => l.isFaceUp && (l.id === 'CP-104' || l.slug?.includes('river-ward')));
    if (riverWard) {
      const top2 = (p.deck || []).splice(0, Math.min(2, p.deck?.length || 0));
      if (ownerKey === 'player') {
        state.pendingCardChoice = {
          type: 'SEARCH_AND_CHOOSE',
          sourceZone: 'DECK',
          sourceCardId: 'CP-104',
          sourceCardName: 'River Ward',
          sourceCardImage: riverWard.image || '',
          title: '🔫 RIVER WARD // INVESTIGACIÓN NCPD',
          prompt: top2.length > 0
            ? 'Tu unidad equipada ha sido derrotada. Selecciona 1 de las 2 cartas superiores de tu mazo para añadir a tu mano (la otra irá al Trash):'
            : 'Tu mazo está vacío. No hay cartas que examinar.',
          cards: top2,
          eligibleIds: top2.map((c) => c.instanceId),
          filterDescription: 'Cualquier carta (1 a la mano, 1 al Trash)',
          maxChoices: 1,
          minChoices: top2.length > 0 ? 1 : 0,
          destination: 'HAND',
          remainingDestination: 'TRASH'
        };
      } else {
        const [toHand, toTrash] = top2;
        if (toHand) p.hand.push(toHand);
        if (toTrash) p.trash.push(toTrash);
        state.actionLog.unshift(`🔫 [River Ward Rival] Investiga las 2 primeras cartas: 1 a la mano y 1 al Trash.`);
      }
    }
  }
}

// =========================================================================
// 7. MOTOR DE LLAMADA DE LEYENDAS (CALL TRIGGERS)
// =========================================================================

export function executeCallLegendTrigger(state, playerKey, legendCard) {
  if (!state || !legendCard) return;
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = resolveCardId(legendCard);
  const cardName = legendCard.name || 'Leyenda';

  // CP-026: Dexter DeShawn // Off the Grid
  // "CALL Choose one effect. Give a friendly Unit +2 power this turn. // Draw 1."
  if (cardId === 'CP-026' || legendCard.slug?.includes('dexter-deshawn')) {
    const hasFriendlyUnit = (p.field || []).length > 0;
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-026',
        sourceCardName: 'Dexter DeShawn // Off the Grid',
        sourceCardImage: legendCard.image,
        title: '💼 DEXTER DESHAWN // CALL: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de la habilidad CALL de Dexter DeShawn:',
        options: [
          {
            id: 'DEXTER_BUFF',
            title: 'POTENCIAR UNIDAD (+2 PODER)',
            description: 'Otorga +2 de poder a una unidad amiga este turno.',
            isEligible: hasFriendlyUnit,
            ineligibleReason: 'No controlas ninguna unidad en tu campo de batalla.'
          },
          {
            id: 'DEXTER_DRAW',
            title: 'ROBAR 1 CARTA',
            description: 'Roba 1 carta de tu mazo a tu mano.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          }
        ]
      };
    } else {
      if (hasFriendlyUnit) {
        p.field[0].currentPower = (p.field[0].currentPower || 0) + 2;
        state.actionLog.unshift(`💼 [Dexter DeShawn Rival] Otorga +2 de poder a "${p.field[0].name}".`);
      } else {
        drawCards(p, 1, state, cardName);
      }
    }
  }

  // CP-029: Dum Dum // Maelstrom Triggerman
  // "CALL You may defeat a friendly Gear. If you do, draw 2. Otherwise, draw 1."
  if (cardId === 'CP-029' || legendCard.slug?.includes('dum-dum')) {
    const hasUnitGear = (p.field || []).some((u) => u.gear && u.gear.length > 0);
    const hasLegendGear = (p.legends || []).some((l) => l.isFaceUp && !l.isOnField && !l.isRemovedFromGame && l.gear && l.gear.length > 0);
    const hasGear = hasUnitGear || hasLegendGear;
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-029',
        sourceCardName: 'Dum Dum // Maelstrom Triggerman',
        sourceCardImage: legendCard.image,
        title: '💉 DUM DUM // CALL: ELIGE UN EFECTO',
        prompt: 'Puedes destruir un Gear equipado para robar 2 cartas, o bien robar 1 carta directamente:',
        options: [
          {
            id: 'DUMDUM_SAC_GEAR',
            title: 'DESTRUIR UN GEAR AMIGO Y ROBAR 2 CARTAS',
            description: 'Envía 1 Gear equipado a una unidad amiga a la Basura y roba 2 cartas.',
            isEligible: hasGear,
            ineligibleReason: 'No tienes ninguna unidad con un Gear equipado.'
          },
          {
            id: 'DUMDUM_DRAW',
            title: 'ROBAR 1 CARTA',
            description: 'Roba 1 carta de tu mazo directamente.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          }
        ]
      };
    } else {
      if (hasGear) {
        for (const u of p.field || []) {
          if (u.gear && u.gear.length > 0) {
            const [g] = u.gear.splice(0, 1);
            if (!p.trash) p.trash = [];
            p.trash.push(g);
            break;
          }
        }
        drawCards(p, 2, state, cardName);
      } else {
        drawCards(p, 1, state, cardName);
      }
    }
  }

  // CP-082: Muamar Reyes // El Capitán
  // "CALL Choose one effect. A friendly Unit can't be defeated in a fight this turn. // Draw 1."
  if (cardId === 'CP-082' || legendCard.slug?.includes('muamar-reyes')) {
    const hasFriendlyUnit = (p.field || []).length > 0;
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-082',
        sourceCardName: 'Muamar Reyes // El Capitán',
        sourceCardImage: legendCard.image,
        title: '🚗 MUAMAR REYES // CALL: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de la habilidad CALL de El Capitán:',
        options: [
          {
            id: 'MUAMAR_PROTECT',
            title: 'INMUNIDAD EN COMBATE',
            description: 'Una unidad amiga no puede ser derrotada en un combate este turno.',
            isEligible: hasFriendlyUnit,
            ineligibleReason: 'No controlas ninguna unidad en tu campo de batalla.'
          },
          {
            id: 'MUAMAR_DRAW',
            title: 'ROBAR 1 CARTA',
            description: 'Roba 1 carta de tu mazo a la mano.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          }
        ]
      };
    } else {
      if (hasFriendlyUnit) {
        p.field[0].cannotBeDefeatedThisTurn = true;
        state.actionLog.unshift(`🚗 [Muamar Reyes Rival] Inmuniza a "${p.field[0].name}" en combate este turno.`);
      } else {
        drawCards(p, 1, state, cardName);
      }
    }
  }

  // CP-091: Padre // Man of the Cross
  // "CALL Choose one effect. Spend a rival Unit. // Draw 1."
  if (cardId === 'CP-091' || legendCard.slug?.includes('padre')) {
    const hasRivalUnits = (opp.field || []).length > 0;
    const hasReadyRival = (opp.field || []).some((u) => !u.isSpent);
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-091',
        sourceCardName: 'Padre // Man of the Cross',
        sourceCardImage: legendCard.image,
        title: '✝️ PADRE // CALL: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de la habilidad CALL del Padre:',
        options: [
          {
            id: 'PADRE_SPEND_RIVAL',
            title: 'GIRAR UNIDAD RIVAL (SPEND)',
            description: 'Gira (Spend) una unidad del rival para agotarla.',
            isEligible: hasReadyRival,
            ineligibleReason: hasRivalUnits ? 'Todas las unidades rivales ya están giradas.' : 'El rival no tiene unidades en campo.'
          },
          {
            id: 'PADRE_DRAW',
            title: 'ROBAR 1 CARTA',
            description: 'Roba 1 carta de tu mazo a la mano.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          }
        ]
      };
    } else {
      const readyRival = (opp.field || []).find((u) => !u.isSpent);
      if (readyRival) {
        readyRival.isSpent = true;
        state.actionLog.unshift(`✝️ [Padre Rival] Gira (Spend) a tu unidad "${readyRival.name}".`);
      } else {
        drawCards(p, 1, state, cardName);
      }
    }
  }

  // CP-137: V // Streetkid
  if (cardId === 'CP-137' || legendCard.slug?.includes('streetkid')) {
    trashFromDeck(p, 3, state, cardName);
    const allTrash = p.trash || [];
    const eligibleProgs = allTrash.filter((c) => c.officialType === 'PROGRAM' || c.type?.includes('PROGRAM'));
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'CHOOSE_FROM_TRASH',
        sourceZone: 'TRASH',
        sourceCardId: 'CP-137',
        sourceCardName: 'V // Streetkid',
        sourceCardImage: legendCard.image,
        title: '🌆 V // STREETKID // HABILIDAD CALL',
        prompt: allTrash.length > 0
          ? 'Has enviado 3 cartas al Trash. Selecciona 1 Programa de tu Basura para añadirlo a tu mano:'
          : 'Tu Basura está vacía.',
        cards: allTrash,
        eligibleIds: eligibleProgs.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: eligibleProgs.length > 0 ? 1 : 0,
        filterDescription: 'Solo Programas de tu Basura',
        destination: 'HAND'
      };
    } else {
      if (eligibleProgs.length > 0) {
        const [prog] = eligibleProgs;
        const idx = p.trash.findIndex((c) => c.instanceId === prog.instanceId);
        if (idx !== -1) p.trash.splice(idx, 1);
        p.hand.push(prog);
        state.actionLog.unshift(`🌆 [V // Streetkid Rival] Recupera el Programa "${prog.name}" a la mano.`);
      }
    }
  }

  // CP-141: Viktor Vektor // Sit Down and Relax
  if (cardId === 'CP-141' || legendCard.slug?.includes('sit-down')) {
    const top5 = (p.deck || []).splice(0, Math.min(5, p.deck?.length || 0));
    const eligibleGears = top5.filter(
      (c) => (c.officialType === 'GEAR' || c.type?.includes('GEAR')) && (c.costNum || 0) <= 2
    );
    if (playerKey === 'player') {
      state.pendingCardChoice = {
        type: 'SEARCH_AND_CHOOSE',
        sourceZone: 'DECK',
        sourceCardId: 'CP-141',
        sourceCardName: 'Viktor Vektor',
        sourceCardImage: legendCard?.image || '',
        title: '👓 VIKTOR VEKTOR // HABILIDAD CALL',
        prompt: top5.length > 0
          ? 'Se han examinado las cartas superiores de tu mazo. Selecciona hasta 2 Gears con coste ≤ 2 €$ para añadir a tu mano (el resto irá al fondo del mazo):'
          : 'Tu mazo está vacío. No hay cartas que examinar.',
        cards: top5,
        eligibleIds: eligibleGears.map((g) => g.instanceId),
        maxChoices: 2,
        minChoices: 0,
        filterDescription: 'Gears con coste ≤ 2 €$',
        remainingDestination: 'BOTTOM_DECK',
        destination: 'HAND'
      };
    } else {
      const chosen = eligibleGears.slice(0, 2);
      const remaining = top5.filter((c) => !chosen.some((g) => g.instanceId === c.instanceId));
      p.hand.push(...chosen);
      p.deck.push(...remaining);
      if (chosen.length > 0) {
        state.actionLog.unshift(`👓 [Viktor Vektor] El rival añadió ${chosen.length} Gear(s) a su mano.`);
      }
    }
  }

  // CP-143: Wakako Okada // Peace and Harmony
  if (cardId === 'CP-143' || legendCard.slug?.includes('wakako-okada')) {
    const hasRivalUnits = (opp.field || []).length > 0;
    if (playerKey === 'player') {
      state.pendingModalChoice = {
        sourceCardId: 'CP-143',
        sourceCardName: 'Wakako Okada // Peace and Harmony',
        sourceCardImage: legendCard.image,
        title: '🌸 WAKAKO OKADA // CALL: ELIGE UN EFECTO',
        prompt: 'Elige uno de los dos efectos oficiales de la habilidad CALL de Wakako Okada:',
        options: [
          {
            id: 'WAKAKO_DEBUFF_RIVAL',
            title: 'DEBILITAR UNIDAD RIVAL (-2 PODER)',
            description: 'Reduce el poder de una unidad rival en 2 este turno.',
            isEligible: hasRivalUnits,
            ineligibleReason: 'El rival no tiene unidades en su campo de batalla.'
          },
          {
            id: 'WAKAKO_DRAW',
            title: 'ROBAR 1 CARTA',
            description: 'Roba 1 carta de tu mazo a la mano.',
            isEligible: (p.deck || []).length > 0,
            ineligibleReason: 'Tu mazo está vacío.'
          }
        ]
      };
    } else {
      if (hasRivalUnits) {
        opp.field[0].currentPower = Math.max(0, (opp.field[0].currentPower || 0) - 2);
        state.actionLog.unshift(`🌸 [Wakako Okada Rival] Reduce el poder de "${opp.field[0].name}" en 2.`);
      } else {
        drawCards(p, 1, state, cardName);
      }
    }
  }
}

// =========================================================================
// 8. MOTOR DE INICIO Y FIN DE TURNO (START & END OF TURN TRIGGERS)
// =========================================================================

export function executeStartOfTurnTriggers(state, playerKey) {
  if (!state) return;
  const p = state[playerKey];

  // CP-045: Hanako Arasaka // Daughter of the Emperor
  // "At the start of your turn, draw 1 for each friendly value-pair of Gigs."
  const hanakos = (p.legends || []).filter(
    (l) => l.isFaceUp && !l.isRemovedFromGame && resolveCardId(l) === 'CP-045'
  );
  if (hanakos.length > 0) {
    const pairCount = countGigValuePairs(p.gigs || []);
    if (pairCount > 0) {
      drawCards(p, pairCount * hanakos.length, state, 'Hanako Arasaka // Daughter of the Emperor');
    }
  }
}

export function executeEndOfTurnTriggers(state, playerKey) {
  if (!state) return;
  const p = state[playerKey];

  // CP-078: Modded Kusanagi (devuelve a la mano al final del turno)
  const kusanagiIdx = (p.field || []).findIndex((u) => u.id === 'CP-078');
  if (kusanagiIdx !== -1) {
    const [kusanagi] = p.field.splice(kusanagiIdx, 1);
    p.hand.push(kusanagi);
    state.actionLog.unshift(`🏍️ [Modded Kusanagi] Vuelve a la mano de ${p.name} al final del turno.`);
  }

  // CP-114: Sandevistan (endereza al portador) y CP-030: Dying Night (si el portador se llama "V", endereza 2 Eddies)
  for (const unit of p.field || []) {
    if ((unit.gear || []).some((g) => resolveCardId(g) === 'CP-114')) {
      unit.isSpent = false;
      state.actionLog.unshift(`⚡ [Sandevistan] Endereza a "${unit.name}" al final del turno.`);
    }
    const dyingNights = (unit.gear || []).filter((g) => resolveCardId(g) === 'CP-030');
    const isNamedV = /^V(\s|$|\/\/)/i.test(String(unit.name || '').trim());
    if (dyingNights.length > 0 && isNamedV) {
      let readied = 0;
      const toReady = 2 * dyingNights.length;
      for (const ed of p.eddies || []) {
        if (ed.isSpent && readied < toReady) {
          ed.isSpent = false;
          readied++;
        }
      }
      if (readied > 0) {
        state.actionLog.unshift(
          `🔫 [Dying Night] Fin de turno: "${unit.name}" es V, se enderezan ${readied} Eddie(s).`
        );
      }
    }
  }

  // CP-136: V // Roamer of the Badlands (si 2+ Gigs con 8+ valor, roba 1)
  const hasBadlandsV = (p.field || []).some((u) => resolveCardId(u) === 'CP-136');
  if (hasBadlandsV) {
    const highGigs = (p.gigs || []).filter((g) => (g.value || 0) >= 8).length;
    if (highGigs >= 2) {
      drawCards(p, 1, state, 'V // Roamer of the Badlands');
    }
  }
}

// =========================================================================
// 9. MOTOR DE ACTIVACIÓN DE LEYENDAS (ACTIVATED ABILITIES: ↷ / QUICK)
// =========================================================================

/**
 * Dispara habilidades pasivas cuando una unidad aliada usa BLOCKER para interceptar un ataque:
 * - CP-042 Goro Takemura // Vengeful Bodyguard: "When a friendly Unit uses BLOCKER, you may discard 1. If you do, draw 1."
 * - CP-012 Augmented Negotiators: "When this Unit uses BLOCKER, a Rival discards 1."
 */
export function executeBlockerUsedTrigger(state, defenderKey, blockerUnit) {
  if (!state || !blockerUnit) return;
  const def = state[defenderKey];
  const oppKey = defenderKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const blockerId = resolveCardId(blockerUnit);

  // CP-012 Augmented Negotiators: "When this Unit uses BLOCKER, a Rival discards 1."
  if (blockerId === 'CP-012') {
    if (opp.hand && opp.hand.length > 0) {
      if (oppKey === 'player') {
        state.pendingCardChoice = {
          type: 'FORCED_DISCARD_HAND',
          playerKey: 'player',
          sourceCardId: 'CP-012',
          sourceCardName: 'Augmented Negotiators',
          sourceCardImage: blockerUnit.image,
          title: '🛡️ AUGMENTED NEGOTIATORS // DESCARTE OBLIGATORIO',
          prompt: '¡El rival ha bloqueado con Augmented Negotiators! Debes elegir 1 carta de tu mano para descartarla a tu Basura (Trash):',
          cards: [...opp.hand],
          eligibleIds: opp.hand.map((c) => c.instanceId),
          maxChoices: 1,
          minChoices: 1,
          selectedIds: [],
          filterDescription: 'Elige 1 carta de tu mano para descartar'
        };
        state.actionLog.unshift(
          `🛡️ [Augmented Negotiators Rival] ¡Al bloquear! Debes elegir 1 carta de tu mano para descartar.`
        );
      } else {
        const [disc] = opp.hand.splice(0, 1);
        if (!opp.trash) opp.trash = [];
        opp.trash.push(disc);
        state.actionLog.unshift(
          `🛡️ [Augmented Negotiators] ¡Al bloquear! El rival descarta "${disc.name}".`
        );
      }
    } else {
      state.actionLog.unshift(
        `🛡️ [Augmented Negotiators] ¡Al bloquear! ${opp.name} no tiene cartas en mano para descartar.`
      );
    }
  }

  // CP-061 La Llorona // Ghost of the Past: "When this Unit uses BLOCKER, increase a Gig by up to 3."
  if (blockerId === 'CP-061') {
    const totalGigs = (def.gigs || []).length + (opp.gigs || []).length;
    if (totalGigs > 0) {
      if (defenderKey === 'player') {
        queueTargetSelection(state, {
          actionType: 'ADJUST_GIG',
          sourceCardId: 'CP-061',
          sourceCardName: 'La Llorona // Ghost of the Past',
          sourceCardImage: blockerUnit.image,
          title: '👻 LA LLORONA // BLOCKER (+HASTA 3 A UN GIG)',
          prompt: '¡La Llorona usó BLOCKER! Elige cualquier Gig en juego (tuyo o del rival) para aumentar su valor en hasta +3 (o déjalo igual):',
          canIncrease: true,
          canDecrease: false,
          maxDelta: 3,
          allowZero: true
        });
      } else {
        const bestGig = [...(def.gigs || [])].sort((a, b) => (getGigMaxFace(b) - b.value) - (getGigMaxFace(a) - a.value))[0];
        if (bestGig) {
          const oldVal = bestGig.value;
          bestGig.value = Math.min(getGigMaxFace(bestGig), (bestGig.value || 1) + 3);
          state.actionLog.unshift(
            `👻 [La Llorona Rival] ¡Al bloquear! Aumenta su Gig ${String(bestGig.die).toUpperCase()} de ${oldVal} a ${bestGig.value}.`
          );
        }
      }
    }
  }

  // CP-042 Goro Takemura // Vengeful Bodyguard (Leyenda boca arriba):
  // "When a friendly Unit uses BLOCKER, you may discard 1. If you do, draw 1."
  const takemura = (def.legends || []).find(
    (l) => l.isFaceUp && !l.isRemovedFromGame && resolveCardId(l) === 'CP-042'
  );
  if (takemura && (def.hand || []).length > 0 && (def.deck || []).length > 0) {
    if (defenderKey === 'player') {
      state.pendingCardChoice = {
        type: 'TAKEMURA_BLOCKER_LOOT',
        playerKey: 'player',
        sourceCardId: 'CP-042',
        sourceCardName: 'Goro Takemura // Vengeful Bodyguard',
        sourceCardImage: takemura.image,
        title: '🛡️ GORO TAKEMURA // TRIGGER AL BLOQUEAR',
        prompt: `Tu unidad "${blockerUnit.name}" ha usado BLOCKER. Puedes descartar 1 carta de tu mano para robar 1 carta (o omitir):`,
        cards: [...def.hand],
        eligibleIds: def.hand.map((c) => c.instanceId),
        maxChoices: 1,
        minChoices: 0,
        selectedIds: [],
        filterDescription: 'Elige 1 carta de tu mano para descartar y robar 1 (opcional)'
      };
    } else {
      // Bot AI: descarta 1 carta de mano y roba 1
      const [disc] = def.hand.splice(0, 1);
      if (!def.trash) def.trash = [];
      def.trash.push(disc);
      drawCards(def, 1, state, 'Goro Takemura Rival');
    }
  }
}

export function executeLegendAbility(state, playerKey, legendCard, abilityId = null) {
  if (!state || !legendCard) return { success: false, reason: 'Leyenda no válida' };
  return executeCardActivatedAbility(state, playerKey, legendCard.instanceId, abilityId);
}
