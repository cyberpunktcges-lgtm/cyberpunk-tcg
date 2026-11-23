import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  computeMatchRankingUpdate,
  computeWinRate,
  CURRENT_RANKING_SEASON
} from './rankingSystem.js';

// Configuración oficial de Firebase del proyecto Cyberpunk TCG
export const firebaseConfig = {
  apiKey: "AIzaSyBN5s_aLcj7bBbV3TY0GYt5eTzvnR3Gzf8",
  authDomain: "cyberpunktcg-3385d.firebaseapp.com",
  projectId: "cyberpunktcg-3385d",
  storageBucket: "cyberpunktcg-3385d.firebasestorage.app",
  messagingSenderId: "819086964712",
  appId: "1:819086964712:web:a03d0bf028cc7747f2965d"
};

// Inicialización singleton segura en SSR y cliente
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// =========================================================================
// FUNCIONES DE AUTENTICACIÓN
// =========================================================================

/**
 * Registro con Correo y Contraseña
 */
export async function registerWithEmail(email, password, displayName = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('No se pudo actualizar el nombre del perfil:', e);
    }
  }
  return userCredential.user;
}

/**
 * Inicio de Sesión con Correo y Contraseña
 */
export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return userCredential.user;
}

/**
 * Inicio de Sesión / Registro con Google (Popup rápido)
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Cerrar Sesión
 */
export async function logoutUser() {
  return await signOut(auth);
}

/**
 * Suscribirse a los cambios de estado de autenticación
 */
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// =========================================================================
// GESTIÓN DE MAZOS DE USUARIO EN FIRESTORE
// =========================================================================

/**
 * Guardar o actualizar un mazo en la nube del usuario
 * @param {string} userId - UID del usuario autenticado
 * @param {object} deckData - Datos del mazo ({ id, name, faction, cards, sideboard, notes })
 */
