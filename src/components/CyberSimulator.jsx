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

// =========================================================================
// COMPONENTE DADO POLIÉDRICO SVG (D4, D6, D8, D10, D12, D20)
// =========================================================================
function PolyhedralDie({
  type = 'd6',
  value = null,
  isWaiting = false,
  isStolen = false,
  size = 44,
  label = ''
}) {
  const normType = (type || 'd6').toLowerCase();

  const strokeColor = isWaiting ? '#4b5563' : isStolen ? '#FF003C' : '#00F0FF';
  const fillColor = isWaiting
    ? '#090d16'
    : isStolen
    ? 'rgba(255, 0, 60, 0.25)'
    : 'rgba(0, 240, 255, 0.20)';
  const textColor = isWaiting ? '#6b7280' : isStolen ? '#ffffff' : '#FCEE0A';

  const renderShape = () => {
    switch (normType) {
      case 'd4': // Triángulo
        return (
          <polygon
            points="25,6 45,42 5,42"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'd6': // Cubo / Hexágono
        return (
          <polygon
            points="25,5 44,15 44,35 25,45 6,35 6,15"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'd8': // Diamante / Octaedro
        return (
          <polygon
            points="25,4 45,25 25,46 5,25"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'd10': // Decaedro / Escudo
        return (
          <polygon
            points="25,4 46,18 38,44 12,44 4,18"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'd12': // Dodecaedro / Pentágono
        return (
          <polygon
            points="25,4 46,19 38,44 12,44 4,19"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'd20': // Icosaedro con facetas
      default:
        return (
          <g>
            <polygon
              points="25,3 46,14 46,36 25,47 4,36 4,14"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <polygon
              points="25,12 37,33 13,33"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeDasharray="2 1"
            />
          </g>
        );
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center relative select-none transition-transform hover:scale-110 cursor-pointer shrink-0"
      style={{ width: size }}
      title={`${normType.toUpperCase()}: ${
        value !== null ? `Resultado: ${value} ⭐` : 'En espera en el Fixer'
      }`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 50 50"
          className={`w-full h-full ${
            !isWaiting
              ? isStolen
                ? 'drop-shadow-[0_0_8px_rgba(255,0,60,0.7)]'
                : 'drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'
              : ''
          }`}
        >
          {renderShape()}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {value !== null ? (
            <span
              className="font-mono font-black text-xs sm:text-sm drop-shadow-[0_0_4px_#000]"
              style={{ color: textColor }}
            >
              {value}
            </span>
          ) : (
            <span className="font-mono font-bold text-[8px] sm:text-[9px] text-gray-500">
              {normType.toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <span
        className={`text-[8px] font-mono font-bold uppercase tracking-tight mt-0.5 leading-none ${
          isWaiting ? 'text-gray-600' : isStolen ? 'text-[#FF003C]' : 'text-[#00F0FF]'
        }`}
      >
        {label || normType}
      </span>
    </div>
  );
}

// Reverso oficial icónico de carta Cyberpunk TCG (Normal y Leyenda)
function CyberCardBack({ className = '', count = null, isLegend = false }) {
  const [imgError, setImgError] = useState(false);
  const src = isLegend ? '/images/back_leyenda.jpg' : '/images/back_normal.png';

  if (!imgError) {
    return (
      <div className={`relative rounded-sm overflow-hidden select-none shadow-md ${className}`}>
        <img
          src={src}
          alt={isLegend ? 'Legend Card Back' : 'Cyberpunk TCG Card Back'}
          className="w-full h-full object-cover pointer-events-none"
          onError={() => setImgError(true)}
        />
        {count !== null && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/90 text-[#00F0FF] border border-[#00F0FF]/40 font-mono font-black text-[9px] sm:text-[10px] rounded shadow">
            {count}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative bg-[#FCEE0A] border-2 border-black rounded-sm overflow-hidden flex flex-col items-center justify-center select-none shadow-md ${className}`}
    >
      <div className="absolute inset-1 border border-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/20 pointer-events-none" />
      <span className="font-black text-black text-[11px] sm:text-[13px] tracking-widest font-mono uppercase -rotate-90 whitespace-nowrap">
        CYBERPUNK <span className="text-[#FF003C]">TCG</span>
      </span>
      {count !== null && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black text-[#00F0FF] font-mono font-black text-[9px] sm:text-[10px]">
          {count}
        </span>
      )}
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
  const isMyTurn =
    gameState.activePlayer === 'player' && !gameState.isGameOver && gameState.mulliganDecided;
  const playerStreetCred = calculateStreetCred(p.gigs);
  const botStreetCred = calculateStreetCred(bot.gigs);
  const availableEddies = getAvailableEddies(p);

  return (
    <div className="min-h-screen max-h-screen h-screen bg-[#04060b] text-white font-sans select-none flex flex-col justify-between relative overflow-hidden">
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
      <header className="relative z-10 bg-[#000000] border-b border-gray-800 px-4 py-1.5 flex items-center justify-between font-mono text-xs shrink-0">
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
          [PANEL IZQ: DADOS / FIXER / GIGS / STATS] [CENTRO: TAPETE] [PANEL DER: MAZO / ACCIONES]
         ===================================================================== */}
      <div className="relative z-10 flex-1 flex flex-row overflow-hidden w-full">
        {/* ===============================================================
            PANEL LATERAL IZQUIERDO: SECCIÓN COMPLETA DE DADOS Y FIXER
           =============================================================== */}
        <aside className="w-72 sm:w-80 bg-[#000000]/95 border-r border-gray-800 p-2.5 flex flex-col justify-between font-mono shrink-0 overflow-y-auto">
          {/* SECCIÓN SUPERIOR: DADOS Y GIGS DEL RIVAL (BOT) */}
          <div className="space-y-2 border-b border-gray-800 pb-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-[#FF003C] text-white font-black text-[10px] uppercase">
                RIVAL // BOT
              </span>
              <span className="text-[10px] text-gray-400">
                MANO: {bot.hand.length} | EDDIES: {getAvailableEddies(bot)} €$
              </span>
            </div>

            {/* Marcador Gig y Street Cred del Bot */}
            <div className="flex items-center justify-between bg-[#070a10] border border-gray-800 px-3 py-1.5">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-xl font-black text-[#FCEE0A]">⭐ {botStreetCred}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 uppercase block">GIGS GANADOS</span>
                <span className="text-lg font-black text-white">{bot.gigs.length} / 7</span>
              </div>
            </div>

            {/* DADOS DE GIG ACTIVOS DEL BOT (PROMINENTES) */}
            <div className="bg-[#03060c] border border-[#FF003C]/40 p-2">
              <span className="text-[9px] text-[#FF003C] font-bold uppercase tracking-wider block mb-1">
                🎲 GIG DICE DEL RIVAL (ACTIVAS: {bot.gigs.length}):
              </span>
              <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
                {bot.gigs.length === 0 ? (
                  <span className="text-[10px] text-gray-600 italic">Sin dados en juego</span>
                ) : (
                  bot.gigs.map((g, i) => (
                    <PolyhedralDie
                      key={i}
                      type={g.die}
                      value={g.value}
                      isStolen={Boolean(g.stolenFrom)}
                      size={40}
                    />
                  ))
                )}
              </div>
            </div>

            {/* DADOS RESTANTES EN EL FIXER DEL BOT */}
            <div className="flex items-center justify-between bg-[#070a10] border border-gray-900 px-2 py-1">
              <span className="text-[9px] text-gray-500 uppercase">FIXER RIVAL:</span>
              <div className="flex items-center gap-1.5">
                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((d) => {
                  const waiting = bot.fixerDice.includes(d);
                  return (
                    <PolyhedralDie
                      key={d}
                      type={d}
                      value={null}
                      isWaiting={waiting}
                      size={24}
                    />
                  );
                })}
              </div>
            </div>

            {/* LEYENDAS DEL RIVAL (3 SLOTS) */}
            <div className="pt-1">
              <span className="text-[9px] text-gray-500 uppercase block mb-1">
                LEYENDAS RIVAL (3 SLOTS):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {bot.legends.map((leg, i) => (
                  <div
                    key={leg.instanceId || i}
                    onClick={() => leg.isFaceUp && setInspectedCard(leg)}
                    className={`h-14 sm:h-16 bg-[#070a10] border transition-all flex flex-col items-center justify-center overflow-hidden relative ${
                      leg.isSpent
                        ? 'border-gray-900 opacity-40'
                        : leg.isFaceUp
                        ? 'border-[#FF003C] shadow-[0_0_10px_rgba(255,0,60,0.3)] cursor-pointer'
                        : 'border-gray-800'
                    }`}
                    title={leg.isFaceUp ? leg.name : 'Leyenda boca abajo del Rival'}
                  >
                    {leg.isFaceUp ? (
                      <img src={leg.image} alt={leg.name} className="w-full h-full object-cover" />
                    ) : (
                      <CyberCardBack isLegend={true} className="w-full h-full text-[8px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN INFERIOR: DADOS Y GIGS DEL JUGADOR (TÚ) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-[#00F0FF] text-[#070a10] font-black text-[10px] uppercase">
                TÚ // NETRUNNER
              </span>
              <span className="text-[10px] text-gray-400">
                MANO: {p.hand.length} | EDDIES: {availableEddies} €$
              </span>
            </div>

            {/* Marcador Gig y Street Cred del Jugador */}
            <div className="flex items-center justify-between bg-[#070a10] border border-gray-800 px-3 py-1.5">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-xl font-black text-[#FCEE0A]">⭐ {playerStreetCred}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 uppercase block">GIGS GANADOS</span>
                <span className="text-lg font-black text-white">{p.gigs.length} / 7</span>
              </div>
            </div>

            {/* DADOS DE GIG ACTIVOS DEL JUGADOR (PROMINENTES) */}
            <div className="bg-[#03060c] border border-[#00F0FF]/50 p-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <span className="text-[9px] text-[#00F0FF] font-bold uppercase tracking-wider block mb-1">
                🎲 TUS GIG DICE ACTIVOS ({p.gigs.length} / 7 PARA GANAR):
              </span>
              <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
                {p.gigs.map((g, i) => (
                  <PolyhedralDie
                    key={i}
                    type={g.die}
                    value={g.value}
                    isStolen={Boolean(g.stolenFrom)}
                    size={42}
                  />
                ))}
              </div>
            </div>

            {/* DADOS EN EL FIXER DEL JUGADOR (D4 a D20) */}
            <div className="flex items-center justify-between bg-[#070a10] border border-gray-900 px-2 py-1">
              <span className="text-[9px] text-gray-500 uppercase">TU FIXER:</span>
              <div className="flex items-center gap-1.5">
                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((d) => {
                  const waiting = p.fixerDice.includes(d);
                  return (
                    <PolyhedralDie
                      key={d}
                      type={d}
                      value={null}
                      isWaiting={waiting}
                      size={24}
                    />
                  );
                })}
              </div>
            </div>

            {/* Leyendas del Jugador (3 slots interactivos) */}
            <div className="pt-1">
              <span className="text-[9px] text-gray-500 uppercase block mb-1">
                TUS LEYENDAS (3 SLOTS):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
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
                    className={`h-16 bg-[#070a10] border transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative ${
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
                      <CyberCardBack isLegend={true} className="w-full h-full text-[9px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ===============================================================
            ÁREA CENTRAL: CAMPO DE BATALLA (BATTLEFIELD / TAPETE ESPACIOSO)
           =============================================================== */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-2.5 sm:p-4">
          {/* ZONA RIVAL: MANO RIVAL, EDDIES, BANDEJA DE DADOS Y CAMPO */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#000000]/75 border border-gray-800/80 px-3 py-1.5 rounded-sm">
              {/* Mano del Rival (Boca abajo) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  MANO RIVAL ({bot.hand.length}):
                </span>
                <div className="flex items-center gap-1">
                  {bot.hand.map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-9 sm:w-7 sm:h-10 rounded-xs overflow-hidden shadow border border-black shrink-0"
                      title="Carta oculta en mano del rival"
                    >
                      <CyberCardBack className="w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Eddies del Rival (Boca abajo en horizontal) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  EDDIES ({getAvailableEddies(bot)} €$):
                </span>
                <div className="flex items-center gap-1">
                  {bot.eddies.map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-3.5 bg-[#FCEE0A] border border-black rounded-xs shadow-sm"
                      title="1 €$ del rival"
                    />
                  ))}
                </div>
              </div>

              {/* Dados Gig del Rival en el campo */}
              <div className="flex items-center gap-1.5 bg-[#070a10] border border-[#FF003C]/40 px-2 py-0.5 rounded-sm">
                <span className="text-[9px] font-mono text-[#FF003C] font-black uppercase">
                  DADOS GIG RIVAL ({bot.gigs.length}):
                </span>
                <div className="flex items-center gap-1.5">
                  {bot.gigs.map((g, i) => (
                    <PolyhedralDie key={i} type={g.die} value={g.value} size={30} isStolen={Boolean(g.stolenFrom)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Campo de Batalla del Bot (Unidades visibles) */}
            <div className="min-h-[140px] sm:min-h-[160px] border border-dashed border-gray-800/80 bg-[#020408]/60 p-2.5 flex items-center justify-center relative">
              {bot.field.length === 0 ? (
                <span className="text-xs font-mono text-gray-600 italic">
                  [CAMPO DEL RIVAL VACÍO]
                </span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
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
                        className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
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
                        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FF003C] text-white font-mono font-black text-xs shadow-md">
                          {unit.currentPower}
                        </div>

                        {/* Estado: GASTADA */}
                        {unit.isSpent && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="px-2 py-0.5 bg-black border border-[#FF003C] text-[#FF003C] font-mono font-black text-[11px] uppercase tracking-wider">
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
          <div className="my-2 relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-[2px] bg-[#FCEE0A] shadow-[0_0_15px_#FCEE0A]" />

            <div className="relative z-10 flex items-center gap-2 bg-[#000000] border border-[#FCEE0A] px-3 py-1 font-mono text-[11px] font-black uppercase text-white shadow-[0_0_20px_rgba(252,238,10,0.4)]">
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
                  className="ml-2 px-3 py-0.5 bg-[#FF003C] text-white font-black text-xs uppercase animate-pulse cursor-pointer shadow-[0_0_15px_rgba(255,0,60,0.8)]"
                >
                  ⚡ ¡ASALTAR Y ROBAR GIGS RIVALES!
                </button>
              )}
            </div>
          </div>

          {/* ZONA JUGADOR: CAMPO DE BATALLA, BANDEJA DE DADOS Y EDDIES */}
          <div className="space-y-2">
            {/* Campo de Unidades del Jugador */}
            <div className="min-h-[140px] sm:min-h-[160px] border border-dashed border-[#00F0FF]/40 bg-[#020408]/60 p-2.5 flex items-center justify-center relative">
              {p.field.length === 0 ? (
                <span className="text-xs font-mono text-gray-500 italic">
                  [TU CAMPO DE BATALLA VACÍO — JUEGA UNIDADES DESDE TU MANO ABAJO]
                </span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
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
                        className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
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
                        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs shadow-md">
                          {unit.currentPower}
                        </div>

                        {/* Estado: GASTADA */}
                        {unit.isSpent && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="px-2 py-0.5 bg-black border border-gray-600 text-gray-300 font-mono font-black text-[11px] uppercase tracking-wider">
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

            {/* Fila Inferior: Eddies y Dados de Gig del Jugador */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#000000]/75 border border-gray-800/80 px-3 py-1.5 rounded-sm">
              {/* Eddies del Jugador */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  TUS EDDIES ({availableEddies} €$ DISPONIBLES):
                </span>
                <div className="flex items-center gap-1">
                  {p.eddies.map((ed, i) => (
                    <div
                      key={i}
                      className={`w-6 h-3.5 rounded-xs border shadow-sm flex items-center justify-center font-mono text-[7px] font-black ${
                        ed.isSpent
                          ? 'bg-black border-gray-800 text-gray-700'
                          : 'bg-[#00F0FF]/25 border-[#00F0FF] text-[#00F0FF]'
                      }`}
                      title={ed.isSpent ? 'Gastado este turno' : '1 €$ disponible'}
                    >
                      €$
                    </div>
                  ))}
                </div>
              </div>

              {/* Dados Gig del Jugador en el campo */}
              <div className="flex items-center gap-1.5 bg-[#070a10] border border-[#00F0FF]/50 px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                <span className="text-[9px] font-mono text-[#00F0FF] font-black uppercase">
                  TUS DADOS GIG ({p.gigs.length} / 7):
                </span>
                <div className="flex items-center gap-1.5">
                  {p.gigs.map((g, i) => (
                    <PolyhedralDie key={i} type={g.die} value={g.value} size={30} isStolen={Boolean(g.stolenFrom)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ===============================================================
            PANEL LATERAL DERECHO: MAZO, BASURA Y ACCIONES DE TURNO
           =============================================================== */}
        <aside className="w-48 sm:w-56 bg-[#000000]/95 border-l border-gray-800 p-2.5 flex flex-col justify-between font-mono shrink-0">
          {/* Mazo y Basura del Rival */}
          <div className="space-y-1.5 border-b border-gray-800 pb-2">
            <span className="text-[10px] text-gray-500 uppercase block">MAZO & TRASH RIVAL</span>
            <div className="flex items-center gap-2">
              <div className="w-14 h-20 relative" title="Mazo rival">
                <CyberCardBack count={bot.deck.length} />
              </div>

              <div
                onClick={() =>
                  bot.trash.length > 0 && setInspectedCard(bot.trash[bot.trash.length - 1])
                }
                className="w-14 h-20 bg-[#070a10] border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
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
                  <span className="text-[9px] text-gray-600">TRASH</span>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Control de la Partida */}
          <div className="space-y-2 py-2">
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
              className="w-full py-3.5 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-mono font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(252,238,10,0.55)] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              TERMINAR TURNO ➔
            </button>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              style={{ clipPath: CYBER_CLIP }}
              className="w-full py-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] font-mono font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              TERMINAL / LOGS
            </button>
          </div>

          {/* Mazo y Basura del Jugador */}
          <div className="space-y-1.5 border-t border-gray-800 pt-2">
            <span className="text-[10px] text-gray-400 uppercase block">TU MAZO & TRASH</span>
            <div className="flex items-center gap-2">
              <div className="w-14 h-20 relative" title="Tu mazo">
                <CyberCardBack count={p.deck.length} />
              </div>

              <div
                onClick={() =>
                  p.trash.length > 0 && setInspectedCard(p.trash[p.trash.length - 1])
                }
                className="w-14 h-20 bg-[#070a10] border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
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
                  <span className="text-[9px] text-gray-600">TRASH</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          DRAWER INFERIOR: MANO DEL JUGADOR (MÁS COMPACTA Y CON HOVER LIFT)
         ===================================================================== */}
      <footer className="relative z-20 bg-[#000000] border-t-2 border-[#00F0FF] px-3 py-1.5 font-mono shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-1">
          {/* Cabecera de la Mano y Acciones de la Carta Seleccionada */}
          <div className="flex flex-wrap items-center justify-between text-xs border-b border-gray-900 pb-1">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              TU MANO ({p.hand.length} CARTAS)
            </span>

            {selectedHandCard && (
              <div className="flex items-center gap-2">
                <span className="text-[#FCEE0A] font-bold text-xs">
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
                  className="px-2.5 py-0.5 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors"
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
                  className="px-2.5 py-0.5 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors"
                >
                  VENDER (+1 €$)
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedCard(selectedHandCard)}
                  className="p-1 bg-[#070a10] border border-gray-700 hover:border-white text-gray-300 cursor-pointer"
                  title="Ver en grande"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHandCard(null)}
                  className="text-gray-500 hover:text-white px-1 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Carrusel de cartas de la mano: MÁS COMPACTAS Y CON HOVER LIFT */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {p.hand.map((card) => {
              const isSelected = selectedHandCard?.instanceId === card.instanceId;
              const canAfford = availableEddies >= (card.parsedCost || 0);

              return (
                <div
                  key={card.instanceId}
                  onClick={() => setSelectedHandCard(isSelected ? null : card)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`w-16 sm:w-20 md:w-24 h-24 sm:h-28 md:h-32 bg-black border transition-all duration-150 cursor-pointer shrink-0 relative hover:-translate-y-4 hover:scale-110 hover:z-30 shadow-lg ${
                    isSelected
                      ? 'border-[#FCEE0A] shadow-[0_0_25px_rgba(252,238,10,0.8)] -translate-y-4 scale-110 z-30'
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

                  {/* Coste y Poder visibles */}
                  <div className="absolute top-0.5 left-0.5 px-1 bg-black/90 border border-[#00F0FF] text-[#00F0FF] text-[8px] sm:text-[9px] font-black">
                    {card.parsedCost} €$
                  </div>

                  <div className="absolute bottom-0.5 right-0.5 px-1.5 bg-[#FCEE0A] text-[#070a10] text-[9px] sm:text-[10px] font-black shadow-md">
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
