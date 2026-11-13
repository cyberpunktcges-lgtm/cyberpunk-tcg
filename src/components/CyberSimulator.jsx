import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Shield,
  Zap,
  Play,
  RotateCcw,
  Swords,
  Coins,
  Crown,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  Flame,
  HelpCircle,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import {
  createInitialGameState,
  calculateStreetCred,
  getAvailableEddies,
  sellCardForEddies,
  playUnitCard,
  callLegendFaceUp,
  attackRivalGigs,
  fightRivalUnit,
  passTurn,
  mulliganHand,
  keepHand,
  DICE_CONFIG
} from '../utils/cyberpunkEngine.js';
import { runBotTurn } from '../utils/botAi.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

// Reverso oficial icónico de carta Cyberpunk TCG (Amarillo / Negro)
function CyberCardBack({ className = '', label = 'CYBERPUNK TCG', count = null }) {
  return (
    <div
      className={`relative bg-[#FCEE0A] border-2 border-black rounded-sm overflow-hidden flex flex-col items-center justify-center select-none shadow-lg ${className}`}
    >
      <div className="absolute inset-1 border border-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/20 pointer-events-none" />
      <span className="font-black text-black text-[12px] sm:text-[14px] tracking-widest font-mono uppercase -rotate-90 whitespace-nowrap">
        CYBERPUNK <span className="text-[#FF003C]">TCG</span>
      </span>
      {count !== null && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black text-[#00F0FF] font-mono font-black text-[10px] sm:text-xs">
          {count}
        </span>
      )}
    </div>
  );
}

