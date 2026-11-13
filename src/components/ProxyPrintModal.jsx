import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Info,
  Maximize2,
  FileText,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

/**
 * ProxyPrintModal
 * Generador de hojas A4 en rejilla 3x3 con marcas de corte y regla de calibración de 50 mm,
 * idéntico al estándar internacional de TCGs (Choombattler / MTGPrint).
 */
export default function ProxyPrintModal({
  isOpen,
  onClose,
  deckName = 'Mazo Cyberpunk TCG',
  cards = [],
  legends = [],
  sideboard = []
}) {
  const [includeLegends, setIncludeLegends] = useState(true);
  const [includeMain, setIncludeMain] = useState(true);
  const [includeSideboard, setIncludeSideboard] = useState(false);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // 1. Expandir todas las cartas según su cantidad (qty) sin duplicar leyendas
  const expandedCards = useMemo(() => {
    const list = [];
    const includedLegendKeys = new Set();

    // Leyendas (líderes)
    if (includeLegends && Array.isArray(legends) && legends.length > 0) {
      legends.forEach((leg) => {
        const count = leg.qty || 1;
        for (let i = 0; i < count; i++) {
          list.push({ ...leg, isLegend: true, group: 'LEYENDA' });
        }
        if (leg.id) includedLegendKeys.add(leg.id);
        if (leg.cardId) includedLegendKeys.add(leg.cardId);
        if (leg.name) includedLegendKeys.add(leg.name.toLowerCase());
      });
    }

    // Baraja Principal
    if (includeMain && Array.isArray(cards)) {
      cards.forEach((card) => {
        const isLeg =
          card.officialType === 'LEGEND' ||
          (card.cardType || '').toUpperCase().includes('LEGEND');

        // Si es leyenda y ya fue incluida en la sección de leyendas, evitar duplicado
        if (
          isLeg &&
          (includedLegendKeys.has(card.id) ||
            includedLegendKeys.has(card.cardId) ||
            includedLegendKeys.has((card.name || '').toLowerCase()))
        ) {
          return;
        }

        // Si es leyenda pero el usuario desactivó las leyendas
        if (isLeg && !includeLegends) {
          return;
        }

        const count = card.qty || 1;
        for (let i = 0; i < count; i++) {
          list.push({ ...card, isMain: !isLeg, isLegend: isLeg, group: isLeg ? 'LEYENDA' : 'PRINCIPAL' });
        }
      });
    }

    // Banquillo (Sideboard)
    if (includeSideboard && Array.isArray(sideboard)) {
      sideboard.forEach((sb) => {
        const count = sb.qty || 1;
        for (let i = 0; i < count; i++) {
          list.push({ ...sb, isSideboard: true, group: 'BANQUILLO' });
        }
      });
    }

    return list;
  }, [cards, legends, sideboard, includeLegends, includeMain, includeSideboard]);

  // Conteo preciso de tipos de carta
  const legendCount = useMemo(() => {
    if (Array.isArray(legends) && legends.length > 0) {
      return legends.reduce((acc, c) => acc + (c.qty || 1), 0);
    }
    if (Array.isArray(cards)) {
      return cards
        .filter(
          (c) =>
            c.officialType === 'LEGEND' ||
            (c.cardType || '').toUpperCase().includes('LEGEND')
        )
        .reduce((acc, c) => acc + (c.qty || 1), 0);
    }
    return 0;
  }, [legends, cards]);

  const mainCount = useMemo(() => {
    if (!Array.isArray(cards)) return 0;
    const hasExplicitLegends = Array.isArray(legends) && legends.length > 0;
    return cards
      .filter((c) => {
        if (hasExplicitLegends) return true;
        return (
          c.officialType !== 'LEGEND' &&
          !(c.cardType || '').toUpperCase().includes('LEGEND')
        );
      })
      .reduce((acc, c) => acc + (c.qty || 1), 0);
  }, [cards, legends]);

  const sideboardCount = useMemo(() => {
    return Array.isArray(sideboard)
      ? sideboard.reduce((acc, c) => acc + (c.qty || 1), 0)
      : 0;
  }, [sideboard]);

  // 2. Agrupar en hojas de 9 cartas (rejilla 3x3 para A4)
  const CARDS_PER_PAGE = 9;
  const sheets = useMemo(() => {
    const pages = [];
    for (let i = 0; i < expandedCards.length; i += CARDS_PER_PAGE) {
      pages.push(expandedCards.slice(i, i + CARDS_PER_PAGE));
    }
    return pages;
  }, [expandedCards]);

  // Ajustar el índice de hoja si cambia el filtro
  const totalSheets = sheets.length;
  const currentSheetIndex = Math.min(selectedSheetIndex, Math.max(0, totalSheets - 1));
  const currentSheet = sheets[currentSheetIndex] || [];

  if (!isOpen) return null;

  // 3. Generar e iniciar la impresión nativa en alta resolución
  const handlePrint = () => {
    setIsPreparingPrint(true);

    // Creamos una ventana de impresión limpia e independiente
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes en tu navegador para abrir el visor de impresión de proxys.');
      setIsPreparingPrint(false);
      return;
    }

    // Construcción del HTML para cada hoja A4
    const sheetsHtml = sheets
      .map((sheetCards, sheetIdx) => {
        // Rellenar hasta 9 cartas para mantener la geometría de corte
        const gridItems = Array.from({ length: 9 }).map((_, idx) => {
          const card = sheetCards[idx];
          if (!card) {
            return `
              <div class="proxy-card empty">
                <div class="empty-placeholder">
                  <span>ESPACIO VACÍO</span>
                </div>
              </div>
            `;
          }

          const fallbackImg = '/images/wallpapers/Night_City_3840x2160.png';
          const cardImg = card.image || fallbackImg;

          return `
            <div class="proxy-card">
              <img src="${cardImg}" alt="${card.name || 'Carta Cyberpunk'}" loading="eager" />
              <div class="card-hairline-border"></div>
            </div>
          `;
        }).join('');

        return `
          <div class="proxy-sheet">
            <!-- Guías de corte en márgenes -->
            ${
              showCropMarks
                ? `
              <!-- Guías superiores (verticales) -->
              <div class="crop-mark-v" style="left: 10.5mm; top: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 73.5mm; top: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 136.5mm; top: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 199.5mm; top: 0; height: 12mm;"></div>

              <!-- Guías inferiores (verticales) -->
              <div class="crop-mark-v" style="left: 10.5mm; bottom: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 73.5mm; bottom: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 136.5mm; bottom: 0; height: 12mm;"></div>
              <div class="crop-mark-v" style="left: 199.5mm; bottom: 0; height: 12mm;"></div>

              <!-- Guías laterales izquierdas (horizontales) -->
              <div class="crop-mark-h" style="top: 16mm; left: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 104mm; left: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 192mm; left: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 280mm; left: 0; width: 7mm;"></div>

              <!-- Guías laterales derechas (horizontales) -->
              <div class="crop-mark-h" style="top: 16mm; right: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 104mm; right: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 192mm; right: 0; width: 7mm;"></div>
              <div class="crop-mark-h" style="top: 280mm; right: 0; width: 7mm;"></div>
            `
                : ''
            }

            <!-- Cabecera de calibración (50 mm) -->
            <div class="sheet-header">
              ${
                showRuler
                  ? `
                <div class="ruler-container">
                  <div class="ruler-line">
                    <div class="ruler-tick left"></div>
                    <span class="ruler-label">50 mm</span>
                    <div class="ruler-tick right"></div>
                  </div>
                  <div class="ruler-text">
                    Esta línea debe medir exactamente 50 mm al imprimir. Si no coincide, imprime al 100% de escala (desactiva "Ajustar a la página").
                  </div>
                </div>
              `
                  : '<div></div>'
              }
              <div class="sheet-index-tag">
                cyberpunktcg.es // PROXY SHEET ${sheetIdx + 1}/${totalSheets}
              </div>
            </div>

            <!-- Rejilla 3x3 de Cartas Oficiales (63mm x 88mm) -->
            <div class="sheet-grid">
              ${gridItems}
            </div>

            <!-- Pie de página con información y descargo de responsabilidad -->
            <div class="sheet-footer">
              <div class="footer-left">
                <strong>${deckName.toUpperCase()}</strong> · Hoja ${sheetIdx + 1} de ${totalSheets} · cyberpunktcg.es
              </div>
              <div class="footer-right">
                Este es un trabajo de fans no oficial. No está aprobado ni respaldado por CD PROJEKT RED.
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const fullDocumentHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${deckName} - Proxys para Imprimir (A4)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              background: #ffffff;
              color: #000000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .proxy-sheet {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              position: relative;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #ffffff;
              overflow: hidden;
            }

            /* Cabecera y regla de calibración */
            .sheet-header {
              position: absolute;
              top: 3.5mm;
              left: 10.5mm;
              right: 10.5mm;
              height: 11mm;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 7.5pt;
              color: #333333;
              line-height: 1.15;
            }

            .ruler-container {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 1.5mm;
            }

            .ruler-line {
              width: 50mm;
              height: 1px;
              background: #000000;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .ruler-tick {
              position: absolute;
              width: 1px;
              height: 7px;
              background: #000000;
              top: -3px;
            }

            .ruler-tick.left { left: 0; }
            .ruler-tick.right { right: 0; }

            .ruler-label {
              background: #ffffff;
              padding: 0 4px;
              font-size: 7pt;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, monospace;
              color: #000000;
            }

            .ruler-text {
              font-size: 6pt;
              color: #444444;
              max-width: 125mm;
            }

            .sheet-index-tag {
              font-size: 6.5pt;
              font-family: ui-monospace, SFMono-Regular, monospace;
              font-weight: 700;
              color: #555555;
              letter-spacing: 0.5px;
            }

            /* Rejilla de cartas 3x3 centrada */
            .sheet-grid {
              position: absolute;
              top: 16mm;
              left: 10.5mm;
              width: 189mm;
              height: 264mm;
              display: grid;
              grid-template-columns: repeat(3, 63mm);
              grid-template-rows: repeat(3, 88mm);
              gap: 0;
            }

            .proxy-card {
              width: 63mm;
              height: 88mm;
              position: relative;
              overflow: hidden;
              background: #000000;
            }

            .proxy-card img {
              width: 100%;
              height: 100%;
              object-fit: fill;
              display: block;
            }

            .proxy-card.empty {
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .empty-placeholder {
              width: calc(100% - 4mm);
              height: calc(100% - 4mm);
              border: 1px dashed #cccccc;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 7pt;
              color: #999999;
              font-family: monospace;
            }

            .card-hairline-border {
              position: absolute;
              inset: 0;
              border: 0.25mm solid rgba(0, 0, 0, 0.4);
              pointer-events: none;
            }

            /* Marcas de corte exteriores */
            .crop-mark-v {
              position: absolute;
              width: 0.25mm;
              background: #111111;
            }

            .crop-mark-h {
              position: absolute;
              height: 0.25mm;
              background: #111111;
            }

            /* Pie de página */
            .sheet-footer {
              position: absolute;
              bottom: 3.5mm;
              left: 10.5mm;
              right: 10.5mm;
              height: 8mm;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 6.5pt;
              color: #555555;
              border-top: 0.2mm solid #e5e7eb;
              padding-top: 1mm;
              font-family: ui-monospace, SFMono-Regular, monospace;
            }

            .footer-left {
              color: #222222;
            }

            .footer-right {
              color: #777777;
            }

            @media screen {
              body {
                background: #e5e7eb;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
              }

              .proxy-sheet {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
              }
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            // Esperar a que las imágenes terminen de cargar para disparar print
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 600);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullDocumentHtml);
    printWindow.document.close();
    setIsPreparingPrint(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="max-w-6xl w-full bg-[#070a10] border-2 border-[#00F0FF] shadow-[0_0_60px_rgba(0,240,255,0.35)] p-4 sm:p-6 space-y-6 relative rounded-none my-auto max-h-[95vh] flex flex-col"
      >
        {/* Barra Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-widest mb-1">
              <Printer className="w-4 h-4 text-[#FCEE0A]" />
              <span>IMPRESIÓN OFICIAL DE PROXYS // CYBERPUNK TCG</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              EXPORTAR HOJAS A4 <span className="text-[#FCEE0A]">(REJILLA 3×3)</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={expandedCards.length === 0 || isPreparingPrint}
              style={{ clipPath: CYBER_CLIP }}
              className="px-5 py-2.5 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-mono font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.4)] transition-all rounded-none disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{isPreparingPrint ? 'PREPARANDO...' : 'IMPRIMIR / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ clipPath: CYBER_CLIP }}
              className="p-2.5 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] cursor-pointer transition-colors"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Opciones y Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#000000] border border-gray-800 p-4 font-mono text-xs">
          {/* Qué incluir en la impresión */}
          <div className="md:col-span-8 flex flex-wrap items-center gap-4">
            <span className="text-[#FCEE0A] font-bold uppercase flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>INCLUIR:</span>
            </span>

            {legendCount > 0 && (
              <label className="flex items-center gap-2 text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLegends}
                  onChange={(e) => setIncludeLegends(e.target.checked)}
                  className="accent-[#FCEE0A] w-4 h-4 cursor-pointer"
                />
                <span>👑 Leyendas ({legendCount})</span>
              </label>
            )}

            <label className="flex items-center gap-2 text-gray-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMain}
                onChange={(e) => setIncludeMain(e.target.checked)}
                className="accent-[#00F0FF] w-4 h-4 cursor-pointer"
              />
              <span>🤖 Baraja Principal ({mainCount})</span>
            </label>

            {sideboardCount > 0 && (
              <label className="flex items-center gap-2 text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSideboard}
                  onChange={(e) => setIncludeSideboard(e.target.checked)}
                  className="accent-[#FF003C] w-4 h-4 cursor-pointer"
                />
                <span>⚙️ Banquillo ({sideboardCount})</span>
              </label>
            )}

            <span className="text-gray-700 hidden lg:inline">|</span>

            <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCropMarks}
                onChange={(e) => setShowCropMarks(e.target.checked)}
                className="accent-[#FCEE0A] w-4 h-4 cursor-pointer"
              />
              <span>Líneas de corte</span>
            </label>

            <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(e) => setShowRuler(e.target.checked)}
                className="accent-[#00F0FF] w-4 h-4 cursor-pointer"
              />
              <span>Regla 50 mm</span>
            </label>
          </div>

          {/* Estadísticas de la hoja */}
          <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3 text-[11px] text-[#00F0FF]">
            <span className="px-2.5 py-1 bg-[#070a10] border border-gray-800">
              {expandedCards.length} CARTAS EN TOTAL
            </span>
            <span className="px-2.5 py-1 bg-[#070a10] border border-[#FCEE0A]/40 text-[#FCEE0A] font-bold">
              {totalSheets} {totalSheets === 1 ? 'HOJA A4' : 'HOJAS A4'}
            </span>
          </div>
        </div>

        {/* Consejo para impresión a escala 100% */}
        <div className="bg-[#000000] border-l-4 border-[#FCEE0A] p-3 text-xs font-mono text-gray-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#FCEE0A] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[#FCEE0A] font-bold uppercase">
              Para que las cartas queden a tamaño real (63 mm × 88 mm):
            </span>
            <p className="text-[11px] text-gray-400">
              En el diálogo de impresión de tu navegador, elige <strong>"Guardar como PDF"</strong> o tu impresora y en <em>Más opciones de configuración</em> selecciona <strong>Escala: 100%</strong> o <strong>"Tamaño real"</strong> (desactiva <em>Ajustar a la página</em>). La regla superior de 50 mm te confirmará que la escala física es exacta.
            </p>
          </div>
        </div>

        {/* Selector de Hojas de Navegación */}
        {totalSheets > 1 && (
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {sheets.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSheetIndex(idx)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-3 py-1 font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
                    idx === currentSheetIndex
                      ? 'bg-[#00F0FF] text-[#070a10]'
                      : 'bg-[#000000] border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Hoja {idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={currentSheetIndex === 0}
                onClick={() => setSelectedSheetIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 bg-[#000000] border border-gray-800 hover:border-[#00F0FF] text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-gray-400">
                {currentSheetIndex + 1} / {totalSheets}
              </span>
              <button
                type="button"
                disabled={currentSheetIndex >= totalSheets - 1}
                onClick={() =>
                  setSelectedSheetIndex((prev) => Math.min(totalSheets - 1, prev + 1))
                }
                className="p-1.5 bg-[#000000] border border-gray-800 hover:border-[#00F0FF] text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Previsualizador en Pantalla de la Hoja A4 Seleccionada */}
        <div className="flex-1 overflow-y-auto bg-[#040609] p-4 sm:p-6 border border-gray-800 flex justify-center items-center">
          {expandedCards.length === 0 ? (
            <div className="text-center py-16 font-mono text-sm text-gray-500">
              No hay cartas seleccionadas para imprimir. Marca las casillas de arriba para incluir cartas.
            </div>
          ) : (
            <div
              className="bg-white text-black shadow-2xl relative transition-all"
              style={{
                width: '100%',
                maxWidth: '680px',
                aspectRatio: '210 / 297',
                padding: '4.8% 5% 5.5% 5%'
              }}
            >
              {/* Regla de 50mm y cabecera en la previsualización */}
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-gray-200 pb-2 mb-2">
                {showRuler ? (
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <div className="w-16 h-[2px] bg-black relative flex items-center justify-center">
                        <div className="absolute left-0 top-[-3px] w-[2px] h-[8px] bg-black"></div>
                        <span className="bg-white px-1 text-[8px] font-bold">50 mm</span>
                        <div className="absolute right-0 top-[-3px] w-[2px] h-[8px] bg-black"></div>
                      </div>
                    </div>
                    <span className="text-[7px] text-gray-500 mt-0.5">
                      Calibración de escala 100% (Choombattler standard)
                    </span>
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                  {deckName} · Hoja {currentSheetIndex + 1} de {totalSheets}
                </div>
              </div>

              {/* Rejilla 3x3 */}
              <div className="grid grid-cols-3 grid-rows-3 gap-0 w-full h-[88%] border border-gray-400">
                {Array.from({ length: 9 }).map((_, idx) => {
                  const card = currentSheet[idx];
                  if (!card) {
                    return (
                      <div
                        key={idx}
                        className="border border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                      >
                        <span className="text-[8px] text-gray-400 font-mono">VACÍO</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      className="relative overflow-hidden bg-black border border-black/30 group"
                    >
                      <img
                        src={card.image || '/images/wallpapers/Night_City_3840x2160.png'}
                        alt={card.name}
                        className="w-full h-full object-fill"
                      />
                      {showCropMarks && (
                        <div className="absolute inset-0 border-[0.5px] border-black/40 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pie de página de la hoja */}
              <div className="mt-2 pt-1 border-t border-gray-200 flex justify-between text-[7px] font-mono text-gray-500">
                <span>cyberpunktcg.es // Generador de Proxys</span>
                <span>Fan work no oficial · CD PROJEKT RED</span>
              </div>
            </div>
          )}
        </div>

        {/* Botón Inferior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-800 pt-4">
          <div className="text-xs font-mono text-gray-400">
            Total a imprimir: <span className="text-[#00F0FF] font-bold">{expandedCards.length} cartas</span> distribuidas en <span className="text-[#FCEE0A] font-bold">{totalSheets} páginas A4</span>.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 hover:border-gray-600 text-gray-300 font-mono text-xs uppercase cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={expandedCards.length === 0 || isPreparingPrint}
              style={{ clipPath: CYBER_CLIP }}
              className="px-6 py-2.5 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-mono font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.4)] transition-all rounded-none disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{isPreparingPrint ? 'ABRIENDO IMPRESIÓN...' : 'IMPRIMIR / GUARDAR EN PDF'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
