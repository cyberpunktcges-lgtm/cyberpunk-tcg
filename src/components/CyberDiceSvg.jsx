import React, { useId } from 'react';

/**
 * CyberDiceSvg.jsx
 * Dados poliédricos 3D facetados SVG estilo Cyberpunk (D4, D6, D8, D10, D12, D20):
 * - Geometría real multifaceta con iluminación cenital, caras laterales sombreadas,
 *   aristas especulares y sombra proyectada en la base.
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

/**
 * Definición 3D de cada dado (viewBox 0 0 100 100):
 * - facets: polígonos con nivel de brillo ('hi' | 'front' | 'mid' | 'shade' | 'deep')
 * - outline: silueta exterior para el borde neón principal
 * - specular: aristas superiores con brillo cristalino blanco
 * - textPos: posición óptima (x%, y%) del número sobre la cara frontal
 */
function get3DGeometry(dieType) {
  switch (dieType) {
    case 'd4':
      // Tetraedro 3D (pirámide triangular con dos caras visibles + base en perspectiva)
      return {
        outline: '50,7 91,78 52,92 9,80',
        facets: [
          { points: '50,7 9,80 52,92', tone: 'front' },
          { points: '50,7 52,92 91,78', tone: 'shade' },
          { points: '50,7 22,56 52,66', tone: 'hi' }
        ],
        ridges: ['50,7 52,92'],
        specular: '9,80 50,7 72,44',
        textPos: { x: 43, y: 63 }
      };

    case 'd6':
      // Cubo 3D en perspectiva (cara frontal amplia + cara superior iluminada + cara lateral derecha sombreada)
      return {
        outline: '30,9 88,9 88,71 70,89 12,89 12,27',
        facets: [
          { points: '12,27 30,9 88,9 70,27', tone: 'hi' },
          { points: '12,27 70,27 70,89 12,89', tone: 'front' },
          { points: '70,27 88,9 88,71 70,89', tone: 'deep' }
        ],
        ridges: ['12,27 70,27 70,89', '70,27 88,9'],
        specular: '12,27 30,9 88,9',
        textPos: { x: 41, y: 58 }
      };

    case 'd8':
      // Octaedro 3D (triángulo frontal brillante rodeado de 5 facetas biseladas)
      return {
        outline: '50,5 91,49 50,94 9,49',
        facets: [
          { points: '50,5 9,49 22,58 50,17', tone: 'hi' },
          { points: '50,5 91,49 78,58 50,17', tone: 'mid' },
          { points: '50,17 78,58 22,58', tone: 'front' },
          { points: '9,49 22,58 50,94', tone: 'shade' },
          { points: '22,58 78,58 50,94', tone: 'shade' },
          { points: '78,58 91,49 50,94', tone: 'deep' }
        ],
        ridges: ['50,17 78,58 22,58 50,17', '50,5 50,17', '9,49 22,58', '91,49 78,58', '22,58 50,94', '78,58 50,94'],
        specular: '9,49 50,5 91,49',
        textPos: { x: 50, y: 46 }
      };

    case 'd10':
      // Trapezoedro pentagonal 3D (cometa central cristalina + 4 facetas laterales)
      return {
        outline: '50,5 90,44 82,65 50,95 18,65 10,44',
        facets: [
          { points: '50,5 10,44 26,49 50,11', tone: 'hi' },
          { points: '50,5 90,44 74,49 50,11', tone: 'mid' },
          { points: '50,11 74,49 50,74 26,49', tone: 'front' },
          { points: '10,44 18,65 50,95 50,74 26,49', tone: 'shade' },
          { points: '90,44 82,65 50,95 50,74 74,49', tone: 'deep' }
        ],
        ridges: ['50,11 74,49 50,74 26,49 50,11', '10,44 26,49', '90,44 74,49', '50,74 50,95'],
        specular: '10,44 50,5 90,44',
        textPos: { x: 50, y: 46 }
      };

    case 'd12':
      // Dodecaedro 3D (pentágono frontal central + 5 caras trapezoidales biseladas)
      return {
        outline: '50,5 79,15 94,40 87,70 67,90 33,90 13,70 6,40 21,15',
        facets: [
          { points: '21,15 50,5 79,15 50,21', tone: 'hi' },
          { points: '6,40 21,15 50,21 25,40', tone: 'hi' },
          { points: '79,15 94,40 75,40 50,21', tone: 'mid' },
          { points: '50,21 75,40 65,70 35,70 25,40', tone: 'front' },
          { points: '6,40 25,40 35,70 13,70', tone: 'shade' },
          { points: '75,40 94,40 87,70 65,70', tone: 'deep' },
          { points: '13,70 35,70 65,70 87,70 67,90 33,90', tone: 'deep' }
        ],
        ridges: [
          '50,21 75,40 65,70 35,70 25,40 50,21',
          '50,5 50,21',
          '6,40 25,40',
          '94,40 75,40',
          '13,70 35,70',
          '87,70 65,70'
        ],
        specular: '6,40 21,15 50,5 79,15',
        textPos: { x: 50, y: 49 }
      };

    case 'd20':
    default:
      // Icosaedro 3D clásico (triángulo central + 9 facetas triangulares en volumen)
      return {
        outline: '50,5 89,27 89,73 50,95 11,73 11,27',
        facets: [
          { points: '50,5 11,27 50,22', tone: 'hi' },
          { points: '50,5 89,27 50,22', tone: 'mid' },
          { points: '11,27 50,22 23,66', tone: 'hi' },
          { points: '89,27 50,22 77,66', tone: 'mid' },
          { points: '50,22 77,66 23,66', tone: 'front' },
          { points: '11,27 23,66 11,73', tone: 'shade' },
          { points: '89,27 89,73 77,66', tone: 'deep' },
          { points: '11,73 23,66 50,95', tone: 'shade' },
          { points: '23,66 77,66 50,95', tone: 'deep' },
          { points: '77,66 89,73 50,95', tone: 'deep' }
        ],
        ridges: [
          '50,22 77,66 23,66 50,22',
          '50,5 50,22',
          '11,27 50,22',
          '89,27 50,22',
          '11,27 23,66',
          '89,27 77,66',
          '11,73 23,66',
          '89,73 77,66',
          '23,66 50,95',
          '77,66 50,95'
        ],
        specular: '11,27 50,5 89,27',
        textPos: { x: 50, y: 52 }
      };
  }
}

