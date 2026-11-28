/**
 * pvpService.js
 * Capa Firebase Firestore para el Multijugador Online PvP de Cyberpunk TCG:
 * - Lobby de salas en vivo (públicas o con contraseña SHA-256)
 * - Presencia de Netrunners online y retos directos
 * - Modo Espectador (solo lectura con subcolección ligera de espectadores)
 * - Chat en tiempo real (pvp_rooms/{roomCode}/messages)
 * - Sincronización transaccional con versión optimista y turnAuthority
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  runTransaction,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { rollSecureD20 } from './cyberpunkEngine.js';
import {
  otherSeat,
  unprojectStateFromSeat,
  computeTurnAuthority,
  createCanonicalPvpInitialState,
  applyPvpMulliganToCanonical,
  finalizePvpMulliganAndStartTurn1,
  stripUndefinedDeep
} from './pvpSync.js';

const ROOMS_COL = 'pvp_rooms';
const PRESENCE_COL = 'pvp_presence';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function generateRoomCode(length = 6) {
  let out = '';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  }
  return out;
}

export async function hashRoomPassword(password) {
  const clean = String(password || '').trim();
  if (!clean) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const data = new TextEncoder().encode(`cptcg_pvp_v1:${clean}`);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Respaldo determinista si subtle no está disponible
  }
  let h = 2166136261;
  const s = `cptcg_pvp_v1:${clean}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

/**
 * Compacta un mazo para guardarlo ligero dentro de la sala Firestore (manteniendo id, name, qty, officialType).
 */
export function buildCompactDeckSnapshot(deckObj) {
  if (!deckObj) return { legends: [], cards: [] };
  const rawList = deckObj.deckList || deckObj.cards || [];
  const isLeg = (c) =>
    String(c?.officialType || '').toUpperCase() === 'LEGEND' ||
    String(c?.cardType || c?.type || '').toUpperCase().includes('LEGEND');

  const rawLegends =
    Array.isArray(deckObj.legends) && deckObj.legends.length > 0
      ? deckObj.legends
      : rawList.filter(isLeg);
  const rawMain =
    Array.isArray(deckObj.legends) && deckObj.legends.length > 0
      ? rawList.filter((c) => !isLeg(c))
      : rawList.filter((c) => !isLeg(c));

  const slimCard = (c) =>
    stripUndefinedDeep({
      id: c.id || '',
      slug: c.slug || '',
      name: c.name || 'Carta',
      qty: Number(c.qty || 1),
      officialType: c.officialType || '',
      image: c.image || ''
    });

  return {
    legends: rawLegends.slice(0, 3).map(slimCard),
    cards: rawMain.map(slimCard)
  };
}

// =========================================================================
// 1. CREAR, UNIRSE Y LISTAR SALAS PVP
// =========================================================================

export async function createPvpRoom({
  user,
  roomName = '',
  password = '',
  allowSpectators = true,
  allowSpectatorChat = true,
  deckName = 'Mazo Personalizado',
  deckSnapshot = null,
  avatarId = 'v-chico',
  avatarImage = ''
}) {
  if (!user?.uid) throw new Error('Debes iniciar sesión para crear una sala online.');

  let roomCode = generateRoomCode(6);
  for (let tries = 0; tries < 5; tries++) {
    const existing = await getDoc(doc(db, ROOMS_COL, roomCode));
    if (!existing.exists()) break;
    roomCode = generateRoomCode(6);
  }

  const passwordHash = await hashRoomPassword(password);
  const now = Date.now();
  const displayName = user.displayName || user.email?.split('@')[0] || 'Netrunner 1';
  const cleanRoomName = String(roomName || '').trim() || `Sala de ${displayName}`;

  const roomData = stripUndefinedDeep({
    roomCode,
    roomName: cleanRoomName.slice(0, 42),
    status: 'LOBBY',
    hasPassword: Boolean(passwordHash),
    passwordHash,
    allowSpectators: Boolean(allowSpectators),
    allowSpectatorChat: Boolean(allowSpectatorChat),
    version: 1,
    turnAuthority: 'p1',
    createdAtMs: now,
    updatedAtMs: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    players: {
      p1: {
        uid: user.uid,
        name: displayName,
        avatarId: avatarId || 'v-chico',
        avatarImage: avatarImage || '',
        deckName: deckName || 'Mazo',
        deckSnapshot: buildCompactDeckSnapshot(deckSnapshot),
        ready: false,
        mulliganChoice: 'PENDING',
        lastSeenAt: now
      },
      p2: null
    },
    d20: null,
    rematchVotes: { p1: false, p2: false },
    canonicalState: null,
    lastAction: {
      seq: 1,
      bySeat: 'p1',
      type: 'ROOM_CREATED',
      summary: `${displayName} creó la sala.`,
      timestamp: now
    }
  });

  await setDoc(doc(db, ROOMS_COL, roomCode), roomData);
  return { roomCode, seat: 'p1', room: roomData };
}

