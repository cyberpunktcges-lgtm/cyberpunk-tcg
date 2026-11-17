/**
 * MOTOR DE EFECTOS Y REGLAS DE CARTAS DE CYBERPUNK TCG (SET 01: WELCOME TO NIGHT CITY)
 * Contiene el catálogo oficial completo de las 151 cartas y los manejadores
 * de lógica para Programas, Unidades (On-Play, On-Attack, Combate, Derrota),
 * Leyendas (Call, ↷ Spend) y Gears.
 */

import allCardRules from '../data/allCardRules.json' with { type: 'json' };

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
 * Helper para descartar N cartas de la mano
 */
function discardCards(player, count, state, sourceName) {
  if (!player.hand || player.hand.length === 0) return [];
  const discarded = player.hand.splice(0, Math.min(count, player.hand.length));
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
    if (p.gigs && p.gigs.length > 0) {
      p.gigs[0].value = (p.gigs[0].value || 1) + 1;
      state.actionLog.unshift(`🎉 [Afterparty at Lizzie's] Ajusta el Gig ${p.gigs[0].die.toUpperCase()} a ${p.gigs[0].value}.`);
    }
    const values = (p.gigs || []).map((g) => g.value);
    const uniqueValues = new Set(values);
    if (uniqueValues.size >= 2) {
      drawCards(p, 1, state, cardName);
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
    const rivalMoreGigs = (opp.gigs?.length || 0) >= (p.gigs?.length || 0) + 2;
    const maxToDefeat = rivalMoreGigs ? 2 : 1;
    let defeatedCount = 0;
    for (let i = (opp.field?.length || 0) - 1; i >= 0 && defeatedCount < maxToDefeat; i--) {
      if ((opp.field[i].currentPower || opp.field[i].power || 0) <= 4) {
        const [dead] = opp.field.splice(i, 1);
        if (!opp.trash) opp.trash = [];
        opp.trash.push(dead);
        defeatedCount++;
        state.actionLog.unshift(`💥 [Bonnie and Clyde] Destruye a la unidad rival "${dead.name}" (Poder <= 4).`);
      }
    }
    if (defeatedCount === 0) {
      state.actionLog.unshift(`ℹ️ [Bonnie and Clyde] El rival no tenía unidades con poder 4 o menos.`);
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
    if (opp.field && opp.field.length > 0) {
      opp.field[0].cannotAttackUntilNextTurn = true;
      state.actionLog.unshift(`🛑 [Chrome Reverie] "${opp.field[0].name}" no puede atacar hasta tu próximo turno.`);
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
    if (p.gigs && p.gigs.length > 0) {
      p.gigs[0].value = (p.gigs[0].value || 1) + 4;
      state.actionLog.unshift(`🏭 [Industrial Assembly] Aumenta el Gig ${p.gigs[0].die.toUpperCase()} en +4 (Nuevo valor: ${p.gigs[0].value}).`);
    }
    if ((p.gigs || []).some((g) => g.value >= 8)) {
      drawCards(p, 1, state, cardName);
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
    const target = (opp.field || []).find((u) => !u.isSpent) || opp.field?.[0];
    if (target) {
      target.isSpent = true;
      target.cannotReadyUntilNextTurn = true;
      state.actionLog.unshift(`🧠 [Memory Relapse] Gira a "${target.name}" y no podrá enderezarse hasta tu próximo turno.`);
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
    const targetIdx = (opp.field || []).findIndex((u) => (u.currentPower || 0) <= maxVal);
    if (targetIdx !== -1) {
      const [dead] = opp.field.splice(targetIdx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`💥 [Over the Edge] Destruye a "${dead.name}" (Poder <= ${maxVal} del Gig).`);
    } else {
      state.actionLog.unshift(`ℹ️ [Over the Edge] No hay unidades rivales con poder <= ${maxVal}.`);
    }
    return { executed: true };
  }

  // CP-094: Peace Offering
  // "Set a Gig's value to the value of another Gig. Then, if you control a value-pair, draw 1."
  if (cardId === 'CP-094') {
    if (p.gigs && p.gigs.length >= 2) {
      p.gigs[1].value = p.gigs[0].value;
      state.actionLog.unshift(`🕊️ [Peace Offering] Iguala el Gig ${p.gigs[1].die.toUpperCase()} al valor de ${p.gigs[0].die.toUpperCase()} (${p.gigs[0].value}).`);
      drawCards(p, 1, state, cardName);
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
    if (p.gigs && p.gigs.length > 0) {
      p.gigs[0].value = Math.max(1, (p.gigs[0].value || 1) - 3);
      state.actionLog.unshift(`🗡️ [Trust No One] Reduce el Gig ${p.gigs[0].die.toUpperCase()} a ${p.gigs[0].value}.`);
    }
    if ((p.gigs || []).some((g) => g.value === 1)) {
      drawCards(p, 1, state, cardName);
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

export function executeUnitPlayTrigger(state, playerKey, unitInstance) {
  if (!state || !unitInstance) return;
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = unitInstance.id || '';
  const cardName = unitInstance.name || 'Unidad';

  // CP-003: Adam Smasher // Metal Over Meat
  // "PLAY Defeat all other Units."
  if (cardId === 'CP-003') {
    const allOthersFriendly = (p.field || []).filter((u) => u.instanceId !== unitInstance.instanceId);
    p.field = [unitInstance];
    if (!p.trash) p.trash = [];
    p.trash.push(...allOthersFriendly);

    const allRival = opp.field || [];
    opp.field = [];
    if (!opp.trash) opp.trash = [];
    opp.trash.push(...allRival);

    state.actionLog.unshift(
      `💥 [Adam Smasher // Metal Over Meat] ¡"METAL OVER MEAT"! Destruye a TODAS las demás unidades en el campo de batalla.`
    );
  }

  // CP-015: Caliber // Totentanz's Top Dog
  // "PLAY Defeat a rival Unit with cost 2 or less."
  if (cardId === 'CP-015') {
    const targetIdx = (opp.field || []).findIndex((u) => (u.costNum || u.cost || 0) <= 2);
    if (targetIdx !== -1) {
      const [dead] = opp.field.splice(targetIdx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`🐕 [Caliber] Destruye a la unidad rival "${dead.name}" (Coste <= 2).`);
    }
  }

  // CP-024: Delamain // Rideshare AI
  // "PLAY Draw 2."
  if (cardId === 'CP-024') {
    drawCards(p, 2, state, cardName);
  }

  // CP-027: Dexter DeShawn // One Last Chance
  // "PLAY ATTACK Adjust a Gig by up to 1."
  if (cardId === 'CP-027') {
    if (p.gigs && p.gigs.length > 0) {
      p.gigs[0].value = (p.gigs[0].value || 1) + 1;
      state.actionLog.unshift(`🎲 [Dexter DeShawn] Ajusta el Gig ${p.gigs[0].die.toUpperCase()} a ${p.gigs[0].value}.`);
    }
  }

  // CP-035: Field Operator
  // "PLAY If your Street Cred is an even number, draw 1."
  if (cardId === 'CP-035') {
    const cred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    if (cred % 2 === 0) {
      drawCards(p, 1, state, cardName);
    }
  }

  // CP-044: Hacked Corpo
  // "PLAY Trash 3. Add a Program from among them to your hand."
  if (cardId === 'CP-044') {
    const trashed = trashFromDeck(p, 3, state, cardName);
    const eligibleProgs = trashed.filter((c) => c.officialType === 'PROGRAM' || c.type?.includes('PROGRAM'));
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
    } else {
      if (eligibleProgs.length > 0) {
        const [prog] = eligibleProgs;
        const tIdx = p.trash.lastIndexOf(prog);
        if (tIdx !== -1) p.trash.splice(tIdx, 1);
        p.hand.push(prog);
        state.actionLog.unshift(`💻 [Hacked Corpo Rival] Añade el Programa "${prog.name}" a su mano.`);
      }
    }
  }

  // CP-053: Japantown Jonin
  // "PLAY Give a friendly Unit +2 power this turn."
  if (cardId === 'CP-053') {
    unitInstance.currentPower = (unitInstance.currentPower || 0) + 2;
    state.actionLog.unshift(`🥷 [Japantown Jonin] Se otorga a sí mismo +2 de poder este turno.`);
  }

  // CP-070: MaxTac AV
  // "PLAY You may swap a friendly Gig with a rival Gig."
  if (cardId === 'CP-070') {
    if (p.gigs?.length > 0 && opp.gigs?.length > 0) {
      const pGig = p.gigs.shift();
      const oppGig = opp.gigs.shift();
      p.gigs.push(oppGig);
      opp.gigs.push(pGig);
      state.actionLog.unshift(`🚁 [MaxTac AV] Intercambia el Gig ${pGig.die.toUpperCase()} por el Gig rival ${oppGig.die.toUpperCase()}.`);
    }
  }

  // CP-076: Minotaur
  // "PLAY If you have more Street Cred than a Rival, defeat a rival Unit with power 5 or less."
  if (cardId === 'CP-076') {
    const myCred = (p.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    const oppCred = (opp.gigs || []).reduce((s, g) => s + (g.value || 0), 0);
    if (myCred > oppCred) {
      const targetIdx = (opp.field || []).findIndex((u) => (u.currentPower || 0) <= 5);
      if (targetIdx !== -1) {
        const [dead] = opp.field.splice(targetIdx, 1);
        if (!opp.trash) opp.trash = [];
        opp.trash.push(dead);
        state.actionLog.unshift(`🤖 [Minotaur] Destruye a la unidad rival "${dead.name}" (Poder <= 5).`);
      }
    }
  }

  // CP-087: Off-Duty Malfini
  // "PLAY Spend this Unit and a rival Unit."
  if (cardId === 'CP-087') {
    unitInstance.isSpent = true;
    if (opp.field && opp.field.length > 0) {
      opp.field[0].isSpent = true;
      state.actionLog.unshift(`🦅 [Off-Duty Malfini] Se gira a sí mismo y gira a la unidad rival "${opp.field[0].name}".`);
    }
  }

  // CP-108: Royce // Don't Call Me Simon
  // "PLAY Defeat a rival Unit with power 2 or less."
  if (cardId === 'CP-108') {
    const targetIdx = (opp.field || []).findIndex((u) => (u.currentPower || 0) <= 2);
    if (targetIdx !== -1) {
      const [dead] = opp.field.splice(targetIdx, 1);
      if (!opp.trash) opp.trash = [];
      opp.trash.push(dead);
      state.actionLog.unshift(`🦾 [Royce] Destruye a la unidad rival "${dead.name}" (Poder <= 2).`);
    }
  }

  // CP-133: Tyger's Whisper
  // "PLAY You may Call a Legend for free."
  if (cardId === 'CP-133') {
    const faceDownLegend = (p.legends || []).find((l) => !l.isFaceUp);
    if (faceDownLegend) {
      faceDownLegend.isFaceUp = true;
      state.actionLog.unshift(`🐯 [Tyger's Whisper] Llama gratis a la Leyenda "${faceDownLegend.name}" boca arriba.`);
    }
  }

  // CP-139: Valentino Street Racer
  // "PLAY Give another friendly Unit with cost 5 or less ADRENALINE this turn."
  if (cardId === 'CP-139') {
    const otherUnit = (p.field || []).find(
      (u) => u.instanceId !== unitInstance.instanceId && (u.costNum || u.cost || 0) <= 5
    );
    if (otherUnit) {
      otherUnit.isLagging = false;
      otherUnit.hasAdrenaline = true;
      state.actionLog.unshift(`⚡ [Valentino Street Racer] Otorga ADRENALINE a "${otherUnit.name}" (puede atacar ya).`);
    }
  }

  // CP-142: Viktor Vektor // You Might Feel a Little Pinch
  // "PLAY Play a CYBERWARE Gear with cost 2 or less from your trash for free."
  if (cardId === 'CP-142') {
    const gearIdx = (p.trash || []).findIndex(
      (c) => (c.officialType === 'GEAR' || c.type?.includes('GEAR')) && (c.costNum || c.cost || 0) <= 2
    );
    if (gearIdx !== -1) {
      const [gear] = p.trash.splice(gearIdx, 1);
      unitInstance.gear = unitInstance.gear || [];
      unitInstance.gear.push(gear);
      const bonus = gear.powerBonus || gear.parsedPower || 1;
      unitInstance.currentPower = (unitInstance.currentPower || 0) + bonus;
      state.actionLog.unshift(`💉 [Viktor Vektor] Equipa gratis desde la Basura el Gear "${gear.name}" (+${bonus} poder).`);
    }
  }
}

// =========================================================================
// 3. MOTOR DE DISPARADORES DE ATAQUE (ON-ATTACK TRIGGERS)
// =========================================================================

export function executeUnitAttackTrigger(state, playerKey, attackerUnit) {
  if (!state || !attackerUnit) return;
  const p = state[playerKey];
  const cardId = attackerUnit.id || '';
  const cardName = attackerUnit.name || 'Unidad';

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

  // CP-104: River Ward // Detective on the Hunt (Habilidad Pasiva)
  // "When a friendly equipped Unit is defeated, search the top 2 cards of your deck and trash 1."
  const hasEquippedGear = defeatedUnit.gear && defeatedUnit.gear.length > 0;
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
  const cardId = legendCard.id || '';
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
    const hasGear = (p.field || []).some((u) => u.gear && u.gear.length > 0);
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
  const hasHanako = (p.legends || []).some((l) => l.isFaceUp && l.id === 'CP-045');
  if (hasHanako) {
    const values = (p.gigs || []).map((g) => g.value);
    const hasPair = values.some((val, idx) => values.indexOf(val) !== idx);
    if (hasPair) {
      drawCards(p, 1, state, 'Hanako Arasaka');
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

  // CP-114: Sandevistan (endereza al portador)
  for (const unit of p.field || []) {
    if ((unit.gear || []).some((g) => g.id === 'CP-114')) {
      unit.isSpent = false;
      state.actionLog.unshift(`⚡ [Sandevistan] Endereza a "${unit.name}" al final del turno.`);
    }
  }

  // CP-136: V // Roamer of the Badlands (si 2+ Gigs con 8+ valor, roba 1)
  const hasBadlandsV = (p.field || []).some((u) => u.id === 'CP-136');
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

export function executeLegendAbility(state, playerKey, legendCard) {
  if (!state || !legendCard) return { success: false, reason: 'Leyenda no válida' };
  const p = state[playerKey];
  const cardId = legendCard.id || '';

  // CP-104: River Ward // Detective on the Hunt
  // "QUICK ↷ Play a Gear with cost 2 or less from your hand for free."
  if (cardId === 'CP-104' || legendCard.slug?.includes('river-ward')) {
    if (!legendCard.isFaceUp) {
      return { success: false, reason: 'River Ward debe estar boca arriba para activar su habilidad.' };
    }
    if (legendCard.isSpent) {
      return { success: false, reason: 'River Ward ya está girada en este turno.' };
    }
    const eligibleGears = (p.hand || []).filter(
      (c) => (c.officialType === 'GEAR' || c.type?.includes('GEAR')) && (c.costNum || c.parsedCost || 0) <= 2
    );
    if (eligibleGears.length === 0) {
      return { success: false, reason: 'No tienes ningún Gear con coste ≤ 2 €$ en tu mano.' };
    }
    if ((p.field || []).length === 0) {
      return { success: false, reason: 'No tienes unidades en juego para equiparles el Gear.' };
    }
    return { success: true, type: 'RIVER_WARD_EQUIP', eligibleGears };
  }

  // CP-057: Judy Álvarez // Braindance Maestro
  // "↷ Trash the top card of your deck. If it's a Program, you may add it to your hand."
  if (cardId === 'CP-057' || legendCard.slug?.includes('judy-alvarez')) {
    if (!legendCard.isFaceUp || legendCard.isSpent) {
      return { success: false, reason: 'Judy Álvarez ya está girada o boca abajo.' };
    }
    legendCard.isSpent = true;
    if (p.deck && p.deck.length > 0) {
      const [trashed] = p.deck.splice(0, 1);
      const isProg = trashed.officialType === 'PROGRAM' || trashed.type?.includes('PROGRAM');
      if (isProg) {
        trashed.isJustDrawn = true;
        p.hand.push(trashed);
        state.actionLog.unshift(`🧠 [Judy Álvarez] Descarta "${trashed.name}" del mazo: ¡Es un PROGRAMA y se añade a tu mano!`);
      } else {
        p.trash.push(trashed);
        state.actionLog.unshift(`🧠 [Judy Álvarez] Descarta "${trashed.name}" del mazo al Trash (no es Programa).`);
      }
      return { success: true, message: `Habilidad ejecutada con "${trashed.name}".` };
    }
    return { success: false, reason: 'El mazo está vacío.' };
  }

  // CP-026: Dexter DeShawn // Off the Grid ("↷: Increase a Gig by up to 2")
  if (cardId === 'CP-026' || legendCard.slug?.includes('dexter-deshawn')) {
    if (!legendCard.isFaceUp || legendCard.isSpent) return { success: false, reason: 'Dexter ya está girado o boca abajo.' };
    if ((p.gigs || []).length === 0) return { success: false, reason: 'No controlas ningún Gig para aumentar.' };
    legendCard.isSpent = true;
    const gig = p.gigs[0];
    gig.value = Math.min(20, (gig.value || 0) + 2);
    state.actionLog.unshift(`💼 [Dexter DeShawn] Aumenta el valor de tu Gig ${gig.dieType.toUpperCase()} en +2 (Nuevo valor: ${gig.value}).`);
    return { success: true, message: `Gig ${gig.dieType.toUpperCase()} aumentado en +2.` };
  }

  // CP-143: Wakako Okada // Peace and Harmony ("↷: Decrease a Gig by up to 2")
  if (cardId === 'CP-143' || legendCard.slug?.includes('wakako-okada')) {
    if (!legendCard.isFaceUp || legendCard.isSpent) return { success: false, reason: 'Wakako ya está girada o boca abajo.' };
    if ((p.gigs || []).length === 0) return { success: false, reason: 'No controlas ningún Gig para reducir.' };
    legendCard.isSpent = true;
    const gig = p.gigs[0];
    gig.value = Math.max(1, (gig.value || 0) - 2);
    state.actionLog.unshift(`🌸 [Wakako Okada] Reduce el valor de tu Gig ${gig.dieType.toUpperCase()} en -2 (Nuevo valor: ${gig.value}).`);
    return { success: true, message: `Gig ${gig.dieType.toUpperCase()} reducido en -2.` };
  }

  return { success: false, reason: 'Esta leyenda no tiene habilidad activada disponible.' };
}
