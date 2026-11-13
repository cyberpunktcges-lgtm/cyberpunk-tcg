/**
 * cyberpunkEngine.js
 * Motor de reglas oficial para Cyberpunk TCG (Set 01 - Welcome to Night City)
 * Basado en Figure 4 y Comprehensive Rules (WeirdCo / CD Projekt Red)
 */

// Dados poliédricos de Gigs y sus valores máximos
export const DICE_CONFIG = {
  d4: { name: 'D4', max: 4, sides: 4 },
  d6: { name: 'D6', max: 6, sides: 6 },
  d8: { name: 'D8', max: 8, sides: 8 },
  d10: { name: 'D10', max: 10, sides: 10 },
  d12: { name: 'D12', max: 12, sides: 12 },
  d20: { name: 'D20', max: 20, sides: 20 }
};

// Orden oficial de extracción de dados desde el Fixer (D4 primero, D20 el último)
export const FIXER_DICE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/**
 * Lanza un dado poliédrico
 */
export function rollDie(dieType) {
  const config = DICE_CONFIG[dieType] || DICE_CONFIG.d6;
  return Math.floor(Math.random() * config.max) + 1;
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
 * Inicializa un nuevo estado de partida para Jugador vs Bot
 */
export function createInitialGameState(playerDeckInput, botDeckInput, allCards = []) {
  // 1. Preparar mazo y leyendas del jugador
  const playerLegends = (playerDeckInput.legends || []).slice(0, 3).map((l, idx) => ({
    ...l,
    instanceId: `p-leg-${idx}-${Date.now()}`,
    isFaceUp: false,
    isSpent: false
  }));

  // Expandir mazo del jugador por qty
  const rawPlayerCards = [];
  (playerDeckInput.deckList || playerDeckInput.cards || []).forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawPlayerCards.push({
        ...c,
        instanceId: `p-c-${rawPlayerCards.length}-${Date.now()}`,
        parsedCost: parseCardCost(c.cost),
        parsedPower: parseCardPower(c.power)
      });
    }
  });
  const shuffledPlayerDeck = shuffleDeck(rawPlayerCards);

  // 2. Preparar mazo y leyendas del Bot
  const botLegends = (botDeckInput.legends || []).slice(0, 3).map((l, idx) => ({
    ...l,
    instanceId: `b-leg-${idx}-${Date.now()}`,
    isFaceUp: false,
    isSpent: false
  }));

  const rawBotCards = [];
  (botDeckInput.deckList || botDeckInput.cards || []).forEach((c) => {
    const qty = c.qty || 1;
    for (let i = 0; i < qty; i++) {
      rawBotCards.push({
        ...c,
        instanceId: `b-c-${rawBotCards.length}-${Date.now()}`,
        parsedCost: parseCardCost(c.cost),
        parsedPower: parseCardPower(c.power)
      });
    }
  });
  const shuffledBotDeck = shuffleDeck(rawBotCards);

  // Mano inicial (5 cartas)
  const playerHand = shuffledPlayerDeck.splice(0, 5);
  const botHand = shuffledBotDeck.splice(0, 5);

  const initialLog = [
    '// SISTEMA DE COMBATE NETWATCH INICIALIZADO',
    '// FASE ALPHA 1.0 - REGLAMENTO OFICIAL NIGHT CITY',
    'Partida iniciada: Jugador vs AI Netrunner.',
    'Ambos jugadores colocan sus 6 dados de Gig en el Fixer (D4 a D20).',
    'Robas 5 cartas iniciales.'
  ];

  const state = {
    turnNumber: 1,
    activePlayer: 'player', // 'player' | 'bot'
    phase: 'MAIN', // 'START' | 'MAIN' | 'END'
    isGameOver: false,
    winner: null,
    overtime: false,
    combatEvent: null, // Si hay un ataque en curso
    actionLog: initialLog,

    player: {
      id: 'player',
      name: 'Netrunner (Tú)',
      deck: shuffledPlayerDeck,
      hand: playerHand,
      field: [], // Unidades en juego
      trash: [], // Cementerio
      legends: playerLegends, // 3 slots de leyendas
      eddies: [], // Cartas boca abajo que dan 1 €$ cada una
      fixerDice: ['d6', 'd8', 'd10', 'd12', 'd20'], // d4 ya se saca en turno 1
      gigs: [
        {
          die: 'd4',
          value: rollDie('d4'),
          stolenFrom: null,
          id: `p-gig-0`
        }
      ],
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
      eddies: [],
      fixerDice: ['d6', 'd8', 'd10', 'd12', 'd20'],
      gigs: [
        {
          die: 'd4',
          value: rollDie('d4'),
          stolenFrom: null,
          id: `b-gig-0`
        }
      ],
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
 * Calcula los Eddies disponibles para gastar (Eddies no girados + Leyendas no giradas)
 */
export function getAvailableEddies(playerState) {
  const readyEddies = playerState.eddies.filter((e) => !e.isSpent).length;
  const readyLegends = playerState.legends.filter((l) => !l.isSpent).length;
  return readyEddies + readyLegends;
}

/**
 * Gasta N Eddies del jugador priorizando cartas de Eddies y luego Leyendas
 */
export function spendEddies(playerState, amount) {
  let needed = amount;

  // 1. Gastar cartas de la zona de Eddies
  for (const eddie of playerState.eddies) {
    if (needed <= 0) break;
    if (!eddie.isSpent) {
      eddie.isSpent = true;
      needed--;
    }
  }

  // 2. Si aún falta, gastar Leyendas
  for (const leg of playerState.legends) {
    if (needed <= 0) break;
    if (!leg.isSpent) {
      leg.isSpent = true;
      needed--;
    }
  }

  return needed === 0;
}

/**
 * Comprueba las condiciones de victoria:
 * 1. Controlar 7 o más dados de Gig al inicio del turno (o en cualquier momento en Overtime).
 * 2. Quedarse sin cartas en el mazo cuando es obligatorio robar (Deck out).
 */
export function checkWinCondition(state, targetPlayerKey) {
  const p = state[targetPlayerKey];
  const rivalKey = targetPlayerKey === 'player' ? 'bot' : 'player';
  const rival = state[rivalKey];

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
 * Vende una carta de la mano a la zona de Eddies boca abajo (1 vez por turno)
 */
export function sellCardForEddies(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  if (p.hasSoldThisTurn) return { success: false, reason: 'Ya has vendido una carta este turno.' };

  const cardIdx = p.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Carta no encontrada en mano.' };

  const [card] = p.hand.splice(cardIdx, 1);
  p.eddies.push({
    ...card,
    isSpent: false, // Entra lista para usarse este turno
    soldAtTurn: state.turnNumber
  });
  p.hasSoldThisTurn = true;

  state.actionLog.unshift(
    `${p.name} vende "${card.name}" a su zona de Eddies (+1 €$).`
  );

  return { success: true };
}

/**
 * Juega una carta de Unidad desde la mano al campo
 */
export function playUnitCard(state, playerKey, cardInstanceId) {
  const p = state[playerKey];
  const cardIdx = p.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIdx === -1) return { success: false, reason: 'Carta no encontrada en mano.' };

  const card = p.hand[cardIdx];
  const cost = card.parsedCost || parseCardCost(card.cost);
  const available = getAvailableEddies(p);

  if (available < cost) {
    return {
      success: false,
      reason: `Eddies insuficientes. Requiere ${cost} €$ y tienes ${available} €$ disponibles.`
    };
  }

  // Pagar coste
  spendEddies(p, cost);
  p.hand.splice(cardIdx, 1);

  // La unidad entra con LAG (no puede atacar el turno que entra)
  const unitInstance = {
    ...card,
    isSpent: false,
    isLagging: true, // Regla oficial de Lag
    turnEntered: state.turnNumber,
    currentPower: card.parsedPower || parseCardPower(card.power),
    gear: []
  };

  p.field.push(unitInstance);

  state.actionLog.unshift(
    `${p.name} paga ${cost} €$ y despliega a "${card.name}" [Fuerza: ${unitInstance.currentPower}] en el Campo.`
  );

  return { success: true, unit: unitInstance };
}

/**
 * Llama a una Leyenda boca arriba en la zona de Leyendas
 */
export function callLegendFaceUp(state, playerKey, legendInstanceId) {
  const p = state[playerKey];
  if (p.hasCalledLegendThisTurn) {
    return { success: false, reason: 'Solo puedes llamar a 1 Leyenda boca arriba por turno.' };
  }

  const leg = p.legends.find((l) => l.instanceId === legendInstanceId);
  if (!leg) return { success: false, reason: 'Leyenda no encontrada.' };
  if (leg.isFaceUp) return { success: false, reason: 'Esta Leyenda ya está boca arriba.' };

  leg.isFaceUp = true;
  p.hasCalledLegendThisTurn = true;

  state.actionLog.unshift(
    `👑 ${p.name} llama a su Leyenda "${leg.name}" boca arriba.`
  );

  return { success: true };
}

/**
 * Declara un ataque de una unidad contra los Gigs del rival (para robar un Gig)
 */
export function attackRivalGigs(state, attackerPlayerKey, attackerUnitId) {
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];

  const unit = attacker.field.find((u) => u.instanceId === attackerUnitId);
  if (!unit) return { success: false, reason: 'Unidad atacante no encontrada.' };
  if (unit.isSpent) return { success: false, reason: 'La unidad ya está girada (Spent).' };
  if (unit.isLagging) return { success: false, reason: 'La unidad tiene Lag (entró este turno y no puede atacar aún).' };
  if (defender.gigs.length === 0) return { success: false, reason: 'El rival no tiene Gigs para robar.' };

  // Girar atacante
  unit.isSpent = true;

  // Robar 1 dado de Gig al rival
  const stolenDie = defender.gigs.pop();
  stolenDie.stolenFrom = defenderKey;
  attacker.gigs.push(stolenDie);

  state.actionLog.unshift(
    `⚔️ ¡ATAQUE EXITOSO! "${unit.name}" asalta los Gigs de ${defender.name} y ROBA su dado ${stolenDie.die.toUpperCase()} (Valor: ${stolenDie.value}).`
  );

  // Comprobar si con este robo el atacante gana en Overtime
  if (state.overtime && attacker.gigs.length >= 7) {
    state.isGameOver = true;
    state.winner = attackerPlayerKey;
    state.actionLog.unshift(`🏆 ¡OVERTIME WIN! ${attacker.name} alcanza 7 Gigs y gana la partida.`);
  }

  return { success: true, stolenDie };
}

/**
 * Pelea directa de una unidad contra una unidad enemiga girada (Spent)
 */
export function fightRivalUnit(state, attackerPlayerKey, attackerUnitId, targetUnitId) {
  const attacker = state[attackerPlayerKey];
  const defenderKey = attackerPlayerKey === 'player' ? 'bot' : 'player';
  const defender = state[defenderKey];

  const attUnit = attacker.field.find((u) => u.instanceId === attackerUnitId);
  const defUnit = defender.field.find((u) => u.instanceId === targetUnitId);

  if (!attUnit || !defUnit) return { success: false, reason: 'Unidades no encontradas.' };
  if (attUnit.isSpent) return { success: false, reason: 'Tu unidad está girada.' };
  if (attUnit.isLagging) return { success: false, reason: 'Tu unidad tiene Lag.' };
  if (!defUnit.isSpent) {
    return { success: false, reason: 'Solo puedes atacar a unidades rivales giradas (Spent).' };
  }

  attUnit.isSpent = true;

  const attPower = attUnit.currentPower;
  const defPower = defUnit.currentPower;

  state.actionLog.unshift(
    `🥊 COMBATE: "${attUnit.name}" [Fuerza: ${attPower}] lucha contra "${defUnit.name}" [Fuerza: ${defPower}].`
  );

  // Resolución por comparación de Poder
  if (attPower >= defPower) {
    // Defensor derrotado
    const idx = defender.field.findIndex((u) => u.instanceId === targetUnitId);
    if (idx !== -1) {
      const [defeated] = defender.field.splice(idx, 1);
      defender.trash.push(defeated);
      state.actionLog.unshift(
        `💀 "${defUnit.name}" de ${defender.name} es DERROTADA y enviada a la Basura (Trash).`
      );
    }
  } else {
    // Si el defensor tenía mayor poder, el atacante es repelido/derrotado
    const idx = attacker.field.findIndex((u) => u.instanceId === attackerUnitId);
    if (idx !== -1) {
      const [defeated] = attacker.field.splice(idx, 1);
      attacker.trash.push(defeated);
      state.actionLog.unshift(
        `💥 ¡CONTRAATAQUE! "${attUnit.name}" fue superada en fuerza y enviada a la Basura.`
      );
    }
  }

  return { success: true };
}

/**
 * Finaliza el turno actual y pasa el control al siguiente jugador
 */
export function passTurn(state) {
  if (state.isGameOver) return state;

  const nextPlayerKey = state.activePlayer === 'player' ? 'bot' : 'player';
  const nextPlayer = state[nextPlayerKey];

  state.activePlayer = nextPlayerKey;
  state.turnNumber += 1;

  state.actionLog.unshift(
    `// ==========================================`,
    `// INICIO DE TURNO ${state.turnNumber} // ${nextPlayer.name.toUpperCase()}`,
    `// ==========================================`
  );

  // 1. COMPROBAR CONDICIÓN DE VICTORIA AL INICIO DEL TURNO (7+ Gigs)
  if (checkWinCondition(state, nextPlayerKey)) {
    return state;
  }

  // 2. FASE DE PREPARACIÓN (READY STEP): Enderezar cartas y recursos
  nextPlayer.eddies.forEach((e) => (e.isSpent = false));
  nextPlayer.legends.forEach((l) => (l.isSpent = false));
  nextPlayer.field.forEach((u) => {
    u.isSpent = false;
    u.isLagging = false; // Quitar Lag de unidades presentes
  });
  nextPlayer.hasSoldThisTurn = false;
  nextPlayer.hasCalledLegendThisTurn = false;

  // 3. FASE DE FIXER: Extraer y tirar 1 dado de Gig si quedan en el Fixer
  if (nextPlayer.fixerDice.length > 0) {
    const nextDieType = nextPlayer.fixerDice.shift();
    const rollValue = rollDie(nextDieType);
    nextPlayer.gigs.push({
      die: nextDieType,
      value: rollValue,
      stolenFrom: null,
      id: `${nextPlayerKey}-gig-${nextPlayer.gigs.length}`
    });

    state.actionLog.unshift(
      `🎲 ${nextPlayer.name} saca su dado ${nextDieType.toUpperCase()} del Fixer y saca un ${rollValue} (Credibilidad: ⭐ ${calculateStreetCred(nextPlayer.gigs)}).`
    );
  } else {
    // Si ambos han vaciado el Fixer, empieza el OVERTIME
    const otherKey = nextPlayerKey === 'player' ? 'bot' : 'player';
    if (state[otherKey].fixerDice.length === 0 && !state.overtime) {
      state.overtime = true;
      state.actionLog.unshift(
        `⚡ ¡OVERTIME / MUERTE SÚBITA ACTIVADA! El primer jugador que alcance 7 Gigs gana inmediatamente.`
      );
    }
  }

  // 4. ROBO DE CARTA (DRAW STEP)
  if (nextPlayer.deck.length > 0) {
    const drawn = nextPlayer.deck.shift();
    nextPlayer.hand.push(drawn);
    state.actionLog.unshift(
      `📥 ${nextPlayer.name} roba 1 carta (Mazo: ${nextPlayer.deck.length} restantes).`
    );
  } else {
    // Deck out loss
    state.isGameOver = true;
    state.winner = nextPlayerKey === 'player' ? 'bot' : 'player';
    state.actionLog.unshift(
      `💀 DECK OUT: ${nextPlayer.name} no puede robar cartas de su mazo y pierde la partida.`
    );
    return state;
  }

  return state;
}
