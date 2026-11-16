/**
 * MOTOR DE EFECTOS Y REGLAS DE CARTAS DE CYBERPUNK TCG (SET 01: WELCOME TO NIGHT CITY)
 * Contiene el texto oficial de cada carta y la lógica de ejecución de habilidades.
 */

export const CARD_RULES_TEXT = {
  // ==================== LEYENDAS ====================
  'CP-002': {
    name: 'Adam Smasher // Ender of Legends',
    rulesText: 'GO SOLO (Pay this Legend\'s cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.)\nPLAY Defeat a rival Unit.',
    keywords: ['Go Solo', 'Play']
  },
  'CP-082': {
    name: 'Muamar Reyes // El Capitán',
    rulesText: 'CALL Choose one effect:\n- A friendly Unit can\'t be defeated in a fight this turn.\n- Draw 1.\n↷: Adjust a Gig by 1.',
    keywords: ['Call']
  },
  'CP-104': {
    name: 'River Ward // Detective on the Hunt',
    rulesText: 'QUICK ↷: Play a Gear with cost 2 or less from your hand for free.\nWhen a friendly equipped Unit is defeated, search the top 2 cards of your deck and trash 1.',
    keywords: ['Quick']
  },
  'CP-008': {
    name: 'Alt Cunningham // Soulkiller Architect',
    rulesText: 'Program cards you play cost 1 less for each friendly min Gig.\nOnce per turn, you may play a Program card from your trash as if it were in your hand.',
    keywords: ['Discount']
  },
  'CP-045': {
    name: 'Hanako Arasaka // Daughter of the Emperor',
    rulesText: 'START At the start of your turn, if you control 2 or more Gigs with the same value, draw 1.',
    keywords: ['Start']
  },
  'CP-051': {
    name: 'Jackie Welles // Pour One Out for Me',
    rulesText: 'When you play a Blue Unit or Gear, you may decrease a friendly Gig by 1.\nWhen a friendly Gig becomes a min Gig, draw 1.',
    keywords: ['Trigger']
  },

  // ==================== PROGRAMAS ====================
  'CP-014': {
    name: 'Bootleg Black Sapphire Show',
    rulesText: 'Sell the top card of your deck.\nIf you control a Gig with an even value and a Gig with an odd value, draw 2.',
    keywords: []
  },
  'CP-025': {
    name: 'Detonate',
    rulesText: 'QUICK Defeat a rival Gear with power 2 or less.',
    keywords: ['Quick']
  },
  'CP-063': {
    name: 'Live With the Aftermath',
    rulesText: 'Each player defeats one of their Units.',
    keywords: []
  },
  'CP-112': {
    name: 'Safety Override',
    rulesText: 'QUICK The next time a friendly Unit loses a fight this turn, defeat the opposing rival Unit.',
    keywords: ['Quick']
  },
  'CP-037': {
    name: 'Fool on the Hill',
    rulesText: 'Search your deck for a Merc Unit, reveal it, and add it to your hand. Shuffle your deck.',
    keywords: []
  },
  'CP-094': {
    name: 'Peace Offering',
    rulesText: 'Draw 2 cards, then place 1 card from your hand on the bottom of your deck.',
    keywords: []
  },
  'CP-074': {
    name: 'Memory Relapse',
    rulesText: 'Add 1 Program from your trash to your hand.',
    keywords: []
  },

  // ==================== UNIDADES ====================
  'CP-001': {
    name: '6th Street Recruits',
    rulesText: 'When a friendly Unit steals a d6, increase a Gig by up to 6.',
    keywords: []
  },
  'CP-054': {
    name: 'Johnny Silverhand // Never Stop Fighting',
    rulesText: 'The first time this Unit wins a fight each turn, ready it.\nThis Unit wins all fights against CORPO Units.',
    keywords: []
  },
  'CP-075': {
    name: 'Meredith Stout // Stone-Cold Corpo',
    rulesText: 'BLOCKER\nThis Unit has +2 power while fighting a Legend.\nWhen a Rival adjusts or swaps 1 or more friendly Gigs, you may add a card from your trash to your hand.',
    keywords: ['Blocker']
  },
  'CP-105': {
    name: 'Rockin\' Rockerboy',
    rulesText: 'Scream your throat raw for something. Anything.',
    keywords: []
  },
  'CP-119': {
    name: 'Secondhand Bombus',
    rulesText: 'BLOCKER (You may spend this Unit to redirect a rival Unit\'s attack to it instead.)\n(Units with power 0 don\'t steal Gigs.)',
    keywords: ['Blocker']
  },
  'CP-121': {
    name: 'Sketchy Ripper',
    rulesText: 'ATTACK Search the top 3 cards of your deck. Reveal a Gear and add it to your hand. Bottom-deck the rest.\n(Units with power 0 don\'t steal Gigs.)',
    keywords: ['Attack']
  },
  'CP-095': {
    name: 'Pepe Najarro // Working Doubles',
    rulesText: 'When this Unit enters the field, you may pay 1 €$ to draw 1.',
    keywords: []
  },

  // ==================== GEARS ====================
  'CP-004': {
    name: 'Adrenaline Converter',
    rulesText: '(Equip to a friendly Unit or face-up Legend.)\nIf a Rival controls at least 2 more Gigs than you, this Unit has ADRENALINE. (This Unit can attack the turn it\'s played.)',
    keywords: ['Adrenaline']
  },
  'CP-068': {
    name: 'Mandibular Upgrade',
    rulesText: '(Equip to a friendly Unit or face-up Legend.)\nBLOCKER (You may spend this Unit to redirect a rival Unit\'s attack to it instead.)',
    keywords: ['Blocker']
  },
  'CP-069': {
    name: 'Mantis Blades',
    rulesText: '(Equip to a friendly Unit or face-up Legend.)\n"One cut, one kill."',
    keywords: []
  },
  'CP-116': {
    name: 'Satori // Sword of Saburo',
    rulesText: '(Equip to a friendly Unit or face-up Legend.)\nWhen this Unit wins a fight against a rival Unit, draw 1.',
    keywords: []
  },
  'CP-151': {
    name: 'Zetatech Faceplate',
    rulesText: '(Equip to a friendly Unit or face-up Legend.)\nWhen this Unit or Legend is spent, adjust a Gig by up to 1. Then, if you control 3 or more Gigs with different values, draw 1.',
    keywords: []
  }
};

