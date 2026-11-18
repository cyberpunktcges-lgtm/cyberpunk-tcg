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
