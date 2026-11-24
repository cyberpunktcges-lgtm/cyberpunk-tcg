/**
 * rankedTower.js
 * Modo Aventura: «Conquista la Torre Arasaka» (11 Rivales estilo Street Fighter II Arcade).
 * Progreso propio e independiente del Modo Ranked BO3 y del Modo Testeo.
 */

export const ARASAKA_TOWER_STORAGE_PREFIX = 'cp_sim_arasaka_tower_v2_';
const LEGACY_TOWER_STORAGE_KEY = 'cp_sim_arasaka_tower_wins';

export const ARASAKA_TOWER_RIVALS = [
  {
    stage: 1,
    id: 'pepe-najarro',
    name: 'Pepe Najarro',
    shortName: 'Pepe',
    title: 'Camarero de El Coyote Cojo',
    tier: 'Inicio Callejero',
    botDifficulty: 1,
    accentColor: '#FCEE0A',
    okImage: '/images/win-lose/pepe-najarro/ok.jpg',
    defeatedImage: '/images/win-lose/pepe-najarro/defeated.jpg',
    tauntQuote: '«¿Un chupito antes de perder tus Eddies, choom? Invita la casa.»',
    winQuote: '«¡Buen intento, choom! Cuando te recuperes pásate por El Coyote Cojo y te pongo algo fuerte.»',
    defeatQuote: '«¡Joder, vaya paliza...! Me has dejado peor que un turno doble en Heywood. Pasa al siguiente piso.»'
  },
  {
    stage: 2,
    id: 'muamar',
    name: 'Muamar "El Capitán" Reyes',
    shortName: 'El Capitán',
    title: 'Fixer de Santo Domingo',
    tier: 'Inicio Callejero',
    botDifficulty: 1,
    accentColor: '#0dfceb',
    okImage: '/images/win-lose/muamar/ok.jpg',
    defeatedImage: '/images/win-lose/muamar/defeated.jpg',
    tauntQuote: '«En Santo Domingo los contratos se ganan con estilo... y yo tengo de sobra.»',
    winQuote: '«¡Jaja! Con ese estilo no llegas ni a la esquina de Arroyo, choom. Afinar el mazo toca.»',
    defeatQuote: '«Uff... ¡menudo curro limpio! Me quito el sombrero... y necesito un ripperdoc urgente.»'
  },
  {
    stage: 3,
    id: 'dexter',
    name: 'Dexter DeShawn',
    shortName: 'Dexter',
    title: 'Fixer del Afterlife',
    tier: 'Inicio Callejero',
    botDifficulty: 1,
    accentColor: '#f59e0b',
    okImage: '/images/win-lose/dexter/ok.jpg',
    defeatedImage: '/images/win-lose/dexter/defeated.jpg',
    tauntQuote: '«Dime, Sr. o Sra. Merc: ¿vida tranquila o llamarada de gloria?»',
    winQuote: '«Vida tranquila para ti hoy, choom. Las grandes ligas del Afterlife todavía te quedan grandes.»',
    defeatQuote: '«Agh... maldita sea... vale, vale, tú mandas. Esto no me había pasado desde Pacifica...»'
  },
  {
    stage: 4,
    id: 'viktor',
    name: 'Viktor Vektor',
    shortName: 'Viktor',
    title: 'Ripperdoc • Ex-Campeón de Boxeo',
    tier: 'Cierre Nivel 1',
    botDifficulty: 1,
    accentColor: '#38bdf8',
    okImage: '/images/win-lose/viktor/ok.jpg',
    defeatedImage: '/images/win-lose/viktor/defeated.jpg',
    tauntQuote: '«Sube la guardia, chaval. Te voy a calibrar el Kiroshi a base de golpes.»',
    winQuote: '«Demasiado lento en el contragolpe, chaval. Pásate por mi clínica cuando quieras otra ronda.»',
    defeatQuote: '«Buen gancho... me pillaste con la guardia baja. Estás listo para los pesos pesados de la Torre.»'
  },
  {
    stage: 5,
    id: 'royce',
    name: 'Royce',
    shortName: 'Royce',
    title: 'Líder de Maelstrom',
    tier: 'Bandas de Night City',
    botDifficulty: 2,
    accentColor: '#FF003C',
    okImage: '/images/win-lose/royce/ok.jpg',
    defeatedImage: '/images/win-lose/royce/defeated.jpg',
    tauntQuote: '«¿Vienes a All Foods sin pagar doble? ¡Te voy a freír los implantes!»',
    winQuote: '«¡JAJAJA! ¡MAELSTROM MANDA! Eso te pasa por meterte en mi fábrica con cromo barato.»',
    defeatQuote: '«¡GRRR...! ¡Maldita escoria! Me has reventado el óptico... ¡Esto no ha acabado!»'
  },
  {
    stage: 6,
    id: 'placide',
    name: 'Placide',
    shortName: 'Placide',
    title: 'Netrunner de los Voodoo Boys',
    tier: 'Bandas de Night City',
    botDifficulty: 2,
    accentColor: '#a855f7',
    okImage: '/images/win-lose/placide/ok.jpg',
    defeatedImage: '/images/win-lose/placide/defeated.jpg',
    tauntQuote: '«Tu cromo es débil. Pacifica devora a los ranyon como tú.»',
    winQuote: '«Demasiado ruido, poca precisión. Tu mazo no sirve ni para cruzar el Blackwall.»',
    defeatQuote: '«...Hmph. Imposible. Tu ICE aguantó el ataque. No eres un simple ranyon.»'
  },
  {
    stage: 7,
    id: 'jackie',
    name: 'Jackie Welles',
    shortName: 'Jackie',
    title: 'Leyenda del Afterlife',
    tier: 'Mercenarios Top',
    botDifficulty: 2,
    accentColor: '#FCEE0A',
    okImage: '/images/win-lose/jackie/ok.jpg',
    defeatedImage: '/images/win-lose/jackie/defeated.jpg',
    tauntQuote: '«¡A las grandes ligas, choom! Vamos a ver de qué pasta estás hecho.»',
    winQuote: '«¡Órale, choom! Hoy el trago del Afterlife lleva mi nombre. ¡A la próxima das más guerra!»',
    defeatQuote: '«¡Ay, madre mía...! Me has dado hasta en el carné de identidad, hermano. ¡Sigue subiendo a la cima!»'
  },
  {
    stage: 8,
    id: 'goro',
    name: 'Goro Takemura',
    shortName: 'Takemura',
    title: 'Guardaespaldas de Arasaka',
    tier: 'Cierre Nivel 2',
    botDifficulty: 2,
    accentColor: '#ef4444',
    okImage: '/images/win-lose/goro/ok.jpg',
    defeatedImage: '/images/win-lose/goro/defeated.jpg',
    tauntQuote: '«Tu técnica carece de disciplina. Demuéstrame si mereces entrar en los pisos altos.»',
    winQuote: '«Predecible. Sin honor ni estrategia no sobrevivirás ni un minuto en la Torre Arasaka.»',
    defeatQuote: '«Has luchado con astucia... admito mi derrota. Arriba te esperan auténticos monstruos.»'
  },
  {
    stage: 9,
    id: 'adam-smasher',
    name: 'Adam Smasher',
    shortName: 'Adam Smasher',
    title: 'Ciborg Letal de Arasaka',
    tier: 'Trío Final',
    botDifficulty: 3,
    accentColor: '#FF003C',
    okImage: '/images/win-lose/adam-smasher/ok.jpg',
    defeatedImage: '/images/win-lose/adam-smasher/defeated.jpg',
    tauntQuote: '«¿Crees que eres especial? Solo eres otro trozo de carne fácil de aplastar.»',
    winQuote: '«¡PATÉTICO! Carne débil frente al acero puro de Arasaka. Ni siquiera me has hecho sudar.»',
    defeatQuote: '«ERROR CRÍTICO... SISTEMAS DESTRUIDOS... ¡IMPOSIBLE! ¿CÓMO HA PODIDO... UN SIMPLE HUMANO...?»'
  },
  {
    stage: 10,
    id: 'johnny',
    name: 'Johnny Silverhand',
    shortName: 'Johnny',
    title: 'Leyenda Rockerboy • Samurai',
    tier: 'Trío Final',
    botDifficulty: 3,
    accentColor: '#0dfceb',
    okImage: '/images/win-lose/johnny/ok.jpg',
    defeatedImage: '/images/win-lose/johnny/defeated.jpg',
    tauntQuote: '«Despierta, Samurai. Vamos a quemar este tablero hasta los cimientos.»',
    winQuote: '«¡Chippin’ In, bebé! Eso es rock & roll en estado puro. Sube el volumen y vuelve a intentarlo.»',
    defeatQuote: '«Joder... qué espectáculo. Me has dejado sin guitarra ni dientes... Solo te queda V en la azotea.»'
  },
  {
    stage: 11,
    id: 'v',
    name: 'V',
    shortName: 'V',
    title: 'Jefe Final • Leyenda de Night City',
    tier: 'JEFE FINAL',
    botDifficulty: 3,
    accentColor: '#FCEE0A',
    okImage: '/images/win-lose/v/ok.jpg',
    defeatedImage: '/images/win-lose/v/defeated.jpg',
    tauntQuote: '«Has llegado hasta la azotea de la Torre Arasaka. Veamos quién manda en Night City.»',
    winQuote: '«Casi me tumbas, choom, pero la corona de Night City todavía no cambia de dueño. ¡Otra ronda!»',
    defeatQuote: '«Increíble... me has superado en mi propia azotea. La Torre Arasaka y Night City son tuyas, Leyenda.»'
  }
];