/**
 * Retorna el texto de reglas oficial de una carta según su ID, slug o nombre.
 */
export function getCardRulesText(card) {
  if (!card) return '';
  if (card.rulesText) return card.rulesText;
  if (CARD_RULES_TEXT[card.id]) return CARD_RULES_TEXT[card.id].rulesText;

  // Búsqueda por coincidencia de nombre o slug
  const entry = Object.values(CARD_RULES_TEXT).find(
    (item) => item.name && card.name && item.name.toLowerCase().trim() === card.name.toLowerCase().trim()
  );
  return entry ? entry.rulesText : (card.ability || '');
}

/**
 * EJECUTA EL EFECTO DE UN PROGRAMA AL LANZARSE
 * @param {Object} state - Estado completo del juego
 * @param {string} playerKey - 'player' | 'bot'
 * @param {Object} card - Objeto de la carta lanzada
 * @returns {Object} Resultado de la ejecución { executed: boolean, message: string }
 */
export function executeProgramEffect(state, playerKey, card) {
  if (!state || !card) return { executed: false };
  const p = state[playerKey];
  const oppKey = playerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];
  const cardId = card.id || '';
  const cardName = card.name || 'Programa';

  // 1. BOOTLEG BLACK SAPPHIRE SHOW (CP-014)
  // "Sell the top card of your deck. If you control a Gig with an even value and a Gig with an odd value, draw 2."
  if (cardId === 'CP-014' || cardName.includes('Black Sapphire')) {
    // A) Sell the top card of your deck:
    let soldCardName = '';
    if (p.deck && p.deck.length > 0) {
      const topCard = p.deck.shift();
      soldCardName = topCard.name;
      if (!p.eddies) p.eddies = [];
      p.eddies.push({
        ...topCard,
        isSpent: false,
        soldAtTurn: state.turnNumber
      });
      state.actionLog.unshift(
        `💰 [${cardName}] Vende la carta superior "${topCard.name}" a la Zona de Eddies (+1 €$).`
      );
    } else {
      state.actionLog.unshift(`⚠️ [${cardName}] No hay cartas en el mazo para vender.`);
    }

    // B) Check even and odd Gigs:
    const gigs = p.gigs || [];
    const hasEven = gigs.some((g) => typeof g.value === 'number' && g.value % 2 === 0);
    const hasOdd = gigs.some((g) => typeof g.value === 'number' && g.value % 2 !== 0);

    if (hasEven && hasOdd) {
      const drawn = p.deck.splice(0, 2);
      p.hand.push(...drawn);
      state.actionLog.unshift(
        `🃏 [${cardName}] ¡Condición de Gig par e impar cumplida! ${p.name} roba 2 cartas: ${drawn.map((c) => c.name).join(', ')}.`
      );
    } else {
      state.actionLog.unshift(
        `ℹ️ [${cardName}] Requiere un Gig par y un Gig impar en juego para robar 2 cartas. (No se cumplió la condición).`
      );
    }

    return { executed: true, message: `Efecto de "${cardName}" aplicado con éxito.` };
  }

  // 2. DETONATE (CP-025)
  // "QUICK Defeat a rival Gear with power 2 or less."
  if (cardId === 'CP-025' || cardName.toLowerCase() === 'detonate') {
    let defeatedGear = null;
    let fromTarget = '';

    // Buscar en las unidades rivales un Gear con poder <= 2
    for (const unit of opp.field || []) {
      if (unit.gear && unit.gear.length > 0) {
        const idx = unit.gear.findIndex((g) => (g.powerBonus || g.parsedPower || 0) <= 2);
        if (idx !== -1) {
          defeatedGear = unit.gear.splice(idx, 1)[0];
          fromTarget = unit.name;
          const loss = defeatedGear.powerBonus || defeatedGear.parsedPower || 0;
          unit.currentPower = Math.max(0, (unit.currentPower || unit.power) - loss);
          if (!opp.trash) opp.trash = [];
          opp.trash.push(defeatedGear);
          break;
        }
      }
    }

    // Si no encontró en unidades, buscar en leyendas rivales
    if (!defeatedGear) {
      for (const leg of opp.legends || []) {
        if (leg.gear && leg.gear.length > 0) {
          const idx = leg.gear.findIndex((g) => (g.powerBonus || g.parsedPower || 0) <= 2);
          if (idx !== -1) {
            defeatedGear = leg.gear.splice(idx, 1)[0];
            fromTarget = leg.name;
            if (!opp.trash) opp.trash = [];
            opp.trash.push(defeatedGear);
            break;
          }
        }
      }
    }

    if (defeatedGear) {
      state.actionLog.unshift(
        `💥 [Detonate] ${p.name} destruye el Gear rival "${defeatedGear.name}" equipado en "${fromTarget}".`
      );
    } else {
      state.actionLog.unshift(
        `ℹ️ [Detonate] El rival no tiene ningún Gear con 2 de poder o menos equipado para destruir.`
      );
    }

    return { executed: true };
  }

  // 3. LIVE WITH THE AFTERMATH (CP-063)
  // "Each player defeats one of their Units."
  if (cardId === 'CP-063' || cardName.includes('Aftermath')) {
    // Jugador activo destruye una de sus unidades (la de menor poder si no se especifica)
    if (p.field && p.field.length > 0) {
      p.field.sort((a, b) => (a.currentPower || a.power || 0) - (b.currentPower || b.power || 0));
      const deadFriendly = p.field.shift();
      if (!p.trash) p.trash = [];
      p.trash.push(deadFriendly);
      state.actionLog.unshift(
        `💀 [${cardName}] ${p.name} destruye a su propia Unidad "${deadFriendly.name}".`
      );
    } else {
      state.actionLog.unshift(`ℹ️ [${cardName}] ${p.name} no tiene unidades en campo para destruir.`);
    }

    // Rival destruye una de sus unidades
    if (opp.field && opp.field.length > 0) {
      opp.field.sort((a, b) => (a.currentPower || a.power || 0) - (b.currentPower || b.power || 0));
      const deadRival = opp.field.shift();
      if (!opp.trash) opp.trash = [];
      opp.trash.push(deadRival);
      state.actionLog.unshift(
        `💀 [${cardName}] ${opp.name} destruye a su Unidad "${deadRival.name}".`
      );
    } else {
      state.actionLog.unshift(`ℹ️ [${cardName}] ${opp.name} no tiene unidades en campo para destruir.`);
    }

    return { executed: true };
  }

  // 4. SAFETY OVERRIDE (CP-112)
  // "QUICK The next time a friendly Unit loses a fight this turn, defeat the opposing rival Unit."
  if (cardId === 'CP-112' || cardName.includes('Safety Override')) {
    p.safetyOverrideActive = true;
    state.actionLog.unshift(
      `🛡️ [Safety Override] Activado para ${p.name}: La próxima vez que una unidad tuya pierda un combate este turno, destruirá también a la unidad rival que combatió.`
    );
    return { executed: true };
  }

  // 5. PEACE OFFERING (CP-094)
  // "Draw 2 cards, then place 1 card from your hand on the bottom of your deck."
  if (cardId === 'CP-094' || cardName.includes('Peace Offering')) {
    const drawn = p.deck.splice(0, 2);
    p.hand.push(...drawn);
    if (p.hand.length > 0) {
      const bottomCard = p.hand.pop();
      p.deck.push(bottomCard);
      state.actionLog.unshift(
        `🕊️ [Peace Offering] ${p.name} roba 2 cartas y devuelve "${bottomCard.name}" al fondo del mazo.`
      );
    }
    return { executed: true };
  }

  // 6. MEMORY RELAPSE (CP-074)
  // "Add 1 Program from your trash to your hand."
  if (cardId === 'CP-074' || cardName.includes('Memory Relapse')) {
    const progIdx = (p.trash || []).findIndex(
      (c) => c.officialType === 'PROGRAM' || (c.type && c.type.includes('PROGRAM'))
    );
    if (progIdx !== -1) {
      const recovered = p.trash.splice(progIdx, 1)[0];
      p.hand.push(recovered);
      state.actionLog.unshift(
        `🧠 [Memory Relapse] ${p.name} recupera el Programa "${recovered.name}" del Trash a su mano.`
      );
    } else {
      state.actionLog.unshift(`ℹ️ [Memory Relapse] No hay programas en el Trash para recuperar.`);
    }
    return { executed: true };
  }

  return { executed: false };
}

