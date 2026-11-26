import React from 'react';
import { motion } from 'framer-motion';

const CHAMFER_OUTER =
  'polygon(0 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%)';
const CHAMFER_INNER =
  'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)';

/**
 * Ventana central compacta de triggers y fijación de objetivos sobre el tablero
 * (estilo Cyberpunk con borde cian en chaflán, miniatura de carta, texto completo,
 * contador 0/1, botón OMITIR/CANCELAR y CONFIRMAR dorado → amarillo neón).
 */
export default function CyberInlineTargetBar({
  cardImage = '',
  cardName = '',
  actionLabel = 'ELIGE OBJETIVO',
  rulesText = '',
  promptText = '',
  selectedCount = 0,
  requiredCount = 1,
  showCounter = true,
  canConfirm = false,
  confirmLabel = 'CONFIRMAR',
  onConfirm,
  secondaryLabel = null,
  onSecondary,
  cancelLabel = null,
  onCancel,
  onInspectCard,
  onHoverCard,
  customActions = null
}) {
  const displayName = String(cardName || '').replace(/\s*\/\/\s*/g, ': ').trim();
  const heading = displayName
    ? `${displayName}${actionLabel ? `: ${actionLabel}` : ''}`
    : actionLabel || 'ELIGE OBJETIVO';

  // Priorizar el texto de la habilidad/carta legible; si promptText aporta detalle clave distinto, mostrarlo
  const cleanRules = String(rulesText || '').trim();
  const cleanPrompt = String(promptText || '').trim();
  const primaryBody = cleanRules || cleanPrompt;
  const secondaryHint =
    cleanRules &&
    cleanPrompt &&
    cleanPrompt.toLowerCase() !== cleanRules.toLowerCase()
      ? cleanPrompt
      : '';

  return (
    <div className="fixed left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 z-[46] w-[94vw] max-w-[720px] pointer-events-auto font-mono select-none">
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={{
          filter:
            'drop-shadow(0 0 16px rgba(13, 252, 235, 0.28)) drop-shadow(0 14px 32px rgba(0, 0, 0, 0.92))'
        }}
      >
        {/* Marco exterior cian con chaflán inferior derecho */}
        <div
          style={{ clipPath: CHAMFER_OUTER }}
          className="p-[1.5px] bg-gradient-to-r from-[#0dfceb]/85 via-[#0dfceb]/65 to-[#0dfceb]/90"
        >
          {/* Interior oscuro translúcido */}
          <div
            style={{ clipPath: CHAMFER_INNER }}
            className="bg-[#090e18]/97 backdrop-blur-md px-3 sm:px-3.5 py-2.5 flex items-center justify-between gap-3"
          >
            {/* Izquierda: Miniatura de carta + Título + Texto de habilidad */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {cardImage && (
                <button
                  type="button"
                  onClick={() => onInspectCard?.()}
                  onMouseEnter={() => onHoverCard?.(true)}
                  onMouseLeave={() => onHoverCard?.(false)}
                  title="Clic para ampliar carta"
                  className="w-10 h-14 sm:w-11 sm:h-15 rounded-[2px] border border-white/25 hover:border-[#0dfceb] overflow-hidden bg-black shrink-0 cursor-pointer transition-transform hover:scale-105 shadow-md"
                >
                  <img
                    src={cardImage}
                    alt={displayName || 'Carta'}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-[0.04em] text-[#e6f9ff] leading-tight truncate">
                  {heading}
                </div>
                {primaryBody && (
                  <p className="text-[10.5px] sm:text-[11.5px] text-gray-300/95 font-sans leading-[1.35] mt-0.5 line-clamp-2">
                    {primaryBody}
                  </p>
                )}
                {secondaryHint && (
                  <p className="text-[10px] text-[#0dfceb]/90 font-sans leading-tight mt-0.5 line-clamp-1">
                    {secondaryHint}
                  </p>
                )}
              </div>
            </div>

            {/* Derecha: Contador 0/1 + OMITIR/CANCELAR + CONFIRMAR (o acciones personalizadas) */}
            <div className="flex items-center gap-2 shrink-0">
              {customActions ? (
                customActions
              ) : (
                <>
                  {showCounter && (
                    <span className="text-xs sm:text-[13px] font-black tabular-nums px-1 tracking-tight">
                      <span className={selectedCount >= requiredCount ? 'text-[#FCEE0A]' : 'text-gray-300'}>
                        {selectedCount}
                      </span>
                      <span className="text-gray-500">/{requiredCount}</span>
                    </span>
                  )}

                  {secondaryLabel && onSecondary && (
                    <button
                      type="button"
                      onClick={onSecondary}
                      className="px-2.5 sm:px-3 py-1.5 bg-[#151c29] hover:bg-[#1e283b] border border-white/20 hover:border-white/50 text-gray-200 hover:text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-[2px] cursor-pointer transition-colors"
                    >
                      {secondaryLabel}
                    </button>
                  )}

                  {cancelLabel && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-2.5 sm:px-3 py-1.5 bg-[#151c29] hover:bg-[#2a121a] border border-white/20 hover:border-[#FF003C]/70 text-gray-300 hover:text-[#FF003C] text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-[2px] cursor-pointer transition-colors"
                    >
                      {cancelLabel}
                    </button>
                  )}

                  {onConfirm && (
                    <button
                      type="button"
                      disabled={!canConfirm}
                      onClick={onConfirm}
                      className={`px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-[2px] transition-all ${
                        canConfirm
                          ? 'bg-[#FCEE0A] hover:bg-white text-[#070a10] cursor-pointer shadow-[0_0_18px_rgba(252,238,10,0.65)]'
                          : 'bg-[#68621d] text-[#171911] cursor-not-allowed opacity-90'
                      }`}
                    >
                      {confirmLabel}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
