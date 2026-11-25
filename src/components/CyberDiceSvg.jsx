import React from 'react';

/**
 * CyberDiceSvg.jsx
 * Iconos geométricos poliédricos SVG estilo Cyberpunk para dados Fixer y Gigs activos:
 * - d4: triángulo
 * - d6: cuadrado
 * - d8: rombo
 * - d10: diamante alargado
 * - d12: pentágono
 * - d20: hexágono
 */

export function normalizeDieType(die) {
  if (typeof die === 'number') return `d${die}`;
  const raw = String(die?.type || die?.dieType || die?.sides || die || 'd6')
    .toLowerCase()
    .trim();
  if (raw.includes('20')) return 'd20';
  if (raw.includes('12')) return 'd12';
  if (raw.includes('10')) return 'd10';
  if (raw.includes('8')) return 'd8';
  if (raw.includes('4')) return 'd4';
  return 'd6';
}

export function getDieMaxSides(die) {
  const t = normalizeDieType(die);
  return parseInt(t.replace('d', ''), 10) || 6;
}

function getPolygonPoints(dieType) {
  switch (dieType) {
    case 'd4':
      return '50,8 92,86 8,86';
    case 'd6':
      return '14,14 86,14 86,86 14,86';
    case 'd8':
      return '50,6 92,50 50,94 8,50';
    case 'd10':
      return '50,6 88,42 50,94 12,42';
    case 'd12':
      return '50,6 92,36 76,88 24,88 8,36';
    case 'd20':
    default:
      return '50,6 88,28 88,72 50,94 12,72 12,28';
  }
}

export function CyberDieShape({
  dieType = 'd6',
  value = null,
  size = 44,
  color = '#0dfceb',
  fillColor = 'rgba(7, 10, 16, 0.85)',
  selected = false,
  dimmed = false,
  showLabelBelow = false,
  showProgressBar = false,
  className = ''
}) {
  const norm = normalizeDieType(dieType);
  const maxSides = getDieMaxSides(norm);
  const points = getPolygonPoints(norm);
  const displayText = value !== null && value !== undefined ? String(value) : norm;
  const pct =
    value !== null && value !== undefined
      ? Math.max(8, Math.min(100, Math.round((Number(value) / maxSides) * 100)))
      : 0;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none transition-transform ${
        dimmed ? 'opacity-30 grayscale' : 'opacity-100'
      } ${selected ? 'scale-110' : ''} ${className}`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          filter: selected
            ? `drop-shadow(0 0 10px ${color})`
            : dimmed
            ? 'none'
            : `drop-shadow(0 0 5px ${color}66)`
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <polygon
            points={points}
            fill={selected ? `${color}30` : fillColor}
            stroke={color}
            strokeWidth={selected ? 5.5 : 4.2}
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-mono font-black tracking-tight"
          style={{
            color: selected ? '#ffffff' : value !== null ? '#ffffff' : color,
            fontSize: value !== null ? Math.max(11, Math.round(size * 0.36)) : Math.max(9, Math.round(size * 0.27)),
            paddingTop: norm === 'd4' ? Math.round(size * 0.16) : 0
          }}
        >
          {displayText}
        </span>
      </div>

      {showProgressBar && value !== null && value !== undefined && (
        <div className="w-full flex items-center gap-1 mt-0.5 px-0.5">
          <div className="h-1 flex-1 bg-gray-800/90 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[8px] font-mono text-gray-400 leading-none">{norm}</span>
        </div>
      )}

      {showLabelBelow && !showProgressBar && (
        <span className="text-[9px] font-mono uppercase text-gray-400 mt-0.5 leading-none">
          {norm}
        </span>
      )}
    </div>
  );
}
