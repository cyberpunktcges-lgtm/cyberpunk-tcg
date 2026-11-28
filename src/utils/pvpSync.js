/**
 * pvpSync.js
 * Capa pura de sincronización y proyección de asiento (Perspective Projection)
 * para el Multijugador Online PvP de Cyberpunk TCG sobre Firebase Firestore.
 *
 * En Firestore el estado maestro (`canonicalState`) siempre usa claves fijas `'p1'` y `'p2'`.
 * Al proyectar hacia un cliente:
 *  - Asiento `'p1'`       -> player = p1, bot = p2
 *  - Asiento `'p2'`       -> player = p2, bot = p1
 *  - Asiento `'spectator'` -> player = p1, bot = p2 (modo solo lectura; ambas manos se ocultan en UI)
 */

import {
  createInitialGameState,
  shuffleDeck,
  executeStartPhase
} from './cyberpunkEngine.js';

export function otherSeat(seat) {
  return seat === 'p1' ? 'p2' : 'p1';
}

export function seatToLocalKey(seatKey, mySeat) {
  if (seatKey !== 'p1' && seatKey !== 'p2') return seatKey;
  if (mySeat === 'p2') {
    return seatKey === 'p2' ? 'player' : 'bot';
  }
  // Tanto 'p1' como 'spectator' ven p1 abajo ('player') y p2 arriba ('bot')
  return seatKey === 'p1' ? 'player' : 'bot';
}

export function localKeyToSeat(localKey, mySeat) {
  if (localKey !== 'player' && localKey !== 'bot') return localKey;
  if (mySeat === 'p2') {
    return localKey === 'player' ? 'p2' : 'p1';
  }
  return localKey === 'player' ? 'p1' : 'p2';
}

function flipAnchorToken(token) {
  if (typeof token !== 'string') return token;
  if (token.startsWith('player-')) return 'bot-' + token.slice('player-'.length);
  if (token.startsWith('bot-')) return 'player-' + token.slice('bot-'.length);
  return token;
}

function flipAnchorField(anchor) {
  if (Array.isArray(anchor)) return anchor.map(flipAnchorToken);
  return flipAnchorToken(anchor);
}

/**
 * Elimina recursivamente cualquier propiedad `undefined` (Firestore rechaza `undefined`)
 * y garantiza que el objeto sea 100 % serializable en JSON/Firestore.
 */
export function stripUndefinedDeep(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined || typeof v === 'function') continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out;
}