export const TOTAL_TOWER_STAGES = ARASAKA_TOWER_RIVALS.length;

export function getRivalById(id) {
  if (!id) return null;
  return ARASAKA_TOWER_RIVALS.find((r) => r.id === id) || null;
}

export function getRivalByStage(stage = 1) {
  const idx = Math.max(0, Math.min(TOTAL_TOWER_STAGES - 1, (Number(stage) || 1) - 1));
  return ARASAKA_TOWER_RIVALS[idx];
}

function getStorageKey(uid = null) {
  return `${ARASAKA_TOWER_STORAGE_PREFIX}${uid || 'guest'}`;
}

export function loadTowerSave(uid = null) {
  if (typeof window === 'undefined') return { defeatedCount: 0, completions: 0 };
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        defeatedCount: Math.max(0, Math.min(TOTAL_TOWER_STAGES, Number(parsed.defeatedCount) || 0)),
        completions: Math.max(0, Number(parsed.completions) || 0)
      };
    }
    // Migración suave si había progreso previo en la clave antigua
    const legacy = parseInt(localStorage.getItem(LEGACY_TOWER_STORAGE_KEY) || '0', 10) || 0;
    if (legacy > 0) {
      return {
        defeatedCount: Math.min(TOTAL_TOWER_STAGES, legacy),
        completions: legacy >= TOTAL_TOWER_STAGES ? 1 : 0
      };
    }
  } catch {}
  return { defeatedCount: 0, completions: 0 };
}

