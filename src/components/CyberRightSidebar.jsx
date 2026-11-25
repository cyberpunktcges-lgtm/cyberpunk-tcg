import React, { useState } from 'react';
import {
  ScrollText,
  Layers,
  Undo2,
  Home,
  Pause,
  Play,
  Zap,
  Hand,
  X,
  Maximize2,
  Settings,
  Trophy,
  BookOpen,
  Bug,
  RefreshCw
} from 'lucide-react';

/**
 * CyberRightSidebar.jsx
 * Panel lateral derecho fijo exacto al estilo Night City Arena:
 * - Cabecera limpia + menú desplegable ⚙️ (Reglas, Ranking, Cambiar Mazos, Reportar Bug)
 * - Pestañas GAME LOG (tipografía grande y limpia con iconos) y CARDS (inspector)
 * - Hover Zoom grande flotante sobre el borde del tablero (estilo Pepe Najarro / Goro Takemura)
 * - Barra inferior compacta: €$ AUTO/MANUAL, PAUSA BOT, DESHACER, INICIO
 */

function classifyLogEntry(entry = '') {
  const s = String(entry || '');
  if (s.includes('TURNO') || s.includes('═══') || s.includes('FASE DE INICIO')) {
    return { kind: 'turn', color: '#FCEE0A', icon: '↻' };
  }
  if (s.includes('ATAC') || s.includes('COMBATE') || s.includes('DERROT') || s.includes('BLOQUE') || s.includes('⚔️') || s.includes('💥')) {
    return { kind: 'combat', color: '#FF003C', icon: '⚔' };
  }
  if (s.includes('GIG') || s.includes('ROBA') || s.includes('DADO') || s.includes('🎲')) {
    return { kind: 'gig', color: '#0dfceb', icon: '◆' };
  }
  if (s.includes('EDDIE') || s.includes('VEND') || s.includes('€$')) {
    return { kind: 'eddie', color: '#FCEE0A', icon: '€$' };
  }
  if (s.includes('LEYENDA') || s.includes('GO SOLO') || s.includes('CALL')) {
    return { kind: 'legend', color: '#c084fc', icon: '★' };
  }
  return { kind: 'play', color: '#9ca3af', icon: '▸' };
}