export async function joinPvpRoom({
  roomCode,
  user,
  password = '',
  deckName = 'Mazo Personalizado',
  deckSnapshot = null,
  avatarId = 'v-chico',
  avatarImage = ''
}) {
  if (!user?.uid) throw new Error('Debes iniciar sesión para unirte a una sala.');
  const code = normalizeRoomCode(roomCode);
  if (!code) throw new Error('Código de sala no válido.');

  const ref = doc(db, ROOMS_COL, code);
  const enteredHash = await hashRoomPassword(password);
  const now = Date.now();
  const displayName = user.displayName || user.email?.split('@')[0] || 'Netrunner 2';

  let assignedSeat = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error(`No existe ninguna sala con el código ${code}.`);
    }
    const data = snap.data();

    // Reconexión directa si ya eras p1 o p2 de esta sala
    if (data.players?.p1?.uid === user.uid) {
      assignedSeat = 'p1';
      tx.update(ref, {
        'players.p1.lastSeenAt': now,
        updatedAtMs: now,
        updatedAt: serverTimestamp()
      });
      return;
    }
    if (data.players?.p2?.uid === user.uid) {
      assignedSeat = 'p2';
      tx.update(ref, {
        'players.p2.lastSeenAt': now,
        updatedAtMs: now,
        updatedAt: serverTimestamp()
      });
      return;
    }

    if (data.status !== 'LOBBY') {
      throw new Error('Esta partida ya está en curso o finalizada. Puedes entrar como Espectador si está permitido.');
    }
    if (data.players?.p2) {
      throw new Error('La sala ya está llena (2/2 jugadores).');
    }
    if (data.hasPassword && data.passwordHash && data.passwordHash !== enteredHash) {
      throw new Error('Contraseña incorrecta para esta sala.');
    }

    assignedSeat = 'p2';
    tx.update(ref, {
      'players.p2': stripUndefinedDeep({
        uid: user.uid,
        name: displayName,
        avatarId: avatarId || 'v-chico',
        avatarImage: avatarImage || '',
        deckName: deckName || 'Mazo',
        deckSnapshot: buildCompactDeckSnapshot(deckSnapshot),
        ready: false,
        mulliganChoice: 'PENDING',
        lastSeenAt: now
      }),
      'players.p1.ready': false,
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
      lastAction: {
        seq: (data.version || 1) + 1,
        bySeat: 'p2',
        type: 'PLAYER_JOINED',
        summary: `${displayName} se unió a la sala.`,
        timestamp: now
      }
    });
  });

  return { roomCode: code, seat: assignedSeat };
}

