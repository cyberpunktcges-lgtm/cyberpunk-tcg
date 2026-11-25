import React, { useEffect, useState } from 'react';

/**
 * CyberAttackArrowOverlay.jsx
 * Dibuja flechas curvas Bézier SVG animadas con brillo neón directamente sobre el tablero:
 * - Ataque del jugador siguiendo el cursor (cian brillante) hacia Unidades rivales o Gigs
 * - Ataque del Bot / Rival (rojo/magenta animado discontinuo) desde la carta atacante hasta el objetivo
 * - Jugadas del rival (Programas, Habilidades, Gears, Bloqueos, Robos de Gig) con etiqueta flotante
 *
 * Usa atributos `data-arrow-anchor="<id>"` colocados en cartas, Leyendas, Gigs, Trash y zonas.
 * Acepta tanto un ID string como un array de IDs fallback `[primaryId, fallbackId, ...]`.
 */

function resolveSingleAnchor(anchorId) {
  if (typeof document === 'undefined' || !anchorId) return null;
  const nodes = document.querySelectorAll(`[data-arrow-anchor="${CSS.escape(String(anchorId))}"]`);
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
  }
  return null;
}

function getAnchorCenter(anchorOrList) {
  if (!anchorOrList) return null;
  if (Array.isArray(anchorOrList)) {
    for (const candidate of anchorOrList) {
      const pt = resolveSingleAnchor(candidate);
      if (pt) return pt;
    }
    return null;
  }
  return resolveSingleAnchor(anchorOrList);
}

function buildCurvedGeometry(from, to, variantIndex = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const spread = variantIndex === 0 ? 0 : (variantIndex % 2 === 1 ? 1 : -1) * Math.ceil(variantIndex / 2) * 38;
  const arcOffset = Math.min(120, Math.max(38, dist * 0.24));
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const cy = my - arcOffset * (Math.abs(dx) > 80 ? 0.72 : 0.35) + spread * 0.45;
  const cx = (Math.abs(dx) <= 80 ? mx - arcOffset * 0.48 : mx) + spread;

  // Punto medio exacto de la curva Bézier cuadrática (t = 0.5)
  const midX = 0.25 * from.x + 0.5 * cx + 0.25 * to.x;
  const midY = 0.25 * from.y + 0.5 * cy + 0.25 * to.y;

  return {
    d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    mid: { x: midX, y: midY }
  };
}

