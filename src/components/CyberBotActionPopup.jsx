import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Check, FastForward, Maximize2 } from 'lucide-react';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

const ACTION_STYLES = {
  UNIT: {
    label: 'EL RIVAL DESPLIEGA UNIDAD',
    border: 'border-[#0dfceb]',
    badge: 'bg-[#0dfceb] text-[#070a10]',
    glow: 'shadow-[0_0_35px_rgba(13,252,235,0.4)]'
  },
  PROGRAM: {
    label: 'EL RIVAL JUEGA PROGRAMA',
    border: 'border-[#FF003C]',
    badge: 'bg-[#FF003C] text-white',
    glow: 'shadow-[0_0_35px_rgba(255,0,60,0.45)]'
  },
  GEAR: {
    label: 'EL RIVAL EQUIPA GEAR',
    border: 'border-[#FCEE0A]',
    badge: 'bg-[#FCEE0A] text-[#070a10]',
    glow: 'shadow-[0_0_35px_rgba(252,238,10,0.4)]'
  },
  GO_SOLO: {
    label: 'EL RIVAL ACTIVA GO SOLO',
    border: 'border-[#FF003C]',
    badge: 'bg-[#FF003C] text-white',
    glow: 'shadow-[0_0_35px_rgba(255,0,60,0.5)]'
  },
  CALL_LEGEND: {
    label: 'EL RIVAL REVELA LEYENDA (CALL)',
    border: 'border-[#FCEE0A]',
    badge: 'bg-[#FCEE0A] text-[#070a10]',
    glow: 'shadow-[0_0_35px_rgba(252,238,10,0.45)]'
  },
  ABILITY: {
    label: 'EL RIVAL ACTIVA HABILIDAD (↷)',
    border: 'border-[#0dfceb]',
    badge: 'bg-[#0dfceb] text-[#070a10]',
    glow: 'shadow-[0_0_35px_rgba(13,252,235,0.4)]'
  },
  COMBAT_RESULT: {
    label: 'RESULTADO DEL COMBATE',
    border: 'border-[#FF003C]',
    badge: 'bg-[#FF003C] text-white',
    glow: 'shadow-[0_0_35px_rgba(255,0,60,0.45)]'
  },
  END_BOT_TURN: {
    label: 'FIN DEL TURNO DEL RIVAL',
    border: 'border-[#0dfceb]',
    badge: 'bg-[#0dfceb] text-[#070a10]',
    glow: 'shadow-[0_0_38px_rgba(13,252,235,0.5)]'
  }
};

export default function CyberBotActionPopup({
  event,
  onConfirm,
  onDisablePauses,
  onHoverCard,
  onInspectCard,
  disabledHotkeys = false
}) {
  useEffect(() => {
    if (!event || disabledHotkeys) return;
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event, onConfirm, disabledHotkeys]);

  if (!event) return null;

  const style = ACTION_STYLES[event.actionType] || ACTION_STYLES.UNIT;
  const card = event.card;
  const logs = Array.isArray(event.logs) ? event.logs : [];

  return (
    <div className="fixed bottom-4 right-4 z-[65] max-w-md w-[calc(100vw-24px)] font-mono pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        style={{ clipPath: CYBER_CLIP }}
        className={`pointer-events-auto bg-[#070a10]/98 border-2 ${style.border} ${style.glow} p-3.5 sm:p-4 text-white space-y-3 backdrop-blur-md`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Bot className="w-4 h-4 text-[#FF003C] shrink-0" />
            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider truncate ${style.badge}`}>
              {style.label}
            </span>
          </div>
          <span className="text-[9px] text-gray-400 uppercase font-bold shrink-0">
            EN PAUSA
          </span>
        </div>

        {/* Carta jugada + Resumen */}
        {card && (
          <div className="flex items-start gap-3">
            {card.image && (
              <div
                onMouseEnter={() => onHoverCard && onHoverCard(card)}
                onClick={() => onInspectCard && onInspectCard(card)}
                className="relative w-16 h-22 rounded border border-[#FCEE0A]/70 overflow-hidden shrink-0 bg-black cursor-pointer hover:scale-105 transition-transform group"
                title="Pasa el ratón para Kiroshi // Clic para ver en grande"
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 p-0.5 bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-2.5 h-2.5 text-[#FCEE0A]" />
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase leading-tight">
                {card.name}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {card.officialType && (
                  <span className="px-1.5 py-0.5 bg-black border border-gray-700 text-[#0dfceb] font-bold uppercase">
                    {card.officialType}
                  </span>
                )}
                {card.cost && (
                  <span className="px-1.5 py-0.5 bg-black border border-gray-700 text-[#FCEE0A] font-bold">
                    {card.cost}
                  </span>
                )}
                {card.power && (
                  <span className="px-1.5 py-0.5 bg-black border border-gray-700 text-white font-bold">
                    ⚡ {card.power}
                  </span>
                )}
              </div>

              {event.targetName && (
                <div className="text-[10px] text-[#FCEE0A] font-bold">
                  🎯 Objetivo: <span className="text-white">{event.targetName}</span>
                </div>
              )}

              {(card.rulesText || card.ability) && (
                <p className="text-[10px] text-gray-300 leading-snug line-clamp-3 font-sans">
                  {card.rulesText || card.ability}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mensaje explicativo cuando es pausa de fin de turno o combate sin carta principal */}
        {!card && event.subtitle && (
          <p className="text-[11px] text-gray-200 leading-relaxed font-sans">
            {event.subtitle}
          </p>
        )}

        {/* Efectos exactos ocurridos en esta jugada */}
        {logs.length > 0 && (
          <div className="bg-black/90 border border-gray-800 rounded p-2 space-y-1 max-h-36 overflow-y-auto cyber-scrollbar">
            <span className="text-[9px] font-black text-[#0dfceb] uppercase block">
              {event.actionType === 'END_BOT_TURN' ? 'RESUMEN ANTES DE TU TURNO:' : 'QUÉ HA OCURRIDO:'}
            </span>
            {logs.map((line, i) => (
              <div
                key={i}
                className="text-[10px] text-gray-200 leading-snug border-l-2 border-[#FCEE0A]/60 pl-2"
              >
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Botón OK + opción rápida de modo turbo */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onDisablePauses}
            className="text-[10px] text-gray-400 hover:text-[#0dfceb] flex items-center gap-1 cursor-pointer transition-colors"
            title="Desactiva las pausas del Bot (puedes volver a activarlas en la barra superior)"
          >
            <FastForward className="w-3 h-3" />
            <span className="underline">Modo rápido</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{ clipPath: CYBER_BUTTON }}
            className={`px-5 py-2 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
              event.actionType === 'END_BOT_TURN'
                ? 'bg-[#0dfceb] hover:bg-white text-[#070a10] shadow-[0_0_20px_rgba(13,252,235,0.6)]'
                : 'bg-[#FCEE0A] hover:bg-white text-[#070a10] shadow-[0_0_18px_rgba(252,238,10,0.55)]'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {event.actionType === 'END_BOT_TURN' ? 'EMPEZAR MI TURNO' : 'OK, CONTINUAR'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