function cloneJson(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

function mapSideInternalKeys(side, mapKeyFn) {
  if (!side || typeof side !== 'object') return side;
  if (Array.isArray(side.gigs)) {
    side.gigs.forEach((g) => {
      if (g && g.stolenFrom) g.stolenFrom = mapKeyFn(g.stolenFrom);
    });
  }
  if (Array.isArray(side.field)) {
    side.field.forEach((u) => {
      if (!u) return;
      if (u.frozenByPlayerKey) u.frozenByPlayerKey = mapKeyFn(u.frozenByPlayerKey);
      if (u.cannotReadyByPlayerKey) u.cannotReadyByPlayerKey = mapKeyFn(u.cannotReadyByPlayerKey);
    });
  }
  return side;
}

function mapTargetSelectionKeys(sel, mapKeyFn) {
  if (!sel || typeof sel !== 'object') return sel;
  if (sel.playerKey) sel.playerKey = mapKeyFn(sel.playerKey);
  if (sel.owner) sel.owner = mapKeyFn(sel.owner);
  if (sel.selectedTargetGig?.owner) sel.selectedTargetGig.owner = mapKeyFn(sel.selectedTargetGig.owner);
  if (sel.selectedFriendlyGig?.owner) sel.selectedFriendlyGig.owner = mapKeyFn(sel.selectedFriendlyGig.owner);
  if (sel.onlyGig?.owner) sel.onlyGig.owner = mapKeyFn(sel.onlyGig.owner);
  return sel;
}

function mapCardChoiceKeys(choice, mapKeyFn) {
  if (!choice || typeof choice !== 'object') return choice;
  if (choice.playerKey) choice.playerKey = mapKeyFn(choice.playerKey);
  return choice;
}

function mapModalChoiceKeys(choice, mapKeyFn) {
  if (!choice || typeof choice !== 'object') return choice;
  if (choice.playerKey) choice.playerKey = mapKeyFn(choice.playerKey);
  return choice;
}

function mapPendingFields(state, mapKeyFn, shouldFlipAnchors = false) {
  if (state.activePlayer) state.activePlayer = mapKeyFn(state.activePlayer);
  if (state.winner) state.winner = mapKeyFn(state.winner);

  if (state.pendingReaction && typeof state.pendingReaction === 'object') {
    if (state.pendingReaction.attackerPlayerKey) {
      state.pendingReaction.attackerPlayerKey = mapKeyFn(state.pendingReaction.attackerPlayerKey);
    }
  }

  if (state.pendingCardChoice) {
    mapCardChoiceKeys(state.pendingCardChoice, mapKeyFn);
  }
  if (Array.isArray(state.pendingCardChoiceQueue)) {
    state.pendingCardChoiceQueue.forEach((c) => mapCardChoiceKeys(c, mapKeyFn));
  }

  if (state.pendingModalChoice) {
    mapModalChoiceKeys(state.pendingModalChoice, mapKeyFn);
  }

  if (state.pendingTargetSelection) {
    mapTargetSelectionKeys(state.pendingTargetSelection, mapKeyFn);
  }
  if (Array.isArray(state.pendingTargetSelectionQueue)) {
    state.pendingTargetSelectionQueue.forEach((s) => mapTargetSelectionKeys(s, mapKeyFn));
  }

  if (state.pendingAttackContinuation && typeof state.pendingAttackContinuation === 'object') {
    if (state.pendingAttackContinuation.attackerPlayerKey) {
      state.pendingAttackContinuation.attackerPlayerKey = mapKeyFn(
        state.pendingAttackContinuation.attackerPlayerKey
      );
    }
  }

  if (state.pendingGigTheftState && typeof state.pendingGigTheftState === 'object') {
    if (state.pendingGigTheftState.playerKey) {
      state.pendingGigTheftState.playerKey = mapKeyFn(state.pendingGigTheftState.playerKey);
    }
  }

  if (state.lastLegendTriggerBatch && Array.isArray(state.lastLegendTriggerBatch.items)) {
    state.lastLegendTriggerBatch.items.forEach((it) => {
      if (it && it.playerKey) it.playerKey = mapKeyFn(it.playerKey);
    });
  }

  if (shouldFlipAnchors && state.lastPvpActionArrows && Array.isArray(state.lastPvpActionArrows.arrows)) {
    state.lastPvpActionArrows.arrows = state.lastPvpActionArrows.arrows.map((a) => ({
      ...a,
      fromAnchor: flipAnchorField(a.fromAnchor),
      toAnchor: flipAnchorField(a.toAnchor)
    }));
  }
}

/**
 * Proyecta un `canonicalState` (claves `'p1'`/`'p2'`) a un estado local del simulador (`'player'`/`'bot'`).
 */
export function projectStateForSeat(canonicalState, mySeat = 'p1') {
  if (!canonicalState) return null;
  const s = cloneJson(canonicalState);
  const mapFn = (k) => seatToLocalKey(k, mySeat);

  const p1Side = mapSideInternalKeys(s.p1, mapFn);
  const p2Side = mapSideInternalKeys(s.p2, mapFn);

  if (mySeat === 'p2') {
    s.player = p2Side;
    s.bot = p1Side;
  } else {
    s.player = p1Side;
    s.bot = p2Side;
  }
  if (s.player) s.player.id = 'player';
  if (s.bot) s.bot.id = 'bot';
  delete s.p1;
  delete s.p2;

  const arrowsByOtherSeat =
    s.lastPvpActionArrows && s.lastPvpActionArrows.bySeat && s.lastPvpActionArrows.bySeat !== mySeat;
  mapPendingFields(s, mapFn, Boolean(arrowsByOtherSeat && mySeat !== 'spectator'));

  s.isPvp = true;
  s.pvpSeat = mySeat;
  s.isSpectator = mySeat === 'spectator';

  return s;
}

/**
 * Convierte un estado local (`'player'`/`'bot'`) del asiento `mySeat` (`'p1'` o `'p2'`)
 * de vuelta al formato canónico (`'p1'`/`'p2'`) listo para guardar en Firestore.
 */
export function unprojectStateFromSeat(localState, mySeat = 'p1') {
  if (!localState) return null;
  if (mySeat !== 'p1' && mySeat !== 'p2') {
    throw new Error(`Asiento inválido para escribir en PvP: ${mySeat}`);
  }
  const s = cloneJson(localState);
  const mapFn = (k) => localKeyToSeat(k, mySeat);

  // Asegurar que todo modal/elección pendiente tenga playerKey explícito antes de mapear a canónico
  if (s.pendingCardChoice && !s.pendingCardChoice.playerKey) {
    s.pendingCardChoice.playerKey = 'player';
  }
  if (Array.isArray(s.pendingCardChoiceQueue)) {
    s.pendingCardChoiceQueue.forEach((c) => {
      if (c && !c.playerKey) c.playerKey = 'player';
    });
  }
  if (s.pendingModalChoice && !s.pendingModalChoice.playerKey) {
    s.pendingModalChoice.playerKey = 'player';
  }
  if (s.pendingTargetSelection && !s.pendingTargetSelection.playerKey) {
    s.pendingTargetSelection.playerKey = 'player';
  }
  if (Array.isArray(s.pendingTargetSelectionQueue)) {
    s.pendingTargetSelectionQueue.forEach((t) => {
      if (t && !t.playerKey) t.playerKey = 'player';
    });
  }
  if (s.pendingAttackContinuation && !s.pendingAttackContinuation.attackerPlayerKey) {
    s.pendingAttackContinuation.attackerPlayerKey = 'player';
  }
  if (s.pendingGigTheftState && !s.pendingGigTheftState.playerKey) {
    s.pendingGigTheftState.playerKey = 'player';
  }

  const playerSide = mapSideInternalKeys(s.player, mapFn);
  const botSide = mapSideInternalKeys(s.bot, mapFn);

  if (mySeat === 'p2') {
    s.p2 = playerSide;
    s.p1 = botSide;
  } else {
    s.p1 = playerSide;
    s.p2 = botSide;
  }
  if (s.p1) s.p1.id = 'p1';
  if (s.p2) s.p2.id = 'p2';
  delete s.player;
  delete s.bot;

  mapPendingFields(s, mapFn, false);

  // Recortar actionLog para mantener ligero el documento Firestore
  if (Array.isArray(s.actionLog) && s.actionLog.length > 140) {
    s.actionLog = s.actionLog.slice(0, 140);
  }

  // Limpiar propiedades puramente de UI local
  delete s.pvpSeat;
  delete s.isSpectator;
  delete s.lastTriggerNotification;
  delete s.lastBotLiveAction;
  delete s.lastBotActionArrows;
  s.isPvp = true;

  return stripUndefinedDeep(s);
}

/**
 * Determina qué asiento (`'p1'` o `'p2'`) tiene autoridad actual para interactuar y escribir en la sala.
 */
export function computeTurnAuthority(canonicalState) {
  if (!canonicalState || canonicalState.isGameOver) return null;

  if (canonicalState.pendingModalChoice?.playerKey) {
    return canonicalState.pendingModalChoice.playerKey;
  }
  if (canonicalState.pendingCardChoice?.playerKey) {
    return canonicalState.pendingCardChoice.playerKey;
  }
  if (canonicalState.pendingTargetSelection?.playerKey) {
    return canonicalState.pendingTargetSelection.playerKey;
  }
  if (canonicalState.pendingGigTheftState?.playerKey) {
    return canonicalState.pendingGigTheftState.playerKey;
  }
  if (canonicalState.pendingReaction?.attackerPlayerKey) {
    return otherSeat(canonicalState.pendingReaction.attackerPlayerKey);
  }
  return canonicalState.activePlayer || 'p1';
}

/**
 * Comprueba si el modal/elección local le corresponde al jugador sentado localmente (`'player'`).
 * Un espectador nunca es dueño de ningún modal.
 */
export function isLocalSeatPromptOwner(promptObj, localState) {
  if (!promptObj) return false;
  if (localState?.isSpectator) return false;
  if (!localState?.isPvp) return true;
  const owner = promptObj.playerKey || 'player';
  return owner === 'player';
}

/**
 * Crea el `canonicalState` inicial de una partida PvP a partir de los mazos y datos de `p1` y `p2`,
 * una vez resuelto el Duelo D20 y elegido quién sale primero (`starterSeat`: `'p1'` | `'p2'`).
 */
export function createCanonicalPvpInitialState({
  roomCode,
  p1,
  p2,
  allCards = [],
  starterSeat = 'p1',
  d20 = null
}) {
  const starterLocal = starterSeat === 'p2' ? 'bot' : 'player';
  const raw = createInitialGameState(p1.deckSnapshot, p2.deckSnapshot, allCards, {
    startingPlayer: starterLocal
  });

  raw.matchId = `pvp_${roomCode}_${Date.now()}`;
  raw.isPvp = true;
  raw.roomCode = roomCode;
  raw.mulliganDecided = false;
  raw.pendingFirstPlayerSelection = null;

  raw.player.name = p1.name || 'Netrunner 1';
  raw.bot.name = p2.name || 'Netrunner 2';

  const starterName = starterSeat === 'p1' ? raw.player.name : raw.bot.name;
  const rollLine = d20
    ? `🎲 Tirada D20: ${raw.player.name} [${d20.p1Roll}] vs ${raw.bot.name} [${d20.p2Roll}].`
    : '';

  raw.actionLog = [
    '// DUELO ONLINE NETWATCH // PVP ACTIVADO',
    '// REGLAMENTO OFICIAL NIGHT CITY (SET 01)',
    ...(rollLine ? [rollLine] : []),
    `⚔️ Inicia la partida: ${starterName} (sus 2 Leyendas izquierdas comienzan giradas en Turno 1).`,
    'Ambos jugadores tienen 6 dados en el Fixer (D4–D20) y 6 cartas en mano.',
    'Decidid si conservar vuestra mano o realizar vuestro único Mulligan.'
  ];

  return unprojectStateFromSeat(raw, 'p1');
}

/**
 * Aplica la decisión de Mulligan (`'KEEP'` o `'MULLIGAN'`) para `seat` (`'p1'` | `'p2'`)
 * sobre un `canonicalState`, sin revelar las cartas robadas en el log público.
 */
export function applyPvpMulliganToCanonical(canonicalState, seat, decision) {
  const s = cloneJson(canonicalState);
  const side = s[seat];
  if (!side) return s;

  if (decision === 'MULLIGAN') {
    side.deck = shuffleDeck([...(side.deck || []), ...(side.hand || [])]);
    side.hand = side.deck.splice(0, 6);
    (s.actionLog = s.actionLog || []).unshift(
      `🔄 ${side.name} realiza MULLIGAN: baraja su mano y roba 6 cartas nuevas.`
    );
  } else {
    (s.actionLog = s.actionLog || []).unshift(
      `✅ ${side.name} decide MANTENER (Keep) su mano inicial de 6 cartas.`
    );
  }
  return stripUndefinedDeep(s);
}

/**
 * Finaliza la fase de Mulligan cuando ambos jugadores ya han elegido y arranca la Start Phase
 * del jugador inicial (`activePlayer`), devolviendo el `canonicalState` listo para `'PLAYING'`.
 */
export function finalizePvpMulliganAndStartTurn1(canonicalState) {
  const starterSeat = canonicalState.activePlayer || 'p1';
  const localForStarter = projectStateForSeat(canonicalState, starterSeat);
  localForStarter.mulliganDecided = true;
  localForStarter.phase = 'MAIN';
  executeStartPhase(localForStarter, 'player');
  return unprojectStateFromSeat(localForStarter, starterSeat);
}