export default function CyberAttackArrowOverlay({
  arrows = [], // [{ id, fromAnchor, toAnchor, toPoint, color, dashed, label, pulseTarget }]
  liveFromAnchor = null, // Si el jugador está apuntando con el ratón desde esta carta
  liveColor = '#0dfceb'
}) {
  const [mousePos, setMousePos] = useState(null);
  const [, setTick] = useState(0);

  // Seguir el ratón cuando hay apuntado en vivo
  useEffect(() => {
    if (!liveFromAnchor) {
      setMousePos(null);
      return;
    }
    const onMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [liveFromAnchor]);

  // Recalcular posiciones si la ventana cambia de tamaño o se desplaza
  useEffect(() => {
    if (!liveFromAnchor && arrows.length === 0) return;
    const bump = () => setTick((t) => (t + 1) % 10000);
    window.addEventListener('resize', bump);
    window.addEventListener('scroll', bump, true);
    const interval = window.setInterval(bump, 220);
    return () => {
      window.removeEventListener('resize', bump);
      window.removeEventListener('scroll', bump, true);
      window.clearInterval(interval);
    };
  }, [liveFromAnchor, arrows.length]);

  const resolvedArrows = [];

  arrows.forEach((arrow, idx) => {
    const from = getAnchorCenter(arrow.fromAnchor);
    const to = arrow.toPoint || getAnchorCenter(arrow.toAnchor);
    if (from && to) {
      // Evitar flechas degeneradas de longitud ~0
      if (Math.hypot(to.x - from.x, to.y - from.y) < 12) return;
      const safeId = String(arrow.id || `arrow-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const geom = buildCurvedGeometry(from, to, idx);
      resolvedArrows.push({
        id: safeId,
        from,
        to,
        d: geom.d,
        mid: geom.mid,
        color: arrow.color || '#FF003C',
        dashed: arrow.dashed !== false,
        label: arrow.label || null,
        pulseTarget: arrow.pulseTarget !== false
      });
    }
  });

  if (liveFromAnchor && mousePos) {
    const from = getAnchorCenter(liveFromAnchor);
    if (from) {
      const geom = buildCurvedGeometry(from, mousePos, 0);
      resolvedArrows.push({
        id: 'live-targeting-arrow',
        from,
        to: mousePos,
        d: geom.d,
        mid: geom.mid,
        color: liveColor,
        dashed: false,
        label: null,
        pulseTarget: false
      });
    }
  }

  if (resolvedArrows.length === 0) return null;

  return (
    <>
      <svg
        className="fixed inset-0 w-screen h-screen pointer-events-none z-[48] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <style>{`
            @keyframes cyberArrowFlow {
              from { stroke-dashoffset: 36; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes cyberTargetPulse {
              0% { transform: scale(0.85); opacity: 0.9; }
              70% { transform: scale(1.45); opacity: 0.15; }
              100% { transform: scale(1.55); opacity: 0; }
            }
          `}</style>
          {resolvedArrows.map((a) => (
            <marker
              key={`marker-${a.id}`}
              id={`cyber-arrowhead-${a.id}`}
              viewBox="0 0 14 14"
              refX="10"
              refY="7"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 1 1 L 13 7 L 1 13 L 4 7 z" fill={a.color} />
            </marker>
          ))}
        </defs>

        {resolvedArrows.map((a) => (
          <g key={a.id} style={{ filter: `drop-shadow(0 0 8px ${a.color})` }}>
            {/* Halo exterior suave */}
            <path
              d={a.d}
              fill="none"
              stroke={a.color}
              strokeWidth="10"
              strokeOpacity="0.18"
              strokeLinecap="round"
            />
            {/* Trazo principal */}
            <path
              d={a.d}
              fill="none"
              stroke={a.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={a.dashed ? '12 6' : undefined}
              markerEnd={`url(#cyber-arrowhead-${a.id})`}
              style={
                a.dashed
                  ? { animation: 'cyberArrowFlow 0.7s linear infinite' }
                  : undefined
              }
            />
            {/* Punto de origen */}
            <circle cx={a.from.x} cy={a.from.y} r="6" fill={a.color} fillOpacity="0.9" />
            <circle cx={a.from.x} cy={a.from.y} r="11" fill="none" stroke={a.color} strokeWidth="2" strokeOpacity="0.55" />

            {/* Retícula pulsante en el objetivo */}
            {a.pulseTarget && (
              <>
                <circle
                  cx={a.to.x}
                  cy={a.to.y}
                  r="18"
                  fill="none"
                  stroke={a.color}
                  strokeWidth="2.5"
                  strokeOpacity="0.85"
                />
                <circle
                  cx={a.to.x}
                  cy={a.to.y}
                  r="24"
                  fill="none"
                  stroke={a.color}
                  strokeWidth="2"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: 'cyberTargetPulse 1.2s ease-out infinite'
                  }}
                />
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Etiquetas flotantes en el punto medio de cada flecha con label */}
      <div className="fixed inset-0 pointer-events-none z-[49] overflow-hidden" aria-hidden="true">
        {resolvedArrows
          .filter((a) => a.label)
          .map((a) => (
            <div
              key={`lbl-${a.id}`}
              style={{
                left: `${a.mid.x}px`,
                top: `${a.mid.y}px`,
                borderColor: a.color,
                boxShadow: `0 0 16px ${a.color}66`
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#070a10]/95 border text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-white whitespace-nowrap max-w-[240px] truncate backdrop-blur-sm"
            >
              {a.label}
            </div>
          ))}
      </div>
    </>
  );
}