export async function enterPvpSpectator({ roomCode, user, password = '' }) {
  if (!user?.uid) throw new Error('Debes iniciar sesión para ver partidas en directo.');
  const code = normalizeRoomCode(roomCode);
  const ref = doc(db, ROOMS_COL, code);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`No existe la sala ${code}.`);
  }
  const data = snap.data();

  // Si ya es jugador de la sala, devolver su asiento real
  if (data.players?.p1?.uid === user.uid) return { roomCode: code, seat: 'p1' };
  if (data.players?.p2?.uid === user.uid) return { roomCode: code, seat: 'p2' };

  if (!data.allowSpectators) {
    throw new Error('El anfitrión no ha habilitado el modo Espectador en esta sala.');
  }
  if (data.hasPassword && data.passwordHash) {
    const enteredHash = await hashRoomPassword(password);
    if (enteredHash !== data.passwordHash) {
      throw new Error('Contraseña incorrecta para entrar como espectador.');
    }
  }

  // Registrar presencia ligera en subcolección `spectators` (sin tocar el documento principal de partida)
  try {
    const specRef = doc(db, ROOMS_COL, code, 'spectators', user.uid);
    await setDoc(specRef, {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Espectador',
      lastSeenAt: Date.now()
    });
  } catch {
    // No bloquear la visualización si falla el registro opcional de espectador
  }

  return { roomCode: code, seat: 'spectator' };
}

export async function touchPvpSpectator(roomCode, user) {
  if (!roomCode || !user?.uid) return;
  try {
    await setDoc(doc(db, ROOMS_COL, normalizeRoomCode(roomCode), 'spectators', user.uid), {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Espectador',
      lastSeenAt: Date.now()
    });
  } catch {}
}

export async function leavePvpSpectator(roomCode, uid) {
  if (!roomCode || !uid) return;
  try {
    await deleteDoc(doc(db, ROOMS_COL, normalizeRoomCode(roomCode), 'spectators', uid));
  } catch {}
}

export function subscribePvpSpectators(roomCode, onList) {
  const code = normalizeRoomCode(roomCode);
  if (!code) return () => {};
  const colRef = collection(db, ROOMS_COL, code, 'spectators');
  return onSnapshot(
    colRef,
    (snap) => {
      const cutoff = Date.now() - 90_000;
      const active = snap.docs
        .map((d) => d.data())
        .filter((s) => Number(s?.lastSeenAt || 0) >= cutoff);
      onList(active);
    },
    () => onList([])
  );
}

export function subscribePvpRoomsList(onRooms, onError) {
  const q = query(collection(db, ROOMS_COL), orderBy('updatedAtMs', 'desc'), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      const cutoff = Date.now() - 3 * 60 * 60 * 1000; // Últimas 3 horas
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status !== 'ABANDONED' && Number(r.updatedAtMs || 0) >= cutoff);
      onRooms(list);
    },
    (err) => {
      console.warn('Error escuchando lista de salas PvP:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribePvpRoom(roomCode, onRoom, onError) {
  const code = normalizeRoomCode(roomCode);
  if (!code) return () => {};
  const ref = doc(db, ROOMS_COL, code);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onRoom(null);
      } else {
        onRoom({ id: snap.id, ...snap.data() });
      }
    },
    (err) => {
      console.warn('Error escuchando sala PvP:', err);
      if (onError) onError(err);
    }
  );
}

// =========================================================================
// 2. PREPARACIÓN DE SALA, D20, MULLIGAN Y TRANSACCIONES DE PARTIDA
// =========================================================================

export async function updatePvpSeatDeck(roomCode, seat, deckName, deckSnapshot) {
  if (seat !== 'p1' && seat !== 'p2') return;
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();
  await updateDoc(ref, {
    [`players.${seat}.deckName`]: deckName || 'Mazo',
    [`players.${seat}.deckSnapshot`]: buildCompactDeckSnapshot(deckSnapshot),
    [`players.${seat}.ready`]: false,
    [`players.${seat}.lastSeenAt`]: now,
    updatedAtMs: now,
    updatedAt: serverTimestamp()
  });
}

export async function setPvpSeatReady(roomCode, seat, isReady) {
  if (seat !== 'p1' && seat !== 'p2') return;
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();
  await updateDoc(ref, {
    [`players.${seat}.ready`]: Boolean(isReady),
    [`players.${seat}.lastSeenAt`]: now,
    updatedAtMs: now,
    updatedAt: serverTimestamp()
  });
}

