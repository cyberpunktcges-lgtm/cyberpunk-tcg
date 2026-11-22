/**
 * betaDiagnostics.js
 * Motor de diagnóstico ("caja negra") para la Beta del Simulador de Cyberpunk TCG.
 * - Captura errores JS en segundo plano (window.onerror / unhandledrejection).
 * - Genera un snapshot compacto y serializable del estado de la partida (mesa, manos, leyendas, logs).
 * - Extrae las cartas presentes en la partida para selector rápido en el formulario.
 * - Formatea el reporte completo en Markdown listo para copiar y diagnosticar/fixear al instante.
 */

const MAX_RUNTIME_ERRORS = 15;
const runtimeErrorBuffer = [];
let errorListenersInstalled = false;

export function installGlobalErrorBuffer() {
  if (typeof window === 'undefined' || errorListenersInstalled) return;
  errorListenersInstalled = true;

  const pushError = (kind, message, stack = '') => {
    runtimeErrorBuffer.unshift({
      kind,
      message: String(message || 'Error desconocido').slice(0, 300),
      stack: String(stack || '').slice(0, 500),
      time: new Date().toISOString()
    });
    if (runtimeErrorBuffer.length > MAX_RUNTIME_ERRORS) {
      runtimeErrorBuffer.length = MAX_RUNTIME_ERRORS;
    }
  };

  window.addEventListener('error', (event) => {
    pushError(
      'error',
      event?.message || String(event?.error || 'Script error'),
      event?.error?.stack || `${event?.filename || ''}:${event?.lineno || ''}`
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    pushError(
      'unhandledrejection',
      reason?.message || String(reason || 'Unhandled promise rejection'),
      reason?.stack || ''
    );
  });
}

export function getRecentRuntimeErrors(limit = 10) {
  return runtimeErrorBuffer.slice(0, limit);
}

/**
 * Extrae las cartas presentes en esta partida (campo, leyendas, mano, basura)
 * para que el tester pueda seleccionar la carta con error en 1 clic.
 */
export function extractBoardCardsForPicker(gameState) {
  if (!gameState) return [];
  const seen = new Map();

  const register = (card, zoneLabel) => {
    if (!card || !card.name) return;
    const key = `${card.id || card.name}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: card.id || '',
        name: card.name,
        label: `${card.name}${card.id ? ` (${card.id})` : ''} — ${zoneLabel}`
      });
    }
  };

  const p = gameState.player || {};
  const b = gameState.bot || {};

  (p.field || []).forEach((u) => {
    register(u, 'Tu Campo');
    (u.gear || []).forEach((g) => register(g, 'Tu Gear'));
  });
  (p.legends || []).forEach((l) => {
    if (l.isFaceUp) register(l, 'Tu Leyenda');
  });
  (p.hand || []).forEach((c) => register(c, 'Tu Mano'));
  (p.trash || []).slice(-6).forEach((c) => register(c, 'Tu Basura'));

  (b.field || []).forEach((u) => {
    register(u, 'Campo Rival');
    (u.gear || []).forEach((g) => register(g, 'Gear Rival'));
  });
  (b.legends || []).forEach((l) => {
    if (l.isFaceUp) register(l, 'Leyenda Rival');
  });
  (b.trash || []).slice(-6).forEach((c) => register(c, 'Basura Rival'));

  return Array.from(seen.values());
}

function summarizeSide(side = {}) {
  const eddies = Array.isArray(side.eddies) ? side.eddies : [];
  const legends = Array.isArray(side.legends) ? side.legends : [];
  const field = Array.isArray(side.field) ? side.field : [];
  const hand = Array.isArray(side.hand) ? side.hand : [];
  const trash = Array.isArray(side.trash) ? side.trash : [];
  const gigs = Array.isArray(side.gigs) ? side.gigs : [];

  return {
    gigsCount: gigs.length,
    gigs: gigs.map((g) => {
      const dieLabel = g.die
        ? String(g.die).toUpperCase()
        : g.sides
        ? `D${g.sides}`
        : 'D?';
      return `${dieLabel}:${g.value ?? g.currentValue ?? '?'}`;
    }),
    eddiesTotal: eddies.length,
    eddiesReady: eddies.filter((e) => !e.isSpent).length,
    floatingEddies: Number(side.floatingEddies || 0),
    hasSoldThisTurn: Boolean(side.hasSoldThisTurn),
    hasCalledLegendThisTurn: Boolean(side.hasCalledLegendThisTurn),
    deckCount: Array.isArray(side.deck) ? side.deck.length : 0,
    handCount: hand.length,
    hand: hand.map((c) => `${c.id || '?'} ${c.name || '?'}`),
    trashCount: trash.length,
    trashRecent: trash.slice(-6).map((c) => `${c.id || '?'} ${c.name || '?'}`),
    legends: legends.map((l, idx) => ({
      slot: idx + 1,
      id: l.id || '',
      name: l.name || '',
      isFaceUp: Boolean(l.isFaceUp),
      isSpent: Boolean(l.isSpent),
      isOnField: Boolean(l.isOnField),
      isRemovedFromGame: Boolean(l.isRemovedFromGame)
    })),
    field: field.map((u) => ({
      id: u.id || '',
      name: u.name || '',
      power: u.currentPower ?? u.parsedPower ?? 0,
      isSpent: Boolean(u.isSpent),
      isLagging: Boolean(u.isLagging),
      gear: (u.gear || []).map((g) => `${g.id || '?'} ${g.name || '?'}${g.isSpent ? ' [SPENT]' : ''}`)
    }))
  };
}

/**
 * Construye una instantánea compacta y 100% serializable para Firestore de la partida actual.
 */
export function buildSimulatorDiagnosticSnapshot(gameState, extraMeta = {}) {
  const gs = gameState || {};
  const pendingReaction = gs.pendingReaction
    ? {
        attackerPlayerKey: gs.pendingReaction.attackerPlayerKey || '',
        attackerName: gs.pendingReaction.attackerName || '',
        attackerPower: gs.pendingReaction.attackerPower ?? 0,
        targetType: gs.pendingReaction.targetType || '',
        targetName: gs.pendingReaction.targetName || '',
        blockerUnitId: gs.pendingReaction.blockerUnitId || null
      }
    : null;

  const pendingTarget = gs.pendingTargetSelection
    ? {
        type: gs.pendingTargetSelection.type || '',
        sourceCardName: gs.pendingTargetSelection.sourceCardName || gs.pendingTargetSelection.cardName || '',
        prompt: gs.pendingTargetSelection.prompt || ''
      }
    : null;

  const pendingChoice = gs.pendingCardChoice
    ? {
        type: gs.pendingCardChoice.type || '',
        title: gs.pendingCardChoice.title || ''
      }
    : null;

  const actionLog = Array.isArray(gs.actionLog) ? gs.actionLog.slice(0, 45).map((l) => String(l)) : [];

  return {
    turnNumber: gs.turnNumber ?? 0,
    activePlayer: gs.activePlayer || '',
    phase: gs.phase || '',
    firstPlayer: gs.firstPlayer || '',
    mulliganDecided: Boolean(gs.mulliganDecided),
    isOvertime: Boolean(gs.isOvertime),
    isGameOver: Boolean(gs.isGameOver),
    winner: gs.winner || null,
    playerDeckName: extraMeta.playerDeckName || '',
    botDeckName: extraMeta.botDeckName || '',
    player: summarizeSide(gs.player),
    bot: summarizeSide(gs.bot),
    pending: {
      reaction: pendingReaction,
      targetSelection: pendingTarget,
      cardChoice: pendingChoice
    },
    actionLog,
    runtimeErrors: getRecentRuntimeErrors(10),
    environment: {
      url: typeof window !== 'undefined' ? window.location.href : '',
      viewport:
        typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      capturedAt: new Date().toISOString()
    }
  };
}

/**
 * Formatea un reporte (guardado o en borrador) como bloque Markdown listo para copiar y fixear.
 */
export function formatBugReportForFix(report) {
  const d = report?.diagnostics;
  const lines = [
    `### 🐛 REPORTE BETA SIMULADOR ${report?.code ? `(${report.code})` : ''}`,
    `- **Categoría:** ${report?.category || 'N/A'}`,
    `- **Reportado por:** ${report?.reporterName || 'Invitado Beta'}${report?.reporterEmail ? ` (${report.reporterEmail})` : ''}`,
    report?.cardName ? `- **Carta implicada:** ${report.cardName}` : null,
    `- **¿Qué pasó?:** ${report?.description || '(sin descripción)'}`,
    report?.expectedBehavior ? `- **Comportamiento esperado:** ${report.expectedBehavior}` : null
  ].filter(Boolean);

  if (d) {
    lines.push(
      '',
      '#### 📊 Estado de la Partida (Caja Negra)',
      `- **Turno:** ${d.turnNumber} | **Jugador activo:** ${d.activePlayer} | **Fase:** ${d.phase || 'N/A'} | **Mulligan:** ${d.mulliganDecided ? 'Sí' : 'No'} | **Overtime:** ${d.isOvertime ? 'Sí' : 'No'}`,
      `- **Mazos:** Jugador \`${d.playerDeckName || '?'}\` vs Bot \`${d.botDeckName || '?'}\``,
      `- **Jugador:** ${d.player?.gigsCount ?? 0} Gigs [${(d.player?.gigs || []).join(', ')}] | Eddies ${d.player?.eddiesReady ?? 0}/${d.player?.eddiesTotal ?? 0} (float: ${d.player?.floatingEddies ?? 0}) | Mano (${d.player?.handCount ?? 0}): ${(d.player?.hand || []).join(', ') || 'vacía'}`,
      `  - Leyendas Jugador: ${(d.player?.legends || []).map((l) => `#${l.slot} ${l.name} (${l.isFaceUp ? 'UP' : 'DOWN'}${l.isSpent ? ',SPENT' : ''}${l.isOnField ? ',FIELD' : ''})`).join(' | ') || 'ninguna'}`,
      `  - Campo Jugador: ${(d.player?.field || []).map((u) => `${u.name} [⚡${u.power}${u.isSpent ? ',SPENT' : ''}${u.isLagging ? ',LAG' : ''}${u.gear?.length ? `,Gear:${u.gear.join('+')}` : ''}]`).join(' | ') || 'vacío'}`,
      `- **Bot:** ${d.bot?.gigsCount ?? 0} Gigs [${(d.bot?.gigs || []).join(', ')}] | Eddies ${d.bot?.eddiesReady ?? 0}/${d.bot?.eddiesTotal ?? 0} | Mano (${d.bot?.handCount ?? 0})`,
      `  - Leyendas Bot: ${(d.bot?.legends || []).map((l) => `#${l.slot} ${l.name} (${l.isFaceUp ? 'UP' : 'DOWN'}${l.isSpent ? ',SPENT' : ''}${l.isOnField ? ',FIELD' : ''})`).join(' | ') || 'ninguna'}`,
      `  - Campo Bot: ${(d.bot?.field || []).map((u) => `${u.name} [⚡${u.power}${u.isSpent ? ',SPENT' : ''}${u.isLagging ? ',LAG' : ''}${u.gear?.length ? `,Gear:${u.gear.join('+')}` : ''}]`).join(' | ') || 'vacío'}`
    );

    if (d.pending?.reaction || d.pending?.targetSelection || d.pending?.cardChoice) {
      lines.push(`- **Pendiente en UI:** \`${JSON.stringify(d.pending)}\``);
    }

    if (Array.isArray(d.runtimeErrors) && d.runtimeErrors.length > 0) {
      lines.push('', '#### 💥 Errores JS Capturados');
      d.runtimeErrors.forEach((e) => {
        lines.push(`- [${e.kind}] ${e.message}${e.stack ? ` (${e.stack.split('\n')[0]})` : ''}`);
      });
    }

    if (Array.isArray(d.actionLog) && d.actionLog.length > 0) {
      lines.push('', '#### 📜 Últimas acciones (más reciente primero)', '```text');
      d.actionLog.slice(0, 30).forEach((entry) => lines.push(entry));
      lines.push('```');
    }

    if (d.environment) {
      lines.push(
        `- **Entorno:** ${d.environment.viewport || '?'} | ${d.environment.capturedAt || ''}`
      );
    }
  }

  return lines.join('\n');
}
