/**
 * rankedTower.js
 * Torre Arasaka Ranked (11 Rivales estilo Street Fighter II Arcade)
 * Progresión automática en Modo Ranked BO3 del Simulador de Cyberpunk TCG.
 */

export const ARASAKA_TOWER_STORAGE_KEY = 'cp_sim_arasaka_tower_wins';

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

export function loadLocalTowerWins() {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(ARASAKA_TOWER_STORAGE_KEY);
    return Math.max(0, parseInt(raw || '0', 10) || 0);
  } catch {
    return 0;
  }
}

export function saveLocalTowerWins(wins) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ARASAKA_TOWER_STORAGE_KEY, String(Math.max(0, Number(wins) || 0)));
  } catch {}
}

/**
 * Calcula el progreso actual del jugador en la Torre Arasaka.
 * Usa las victorias Ranked de Firebase (userRankingStats.wins) o, si no hay sesión, el respaldo local.
 */
export function getTowerProgress(userRankingStats = null) {
  const cloudWins = userRankingStats ? Math.max(0, Number(userRankingStats.wins) || 0) : null;
  const localWins = loadLocalTowerWins();
  const totalWins = cloudWins !== null ? Math.max(cloudWins, 0) : localWins;

  const isChampion = totalWins >= TOTAL_TOWER_STAGES;
  const defeatedCount = Math.min(TOTAL_TOWER_STAGES, totalWins);
  const currentStage = isChampion ? TOTAL_TOWER_STAGES : defeatedCount + 1;
  const currentRival = getRivalByStage(currentStage);
  const nextRivalAfterWin =
    !isChampion && currentStage < TOTAL_TOWER_STAGES ? getRivalByStage(currentStage + 1) : null;

  return {
    totalWins,
    defeatedCount,
    totalStages: TOTAL_TOWER_STAGES,
    currentStage,
    isChampion,
    currentRival,
    nextRivalAfterWin
  };
}

/**
 * Devuelve el rival activo para una nueva serie Ranked BO3.
 * - Mientras no hayas completado la Torre (pisos 1..11): te toca exactamente el rival de tu piso actual.
 * - Cuando ya eres Campeón (>=11 victorias): te empareja contra un rival aleatorio de la Torre (con IA NV.3).
 */
export function pickRankedTowerRival(userRankingStats = null) {
  const progress = getTowerProgress(userRankingStats);
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
