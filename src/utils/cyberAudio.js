/**
 * cyberAudio.js
 * Sintetizador Web Audio API sin dependencias externas para el Simulador Cyberpunk TCG.
 * Genera efectos de sonido táctiles y atmosféricos (dados poliédricos, cartas, Eddies,
 * Programas, Cyberware/Gears, combates, bloqueos, robo de Gigs, cambio de turno y fin de partida).
 */

const STORAGE_KEY_ENABLED = 'cyberpunk_tcg_sfx_enabled';

let audioCtx = null;
let sfxEnabled = true;
let noiseBufferCache = null;
const lastPlayedAt = new Map();

// Cargar preferencia guardada en cliente
if (typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_ENABLED);
    if (saved === 'false') sfxEnabled = false;
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

export function isSfxEnabled() {
  return sfxEnabled;
}

export function setSfxEnabled(enabled) {
  sfxEnabled = Boolean(enabled);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY_ENABLED, sfxEnabled ? 'true' : 'false');
    } catch {
      // Ignorar errores de cuota/privacidad
    }
  }
  if (sfxEnabled) {
    unlockAudio();
  }
  return sfxEnabled;
}

function getAudioContext() {
  if (typeof window === 'undefined' || !sfxEnabled) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function canPlay(key, cooldownMs = 90) {
  if (!sfxEnabled) return false;
  const now = performance?.now ? performance.now() : Date.now();
  const prev = lastPlayedAt.get(key) || 0;
  if (now - prev < cooldownMs) return false;
  lastPlayedAt.set(key, now);
  return true;
}

function getNoiseBuffer(ctx) {
  if (noiseBufferCache && noiseBufferCache.sampleRate === ctx.sampleRate) {
    return noiseBufferCache;
  }
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBufferCache = buffer;
  return buffer;
}

function playTone(
  ctx,
  {
    type = 'sine',
    freq = 440,
    endFreq = null,
    startTime = ctx.currentTime,
    duration = 0.12,
    gain = 0.16,
    attack = 0.008
  }
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== null && endFreq > 0) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
  }
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playNoiseBurst(
  ctx,
  {
    filterType = 'bandpass',
    freq = 1600,
    endFreq = null,
    q = 3.0,
    startTime = ctx.currentTime,
    duration = 0.045,
    gain = 0.18
  }
) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== null && endFreq > 0) {
    filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
  }
  filter.Q.setValueAtTime(q, startTime);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + duration + 0.015);
}

// =========================================================================
// EFECTOS DE DADOS (GIGS & TIRADA INICIAL D20)
// =========================================================================

/**
 * Un golpe seco realista de dado poliédrico rebotando sobre mesa.
 * Se invoca rítmicamente durante la animación de tirada.
 */
export function playDiceTick(intensity = 1) {
  if (!canPlay('diceTick', 42)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const jitter = 0.86 + Math.random() * 0.28;
  const vol = Math.max(0.06, Math.min(0.24, 0.17 * intensity));

  // Clic acrílico agudo del borde del dado
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 2200 * jitter,
    endFreq: 1100 * jitter,
    q: 4.5,
    startTime: t,
    duration: 0.032,
    gain: vol
  });
  // Resonancia madera/tapete corta
  playTone(ctx, {
    type: 'triangle',
    freq: 280 * jitter,
    endFreq: 115,
    startTime: t,
    duration: 0.038,
    gain: vol * 0.55,
    attack: 0.002
  });
}

/**
 * Ráfaga completa de 5 rebotes decrecientes de dado (para tiradas automáticas del Bot).
 */
export function playDiceRoll() {
  if (!canPlay('diceRoll', 260)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const offsets = [0, 0.06, 0.125, 0.205, 0.305];
  offsets.forEach((dt, idx) => {
    const jitter = 0.88 + Math.random() * 0.24;
    const decay = 1 - idx * 0.13;
    playNoiseBurst(ctx, {
      filterType: 'bandpass',
      freq: (2400 - idx * 180) * jitter,
      endFreq: 950,
      q: 4.2,
      startTime: t + dt,
      duration: 0.035,
      gain: 0.18 * decay
    });
    playTone(ctx, {
      type: 'triangle',
      freq: (310 - idx * 20) * jitter,
      endFreq: 105,
      startTime: t + dt,
      duration: 0.04,
      gain: 0.09 * decay,
      attack: 0.002
    });
  });
  // Confirmación sutil al detenerse el dado
  playTone(ctx, {
    type: 'sine',
    freq: 520,
    endFreq: 780,
    startTime: t + 0.38,
    duration: 0.12,
    gain: 0.08,
    attack: 0.006
  });
}

/**
 * Impacto final al detenerse un dado en su número (con destello extra si es tirada máxima/alta).
 */
export function playDiceLand(isHighOrMax = false) {
  if (!canPlay('diceLand', 140)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Golpe firme de asentamiento
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 1650,
    endFreq: 680,
    q: 3.2,
    startTime: t,
    duration: 0.045,
    gain: 0.2
  });
  playTone(ctx, {
    type: 'triangle',
    freq: 210,
    endFreq: 85,
    startTime: t,
    duration: 0.06,
    gain: 0.13,
    attack: 0.003
  });

  // Destello neón de confirmación
  if (isHighOrMax) {
    playTone(ctx, { type: 'sine', freq: 587.33, startTime: t + 0.03, duration: 0.16, gain: 0.11 });
    playTone(ctx, { type: 'sine', freq: 880, startTime: t + 0.085, duration: 0.22, gain: 0.12 });
    playTone(ctx, { type: 'triangle', freq: 1174.66, startTime: t + 0.14, duration: 0.24, gain: 0.09 });
  } else {
    playTone(ctx, { type: 'sine', freq: 523.25, endFreq: 659.25, startTime: t + 0.03, duration: 0.14, gain: 0.09 });
  }
}