export default function CyberRightSidebar({
  modeTitle = 'SINGLE GAME',
  modeBadge = 'NIGHT CITY ARENA',
  botLegends = [],
  actionLog = [],
  hoveredCard = null,
  displayCard = null,
  onHoverCard,
  onInspectCard,
  autoPayEddies = true,
  onToggleAutoPay,
  botStepPauseEnabled = true,
  onToggleBotPause,
  canUndo = false,
  onUndo,
  onGoHome,
  onOpenRules,
  onOpenLeaderboard,
  onOpenDeckSelector,
  onOpenBugReport,
  isOpenMobile = false,
  onCloseMobile
}) {
  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'cards'
  const [menuOpen, setMenuOpen] = useState(false);

  const cardToShow = hoveredCard || displayCard;

  return (
    <>
      {/* Hover Zoom GRANDE y nítido flotando sobre el borde derecho del tablero (exacto a capturas) */}
      {hoveredCard && hoveredCard.image && activeTab === 'log' && (
        <div className="hidden lg:block fixed right-[19rem] xl:right-[21.5rem] top-10 z-[44] w-72 pointer-events-none select-none">
          <div className="bg-[#060a12]/96 border border-[#0dfceb]/70 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)] backdrop-blur-md">
            <div className="relative aspect-[5/7] w-full bg-black overflow-hidden">
              <img
                src={hoveredCard.image}
                alt={hoveredCard.name || 'Carta'}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="p-3 border-t border-white/10 space-y-1 font-mono bg-[#060911]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white uppercase truncate">
                  {hoveredCard.name}
                </span>
                {hoveredCard.currentPower !== undefined && hoveredCard.currentPower !== null && (
                  <span className="text-xs font-black text-[#0dfceb] shrink-0">
                    Power {hoveredCard.currentPower}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase flex-wrap">
                <span>{hoveredCard.officialType || hoveredCard.type || 'CARTA'}</span>
                {hoveredCard.color && <span>• {hoveredCard.color}</span>}
                {hoveredCard.isSpent && <span className="text-[#FF003C]">• Spent</span>}
                {hoveredCard.isLagging && <span className="text-[#0dfceb]">• Lag</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel Lateral Derecho Fijo */}
      <aside
        className={`
          ${isOpenMobile ? 'fixed inset-y-0 right-0 z-45 w-80 flex shadow-2xl' : 'hidden'}
          lg:flex lg:static lg:w-72 xl:w-80 h-full bg-[#060910] border-l border-white/10 flex-col font-mono shrink-0 select-none relative
        `}
      >
        {/* Cabecera del Sidebar */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 bg-[#04060b] shrink-0 relative">
          <div className="min-w-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest block truncate">
              {modeBadge}
            </span>
            <h2 className="text-sm font-black text-white uppercase tracking-wider truncate">
              {modeTitle}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`p-1.5 rounded border cursor-pointer transition-colors ${
                menuOpen
                  ? 'border-[#FCEE0A] text-[#FCEE0A] bg-[#FCEE0A]/10'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'
              }`}
              title="Opciones de partida (Reglas, Ranking, Mazos, Bug)"
            >
              <Settings className="w-4 h-4" />
            </button>
            {isOpenMobile && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Menú desplegable compacto de utilidades */}
          {menuOpen && (
            <div className="absolute right-3 top-13 z-50 w-56 bg-[#070b14] border border-[#0dfceb]/50 rounded-md shadow-2xl p-1.5 space-y-1">
              {onOpenDeckSelector && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDeckSelector();
                  }}
                  className="w-full px-2.5 py-2 rounded text-left text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-[#FCEE0A] flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#FCEE0A]" />
                  <span>Cambiar Mazos / Modo</span>
                </button>
              )}
              {onOpenLeaderboard && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLeaderboard();
                  }}
                  className="w-full px-2.5 py-2 rounded text-left text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-[#FCEE0A] flex items-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#FCEE0A]" />
                  <span>Ranking Night City</span>
                </button>
              )}
              {onOpenRules && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenRules();
                  }}
                  className="w-full px-2.5 py-2 rounded text-left text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-[#0dfceb] flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#0dfceb]" />
                  <span>Reglamento Oficial</span>
                </button>
              )}
              {onOpenBugReport && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenBugReport();
                  }}
                  className="w-full px-2.5 py-2 rounded text-left text-[11px] font-bold text-gray-200 hover:bg-white/10 hover:text-[#FF003C] flex items-center gap-2 cursor-pointer"
                >
                  <Bug className="w-3.5 h-3.5 text-[#FF003C]" />
                  <span>Reportar Bug Beta</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mini-tira de RIVAL'S LEGENDS (exacto al vídeo de referencia) */}
        {Array.isArray(botLegends) && botLegends.length > 0 && (
          <div className="px-4 py-2 border-b border-white/10 bg-[#050810] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#FF003C]/85">
              RIVAL&apos;S LEGENDS
            </span>
            <div className="flex items-center gap-1.5">
              {botLegends.map((leg, idx) => (
                <button
                  key={leg.instanceId || idx}
                  type="button"
                  onMouseEnter={() => {
                    if (leg.isFaceUp && onHoverCard) onHoverCard(leg);
                  }}
                  onMouseLeave={() => onHoverCard && onHoverCard(null)}
                  onClick={() => {
                    if (leg.isFaceUp && onInspectCard) onInspectCard(leg);
                  }}
                  className={`w-6 h-8 rounded-sm overflow-hidden border transition-all ${
                    leg.isRemovedFromGame
                      ? 'border-gray-800 opacity-30 grayscale'
                      : leg.isFaceUp
                      ? 'border-[#FF003C] hover:border-[#FCEE0A] cursor-pointer hover:scale-110'
                      : 'border-white/20 opacity-80 cursor-default'
                  }`}
                  title={leg.isFaceUp ? leg.name : 'Leyenda Rival boca abajo'}
                >
                  <img
                    src={leg.isFaceUp && leg.image ? leg.image : '/images/back_legend.png'}
                    alt={leg.isFaceUp ? leg.name : 'Leyenda Rival'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/back_normal.png';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pestañas GAME LOG | CARDS */}
        <div className="flex border-b border-white/10 bg-[#05080f] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-2.5 px-3 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-[#0dfceb] text-[#0dfceb] bg-[#0dfceb]/5'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>GAME LOG</span>
            <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] text-gray-300">
              {actionLog.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-2.5 px-3 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === 'cards'
                ? 'border-[#FCEE0A] text-[#FCEE0A] bg-[#FCEE0A]/5'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CARDS</span>
          </button>
        </div>

        {/* Cuerpo del Sidebar */}
        <div className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar p-2.5">
          {activeTab === 'log' ? (
            <div className="space-y-1">
              {actionLog.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-8">
                  Esperando primera jugada...
                </p>
              ) : (
                actionLog.slice(0, 80).map((entry, idx) => {
                  const meta = classifyLogEntry(entry);
                  if (meta.kind === 'turn') {
                    return (
                      <div
                        key={idx}
                        className="mt-2.5 first:mt-0 px-2.5 py-1.5 rounded bg-white/[0.06] border-l-2 border-[#FCEE0A] text-[11px] font-black uppercase text-[#FCEE0A] flex items-center gap-1.5"
                      >
                        <span>{meta.icon}</span>
                        <span className="truncate">{entry}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] hover:border-white/15 text-[11px] text-gray-200 leading-snug flex items-start gap-2 transition-colors"
                    >
                      <span
                        className="font-black text-[11px] shrink-0 mt-0.5"
                        style={{ color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                      <span className="font-sans break-words min-w-0 flex-1">{entry}</span>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {cardToShow ? (
                <>
                  <div
                    onClick={() => cardToShow.image && onInspectCard && onInspectCard(cardToShow)}
                    className="relative aspect-[5/7] w-full max-w-[240px] mx-auto rounded-lg overflow-hidden border border-[#0dfceb]/50 bg-black shadow-xl cursor-pointer group"
                    title="Clic para ampliar a pantalla completa"
                  >
                    {cardToShow.image ? (
                      <img
                        src={cardToShow.image}
                        alt={cardToShow.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        Sin imagen
                      </div>
                    )}
                    <div className="absolute top-2 right-2 p-1 rounded bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="bg-black/60 border border-white/10 rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-black text-white uppercase truncate">
                        {cardToShow.name}
                      </h3>
                      {cardToShow.parsedCost !== undefined && (
                        <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-black text-[10px] font-black shrink-0">
                          {cardToShow.parsedCost} €$
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-[#0dfceb] uppercase">
                      <span>{cardToShow.officialType || cardToShow.type || 'CARTA'}</span>
                      {cardToShow.currentPower !== undefined && (
                        <span>• ⚡ {cardToShow.currentPower}</span>
                      )}
                      {cardToShow.color && <span>• {cardToShow.color}</span>}
                    </div>
                    {(cardToShow.rulesText || cardToShow.text || cardToShow.description) && (
                      <p className="text-xs text-gray-300 font-sans leading-relaxed pt-1.5 border-t border-white/10">
                        {cardToShow.rulesText || cardToShow.text || cardToShow.description}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                  <Layers className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-sans">Pasa el ratón por cualquier carta para inspeccionarla aquí.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra Inferior Fija del Sidebar (exacta a capturas: €$ AUTO/MANUAL, PAUSA, UNDO, INICIO) */}
        <div className="p-2.5 border-t border-white/10 bg-[#04060b] flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleAutoPay}
              className={`px-2.5 py-1.5 rounded border text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                autoPayEddies
                  ? 'bg-[#FCEE0A]/15 border-[#FCEE0A] text-[#FCEE0A]'
                  : 'bg-black border-gray-700 text-gray-400 hover:text-white'
              }`}
              title={
                autoPayEddies
                  ? 'Pago automático activo (€$ AUTO). Clic para cambiar a Manual.'
                  : 'Pago manual activo (€$ MANUAL). Clic para activar Auto.'
              }
            >
              {autoPayEddies ? <Zap className="w-3.5 h-3.5" /> : <Hand className="w-3.5 h-3.5" />}
              <span>{autoPayEddies ? '€$ AUTO' : '€$ MANUAL'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleBotPause}
              className={`p-1.5 rounded border cursor-pointer transition-colors ${
                botStepPauseEnabled
                  ? 'bg-[#0dfceb]/15 border-[#0dfceb]/60 text-[#0dfceb]'
                  : 'bg-black border-gray-700 text-gray-500 hover:text-white'
              }`}
              title={
                botStepPauseEnabled
                  ? 'Pausa paso a paso del Bot ACTIVADA'
                  : 'Pausa paso a paso del Bot DESACTIVADA'
              }
            >
              {botStepPauseEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 rounded border border-gray-700 bg-black text-gray-300 hover:border-[#FCEE0A] hover:text-[#FCEE0A] disabled:opacity-25 cursor-pointer transition-colors"
              title="Deshacer última acción"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="px-2.5 py-1.5 rounded border border-gray-700 hover:border-[#FF003C] bg-black text-gray-300 hover:text-[#FF003C] text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
            title="Volver al Lobby del Simulador"
          >
            <Home className="w-3.5 h-3.5" />
            <span>INICIO</span>
          </button>
        </div>
      </aside>
    </>
  );
}
