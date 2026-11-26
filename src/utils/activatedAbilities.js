/**
 * activatedAbilities.js
 * Motor universal de habilidades activadas con giro (↷) para Cyberpunk TCG.
 * Set 01 - Welcome to Night City (17 cartas con símbolo ↷).
 */

import {
  getAvailableEddies,
  getTotalAvailableEddies,
  getSpendableEddiesExcludingCard,
  payEddieCostWithAutoTap,
  getEffectiveCardCost,
  spendEddies,
  hasKeyword
} from './cyberpunkEngine.js';

import {
  executeProgramEffect,
  sendDefeatedUnitToGraveyardOrExile,
  queueTargetSelection,
  executeCardSpentTriggers,
  triggerMeredithStoutOnRivalGigModify,
  getGigMaxFace
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
        p.altCunninghamDiscountStacks = (p.altCunninghamDiscountStacks || 0) + 1;
        const minGigs = (p.gigs || []).filter((g) => Number(g.value) === 1).length;
        state.actionLog.unshift(
          `🌐 [Alt Cunningham] Activa (↷): Tu próximo Programa este turno cuesta -1 €$ por cada Gig mínimo aliado (actualmente ${minGigs} Gig(s) mínimo(s) = -${minGigs * p.altCunninghamDiscountStacks} €$, mínimo 1 €$).`
        );
        return {
          success: true,
          message: `Descuento activado: Tu próximo Programa este turno costará -1 €$ por cada Gig mínimo que controles (actualmente -${minGigs * p.altCunninghamDiscountStacks} €$, mínimo 1 €$).`
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
        // Excluir a Alt de los Eddies disponibles ya que Alt se gira para pagar (↷)
        const otherEddies = getSpendableEddiesExcludingCard(p, card.instanceId);
        if (otherEddies < 1) {
          return { can: false, reason: 'Necesitas al menos 1 €$ adicional (sin contar a Alt) para activar esta habilidad.' };
        }
        const trashProgs = (p.trash || []).filter(
          (c) => c.officialType === 'PROGRAM' || (c.type || '').toUpperCase().includes('PROGRAM')
        );
        if (trashProgs.length === 0) {
          return { can: false, reason: 'No tienes cartas de tipo Programa en tu Basura (Trash).' };
        }
        const remainingAfterActivation = otherEddies - 1;
        const affordableProgs = trashProgs.filter(
          (prog) => getEffectiveCardCost(prog, p, state) <= remainingAfterActivation
        );
        if (affordableProgs.length === 0) {
          return {
            can: false,
            reason: `Tienes Programas en Basura, pero tras pagar 1 €$ de activación solo te quedarían ${remainingAfterActivation} €$ (insuficiente para pagar su coste).`
          };
        }
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        // Pagar 1 Eddie de activación sin girar a Alt, luego girar a Alt
        const paid = payEddieCostWithAutoTap(p, 1, card.instanceId);
        if (!paid) return { success: false, reason: 'No tienes 1 €$ adicional para activar a Alt Cunningham.' };
        card.isSpent = true;

        const remainingCap = getSpendableEddiesExcludingCard(p, null);
        const trashProgs = (p.trash || []).filter(
          (c) => c.officialType === 'PROGRAM' || (c.type || '').toUpperCase().includes('PROGRAM')
        );
        const affordableIds = trashProgs
          .filter((prog) => getEffectiveCardCost(prog, p, state) <= remainingCap)
          .map((c) => c.instanceId);

        state.pendingCardChoice = {
          type: 'ALT_CUNNINGHAM_PLAY_TRASH_PROGRAM',
          playerKey,
          sourceCardId: 'CP-008',
          sourceCardName: 'Alt Cunningham // Soulkiller Architect',
          sourceCardImage: card.image,
          title: '🌐 ALT CUNNINGHAM // RECUPERAR PROGRAMA DE BASURA',
          prompt: `Selecciona 1 Programa de tu Basura para jugarlo (pagarás su coste con tus ${remainingCap} €$ disponibles y al resolverse irá al fondo de tu mazo):`,
          cards: trashProgs,
          eligibleIds: affordableIds,
          maxChoices: 1,
          minChoices: affordableIds.length > 0 ? 1 : 0,
          selectedIds: [],
          filterDescription: `Programas en Basura con coste ≤ ${remainingCap} €$`
        };

        state.actionLog.unshift(
          `🌐 [Alt Cunningham] Paga 1 €$, gira a Alt y abre la Basura para jugar un Programa (Eddies restantes: ${remainingCap} €$).`
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
      shortTitle: '↷ Gig +1/+2',
      badgeText: '↷ GIG +2',
      description: 'Gira a Dexter: Elige cualquier Gig en juego (tuyo o del rival) y aumenta su valor en +1 o +2 (sin superar el máximo de ese dado).',
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
        if (playerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'ADJUST_GIG',
            sourceCardId: 'CP-026',
            sourceCardName: 'Dexter DeShawn // Off the Grid',
            sourceCardImage: card.image,
            title: '💼 DEXTER DESHAWN // ↷ AUMENTAR GIG',
            prompt: 'Selecciona cualquier Gig en juego (tuyo o del rival) para aumentar su valor en +1, +2 o dejarlo igual:',
            canIncrease: true,
            canDecrease: false,
            maxDelta: 2,
            allowZero: true
          });
          state.actionLog.unshift(
            `💼 [Dexter DeShawn] Gira a Dexter (↷) para aumentar un Gig en hasta +2.`
          );
          return { success: true, requiresModal: true, message: 'Selecciona el Gig a aumentar (+1 o +2).' };
        }
        // Bot AI: aumenta su propio Gig con más margen (respetando el máximo de caras del dado)
        const targetGig = (p.gigs || [])[0] || (state.player?.gigs || [])[0];
        if (targetGig) {
          const dieStr = String(targetGig.die || targetGig.dieType || 'd20');
          const maxFace = getGigMaxFace(targetGig);
          const oldVal = targetGig.value;
          targetGig.value = Math.min(maxFace, (targetGig.value || 1) + 2);
          state.actionLog.unshift(
            `💼 [Dexter DeShawn Rival] Activa (↷): Aumenta el Gig ${dieStr.toUpperCase()} de ${oldVal} a ${targetGig.value}.`
          );
          return { success: true, message: `Gig ${dieStr.toUpperCase()} aumentado a ${targetGig.value}.` };
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
      isQuick: true,
      title: 'QUICK 1 €$, ↷ Bono por Gear (+1 por cada Gear equipado)',
      shortTitle: '1 €$, ↷ +Fuerza Gear',
      badgeText: 'QUICK 1€$, ↷',
      description: 'QUICK (también en Fase de Reacción): Paga 1 €$ y gira a Dum Dum para dar a una Unidad aliada +1 de Fuerza este turno por cada Gear que tenga equipado.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Dum Dum debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Dum Dum ya está girado en este turno.' };
        const p = state[playerKey];
        if (getSpendableEddiesExcludingCard(p, card.instanceId) < 1) {
          return { can: false, reason: 'Necesitas al menos 1 €$ adicional (sin contar a Dum Dum) para activar esta habilidad.' };
        }
        if ((p.field || []).length === 0) return { can: false, reason: 'No tienes unidades en el campo de batalla.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const paid = payEddieCostWithAutoTap(p, 1, card.instanceId);
        if (!paid) {
          return { success: false, reason: 'Gira primero 1 Eddie o Leyenda para tener 1 €$ en reserva antes de activar a Dum Dum.' };
        }
        card.isSpent = true;

        if (playerKey === 'player' && (p.field || []).length > 1) {
          state.pendingTargetSelection = {
            actionType: 'TARGET_UNIT',
            sourceCardId: 'CP-029',
            sourceCardName: 'Dum Dum // Maelstrom Triggerman',
            sourceCardImage: card.image,
            title: '💉 DUM DUM // QUICK 1 €$, ↷ BONO POR GEAR',
            prompt: 'Selecciona una Unidad aliada: ganará +1 de Fuerza este turno por cada Gear que tenga equipado:',
            effectType: 'BUFF_PER_GEAR',
            targetScope: 'FRIENDLY_UNITS'
          };
          state.actionLog.unshift(`💉 [Dum Dum] Paga 1 €$ y gira a Dum Dum (QUICK ↷) para potenciar una unidad aliada según sus Gears.`);
          return { success: true, requiresModal: true, message: 'Selecciona la unidad aliada a potenciar.' };
        }

        // 1 unidad (o Bot AI: elige la que más Gears tiene)
        const target = [...(p.field || [])].sort((a, b) => (b.gear?.length || 0) - (a.gear?.length || 0))[0];
        const gearCount = target?.gear ? target.gear.length : 0;
        if (target) {
          target.currentPower = (target.currentPower || target.power || 0) + gearCount;
          state.actionLog.unshift(
            `💉 [Dum Dum] Paga 1 €$ y gira a Dum Dum: Otorga +${gearCount} de Fuerza este turno a "${target.name}" (${gearCount} Gear(s) equipado(s)). Fuerza actual: ${target.currentPower}.`
          );
          return { success: true, message: `+${gearCount} de Fuerza este turno otorgado a "${target.name}" (${gearCount} Gear(s)).` };
        }
        return { success: false, reason: 'No hay unidad válida.' };
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
      description: 'Paga 1 €$ y gira a Evelyn: Elige una Unidad rival; deberá atacar en su próximo turno si puede hacerlo.',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Evelyn Parker debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Evelyn ya está girada en este turno.' };
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        if (getSpendableEddiesExcludingCard(p, card.instanceId) < 1) {
          return { can: false, reason: 'Necesitas al menos 1 €$ adicional (sin contar a Evelyn) para activar esta habilidad.' };
        }
        if ((opp.field || []).length === 0) return { can: false, reason: 'El rival no tiene unidades en el campo.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const opp = state[playerKey === 'player' ? 'bot' : 'player'];
        const paid = payEddieCostWithAutoTap(p, 1, card.instanceId);
        if (!paid) {
          return { success: false, reason: 'Gira primero 1 Eddie o Leyenda para tener 1 €$ en reserva antes de activar a Evelyn.' };
        }
        card.isSpent = true;

        if (playerKey === 'player' && (opp.field || []).length > 0) {
          queueTargetSelection(state, {
            actionType: 'TARGET_UNIT',
            sourceCardId: 'CP-033',
            sourceCardName: 'Evelyn Parker // Beautiful Enigma',
            sourceCardImage: card.image,
            title: '💋 EVELYN PARKER // 1 €$, ↷ PROVOCACIÓN',
            prompt: 'Selecciona una Unidad rival: deberá atacar en su próximo turno si puede hacerlo:',
            effectType: 'MUST_ATTACK',
            targetScope: 'RIVAL_UNITS'
          });
          state.actionLog.unshift(`💋 [Evelyn Parker] Paga 1 €$ y gira a Evelyn para obligar a una unidad rival a atacar.`);
          return { success: true, requiresModal: true, message: 'Selecciona la unidad rival objetivo.' };
        }

        const target = opp.field[0];
        target.mustAttackNextTurn = true;
        state.actionLog.unshift(
          `💋 [Evelyn Parker] Paga 1 €$ y gira a Evelyn: "${target.name}" del rival está forzada a atacar en su próximo turno si puede.`
        );
        return { success: true, message: `"${target.name}" obligada a atacar en su próximo turno.` };
      }
    }
  ],

  // CP-042: Goro Takemura // Vengeful Bodyguard (LEGEND)
  'CP-042': [
    {
      id: 'CP-042-TAP',
      abilityIndex: 0,
      isQuick: true,
      title: 'QUICK 1 €$, ↷ Conceder Blocker (Coste ≤ 4)',
      shortTitle: '1 €$, ↷ Blocker',
      badgeText: 'QUICK 1€$, ↷',
      description: 'QUICK (también en Fase de Reacción): Paga 1 €$ y gira a Takemura para dar BLOCKER este turno a una Unidad aliada de coste ≤ 4 (+1 Fuerza este turno si controlas pareja de Gigs).',
      costEddie: 1,
      requiresTap: true,
      canActivate: (state, playerKey, card) => {
        if (!card.isFaceUp) return { can: false, reason: 'Takemura debe estar boca arriba.' };
        if (card.isSpent) return { can: false, reason: 'Takemura ya está girado en este turno.' };
        const p = state[playerKey];
        if (getSpendableEddiesExcludingCard(p, card.instanceId) < 1) {
          return { can: false, reason: 'Necesitas al menos 1 €$ adicional (sin contar a Takemura) para activar esta habilidad.' };
        }
        const eligibleUnits = (p.field || []).filter((u) => {
          const c = typeof u.parsedCost === 'number' ? u.parsedCost : (typeof u.costNum === 'number' ? u.costNum : parseInt(String(u.cost || '').replace(/\D/g, ''), 10) || 0);
          return c <= 4;
        });
        if (eligibleUnits.length === 0) return { can: false, reason: 'No tienes unidades aliadas con coste ≤ 4.' };
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const paid = payEddieCostWithAutoTap(p, 1, card.instanceId);
        if (!paid) {
          return { success: false, reason: 'Gira primero 1 Eddie o Leyenda para tener 1 €$ en reserva antes de activar a Takemura.' };
        }
        card.isSpent = true;

        const eligibleUnits = (p.field || []).filter((u) => {
          const c = typeof u.parsedCost === 'number' ? u.parsedCost : (typeof u.costNum === 'number' ? u.costNum : parseInt(String(u.cost || '').replace(/\D/g, ''), 10) || 0);
          return c <= 4;
        });

        if (playerKey === 'player' && eligibleUnits.length > 0) {
          queueTargetSelection(state, {
            actionType: 'TARGET_UNIT',
            sourceCardId: 'CP-042',
            sourceCardName: 'Goro Takemura // Vengeful Bodyguard',
            sourceCardImage: card.image,
            title: '🛡️ GORO TAKEMURA // QUICK 1 €$, ↷ BLOCKER',
            prompt: 'Selecciona una Unidad aliada con coste ≤ 4 para otorgarle BLOCKER este turno (+1 Fuerza si controlas pareja de Gigs):',
            effectType: 'GRANT_BLOCKER_TAKEMURA',
            targetScope: 'FRIENDLY_UNITS',
            maxCost: 4
          });
          state.actionLog.unshift(`🛡️ [Goro Takemura] Paga 1 €$ y gira a Takemura (QUICK ↷) para conceder BLOCKER a una unidad aliada.`);
          return { success: true, requiresModal: true, message: 'Selecciona la unidad aliada (coste ≤ 4).' };
        }

        const target = eligibleUnits[0];
        target.isTemporaryBlockerThisTurn = true;
        const values = (p.gigs || []).map((g) => Number(g.value));
        const hasPair = new Set(values).size < values.length;
        if (hasPair) {
          target.currentPower = (target.currentPower || target.power || 0) + 1;
        }
        state.actionLog.unshift(
          `🛡️ [Goro Takemura] Paga 1 €$ y gira a Takemura: Otorga BLOCKER este turno a "${target.name}"${hasPair ? ' y +1 de Fuerza (por pareja de Gigs)' : ''}.`
        );
        return { success: true, message: `BLOCKER concedido este turno a "${target.name}"${hasPair ? ' (+1 Fuerza por pareja de Gigs)' : ''}.` };
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
        const oppKey = playerKey === 'player' ? 'bot' : 'player';
        const opp = state[oppKey];
        card.isSpent = true;

        if (playerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'SWAP_GIGS',
            sourceCardId: 'CP-045',
            sourceCardName: 'Hanako Arasaka // Daughter of the Emperor',
            sourceCardImage: card.image,
            title: '🏯 HANAKO ARASAKA // ↷ INTERCAMBIAR GIG',
            prompt: 'PASO 1 DE 2: Selecciona TU Gig que deseas intercambiar con un Gig del rival:',
            step: 1
          });
          state.actionLog.unshift(
            `🏯 [Hanako Arasaka] Gira a Hanako (↷) para intercambiar un Gig aliado por un Gig del rival.`
          );
          return { success: true, requiresModal: true, message: 'Selecciona tu Gig y el Gig del rival a intercambiar.' };
        }

        // Bot AI: intercambia su Gig de menor valor por el de mayor valor del jugador
        const myMinGigIdx = p.gigs.reduce((minIdx, g, idx, arr) => (g.value < arr[minIdx].value ? idx : minIdx), 0);
        const oppMaxGigIdx = opp.gigs.reduce((maxIdx, g, idx, arr) => (g.value > arr[maxIdx].value ? idx : maxIdx), 0);

        const [myGig] = p.gigs.splice(myMinGigIdx, 1);
        const [oppGig] = opp.gigs.splice(oppMaxGigIdx, 1);

        p.gigs.push(oppGig);
        opp.gigs.push(myGig);

        const myDieLabel = String(myGig.die || myGig.dieType || 'GIG').toUpperCase();
        const oppDieLabel = String(oppGig.die || oppGig.dieType || 'GIG').toUpperCase();
        state.actionLog.unshift(
          `🏯 [Hanako Arasaka Rival] Activa (↷): Intercambió su Gig ${myDieLabel} (valor ${myGig.value}) por tu Gig ${oppDieLabel} (valor ${oppGig.value}).`
        );
        triggerMeredithStoutOnRivalGigModify(state, oppKey);
        return {
          success: true,
          message: `Hanako Rival intercambió ${myDieLabel} (${myGig.value}) por ${oppDieLabel} (${oppGig.value}).`
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
        // REGLA OFICIAL: "A friendly Unit can attack spent rival Units the turn it's played." (NO Gigs)
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
          playerKey === 'bot'
            ? `🎸 [Kerry Eurodyne Rival] Activa (↷): ¡Condición de Gig ≥ 8 cumplida! Roba ${drawn.length} carta(s).`
            : `🎸 [Kerry Eurodyne] Activa (↷): ¡Condición de Gig ≥ 8 cumplida! Roba ${drawn.length} carta(s): ${drawn.join(', ')}.`
        );
        return {
          success: true,
          message: playerKey === 'bot' ? `El rival robó ${drawn.length} carta(s).` : `Robadas ${drawn.length} cartas: ${drawn.join(', ')}.`
        };
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
        if (playerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'ADJUST_GIG',
            sourceCardId: 'CP-082',
            sourceCardName: 'Muamar Reyes // El Capitán',
            sourceCardImage: card.image,
            title: '🚗 MUAMAR REYES // ↷ AJUSTAR GIG EN ±1',
            prompt: 'Selecciona cualquier Gig en juego (tuyo o del rival) para ajustarlo en +1 o -1:',
            canIncrease: true,
            canDecrease: true,
            maxDelta: 1,
            allowZero: false
          });
          state.actionLog.unshift(
            `🚗 [Muamar Reyes] Gira a El Capitán (↷) para ajustar un Gig en +1 o -1.`
          );
          return { success: true, requiresModal: true, message: 'Selecciona el Gig a ajustar en +1 o -1.' };
        }
        const targetGig = (p.gigs && p.gigs.length > 0) ? p.gigs[0] : (state.player?.gigs || [])[0];
        if (targetGig) {
          const isOwn = (p.gigs || []).includes(targetGig);
          const dieLabel = String(targetGig.die || targetGig.dieType || 'GIG').toUpperCase();
          const oldVal = targetGig.value;
          targetGig.value = isOwn
            ? Math.min(getGigMaxFace(targetGig), (targetGig.value || 1) + 1)
            : Math.max(1, (targetGig.value || 1) - 1);
          state.actionLog.unshift(
            `🚗 [Muamar Reyes Rival] Activa (↷): Ajustó el Gig ${dieLabel} de ${oldVal} a ${targetGig.value}.`
          );
          if (!isOwn) triggerMeredithStoutOnRivalGigModify(state, 'player');
          return { success: true, message: `Gig ${dieLabel} ajustado a ${targetGig.value}.` };
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
      isQuick: true,
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
        const pGigs = state.player?.gigs || [];
        const bGigs = state.bot?.gigs || [];
        if (pGigs.length === 0 || bGigs.length === 0) {
          return { can: false, reason: 'Ambos jugadores deben controlar al menos 1 Gig para igualar un Gig al del otro jugador.' };
        }
        return { can: true };
      },
      execute: (state, playerKey, card) => {
        const p = state[playerKey];
        const oppKey = playerKey === 'player' ? 'bot' : 'player';
        const opp = state[oppKey];
        card.isSpent = true;

        if (playerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'PEACE_OFFERING',
            sourceCardId: 'CP-091',
            sourceCardName: 'Padre // Man of the Cross',
            sourceCardImage: card.image,
            title: '✝️ PADRE // ↷ IGUALAR GIG AL DE OTRO JUGADOR',
            prompt: 'PASO 1 DE 2: Haz clic en el Gig (tuyo o del rival) cuyo valor deseas MODIFICAR (luego elegirás un Gig del OTRO jugador para copiar su valor):',
            step: 1,
            targetScope: 'ALL_GIGS',
            requireOtherPlayerSource: true,
            noDrawBonus: true,
            selectedTargetGig: null
          });
          state.actionLog.unshift(
            `✝️ [Padre] Gira a Padre (↷) para igualar el valor de un Gig al de un Gig del otro jugador.`
          );
          return { success: true, requiresModal: true, message: 'Selecciona el Gig a modificar y luego el Gig del otro jugador.' };
        }

        // Bot AI: copia el mayor Gig del jugador a un Gig propio con espacio, respetando maxFace
        const highestOpp = [...(opp.gigs || [])].sort((a, b) => b.value - a.value)[0];
        const ownTarget = [...(p.gigs || [])].sort((a, b) => a.value - b.value)[0];
        if (highestOpp && ownTarget) {
          const oldVal = ownTarget.value;
          ownTarget.value = Math.max(1, Math.min(getGigMaxFace(ownTarget), highestOpp.value));
          const tLabel = String(ownTarget.die || ownTarget.dieType || 'GIG').toUpperCase();
          const sLabel = String(highestOpp.die || highestOpp.dieType || 'GIG').toUpperCase();
          state.actionLog.unshift(
            `✝️ [Padre Rival] Activa (↷): Establece su Gig ${tLabel} de ${oldVal} a ${ownTarget.value} (igualando a tu Gig ${sLabel}).`
          );
          return { success: true, message: `Gig ${tLabel} igualado a ${ownTarget.value}.` };
        }
        return { success: false, reason: 'No se encontraron Gigs válidos.' };
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
      isQuick: true,
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
      isQuick: true,
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
        const oppKey = playerKey === 'player' ? 'bot' : 'player';
        const opp = state[oppKey];
        card.isSpent = true;

        if (playerKey === 'player') {
          queueTargetSelection(state, {
            actionType: 'ADJUST_GIG',
            sourceCardId: 'CP-143',
            sourceCardName: 'Wakako Okada // Peace and Harmony',
            sourceCardImage: card.image,
            title: '🌸 WAKAKO OKADA // ↷ REDUCIR GIG (-HASTA 2)',
            prompt: 'Selecciona cualquier Gig en juego (tuyo o del rival) para reducir su valor en -1, -2 o dejarlo igual:',
            canIncrease: false,
            canDecrease: true,
            maxDelta: 2,
            allowZero: true
          });
          state.actionLog.unshift(
            `🌸 [Wakako Okada] Gira a Wakako (↷) para reducir un Gig en hasta -2.`
          );
          return { success: true, requiresModal: true, message: 'Selecciona el Gig a reducir (-1 o -2).' };
        }

        const targetGig =
          (opp.gigs && opp.gigs.length > 0 ? [...opp.gigs].sort((a, b) => b.value - a.value)[0] : null) ||
          (p.gigs || [])[0];
        if (targetGig) {
          const isOpp = (opp.gigs || []).includes(targetGig);
          const dieLabel = String(targetGig.die || targetGig.dieType || 'GIG').toUpperCase();
          const oldVal = targetGig.value;
          targetGig.value = Math.max(1, (targetGig.value || 1) - 2);
          state.actionLog.unshift(
            `🌸 [Wakako Okada Rival] Activa (↷): Redujo el Gig ${dieLabel} de ${oldVal} a ${targetGig.value}.`
          );
          if (isOpp) triggerMeredithStoutOnRivalGigModify(state, oppKey);
          return { success: true, message: `Gig ${dieLabel} reducido a ${targetGig.value}.` };
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
    if (state.activePlayer !== playerKey && !ab.isQuick) {
      return {
        ...ab,
        canActivateNow: false,
        disabledReason: 'Solo se pueden activar habilidades Quick durante la Fase de Reacción del rival.'
      };
    }
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

  if (state.activePlayer !== playerKey && !chosenAbility.isQuick) {
    return { success: false, reason: 'Solo se pueden activar habilidades Quick durante la Fase de Reacción del rival.' };
  }

  const check = chosenAbility.canActivate(state, playerKey, card);
  if (!check.can) {
    return { success: false, reason: check.reason };
  }

  const wasSpentBefore = Boolean(card.isSpent);
  const res = chosenAbility.execute(state, playerKey, card);
  if (res && res.success && !wasSpentBefore && card.isSpent) {
    executeCardSpentTriggers(state, playerKey, card);
    if (state.pendingTargetSelection || state.pendingCardChoice) {
      res.requiresModal = true;
    }
  }
  return res;
}
