/**
 * activatedAbilities.js
 * Motor universal de habilidades activadas con giro (↷) para Cyberpunk TCG.
 * Set 01 - Welcome to Night City (17 cartas con símbolo ↷).
 */

import {
  getAvailableEddies,
  getTotalAvailableEddies,
  spendEddies,
  hasKeyword
} from './cyberpunkEngine.js';

import {
  executeProgramEffect,
  sendDefeatedUnitToGraveyardOrExile
} from './cardEffects.js';

/**
 * Diccionario de configuración de todas las habilidades activadas oficiales (↷)
 */
export const ACTIVATED_ABILITIES_CONFIG = {
  // CP-008: Alt Cunningham // Soulkiller Architect (LEGEND) - 2 HABILIDADES
  'CP-008': [
    {
      id: 'CP-008-DISCOUNT',
      abilityIndex: 0,
      title: '↷ Descuento en Programa (-1 €$ por min Gig)',
      shortTitle: '↷ Descuento Prog.',
      badgeText: '↷ PROG -1€$',
      description: 'Gira a Alt: Tu próximo Programa este turno cuesta -1 €$ por cada Gig mínimo (valor 1) que controles (mínimo 1 €$).',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Alt Cunningham debe estar boca arriba para activar su habilidad.' };
        if (card.isSpent) return { can: false, reason: 'Alt Cunningham ya está girada en este turno.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;
        const minGigs = (p.gigs || []).filter((g) => g.value === 1).length;
        p.altCunninghamProgramDiscount = minGigs;
        state.actionLog.unshift(
          `🌐 [Alt Cunningham] Activa (↷): Tu próximo Programa este turno cuesta -${minGigs} €$ (por ${minGigs} Gig(s) mínimo(s) de valor 1, coste mínimo final 1 €$).`
        );
        return {
          success: true,
          message: `Descuento activado: Tu próximo Programa este turno costará -${minGigs} €$ (mínimo 1 €$).`
        };
      }
    },
    {
      id: 'CP-008-RECURSION',
      abilityIndex: 1,
      title: '1 €$, ↷ Jugar Programa de Basura (al fondo del mazo)',
      shortTitle: '1 €$, ↷ Prog. de Basura',
      badgeText: '1 €$, ↷ TRASH',
      description: 'Paga 1 €$ y gira a Alt: Juega un Programa de tu Basura pagando su coste en Eddies. Tras jugarlo, irá al fondo de tu mazo.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Alt Cunningham debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Alt Cunningham ya está girada en este turno.' };
        const p = state[playerKey];
        const totalCap = getTotalAvailableEddies(p);
        if (totalCap < 1) return { can: false, reason: 'Necesitas al menos 1 €$ para activar esta habilidad.' };
        const trashProgs = (p.trash || []).filter(
          (c) => c.officialType === 'PROGRAM' || (c.type || '').toUpperCase().includes('PROGRAM')
        );
        if (trashProgs.length === 0) {
          return { can: false, reason: 'No tienes cartas de tipo Programa en tu Basura (Trash).' };
        }
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        // Cobrar 1 Eddie de activación
        spendEddies(p, 1);
        card.isSpent = true;

        const trashProgs = (p.trash || []).filter(
          (c) => c.officialType === 'PROGRAM' || (c.type || '').toUpperCase().includes('PROGRAM')
        );

        state.pendingCardChoice = {
          type: 'ALT_CUNNINGHAM_PLAY_TRASH_PROGRAM',
          playerKey,
          sourceCardId: 'CP-008',
          sourceCardName: 'Alt Cunningham // Soulkiller Architect',
          sourceCardImage: card.image,
          title: '🌐 ALT CUNNINGHAM // RECUPERAR PROGRAMA DE BASURA',
          prompt: 'Selecciona 1 Programa de tu Basura para jugarlo (pagarás su coste y al resolverse irá al fondo de tu mazo):',
          cards: trashProgs,
          eligibleIds: trashProgs.map((c) => c.instanceId),
          maxChoices: 1,
          selectedIds: [],
          filterDescription: 'Solo Programas de tu Basura'
        };

        state.actionLog.unshift(
          `🌐 [Alt Cunningham] Paga 1 €$, gira a Alt y abre su interfaz de Basura para jugar un Programa.`
        );
        return { success: true, requiresModal: true, message: 'Selecciona el Programa de tu Basura.' };
      }
    }
  ],

  // CP-026: Dexter DeShawn // Off the Grid (LEGEND)
  'CP-026': [
    {
      id: 'CP-026-TAP',
      abilityIndex: 0,
      title: '↷ Aumentar Gig hasta +2',
      shortTitle: '↷ Gig +2',
      badgeText: '↷ GIG +2',
      description: 'Gira a Dexter: Aumenta el valor de un Gig (propio o rival) en hasta 2.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Dexter DeShawn debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Dexter ya está girado en este turno.' };
        const allGigs = [...(state.player?.gigs || []), ...(state.bot?.gigs || [])];
        if (allGigs.length === 0) return { can: false, reason: 'No hay Gigs en juego para aumentar.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        card.isSpent = true;
        const p = state[playerKey];
        // Si el jugador tiene al menos un gig, aumentar su primer gig (o abrir selección)
        const targetGig = (p.gigs && p.gigs.length > 0) ? p.gigs[0] : (state.bot.gigs[0]);
        if (targetGig) {
          const oldVal = targetGig.value;
          targetGig.value = Math.min(20, (targetGig.value || 0) + 2);
          state.actionLog.unshift(
            `💼 [Dexter DeShawn] Activa (↷): Aumenta el Gig ${targetGig.dieType?.toUpperCase()} de ${oldVal} a ${targetGig.value} (+2).`
          );
          return { success: true, message: `Gig ${targetGig.dieType?.toUpperCase()} aumentado a ${targetGig.value}.` };
        }
        return { success: false, reason: 'No se encontró un Gig válido.' };
      }
    }
  ],

  // CP-029: Dum Dum // Maelstrom Triggerman (LEGEND)
  'CP-029': [
    {
      id: 'CP-029-TAP',
      abilityIndex: 0,
      title: 'QUICK 1 €$, ↷ Bono por Gear (+1 por cada Gear equipado)',
      shortTitle: '1 €$, ↷ +Fuerza Gear',
      badgeText: '1 €$, ↷ +GEAR',
      description: 'Paga 1 €$ y gira a Dum Dum: Otorga a una Unidad aliada +1 de Fuerza este turno por cada Gear que tenga equipado.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Dum Dum debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Dum Dum ya está girado en este turno.' };
        const p = state[playerKey];
        if (getTotalAvailableEddies(p) < 1) return { can: false, reason: 'Necesitas 1 €$ para activar a Dum Dum.' };
        if ((p.field || []).length === 0) return { can: false, reason: 'No tienes unidades en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        spendEddies(p, 1);
        card.isSpent = true;

        // Buscar unidades con gear o la primera unidad
        const equippedUnit = (p.field || []).find((u) => u.gear && u.gear.length > 0) || p.field[0];
        const gearCount = equippedUnit.gear ? equippedUnit.gear.length : 0;
        const bonus = Math.max(1, gearCount);
        equippedUnit.currentPower = (equippedUnit.currentPower || equippedUnit.power || 0) + bonus;

        state.actionLog.unshift(
          `💉 [Dum Dum] Paga 1 €$ y gira a Dum Dum: Otorga +${bonus} de Fuerza a "${equippedUnit.name}" (${gearCount} Gear(s) equipado(s)). Fuerza actual: ${equippedUnit.currentPower}.`
        );
        return { success: true, message: `+${bonus} de Fuerza otorgado a "${equippedUnit.name}".` };
      }
    }
  ],

  // CP-033: Evelyn Parker // Beautiful Enigma (LEGEND)
  'CP-033': [
    {
      id: 'CP-033-TAP',
      abilityIndex: 0,
      title: '1 €$, ↷ Provocación Forzada (Rival debe atacar)',
      shortTitle: '1 €$, ↷ Provocar',
      badgeText: '1 €$, ↷ PROVOCA',
      description: 'Paga 1 €$ y gira a Evelyn: Una Unidad rival debe atacar en su próximo turno si puede hacerlo.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Evelyn Parker debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Evelyn ya está girada en este turno.' };
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        if (getTotalAvailableEddies(p) < 1) return { can: false, reason: 'Necesitas 1 €$ para activar a Evelyn.' };
        if ((opp.field || []).length === 0) return { can: false, reason: 'El rival no tiene unidades en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        spendEddies(p, 1);
        card.isSpent = true;

        const target = opp.field[0];
        target.mustAttackNextTurn = true;
        state.actionLog.unshift(
          `💋 [Evelyn Parker] Paga 1 €$ y gira a Evelyn: "${target.name}" del rival está forzada a atacar en su próximo turno si puede.`
        );
        return { success: true, message: `"${target.name}" obligada a atacar su próximo turno.` };
      }
    }
  ],

  // CP-042: Goro Takemura // Vengeful Bodyguard (LEGEND)
  'CP-042': [
    {
      id: 'CP-042-TAP',
      abilityIndex: 0,
      title: 'QUICK 1 €$, ↷ Conceder Blocker (Coste ≤ 4)',
      shortTitle: '1 €$, ↷ Blocker',
      badgeText: '1 €$, ↷ BLOCKER',
      description: 'Paga 1 €$ y gira a Takemura: Otorga BLOCKER a una Unidad aliada de coste ≤ 4 (+1 Fuerza si controlas pareja de Gigs).',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Takemura debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Takemura ya está girado en este turno.' };
        const p = state[playerKey];
        if (getTotalAvailableEddies(p) < 1) return { can: false, reason: 'Necesitas 1 €$ para activar a Takemura.' };
        const eligibleUnits = (p.field || []).filter((u) => (u.costNum || u.parsedCost || 0) <= 4);
        if (eligibleUnits.length === 0) return { can: false, reason: 'No tienes unidades aliadas con coste ≤ 4.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        spendEddies(p, 1);
        card.isSpent = true;

        const target = (p.field || []).find((u) => (u.costNum || u.parsedCost || 0) <= 4) || p.field[0];
        target.isTemporaryBlockerThisTurn = true;
        if (!target.keywords) target.keywords = [];
        if (!target.keywords.includes('Blocker')) target.keywords.push('Blocker');

        // Comprobar si controla pareja de Gigs de igual valor
        const values = (p.gigs || []).map((g) => g.value);
        const hasPair = new Set(values).size < values.length;
        if (hasPair) {
          target.currentPower = (target.currentPower || target.power || 0) + 1;
        }

        state.actionLog.unshift(
          `🛡️ [Goro Takemura] Paga 1 €$ y gira a Takemura: Otorga BLOCKER a "${target.name}"${hasPair ? ' y +1 de Fuerza (por pareja de Gigs)' : ''}.`
        );
        return { success: true, message: `BLOCKER concedido a "${target.name}".` };
      }
    }
  ],

  // CP-045: Hanako Arasaka // Daughter of the Emperor (LEGEND)
  'CP-045': [
    {
      id: 'CP-045-TAP',
      abilityIndex: 0,
      title: '↷ Intercambiar Gig con el Rival',
      shortTitle: '↷ Swap Gigs',
      badgeText: '↷ SWAP GIG',
      description: 'Gira a Hanako: Intercambia un Gig aliado por un Gig del rival.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Hanako Arasaka debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Hanako ya está girada en este turno.' };
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        if ((p.gigs || []).length === 0) return { can: false, reason: 'No controlas ningún Gig para intercambiar.' };
        if ((opp.gigs || []).length === 0) return { can: false, reason: 'El rival no controla ningún Gig para intercambiar.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        card.isSpent = true;

        // Intercambiar el Gig de menor valor aliado por el de mayor valor rival
        const myMinGigIdx = p.gigs.reduce((minIdx, g, idx, arr) => (g.value < arr[minIdx].value ? idx : minIdx), 0);
        const oppMaxGigIdx = opp.gigs.reduce((maxIdx, g, idx, arr) => (g.value > arr[maxIdx].value ? idx : maxIdx), 0);

        const [myGig] = p.gigs.splice(myMinGigIdx, 1);
        const [oppGig] = opp.gigs.splice(oppMaxGigIdx, 1);

        p.gigs.push(oppGig);
        opp.gigs.push(myGig);

        state.actionLog.unshift(
          `🏯 [Hanako Arasaka] Activa (↷): Intercambió tu Gig ${myGig.dieType.toUpperCase()} (valor ${myGig.value}) por el Gig ${oppGig.dieType.toUpperCase()} del rival (valor ${oppGig.value}).`
        );
        return {
          success: true,
          message: `¡Intercambio completado! Has obtenido el Gig ${oppGig.dieType.toUpperCase()} (valor ${oppGig.value}).`
        };
      }
    }
  ],

  // CP-055: Johnny Silverhand // Rocking Renegade (LEGEND)
  'CP-055': [
    {
      id: 'CP-055-TAP',
      abilityIndex: 0,
      title: '↷ Asalto Rebelde (2 €$, -1 €$ si Gig ≥ 8)',
      shortTitle: '↷ Asalto Rebelde',
      badgeText: '↷ ROCKER',
      description: 'Gira a Johnny: Una Unidad aliada puede atacar a unidades gastadas el turno en que entra (+2 Fuerza si es Rocker). Descuento de -1 €$ por cada Gig ≥ 8.',
      costEddie: 2,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Johnny Silverhand debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Johnny ya está girado en este turno.' };
        const p = state[playerKey];
        const highGigs = (p.gigs || []).filter((g) => g.value >= 8).length;
        const finalCost = Math.max(0, 2 - highGigs);
        if (getTotalAvailableEddies(p) < finalCost) {
          return { can: false, reason: `Necesitas ${finalCost} €$ para activar a Johnny.` };
        }
        if ((p.field || []).length === 0) return { can: false, reason: 'No tienes unidades en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const highGigs = (p.gigs || []).filter((g) => g.value >= 8).length;
        const finalCost = Math.max(0, 2 - highGigs);
        if (finalCost > 0) spendEddies(p, finalCost);
        card.isSpent = true;

        const target = p.field[p.field.length - 1]; // Última unidad jugada o desplegada
        target.isLagging = false; // Permite atacar unidades enemigas
        target.canAttackSpentUnitsTurnPlayed = true;

        const isRocker = (target.traits || target.cardType || '').toUpperCase().includes('ROCKER');
        if (isRocker) {
          target.currentPower = (target.currentPower || target.power || 0) + 2;
        }

        state.actionLog.unshift(
          `🎸 [Johnny Silverhand] Paga ${finalCost} €$ y gira a Johnny: "${target.name}" puede atacar a unidades rivales este turno${isRocker ? ' y gana +2 de Fuerza (es ROCKER)' : ''}.`
        );
        return { success: true, message: `"${target.name}" habilitada para atacar.` };
      }
    }
  ],

  // CP-056: Judy Álvarez // Nothing to Doubt (UNIT)
  'CP-056': [
    {
      id: 'CP-056-TAP',
      abilityIndex: 0,
      title: '1 €$, ↷ Revelar Mazo (Jugar gratis o a la mano)',
      shortTitle: '1 €$, ↷ Revelar Mazo',
      badgeText: '1 €$, ↷ TOP DECK',
      description: 'Paga 1 €$ y gira a Judy: Revela la carta superior de tu mazo. Puedes jugarla gratis; si no, añádela a tu mano.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (card.isSpent) return { can: false, reason: 'Judy Álvarez ya está girada este turno.' };
        if (card.isLagging) return { can: false, reason: 'Judy Álvarez tiene Lag este turno.' };
        const p = state[playerKey];
        if (getTotalAvailableEddies(p) < 1) return { can: false, reason: 'Necesitas 1 €$ para activar a Judy.' };
        if (!p.deck || p.deck.length === 0) return { can: false, reason: 'Tu mazo está vacío.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        spendEddies(p, 1);
        card.isSpent = true;

        const [revealed] = p.deck.splice(0, 1);
        revealed.isJustDrawn = true;
        p.hand.push(revealed);

        state.actionLog.unshift(
          `📹 [Judy Álvarez] Paga 1 €$ y gira a Judy: Revela "${revealed.name}" del mazo y la añade a tu mano.`
        );
        return { success: true, message: `Revelada y añadida a mano: "${revealed.name}".` };
      }
    }
  ],

  // CP-057: Judy Álvarez // Braindance Maestro (LEGEND)
  'CP-057': [
    {
      id: 'CP-057-TAP',
      abilityIndex: 0,
      title: '↷ Descartar Top Deck (Recuperar si es Programa)',
      shortTitle: '↷ Filtrar Prog.',
      badgeText: '↷ BD FILTRO',
      description: 'Gira a Judy: Descarta la carta superior de tu mazo. Si es un Programa, añádela a tu mano.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Judy Álvarez debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Judy ya está girada en este turno.' };
        const p = state[playerKey];
        if (!p.deck || p.deck.length === 0) return { can: false, reason: 'Tu mazo está vacío.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;

        const [trashed] = p.deck.splice(0, 1);
        const isProg = trashed.officialType === 'PROGRAM' || (trashed.type || '').toUpperCase().includes('PROGRAM');
        if (isProg) {
          trashed.isJustDrawn = true;
          p.hand.push(trashed);
          state.actionLog.unshift(
            `🧠 [Judy Álvarez] Descarta "${trashed.name}" del mazo: ¡Es un PROGRAMA y se añade a tu mano!`
          );
          return { success: true, message: `¡Programa recuperado a mano: "${trashed.name}"!` };
        } else {
          if (!p.trash) p.trash = [];
          p.trash.push(trashed);
          state.actionLog.unshift(
            `🧠 [Judy Álvarez] Descarta "${trashed.name}" del mazo al Trash (no es Programa).`
          );
          return { success: true, message: `"${trashed.name}" descartada al Trash (no era Programa).` };
        }
      }
    }
  ],

  // CP-059: Kerry Eurodyne // The Last Rockerboy (UNIT)
  'CP-059': [
    {
      id: 'CP-059-TAP',
      abilityIndex: 0,
      title: '↷ Solo de Guitarra (Robar 2 si Gig ≥ 8)',
      shortTitle: '↷ Robar 2',
      badgeText: '↷ ROBA 2',
      description: 'Gira a Kerry: Si controlas un Gig con valor ≥ 8, roba 2 cartas.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (card.isSpent) return { can: false, reason: 'Kerry Eurodyne ya está girado este turno.' };
        if (card.isLagging) return { can: false, reason: 'Kerry Eurodyne tiene Lag este turno.' };
        const p = state[playerKey];
        const hasHighGig = (p.gigs || []).some((g) => g.value >= 8);
        if (!hasHighGig) return { can: false, reason: 'Necesitas controlar al menos un Gig con valor ≥ 8.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;
        const drawn = [];
        for (let i = 0; i < 2 && p.deck && p.deck.length > 0; i++) {
          const d = p.deck.shift();
          d.isJustDrawn = true;
          p.hand.push(d);
          drawn.push(d.name);
        }
        state.actionLog.unshift(
          `🎸 [Kerry Eurodyne] Activa (↷): ¡Condición de Gig ≥ 8 cumplida! Roba 2 cartas: ${drawn.join(', ')}.`
        );
        return { success: true, message: `Robadas 2 cartas: ${drawn.join(', ')}.` };
      }
    }
  ],

  // CP-082: Muamar Reyes // El Capitán (LEGEND)
  'CP-082': [
    {
      id: 'CP-082-TAP',
      abilityIndex: 0,
      title: '↷ Ajustar Gig en ±1',
      shortTitle: '↷ Gig ±1',
      badgeText: '↷ GIG ±1',
      description: 'Gira a El Capitán: Ajusta el valor de un Gig (propio o rival) en +1 o -1.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'El Capitán debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'El Capitán ya está girado este turno.' };
        const allGigs = [...(state.player?.gigs || []), ...(state.bot?.gigs || [])];
        if (allGigs.length === 0) return { can: false, reason: 'No hay Gigs en juego.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;
        const targetGig = (p.gigs && p.gigs.length > 0) ? p.gigs[0] : state.bot.gigs[0];
        if (targetGig) {
          targetGig.value = Math.min(20, (targetGig.value || 0) + 1);
          state.actionLog.unshift(
            `🚗 [Muamar Reyes] Activa (↷): Ajustó el Gig ${targetGig.dieType.toUpperCase()} en +1 (Nuevo valor: ${targetGig.value}).`
          );
          return { success: true, message: `Gig ${targetGig.dieType.toUpperCase()} ajustado a ${targetGig.value}.` };
        }
        return { success: false, reason: 'No se encontró un Gig válido.' };
      }
    }
  ],

  // CP-089: Overwatch // Panam's Gift (GEAR)
  'CP-089': [
    {
      id: 'CP-089-TAP',
      abilityIndex: 0,
      title: 'QUICK 1 €$, ↷ Francotirador Overwatch (Descartar 1 para destruir)',
      shortTitle: '1 €$, ↷ Snipe',
      badgeText: '1 €$, ↷ SNIPE',
      description: 'Paga 1 €$, gira Overwatch y descarta 1 carta: Destruye una Unidad rival gastada con coste ≤ al de la carta descartada.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (card.isSpent) return { can: false, reason: 'Overwatch ya está girado en este turno.' };
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        if (getTotalAvailableEddies(p) < 1) return { can: false, reason: 'Necesitas 1 €$ para disparar Overwatch.' };
        if ((p.hand || []).length === 0) return { can: false, reason: 'Necesitas al menos 1 carta en mano para descartar.' };
        const spentOppUnits = (opp.field || []).filter((u) => u.isSpent);
        if (spentOppUnits.length === 0) return { can: false, reason: 'El rival no tiene unidades gastadas (Spent) en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        spendEddies(p, 1);
        card.isSpent = true;

        // Descartar la carta de menor coste de la mano
        const [discarded] = p.hand.splice(0, 1);
        if (!p.trash) p.trash = [];
        p.trash.push(discarded);
        const discCost = discarded.costNum || discarded.parsedCost || 0;

        // Destruir una unidad rival gastada con coste <= discCost
        const targetIdx = opp.field.findIndex((u) => u.isSpent && (u.costNum || u.parsedCost || 0) <= discCost);
        if (targetIdx !== -1) {
          const [dead] = opp.field.splice(targetIdx, 1);
          sendDefeatedUnitToGraveyardOrExile(opp, dead, state);
          state.actionLog.unshift(
            `🎯 [Overwatch] Paga 1 €$, gira el rifle, descarta "${discarded.name}" (coste ${discCost}) y destruye a "${dead.name}".`
          );
          return { success: true, message: `"${dead.name}" destruida por disparo de Overwatch.` };
        } else {
          state.actionLog.unshift(
            `🎯 [Overwatch] Paga 1 €$, gira el rifle y descarta "${discarded.name}" (coste ${discCost}), pero no había unidades rivales gastadas con coste ≤ ${discCost}.`
          );
          return { success: true, message: `Descartada "${discarded.name}".` };
        }
      }
    }
  ],

  // CP-091: Padre // Man of the Cross (LEGEND)
  'CP-091': [
    {
      id: 'CP-091-TAP',
      abilityIndex: 0,
      title: '↷ Replicar Valor de Gig',
      shortTitle: '↷ Replicar Gig',
      badgeText: '↷ COPIA GIG',
      description: 'Gira a Padre: Establece el valor de un Gig en juego igual al valor de otro Gig en juego.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Padre debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Padre ya está girado este turno.' };
        const allGigs = [...(state.player?.gigs || []), ...(state.bot?.gigs || [])];
        if (allGigs.length < 2) return { can: false, reason: 'Se necesitan al menos 2 Gigs en juego para replicar valores.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;
        const allGigs = [...(state.player?.gigs || []), ...(state.bot?.gigs || [])];
        const maxGig = allGigs.reduce((max, g) => (g.value > max.value ? g : max), allGigs[0]);
        const minGig = allGigs.reduce((min, g) => (g.value < min.value ? g : min), allGigs[0]);
        minGig.value = maxGig.value;

        state.actionLog.unshift(
          `✝️ [Padre] Activa (↷): Establece el valor del Gig ${minGig.dieType.toUpperCase()} en ${maxGig.value} (igualando al Gig ${maxGig.dieType.toUpperCase()}).`
        );
        return { success: true, message: `Gig ${minGig.dieType.toUpperCase()} igualado a ${maxGig.value}.` };
      }
    }
  ],

  // CP-092: Panam Palmer // Nomad Cavalry (LEGEND)
  'CP-092': [
    {
      id: 'CP-092-TAP',
      abilityIndex: 0,
      title: '2 €$, ↷ Reasignar Gear y Enderezar Unidad',
      shortTitle: '2 €$, ↷ Mover Gear',
      badgeText: '2 €$, ↷ GEAR',
      description: 'Paga 2 €$ y gira a Panam: Mueve un Gear de esta Leyenda a una Unidad aliada no equipada y endereza esa Unidad.',
      costEddie: 2,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Panam Palmer debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Panam ya está girada en este turno.' };
        const p = state[playerKey];
        if (getTotalAvailableEddies(p) < 2) return { can: false, reason: 'Necesitas 2 €$ para activar a Panam.' };
        if (!card.gear || card.gear.length === 0) return { can: false, reason: 'Panam no tiene ningún Gear equipado para transferir.' };
        const unequippedUnits = (p.field || []).filter((u) => !u.gear || u.gear.length === 0);
        if (unequippedUnits.length === 0) return { can: false, reason: 'No tienes unidades no equipadas en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        spendEddies(p, 2);
        card.isSpent = true;

        const transferredGear = card.gear.shift();
        const targetUnit = (p.field || []).find((u) => !u.gear || u.gear.length === 0);
        if (!targetUnit.gear) targetUnit.gear = [];
        targetUnit.gear.push(transferredGear);
        targetUnit.isSpent = false; // Endereza la unidad

        state.actionLog.unshift(
          `🌵 [Panam Palmer] Paga 2 €$, gira a Panam, transfiere el Gear "${transferredGear.name}" a "${targetUnit.name}" y la endereza.`
        );
        return { success: true, message: `Gear transferido a "${targetUnit.name}" y unidad enderezada.` };
      }
    }
  ],

  // CP-104: River Ward // Detective on the Hunt (LEGEND)
  'CP-104': [
    {
      id: 'CP-104-TAP',
      abilityIndex: 0,
      title: 'QUICK ↷ Equipar Gear Gratis (Coste ≤ 2 €$)',
      shortTitle: '↷ Equipar Gear',
      badgeText: '↷ GEAR GRATIS',
      description: 'Gira a River Ward: Juega gratis desde tu mano un Gear con coste ≤ 2 €$ equipándolo a una Unidad o Leyenda.',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'River Ward debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'River Ward ya está girado en este turno.' };
        const p = state[playerKey];
        const eligibleGears = (p.hand || []).filter(
          (c) => (c.officialType === 'GEAR' || (c.type || '').toUpperCase().includes('GEAR')) && (c.costNum || c.parsedCost || 0) <= 2
        );
        if (eligibleGears.length === 0) return { can: false, reason: 'No tienes Gears de coste ≤ 2 €$ en tu mano.' };
        if ((p.field || []).length === 0) return { can: false, reason: 'No tienes unidades en el campo para equiparles el Gear.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const eligibleGears = (p.hand || []).filter(
          (c) => (c.officialType === 'GEAR' || (c.type || '').toUpperCase().includes('GEAR')) && (c.costNum || c.parsedCost || 0) <= 2
        );
        return { success: true, type: 'RIVER_WARD_EQUIP', eligibleGears };
      }
    }
  ],

  // CP-107: Rogue Amendiares // Queen of the Afterlife (UNIT)
  'CP-107': [
    {
      id: 'CP-107-TAP',
      abilityIndex: 0,
      title: 'QUICK 2 €$, ↷ Debuff de Fuerza Rival',
      shortTitle: '2 €$, ↷ Debuff',
      badgeText: '2 €$, ↷ DEBUFF',
      description: 'Paga 2 €$ y gira a Rogue: Una Unidad rival pierde Fuerza igual a la Fuerza actual de Rogue este turno.',
      costEddie: 2,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (card.isSpent) return { can: false, reason: 'Rogue Amendiares ya está girada este turno.' };
        if (card.isLagging) return { can: false, reason: 'Rogue Amendiares tiene Lag este turno.' };
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        if (getTotalAvailableEddies(p) < 2) return { can: false, reason: 'Necesitas 2 €$ para activar a Rogue.' };
        if ((opp.field || []).length === 0) return { can: false, reason: 'El rival no tiene unidades en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        spendEddies(p, 2);
        card.isSpent = true;

        const debuffAmount = card.currentPower || card.power || 5;
        const target = [...opp.field].sort((a, b) => (b.currentPower || 0) - (a.currentPower || 0))[0];
        target.currentPower = Math.max(0, (target.currentPower || target.power || 0) - debuffAmount);

        state.actionLog.unshift(
          `🍸 [Rogue Amendiares] Paga 2 €$ y gira a Rogue: Reduce la Fuerza de "${target.name}" en -${debuffAmount} (Fuerza actual: ${target.currentPower}).`
        );
        return { success: true, message: `"${target.name}" reducida en -${debuffAmount} de Fuerza.` };
      }
    }
  ],

  // CP-143: Wakako Okada // Peace and Harmony (LEGEND)
  'CP-143': [
    {
      id: 'CP-143-TAP',
      abilityIndex: 0,
      title: '↷ Reducir Gig hasta -2',
      shortTitle: '↷ Gig -2',
      badgeText: '↷ GIG -2',
      description: 'Gira a Wakako: Reduce el valor de un Gig (propio o rival) en hasta 2 (mínimo 1).',
      costEddie: 0,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Wakako Okada debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Wakako ya está girada este turno.' };
        const allGigs = [...(state.player?.gigs || []), ...(state.bot?.gigs || [])];
        if (allGigs.length === 0) return { can: false, reason: 'No hay Gigs en juego para reducir.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        card.isSpent = true;
        const targetGig = (p.gigs && p.gigs.length > 0) ? p.gigs[0] : state.bot.gigs[0];
        if (targetGig) {
          const oldVal = targetGig.value;
          targetGig.value = Math.max(1, (targetGig.value || 0) - 2);
          state.actionLog.unshift(
            `🌸 [Wakako Okada] Activa (↷): Redujo el Gig ${targetGig.dieType.toUpperCase()} de ${oldVal} a ${targetGig.value} (-2).`
          );
          return { success: true, message: `Gig ${targetGig.dieType.toUpperCase()} reducido a ${targetGig.value}.` };
        }
        return { success: false, reason: 'No se encontró un Gig válido.' };
      }
    }
  ]
};