export async function saveUserDeck(userId, deckData) {
  if (!userId) throw new Error('Usuario no autenticado');

  const deckId = deckData.id || `deck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const deckRef = doc(db, 'users', userId, 'decks', deckId);

  const payload = {
    id: deckId,
    userId,
    name: deckData.name || 'Mi Mazo Cyberpunk',
    faction: deckData.faction || 'Neutral',
    cards: deckData.cards || [],
    sideboard: deckData.sideboard || [],
    notes: deckData.notes || '',
    updatedAt: serverTimestamp(),
    createdAt: deckData.createdAt || serverTimestamp()
  };

  await setDoc(deckRef, payload, { merge: true });
  return payload;
}

/**
 * Obtener todos los mazos guardados de un usuario
 * @param {string} userId - UID del usuario autenticado
 */
export async function getUserDecks(userId) {
  if (!userId) return [];

  const decksRef = collection(db, 'users', userId, 'decks');
  const snapshot = await getDocs(decksRef);

  const decks = [];
  snapshot.forEach((docSnap) => {
    decks.push(docSnap.data());
  });

  // Ordenar por más reciente
  return decks.sort((a, b) => {
    const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt || 0);
    const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt || 0);
    return timeB - timeA;
  });
}

/**
 * Eliminar un mazo guardado
 * @param {string} userId - UID del usuario autenticado
 * @param {string} deckId - ID del mazo a borrar
 */
export async function deleteUserDeck(userId, deckId) {
  if (!userId || !deckId) throw new Error('Parámetros inválidos');
  const deckRef = doc(db, 'users', userId, 'decks', deckId);
  await deleteDoc(deckRef);
  return true;
}

// =========================================================================
// GESTIÓN DE PERFIL DE USUARIO EN FIRESTORE
// =========================================================================

/**
 * Guardar o actualizar datos de perfil del usuario
 * @param {string} userId - UID del usuario autenticado
 * @param {object} profileData - { firstName, lastName, displayName, avatarId, avatarImage, meleeUsername, city, favoriteFaction, bio }
 */
export async function saveUserProfile(userId, profileData) {
  if (!userId) throw new Error('Usuario no autenticado');

  const profileRef = doc(db, 'users', userId, 'profile', 'info');
  const payload = {
    ...profileData,
    updatedAt: serverTimestamp()
  };

  await setDoc(profileRef, payload, { merge: true });

  // Actualizar también displayName en Auth si cambió
  if (profileData.displayName && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, { displayName: profileData.displayName });
    } catch {}
  }

  // Si el usuario tiene entrada en el Ranking, sincronizar su Nick público y Avatar (sin nombre/apellidos)
  const publicNick = String(profileData.nickname || profileData.displayName || '').trim();
  if (publicNick) {
    try {
      const lbRef = doc(db, 'simulator_leaderboard', userId);
      const lbSnap = await getDoc(lbRef);
      if (lbSnap.exists()) {
        await setDoc(
          lbRef,
          {
            nickname: publicNick.slice(0, 28),
            displayName: publicNick.slice(0, 28),
            ...(profileData.avatarId ? { avatarId: profileData.avatarId } : {}),
            ...(profileData.avatarImage ? { avatarImage: profileData.avatarImage } : {}),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
    } catch {}
  }

  // Guardar en caché local
  try {
    localStorage.setItem(`cp_profile_${userId}`, JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Obtener perfil de usuario
 * @param {string} userId - UID del usuario autenticado
 */
export async function getUserProfile(userId) {
  if (!userId) return null;

  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem(`cp_profile_${userId}`, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Error al obtener perfil de Firestore:', err);
  }

  // Fallback a caché si Firestore tarda o falla
  try {
    const cached = localStorage.getItem(`cp_profile_${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {}

  return null;
}

// =========================================================================
// REPORTES DE BUGS BETA DEL SIMULADOR EN FIRESTORE
// =========================================================================

/**
 * Envía un reporte de fallo de la Beta del simulador a Firestore (`beta_bug_reports`).
 * Funciona tanto con usuario autenticado como en modo invitado.
 */
export async function submitBetaBugReport(reportData) {
  const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const reportId = `bug_${Date.now()}_${shortCode}`;
  const reportRef = doc(db, 'beta_bug_reports', reportId);

  const payload = {
    id: reportId,
    code: `BUG-${shortCode}`,
    status: 'open', // 'open' | 'in_progress' | 'resolved' | 'wontfix'
    category: reportData.category || 'Regla / Habilidad de carta',
    cardName: reportData.cardName || '',
    description: String(reportData.description || '').trim(),
    expectedBehavior: String(reportData.expectedBehavior || '').trim(),
    reporterName: String(reportData.reporterName || 'Invitado Beta').trim(),
    reporterEmail: reportData.reporterEmail || '',
    userId: reportData.userId || null,
    includeDiagnostics: Boolean(reportData.includeDiagnostics),
    diagnostics: reportData.includeDiagnostics ? (reportData.diagnostics || null) : null,
    adminNotes: '',
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(reportRef, payload);
  return payload;
}

/**
 * Obtiene todos los reportes de bugs de la Beta ordenados del más reciente al más antiguo.
 */
export async function getBetaBugReports() {
  const reportsRef = collection(db, 'beta_bug_reports');
  const snapshot = await getDocs(reportsRef);
  const reports = [];
  snapshot.forEach((docSnap) => {
    reports.push({ id: docSnap.id, ...docSnap.data() });
  });

  return reports.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAtMs || 0);
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAtMs || 0);
    return tB - tA;
  });
}

/**
 * Actualiza el estado o las notas internas de un reporte de bug en `/admin`.
 */