export async function startPvpD20Duel(roomCode) {
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('La sala ya no existe.');
    const data = snap.data();
    if (data.status !== 'LOBBY') return;
    if (!data.players?.p1 || !data.players?.p2) {
      throw new Error('Se necesitan 2 jugadores para iniciar el duelo.');
    }
    if (!data.players.p1.ready || !data.players.p2.ready) {
      throw new Error('Ambos jugadores deben marcar LISTO antes de empezar.');
    }

    const p1Roll = rollSecureD20();
    let p2Roll = rollSecureD20();
    while (p2Roll === p1Roll) p2Roll = rollSecureD20();
    const rollWinner = p1Roll > p2Roll ? 'p1' : 'p2';

    tx.update(ref, {
      status: 'D20',
      d20: {
        p1Roll,
        p2Roll,
        rollWinner,
        chosenStarter: null
      },
      'players.p1.mulliganChoice': 'PENDING',
      'players.p2.mulliganChoice': 'PENDING',
      rematchVotes: { p1: false, p2: false },
      version: (data.version || 1) + 1,
      turnAuthority: rollWinner,
      updatedAtMs: now,
      updatedAt: serverTimestamp()
    });
  });
}

export async function submitPvpStarterChoice(roomCode, seat, starterSeat, allCards = []) {
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Sala no encontrada.');
    const data = snap.data();
    if (data.status !== 'D20') return;
    if (data.d20?.rollWinner !== seat) {
      throw new Error('Solo el ganador de la tirada D20 puede elegir quién sale primero.');
    }

    const chosen = starterSeat === 'p2' ? 'p2' : 'p1';
    const canonicalState = createCanonicalPvpInitialState({
      roomCode: data.roomCode,
      p1: data.players.p1,
      p2: data.players.p2,
      allCards,
      starterSeat: chosen,
      d20: data.d20
    });

    tx.update(ref, {
      status: 'MULLIGAN',
      'd20.chosenStarter': chosen,
      'players.p1.mulliganChoice': 'PENDING',
      'players.p2.mulliganChoice': 'PENDING',
      canonicalState,
      version: (data.version || 1) + 1,
      turnAuthority: chosen,
      updatedAtMs: now,
      updatedAt: serverTimestamp()
    });
  });
}

export async function submitPvpMulliganChoice(roomCode, seat, decision) {
  if (seat !== 'p1' && seat !== 'p2') return;
  const cleanDecision = decision === 'MULLIGAN' ? 'MULLIGAN' : 'KEEP';
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Sala no encontrada.');
    const data = snap.data();
    if (data.status !== 'MULLIGAN' || !data.canonicalState) return;
    if (data.players?.[seat]?.mulliganChoice && data.players[seat].mulliganChoice !== 'PENDING') {
      return; // Ya decidió su mulligan
    }

    let nextCanonical = applyPvpMulliganToCanonical(data.canonicalState, seat, cleanDecision);
    const other = otherSeat(seat);
    const otherChoice = data.players?.[other]?.mulliganChoice || 'PENDING';
    const bothDone = otherChoice !== 'PENDING';

    let nextStatus = 'MULLIGAN';
    if (bothDone) {
      nextCanonical = finalizePvpMulliganAndStartTurn1(nextCanonical);
      nextStatus = 'PLAYING';
    }

    tx.update(ref, {
      status: nextStatus,
      [`players.${seat}.mulliganChoice`]: cleanDecision,
      [`players.${seat}.lastSeenAt`]: now,
      canonicalState: nextCanonical,
      turnAuthority: computeTurnAuthority(nextCanonical),
      version: (data.version || 1) + 1,
      updatedAtMs: now,
      updatedAt: serverTimestamp()
    });
  });
}