/**
 * Obtiene la lista de habilidades activadas disponibles para una carta concreta.
 */
export function getCardActivatedAbilities(card, playerKey = 'player', state = null) {
  if (!card) return [];
  const cardId = String(card.id || '').toUpperCase();
  const abilities = ACTIVATED_ABILITIES_CONFIG[cardId] || [];

  if (!state) return abilities;

  return abilities.map((ab) => {
    const check = ab.canActivate(state, playerKey, card);
    return {
      ...ab,
      canActivateNow: check.can,
      disabledReason: check.reason || null
    };
  });
}

/**
 * Ejecuta una habilidad activada específica de una carta.
 */
export function executeCardActivatedAbility(state, playerKey, cardInstanceId, abilityId = null) {
  if (!state) return { success: false, reason: 'Estado no válido' };
  const p = state[playerKey];

  // Buscar la carta en leyendas, campo o gears
  let card = (p.legends || []).find((l) => l.instanceId === cardInstanceId);
  if (!card) card = (p.field || []).find((u) => u.instanceId === cardInstanceId);
  if (!card) {
    // Buscar en gears anexados
    for (const u of p.field || []) {
      const g = (u.gear || []).find((gear) => gear.instanceId === cardInstanceId);
      if (g) {
        card = g;
        break;
      }
    }
  }

  if (!card) return { success: false, reason: 'Carta no encontrada.' };

  const abilities = getCardActivatedAbilities(card, playerKey, state);
  if (abilities.length === 0) {
    return { success: false, reason: 'Esta carta no tiene habilidades activadas (↷).' };
  }

  const chosenAbility = abilityId
    ? abilities.find((ab) => ab.id === abilityId)
    : abilities[0];

  if (!chosenAbility) {
    return { success: false, reason: 'Habilidad no encontrada.' };
  }

  const check = chosenAbility.canActivate(state, playerKey, card);
  if (!check.can) {
    return { success: false, reason: check.reason };
  }

  return chosenAbility.execute(state, playerKey, card);
}