export function saveTowerSave(uid = null, data = { defeatedCount: 0, completions: 0 }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      getStorageKey(uid),
      JSON.stringify({
        defeatedCount: Math.max(0, Math.min(TOTAL_TOWER_STAGES, Number(data.defeatedCount) || 0)),
        completions: Math.max(0, Number(data.completions) || 0),
        updatedAt: Date.now()
      })
    );
  } catch {}
}

/**
 * Registra la victoria de un piso en el Modo Aventura «Conquista la Torre Arasaka».
 */
export function recordTowerFloorWin(uid = null, stageWon = 1) {
  const prev = loadTowerSave(uid);
  const expectedStage = prev.defeatedCount + 1;
  let nextDefeated = prev.defeatedCount;
  let nextCompletions = prev.completions;

  if (prev.defeatedCount < TOTAL_TOWER_STAGES && Number(stageWon) >= expectedStage) {
    nextDefeated = Math.min(TOTAL_TOWER_STAGES, Number(stageWon));
    if (nextDefeated >= TOTAL_TOWER_STAGES) {
      nextCompletions = prev.completions + 1;
    }
  }

  const nextData = { defeatedCount: nextDefeated, completions: nextCompletions };
  saveTowerSave(uid, nextData);
  return getTowerProgress(uid, nextData);
}

/**
 * Reinicia la escalada desde el Piso 1 (Pepe Najarro) conservando las conquistas previas.
 */
export function resetTowerRun(uid = null) {
  const prev = loadTowerSave(uid);
  const nextData = { defeatedCount: 0, completions: prev.completions };
  saveTowerSave(uid, nextData);
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LEGACY_TOWER_STORAGE_KEY);
    }
  } catch {}
  return getTowerProgress(uid, nextData);
}

/**
 * Devuelve el progreso actual del Modo Aventura «Conquista la Torre Arasaka».
 */
export function getTowerProgress(uid = null, overrideSave = null) {
  const save = overrideSave || loadTowerSave(uid);
  const defeatedCount = Math.max(0, Math.min(TOTAL_TOWER_STAGES, Number(save.defeatedCount) || 0));
  const completions = Math.max(0, Number(save.completions) || 0);
  const isChampion = defeatedCount >= TOTAL_TOWER_STAGES;
  const currentStage = isChampion ? TOTAL_TOWER_STAGES : defeatedCount + 1;
  const currentRival = getRivalByStage(currentStage);
  const nextRivalAfterWin =
    !isChampion && currentStage < TOTAL_TOWER_STAGES ? getRivalByStage(currentStage + 1) : null;

  return {
    defeatedCount,
    completions,
    totalStages: TOTAL_TOWER_STAGES,
    currentStage,
    isChampion,
    currentRival,
    nextRivalAfterWin
  };
}

/**
 * Elige el rival activo para una partida del Modo Aventura «Conquista la Torre Arasaka».
 */
export function pickTowerAdventureRival(uid = null, overrideSave = null) {
  const progress = getTowerProgress(uid, overrideSave);
  if (!progress.isChampion) {
    return {
      rival: progress.currentRival,
      isChampionRematch: false,
      progress
    };
  }
  const randomIdx = Math.floor(Math.random() * ARASAKA_TOWER_RIVALS.length);
  const picked = ARASAKA_TOWER_RIVALS[randomIdx];
  return {
    rival: {
      ...picked,
      botDifficulty: 3
    },
    isChampionRematch: true,
    progress
  };
}

/**
 * Convierte un rival de la Torre en un objeto de avatar compatible con AvatarDisplay y CyberSimulator.
 */
export function getRivalAsBotAvatar(rival) {
  if (!rival) return null;
  return {
    id: `tower_${rival.id}`,
    name: rival.name,
    image: rival.okImage,
    isTowerRival: true,
    towerStage: rival.stage,
    title: rival.title
  };
}