export async function commitPvpGameState(
  roomCode,
  mySeat,
  localState,
  expectedVersion,
  actionMeta = {}
) {
  if (mySeat !== 'p1' && mySeat !== 'p2') return { committed: false, reason: 'Solo lectura' };
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();
  const nextCanonical = unprojectStateFromSeat(localState, mySeat);
  const nextAuthority = computeTurnAuthority(nextCanonical);

  let committedVersion = expectedVersion;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Sala no encontrada.');
    const data = snap.data();
    if (typeof expectedVersion === 'number' && data.version !== expectedVersion) {
      throw new Error('STATE_CONFLICT');
    }
    if (data.status === 'FINISHED') return;

    committedVersion = (data.version || 1) + 1;
    tx.update(ref, {
      status: nextCanonical.isGameOver ? 'FINISHED' : 'PLAYING',
      canonicalState: nextCanonical,
      turnAuthority: nextAuthority,
      version: committedVersion,
      [`players.${mySeat}.lastSeenAt`]: now,
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
      lastAction: stripUndefinedDeep({
        seq: committedVersion,
        bySeat: mySeat,
        type: actionMeta.type || 'ACTION',
        summary: actionMeta.summary || '',
        timestamp: now
      })
    });
  });

  return { committed: true, version: committedVersion };
}

export async function concedePvpMatch(roomCode, mySeat) {
  if (mySeat !== 'p1' && mySeat !== 'p2') return;
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();
  const winnerSeat = otherSeat(mySeat);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data.canonicalState || data.canonicalState.isGameOver) return;

    const nextCanonical = { ...data.canonicalState };
    const loserName = data.players?.[mySeat]?.name || mySeat.toUpperCase();
    const winnerName = data.players?.[winnerSeat]?.name || winnerSeat.toUpperCase();
    nextCanonical.isGameOver = true;
    nextCanonical.winner = winnerSeat;
    nextCanonical.pendingReaction = null;
    nextCanonical.pendingCardChoice = null;
    nextCanonical.pendingModalChoice = null;
    nextCanonical.pendingTargetSelection = null;
    nextCanonical.pendingGigTheftState = null;
    nextCanonical.actionLog = [
      `🏳️ ${loserName} se ha rendido. ¡Victoria para ${winnerName}!`,
      ...(nextCanonical.actionLog || [])
    ];

    tx.update(ref, {
      status: 'FINISHED',
      canonicalState: stripUndefinedDeep(nextCanonical),
      turnAuthority: null,
      version: (data.version || 1) + 1,
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
      lastAction: {
        seq: (data.version || 1) + 1,
        bySeat: mySeat,
        type: 'CONCEDE',
        summary: `${loserName} se rindió.`,
        timestamp: now
      }
    });
  });
}

export async function requestPvpRematch(roomCode, mySeat) {
  if (mySeat !== 'p1' && mySeat !== 'p2') return;
  const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status !== 'FINISHED') return;

    const votes = {
      p1: Boolean(data.rematchVotes?.p1),
      p2: Boolean(data.rematchVotes?.p2),
      [mySeat]: true
    };

    if (votes.p1 && votes.p2) {
      const p1Roll = rollSecureD20();
      let p2Roll = rollSecureD20();
      while (p2Roll === p1Roll) p2Roll = rollSecureD20();
      const rollWinner = p1Roll > p2Roll ? 'p1' : 'p2';
      tx.update(ref, {
        status: 'D20',
        d20: { p1Roll, p2Roll, rollWinner, chosenStarter: null },
        'players.p1.mulliganChoice': 'PENDING',
        'players.p2.mulliganChoice': 'PENDING',
        rematchVotes: { p1: false, p2: false },
        canonicalState: null,
        turnAuthority: rollWinner,
        version: (data.version || 1) + 1,
        updatedAtMs: now,
        updatedAt: serverTimestamp()
      });
    } else {
      tx.update(ref, {
        rematchVotes: votes,
        updatedAtMs: now,
        updatedAt: serverTimestamp()
      });
    }
  });
}

export async function heartbeatPvpSeat(roomCode, seat) {
  if (seat !== 'p1' && seat !== 'p2') return;
  try {
    const ref = doc(db, ROOMS_COL, normalizeRoomCode(roomCode));
    await updateDoc(ref, {
      [`players.${seat}.lastSeenAt`]: Date.now()
    });
  } catch {}
}