// =========================================================================
// EFECTOS DE CARTAS, EDDIES Y ACCIONES DE TABLERO
// =========================================================================

export function playCardDraw() {
  if (!canPlay('cardDraw', 130)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNoiseBurst(ctx, {
    filterType: 'highpass',
    freq: 1800,
    endFreq: 4200,
    q: 1.2,
    startTime: t,
    duration: 0.085,
    gain: 0.1
  });
  playTone(ctx, {
    type: 'sine',
    freq: 420,
    endFreq: 640,
    startTime: t + 0.015,
    duration: 0.07,
    gain: 0.045
  });
}

export function playUnitDeploy() {
  if (!canPlay('unitDeploy', 160)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Impacto grave de despliegue en mesa
  playTone(ctx, {
    type: 'sine',
    freq: 150,
    endFreq: 52,
    startTime: t,
    duration: 0.15,
    gain: 0.22,
    attack: 0.004
  });
  playNoiseBurst(ctx, {
    filterType: 'lowpass',
    freq: 950,
    q: 1.4,
    startTime: t,
    duration: 0.06,
    gain: 0.12
  });
  // Acorde holográfico corto
  playTone(ctx, { type: 'triangle', freq: 330, startTime: t + 0.03, duration: 0.13, gain: 0.07 });
  playTone(ctx, { type: 'sine', freq: 495, startTime: t + 0.055, duration: 0.15, gain: 0.07 });
}

export function playProgramCast() {
  if (!canPlay('programCast', 160)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Barrido digital Netrunner
  const notes = [440, 659.25, 880, 1318.5];
  notes.forEach((f, idx) => {
    playTone(ctx, {
      type: idx % 2 === 0 ? 'sawtooth' : 'square',
      freq: f,
      endFreq: f * 1.06,
      startTime: t + idx * 0.036,
      duration: 0.09,
      gain: 0.055,
      attack: 0.004
    });
  });
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 3200,
    endFreq: 1400,
    q: 4.0,
    startTime: t,
    duration: 0.14,
    gain: 0.07
  });
}

export function playGearEquip() {
  if (!canPlay('gearEquip', 160)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Encaje mecánico metálico Cyberware
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 2900,
    endFreq: 1600,
    q: 5.0,
    startTime: t,
    duration: 0.04,
    gain: 0.15
  });
  playTone(ctx, {
    type: 'square',
    freq: 240,
    endFreq: 480,
    startTime: t + 0.02,
    duration: 0.075,
    gain: 0.065,
    attack: 0.003
  });
  playTone(ctx, {
    type: 'triangle',
    freq: 760,
    endFreq: 980,
    startTime: t + 0.085,
    duration: 0.095,
    gain: 0.09,
    attack: 0.003
  });
}

