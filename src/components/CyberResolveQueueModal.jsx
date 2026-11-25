import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * CyberResolveQueueModal.jsx
 * Modal minimalista estilo Night City Arena ("CHOOSE WHAT TO RESOLVE"):
 * Cuando 2 o más triggers simultáneos requieren tu decisión, te permite elegir
 * exactamente cuál quieres resolver primero.
 */
export default function CyberResolveQueueModal({
  items = [], // Array de pendingTargetSelection pendientes ([active, ...queue])
  onPickIndex // (index) => void
}) {
  if (!items || items.length < 2) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-[#070c16]/98 border border-[#0dfceb]/45 rounded-lg p-5 space-y-4 shadow-[0_0_55px_rgba(0,0,0,0.92)] relative overflow-hidden"
      >
        {/* Barra de acento amarilla superior izquierda */}
        <div className="absolute top-0 left-0 w-24 h-1 bg-[#FCEE0A]" />

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
            {items.length} PENDING
          </span>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
            CHOOSE WHAT TO RESOLVE
          </h3>
          <p className="text-xs text-gray-400 font-sans">
            Varios efectos simultáneos requieren tu decisión. Elige cuál quieres resolver primero.
          </p>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto cyber-scrollbar pr-0.5">
          {items.map((item, idx) => (
            <button
              key={`${item.sourceCardName || item.title || 'trig'}-${idx}`}
              type="button"
              onClick={() => onPickIndex && onPickIndex(idx)}
              className="w-full p-2.5 rounded-md bg-[#0a111f] hover:bg-[#0dfceb]/12 border border-white/10 hover:border-[#FCEE0A] flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.sourceCardImage && (
                  <div className="w-10 aspect-[5/7] rounded border border-white/20 group-hover:border-[#FCEE0A] overflow-hidden bg-black shrink-0">
                    <img
                      src={item.sourceCardImage}
                      alt={item.sourceCardName || item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#0dfceb] block">
                    TRIGGER #{idx + 1}
                  </span>
                  <span className="text-xs font-black text-white group-hover:text-[#FCEE0A] block truncate">
                    {item.sourceCardName || item.title}: {item.actionType === 'ADJUST_GIG' ? 'Elegir Gig' : 'Confirm'}
                  </span>
                  {item.prompt && (
                    <span className="text-[10px] text-gray-400 font-sans block truncate mt-0.5">
                      {item.prompt}
                    </span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#FCEE0A] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