export async function leavePvpRoom(roomCode, mySeat, uid = null) {
  const code = normalizeRoomCode(roomCode);
  if (!code) return;
  if (mySeat === 'spectator') {
    await leavePvpSpectator(code, uid);
    return;
  }
  const ref = doc(db, ROOMS_COL, code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  if (data.status === 'LOBBY') {
    if (mySeat === 'p1') {
      await deleteDoc(ref);
    } else if (mySeat === 'p2') {
      await updateDoc(ref, {
        'players.p2': null,
        'players.p1.ready': false,
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      });
    }
  } else if (data.status === 'PLAYING' || data.status === 'MULLIGAN' || data.status === 'D20') {
    if (data.canonicalState && !data.canonicalState.isGameOver) {
      await concedePvpMatch(code, mySeat);
    } else {
      await updateDoc(ref, {
        status: 'ABANDONED',
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      });
    }
  }
}

// =========================================================================
// 3. CHAT EN TIEMPO REAL (pvp_rooms/{roomCode}/messages)
// =========================================================================

export function subscribePvpChat(roomCode, onMessages) {
  const code = normalizeRoomCode(roomCode);
  if (!code) return () => {};
  const q = query(
    collection(db, ROOMS_COL, code, 'messages'),
    orderBy('createdAtMs', 'asc'),
    limit(80)
  );
  return onSnapshot(
    q,
    (snap) => {
      onMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => {}
  );
}

export async function sendPvpChatMessage(roomCode, { uid, senderName, role = 'p1', text }) {
  const code = normalizeRoomCode(roomCode);
  const clean = String(text || '').trim().slice(0, 280);
  if (!code || !uid || !clean) return;
  await addDoc(collection(db, ROOMS_COL, code, 'messages'), {
    uid,
    senderName: senderName || 'Netrunner',
    role,
    text: clean,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp()
  });
}

// =========================================================================
// 4. PRESENCIA ONLINE EN LOBBY Y RETOS DIRECTOS (pvp_presence/{uid})
// =========================================================================

export async function upsertLobbyPresence({
  uid,
  name,
  avatarId = 'v-chico',
  avatarImage = '',
  status = 'LOBBY',
  roomCode = null
}) {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, PRESENCE_COL, uid),
      stripUndefinedDeep({
        uid,
        name: name || 'Netrunner',
        avatarId,
        avatarImage: avatarImage || '',
        status,
        roomCode: roomCode || null,
        lastSeenAt: Date.now()
      }),
      { merge: true }
    );
  } catch {}
}

export async function removeLobbyPresence(uid) {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, PRESENCE_COL, uid));
  } catch {}
}

export function subscribeOnlineLobbyPlayers(onPlayers) {
  const q = query(collection(db, PRESENCE_COL), orderBy('lastSeenAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const cutoff = Date.now() - 80_000;
      const active = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => Number(u.lastSeenAt || 0) >= cutoff);
      onPlayers(active);
    },
    () => onPlayers([])
  );
}

export function subscribeMyPresence(uid, onPresence) {
  if (!uid) return () => {};
  return onSnapshot(
    doc(db, PRESENCE_COL, uid),
    (snap) => {
      onPresence(snap.exists() ? snap.data() : null);
    },
    () => {}
  );
}

export async function sendDirectChallenge(
  targetUid,
  { fromUid, fromName, fromAvatarImage = '', roomCode, roomName = '' }
) {
  if (!targetUid || !fromUid || !roomCode) return;
  await updateDoc(doc(db, PRESENCE_COL, targetUid), {
    incomingChallenge: stripUndefinedDeep({
      fromUid,
      fromName: fromName || 'Netrunner',
      fromAvatarImage: fromAvatarImage || '',
      roomCode,
      roomName: roomName || `Reto de ${fromName || 'Netrunner'}`,
      createdAt: Date.now()
    })
  });
}

export async function clearIncomingChallenge(uid) {
  if (!uid) return;
  try {
    await updateDoc(doc(db, PRESENCE_COL, uid), {
      incomingChallenge: null
    });
  } catch {}
}