export async function updateBetaBugReport(reportId, updates = {}) {
  if (!reportId) throw new Error('ID de reporte inválido');
  const reportRef = doc(db, 'beta_bug_reports', reportId);
  await setDoc(
    reportRef,
    {
      ...updates,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return true;
}

/**
 * Elimina un reporte de bug de Firestore.
 */
export async function deleteBetaBugReport(reportId) {
  if (!reportId) throw new Error('ID de reporte inválido');
  const reportRef = doc(db, 'beta_bug_reports', reportId);
  await deleteDoc(reportRef);
  return true;
}

// =========================================================================
// RANKING NIGHT CITY LEADERBOARD EN FIRESTORE (`simulator_leaderboard`)
// =========================================================================

/**
 * Obtiene las estadísticas de ranking de un usuario (con fallback a caché local).
 */
export async function getUserRankingStats(userId) {
  if (!userId) return null;
  const currentSeasonId = CURRENT_RANKING_SEASON.id;
  const matchesSeason = (d) =>
    d && (d.seasonId === currentSeasonId || (!d.seasonId && currentSeasonId === 'beta-0'));

  try {
    const ref = doc(db, 'simulator_leaderboard', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = { userId, ...snap.data() };
      if (!matchesSeason(data)) return null;
      try {
        localStorage.setItem(`cp_ranking_${userId}_${currentSeasonId}`, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Error leyendo ranking del usuario en Firestore:', err);
  }

  try {
    const cached = localStorage.getItem(`cp_ranking_${userId}_${currentSeasonId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (matchesSeason(parsed)) return parsed;
    }
  } catch {}
  return null;
}

/**
 * Registra una partida finalizada en `simulator_leaderboard` y devuelve el delta de puntos y desbloqueos.
 */
export async function recordLeaderboardMatch(userId, profileMeta = {}, matchResult = {}) {
  if (!userId) throw new Error('Inicia sesión para puntuar en el Ranking');

  const currentSeasonId = CURRENT_RANKING_SEASON.id;
  const matchesSeason = (d) =>
    d && (d.seasonId === currentSeasonId || (!d.seasonId && currentSeasonId === 'beta-0'));

  const ref = doc(db, 'simulator_leaderboard', userId);
  let existing = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (matchesSeason(data)) existing = data;
    }
  } catch {
    try {
      const cached = localStorage.getItem(`cp_ranking_${userId}_${currentSeasonId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (matchesSeason(parsed)) existing = parsed;
      }
    } catch {}
  }

  const calc = computeMatchRankingUpdate(existing, matchResult);
  if (calc.alreadyRecorded || calc.skippedUnranked) {
    return calc;
  }

  const safeNick = String(
    profileMeta.nickname || profileMeta.displayName || existing?.nickname || existing?.displayName || `Netrunner_${String(userId).slice(-4).toUpperCase()}`
  )
    .trim()
    .slice(0, 28);

  const payload = {
    userId,
    seasonId: currentSeasonId,
    nickname: safeNick,
    displayName: safeNick,
    avatarId: profileMeta.avatarId || existing?.avatarId || 'v-chico',
    avatarImage: profileMeta.avatarImage || existing?.avatarImage || '',
    ...calc.updatedStats,
    updatedAtMs: Date.now(),
    updatedAt: serverTimestamp()
  };

  try {
    localStorage.setItem(`cp_ranking_${userId}_${currentSeasonId}`, JSON.stringify(payload));
  } catch {}

  await setDoc(ref, payload, { merge: true });
  return { ...calc, savedProfile: payload };
}

/**
 * Actualiza únicamente el Nick público del usuario en su Perfil y en el Ranking (nunca expone nombre/apellidos).
 */
export async function updateUserPublicNickname(userId, rawNickname) {
  if (!userId) throw new Error('Usuario no autenticado');
  const cleanNick = String(rawNickname || '').trim().slice(0, 28);
  if (cleanNick.length < 2) throw new Error('El Nick debe tener al menos 2 caracteres.');

  // 1. Guardar en perfil de usuario
  const profileRef = doc(db, 'users', userId, 'profile', 'info');
  await setDoc(
    profileRef,
    { nickname: cleanNick, displayName: cleanNick, updatedAt: serverTimestamp() },
    { merge: true }
  );

  // 2. Actualizar en simulator_leaderboard si ya existe fila del jugador
  const lbRef = doc(db, 'simulator_leaderboard', userId);
  const lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await setDoc(
      lbRef,
      { nickname: cleanNick, displayName: cleanNick, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
  return cleanNick;
}

/**
 * Obtiene el Top global del Ranking Night City de la temporada activa ordenado por puntos, victorias y winrate.
 */
export async function getLeaderboardTop(limitCount = 25) {
  const currentSeasonId = CURRENT_RANKING_SEASON.id;
  const colRef = collection(db, 'simulator_leaderboard');
  const snapshot = await getDocs(colRef);
  const rows = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const isCurrentSeason =
      data.seasonId === currentSeasonId || (!data.seasonId && currentSeasonId === 'beta-0');
    if (!isCurrentSeason) return;
    rows.push({
      userId: docSnap.id,
      ...data,
      points: Number(data.points) || 0,
      wins: Number(data.wins) || 0,
      losses: Number(data.losses) || 0,
      winRate: computeWinRate(data.wins, data.losses)
    });
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  return rows.map((row, idx) => ({ ...row, rank: idx + 1 })).slice(0, limitCount);
}