// Representación geométrica poligonal de dados de Gig
function GigDieBadge({ die, value, stolen = false, className = '' }) {
  const shapes = {
    d4: '▲ D4',
    d6: '⬢ D6',
    d8: '◆ D8',
    d10: '✦ D10',
    d12: '⬟ D12',
    d20: '◈ D20'
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 font-mono font-black text-xs border transition-all ${
        stolen
          ? 'bg-[#FF003C]/20 border-[#FF003C] text-white shadow-[0_0_10px_rgba(255,0,60,0.4)]'
          : 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
      } ${className}`}
    >
      <span className="text-[10px] text-gray-400 font-normal">{shapes[die] || die.toUpperCase()}</span>
      <span className="text-sm font-black text-[#FCEE0A]">{value}</span>
    </div>
  );
}

export default function CyberSimulator({ initialCards = [], initialCms = {} }) {
  // Autenticación de la ALPHA
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Mazo seleccionado para Jugador y Bot
  const availableDecks = initialCms.decks || [];
  const [selectedPlayerDeckIdx, setSelectedPlayerDeckIdx] = useState(0);
  const [selectedBotDeckIdx, setSelectedBotDeckIdx] = useState(1);

  // Estado del juego
  const [gameState, setGameState] = useState(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [selectedFieldUnit, setSelectedFieldUnit] = useState(null);
  const [inspectedCard, setInspectedCard] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Comprobar si ya había sesión en sessionStorage
  useEffect(() => {
    try {
      if (sessionStorage.getItem('cp_sim_auth') === 'true') {
        setIsAuthenticated(true);
      }
    } catch {}
  }, []);

  // Inicializar o reiniciar partida
  const handleStartGame = (pDeckIdx = selectedPlayerDeckIdx, bDeckIdx = selectedBotDeckIdx) => {
    const pDeck = availableDecks[pDeckIdx] || availableDecks[0] || { deckList: [], legends: [] };
    const bDeck =
      availableDecks[bDeckIdx] || availableDecks[1] || availableDecks[0] || { deckList: [], legends: [] };

    const initial = createInitialGameState(pDeck, bDeck, initialCards);
    setGameState(initial);
    setSelectedHandCard(null);
    setSelectedFieldUnit(null);
  };

  // Comprobar contraseña
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === 'cyberpunk2077') {
      setIsAuthenticated(true);
      setAuthError(false);
      try {
        sessionStorage.setItem('cp_sim_auth', 'true');
      } catch {}
      handleStartGame();
    } else {
      setAuthError(true);
    }
  };

  // Turno del bot automático cuando le toque y el jugador ya haya decidido el Mulligan
  useEffect(() => {
    if (!gameState || gameState.isGameOver || !gameState.mulliganDecided) return;

    if (gameState.activePlayer === 'bot' && !isBotThinking) {
      setIsBotThinking(true);
      runBotTurn(gameState, (updated) => setGameState({ ...updated }), 750).then(() => {
        setIsBotThinking(false);
      });
    }
  }, [gameState?.activePlayer, gameState?.turnNumber, gameState?.isGameOver, gameState?.mulliganDecided]);

  // Si no está autenticado, mostrar pantalla de clave
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#05070c] text-white flex items-center justify-center p-4 relative overflow-hidden font-mono">
        <div
          className="pointer-events-none fixed inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div
          style={{ clipPath: CYBER_CLIP }}
          className="max-w-md w-full bg-[#000000] border-2 border-[#00F0FF] p-8 shadow-[0_0_50px_rgba(0,240,255,0.35)] space-y-6 relative z-10"
        >
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
            <Lock className="w-6 h-6 text-[#FCEE0A]" />
            <div>
              <span className="text-[10px] text-[#00F0FF] uppercase tracking-widest block">
                TERMINAL NETWATCH // NODO PRIVADO
              </span>
              <h1 className="text-xl font-black text-white uppercase">
                SIMULADOR <span className="text-[#FCEE0A]">ALPHA 1.0</span>
              </h1>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Área de pruebas interna para el motor de reglas y juego contra IA. Se requiere credencial de acceso para desbloquear el simulador.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] text-gray-300 uppercase mb-1">
                CONTRASEÑA DE ACCESO
              </label>
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(false);
                }}
                placeholder="Ingresa la clave..."
                className="w-full bg-[#070a10] border border-gray-700 focus:border-[#FCEE0A] px-4 py-2.5 text-white font-mono text-sm outline-none"
              />
            </div>

            {authError && (
              <div className="p-2.5 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Credencial incorrecta. Acceso denegado.</span>
              </div>
            )}

            <button
              type="submit"
              style={{ clipPath: CYBER_CLIP }}
              className="w-full py-3 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-[0_0_20px_rgba(252,238,10,0.4)]"
            >
              <Unlock className="w-4 h-4" />
              <span>DESBLOQUEAR TERMINAL</span>
            </button>
          </form>

          <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3 flex justify-between">
            <span>SET 01 // WELCOME TO NIGHT CITY</span>
            <span>BUILD 2026.11</span>
          </div>
        </div>
      </div>
    );
  }

  // Inicializar si ya autenticado pero sin gameState
  if (!gameState) {
    handleStartGame();
    return null;
  }

  const p = gameState.player;
  const bot = gameState.bot;
  const isMyTurn = gameState.activePlayer === 'player' && !gameState.isGameOver && gameState.mulliganDecided;
  const playerStreetCred = calculateStreetCred(p.gigs);
  const botStreetCred = calculateStreetCred(bot.gigs);
  const availableEddies = getAvailableEddies(p);

  return (
    <div className="min-h-screen bg-[#04060b] text-white font-sans select-none flex flex-col justify-between relative overflow-hidden">
      {/* Rejilla Técnica de Fondo */}
      <div
        className="pointer-events-none fixed inset-0 opacity-10 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 240, 255, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* =====================================================================
          BARRA SUPERIOR (CABECERA Y CONTROL)
         ===================================================================== */}
      <header className="relative z-10 bg-[#000000] border-b border-gray-800 px-4 py-2 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse" />
            <span className="font-black text-white uppercase tracking-wider text-sm">
              CYBERPUNK TCG // <span className="text-[#FCEE0A]">CHOOM ARENA (VS BOT)</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-gray-400 pl-3 border-l border-gray-800">
            <span>TURNO {gameState.turnNumber}</span>
            <span className="text-gray-700">•</span>
            <span
              className={`font-black uppercase px-2 py-0.5 text-xs ${
                isMyTurn
                  ? 'bg-[#00F0FF] text-[#070a10]'
                  : 'bg-[#FF003C] text-white animate-pulse'
              }`}
            >
              {isMyTurn ? 'TU TURNO (JUGADOR)' : 'TURNO DE LA IA...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            style={{ clipPath: CYBER_CLIP }}
            className="px-3 py-1 bg-[#070a10] border border-gray-700 hover:border-[#00F0FF] text-[#00F0FF] font-bold uppercase flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>REGISTRO ({gameState.actionLog.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartGame()}
            style={{ clipPath: CYBER_CLIP }}
            className="px-3 py-1 bg-[#070a10] border border-gray-700 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold uppercase flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REINICIAR</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          CAMPO DE BATALLA PRINCIPAL EN 3 COLUMNAS:
          [PANEL IZQ: GIGS/STATS] [CENTRO: TAPETE / BATTLEFIELD] [PANEL DER: MAZO/ACCIONES]
         ===================================================================== */}
      <div className="relative z-10 flex-1 flex flex-row overflow-hidden w-full">
        {/* ===============================================================
            PANEL LATERAL IZQUIERDO: FIXER, GIGS, ESTADÍSTICAS Y LEYENDAS
           =============================================================== */}
        <aside className="w-64 sm:w-72 bg-[#000000]/90 border-r border-gray-800 p-3 flex flex-col justify-between font-mono shrink-0 overflow-y-auto">
          {/* STATS DEL RIVAL (BOT) */}
          <div className="space-y-2 border-b border-gray-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-[#FF003C] text-white font-black text-[10px] uppercase">
                RIVAL // BOT
              </span>
              <span className="text-[10px] text-gray-400">
                MANO: {bot.hand.length} | EDDIES: {getAvailableEddies(bot)} €$
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#070a10] border border-gray-800 p-2">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-xl font-black text-[#FCEE0A]">⭐ {botStreetCred}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 uppercase block">GIGS CONTROLADOS</span>
                <span className="text-lg font-black text-white">{bot.gigs.length} / 7</span>
              </div>
            </div>

            {/* Dados de Gigs del Bot */}
            <div className="flex flex-wrap gap-1.5">
              {bot.gigs.map((g, i) => (
                <GigDieBadge key={i} die={g.die} value={g.value} stolen={Boolean(g.stolenFrom)} />
              ))}
            </div>

            {/* Leyendas del Bot (3 slots) */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {bot.legends.map((leg, i) => (
                <div
                  key={i}
                  className="h-16 bg-[#070a10] border border-gray-800 flex items-center justify-center overflow-hidden"
                >
                  {leg.isFaceUp ? (
                    <img src={leg.image} alt={leg.name} className="w-full h-full object-cover" />
                  ) : (
                    <CyberCardBack className="w-full h-full text-[9px]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* STATS DEL JUGADOR (TÚ) */}
          <div className="space-y-2 pt-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-[#00F0FF] text-[#070a10] font-black text-[10px] uppercase">
                TÚ // NETRUNNER
              </span>
              <span className="text-[10px] text-gray-400">
                MANO: {p.hand.length} | EDDIES: {availableEddies} €$
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#070a10] border border-gray-800 p-2">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-xl font-black text-[#FCEE0A]">⭐ {playerStreetCred}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 uppercase block">GIGS CONTROLADOS</span>
                <span className="text-lg font-black text-white">{p.gigs.length} / 7</span>
              </div>
            </div>

            {/* Dados de Gigs del Jugador */}
            <div className="flex flex-wrap gap-1.5">
              {p.gigs.map((g, i) => (
                <GigDieBadge key={i} die={g.die} value={g.value} stolen={Boolean(g.stolenFrom)} />
              ))}
            </div>

            {/* Leyendas del Jugador (3 slots interactivos) */}
            <div>
              <span className="text-[9px] text-gray-500 uppercase block mb-1">
                TUS LEYENDAS (3 SLOTS)
              </span>
              <div className="grid grid-cols-3 gap-1">
                {p.legends.map((leg, i) => (
                  <div
                    key={leg.instanceId || i}
                    onClick={() => {
                      if (!leg.isFaceUp && isMyTurn && !p.hasCalledLegendThisTurn) {
                        callLegendFaceUp(gameState, 'player', leg.instanceId);
                        setGameState({ ...gameState });
                      } else {
                        setInspectedCard(leg);
                      }
                    }}
                    className={`h-20 bg-[#070a10] border transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative ${
                      leg.isSpent
                        ? 'border-gray-900 opacity-40'
                        : leg.isFaceUp
                        ? 'border-[#FCEE0A] shadow-[0_0_10px_rgba(252,238,10,0.3)]'
                        : 'border-gray-800 hover:border-[#00F0FF]'
                    }`}
                    title={leg.isFaceUp ? leg.name : 'Clic para revelar Leyenda'}
                  >
                    {leg.isFaceUp ? (
                      <img src={leg.image} alt={leg.name} className="w-full h-full object-cover" />
                    ) : (
                      <CyberCardBack className="w-full h-full text-[9px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Fixer Dice Waiting */}
            <div className="border-t border-gray-900 pt-2 flex items-center justify-between text-[10px] text-gray-500">
              <span>FIXER RESTANTES:</span>
              <span className="text-white font-bold">{p.fixerDice.join(', ').toUpperCase() || 'VACÍO'}</span>
            </div>
          </div>
        </aside>

        {/* ===============================================================
            ÁREA CENTRAL: CAMPO DE BATALLA (BATTLEFIELD / TAPETE ESPACIOSO)
           =============================================================== */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-3 sm:p-5">
          {/* ZONA RIVAL: EDDIES SUPERIORES Y CAMPO DE UNIDADES DEL BOT */}
          <div className="space-y-3">
            {/* Eddies del Rival (Boca abajo en horizontal) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                EDDIES RIVAL ({getAvailableEddies(bot)} €$):
              </span>
              <div className="flex items-center gap-1">
                {bot.eddies.map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-5 bg-[#FCEE0A] border border-black rounded-sm shadow-sm"
                    title="1 €$ del rival"
                  />
                ))}
              </div>
            </div>

            {/* Campo de Batalla del Bot (Unidades grandes) */}
            <div className="min-h-[170px] sm:min-h-[200px] border border-dashed border-gray-800/80 bg-[#020408]/60 p-3 flex items-center justify-center relative">
              {bot.field.length === 0 ? (
                <span className="text-xs font-mono text-gray-600 italic">
                  [CAMPO DEL RIVAL VACÍO]
                </span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {bot.field.map((unit) => {
                    const canAttackThisUnit =
                      selectedFieldUnit &&
                      !selectedFieldUnit.isSpent &&
                      !selectedFieldUnit.isLagging &&
                      unit.isSpent;

                    return (
                      <div
                        key={unit.instanceId}
                        onClick={() => {
                          if (canAttackThisUnit) {
                            fightRivalUnit(
                              gameState,
                              'player',
                              selectedFieldUnit.instanceId,
                              unit.instanceId
                            );
                            setSelectedFieldUnit(null);
                            setGameState({ ...gameState });
                          } else {
                            setInspectedCard(unit);
                          }
                        }}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`w-28 sm:w-36 h-40 sm:h-52 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
                          canAttackThisUnit
                            ? 'border-[#FF003C] animate-pulse scale-105 shadow-[0_0_25px_rgba(255,0,60,0.6)]'
                            : unit.isSpent
                            ? 'border-gray-800 opacity-60 rotate-6'
                            : 'border-[#FF003C]/80 hover:border-[#FF003C]'
                        }`}
                      >
                        <img
                          src={unit.image}
                          alt={unit.name}
                          className="w-full h-full object-cover object-center"
                        />

                        {/* Insignia de Poder GIGANTE */}
                        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FF003C] text-white font-mono font-black text-xs sm:text-sm shadow-md">
                          {unit.currentPower}
                        </div>

                        {/* Estado: GASTADA */}
                        {unit.isSpent && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="px-2 py-1 bg-black border border-[#FF003C] text-[#FF003C] font-mono font-black text-xs uppercase tracking-wider">
                              GASTADA
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===============================================================
              LÍNEA LÁSER CENTRAL DE COMBATE (YELLOW NEON DIVIDER)
             =============================================================== */}
          <div className="my-3 relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-[2px] bg-[#FCEE0A] shadow-[0_0_15px_#FCEE0A]" />

            <div className="relative z-10 flex items-center gap-2 bg-[#000000] border border-[#FCEE0A] px-4 py-1 font-mono text-[11px] font-black uppercase text-white shadow-[0_0_20px_rgba(252,238,10,0.4)]">
              <span className="text-[#00F0FF]">TURNO {gameState.turnNumber}</span>
              <span className="text-gray-600">•</span>
              <span className={isMyTurn ? 'text-[#FCEE0A]' : 'text-[#FF003C]'}>
                {isMyTurn ? 'TU TURNO // FASE PRINCIPAL' : 'IA PENSANDO ACCIONES...'}
              </span>

              {/* Botón rápido de asalto a Gigs rivales cuando tienes unidad seleccionada */}
              {selectedFieldUnit && !selectedFieldUnit.isSpent && !selectedFieldUnit.isLagging && (
                <button
                  type="button"
                  onClick={() => {
                    attackRivalGigs(gameState, 'player', selectedFieldUnit.instanceId);
                    setSelectedFieldUnit(null);
                    setGameState({ ...gameState });
                  }}
                  className="ml-3 px-3 py-0.5 bg-[#FF003C] text-white font-black text-xs uppercase animate-pulse cursor-pointer shadow-[0_0_15px_rgba(255,0,60,0.8)]"
                >
                  ⚡ ¡ASALTAR Y ROBAR GIGS RIVALES!
                </button>
              )}
            </div>
          </div>

          {/* ZONA JUGADOR: CAMPO DE BATALLA Y EDDIES INFERIORES */}
          <div className="space-y-3">
            {/* Campo de Unidades del Jugador (Unidades grandes) */}
            <div className="min-h-[170px] sm:min-h-[200px] border border-dashed border-[#00F0FF]/40 bg-[#020408]/60 p-3 flex items-center justify-center relative">
              {p.field.length === 0 ? (
                <span className="text-xs font-mono text-gray-500 italic">
                  [TU CAMPO DE BATALLA VACÍO — JUEGA UNIDADES DESDE TU MANO ABAJO]
                </span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {p.field.map((unit) => {
                    const isSelected = selectedFieldUnit?.instanceId === unit.instanceId;
                    const canAttack = isMyTurn && !unit.isSpent && !unit.isLagging;

                    return (
                      <div
                        key={unit.instanceId}
                        onClick={() => {
                          if (canAttack) {
                            setSelectedFieldUnit(isSelected ? null : unit);
                          } else {
                            setInspectedCard(unit);
                          }
                        }}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`w-28 sm:w-36 h-40 sm:h-52 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
                          isSelected
                            ? 'border-[#FCEE0A] shadow-[0_0_35px_rgba(252,238,10,0.8)] -translate-y-2 scale-105'
                            : canAttack
                            ? 'border-[#00F0FF] hover:border-[#FCEE0A] hover:scale-105'
                            : unit.isSpent
                            ? 'border-gray-800 opacity-60 rotate-6'
                            : 'border-gray-800'
                        }`}
                      >
                        <img
                          src={unit.image}
                          alt={unit.name}
                          className="w-full h-full object-cover object-center"
                        />

                        {/* Insignia de Poder GIGANTE */}
                        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs sm:text-sm shadow-md">
                          {unit.currentPower}
                        </div>

                        {/* Estado: GASTADA */}
                        {unit.isSpent && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="px-2 py-1 bg-black border border-gray-600 text-gray-300 font-mono font-black text-xs uppercase tracking-wider">
                              GASTADA
                            </span>
                          </div>
                        )}

                        {/* Estado: LAG */}
                        {unit.isLagging && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#FF003C] text-white font-mono font-bold text-[9px] uppercase">
                            LAG
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Eddies del Jugador (Boca abajo en horizontal) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                TUS EDDIES ({availableEddies} €$ DISPONIBLES):
              </span>
              <div className="flex items-center gap-1.5">
                {p.eddies.map((ed, i) => (
                  <div
                    key={i}
                    className={`w-9 h-5 rounded-sm border shadow-sm flex items-center justify-center font-mono text-[9px] font-black ${
                      ed.isSpent
                        ? 'bg-black border-gray-800 text-gray-700'
                        : 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                    }`}
                    title={ed.isSpent ? 'Gastado este turno' : '1 €$ disponible'}
                  >
                    €$
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* ===============================================================
            PANEL LATERAL DERECHO: MAZO, BASURA Y ACCIONES DE TURNO
           =============================================================== */}
        <aside className="w-56 sm:w-64 bg-[#000000]/90 border-l border-gray-800 p-3 flex flex-col justify-between font-mono shrink-0">
          {/* Mazo y Basura del Rival */}
          <div className="space-y-2 border-b border-gray-800 pb-3">
            <span className="text-[10px] text-gray-500 uppercase block">MAZO & TRASH RIVAL</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-24 relative" title="Mazo rival">
                <CyberCardBack count={bot.deck.length} />
              </div>

              <div
                onClick={() => bot.trash.length > 0 && setInspectedCard(bot.trash[bot.trash.length - 1])}
                className="w-16 h-24 bg-[#070a10] border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
                title="Basura rival"
              >
                {bot.trash.length > 0 ? (
                  <>
                    <img
                      src={bot.trash[bot.trash.length - 1].image}
                      alt="Trash"
                      className="w-full h-full object-cover opacity-70"
                    />
                    <span className="absolute bottom-1 right-1 px-1 bg-black text-gray-300 text-[10px] font-bold">
                      {bot.trash.length}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-600">TRASH</span>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Control de la Partida */}
          <div className="space-y-3 py-4">
            <button
              type="button"
              disabled={!isMyTurn}
              onClick={() => {
                setSelectedHandCard(null);
                setSelectedFieldUnit(null);
                passTurn(gameState);
                setGameState({ ...gameState });
              }}
              style={{ clipPath: CYBER_CLIP }}
              className="w-full py-4 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-mono font-black text-sm uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(252,238,10,0.55)] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              TERMINAR TURNO ➔
            </button>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              style={{ clipPath: CYBER_CLIP }}
              className="w-full py-2.5 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] font-mono font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              TERMINAL / LOGS
            </button>
          </div>

          {/* Mazo y Basura del Jugador */}
          <div className="space-y-2 border-t border-gray-800 pt-3">
            <span className="text-[10px] text-gray-400 uppercase block">TU MAZO & TRASH</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-24 relative" title="Tu mazo">
                <CyberCardBack count={p.deck.length} />
              </div>

              <div
                onClick={() => p.trash.length > 0 && setInspectedCard(p.trash[p.trash.length - 1])}
                className="w-16 h-24 bg-[#070a10] border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
                title="Tu basura (Trash)"
              >
                {p.trash.length > 0 ? (
                  <>
                    <img
                      src={p.trash[p.trash.length - 1].image}
                      alt="Trash"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1 bg-black text-[#FCEE0A] text-[10px] font-bold">
                      {p.trash.length}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-600">TRASH</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          DRAWER INFERIOR: MANO DEL JUGADOR (CARTAS GRANDES CON ZOOM AL HOVER)
         ===================================================================== */}
      <footer className="relative z-20 bg-[#000000] border-t-2 border-[#00F0FF] p-2 sm:p-3 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          {/* Cabecera de la Mano y Acciones de la Carta Seleccionada */}
          <div className="flex flex-wrap items-center justify-between text-xs border-b border-gray-800 pb-1.5">
            <span className="text-gray-300 font-bold uppercase tracking-wider">
              TU MANO ({p.hand.length} CARTAS) // HAZ CLIC EN UNA CARTA PARA JUGARLA O VENDERLA
            </span>

            {selectedHandCard && (
              <div className="flex items-center gap-2">
                <span className="text-[#FCEE0A] font-bold">
                  {selectedHandCard.name} ({selectedHandCard.parsedCost} €$)
                </span>

                <button
                  type="button"
                  disabled={!isMyTurn || availableEddies < selectedHandCard.parsedCost}
                  onClick={() => {
                    const res = playUnitCard(gameState, 'player', selectedHandCard.instanceId);
                    if (res.success) {
                      setSelectedHandCard(null);
                      setGameState({ ...gameState });
                    } else {
                      alert(res.reason);
                    }
                  }}
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-3 py-1 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors"
                >
                  JUGAR UNIDAD ({selectedHandCard.parsedCost} €$)
                </button>

                <button
                  type="button"
                  disabled={!isMyTurn || p.hasSoldThisTurn}
                  onClick={() => {
                    const res = sellCardForEddies(gameState, 'player', selectedHandCard.instanceId);
                    if (res.success) {
                      setSelectedHandCard(null);
                      setGameState({ ...gameState });
                    } else {
                      alert(res.reason);
                    }
                  }}
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-3 py-1 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors"
                >
                  VENDER (+1 €$)
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedCard(selectedHandCard)}
                  className="px-2 py-1 bg-[#070a10] border border-gray-700 hover:border-white text-gray-300 cursor-pointer"
                  title="Ver en grande"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHandCard(null)}
                  className="text-gray-500 hover:text-white px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Carrusel de cartas de la mano (Grandes y legibles) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-2">
            {p.hand.map((card) => {
              const isSelected = selectedHandCard?.instanceId === card.instanceId;
              const canAfford = availableEddies >= (card.parsedCost || 0);

              return (
                <div
                  key={card.instanceId}
                  onClick={() => setSelectedHandCard(isSelected ? null : card)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`w-28 sm:w-36 h-40 sm:h-52 bg-black border-2 transition-all duration-200 cursor-pointer shrink-0 relative hover:-translate-y-6 hover:scale-110 hover:z-30 shadow-2xl ${
                    isSelected
                      ? 'border-[#FCEE0A] shadow-[0_0_35px_rgba(252,238,10,0.8)] -translate-y-6 scale-110 z-30'
                      : canAfford && isMyTurn
                      ? 'border-[#00F0FF]/80 hover:border-[#FCEE0A]'
                      : 'border-gray-800 opacity-70'
                  }`}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover object-center"
                  />

                  {/* Coste y Poder visibles con máxima claridad */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/90 border border-[#00F0FF] text-[#00F0FF] text-[10px] sm:text-xs font-black">
                    {card.parsedCost} €$
                  </div>

                  <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] text-[10px] sm:text-xs font-black shadow-md">
                    {card.parsedPower}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODAL DE MULLIGAN (INICIO DE PARTIDA)
         ===================================================================== */}
      {!gameState.mulliganDecided && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-xl w-full bg-[#000000] border-2 border-[#FCEE0A] p-6 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(252,238,10,0.45)] text-center"
          >
            <div className="space-y-1">
              <span className="text-[11px] text-[#00F0FF] uppercase tracking-widest block">
                FASE INICIAL // PREPARACIÓN DE PARTIDA
              </span>
              <h2 className="text-2xl font-black text-white uppercase">
                TU MANO INICIAL <span className="text-[#FCEE0A]">({p.hand.length} CARTAS)</span>
              </h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              ¿Deseas conservar esta mano de apertura o prefieres realizar un <strong>MULLIGAN</strong> para barajarla en el mazo y robar 5 cartas nuevas?
            </p>

            {/* Vista previa de las 5 cartas iniciales */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {p.hand.map((c) => (
                <div
                  key={c.instanceId}
                  style={{ clipPath: CYBER_CLIP }}
                  className="w-20 sm:w-24 h-28 sm:h-36 bg-black border border-gray-700 shrink-0 relative overflow-hidden"
                >
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 px-1 bg-[#FCEE0A] text-[#070a10] text-[9px] font-black">
                    {c.parsedCost} €$
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  keepHand(gameState, 'player');
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_CLIP }}
                className="py-3.5 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase tracking-widest cursor-pointer transition-colors shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                MANTENER MANO (KEEP)
              </button>

              <button
                type="button"
                onClick={() => {
                  mulliganHand(gameState, 'player');
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_CLIP }}
                className="py-3.5 bg-[#070a10] border border-[#FF003C] hover:bg-[#FF003C] hover:text-white text-[#FF003C] font-black text-xs uppercase tracking-widest cursor-pointer transition-colors"
              >
                MULLIGAN (CAMBIAR)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE INSPECCIÓN HD DE CARTA
         ===================================================================== */}
      {inspectedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono"
          onClick={() => setInspectedCard(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-md w-full bg-[#000000] border-2 border-[#00F0FF] p-4 space-y-3 relative shadow-[0_0_50px_rgba(0,240,255,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs text-[#00F0FF] font-black uppercase">
                {inspectedCard.name}
              </span>
              <button
                type="button"
                onClick={() => setInspectedCard(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="w-full flex justify-center py-2">
              <img
                src={inspectedCard.image}
                alt={inspectedCard.name}
                className="max-h-[70vh] w-auto object-contain rounded-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE REGISTRO DE COMBATE (TERMINAL LOG)
         ===================================================================== */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs"
          onClick={() => setShowLogModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-2xl w-full bg-[#000000] border-2 border-[#00F0FF] p-6 space-y-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-bold text-[#FCEE0A] uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span>REGISTRO DE COMBATE // TERMINAL NETWATCH</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 text-gray-300 pr-2">
              {gameState.actionLog.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 border-b border-gray-900 ${
                    log.includes('¡VICTORIA')
                      ? 'text-[#FCEE0A] font-bold bg-[#FCEE0A]/10'
                      : log.includes('¡ATAQUE')
                      ? 'text-[#FF003C] font-bold'
                      : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE VICTORIA / DERROTA
         ===================================================================== */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className={`max-w-lg w-full p-8 text-center space-y-6 border-2 ${
              gameState.winner === 'player'
                ? 'bg-[#000000] border-[#FCEE0A] shadow-[0_0_60px_rgba(252,238,10,0.5)]'
                : 'bg-[#000000] border-[#FF003C] shadow-[0_0_60px_rgba(255,0,60,0.5)]'
            }`}
          >
            <span className="text-4xl block">
              {gameState.winner === 'player' ? '🏆' : '💀'}
            </span>

            <h2
              className={`text-2xl font-black uppercase ${
                gameState.winner === 'player' ? 'text-[#FCEE0A]' : 'text-[#FF003C]'
              }`}
            >
              {gameState.winner === 'player'
                ? '¡VICTORIA EN NIGHT CITY!'
                : 'DESCONECTADO // DERROTA'}
            </h2>

            <p className="text-xs text-gray-300">
              {gameState.winner === 'player'
                ? 'Has alcanzado los 7 Gigs requeridos y has dominado a la inteligencia artificial.'
                : 'La IA ha superado tu estrategia o te has quedado sin cartas en el mazo.'}
            </p>

            <button
              type="button"
              onClick={() => handleStartGame()}
              style={{ clipPath: CYBER_CLIP }}
              className="px-8 py-3 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase tracking-widest cursor-pointer transition-colors"
            >
              JUGAR OTRA PARTIDA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