export function playSellEddie() {
  if (!canPlay('sellEddie', 140)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Doble tintineo de créditos €$
  playTone(ctx, { type: 'sine', freq: 1046.5, startTime: t, duration: 0.11, gain: 0.1, attack: 0.004 });
  playTone(ctx, { type: 'sine', freq: 1567.98, startTime: t + 0.065, duration: 0.18, gain: 0.11, attack: 0.004 });
}

export function playEddieTap() {
  if (!canPlay('eddieTap', 55)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, {
    type: 'triangle',
    freq: 620,
    endFreq: 340,
    startTime: t,
    duration: 0.045,
    gain: 0.08,
    attack: 0.002
  });
  playNoiseBurst(ctx, {
    filterType: 'highpass',
    freq: 2400,
    q: 1.5,
    startTime: t,
    duration: 0.022,
    gain: 0.06
  });
}

export function playCallLegend() {
  if (!canPlay('callLegend', 220)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Acorde épico ascendente para Call / Go Solo de Leyenda
  const chord = [293.66, 440, 587.33, 880];
  chord.forEach((f, idx) => {
    playTone(ctx, {
      type: idx < 2 ? 'triangle' : 'sine',
      freq: f,
      startTime: t + idx * 0.045,
      duration: 0.34,
      gain: 0.085,
      attack: 0.015
    });
  });
}

// =========================================================================
// COMBATE, BLOQUEO, ROBO DE GIGS, TURNOS Y RESULTADO
// =========================================================================

export function playAttackDeclare() {
  if (!canPlay('attackDeclare', 180)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Tajo / fijación de blanco agresiva
  playTone(ctx, {
    type: 'sawtooth',
    freq: 420,
    endFreq: 135,
    startTime: t,
    duration: 0.16,
    gain: 0.09,
    attack: 0.005
  });
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 2100,
    endFreq: 550,
    q: 2.2,
    startTime: t,
    duration: 0.13,
    gain: 0.14
  });
}

export function playBlockIntercept() {
  if (!canPlay('blockIntercept', 180)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Choque metálico de escudo energético
  playTone(ctx, { type: 'square', freq: 290, endFreq: 190, startTime: t, duration: 0.14, gain: 0.09, attack: 0.003 });
  playTone(ctx, { type: 'triangle', freq: 840, endFreq: 620, startTime: t, duration: 0.18, gain: 0.1, attack: 0.003 });
  playNoiseBurst(ctx, {
    filterType: 'bandpass',
    freq: 2600,
    q: 5.5,
    startTime: t,
    duration: 0.07,
    gain: 0.12
  });
}

export function playCombatHit() {
  if (!canPlay('combatHit', 180)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Golpe contundente + chispazo
  playTone(ctx, {
    type: 'sine',
    freq: 135,
    endFreq: 38,
    startTime: t,
    duration: 0.22,
    gain: 0.25,
    attack: 0.003
  });
  playNoiseBurst(ctx, {
    filterType: 'lowpass',
    freq: 1400,
    endFreq: 260,
    q: 1.4,
    startTime: t,
    duration: 0.14,
    gain: 0.18
  });
}

export function playGigSteal() {
  if (!canPlay('gigSteal', 220)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Tríada rápida triunfal de robo de Gig
  const notes = [523.25, 659.25, 1046.5];
  notes.forEach((f, idx) => {
    playTone(ctx, {
      type: 'triangle',
      freq: f,
      startTime: t + idx * 0.06,
      duration: 0.18,
      gain: 0.11,
      attack: 0.006
    });
  });
}

export function playTurnBanner(isPlayer) {
  if (!canPlay('turnBanner', 450)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  if (isPlayer) {
    // Pulso neural cian claro: TU TURNO
    playTone(ctx, { type: 'sine', freq: 440, startTime: t, duration: 0.18, gain: 0.09, attack: 0.01 });
    playTone(ctx, { type: 'triangle', freq: 659.25, startTime: t + 0.08, duration: 0.28, gain: 0.1, attack: 0.01 });
  } else {
    // Señal hostil grave carmesí: TURNO DEL RIVAL
    playTone(ctx, { type: 'sawtooth', freq: 220, endFreq: 185, startTime: t, duration: 0.22, gain: 0.065, attack: 0.01 });
    playTone(ctx, { type: 'triangle', freq: 146.83, startTime: t + 0.09, duration: 0.26, gain: 0.09, attack: 0.01 });
  }
}

export function playUndo() {
  if (!canPlay('undo', 120)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, { type: 'sine', freq: 680, endFreq: 360, startTime: t, duration: 0.12, gain: 0.09, attack: 0.005 });
}

export function playUiConfirm() {
  if (!canPlay('uiConfirm', 70)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, { type: 'sine', freq: 740, endFreq: 980, startTime: t, duration: 0.065, gain: 0.065, attack: 0.003 });
}

/**
 * Aviso sonoro corto al clicar un objetivo no válido.
 */
export function playInvalidTarget() {
  if (!canPlay('invalidTarget', 140)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, { type: 'sawtooth', freq: 230, endFreq: 175, startTime: t, duration: 0.075, gain: 0.065, attack: 0.004 });
  playTone(ctx, { type: 'sawtooth', freq: 185, endFreq: 135, startTime: t + 0.085, duration: 0.095, gain: 0.065, attack: 0.004 });
}

export function playVictory() {
  if (!canPlay('gameOver', 800)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, idx) => {
    playTone(ctx, {
      type: idx === notes.length - 1 ? 'triangle' : 'sine',
      freq: f,
      startTime: t + idx * 0.095,
      duration: idx === notes.length - 1 ? 0.65 : 0.22,
      gain: 0.11,
      attack: 0.01
    });
  });
}

export function playDefeat() {
  if (!canPlay('gameOver', 800)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [392, 349.23, 293.66, 220];
  notes.forEach((f, idx) => {
    playTone(ctx, {
      type: 'sawtooth',
      freq: f,
      endFreq: f * 0.94,
      startTime: t + idx * 0.13,
      duration: idx === notes.length - 1 ? 0.55 : 0.2,
      gain: 0.065,
      attack: 0.01
    });
  });
}
