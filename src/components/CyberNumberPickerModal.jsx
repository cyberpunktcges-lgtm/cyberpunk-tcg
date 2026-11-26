import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * CyberNumberPickerModal.jsx
 * Selector minimalista estilo Captura 4 ("LA LLORONA: CHOOSE A NUMBER"):
 * Permite elegir cuánto subir o bajar un dado Gig (ej. de 0 a 3, o de -X a +X)
 * con botones - / +, chips rápidos numéricos y botón amarillo CONFIRM.
 */
export default function CyberNumberPickerModal({
  isOpen,
  sourceCardName = '',
  sourceCardImage = '',
  prompt = '',
  gigLabel = '',
  currentValue = 1,
  maxFace = 6,
  canIncrease = true,
  canDecrease = false,
  maxDelta = 3,
  allowZero = true,
  onConfirm, // (delta) => void
  onCancel
}) {
  // Calcular rango válido de deltas
  const minDelta = canDecrease
    ? -Math.min(maxDelta, Math.max(0, currentValue - 1))
    : allowZero
    ? 0
    : 1;
  const maxAllowedDelta = canIncrease
    ? Math.min(maxDelta, Math.max(0, maxFace - currentValue))
    : allowZero
    ? 0
    : -1;

  const defaultDelta =
    canIncrease && maxAllowedDelta > 0
      ? maxAllowedDelta
      : canDecrease && minDelta < 0
      ? minDelta
      : 0;

  const [delta, setDelta] = useState(defaultDelta);

  useEffect(() => {
    if (isOpen) {
      setDelta(defaultDelta);
    }
  }, [isOpen, defaultDelta]);

  if (!isOpen) return null;

  const options = [];
  for (let d = minDelta; d <= maxAllowedDelta; d++) {
    if (!allowZero && d === 0) continue;
    options.push(d);
  }
  if (options.length === 0) options.push(0);

  const previewVal = Math.max(1, Math.min(maxFace, currentValue + delta));
  const formatDelta = (n) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#070c16]/98 border border-[#0dfceb]/60 rounded-lg p-5 space-y-5 shadow-[0_0_55px_rgba(0,0,0,0.9)]"
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3">
          {sourceCardImage && (
            <div className="w-12 aspect-[5/7] rounded border border-[#0dfceb]/60 overflow-hidden bg-black shrink-0">
              <img src={sourceCardImage} alt={sourceCardName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-[#FCEE0A] uppercase tracking-widest block font-bold">
              ELIGE UN NÚMERO
            </span>
            <h3 className="text-sm font-black text-white uppercase tracking-wide mt-0.5">
              {sourceCardName}: ELIGE UN NÚMERO
            </h3>
            {prompt && (
              <p className="text-[11px] text-gray-300 font-sans leading-snug mt-1">
                {prompt}
              </p>
            )}
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-white text-xs px-1 cursor-pointer"
              title="Cancelar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selector grande - [ N ] + */}
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              disabled={delta <= options[0]}
              onClick={() => {
                const idx = options.indexOf(delta);
                if (idx > 0) setDelta(options[idx - 1]);
              }}
              className="w-10 h-10 rounded bg-white/5 border border-white/15 hover:border-[#0dfceb] text-white text-xl font-black disabled:opacity-25 cursor-pointer transition-colors"
            >
              −
            </button>

            <div className="text-center min-w-[70px]">
              <span className="text-4xl font-black text-[#FCEE0A] leading-none block drop-shadow-[0_0_12px_rgba(252,238,10,0.45)]">
                {canDecrease ? formatDelta(delta) : Math.abs(delta)}
              </span>
              <span className="text-[10px] text-[#0dfceb] font-bold block mt-1">
                {gigLabel ? `${gigLabel}: ${currentValue} → ${previewVal}` : `${currentValue} → ${previewVal}`}
              </span>
            </div>

            <button
              type="button"
              disabled={delta >= options[options.length - 1]}
              onClick={() => {
                const idx = options.indexOf(delta);
                if (idx >= 0 && idx < options.length - 1) setDelta(options[idx + 1]);
              }}
              className="w-10 h-10 rounded bg-white/5 border border-white/15 hover:border-[#0dfceb] text-white text-xl font-black disabled:opacity-25 cursor-pointer transition-colors"
            >
              +
            </button>
          </div>

          {/* Chips rápidos numéricos */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDelta(opt)}
                className={`min-w-[34px] h-8 px-2 rounded text-xs font-black transition-all cursor-pointer border ${
                  delta === opt
                    ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_12px_rgba(252,238,10,0.6)]'
                    : 'bg-black/70 text-gray-300 border-white/15 hover:border-[#0dfceb]'
                }`}
              >
                {canDecrease ? formatDelta(opt) : Math.abs(opt)}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-gray-500">
            Entre {canDecrease ? formatDelta(options[0]) : options[0]} y {canDecrease ? formatDelta(options[options.length - 1]) : options[options.length - 1]}
          </span>
        </div>

        {/* Confirmación */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2.5 bg-[#151c29] hover:bg-[#1e283b] border border-white/20 text-gray-300 hover:text-white font-black text-[11px] uppercase tracking-wider rounded-sm cursor-pointer transition-colors"
            >
              ← OTRO DADO
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm && onConfirm(delta)}
            className="ml-auto px-6 py-2.5 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase tracking-widest rounded-sm cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.5)] transition-colors"
          >
            CONFIRMAR ({canDecrease ? formatDelta(delta) : Math.abs(delta)})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
