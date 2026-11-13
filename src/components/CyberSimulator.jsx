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
  Maximize2,
  Undo2,
  Bot,
  User,
  Radio
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

// =========================================================================
// CLIP-PATHS GEOMÉTRICOS CYBERPUNK (ESQUINAS RECORTADAS EN DIAGONAL)
// =========================================================================
const CYBER_CLIP =
  'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';
const CYBER_CARD_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';
const CYBER_AVATAR_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';

// Helper para identificar si una carta es LEYENDA (usa reverso back_leyenda.jpg)
// Las unidades, gears y programas usan reverso normal (back_normal.png)
export function isLegendCard(card) {
  if (!card) return false;
  if (card.isLegend === true) return true;
  const official = (card.officialType || '').toUpperCase();
  if (official === 'LEGEND') return true;
  const cardType = (card.cardType || card.type || '').toUpperCase();
  if (cardType.startsWith('LEGEND') || cardType.includes('LEGEND')) return true;
  return false;
}

// =========================================================================
// COMPONENTE DADO POLIÉDRICO SVG (D4, D6, D8, D10, D12, D20)
// =========================================================================
function PolyhedralDie({
  type = 'd6',
  value = null,
  isWaiting = false,
  isStolen = false,
  size = 40,
  label = ''
}) {
  const normType = (type || 'd6').toLowerCase();

  const strokeColor = isWaiting
    ? '#374151'
    : isStolen
    ? '#FF003C'
    : '#0dfceb';
  const fillColor = isWaiting
    ? '#090d16'
    : isStolen
    ? 'rgba(255, 0, 60, 0.25)'
    : 'rgba(13, 252, 235, 0.20)';
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
      case 'd20': // Icosaedro facetado
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
                : 'drop-shadow-[0_0_8px_rgba(13,252,235,0.6)]'
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
          isWaiting ? 'text-gray-600' : isStolen ? 'text-[#FF003C]' : 'text-[#0dfceb]'
        }`}
      >
        {label || normType}
      </span>
    </div>
  );
}

// =========================================================================
// REVERSO OFICIAL DE CARTA (Normal y Leyenda)
// =========================================================================
function CyberCardBack({ className = '', count = null, isLegend = false, card = null }) {
  const [imgError, setImgError] = useState(false);
  const legend = isLegend || isLegendCard(card);
  const src = legend ? '/images/back_leyenda.jpg' : '/images/back_normal.png';

  if (!imgError) {
    return (
      <div className={`relative rounded-sm overflow-hidden select-none shadow-md ${className}`}>
        <img
          src={src}
          alt={legend ? 'Legend Card Back' : 'Cyberpunk TCG Card Back'}
          className="w-full h-full object-cover pointer-events-none"
          onError={() => setImgError(true)}
        />
        {count !== null && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/90 text-[#00F0FF] border border-[#0dfceb]/40 font-mono font-black text-[9px] sm:text-[10px] rounded shadow">
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

// =========================================================================
// PILA DE MAZO / DESCARTE (Reverso amarillo #FCEE0A con corte diagonal)
// =========================================================================
function CyberDeckPile({
  count = 0,
  isTrash = false,
  topCard = null,
  onClick = null,
  label = 'MAZO',
  sizeClass = 'w-16 sm:w-20 h-22 sm:h-28'
}) {
  return (
    <div
      onClick={onClick}
      style={{ clipPath: CYBER_CLIP }}
      className={`relative ${sizeClass} overflow-hidden select-none cursor-pointer transition-all hover:scale-105 shrink-0 shadow-lg ${
        isTrash
          ? 'bg-[#070a10] border-2 border-dashed border-[#0dfceb]/40 hover:border-[#0dfceb]'
          : 'bg-[#FCEE0A] border-2 border-black hover:shadow-[0_0_20px_rgba(252,238,10,0.6)]'
      }`}
      title={`${label}: ${count} cartas`}
    >
      {!isTrash ? (
        <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center bg-[#FCEE0A]">
          {/* Patrón de líneas diagonales técnicas */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 0, transparent 8px)'
            }}
          />
          <img
            src="/images/back_normal.png"
            alt="Reverso Mazo"
            className="w-full h-full object-cover pointer-events-none opacity-90"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 border border-black/40 pointer-events-none" />
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black text-[#00F0FF] border border-[#0dfceb]/40 font-mono font-black text-[9px] sm:text-[10px] rounded shadow">
            {count}
          </div>
          <div className="absolute top-1 left-1 px-1 bg-black text-[#FCEE0A] font-mono font-black text-[7px] sm:text-[8px] uppercase tracking-wider">
            {label}
          </div>
        </div>
      ) : (
        <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center bg-[#070a10]">
          {topCard ? (
            <img
              src={topCard.image}
              alt="Trash"
              className="w-full h-full object-cover opacity-75"
            />
          ) : (
            <div className="text-center p-1 font-mono text-[8px] sm:text-[9px] text-gray-500">
              TRASH
              <br />
              VACÍO
            </div>
          )}
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black text-[#FF003C] border border-[#FF003C]/40 font-mono font-black text-[9px] sm:text-[10px] rounded shadow">
            {count}
          </div>
          <div className="absolute top-1 left-1 px-1 bg-black text-gray-400 font-mono font-black text-[7px] sm:text-[8px] uppercase tracking-wider">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL DEL SIMULADOR
// =========================================================================
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
  const [isInspectedFlipped, setIsInspectedFlipped] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Pila de historial para la función "DESHACER" (Undo)
  const [history, setHistory] = useState([]);

  const pushHistory = () => {
    if (gameState) {
      setHistory((prev) => [...prev.slice(-10), JSON.parse(JSON.stringify(gameState))]);
    }
  };

  const handleUndo = () => {
    if (history.length > 0 && gameState?.activePlayer === 'player' && !gameState?.isGameOver) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setGameState(prev);
      setSelectedHandCard(null);
      setSelectedFieldUnit(null);
    }
  };

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
    setHistory([]);
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

  // Si no está autenticado, mostrar terminal de acceso
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070a10] text-white flex items-center justify-center p-4 relative overflow-hidden font-mono">
        <div
          className="pointer-events-none fixed inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(13, 252, 235, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div
          style={{ clipPath: CYBER_CLIP }}
          className="max-w-md w-full bg-[#000000] border-2 border-[#0dfceb] p-8 shadow-[0_0_50px_rgba(13,252,235,0.35)] space-y-6 relative z-10"
        >
          <div className="flex items-center gap-3 border-b border-[#0dfceb]/30 pb-4">
            <Lock className="w-6 h-6 text-[#FCEE0A]" />
            <div>
              <span className="text-[10px] text-[#0dfceb] uppercase tracking-widest block">
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
              style={{ clipPath: CYBER_BUTTON }}
              className="w-full py-3 bg-[#FCEE0A] hover:bg-[#0dfceb] text-[#070a10] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(13,252,235,0.4)]"
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
    <div className="min-h-screen max-h-screen h-screen bg-[#070a10] text-white font-sans select-none flex flex-col justify-between relative overflow-hidden">
      {/* =====================================================================
          1. ESTRUCTURA DEL TABLERO: FONDO OSCURO SÓLIDO Y LÍNEAS DE CUADRÍCULA NEÓN
         ===================================================================== */}
      <div
        className="pointer-events-none fixed inset-0 opacity-15 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(13, 252, 235, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* =====================================================================
          BARRA SUPERIOR: BOTONES CON BORDES AFILADOS Y EFECTO EXTERIOR
          hover:shadow-[0_0_15px_rgba(13,252,235,0.4)]
         ===================================================================== */}
      <header className="relative z-20 bg-[#070a10]/95 border-b border-[#0dfceb]/30 px-3 sm:px-4 py-2 flex items-center justify-between font-mono text-xs shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0dfceb] animate-pulse" />
            <span className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">
              CYBERPUNK TCG // <span className="text-[#FCEE0A]">SIMULADOR</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-gray-400 pl-3 border-l border-[#0dfceb]/30">
            <span className="text-[#0dfceb] font-bold">TURNO {gameState.turnNumber}</span>
            <span className="text-gray-700">•</span>
            <span
              className={`font-black uppercase px-2 py-0.5 text-[11px] ${
                isMyTurn
                  ? 'bg-[#0dfceb] text-[#070a10]'
                  : 'bg-[#FF003C] text-white animate-pulse'
              }`}
            >
              {isMyTurn ? 'TU TURNO // FASE PRINCIPAL' : 'IA PENSANDO ACCIONES...'}
            </span>
          </div>
        </div>

        {/* Botones de Utilidad con Bordes Afilados */}
        <div className="flex items-center gap-2">
          {/* Botón Deshacer */}
          <button
            type="button"
            disabled={history.length === 0 || !isMyTurn}
            onClick={handleUndo}
            style={{ clipPath: CYBER_BUTTON }}
            className="px-2.5 sm:px-3 py-1.5 bg-[#000000] border border-[#0dfceb]/40 hover:border-[#0dfceb] text-[#0dfceb] font-bold uppercase flex items-center gap-1.5 cursor-pointer text-xs transition-all hover:shadow-[0_0_15px_rgba(13,252,235,0.4)] disabled:opacity-30 disabled:pointer-events-none"
            title="Deshacer la última acción de tu turno"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DESHACER</span>
          </button>

          {/* Botón Terminar Turno */}
          <button
            type="button"
            disabled={!isMyTurn}
            onClick={() => {
              setSelectedHandCard(null);
              setSelectedFieldUnit(null);
              setHistory([]);
              passTurn(gameState);
              setGameState({ ...gameState });
            }}
            style={{ clipPath: CYBER_BUTTON }}
            className="px-3 sm:px-4 py-1.5 bg-[#FCEE0A] hover:bg-[#0dfceb] text-[#070a10] font-black uppercase flex items-center gap-1.5 cursor-pointer text-xs transition-all shadow-[0_0_15px_rgba(252,238,10,0.4)] hover:shadow-[0_0_15px_rgba(13,252,235,0.4)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <Play className="w-3.5 h-3.5" />
            <span>TERMINAR TURNO</span>
          </button>

          {/* Botón Registro (Log Terminal Flotante) */}
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            style={{ clipPath: CYBER_BUTTON }}
            className="px-2.5 sm:px-3 py-1.5 bg-[#000000] border border-[#0dfceb]/40 hover:border-[#0dfceb] text-[#0dfceb] font-bold uppercase flex items-center gap-1.5 cursor-pointer text-xs transition-all hover:shadow-[0_0_15px_rgba(13,252,235,0.4)]"
            title="Abrir Terminal de Registro de Combate"
          >
            <Terminal className="w-3.5 h-3.5 text-[#FCEE0A]" />
            <span className="hidden sm:inline">LOGS ({gameState.actionLog.length})</span>
          </button>

          {/* Botón Reglas Rápidas */}
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            style={{ clipPath: CYBER_BUTTON }}
            className="p-1.5 bg-[#000000] border border-gray-700 hover:border-[#0dfceb] text-gray-300 hover:text-white cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(13,252,235,0.4)]"
            title="Guía de Reglas Rápidas"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Botón Reiniciar */}
          <button
            type="button"
            onClick={() => handleStartGame()}
            style={{ clipPath: CYBER_BUTTON }}
            className="p-1.5 bg-[#000000] border border-gray-700 hover:border-[#FF003C] text-gray-400 hover:text-[#FF003C] cursor-pointer transition-all"
            title="Reiniciar Partida"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =====================================================================
          CUERPO PRINCIPAL DEL JUEGO:
          [PANEL IZQUIERDO: HUD DEL JUGADOR Y RIVAL] [CAMPO DE BATALLA CENTRAL]
         ===================================================================== */}
      <div className="relative z-10 flex-1 flex flex-row overflow-hidden w-full">
        {/* ===============================================================
            PANEL IZQUIERDO (HUD DEL JUGADOR Y RIVAL):
            - Marcadores de "Eddies"
            - Avatares
            - Dados geométricos (D4 a D20) apilados
            - Contenedores de puntuación con clip-path diagonal
           =============================================================== */}
        <aside className="w-72 sm:w-80 bg-[#070a10]/95 border-r border-[#0dfceb]/30 p-3 flex flex-col justify-between font-mono shrink-0 overflow-y-auto space-y-4 pb-48">
          {/* SECCIÓN RIVAL (BOT) */}
          <div className="space-y-2.5 border-b border-[#0dfceb]/30 pb-3">
            {/* Avatar del Rival */}
            <div
              style={{ clipPath: CYBER_AVATAR_CLIP }}
              className="flex items-center gap-2.5 bg-[#000000] border border-[#FF003C]/60 p-2 shadow-[0_0_15px_rgba(255,0,60,0.2)]"
            >
              <div className="w-10 h-10 bg-[#FF003C]/20 border border-[#FF003C] flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-[#FF003C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-white truncate">
                    RAY // CORPO BOT
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#FF003C] animate-pulse" />
                </div>
                <span className="text-[9px] text-gray-400 block truncate">
                  OPONENTE IA • NIGHT CITY
                </span>
              </div>
            </div>

            {/* Marcadores de Eddies y Puntuación con clip-path en diagonal */}
            <div className="grid grid-cols-2 gap-2">
              {/* Marcador Eddies Rival */}
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000] border border-[#FF003C]/40 p-2"
              >
                <span className="text-[9px] text-gray-400 uppercase block">EDDIES RIVAL</span>
                <span className="text-lg font-black text-[#FCEE0A]">
                  {getAvailableEddies(bot)} €$
                </span>
                <span className="text-[8px] text-gray-500 block">
                  MANO: {bot.hand.length}
                </span>
              </div>

              {/* Marcador Street Cred y Gigs Rival */}
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000] border border-[#FF003C]/40 p-2 text-right"
              >
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-lg font-black text-[#FF003C]">
                  ⭐ {botStreetCred}
                </span>
                <span className="text-[8px] text-gray-400 block font-bold">
                  GIGS: {bot.gigs.length} / 7
                </span>
              </div>
            </div>

            {/* SELECCIÓN DE DADOS GEOMÉTRICOS (D4 a D20) APILADOS RIVAL */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000] border border-[#FF003C]/40 p-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#FF003C] font-bold uppercase tracking-wider">
                  DADOS GIG RIVAL (D4 A D20):
                </span>
                <span className="text-[8px] text-gray-500">
                  {bot.gigs.length} ACTIVOS
                </span>
              </div>

              {/* Columna apilada de dados del rival */}
              <div className="grid grid-cols-6 gap-1 justify-items-center py-1 bg-[#070a10] border border-gray-900 rounded-sm">
                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((d) => {
                  const activeGig = bot.gigs.find((g) => g.die.toLowerCase() === d);
                  const isWaiting = bot.fixerDice.includes(d);

                  return (
                    <PolyhedralDie
                      key={d}
                      type={d}
                      value={activeGig ? activeGig.value : null}
                      isWaiting={isWaiting}
                      isStolen={Boolean(activeGig?.stolenFrom)}
                      size={32}
                    />
                  );
                })}
              </div>
            </div>

            {/* Leyendas del Rival (3 slots) */}
            <div className="pt-1">
              <span className="text-[9px] text-gray-500 uppercase block mb-1">
                LEYENDAS RIVAL (3 SLOTS):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {bot.legends.map((leg, i) => (
                  <div
                    key={leg.instanceId || i}
                    onClick={() => leg.isFaceUp && setInspectedCard(leg)}
                    className={`h-14 bg-[#000000] border transition-all flex flex-col items-center justify-center overflow-hidden relative ${
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

          {/* SECCIÓN JUGADOR (TÚ) */}
          <div className="space-y-2.5 pt-1">
            {/* Avatar del Jugador */}
            <div
              style={{ clipPath: CYBER_AVATAR_CLIP }}
              className="flex items-center gap-2.5 bg-[#000000] border border-[#0dfceb]/60 p-2 shadow-[0_0_15px_rgba(13,252,235,0.25)]"
            >
              <div className="w-10 h-10 bg-[#0dfceb]/20 border border-[#0dfceb] flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-[#0dfceb]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-white truncate">
                    V // NETRUNNER
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#0dfceb] animate-pulse" />
                </div>
                <span className="text-[9px] text-gray-400 block truncate">
                  SOLO // MERCENARIO NIGHT CITY
                </span>
              </div>
            </div>

            {/* Marcadores de Eddies y Puntuación con clip-path en diagonal */}
            <div className="grid grid-cols-2 gap-2">
              {/* Marcador Eddies Jugador */}
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000] border border-[#0dfceb]/50 p-2"
              >
                <span className="text-[9px] text-gray-400 uppercase block">TUS EDDIES</span>
                <span className="text-xl font-black text-[#0dfceb]">
                  {availableEddies} €$
                </span>
                <span className="text-[8px] text-gray-400 block">
                  MANO: {p.hand.length}
                </span>
              </div>

              {/* Marcador Street Cred y Gigs Jugador */}
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000] border border-[#FCEE0A]/50 p-2 text-right"
              >
                <span className="text-[9px] text-gray-400 uppercase block">STREET CRED</span>
                <span className="text-xl font-black text-[#FCEE0A]">
                  ⭐ {playerStreetCred}
                </span>
                <span className="text-[8px] text-[#0dfceb] block font-bold">
                  GIGS: {p.gigs.length} / 7
                </span>
              </div>
            </div>

            {/* SELECCIÓN DE DADOS GEOMÉTRICOS (D4 a D20) APILADOS JUGADOR */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000] border border-[#0dfceb]/50 p-2.5 space-y-1.5 shadow-[0_0_15px_rgba(13,252,235,0.15)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#0dfceb] font-bold uppercase tracking-wider">
                  TUS DADOS GIG (D4 A D20):
                </span>
                <span className="text-[8px] text-[#FCEE0A] font-bold">
                  {p.gigs.length} / 7 PARA GANAR
                </span>
              </div>

              {/* Columna apilada de dados del jugador */}
              <div className="grid grid-cols-6 gap-1 justify-items-center py-1 bg-[#070a10] border border-gray-900 rounded-sm">
                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((d) => {
                  const activeGig = p.gigs.find((g) => g.die.toLowerCase() === d);
                  const isWaiting = p.fixerDice.includes(d);

                  return (
                    <PolyhedralDie
                      key={d}
                      type={d}
                      value={activeGig ? activeGig.value : null}
                      isWaiting={isWaiting}
                      isStolen={Boolean(activeGig?.stolenFrom)}
                      size={32}
                    />
                  );
                })}
              </div>
            </div>

            {/* Leyendas del Jugador (3 slots interactivos) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-gray-400 uppercase">
                  TUS LEYENDAS (3 SLOTS):
                </span>
                {isMyTurn && !p.hasCalledLegendThisTurn && (
                  <span className="text-[8px] text-[#0dfceb] animate-pulse">
                    [CLIC PARA REVELAR]
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {p.legends.map((leg, i) => (
                  <div
                    key={leg.instanceId || i}
                    onClick={() => {
                      if (!leg.isFaceUp && isMyTurn && !p.hasCalledLegendThisTurn) {
                        pushHistory();
                        callLegendFaceUp(gameState, 'player', leg.instanceId);
                        setGameState({ ...gameState });
                      } else {
                        setInspectedCard(leg);
                      }
                    }}
                    className={`h-14 sm:h-16 bg-[#000000] border transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative ${
                      leg.isSpent
                        ? 'border-gray-900 opacity-40'
                        : leg.isFaceUp
                        ? 'border-[#FCEE0A] shadow-[0_0_10px_rgba(252,238,10,0.3)]'
                        : 'border-gray-800 hover:border-[#0dfceb]'
                    }`}
                    title={leg.isFaceUp ? leg.name : 'Clic para revelar Leyenda'}
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
        </aside>

        {/* ===============================================================
            CAMPO DE BATALLA CENTRAL:
            - Dividido en dos mitades horizontales
            - Barra divisoria luminosa en el centro con indicadores de fase
            - Unidades animadas con Framer Motion proyectando resplandor
           =============================================================== */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-3 sm:p-5 pb-52">
          {/* MITAD HORIZONTAL SUPERIOR: CAMPO DE BATALLA DEL RIVAL */}
          <div className="space-y-2">
            {/* Cabecera del Campo Rival (Mano Oculta, Eddies y Mazo Rival) */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070a10]/85 border border-[#0dfceb]/30 px-3 py-2 rounded-sm shadow-md">
              {/* Mano del Rival Boca Abajo */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  MANO RIVAL ({bot.hand.length}):
                </span>
                <div className="flex items-center gap-1">
                  {bot.hand.map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-9 sm:w-7 sm:h-10 rounded-xs overflow-hidden shadow border border-black shrink-0"
                      title="Carta en mano del rival"
                    >
                      <CyberCardBack className="w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Eddies del Rival */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  EDDIES:
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

              {/* Pilas de Mazo y Trash del Rival a la derecha */}
              <div className="flex items-center gap-2">
                <CyberDeckPile
                  label="MAZO"
                  count={bot.deck.length}
                  isTrash={false}
                  sizeClass="w-10 sm:w-12 h-14 sm:h-16"
                />
                <CyberDeckPile
                  label="TRASH"
                  count={bot.trash.length}
                  isTrash={true}
                  topCard={bot.trash.length > 0 ? bot.trash[bot.trash.length - 1] : null}
                  onClick={() =>
                    bot.trash.length > 0 && setInspectedCard(bot.trash[bot.trash.length - 1])
                  }
                  sizeClass="w-10 sm:w-12 h-14 sm:h-16"
                />
              </div>
            </div>

            {/* Zona de Unidades del Rival en Mesa (Framer Motion) */}
            <div className="min-h-[140px] sm:min-h-[165px] border border-dashed border-[#0dfceb]/25 bg-[#000000]/60 p-3 flex items-center justify-center relative">
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
                      <motion.div
                        key={unit.instanceId}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          boxShadow: canAttackThisUnit
                            ? [
                                '0 0 10px rgba(255, 0, 60, 0.5)',
                                '0 0 25px rgba(255, 0, 60, 0.95)',
                                '0 0 10px rgba(255, 0, 60, 0.5)'
                              ]
                            : '0 0 0px rgba(0,0,0,0)'
                        }}
                        transition={{
                          boxShadow: {
                            repeat: canAttackThisUnit ? Infinity : 0,
                            duration: 1.2
                          }
                        }}
                        whileHover={{ scale: canAttackThisUnit ? 1.08 : 1.03 }}
                        onClick={() => {
                          if (canAttackThisUnit) {
                            pushHistory();
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
                        style={{ clipPath: CYBER_CARD_CLIP }}
                        className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
                          canAttackThisUnit
                            ? 'border-[#FF003C] animate-pulse'
                            : unit.isSpent
                            ? 'border-gray-800 opacity-60 rotate-3'
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
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===============================================================
              BARRA DIVISORIA LUMINOSA CENTRAL CON INDICADORES DE FASE
             =============================================================== */}
          <div className="my-3 relative flex items-center justify-center">
            {/* Línea láser de neón con resplandor */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FCEE0A] to-transparent shadow-[0_0_20px_#FCEE0A]" />

            {/* Contenedor flotante central con indicadores de fase */}
            <div
              style={{ clipPath: CYBER_BUTTON }}
              className="relative z-10 flex items-center gap-3 bg-[#070a10] border-2 border-[#FCEE0A] px-4 py-1.5 font-mono text-xs font-black uppercase shadow-[0_0_25px_rgba(252,238,10,0.5)]"
            >
              <span className="text-[#0dfceb]">TURNO {gameState.turnNumber}</span>
              <span className="text-gray-600">•</span>
              <span className={isMyTurn ? 'text-[#FCEE0A]' : 'text-[#FF003C]'}>
                {isMyTurn ? 'TU TURNO // FASE PRINCIPAL' : 'IA PENSANDO ACCIONES...'}
              </span>

              {/* Botón rápido para Asaltar Gigs rivales cuando hay unidad seleccionada */}
              {selectedFieldUnit && !selectedFieldUnit.isSpent && !selectedFieldUnit.isLagging && (
                <button
                  type="button"
                  onClick={() => {
                    pushHistory();
                    attackRivalGigs(gameState, 'player', selectedFieldUnit.instanceId);
                    setSelectedFieldUnit(null);
                    setGameState({ ...gameState });
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="ml-2 px-3 py-1 bg-[#FF003C] hover:bg-[#FCEE0A] hover:text-[#070a10] text-white font-black text-xs uppercase animate-pulse cursor-pointer shadow-[0_0_20px_rgba(255,0,60,0.85)] transition-colors"
                >
                  ⚡ ¡ASALTAR Y ROBAR GIGS RIVALES!
                </button>
              )}
            </div>
          </div>

          {/* MITAD HORIZONTAL INFERIOR: CAMPO DE BATALLA DEL JUGADOR */}
          <div className="space-y-2">
            {/* Zona de Unidades Propias en Mesa (Framer Motion con Resplandor) */}
            <div className="min-h-[140px] sm:min-h-[165px] border border-dashed border-[#0dfceb]/40 bg-[#000000]/60 p-3 flex items-center justify-center relative">
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
                      <motion.div
                        key={unit.instanceId}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          boxShadow: isSelected
                            ? '0 0 30px rgba(252, 238, 10, 0.95), inset 0 0 15px rgba(252, 238, 10, 0.4)'
                            : canAttack
                            ? [
                                '0 0 10px rgba(13, 252, 235, 0.4)',
                                '0 0 25px rgba(252, 238, 10, 0.85)',
                                '0 0 10px rgba(13, 252, 235, 0.4)'
                              ]
                            : '0 0 0px rgba(0,0,0,0)'
                        }}
                        transition={{
                          boxShadow: {
                            repeat: canAttack && !isSelected ? Infinity : 0,
                            duration: 1.8,
                            ease: 'easeInOut'
                          }
                        }}
                        whileHover={{ scale: canAttack ? 1.08 : 1.03, y: -4 }}
                        onClick={() => {
                          if (canAttack) {
                            setSelectedFieldUnit(isSelected ? null : unit);
                          } else {
                            setInspectedCard(unit);
                          }
                        }}
                        style={{ clipPath: CYBER_CARD_CLIP }}
                        className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
                          isSelected
                            ? 'border-[#FCEE0A] -translate-y-2 scale-105'
                            : canAttack
                            ? 'border-[#0dfceb] hover:border-[#FCEE0A]'
                            : unit.isSpent
                            ? 'border-gray-800 opacity-60 rotate-3'
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

                        {/* Estado: LAG (Mareo de invocación) */}
                        {unit.isLagging && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#FF003C] text-white font-mono font-bold text-[9px] uppercase">
                            LAG
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fila Inferior del Campo: Eddies Disponibles */}
            <div className="flex items-center justify-between bg-[#070a10]/85 border border-[#0dfceb]/30 px-3 py-1.5 rounded-sm">
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
                        : 'bg-[#0dfceb]/25 border-[#0dfceb] text-[#0dfceb]'
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
      </div>

      {/* =====================================================================
          ZONA INFERIOR FIJA (MANO Y MAZOS):
          - Contenedor fijo en la parte inferior para la mano del jugador
          - A los lados: pilas de Mazo (deck) y Descartes (trash) mostrando el
            reverso amarillo sólido (#FCEE0A) con diseño en diagonal
         ===================================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#070a10]/95 backdrop-blur-md border-t-2 border-[#0dfceb]/40 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] font-mono">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2">
          {/* Barra Superior del Dock: Estado o Acciones de la Carta Seleccionada */}
          <div className="flex flex-wrap items-center justify-between text-xs border-b border-[#0dfceb]/20 pb-1.5 mb-1.5">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              TU MANO ({p.hand.length} CARTAS) • EDDIES: <strong className="text-[#0dfceb]">{availableEddies} €$</strong>
            </span>

            {selectedHandCard && (
              <div className="flex items-center gap-2">
                <span className="text-[#FCEE0A] font-bold text-xs truncate max-w-[200px]">
                  {selectedHandCard.name} ({selectedHandCard.parsedCost} €$)
                </span>

                <button
                  type="button"
                  disabled={!isMyTurn || availableEddies < selectedHandCard.parsedCost}
                  onClick={() => {
                    pushHistory();
                    const res = playUnitCard(gameState, 'player', selectedHandCard.instanceId);
                    if (res.success) {
                      setSelectedHandCard(null);
                      setGameState({ ...gameState });
                    } else {
                      alert(res.reason);
                    }
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-3 py-1 bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors shadow-[0_0_15px_rgba(13,252,235,0.4)]"
                >
                  JUGAR UNIDAD ({selectedHandCard.parsedCost} €$)
                </button>

                <button
                  type="button"
                  disabled={!isMyTurn || p.hasSoldThisTurn}
                  onClick={() => {
                    pushHistory();
                    const res = sellCardForEddies(gameState, 'player', selectedHandCard.instanceId);
                    if (res.success) {
                      setSelectedHandCard(null);
                      setGameState({ ...gameState });
                    } else {
                      alert(res.reason);
                    }
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-3 py-1 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase cursor-pointer disabled:opacity-40 transition-colors shadow-[0_0_15px_rgba(252,238,10,0.4)]"
                >
                  VENDER (+1 €$)
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedCard(selectedHandCard)}
                  className="p-1 bg-[#000000] border border-gray-700 hover:border-white text-gray-300 cursor-pointer"
                  title="Ver en grande"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
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

          {/* Fila Principal del Dock Inferior:
              [PILAS DE MAZO Y TRASH IZQUIERDA] [CARRUSEL DE MANO AL CENTRO] [BOTÓN TERMINAR TURNO DERECHA] */}
          <div className="flex items-center justify-between gap-3">
            {/* LADO IZQUIERDO: Pilas de Mazo (deck) y Descartes (trash) con reverso amarillo #FCEE0A diagonal */}
            <div className="flex items-center gap-2 shrink-0">
              <CyberDeckPile
                label="TU MAZO"
                count={p.deck.length}
                isTrash={false}
              />
              <CyberDeckPile
                label="DESCARTE"
                count={p.trash.length}
                isTrash={true}
                topCard={p.trash.length > 0 ? p.trash[p.trash.length - 1] : null}
                onClick={() =>
                  p.trash.length > 0 && setInspectedCard(p.trash[p.trash.length - 1])
                }
              />
            </div>

            {/* CENTRO: Carrusel de cartas de la mano con Framer Motion (hover lift) */}
            <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 px-2">
              {p.hand.map((card) => {
                const isSelected = selectedHandCard?.instanceId === card.instanceId;
                const canAfford = availableEddies >= (card.parsedCost || 0);

                return (
                  <motion.div
                    key={card.instanceId}
                    whileHover={{ y: -16, scale: 1.15, zIndex: 40 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedHandCard(isSelected ? null : card)}
                    style={{ clipPath: CYBER_CARD_CLIP }}
                    className={`w-16 sm:w-20 md:w-22 h-24 sm:h-28 md:h-30 bg-black border transition-all duration-150 cursor-pointer shrink-0 relative shadow-lg ${
                      isSelected
                        ? 'border-[#FCEE0A] shadow-[0_0_25px_rgba(252,238,10,0.85)] -translate-y-4 scale-110 z-30'
                        : canAfford && isMyTurn
                        ? 'border-[#0dfceb]/80 hover:border-[#FCEE0A]'
                        : 'border-gray-800 opacity-70'
                    }`}
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover object-center"
                    />

                    {/* Coste y Poder visibles */}
                    <div className="absolute top-0.5 left-0.5 px-1 bg-black/90 border border-[#0dfceb] text-[#0dfceb] text-[8px] sm:text-[9px] font-black">
                      {card.parsedCost} €$
                    </div>

                    <div className="absolute bottom-0.5 right-0.5 px-1.5 bg-[#FCEE0A] text-[#070a10] text-[9px] sm:text-[10px] font-black shadow-md">
                      {card.parsedPower}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* LADO DERECHO: Botón de Acción Rápida "Terminar Turno" */}
            <div className="shrink-0 flex flex-col gap-1.5">
              <button
                type="button"
                disabled={!isMyTurn}
                onClick={() => {
                  setSelectedHandCard(null);
                  setSelectedFieldUnit(null);
                  setHistory([]);
                  passTurn(gameState);
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-[#FCEE0A] hover:bg-[#0dfceb] text-[#070a10] font-mono font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.6)] hover:shadow-[0_0_25px_rgba(13,252,235,0.7)] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                TERMINAR TURNO ➔
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MENÚS DESPLEGABLES / FLOTANTES (Fondo Translúcido y font-mono)
         ===================================================================== */}

      {/* 1. MODAL FLOTANTE DE MULLIGAN (INICIO DE PARTIDA) */}
      {!gameState.mulliganDecided && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-xl w-full bg-[#070a10]/95 border-2 border-[#FCEE0A] p-6 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(252,238,10,0.45)] text-center backdrop-blur-md"
          >
            <div className="space-y-1">
              <span className="text-[11px] text-[#0dfceb] uppercase tracking-widest block">
                FASE INICIAL // PREPARACIÓN DE PARTIDA
              </span>
              <h2 className="text-2xl font-black text-white uppercase">
                TU MANO INICIAL <span className="text-[#FCEE0A]">({p.hand.length} CARTAS)</span>
              </h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              ¿Deseas conservar esta mano de apertura o prefieres realizar un <strong>MULLIGAN</strong> para barajarla en el mazo y robar 5 cartas nuevas?
            </p>

            {/* Vista previa de las cartas iniciales */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {p.hand.map((c) => (
                <div
                  key={c.instanceId}
                  style={{ clipPath: CYBER_CARD_CLIP }}
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
                style={{ clipPath: CYBER_BUTTON }}
                className="py-3.5 bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase tracking-widest cursor-pointer transition-all shadow-[0_0_20px_rgba(13,252,235,0.4)]"
              >
                MANTENER MANO (KEEP)
              </button>

              <button
                type="button"
                onClick={() => {
                  mulliganHand(gameState, 'player');
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_BUTTON }}
                className="py-3.5 bg-[#000000] border border-[#FF003C] hover:bg-[#FF003C] hover:text-white text-[#FF003C] font-black text-xs uppercase tracking-widest cursor-pointer transition-colors shadow-[0_0_15px_rgba(255,0,60,0.4)]"
              >
                MULLIGAN (CAMBIAR)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL FLOTANTE DE INSPECCIÓN HD CON VOLTEO ANVERSO / REVERSO */}
      {inspectedCard && (() => {
        const isLeg = isLegendCard(inspectedCard);
        const backSrc = isLeg ? '/images/back_leyenda.jpg' : '/images/back_normal.png';

        return (
          <div
            className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono"
            onClick={() => {
              setInspectedCard(null);
              setIsInspectedFlipped(false);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ clipPath: CYBER_CLIP }}
              className="max-w-md w-full bg-[#070a10]/95 border-2 border-[#0dfceb] p-4 space-y-3 relative shadow-[0_0_50px_rgba(13,252,235,0.4)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-2 gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 uppercase block truncate">
                    {isLeg ? '👑 LEYENDA' : inspectedCard.officialType || inspectedCard.cardType || 'UNIDAD / GEAR / PROGRAMA'}
                  </span>
                  <span className="text-xs text-[#0dfceb] font-black uppercase truncate block">
                    {inspectedCard.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsInspectedFlipped(!isInspectedFlipped)}
                    style={{ clipPath: CYBER_BUTTON }}
                    className="px-2.5 py-1 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-[10px] uppercase cursor-pointer transition-all shadow"
                    title="Girar carta para ver el reverso oficial"
                  >
                    {isInspectedFlipped ? 'VER ANVERSO' : 'VER REVERSO'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInspectedCard(null);
                      setIsInspectedFlipped(false);
                    }}
                    className="p-1 bg-[#000000] border border-gray-700 hover:border-white text-gray-300 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                className="w-full flex justify-center py-2 cursor-pointer select-none"
                onClick={() => setIsInspectedFlipped(!isInspectedFlipped)}
                title="Haz clic para voltear la carta"
              >
                <img
                  src={isInspectedFlipped ? backSrc : inspectedCard.image}
                  alt={isInspectedFlipped ? 'Reverso oficial' : inspectedCard.name}
                  className="max-h-[65vh] w-auto object-contain rounded-sm transition-transform duration-200 hover:scale-[1.02] shadow-2xl"
                />
              </div>

              <div className="text-center text-[10px] text-gray-400 border-t border-gray-900 pt-1.5 flex items-center justify-between">
                <span>
                  Reverso:{' '}
                  <strong className={isLeg ? 'text-[#FCEE0A]' : 'text-[#0dfceb]'}>
                    {isLeg ? 'LEYENDA (DORADO)' : 'NORMAL (UNIDADES, GEARS, PROGRAMAS)'}
                  </strong>
                </span>
                <span className="text-gray-500">[Clic para girar]</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. MODAL FLOTANTE DE REGISTRO DE COMBATE (TERMINAL NETWATCH) */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs"
          onClick={() => setShowLogModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-2xl w-full bg-[#070a10]/95 border-2 border-[#0dfceb] p-6 space-y-4 max-h-[80vh] flex flex-col backdrop-blur-md shadow-[0_0_50px_rgba(13,252,235,0.35)]"
          >
            <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-3">
              <span className="font-bold text-[#FCEE0A] uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0dfceb]" />
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

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
              {gameState.actionLog.length === 0 ? (
                <span className="text-gray-600 italic">No hay acciones registradas aún.</span>
              ) : (
                gameState.actionLog.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-0.5 border-b border-gray-900"
                  >
                    <span className="text-gray-600 text-[10px]">[{log.timestamp}]</span>
                    <span
                      className={
                        log.player === 'player'
                          ? 'text-[#0dfceb]'
                          : log.player === 'bot'
                          ? 'text-[#FF003C]'
                          : 'text-[#FCEE0A]'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL FLOTANTE DE REGLAS RÁPIDAS */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-xl w-full bg-[#070a10]/95 border-2 border-[#FCEE0A] p-6 space-y-4 max-h-[85vh] flex flex-col backdrop-blur-md shadow-[0_0_50px_rgba(252,238,10,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-[#FCEE0A]/30 pb-3">
              <span className="font-bold text-[#FCEE0A] uppercase flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0dfceb]" />
                <span>REGLAS RÁPIDAS // CYBERPUNK TCG</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-gray-300 leading-relaxed text-[11px]">
              <div>
                <strong className="text-[#0dfceb] block uppercase">1. Condición de Victoria:</strong>
                Ganas si al comienzo de tu turno controlas al menos <strong>7 Gigs</strong> (dados). Como empiezas con 6, debes asaltar y robarle al menos 1 Gig a tu oponente.
              </div>
              <div>
                <strong className="text-[#0dfceb] block uppercase">2. Eddies (€$):</strong>
                Puedes vender 1 carta de tu mano por turno colocándola en la pila de Eddies para obtener 1 €$ recurrente. Cada Leyenda lista también produce 1 €$.
              </div>
              <div>
                <strong className="text-[#0dfceb] block uppercase">3. Combate y Asalto a Gigs:</strong>
                Una unidad lista puede atacar directamente la zona de Gigs rival para robar un dado de Gig, o pelear contra una unidad enemiga <em>GASTADA</em>. En una pelea de unidades, ambas infligen daño simultáneo igual a su poder.
              </div>
              <div>
                <strong className="text-[#0dfceb] block uppercase">4. Street Cred (⭐):</strong>
                La suma de los resultados de todos tus dados de Gig activos determina tu Street Cred. Ciertas cartas y habilidades aumentan su poder según este valor.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL FLOTANTE DE FINAL DE PARTIDA (VICTORIA / DERROTA) */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className={`max-w-md w-full bg-[#070a10]/95 border-2 p-8 text-center space-y-6 backdrop-blur-md ${
              gameState.winner === 'player'
                ? 'border-[#FCEE0A] shadow-[0_0_60px_rgba(252,238,10,0.5)]'
                : 'border-[#FF003C] shadow-[0_0_60px_rgba(255,0,60,0.5)]'
            }`}
          >
            <div className="space-y-2">
              <span className="text-4xl block">
                {gameState.winner === 'player' ? '🏆' : '💀'}
              </span>
              <h2
                className={`text-2xl font-black uppercase ${
                  gameState.winner === 'player' ? 'text-[#FCEE0A]' : 'text-[#FF003C]'
                }`}
              >
                {gameState.winner === 'player' ? '¡VICTORIA EN NIGHT CITY!' : 'DERROTA // PLANO PLANO'}
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                {gameState.winner === 'player'
                  ? `Has alcanzado el control de ${p.gigs.length} Gigs activos. ¡Eres una leyenda viva de Night City!`
                  : `El bot ha alcanzado ${bot.gigs.length} Gigs activos antes que tú. El contrato ha sido cancelado.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStartGame()}
              style={{ clipPath: CYBER_BUTTON }}
              className={`w-full py-3.5 font-black text-xs uppercase tracking-widest cursor-pointer transition-all ${
                gameState.winner === 'player'
                  ? 'bg-[#FCEE0A] hover:bg-[#0dfceb] text-[#070a10] shadow-[0_0_20px_rgba(252,238,10,0.5)]'
                  : 'bg-[#FF003C] hover:bg-white text-white hover:text-[#070a10] shadow-[0_0_20px_rgba(255,0,60,0.5)]'
              }`}
            >
              JUGAR OTRA PARTIDA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