/**
 * EJECUTA TRIGGERS CUANDO UNA UNIDAD DECLARA UN ATAQUE
 * @param {Object} state - Estado del juego
 * @param {string} playerKey - 'player' | 'bot'
 * @param {Object} attackerUnit - Unidad atacante
 */
export function executeUnitAttackTrigger(state, playerKey, attackerUnit) {
  if (!state || !attackerUnit) return;
  const p = state[playerKey];
  const cardId = attackerUnit.id || '';

  // SKETCHY RIPPER (CP-121)
  // "ATTACK Search the top 3 cards of your deck. Reveal a Gear and add it to your hand. Bottom-deck the rest."
  if (cardId === 'CP-121' || attackerUnit.name.includes('Sketchy Ripper')) {
    if (p.deck && p.deck.length > 0) {
      const examined = p.deck.splice(0, Math.min(3, p.deck.length));
      const gearIdx = examined.findIndex(
        (c) => c.officialType === 'GEAR' || (c.type && c.type.includes('GEAR'))
      );

      if (gearIdx !== -1) {
        const foundGear = examined.splice(gearIdx, 1)[0];
        p.hand.push(foundGear);
        p.deck.push(...examined); // El resto al fondo del mazo
        state.actionLog.unshift(
          `🔧 [Sketchy Ripper] ¡Encontró "${foundGear.name}"! Añadido a la mano. El resto va al fondo del mazo.`
        );
      } else {
        p.deck.push(...examined);
        state.actionLog.unshift(
          `🔍 [Sketchy Ripper] Revisó las 3 cartas superiores del mazo pero no había ningún Gear.`
        );
      }
    }
  }
}

