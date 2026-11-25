import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * CyberUnitActionPopover.jsx
 * Menú contextual flotante al hacer clic sobre una Unidad propia en mesa
 * (ej: Kerry Eurodyne -> ATTACK + DRAW 2 con explicación en ámbar si no se cumple la condición).
 */
export default function CyberUnitActionPopover({
  unit,
  canAttack = false,
  attackDisabledReason = null,
  abilities = [], // [{ id, sourceCardInstanceId, sourceLabel, title, shortTitle, description, costEddie, canActivateNow, disabledReason }]
  onAttack,
  onActivateAbility,
  onInspect,
  onClose
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Calcular posición anclada a la derecha (o izquierda si no cabe) de la carta en mesa
  useLayoutEffect(() => {
    if (!unit?.instanceId || typeof document === 'undefined') return;

    const updatePosition = () => {
      const nodes = document.querySelectorAll(
        `[data-arrow-anchor="${CSS.escape(String(unit.instanceId))}"]`
      );
      let rect = null;
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          rect = r;
          break;
        }
      }
      if (!rect) {
        setPos({ left: window.innerWidth / 2 - 140, top: window.innerHeight / 2 - 110 });
        return;
      }

      const popWidth = 280;
      const popHeight = popoverRef.current?.offsetHeight || 220;
      const margin = 12;

      let left = rect.right + 10;
      if (left + popWidth + margin > window.innerWidth) {
        left = rect.left - popWidth - 10;
      }
      if (left < margin) {
        left = Math.max(margin, Math.min(window.innerWidth - popWidth - margin, rect.left + rect.width / 2 - popWidth / 2));
      }

      let top = rect.top + rect.height / 2 - popHeight / 2;
      if (top + popHeight + margin > window.innerHeight) {
        top = window.innerHeight - popHeight - margin;
      }
      if (top < margin) top = margin;

      setPos({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [unit?.instanceId, abilities.length, canAttack]);

  // Cerrar al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!unit) return;
    const onPointerDown = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      const clickedCard = e.target?.closest?.(`[data-arrow-anchor="${CSS.escape(String(unit.instanceId))}"]`);
      if (clickedCard) return;
      onClose?.();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [unit, onClose]);

  if (!unit) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        left: pos ? `${pos.left}px` : '50%',
        top: pos ? `${pos.top}px` : '50%',
        opacity: pos ? 1 : 0
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[56] w-[272px] sm:w-[288px] bg-[#090e17]/98 border border-white/20 rounded-md shadow-[0_18px_50px_rgba(0,0,0,0.9),0_0_24px_rgba(13,252,235,0.18)] backdrop-blur-md font-mono select-none overflow-hidden transition-opacity duration-100"
    >
      {/* Cabecera con miniatura + nombre + cerrar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1422] border-b border-white/10">
        {unit.image && (
          <div className="w-6 h-8 rounded-sm overflow-hidden border border-white/20 shrink-0 bg-black">
            <img src={unit.image} alt={unit.name} className="w-full h-full object-cover" />
          </div>
        )}
        <span className="text-[11px] font-black uppercase tracking-wider text-white truncate flex-1">
          {unit.name}
        </span>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
          title="Cerrar menú (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lista de acciones: ATTACK + Habilidades activadas (↷) */}
      <div className="divide-y divide-white/10">
        {/* Opción 1: ATTACK */}
        <button
          type="button"
          disabled={!canAttack}
          onClick={() => {
            if (!canAttack) return;
            onAttack?.(unit);
          }}
          className={`w-full px-3 py-2.5 text-left flex items-stretch gap-2.5 transition-colors ${
            canAttack
              ? 'hover:bg-[#FF003C]/12 cursor-pointer group'
              : 'opacity-70 cursor-not-allowed bg-black/25'
          }`}
        >
          <div
            className={`w-1 rounded-full shrink-0 ${
              canAttack ? 'bg-[#FF003C] shadow-[0_0_10px_#FF003C]' : 'bg-gray-700'
            }`}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  canAttack ? 'text-white group-hover:text-[#FCEE0A]' : 'text-gray-400'
                }`}
              >
                ATTACK
              </span>
              {canAttack && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF003C]/20 border border-[#FF003C]/50 text-[#FF003C]">
                  ⚔️ LISTO
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 leading-snug">
              Una unidad rival girada o los Gigs del rival.
            </p>
            {!canAttack && attackDisabledReason && (
              <p className="text-[10px] text-[#FCEE0A] font-semibold leading-snug pt-0.5">
                {attackDisabledReason}
              </p>
            )}
          </div>
        </button>

        {/* Opciones 2..N: Habilidades activadas de la Unidad y sus Gears equipados */}
        {abilities.map((ab) => {
          const isReady = Boolean(ab.canActivateNow);
          const heading = (ab.shortTitle || ab.title || 'HABILIDAD').replace(/^↷\s*/u, '');
          return (
            <button
              key={`${ab.sourceCardInstanceId}-${ab.id}`}
              type="button"
              disabled={!isReady}
              onClick={() => {
                if (!isReady) return;
                onActivateAbility?.(ab.sourceCardInstanceId, ab.id);
              }}
              className={`w-full px-3 py-2.5 text-left flex items-stretch gap-2.5 transition-colors ${
                isReady
                  ? 'hover:bg-[#0dfceb]/12 cursor-pointer group'
                  : 'opacity-75 cursor-not-allowed bg-black/25'
              }`}
            >
              <div
                className={`w-1 rounded-full shrink-0 ${
                  isReady ? 'bg-[#0dfceb] shadow-[0_0_10px_#0dfceb]' : 'bg-gray-700'
                }`}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-black uppercase tracking-wider truncate ${
                      isReady ? 'text-white group-hover:text-[#0dfceb]' : 'text-gray-400'
                    }`}
                  >
                    {heading}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                      isReady
                        ? 'bg-[#0dfceb]/15 border-[#0dfceb]/50 text-[#0dfceb]'
                        : 'bg-black/50 border-white/10 text-gray-500'
                    }`}
                  >
                    {ab.costEddie > 0 ? `${ab.costEddie} €$, ↷` : '↷'}
                  </span>
                </div>
                {ab.sourceLabel && (
                  <span className="text-[9px] font-bold uppercase text-[#FCEE0A]/80 block">
                    🔧 {ab.sourceLabel}
                  </span>
                )}
                <p className="text-[10px] text-gray-400 leading-snug">
                  {ab.description}
                </p>
                {!isReady && ab.disabledReason && (
                  <p className="text-[10px] text-[#FCEE0A] font-semibold leading-snug pt-0.5">
                    {ab.disabledReason}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pie discreto para ampliar carta */}
      <div className="px-3 py-1.5 bg-[#060910] border-t border-white/10 flex items-center justify-between">
        <span className="text-[9px] text-gray-500 uppercase">
          ⚡ Poder {unit.currentPower ?? unit.parsedPower ?? 0}
        </span>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onInspect?.(unit);
          }}
          className="text-[9px] font-bold uppercase text-[#0dfceb] hover:text-white cursor-pointer transition-colors"
        >
          VER CARTA ↗
        </button>
      </div>
    </div>
  );
}
