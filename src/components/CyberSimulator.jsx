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
  hasKeyword,
  calculateGigsToSteal,
  getEligibleFixerDice,
  rollInGig,
  rollDie,
  isCardVendible,
  toggleEddieSpent,
  DICE_CONFIG
} from '../utils/cyberpunkEngine.js';
import { runBotTurn, decideBotBlocker } from '../utils/botAi.js';

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

  // Estados para Drag & Drop y Animación de Dados
  const [isDragOverField, setIsDragOverField] = useState(false);
  const [isDragOverEddies, setIsDragOverEddies] = useState(false);
  const [rollingAnimation, setRollingAnimation] = useState(null);

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

  // Lanzar animación de dado con resultados aleatorios rodando y parada en el valor final
  const triggerDiceRoll = (dieType) => {
    if (rollingAnimation || !gameState) return;
    const normDie = dieType.toLowerCase();
    const config = DICE_CONFIG[normDie] || DICE_CONFIG.d6;
    const finalVal = rollDie(normDie);

    setRollingAnimation({
      dieType: normDie,
      currentValue: Math.floor(Math.random() * config.max) + 1,
      finalValue: finalVal,
      isRolling: true,
      isFinished: false
    });

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRollingAnimation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentValue: Math.floor(Math.random() * config.max) + 1
        };
      });

      if (count >= 16) {
        clearInterval(interval);
        setRollingAnimation((prev) => ({
          ...prev,
          currentValue: finalVal,
          isRolling: false,
          isFinished: true
        }));

        setTimeout(() => {
          pushHistory();
          rollInGig(gameState, 'player', normDie, finalVal);
          setGameState({ ...gameState });
          setRollingAnimation(null);
        }, 850);
      }
    }, 65);
  };

  // Jugar carta arrastrada o clicada
  const handlePlayCard = (cardInstanceId) => {
    if (!gameState || gameState.activePlayer !== 'player' || gameState.isGameOver) return;
    pushHistory();
    const res = playUnitCard(gameState, 'player', cardInstanceId);
    if (res.success) {
      setSelectedHandCard(null);
      setGameState({ ...gameState });
    } else {
      alert(res.reason);
    }
  };

  // Vender carta arrastrada o clicada
  const handleSellCard = (cardInstanceId) => {
    if (!gameState || gameState.activePlayer !== 'player' || gameState.isGameOver) return;
    pushHistory();
    const res = sellCardForEddies(gameState, 'player', cardInstanceId);
    if (res.success) {
      setSelectedHandCard(null);
      setGameState({ ...gameState });
    } else {
      alert(res.reason);
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
          </div>
        </aside>

        {/* ===============================================================
            CAMPO DE BATALLA CENTRAL:
            - Dos zonas principales: CAMPO DE BATALLA (Unidades) y ZONA DE EDDIES (Cartas vendibles boca abajo)
            - Tanto las unidades como los eddies gastados se giran 90 grados
            - Ambas zonas cuentan con soporte Drag & Drop
           =============================================================== */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-2 sm:p-4 pb-52 gap-3">
          {/* ===============================================================
              1. SECCIÓN SUPERIOR: TAPETE DEL RIVAL (BOT)
              - Fila superior: Leyendas (3 slots) + Zona de Eddies + Trash
              - Fila inferior: Campo de Batalla (Unidades) + Deck
             =============================================================== */}
          <div className="flex gap-2 sm:gap-3 w-full items-stretch">
            {/* Lado izquierdo: Leyendas + Eddies arriba, Campo abajo */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* FILA SUPERIOR: LEYENDAS RIVAL + ZONA DE EDDIES RIVAL */}
              <div className="h-28 sm:h-32 md:h-36 flex gap-2 items-stretch w-full">
                {/* LEYENDAS RIVAL (3 SLOTS) */}
                <div className="rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-2 sm:p-2.5 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                  {bot.legends.map((leg, i) => (
                    <div
                      key={leg.instanceId || i}
                      onClick={() => leg.isFaceUp && setInspectedCard(leg)}
                      className={`w-14 sm:w-16 md:w-20 h-22 sm:h-26 md:h-28 rounded-lg overflow-hidden border transition-all flex flex-col items-center justify-center relative shadow-md ${
                        leg.isSpent
                          ? 'border-gray-800 opacity-50'
                          : leg.isFaceUp
                          ? 'border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.4)] cursor-pointer'
                          : 'border-gray-800'
                      }`}
                      title={leg.isFaceUp ? leg.name : 'Leyenda boca abajo del Rival'}
                    >
                      <div className={`w-full h-full transition-transform duration-300 flex items-center justify-center ${leg.isSpent ? 'rotate-90 scale-75' : ''}`}>
                        {leg.isFaceUp ? (
                          <img src={leg.image} alt={leg.name} className="w-full h-full object-cover" />
                        ) : (
                          <CyberCardBack isLegend={true} className="w-full h-full" />
                        )}
                      </div>
                      {leg.isSpent && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                          <span className="px-1 bg-black border border-gray-700 text-gray-500 font-mono font-bold text-[7px] uppercase tracking-tighter text-center">
                            GASTADA
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ZONA DE EDDIES RIVAL */}
                <div className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-3 sm:p-4 relative flex items-center overflow-hidden">
                  {bot.eddies.length === 0 ? (
                    <div className="text-gray-500 font-mono text-sm select-none pl-2 sm:pl-3">
                      No Eddies yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-1 pr-24 overflow-x-auto w-full">
                      {bot.eddies.map((ed, idx) => (
                        <div
                          key={ed.instanceId || idx}
                          className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                            ed.isSpent ? 'w-20 sm:w-24 h-14 sm:h-16 my-1' : 'w-14 sm:w-16 h-20 sm:h-24'
                          }`}
                          title={ed.isSpent ? 'Eddie del rival gastado' : '1 €$ del rival disponible'}
                        >
                          <div
                            className={`w-14 sm:w-16 h-20 sm:h-24 rounded-lg overflow-hidden border transition-transform duration-300 relative shadow-md ${
                              ed.isSpent
                                ? 'rotate-90 opacity-40 border-gray-800'
                                : 'border-[#FF003C]/60 shadow-[0_0_10px_rgba(255,0,60,0.3)]'
                            }`}
                          >
                            <CyberCardBack className="w-full h-full" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span
                                className={`font-mono font-black text-[9px] px-1 bg-black/90 ${
                                  ed.isSpent ? '-rotate-90 text-gray-500' : 'text-[#FCEE0A]'
                                }`}
                              >
                                {ed.isSpent ? 'USADO' : '1 €$'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badge inferior derecho: Eddies X/Y Ⓐ del Rival */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#031525]/90 border border-[#FF003C]/60 text-[#FF003C] font-mono text-[11px] sm:text-xs font-bold shadow-[0_0_10px_rgba(255,0,60,0.25)] select-none pointer-events-none">
                    <span>Eddies {getAvailableEddies(bot)}/{bot.eddies.length + bot.legends.length}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[#FF003C] flex items-center justify-center text-[9px] font-black leading-none">Ⓐ</span>
                  </div>
                </div>
              </div>

              {/* CAMPO DE BATALLA DEL RIVAL (FIELD) */}
              <div className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-3 sm:p-4 min-h-[165px] sm:min-h-[195px] flex items-center relative overflow-x-auto">
                <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                  {bot.field.map((unit) => {
                    const canAttackThisUnit =
                      selectedFieldUnit &&
                      !selectedFieldUnit.isSpent &&
                      !selectedFieldUnit.isLagging &&
                      unit.isSpent;

                    return (
                      <div
                        key={unit.instanceId}
                        className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                          unit.isSpent
                            ? 'w-36 sm:w-40 md:w-44 h-24 sm:h-28 md:h-32 my-1'
                            : 'w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44'
                        }`}
                      >
                        <motion.div
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
                              : unit.isSpent
                              ? '0 0 15px rgba(255, 0, 60, 0.25)'
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
                              const botBlocker = decideBotBlocker(bot, selectedFieldUnit.currentPower, false);
                              fightRivalUnit(
                                gameState,
                                'player',
                                selectedFieldUnit.instanceId,
                                unit.instanceId,
                                botBlocker ? botBlocker.instanceId : null
                              );
                              setSelectedFieldUnit(null);
                              setGameState({ ...gameState });
                            } else {
                              setInspectedCard(unit);
                            }
                          }}
                          style={{ clipPath: CYBER_CARD_CLIP }}
                          className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-transform duration-300 cursor-pointer flex flex-col justify-between relative shadow-xl ${
                            canAttackThisUnit
                              ? 'border-[#FF003C] animate-pulse'
                              : unit.isSpent
                              ? 'border-gray-800 opacity-75 rotate-90'
                              : 'border-[#FF003C]/80 hover:border-[#FF003C]'
                          }`}
                        >
                          <img
                            src={unit.image}
                            alt={unit.name}
                            className="w-full h-full object-cover object-center"
                          />

                          {/* Badges de Palabras Clave Oficiales (Rival) */}
                          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none">
                            {hasKeyword(unit, 'Blocker') && (
                              <span className="px-1 py-0.5 bg-[#0dfceb] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                🛡️ BLOCKER
                              </span>
                            )}
                            {hasKeyword(unit, 'Adrenaline') && (
                              <span className="px-1 py-0.5 bg-[#FCEE0A] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                ⚡ ADRENALINE
                              </span>
                            )}
                            {hasKeyword(unit, 'Go Solo') && (
                              <span className="px-1 py-0.5 bg-[#FF003C] text-white font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                🔥 GO SOLO
                              </span>
                            )}
                          </div>

                          {/* Insignia de Poder GIGANTE */}
                          <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FF003C] text-white font-mono font-black text-xs shadow-md">
                            {unit.currentPower}
                          </div>

                          {/* Estado: GASTADA */}
                          {unit.isSpent && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                              <span className="px-2 py-0.5 bg-black border border-[#FF003C] text-[#FF003C] font-mono font-black text-[10px] uppercase tracking-wider -rotate-90">
                                GASTADA
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* Slots vacíos de cartas (diseño idéntico al playmat) */}
                  {Array.from({ length: Math.max(0, 4 - bot.field.length) }).map((_, slotIdx) => (
                    <div
                      key={`bot-slot-${slotIdx}`}
                      className="w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 rounded-xl border border-[#FF003C]/20 bg-black/25 flex items-center justify-center pointer-events-none shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha del Rival: Trash arriba y Deck abajo */}
            <div className="flex flex-col gap-2 shrink-0 w-20 sm:w-24 md:w-28">
              {/* TRASH RIVAL */}
              <div
                className="h-28 sm:h-32 md:h-36 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-2 relative shadow-md select-none"
                title={`Descartes del Rival (Trash): ${bot.trash.length} cartas`}
              >
                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold mb-1">TRASH</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-gray-500">
                  {bot.trash.length}
                </span>
              </div>

              {/* DECK RIVAL */}
              <div
                className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-2 relative shadow-md select-none"
                title={`Mazo del Rival (Deck): ${bot.deck.length} cartas`}
              >
                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold mb-1">DECK</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.7)]">
                  {bot.deck.length}
                </span>
              </div>
            </div>
          </div>

          {/* ===============================================================
              2. BARRA DIVISORIA LUMINOSA CENTRAL CON INDICADORES DE FASE
             =============================================================== */}
          <div className="my-1 relative flex items-center justify-center shrink-0">
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
                {gameState.pendingGigRoll
                  ? 'FASE DE INICIO // ELIGE DADO'
                  : isMyTurn
                  ? 'TU TURNO // FASE PRINCIPAL'
                  : 'IA PENSANDO ACCIONES...'}
              </span>

              {/* Botón oficial para Asaltar Gigs rivales según tabla de poder */}
              {selectedFieldUnit && !selectedFieldUnit.isSpent && !selectedFieldUnit.isLagging && (() => {
                const gigsToSteal = calculateGigsToSteal(selectedFieldUnit.currentPower);
                const hasGigs = bot.gigs.length > 0;

                return (
                  <button
                    type="button"
                    disabled={!hasGigs || gigsToSteal <= 0}
                    onClick={() => {
                      pushHistory();
                      const botBlocker = decideBotBlocker(bot, selectedFieldUnit.currentPower, true);
                      attackRivalGigs(
                        gameState,
                        'player',
                        selectedFieldUnit.instanceId,
                        botBlocker ? botBlocker.instanceId : null
                      );
                      setSelectedFieldUnit(null);
                      setGameState({ ...gameState });
                    }}
                    style={{ clipPath: CYBER_BUTTON }}
                    className="ml-2 px-3 py-1 bg-[#FF003C] hover:bg-[#FCEE0A] hover:text-[#070a10] text-white font-black text-xs uppercase animate-pulse cursor-pointer shadow-[0_0_20px_rgba(255,0,60,0.85)] transition-colors disabled:opacity-40"
                    title={
                      !hasGigs
                        ? 'El rival no tiene Gigs para robar'
                        : `Robarás ${gigsToSteal} Gig(s) según tu poder de ${selectedFieldUnit.currentPower}`
                    }
                  >
                    ⚡ ¡ASALTAR GIGS ({gigsToSteal} {gigsToSteal === 1 ? 'GIG' : 'GIGS'})!
                  </button>
                );
              })()}
            </div>
          </div>

          {/* ===============================================================
              3. SECCIÓN INFERIOR: TAPETE DEL JUGADOR (TÚ)
              - Fila superior: Campo de Batalla (Unidades) + Deck
              - Fila inferior: Leyendas (3 slots) + Zona de Eddies + Trash
              - 100% IDÉNTICO AL PLAYMAT OFICIAL Y A LA IMAGEN DE REFERENCIA
             =============================================================== */}
          <div className="flex gap-2 sm:gap-3 w-full items-stretch">
            {/* Lado izquierdo: Campo arriba, Leyendas + Eddies abajo */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* CAMPO DE BATALLA DEL JUGADOR (FIELD - DROP ZONE PARA DESPLEGAR) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isDragOverField) setIsDragOverField(true);
                }}
                onDragLeave={() => setIsDragOverField(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverField(false);
                  const cardId = e.dataTransfer.getData('text/plain');
                  if (cardId) handlePlayCard(cardId);
                }}
                className={`flex-1 rounded-2xl border transition-all p-3 sm:p-4 min-h-[165px] sm:min-h-[195px] flex items-center relative overflow-x-auto ${
                  isDragOverField
                    ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_35px_rgba(13,252,235,0.45)]'
                    : 'border-[#0dfceb]/30 bg-[#060b14]/80'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                  {p.field.map((unit) => {
                    const isSelected = selectedFieldUnit?.instanceId === unit.instanceId;
                    const canAttack = isMyTurn && !unit.isSpent && !unit.isLagging;

                    return (
                      <div
                        key={unit.instanceId}
                        className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                          unit.isSpent
                            ? 'w-36 sm:w-40 md:w-44 h-24 sm:h-28 md:h-32 my-1'
                            : 'w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44'
                        }`}
                      >
                        <motion.div
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
                              : unit.isSpent
                              ? '0 0 15px rgba(13, 252, 235, 0.25)'
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
                          className={`w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 bg-black border-2 transition-transform duration-300 cursor-pointer flex flex-col justify-between relative shadow-xl ${
                            isSelected
                              ? 'border-[#FCEE0A] -translate-y-2 scale-105'
                              : canAttack
                              ? 'border-[#0dfceb] hover:border-[#FCEE0A]'
                              : unit.isSpent
                              ? 'border-gray-800 opacity-75 rotate-90'
                              : 'border-gray-800'
                          }`}
                        >
                          <img
                            src={unit.image}
                            alt={unit.name}
                            className="w-full h-full object-cover object-center"
                          />

                          {/* Badges de Palabras Clave Oficiales (Jugador) */}
                          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none">
                            {hasKeyword(unit, 'Blocker') && (
                              <span className="px-1 py-0.5 bg-[#0dfceb] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                🛡️ BLOCKER
                              </span>
                            )}
                            {hasKeyword(unit, 'Adrenaline') && (
                              <span className="px-1 py-0.5 bg-[#FCEE0A] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                ⚡ ADRENALINE
                              </span>
                            )}
                            {hasKeyword(unit, 'Go Solo') && (
                              <span className="px-1 py-0.5 bg-[#FF003C] text-white font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                🔥 GO SOLO
                              </span>
                            )}
                            {unit.isLagging && (
                              <span className="px-1.5 py-0.5 bg-[#FF003C] text-white font-mono font-bold text-[8px] uppercase shadow">
                                LAG
                              </span>
                            )}
                          </div>

                          {/* Insignia de Poder GIGANTE */}
                          <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs shadow-md">
                            {unit.currentPower}
                          </div>

                          {/* Estado: GASTADA */}
                          {unit.isSpent && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                              <span className="px-2 py-0.5 bg-black border border-gray-600 text-gray-300 font-mono font-black text-[10px] uppercase tracking-wider -rotate-90">
                                GASTADA
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* Slots vacíos de cartas (diseño idéntico al playmat de referencia) */}
                  {Array.from({ length: Math.max(0, 4 - p.field.length) }).map((_, slotIdx) => (
                    <div
                      key={`p-slot-${slotIdx}`}
                      className="w-24 sm:w-28 md:w-32 h-36 sm:h-40 md:h-44 rounded-xl border border-[#0dfceb]/20 bg-black/25 flex items-center justify-center pointer-events-none shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* FILA INFERIOR: LEYENDAS JUGADOR + ZONA DE EDDIES JUGADOR (100% FIEL A LA IMAGEN) */}
              <div className="h-28 sm:h-32 md:h-36 flex gap-2 items-stretch w-full">
                {/* 1. LEYENDAS (3 SLOTS) */}
                <div className="rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 p-2 sm:p-2.5 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                  {p.legends.map((leg, i) => {
                    const isTurn1Penalty = leg.isSpent && gameState.turnNumber === 1 && i < 2;

                    return (
                      <div
                        key={leg.instanceId || i}
                        onClick={() => {
                          if (!leg.isFaceUp && isMyTurn && !p.hasCalledLegendThisTurn) {
                            if (availableEddies < 1) {
                              alert('Llamar a una Leyenda boca arriba cuesta 1 €$. No tienes Eddies disponibles.');
                              return;
                            }
                            pushHistory();
                            const res = callLegendFaceUp(gameState, 'player', leg.instanceId);
                            if (!res.success) alert(res.reason);
                            setGameState({ ...gameState });
                          } else {
                            setInspectedCard(leg);
                          }
                        }}
                        className={`w-14 sm:w-16 md:w-20 h-22 sm:h-26 md:h-28 rounded-lg overflow-hidden border transition-all cursor-pointer flex flex-col items-center justify-center relative shadow-md ${
                          leg.isSpent
                            ? 'border-gray-800 opacity-60'
                            : leg.isFaceUp
                            ? 'border-[#FCEE0A] shadow-[0_0_12px_rgba(252,238,10,0.4)]'
                            : 'border-[#0dfceb]/40 hover:border-[#FCEE0A]'
                        }`}
                        title={
                          isTurn1Penalty
                            ? 'Penalización Turno 1: Esta leyenda empieza gastada por ir primero.'
                            : leg.isFaceUp
                            ? leg.name
                            : 'Clic para llamar Leyenda (Coste: 1 €$)'
                        }
                      >
                        <div className={`w-full h-full transition-transform duration-300 flex items-center justify-center ${leg.isSpent ? 'rotate-90 scale-75' : ''}`}>
                          {leg.isFaceUp ? (
                            <img src={leg.image} alt={leg.name} className="w-full h-full object-cover" />
                          ) : (
                            <CyberCardBack isLegend={true} className="w-full h-full" />
                          )}
                        </div>

                        {/* Indicador de Penalización Turno 1 o Gastada */}
                        {leg.isSpent && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                            <span className="px-1 bg-black border border-gray-700 text-gray-400 font-mono font-bold text-[7px] uppercase tracking-tighter text-center">
                              {isTurn1Penalty ? 'PENALIZACIÓN T1' : 'GASTADA'}
                            </span>
                          </div>
                        )}

                        {/* Indicador de Llamar si está disponible */}
                        {!leg.isFaceUp && !leg.isSpent && isMyTurn && !p.hasCalledLegendThisTurn && availableEddies >= 1 && (
                          <div className="absolute bottom-0 inset-x-0 bg-[#0dfceb]/90 text-black font-mono font-black text-[7px] uppercase text-center py-0.5 animate-pulse">
                            LLAMAR 1€$
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. ZONA DE EDDIES (CON SOPORTE DRAG & DROP Y BADGE EDDIES X/Y Ⓐ) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isDragOverEddies) setIsDragOverEddies(true);
                  }}
                  onDragLeave={() => setIsDragOverEddies(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverEddies(false);
                    const cardId = e.dataTransfer.getData('text/plain');
                    if (cardId) handleSellCard(cardId);
                  }}
                  className={`flex-1 rounded-2xl border transition-all relative flex items-center p-3 sm:p-4 overflow-hidden ${
                    isDragOverEddies
                      ? 'border-[#FCEE0A] bg-[#FCEE0A]/15 shadow-[0_0_25px_rgba(252,238,10,0.4)]'
                      : 'border-[#0dfceb]/30 bg-[#060b14]/80'
                  }`}
                >
                  {/* Contenido cuando no hay Eddies vs cuando hay Eddies vendidos */}
                  {p.eddies.length === 0 ? (
                    <div className="text-gray-400 font-mono text-sm sm:text-base select-none pl-2 sm:pl-3">
                      {isDragOverEddies ? (
                        <span className="text-[#FCEE0A] font-bold animate-pulse">
                          ¡Suelta aquí para vender (+1 €$)!
                        </span>
                      ) : (
                        <span>No Eddies yet.</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-1 pr-24 overflow-x-auto w-full">
                      {p.eddies.map((ed, idx) => (
                        <div
                          key={ed.instanceId || idx}
                          onClick={() => {
                            pushHistory();
                            toggleEddieSpent(gameState, 'player', ed.instanceId);
                            setGameState({ ...gameState });
                          }}
                          className={`transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
                            ed.isSpent ? 'w-20 sm:w-24 h-14 sm:h-16 my-1' : 'w-14 sm:w-16 h-20 sm:h-24'
                          }`}
                          title={
                            ed.isSpent
                              ? 'Eddie gastado este turno (clic para enderezar)'
                              : '1 €$ listo para gastar (clic para girar 90°)'
                          }
                        >
                          <div
                            className={`w-14 sm:w-16 h-20 sm:h-24 rounded-lg overflow-hidden border transition-transform duration-300 relative shadow-md ${
                              ed.isSpent
                                ? 'rotate-90 opacity-40 border-gray-800'
                                : 'border-[#0dfceb] hover:border-[#FCEE0A] hover:scale-105 shadow-[0_0_10px_rgba(13,252,235,0.4)]'
                            }`}
                          >
                            <CyberCardBack className="w-full h-full" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span
                                className={`font-mono font-black text-[9px] px-1 bg-black/90 ${
                                  ed.isSpent ? '-rotate-90 text-gray-500' : 'text-[#0dfceb]'
                                }`}
                              >
                                {ed.isSpent ? 'USADO' : '1 €$'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badge inferior derecho: Eddies X/Y Ⓐ exactamente como en la imagen */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#031525]/90 border border-[#00F0FF]/60 text-[#00F0FF] font-mono text-[11px] sm:text-xs font-bold shadow-[0_0_10px_rgba(0,240,255,0.25)] select-none pointer-events-none">
                    <span>Eddies {availableEddies}/{p.eddies.length + p.legends.length}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[#00F0FF] flex items-center justify-center text-[9px] font-black leading-none">Ⓐ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha del Jugador: Deck arriba y Trash abajo (100% fiel a la imagen) */}
            <div className="flex flex-col gap-2 shrink-0 w-20 sm:w-24 md:w-28">
              {/* DECK JUGADOR */}
              <div
                className="flex-1 rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-2 relative shadow-md select-none"
                title={`Mazo principal (Deck): ${p.deck.length} cartas restantes`}
              >
                <span className="text-[9px] font-mono text-gray-400 uppercase font-bold mb-1">DECK</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.7)]">
                  {p.deck.length}
                </span>
              </div>

              {/* TRASH JUGADOR */}
              <div
                className="h-28 sm:h-32 md:h-36 rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-2 relative shadow-md select-none"
                title={`Descartes (Trash): ${p.trash.length} cartas`}
              >
                <span className="text-[9px] font-mono text-gray-400 uppercase font-bold mb-1">TRASH</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-gray-400">
                  {p.trash.length}
                </span>
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverEddies(true);
                  }}
                  onDragLeave={() => setIsDragOverEddies(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverEddies(false);
                    const cardId = e.dataTransfer.getData('text/plain');
                    if (cardId) handleSellCard(cardId);
                  }}
                  disabled={!isMyTurn || p.hasSoldThisTurn || !isCardVendible(selectedHandCard)}
                  onClick={() => {
                    handleSellCard(selectedHandCard.instanceId);
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className={`px-3 py-1 font-black text-xs uppercase cursor-pointer disabled:opacity-30 transition-colors shadow-[0_0_15px_rgba(252,238,10,0.4)] ${
                    isDragOverEddies
                      ? 'bg-white text-black animate-pulse'
                      : !isCardVendible(selectedHandCard)
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-[#FCEE0A] hover:bg-white text-[#070a10]'
                  }`}
                  title={
                    !isCardVendible(selectedHandCard)
                      ? 'Esta carta no tiene Sell Tag (Solo se venden Programas, Gears y MT0D12 Flathead)'
                      : p.hasSoldThisTurn
                      ? 'Ya has vendido una carta este turno'
                      : 'Vender carta a la Zona de Eddies (+1 €$)'
                  }
                >
                  {!isCardVendible(selectedHandCard) ? 'NO VENDIBLE' : 'VENDER (+1 €$)'}
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
                    draggable={isMyTurn}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', card.instanceId);
                      setSelectedHandCard(card);
                    }}
                    whileHover={{ y: -16, scale: 1.15, zIndex: 40 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedHandCard(isSelected ? null : card)}
                    style={{ clipPath: CYBER_CARD_CLIP }}
                    className={`w-16 sm:w-20 md:w-22 h-24 sm:h-28 md:h-30 bg-black border transition-all duration-150 cursor-grab active:cursor-grabbing shrink-0 relative shadow-lg ${
                      isSelected
                        ? 'border-[#FCEE0A] shadow-[0_0_25px_rgba(252,238,10,0.85)] -translate-y-4 scale-110 z-30'
                        : canAfford && isMyTurn
                        ? 'border-[#0dfceb]/80 hover:border-[#FCEE0A]'
                        : 'border-gray-800 opacity-70'
                    }`}
                    title="Arrastra esta carta al campo para jugarla, o haz clic para seleccionarla"
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover object-center"
                    />

                    {/* Distintivo de Carta Vendible oficial (Programas, Gears y MT0D12 Flathead) */}
                    {isCardVendible(card) && (
                      <div className="absolute top-0.5 right-0.5 px-1 bg-[#FCEE0A] text-[#070a10] text-[7px] font-black uppercase tracking-tighter shadow z-10">
                        €$ VENDIBLE
                      </div>
                    )}

                    {card.parsedPower > 0 && (
                      <div className="absolute bottom-0.5 right-0.5 px-1.5 bg-[#FCEE0A] text-[#070a10] text-[9px] sm:text-[10px] font-black shadow-md z-10">
                        {card.parsedPower}
                      </div>
                    )}
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

      {/* 1. MODAL FLOTANTE DE MULLIGAN (INICIO DE PARTIDA) - ANCHO EXPANDIDO */}
      {!gameState.mulliganDecided && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-5xl w-full bg-[#070a10]/95 border-2 border-[#FCEE0A] p-6 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(252,238,10,0.45)] text-center backdrop-blur-md"
          >
            <div className="space-y-1">
              <span className="text-[11px] text-[#0dfceb] uppercase tracking-widest block">
                FASE INICIAL // PREPARACIÓN DE PARTIDA
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">
                TU MANO INICIAL <span className="text-[#FCEE0A]">({p.hand.length} CARTAS)</span>
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Según el reglamento oficial de Cyberpunk TCG, ambos jugadores roban 6 cartas de apertura. Tienes derecho a un único <strong>MULLIGAN</strong> por partida para barajar tu mano entera en el mazo y robar 6 cartas nuevas.
            </p>

            {/* Vista previa de las 6 cartas iniciales en ancho completo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 justify-items-center py-4">
              {p.hand.map((c) => (
                <div
                  key={c.instanceId}
                  style={{ clipPath: CYBER_CARD_CLIP }}
                  className="w-28 sm:w-32 md:w-36 h-40 sm:h-48 md:h-52 bg-black border border-gray-700 shrink-0 relative overflow-hidden shadow-xl transition-transform hover:scale-105"
                >
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  {isCardVendible(c) && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] text-[8px] font-black uppercase shadow">
                      €$ VENDIBLE
                    </span>
                  )}
                  {c.parsedCost > 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/90 border border-[#0dfceb] text-[#0dfceb] text-[9px] font-black shadow">
                      {c.parsedCost} €$
                    </span>
                  )}
                  {c.parsedPower > 0 && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-[#FF003C] text-white text-[9px] font-black shadow">
                      {c.parsedPower}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  keepHand(gameState, 'player');
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_BUTTON }}
                className="py-3.5 bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs sm:text-sm uppercase tracking-widest cursor-pointer transition-all shadow-[0_0_20px_rgba(13,252,235,0.4)]"
              >
                CONSERVAR (KEEP)
              </button>

              <button
                type="button"
                onClick={() => {
                  mulliganHand(gameState, 'player');
                  setGameState({ ...gameState });
                }}
                style={{ clipPath: CYBER_BUTTON }}
                className="py-3.5 bg-[#000000] border border-[#FF003C] hover:bg-[#FF003C] hover:text-white text-[#FF003C] font-black text-xs sm:text-sm uppercase tracking-widest cursor-pointer transition-colors shadow-[0_0_15px_rgba(255,0,60,0.4)]"
              >
                MULLIGAN (6 NUEVAS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE SELECCIÓN DE DADOS DEL FIXER (FASE DE INICIO // ROLL IN A GIG) */}
      {gameState.mulliganDecided && isMyTurn && (gameState.pendingGigRoll || gameState.phase === 'START_GIG_SELECT') && p.fixerDice.length > 0 && !rollingAnimation && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-2xl w-full bg-[#070a10] border-2 border-[#0dfceb] p-6 sm:p-8 text-center space-y-6 shadow-[0_0_60px_rgba(13,252,235,0.45)]"
          >
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs text-[#FCEE0A] uppercase tracking-widest block font-bold">
                FASE DE INICIO // ROLL IN A GIG (PASO 5)
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase">
                ELIGE UN DADO DE TU FIXER PARA RODAR
              </h3>
              <p className="text-xs text-gray-300 max-w-lg mx-auto">
                Regla oficial: Puedes elegir y tirar <strong>cualquier dado</strong> de tu Fixer (D4, D6, D8, D10, D12), salvo el <strong>D20</strong>, que siempre es el último que se tira.
              </p>
            </div>

            {/* Grid de dados disponibles en el Fixer */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-4">
              {p.fixerDice.map((d) => {
                const isD20Disabled = p.fixerDice.length > 1 && d.toLowerCase() === 'd20';

                return (
                  <button
                    key={d}
                    type="button"
                    disabled={isD20Disabled}
                    onClick={() => triggerDiceRoll(d)}
                    style={{ clipPath: CYBER_BUTTON }}
                    className={`p-4 flex flex-col items-center justify-center gap-2 transition-all border ${
                      isD20Disabled
                        ? 'bg-black/60 border-gray-800 opacity-35 cursor-not-allowed'
                        : 'bg-black border-[#0dfceb]/60 hover:border-[#FCEE0A] hover:bg-[#0dfceb]/15 cursor-pointer shadow-[0_0_20px_rgba(13,252,235,0.3)] hover:scale-110 active:scale-95'
                    }`}
                    title={
                      isD20Disabled
                        ? 'El D20 no se puede elegir hasta que sea el último dado restante en el Fixer'
                        : `Lanzar dado ${d.toUpperCase()}`
                    }
                  >
                    <PolyhedralDie type={d} size={52} isWaiting={false} />
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        isD20Disabled ? 'text-gray-600' : 'text-[#FCEE0A]'
                      }`}
                    >
                      {isD20Disabled ? 'D20 (ÚLTIMO)' : `TIRAR ${d.toUpperCase()}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ANIMACIÓN POLIÉDRICA CYBERPUNK AL LANZAR DADO (RESULTADO ALEATORIO) */}
      {rollingAnimation && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-md w-full bg-[#070a10] border-2 border-[#FCEE0A] p-8 flex flex-col items-center justify-center space-y-6 shadow-[0_0_70px_rgba(252,238,10,0.55)] text-center relative overflow-hidden"
          >
            {/* Rayos láser animados */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#0dfceb] to-transparent top-0 animate-pulse" />
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#FCEE0A] to-transparent bottom-0 animate-pulse" />

            <span className="text-[10px] text-[#0dfceb] uppercase tracking-widest font-bold">
              {rollingAnimation.isFinished ? '// DADO FIJADO //' : '// LANZANDO DADO EN EL FIXER //'}
            </span>

            {/* Dado girando a toda velocidad con números aleatorios parpadeando */}
            <motion.div
              animate={
                rollingAnimation.isFinished
                  ? { rotate: 0, scale: [1.3, 1], y: [-12, 0] }
                  : {
                      rotate: [0, 90, 180, 270, 360],
                      scale: [0.95, 1.15, 0.95, 1.1, 1],
                      y: [0, -10, 5, -5, 0]
                    }
              }
              transition={
                rollingAnimation.isFinished
                  ? { duration: 0.45, type: 'spring' }
                  : { repeat: Infinity, duration: 0.45, ease: 'linear' }
              }
              className="my-3 relative flex items-center justify-center"
            >
              <PolyhedralDie
                type={rollingAnimation.dieType}
                value={rollingAnimation.currentValue}
                size={120}
                isWaiting={false}
                isStolen={false}
              />
            </motion.div>

            <div className="space-y-1">
              <h4 className="text-4xl font-black uppercase tracking-wider text-white">
                {rollingAnimation.dieType.toUpperCase()}:{' '}
                <span
                  className={
                    rollingAnimation.isFinished
                      ? 'text-[#FCEE0A] drop-shadow-[0_0_20px_#FCEE0A]'
                      : 'text-[#0dfceb]'
                  }
                >
                  {rollingAnimation.currentValue}
                </span>
              </h4>
              <span className="text-xs block font-bold text-gray-400">
                {rollingAnimation.isFinished
                  ? `⭐ ¡${rollingAnimation.finalValue} Credibilidad sumada a tus Gigs!`
                  : `Generando entropía cuántica de Night City...`}
              </span>
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

      {/* 4. MODAL FLOTANTE DE REGLAS RÁPIDAS (REGLAMENTO OFICIAL) */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-2xl w-full bg-[#070a10]/95 border-2 border-[#FCEE0A] p-6 space-y-4 max-h-[85vh] flex flex-col backdrop-blur-md shadow-[0_0_50px_rgba(252,238,10,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-[#FCEE0A]/30 pb-3">
              <span className="font-bold text-[#FCEE0A] uppercase flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0dfceb]" />
                <span>REGLAS OFICIALES NIGHT CITY // CYBERPUNK TCG</span>
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
                <strong className="text-[#0dfceb] block uppercase">1. Preparación de Partida:</strong>
                Ambos jugadores tiran un D20; quien saque más alto decide si va primero o segundo. Se baraja el mazo (40-50 cartas) y las 3 Leyendas van boca abajo.
                <br />
                <span className="text-[#FCEE0A]">Penalización del Jugador 1:</span> El jugador que empieza gira (spends) sus dos leyendas más a la izquierda y <em>NO se enderezan en el Turno 1</em> (tiene menos Eddies para equilibrar el turno inicial).
                <br />
                Ambos colocan sus 6 dados de Gig en el Fixer (D4 abajo hasta D20 arriba) y roban una mano de <strong>6 cartas</strong>. Cada jugador puede hacer 1 Mulligan (barajar las 6 y robar 6 nuevas).
              </div>

              <div>
                <strong className="text-[#0dfceb] block uppercase">2. Estructura de Turno:</strong>
                Cada turno consta de <strong>Fase de Inicio (Start Phase)</strong> y <strong>Fase Principal (Main Phase)</strong>.
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-gray-400">
                  <li><strong className="text-white">Start Phase (Obligatoria):</strong> Comprobar victoria (7+ Gigs) ➔ Efectos de inicio ➔ Enderezar todas las cartas (Eddies, Leyendas y Campo) ➔ Robar 1 carta ➔ Rodar un Gig del Fixer a la zona de Gigs (el D20 siempre el último).</li>
                  <li><strong className="text-white">Main Phase (Opcional y en cualquier orden):</strong>
                    <br />• <em>Vender por Turno (1/turno):</em> Coloca 1 carta boca abajo en Eddies (+1 €$ recurrente).
                    <br />• <em>Llamar una Leyenda (1/turno):</em> Paga <strong>1 €$</strong> para poner una Leyenda boca arriba.
                    <br />• <em>Jugar cartas:</em> Paga el coste en Eddies. Las unidades entran con <strong>Lag</strong> (no pueden atacar este turno) a menos que tengan <strong>Adrenaline</strong>.
                    <br />• <em>Atacar:</em> Con unidades listas una a una a unidades enemigas gastadas o a los Gigs rivales.
                  </li>
                </ul>
              </div>

              <div>
                <strong className="text-[#0dfceb] block uppercase">3. Tabla Oficial de Robo de Gigs (por Poder):</strong>
                Al asaltar la zona de Gigs rival, la cantidad de dados que robas depende del Poder de tu atacante:
                <table className="w-full text-left border border-gray-800 mt-1 mb-1 text-[10px]">
                  <thead>
                    <tr className="bg-[#000000] text-[#0dfceb]">
                      <th className="p-1 border border-gray-800">Poder de la Unidad</th>
                      <th className="p-1 border border-gray-800">Gigs Robados</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-1 border border-gray-800">0 Poder</td><td className="p-1 border border-gray-800">0 Gigs (no puede robar)</td></tr>
                    <tr><td className="p-1 border border-gray-800">1 – 9 Poder</td><td className="p-1 border border-gray-800">1 Gig</td></tr>
                    <tr><td className="p-1 border border-gray-800">10 – 19 Poder</td><td className="p-1 border border-gray-800">2 Gigs</td></tr>
                    <tr><td className="p-1 border border-gray-800">20 – 29 Poder</td><td className="p-1 border border-gray-800">3 Gigs</td></tr>
                  </tbody>
                </table>
                El atacante elige qué dados robar de la zona rival (se roban los de mayor valor).
              </div>

              <div>
                <strong className="text-[#0dfceb] block uppercase">4. Combate entre Unidades y Regla de Empate:</strong>
                El mayor poder gana y derrota a la otra unidad enviándola a la Basura.
                <br />
                <span className="text-[#FF003C] font-bold">REGLA DE EMPATE:</span> Si ambas unidades tienen el mismo poder (&gt;0), <strong>AMBAS unidades pierden el combate y AMBAS van a la Basura</strong>. Una unidad con 0 de poder no puede derrotar nada.
              </div>

              <div>
                <strong className="text-[#0dfceb] block uppercase">5. Palabras Clave Oficiales:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-400">
                  <li><strong className="text-[#0dfceb]">Blocker:</strong> Cuando una unidad rival ataca, puedes girar esta unidad para redirigir el ataque hacia ella. Si protege tus Gigs, se convierte en pelea contra el Blocker y <strong>no se roba ningún Gig</strong> aunque el atacante gane.</li>
                  <li><strong className="text-[#FCEE0A]">Adrenaline:</strong> Esta unidad ignora el Lag y puede atacar en el mismo turno en que es jugada.</li>
                  <li><strong className="text-[#FF003C]">Go Solo:</strong> Paga el coste de esta Leyenda para jugarla como una Unidad lista en el campo capaz de atacar este turno.</li>
                  <li><strong className="text-white">Quick:</strong> Puedes activar este efecto o jugar este Programa en respuesta durante el ataque de un rival.</li>
                </ul>
              </div>

              <div>
                <strong className="text-[#0dfceb] block uppercase">6. Street Cred (⭐) y Overtime:</strong>
                La suma de los valores de tus dados de Gig activos es tu Credibilidad en la Calle. Si ambos jugadores vacían sus Fixers, entra el Overtime: el primero que llegue a 7 Gigs gana la partida inmediatamente.
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