/**
 * EJECUTA TRIGGERS CUANDO UNA UNIDAD GANA UN COMBATE CONTRA OTRA UNIDAD
 * @param {Object} state - Estado del juego
 * @param {string} winnerPlayerKey - 'player' | 'bot'
 * @param {Object} winningUnit - Unidad victoriosa
 * @param {Object} defeatedUnit - Unidad derrotada
 */
export function executeCombatWinTrigger(state, winnerPlayerKey, winningUnit, defeatedUnit) {
  if (!state || !winningUnit) return;
  const p = state[winnerPlayerKey];
  const cardId = winningUnit.id || '';

  // 1. JOHNNY SILVERHAND // NEVER STOP FIGHTING (CP-054)
  // "The first time this Unit wins a fight each turn, ready it."
  if (cardId === 'CP-054' || winningUnit.name.includes('Never Stop Fighting')) {
    if (!winningUnit.hasReadiedThisTurn) {
      winningUnit.isSpent = false;
      winningUnit.hasReadiedThisTurn = true;
      state.actionLog.unshift(
        `🎸 [Johnny Silverhand] "Never Stop Fighting": ¡Gana el combate y se ENDEREZA listo para volver a actuar!`
      );
    }
  }

  // 2. SATORI // SWORD OF SABURO (CP-116)
  // "When this Unit wins a fight against a rival Unit, draw 1."
  const hasSatori = (winningUnit.gear || []).some(
    (g) => g.id === 'CP-116' || g.name.includes('Satori')
  );
  if (hasSatori) {
    if (p.deck && p.deck.length > 0) {
      const drawn = p.deck.shift();
      p.hand.push(drawn);
      state.actionLog.unshift(
        `⚔️ [Satori // Sword of Saburo] ¡Corte letal! ${p.name} roba 1 carta ("${drawn.name}").`
      );
    }
  }
}

