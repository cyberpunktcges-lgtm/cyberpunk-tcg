import React, { useEffect, useState } from 'react';

/**
 * CyberAttackArrowOverlay.jsx
 * Dibuja flechas curvas Bézier SVG animadas con brillo neón directamente sobre el tablero:
 * - Ataque del jugador siguiendo el cursor (cian brillante) hacia Unidades rivales o Gigs
 * - Ataque del Bot / Rival (rojo/magenta animado discontinuo) desde la carta atacante hasta el objetivo
 * - Bloqueo / Habilidad dirigida (amarillo o cian)
 *
 * Usa atributos `data-arrow-anchor="<id>"` colocados en las cartas y cajas de Gigs.
 */

function getAnchorCenter(anchorId) {
  if (typeof document === 'undefined' || !anchorId) return null;
  const el = document.querySelector(`[data-arrow-anchor="${CSS.escape(String(anchorId))}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function buildCurvedPath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const arcOffset = Math.min(110, Math.max(35, dist * 0.24));
  // Curva elegante arqueada hacia arriba/exterior
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - arcOffset * (Math.abs(dx) > 80 ? 0.75 : 0.35);
  const cx = Math.abs(dx) <= 80 ? mx - arcOffset * 0.45 : mx;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${my.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export default function CyberAttackArrowOverlay({
  arrows = [], // [{ id, fromAnchor, toAnchor, toPoint, color, dashed, label }]
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

  for (const arrow of arrows) {
    const from = getAnchorCenter(arrow.fromAnchor);
    const to = arrow.toPoint || getAnchorCenter(arrow.toAnchor);
    if (from && to) {
      resolvedArrows.push({
        id: arrow.id || `${arrow.fromAnchor}->${arrow.toAnchor}`,
        from,
        to,
        color: arrow.color || '#FF003C',
        dashed: arrow.dashed !== false,
        label: arrow.label || null
      });
    }
  }

  if (liveFromAnchor && mousePos) {
    const from = getAnchorCenter(liveFromAnchor);
    if (from) {
      resolvedArrows.push({
        id: 'live-targeting-arrow',
        from,
        to: mousePos,
        color: liveColor,
        dashed: false,
        label: null
      });
    }
  }

  if (resolvedArrows.length === 0) return null;

  return (
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

      {resolvedArrows.map((a) => {
        const d = buildCurvedPath(a.from, a.to);
        return (
          <g key={a.id} style={{ filter: `drop-shadow(0 0 8px ${a.color})` }}>
            {/* Halo exterior suave */}
            <path
              d={d}
              fill="none"
              stroke={a.color}
              strokeWidth="10"
              strokeOpacity="0.18"
              strokeLinecap="round"
            />
            {/* Trazo principal */}
            <path
              d={d}
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
          </g>
        );
      })}
    </svg>
  );
}