export function CyberDieShape({
  dieType = 'd6',
  value = null,
  size = 48,
  color = '#0dfceb',
  fillColor = null,
  selected = false,
  dimmed = false,
  showLabelBelow = false,
  showProgressBar = false,
  className = ''
}) {
  const uid = useId().replace(/:/g, '');
  const norm = normalizeDieType(dieType);
  const maxSides = getDieMaxSides(norm);
  const geom = get3DGeometry(norm);
  const displayText = value !== null && value !== undefined ? String(value) : norm.toUpperCase();
  const pct =
    value !== null && value !== undefined
      ? Math.max(8, Math.min(100, Math.round((Number(value) / maxSides) * 100)))
      : 0;

  // Paleta de sombreado 3D basada en el color neón del dado
  const toneFill = {
    hi: `url(#die-hi-${uid})`,
    front: `url(#die-front-${uid})`,
    mid: `url(#die-mid-${uid})`,
    shade: `url(#die-shade-${uid})`,
    deep: `url(#die-deep-${uid})`
  };

  const hasVal = value !== null && value !== undefined;
  const fontSize = hasVal
    ? Math.max(12, Math.round(size * (String(displayText).length >= 2 ? 0.34 : 0.40)))
    : Math.max(8, Math.round(size * 0.24));

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
            ? `drop-shadow(0 5px 10px rgba(0,0,0,0.85)) drop-shadow(0 0 12px ${color})`
            : dimmed
            ? 'none'
            : `drop-shadow(0 5px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 6px ${color}66)`
        }}
      >
        <svg viewBox="0 0 100 104" className="w-full h-full overflow-visible">
          <defs>
            {/* Gradiente cara superior iluminada */}
            <linearGradient id={`die-hi-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={selected ? '0.45' : '0.30'} />
              <stop offset="45%" stopColor={color} stopOpacity={selected ? '0.52' : '0.36'} />
              <stop offset="100%" stopColor="#0b1322" stopOpacity="0.88" />
            </linearGradient>

            {/* Gradiente cara frontal principal (contraste alto para el número) */}
            <linearGradient id={`die-front-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={selected ? '0.42' : '0.26'} />
              <stop offset="55%" stopColor={fillColor || '#0c1526'} stopOpacity="0.94" />
              <stop offset="100%" stopColor="#04070e" stopOpacity="0.98" />
            </linearGradient>

            {/* Gradiente cara lateral media */}
            <linearGradient id={`die-mid-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={selected ? '0.32' : '0.20'} />
              <stop offset="100%" stopColor="#060b14" stopOpacity="0.95" />
            </linearGradient>

            {/* Gradiente cara sombreada */}
            <linearGradient id={`die-shade-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a1220" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#020408" stopOpacity="0.98" />
            </linearGradient>

            {/* Gradiente sombra profunda (lado derecho / inferior) */}
            <linearGradient id={`die-deep-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#060a14" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#010205" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Sombra proyectada sobre la mesa para sensación 3D flotante */}
          <ellipse cx="50" cy="97" rx="30" ry="5.5" fill="rgba(0,0,0,0.62)" />

          {/* Base sólida oscura detrás de las facetas para evitar grietas sub-píxel */}
          <polygon points={geom.outline} fill="#04070e" />

          {/* Facetas 3D con iluminación diferenciada */}
          {geom.facets.map((f, i) => (
            <polygon
              key={i}
              points={f.points}
              fill={toneFill[f.tone] || toneFill.front}
              stroke={color}
              strokeOpacity="0.28"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          ))}

          {/* Aristas interiores cristalinas */}
          {geom.ridges.map((pts, i) => (
            <polyline
              key={`r-${i}`}
              points={pts}
              fill="none"
              stroke={color}
              strokeOpacity={selected ? '0.72' : '0.46'}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Silueta exterior neón principal */}
          <polygon
            points={geom.outline}
            fill="none"
            stroke={color}
            strokeWidth={selected ? 4.4 : 3.4}
            strokeLinejoin="round"
          />

          {/* Brillo especular en aristas superiores */}
          <polyline
            points={geom.specular}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={selected ? '0.82' : '0.52'}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Número / Tipo centrado exactamente en la cara frontal 3D */}
        <span
          className="absolute font-mono font-black tracking-tight leading-none pointer-events-none"
          style={{
            left: `${geom.textPos.x}%`,
            top: `${geom.textPos.y}%`,
            transform: 'translate(-50%, -50%)',
            color: selected ? '#ffffff' : hasVal ? '#ffffff' : color,
            fontSize,
            textShadow: hasVal
              ? `0 2px 4px rgba(0,0,0,0.95), 0 0 10px ${color}`
              : '0 1px 3px rgba(0,0,0,0.95)'
          }}
        >
          {displayText}
        </span>
      </div>

      {showProgressBar && hasVal && (
        <div className="w-full flex items-center gap-1 mt-0.5 px-0.5">
          <div className="h-1 flex-1 bg-gray-800/90 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[8.5px] font-mono font-bold text-gray-300 leading-none uppercase">{norm}</span>
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