/**
 * EJECUTA EFECTO DE DERROTA CUANDO UNA UNIDAD AMIGA ES DERROTADA (ej: Safety Override)
 * @param {Object} state - Estado del juego
 * @param {string} losingPlayerKey - 'player' | 'bot'
 * @param {Object} losingUnit - Unidad derrotada
 * @param {Object} winningRivalUnit - Unidad rival que ganó
 */
export function executeCombatLossTrigger(state, losingPlayerKey, losingUnit, winningRivalUnit) {
  if (!state) return;
  const p = state[losingPlayerKey];
  const oppKey = losingPlayerKey === 'player' ? 'bot' : 'player';
  const opp = state[oppKey];

  // SAFETY OVERRIDE (CP-112)
  if (p.safetyOverrideActive && winningRivalUnit) {
    p.safetyOverrideActive = false; // Se consume
    const unitIdx = (opp.field || []).findIndex(
      (u) => u.instanceId === winningRivalUnit.instanceId
    );
    if (unitIdx !== -1) {
      const destroyed = opp.field.splice(unitIdx, 1)[0];
      if (!opp.trash) opp.trash = [];
      opp.trash.push(destroyed);
      state.actionLog.unshift(
        `💥 [Safety Override] ¡Venganza automática! Destruye a la unidad rival victoriosa "${destroyed.name}".`
      );
    }
  }
}
