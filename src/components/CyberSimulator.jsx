import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Radio,
  Save
} from 'lucide-react';
import {
  createInitialGameState,
  calculateStreetCred,
  getAvailableEddies,
  getTotalAvailableEddies,
  sellCardForEddies,
  playCard,
  playUnitCard,
  playProgramCard,
  playGearCard,
  getCardType,
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
  parseCardPower,
  parseCardCost,
  isCardVendible,
  toggleEddieSpent,
  toggleLegendSpent,
  resolveFight,
  DICE_CONFIG
} from '../utils/cyberpunkEngine.js';
import {
  runBotTurn,
  decideBotBlocker,
  executeBotReaction,
  resolvePendingAttackAndContinueBot
} from '../utils/botAi.js';
import { getCardRulesText, executeUnitAttackTrigger } from '../utils/cardEffects.js';

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

// Helper seguro para obtener array de palabras clave (soporta string separado por comas o array)
export function getCardKeywordsArray(card) {
  if (!card || !card.keywords) return [];
  if (Array.isArray(card.keywords)) return card.keywords;
  if (typeof card.keywords === 'string' && card.keywords.trim()) {
    return card.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }
  return [];
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
// GESTIÓN DE PERSISTENCIA LOCAL (F5 / CERRAR Y REABRIR NAVEGADOR)
// =========================================================================
const CP_SIM_STORAGE_KEY = 'cp_sim_save';
const CP_SIM_AUTH_KEY = 'cp_sim_auth';

function loadSavedGame() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CP_SIM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.gameState &&
      parsed.gameState.player &&
      parsed.gameState.bot &&
      Array.isArray(parsed.gameState.player.hand) &&
      Array.isArray(parsed.gameState.player.legends) &&
      Array.isArray(parsed.gameState.bot.legends)
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer partida guardada en localStorage:', err);
  }
  return null;
}

// =========================================================================
// COMPONENTE PRINCIPAL DEL SIMULADOR
// =========================================================================
export default function CyberSimulator({ initialCards = [], initialCms = {} }) {
  // Control de hidratación segura en el cliente (evita crash en React 19)
  const [isClient, setIsClient] = useState(false);

  // Autenticación de la ALPHA (persiste entre sesiones en localStorage y sessionStorage)
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
  const [showTurnGuideModal, setShowTurnGuideModal] = useState(false);

  // Estados para Drag & Drop y Animación de Dados
  const [isDragOverField, setIsDragOverField] = useState(false);
  const [isDragOverEddies, setIsDragOverEddies] = useState(false);
  const [rollingAnimation, setRollingAnimation] = useState(null);

  // Popup de Transmisión Kiroshi (avisos de falta de Eddies, triggers, etc.)
  const [holocall, setHolocall] = useState(null);

  // Modal interactivo para robar Gigs específicos del rival
  const [pendingGigTheft, setPendingGigTheft] = useState(null);

  // Drawer / menú lateral HUD para resoluciones móviles y tablets (< lg)
  const [isHudOpen, setIsHudOpen] = useState(false);

  // Menú contextual flotante sobre una Leyenda (elección entre HACER CALL y SACAR EDDIE)
  const [legendMenuId, setLegendMenuId] = useState(null);
  const legendMenuRef = useRef(null);

  // Cerrar el menú flotante de la Leyenda si se hace clic fuera de él (sin backdrops molestos)
  useEffect(() => {
    if (!legendMenuId) return;

    const handlePointerDown = (e) => {
      if (legendMenuRef.current && !legendMenuRef.current.contains(e.target)) {
        const isSlotClick = e.target.closest('[data-legend-slot="true"]');
        if (!isSlotClick) {
          setLegendMenuId(null);
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [legendMenuId]);

  // Estado para previsualización fija en la zona central izquierda del HUD (Kiroshi Scanner)
  const [hoveredCard, setHoveredCard] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [isKiroshiHoverZoom, setIsKiroshiHoverZoom] = useState(false);
  const displayCard = hoveredCard || previewCard || selectedFieldUnit || selectedHandCard;

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

  // Jugar carta arrastrada o clicada (Unidad -> Campo, Programa -> Trash, Gear -> Equipa)
  const handlePlayCard = (cardInstanceId, targetId = null) => {
    if (!gameState || gameState.activePlayer !== 'player' || gameState.isGameOver) return;
    pushHistory();
    const res = playCard(gameState, 'player', cardInstanceId, targetId);
    if (res.success) {
      setSelectedHandCard(null);
      setGameState({ ...gameState });
    } else {
      if (res.missingEddies) {
        setHolocall({
          title: 'EDDIES INSUFICIENTES',
          message: `¡Atención, Netrunner! Te faltan ${res.missingEddies} €$ para poder jugar "${res.cardName || 'esta carta'}". Haz clic en tus cartas de la Zona de Eddies o en tus Leyendas para girarlas antes de jugarla.`,
          characterName: 'VIKTOR // RIPPERDOC',
          missingEddies: res.missingEddies,
          type: 'warning'
        });
      } else {
        alert(res.reason);
      }
    }
  };

  // Girar o enderezar carta en la Zona de Eddies (+1 €$ en reserva)
  const handleToggleEddie = (eddieId) => {
    if (!gameState || gameState.activePlayer !== 'player' || gameState.isGameOver) return;
    pushHistory();
    const res = toggleEddieSpent(gameState, 'player', eddieId);
    if (!res.success) {
      setHolocall({
        title: 'EDDIE YA CONSUMIDO',
        message: res.reason || 'Este Eddie ya fue consumido este turno para pagar cartas. Se enderezará en tu próxima Fase de Inicio.',
        characterName: 'VIKTOR // RIPPERDOC',
        type: 'warning'
      });
    }
    setGameState(JSON.parse(JSON.stringify(gameState)));
  };

  // Girar o enderezar Leyenda (+1 €$ en reserva)
  const handleToggleLegend = (legendId) => {
    if (!gameState || gameState.activePlayer !== 'player' || gameState.isGameOver) return;
    pushHistory();
    const res = toggleLegendSpent(gameState, 'player', legendId);
    if (!res.success) {
      setHolocall({
        title: 'LEYENDA BLOQUEADA',
        message: res.reason || 'Esta Leyenda no puede enderezarse o ya fue consumida este turno.',
        characterName: 'VIKTOR // RIPPERDOC',
        type: 'warning'
      });
    }
    setGameState(JSON.parse(JSON.stringify(gameState)));
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

  // Continuar el combate tras el disparo del trigger ATTACK (y tras la elección de carta si la hubo)
  const continueAttackAfterTrigger = (attackParams) => {
    const { targetType, targetUnitId, preferredDice, attackerUnitId } = attackParams;
    const attackerUnit = (gameState.player.field || []).find((u) => u.instanceId === attackerUnitId);
    if (!attackerUnit) {
      setSelectedFieldUnit(null);
      setGameState({ ...gameState });
      return;
    }

    // 2. FASE 2: FASE DE REACCIÓN DEL RIVAL (BOT)
    const botBlocker = executeBotReaction(gameState, attackerUnit, targetType, targetUnitId);

    // 3. FASE 3: COMBATE / FASE 4: ROBO DE GIGS
    if (targetType === 'GIGS') {
      if (botBlocker) {
        // Al haber bloqueador, se convierte en combate contra el bloqueador y no se roban Gigs
        resolveFight(gameState, 'player', attackerUnit, 'bot', botBlocker);
      } else {
        attackRivalGigs(gameState, 'player', attackerUnit.instanceId, null, preferredDice);
      }
    } else if (targetType === 'UNIT') {
      fightRivalUnit(
        gameState,
        'player',
        attackerUnit.instanceId,
        targetUnitId,
        botBlocker ? botBlocker.instanceId : null
      );
    }

    delete attackerUnit.hasTriggeredAttackThisDeclaration;
    setSelectedFieldUnit(null);
    setGameState({ ...gameState });
  };

  // Ataque unificado del Jugador con las 4 Fases Oficiales de Combate:
  // FASE 1: Declarar atacantes (gira unidad Ready sin Lag, elige objetivo: unidad rival spent o Gigs).
  //         Dispara habilidad ATTACK antes de la reacción (incluso si la unidad tiene poder 0).
  // FASE 2: Fase de Reacción del Rival (el bot puede hacer Call a leyenda, jugar Quick o asignar Blocker).
  // FASE 3: Combate (si el objetivo es una unidad o Blocker: compara poderes, derrota, basura).
  // FASE 4: Robar (si el objetivo son Gigs y no hubo Blocker: roba dados según tabla de poder).
  const handlePlayerAttack = (targetType, targetUnitId = null, preferredDice = []) => {
    if (!selectedFieldUnit || selectedFieldUnit.isSpent || selectedFieldUnit.isLagging) return;

    pushHistory();

    const targetUnit = targetUnitId
      ? (gameState.bot.field || []).find((u) => u.instanceId === targetUnitId)
      : null;
    const targetDesc =
      targetType === 'GIGS'
        ? 'el Área de Gigs del Rival'
        : `la unidad rival gastada "${targetUnit?.name || 'Unidad'}"`;

    // 1. FASE 1: DECLARACIÓN DE ATAQUE Y DISPARO DE ATTACK
    selectedFieldUnit.isSpent = true;
    selectedFieldUnit.hasTriggeredAttackThisDeclaration = true;
    executeUnitAttackTrigger(gameState, 'player', selectedFieldUnit);

    gameState.actionLog.unshift(
      `⚔️ [FASE 1: DECLARACIÓN DE ATAQUE] ${gameState.player.name} gira a "${selectedFieldUnit.name}" [Fuerza: ${selectedFieldUnit.currentPower}] y ataca a ${targetDesc}. (Trigger ATTACK ejecutado).`
    );

    // Si el trigger de ataque disparó una elección de cartas interactiva (ej: Sketchy Ripper), pausar combate
    if (gameState.pendingCardChoice) {
      gameState.pendingAttackContinuation = {
        targetType,
        targetUnitId,
        preferredDice,
        attackerUnitId: selectedFieldUnit.instanceId
      };
      setGameState({ ...gameState });
      return;
    }

    continueAttackAfterTrigger({
      targetType,
      targetUnitId,
      preferredDice,
      attackerUnitId: selectedFieldUnit.instanceId
    });
  };

  // Resolver la elección interactiva de carta (ej: Sketchy Ripper, Viktor Vektor, Three Mouths, etc.)
  const handleResolveCardChoice = (selectedCardIds = []) => {
    if (!gameState?.pendingCardChoice) return;
    const choice = gameState.pendingCardChoice;
    const p = gameState[choice.playerKey || 'player'];
    const selectedCards = (choice.cards || []).filter((c) => selectedCardIds.includes(c.instanceId));
    const remainingCards = (choice.cards || []).filter((c) => !selectedCardIds.includes(c.instanceId));

    // Añadir cartas seleccionadas al destino (ej: mano con distintivo recién robada)
    if (choice.destination === 'HAND') {
      selectedCards.forEach((c) => {
        c.isJustDrawn = true;
        p.hand.push(c);
      });
    }

    // Enviar las restantes a su destino (fondo de mazo o trash)
    if (choice.remainingDestination === 'BOTTOM_DECK') {
      if (!p.deck) p.deck = [];
      p.deck.push(...remainingCards);
    } else if (choice.remainingDestination === 'TRASH') {
      if (!p.trash) p.trash = [];
      p.trash.push(...remainingCards);
    }

    if (selectedCards.length > 0) {
      gameState.actionLog.unshift(
        `🃏 [${choice.sourceCardName}] Seleccionaste "${selectedCards.map((c) => c.name).join(', ')}" y se añadió a tu mano. El resto fue al fondo del mazo.`
      );
    } else {
      gameState.actionLog.unshift(
        `🔍 [${choice.sourceCardName}] No se seleccionó ninguna carta. Las cartas fueron enviadas al fondo del mazo.`
      );
    }

    const pendingAttack = gameState.pendingAttackContinuation;
    delete gameState.pendingCardChoice;
    delete gameState.pendingAttackContinuation;

    if (pendingAttack) {
      continueAttackAfterTrigger(pendingAttack);
    } else {
      setGameState({ ...gameState });
    }
  };

  // Robar un dado de Gig específico del rival (al hacer clic sobre él en su barra de Gigs)
  const handleStealSpecificDie = (dieName) => {
    if (!selectedFieldUnit || selectedFieldUnit.isSpent || selectedFieldUnit.isLagging) return;
    if (!gameState.bot.gigs || gameState.bot.gigs.length === 0) return;
    const gigsToSteal = calculateGigsToSteal(selectedFieldUnit.currentPower);
    if (gigsToSteal > 1 && gameState.bot.gigs.length > 1) {
      setPendingGigTheft({
        countToSteal: Math.min(gigsToSteal, gameState.bot.gigs.length),
        selectedDice: [dieName],
        attackerUnit: selectedFieldUnit
      });
    } else {
      handlePlayerAttack('GIGS', null, [dieName]);
    }
  };

  // Asignar o desasignar Blocker durante la Fase de Respuesta del Jugador
  const handleSelectBlocker = (blockerUnitId) => {
    if (!gameState?.pendingReaction) return;
    setGameState((prev) => ({
      ...prev,
      pendingReaction: {
        ...prev.pendingReaction,
        blockerUnitId: prev.pendingReaction.blockerUnitId === blockerUnitId ? null : blockerUnitId
      }
    }));
  };

  // Llamar a Leyenda durante la Fase de Respuesta del Jugador (cuesta 1 €$, máx 1 por turno)
  const handleReactionCallLegend = (legendInstanceId) => {
    if (!gameState?.pendingReaction || gameState.player.hasCalledLegendThisTurn) return;
    const totalEddies = getTotalAvailableEddies(gameState.player);
    if (totalEddies < 1) {
      setHolocall({
        title: 'FONDOS INSUFICIENTES',
        message: 'Necesitas al menos 1 €$ para llamar a una Leyenda durante la Fase de Respuesta.',
        type: 'warning'
      });
      return;
    }
    // Si no hay floating eddies, girar 1 eddie disponible (priorizando zona de eddies u otra leyenda para preservar el estado de esta leyenda)
    if (gameState.player.floatingEddies < 1) {
      const unspentEddie = (gameState.player.eddies || []).find((e) => !e.isSpent);
      if (unspentEddie) {
        toggleEddieSpent(gameState, 'player', unspentEddie.instanceId);
      } else {
        const otherUnspentLeg = (gameState.player.legends || []).find(
          (l) => !l.isSpent && l.instanceId !== legendInstanceId
        );
        if (otherUnspentLeg) {
          toggleLegendSpent(gameState, 'player', otherUnspentLeg.instanceId);
        } else {
          const thisLeg = (gameState.player.legends || []).find((l) => l.instanceId === legendInstanceId);
          if (thisLeg && !thisLeg.isSpent) {
            toggleLegendSpent(gameState, 'player', thisLeg.instanceId);
          }
        }
      }
    }
    callLegendFaceUp(gameState, 'player', legendInstanceId);
    gameState.actionLog.unshift(`🛡️ [Fase de Respuesta] ¡Has llamado a tu Leyenda boca arriba!`);
    setGameState({ ...gameState });
  };

  // Jugar una carta Quick desde la mano durante la Fase de Respuesta del Jugador
  const handleReactionPlayQuickCard = (cardInstanceId) => {
    if (!gameState?.pendingReaction) return;
    const card = (gameState.player.hand || []).find((c) => c.instanceId === cardInstanceId);
    if (!card) return;
    const cost = card.parsedCost || 0;
    const totalEddies = getTotalAvailableEddies(gameState.player);
    if (totalEddies < cost) {
      setHolocall({
        title: 'FONDOS INSUFICIENTES',
        message: `Necesitas ${cost} €$ para jugar "${card.name}" en la Fase de Respuesta. Dispones de ${totalEddies} €$.`,
        type: 'warning'
      });
      return;
    }
    while (gameState.player.floatingEddies < cost) {
      const unspentEddie = (gameState.player.eddies || []).find((e) => !e.isSpent);
      if (unspentEddie) {
        toggleEddieSpent(gameState, 'player', unspentEddie.instanceId);
      } else {
        const unspentLeg = (gameState.player.legends || []).find((l) => !l.isSpent);
        if (unspentLeg) toggleLegendSpent(gameState, 'player', unspentLeg.instanceId);
        else break;
      }
    }
    playCard(gameState, 'player', cardInstanceId);
    gameState.actionLog.unshift(`⚡ [Fase de Respuesta] ¡Has jugado "${card.name}" (QUICK)!`);
    setGameState({ ...gameState });
  };

  // Resolver el combate pendiente tras la Fase de Respuesta del Jugador
  const handleResolveReactionCombat = async () => {
    if (!gameState?.pendingReaction) return;
    setIsBotThinking(true);
    await resolvePendingAttackAndContinueBot(
      gameState,
      (updated) => setGameState({ ...updated }),
      750
    );
    setIsBotThinking(false);
  };

  // Inicialización segura en el cliente (evita hydration mismatch y render-loop en React 19)
  useEffect(() => {
    setIsClient(true);
    try {
      if (
        sessionStorage.getItem(CP_SIM_AUTH_KEY) === 'true' ||
        localStorage.getItem(CP_SIM_AUTH_KEY) === 'true'
      ) {
        setIsAuthenticated(true);
      }
    } catch {}

    const saved = loadSavedGame();
    if (saved && saved.gameState) {
      setGameState(saved.gameState);
      if (typeof saved.selectedPlayerDeckIdx === 'number') {
        setSelectedPlayerDeckIdx(saved.selectedPlayerDeckIdx);
      }
      if (typeof saved.selectedBotDeckIdx === 'number') {
        setSelectedBotDeckIdx(saved.selectedBotDeckIdx);
      }
      if (Array.isArray(saved.history)) {
        setHistory(saved.history);
      }
    } else {
      const pDeck = availableDecks[0] || { deckList: [], legends: [] };
      const bDeck = availableDecks[1] || availableDecks[0] || { deckList: [], legends: [] };
      const initial = createInitialGameState(pDeck, bDeck, initialCards);
      setGameState(initial);
    }
  }, []);

  // Inicializar o reiniciar partida (preserva guardado si forceNew es false)
  const handleStartGame = (pDeckIdx = selectedPlayerDeckIdx, bDeckIdx = selectedBotDeckIdx, forceNew = false) => {
    if (!forceNew) {
      const saved = loadSavedGame();
      if (saved && saved.gameState) {
        setGameState(saved.gameState);
        if (typeof saved.selectedPlayerDeckIdx === 'number') {
          setSelectedPlayerDeckIdx(saved.selectedPlayerDeckIdx);
        }
        if (typeof saved.selectedBotDeckIdx === 'number') {
          setSelectedBotDeckIdx(saved.selectedBotDeckIdx);
        }
        if (Array.isArray(saved.history)) {
          setHistory(saved.history);
        }
        setSelectedHandCard(null);
        setSelectedFieldUnit(null);
        return;
      }
    }

    const pDeck = availableDecks[pDeckIdx] || availableDecks[0] || { deckList: [], legends: [] };
    const bDeck =
      availableDecks[bDeckIdx] || availableDecks[1] || availableDecks[0] || { deckList: [], legends: [] };

    const initial = createInitialGameState(pDeck, bDeck, initialCards);
    setGameState(initial);
    setHistory([]);
    setSelectedHandCard(null);
    setSelectedFieldUnit(null);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          CP_SIM_STORAGE_KEY,
          JSON.stringify({
            gameState: initial,
            selectedPlayerDeckIdx: pDeckIdx,
            selectedBotDeckIdx: bDeckIdx,
            history: [],
            savedAt: Date.now()
          })
        );
      } catch {}
    }
  };

  // Reiniciar partida con aviso de confirmación
  const handleResetGame = () => {
    if (
      window.confirm(
        '¿Deseas iniciar una nueva partida?\nSe reiniciará la mesa de combate y volverás a la fase inicial de elección de mano (Keep/Mulligan) y tirada de Gig en el Fixer.'
      )
    ) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CP_SIM_STORAGE_KEY);
        }
      } catch {}
      setSelectedHandCard(null);
      setSelectedFieldUnit(null);
      setLegendMenuId(null);
      setHoveredCard(null);
      setPreviewCard(null);
      setHistory([]);
      setHolocall(null);
      handleStartGame(selectedPlayerDeckIdx, selectedBotDeckIdx, true);
    }
  };

  // Acción directa para llamar a una Leyenda boca arriba gastando 1 €$
  const handleCallLegendAction = (legendInstanceId) => {
    if (!gameState) return;
    const p = gameState.player;

    if (p.hasCalledLegendThisTurn) {
      setHolocall({
        title: 'ACCIÓN YA USADA',
        message: 'Solo puedes llamar a 1 Leyenda boca arriba por turno (límite oficial de Night City).',
        characterName: 'VIKTOR // RIPPERDOC',
        type: 'warning'
      });
      return;
    }

    const leg = (p.legends || []).find((l) => l.instanceId === legendInstanceId);
    if (!leg) return;
    if (leg.isFaceUp) return;

    // Comprobar si hay 1 €$ disponible (en reserva o en cartas para girar)
    const floating = p.floatingEddies || 0;
    const totalAvail = getTotalAvailableEddies(p);

    if (floating < 1 && totalAvail < 1) {
      setHolocall({
        title: 'EDDIES INSUFICIENTES',
        message: 'Llamar a una Leyenda boca arriba cuesta 1 €$. No tienes Eddies en tu reserva ni cartas disponibles para girar en tu Zona de Eddies.',
        characterName: 'VIKTOR // RIPPERDOC',
        missingEddies: 1,
        type: 'warning'
      });
      return;
    }

    pushHistory();

    // Si no hay floating eddies en reserva, girar automáticamente 1 eddie de la zona de eddies u otra leyenda
    if ((p.floatingEddies || 0) < 1) {
      const unspentEddie = (p.eddies || []).find((e) => !e.isSpent);
      if (unspentEddie) {
        unspentEddie.isSpent = true;
        p.floatingEddies = (p.floatingEddies || 0) + 1;
        (gameState.actionLog = gameState.actionLog || []).unshift(
          `💶 ${p.name} gira 1 carta en su Zona de Eddies para pagar la llamada (+1 €$).`
        );
      } else {
        const otherUnspentLeg = (p.legends || []).find(
          (l) => !l.isSpent && l.instanceId !== legendInstanceId
        );
        if (otherUnspentLeg) {
          otherUnspentLeg.isSpent = true;
          p.floatingEddies = (p.floatingEddies || 0) + 1;
          (gameState.actionLog = gameState.actionLog || []).unshift(
            `👑 ${p.name} gira a su Leyenda "${otherUnspentLeg.name}" para pagar la llamada (+1 €$).`
          );
        } else if (!leg.isSpent) {
          leg.isSpent = true;
          p.floatingEddies = (p.floatingEddies || 0) + 1;
        }
      }
    }

    const res = callLegendFaceUp(gameState, 'player', legendInstanceId);
    if (!res.success) {
      setHolocall({
        title: 'FONDOS INSUFICIENTES',
        message: res.reason || 'No se pudo llamar a la Leyenda.',
        characterName: 'VIKTOR // RIPPERDOC',
        type: 'warning'
      });
    } else {
      setPreviewCard(leg);
      setHoveredCard(leg);
    }
    setGameState(JSON.parse(JSON.stringify(gameState)));
  };

  // Autoguardado continuo de la partida en localStorage ante cualquier cambio
  useEffect(() => {
    if (!gameState || typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        CP_SIM_STORAGE_KEY,
        JSON.stringify({
          gameState,
          selectedPlayerDeckIdx,
          selectedBotDeckIdx,
          history: history.slice(-5),
          savedAt: Date.now()
        })
      );
    } catch (err) {
      console.warn('Error al autoguardar en localStorage:', err);
    }
  }, [gameState, selectedPlayerDeckIdx, selectedBotDeckIdx, history]);

  // Comprobar contraseña
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === 'cyberpunk2077') {
      setIsAuthenticated(true);
      setAuthError(false);
      try {
        sessionStorage.setItem(CP_SIM_AUTH_KEY, 'true');
        localStorage.setItem(CP_SIM_AUTH_KEY, 'true');
      } catch {}
      handleStartGame();
    } else {
      setAuthError(true);
    }
  };

  // Turno del bot automático cuando le toque y el jugador ya haya decidido el Mulligan
  // (Pausa durante la Fase de Respuesta si pendingReaction está activo)
  useEffect(() => {
    if (!gameState || gameState.isGameOver || !gameState.mulliganDecided) return;

    if (gameState.activePlayer === 'bot' && !isBotThinking && !gameState.pendingReaction) {
      setIsBotThinking(true);
      runBotTurn(gameState, (updated) => setGameState({ ...updated }), 750).then(() => {
        setIsBotThinking(false);
      });
    }
  }, [
    gameState?.activePlayer,
    gameState?.turnNumber,
    gameState?.isGameOver,
    gameState?.mulliganDecided,
    gameState?.pendingReaction
  ]);

  // Pantalla de carga mientras se hidrata en el cliente o se inicializa el estado
  if (!isClient || !gameState) {
    return (
      <div className="min-h-screen bg-[#070a10] text-[#0dfceb] flex flex-col items-center justify-center font-mono gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-[#0dfceb] animate-ping" />
          <span className="text-sm tracking-widest font-bold uppercase">
            // CARGANDO SIMULADOR NIGHT CITY...
          </span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          SISTEMA COMBATE ALPHA 1.0
        </span>
      </div>
    );
  }

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

  const p = gameState.player;
  const bot = gameState.bot;
  const isMyTurn =
    gameState.activePlayer === 'player' && !gameState.isGameOver && gameState.mulliganDecided;
  const playerStreetCred = calculateStreetCred(p.gigs);
  const botStreetCred = calculateStreetCred(bot.gigs);
  const availableEddies = getAvailableEddies(p);
  const unspentEddiesCount = (p.eddies || []).filter((e) => !e.isSpent).length;
  const unspentLegendsCount = (p.legends || []).filter((l) => !l.isSpent).length;
  const totalSpendableCapacity = availableEddies + unspentEddiesCount + unspentLegendsCount;

  const canAttackGigs =
    isMyTurn &&
    selectedFieldUnit &&
    !selectedFieldUnit.isSpent &&
    !selectedFieldUnit.isLagging &&
    bot.gigs &&
    bot.gigs.length > 0;
  const gigsToSteal = canAttackGigs ? calculateGigsToSteal(selectedFieldUnit.currentPower) : 0;

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

          {/* Indicador de Autoguardado Activo (Persiste en F5 o al cerrar pestaña) */}
          <div
            style={{ clipPath: CYBER_BUTTON }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#000000] border border-[#0dfceb]/30 text-[#0dfceb] font-mono text-[10px] font-bold select-none shadow-[0_0_8px_rgba(13,252,235,0.15)]"
            title="Tu partida se guarda automáticamente en este navegador. Si pulsas F5 o cierras la pestaña, se conservará todo tu progreso exactamente donde lo dejaste."
          >
            <Save className="w-3.5 h-3.5 text-[#0dfceb] animate-pulse" />
            <span className="tracking-wider text-[9px] uppercase">AUTOGUARDADO</span>
          </div>

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

          {/* Botón responsive para alternar HUD / Dados en pantallas medianas y móviles */}
          <button
            type="button"
            onClick={() => setIsHudOpen((prev) => !prev)}
            style={{ clipPath: CYBER_BUTTON }}
            className={`lg:hidden px-2.5 sm:px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 cursor-pointer text-xs transition-all ${
              isHudOpen
                ? 'bg-[#0dfceb] text-black shadow-[0_0_15px_rgba(13,252,235,0.7)]'
                : 'bg-[#000000] border border-[#0dfceb]/50 text-[#0dfceb] hover:border-[#0dfceb]'
            }`}
            title="Ver estadísticas y dados del Netrunner y Corpo"
          >
            <span>📊</span>
            <span>{isHudOpen ? 'TABLERO' : 'HUD / DADOS'}</span>
          </button>

          {/* Botón Nueva Partida */}
          <button
            type="button"
            onClick={handleResetGame}
            style={{ clipPath: CYBER_BUTTON }}
            className="px-2.5 sm:px-3 py-1.5 bg-[#FF003C]/20 hover:bg-[#FF003C] text-[#FF003C] hover:text-white border border-[#FF003C]/60 hover:border-[#FF003C] font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer text-xs transition-all shadow-[0_0_15px_rgba(255,0,60,0.3)] hover:shadow-[0_0_20px_rgba(255,0,60,0.7)]"
            title="Iniciar una Nueva Partida limpia desde el Turno 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>NUEVA PARTIDA</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          CUERPO PRINCIPAL DEL JUEGO:
          [PANEL IZQUIERDO: HUD DEL JUGADOR Y RIVAL] [CAMPO DE BATALLA CENTRAL]
         ===================================================================== */}
      <div className="relative z-10 flex-1 flex flex-row overflow-hidden w-full">
        {/* Backdrop para cerrar el HUD en móviles cuando está abierto */}
        {isHudOpen && (
          <div
            onClick={() => setIsHudOpen(false)}
            className="lg:hidden fixed inset-0 z-35 bg-black/60 backdrop-blur-xs"
          />
        )}

        {/* ===============================================================
            PANEL IZQUIERDO (HUD DEL JUGADOR Y RIVAL):
            - Marcadores de "Eddies"
            - Avatares
            - Dados geométricos (D4 a D20) apilados
            - Contenedores de puntuación con clip-path diagonal
           =============================================================== */}
        <aside
          className={`
            ${isHudOpen ? 'fixed inset-y-0 left-0 z-40 w-72 sm:w-80 shadow-2xl bg-[#070a10] flex' : 'hidden'}
            lg:flex lg:static lg:w-64 xl:w-80 lg:shadow-none
            bg-[#070a10]/95 border-r border-[#0dfceb]/30 p-2.5 sm:p-3 flex-col justify-between font-mono shrink-0 overflow-y-auto space-y-3 pb-36 cyber-scrollbar
          `}
        >
          {/* Botón de cierre en pantalla móvil */}
          <div className="lg:hidden flex items-center justify-between pb-1.5 border-b border-[#0dfceb]/30">
            <span className="text-xs font-black text-[#0dfceb] uppercase tracking-wider">
              // HUD & DADOS //
            </span>
            <button
              type="button"
              onClick={() => setIsHudOpen(false)}
              className="text-[#FF003C] hover:text-white px-2 py-0.5 border border-[#FF003C]/40 hover:bg-[#FF003C] text-[10px] font-bold rounded cursor-pointer transition-colors"
            >
              ✕ CERRAR
            </button>
          </div>
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

          {/* ===============================================================
              ZONA CENTRAL IZQUIERDA: PREVISUALIZACIÓN DE CARTA EN EL HUD
              (Encima de V // NETRUNNER y debajo de los dados del rival)
             =============================================================== */}
          <div
            className="my-1.5 p-2 bg-[#000000]/95 border border-[#0dfceb]/50 shadow-[0_0_20px_rgba(13,252,235,0.15)] flex flex-col items-center relative transition-all rounded-xl shrink-0"
          >
            {/* Cabecera del Escáner */}
            <div className="w-full flex items-center justify-between pb-1 border-b border-[#0dfceb]/20 text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">
              <span className="text-[#0dfceb] flex items-center gap-1.5 font-black">
                <span className="w-2 h-2 rounded-full bg-[#0dfceb] animate-ping" />
                ESCÁNER KIROSHI
              </span>
              <span className="text-gray-500 text-[8px]">
                {displayCard ? 'OBJETIVO FIJADO' : 'BUSCANDO CARTA'}
              </span>
            </div>

            {displayCard ? (
              <div className="w-full flex flex-col items-center gap-1.5">
                {/* Imagen de la Carta en Miniatura Compacta (al hacer hover sale a tamaño completo) */}
                <div
                  onMouseEnter={() => setIsKiroshiHoverZoom(true)}
                  onMouseLeave={() => setIsKiroshiHoverZoom(false)}
                  onClick={() => setInspectedCard(displayCard)}
                  className="relative w-28 sm:w-32 aspect-[7/10] rounded overflow-hidden border-2 border-[#FCEE0A] shadow-[0_0_15px_rgba(252,238,10,0.4)] bg-black cursor-pointer group transition-transform duration-200 hover:scale-[1.03] shrink-0"
                  title="Pasa el ratón para ver a tamaño completo // Clic para voltear"
                >
                  <img
                    src={displayCard.image}
                    alt={displayCard.name}
                    className="w-full h-full object-cover"
                  />
                  {displayCard.currentPower !== undefined && (
                    <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs shadow-md rounded">
                      ⚡ {displayCard.currentPower}
                    </div>
                  )}

                  {/* Overlay indicando tamaño completo */}
                  <div className="absolute inset-0 bg-[#0dfceb]/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-2 py-0.5 bg-black/85 border border-[#0dfceb] text-[#0dfceb] text-[8px] font-mono font-black uppercase rounded shadow">
                      🔍 TAMAÑO COMPLETO
                    </span>
                  </div>
                </div>

                {/* Nombre y Coste */}
                <div className="w-full flex items-center justify-between px-1 text-xs mt-0.5">
                  <span className="font-black text-white truncate max-w-[170px] uppercase">
                    {displayCard.name}
                  </span>
                  <span className="text-[#0dfceb] font-black shrink-0">
                    {displayCard.parsedCost !== undefined && displayCard.parsedCost !== null
                      ? `${displayCard.parsedCost} €$`
                      : 'LEYENDA'}
                  </span>
                </div>

                {/* Si es una leyenda boca abajo del jugador, avisar en qué slot está */}
                {p.legends.some((l) => l.instanceId === displayCard.instanceId) && !displayCard.isFaceUp && (
                  <div className="w-full bg-[#0dfceb]/15 border border-[#0dfceb]/40 px-2 py-0.5 rounded text-[8px] font-mono text-[#0dfceb] font-bold text-center mt-1">
                    👑 TU LEYENDA (SLOT #{p.legends.findIndex((l) => l.instanceId === displayCard.instanceId) + 1} • BOCA ABAJO)
                  </div>
                )}

                {/* Tipo oficial */}
                {(() => {
                  const type = getCardType(displayCard);
                  const isProg = type === 'PROGRAM';
                  const isGr = type === 'GEAR';
                  return (
                    <div className="w-full flex items-center gap-1.5 px-1 text-[8px] font-bold">
                      <span className={`px-1.5 py-0.2 rounded uppercase ${
                        isProg ? 'bg-[#0dfceb]/20 text-[#0dfceb] border border-[#0dfceb]/40' :
                        isGr ? 'bg-[#FCEE0A]/20 text-[#FCEE0A] border border-[#FCEE0A]/40' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {isProg ? '💾 PROGRAMA (A TRASH TRAS LANZARSE)' :
                         isGr ? '🔧 GEAR (EQUIPABLE A UNIDAD/LEYENDA)' :
                         type}
                      </span>
                    </div>
                  );
                })()}

                {/* Lista de Gears equipados si los tiene */}
                {displayCard.gear && displayCard.gear.length > 0 && (
                  <div className="w-full bg-[#070a10] border border-[#FCEE0A]/40 rounded p-1 text-[8px] space-y-0.5">
                    <span className="text-[#FCEE0A] font-bold block uppercase">
                      🔧 EQUIPO ANEXADO ({displayCard.gear.length}):
                    </span>
                    {displayCard.gear.map((g, gi) => (
                      <div key={gi} className="flex justify-between text-gray-300">
                        <span className="truncate max-w-[130px]">• {g.name}</span>
                        <span className="text-[#0dfceb] font-bold">{g.powerVal || g.power || ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Palabras clave (100% seguro para string, array o undefined) */}
                {(() => {
                  const kws = getCardKeywordsArray(displayCard);
                  if (kws.length === 0) return null;
                  return (
                    <div className="w-full flex flex-wrap gap-1 px-1">
                      {kws.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 bg-[#0dfceb]/20 text-[#0dfceb] border border-[#0dfceb]/40 text-[8px] font-bold uppercase rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Estados especiales: Gastada o Lag */}
                {(displayCard.isSpent || displayCard.isLagging) && (
                  <div className="w-full flex items-center gap-2 px-1 text-[8px] font-bold">
                    {displayCard.isSpent && (
                      <span className="text-[#FF003C] uppercase">⚠ GASTADA</span>
                    )}
                    {displayCard.isLagging && (
                      <span className="text-[#FF003C] uppercase">⚠ LAG (ESTE TURNO)</span>
                    )}
                  </div>
                )}

                {/* Texto de reglas oficial de la carta (Motor de Habilidades) */}
                {(() => {
                  const rules = getCardRulesText(displayCard);
                  if (!rules) return null;
                  return (
                    <div className="w-full bg-[#030712] border border-[#0dfceb]/35 rounded p-1.5 text-[9px] font-mono space-y-1 text-gray-200 leading-snug shadow-sm">
                      <div className="flex items-center gap-1 text-[8px] font-bold text-[#0dfceb] uppercase tracking-wider border-b border-[#0dfceb]/20 pb-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-[#FCEE0A]" />
                        <span>REGLAS / HABILIDAD:</span>
                      </div>
                      <div className="whitespace-pre-line text-gray-300">
                        {rules}
                      </div>
                    </div>
                  );
                })()}

                {/* Si la carta mostrada es una Leyenda del jugador boca abajo, ofrecer botón directo de Call */}
                {p.legends.some((l) => l.instanceId === displayCard.instanceId) && !displayCard.isFaceUp && (
                  <div className="w-full pt-2 mt-1 border-t border-[#0dfceb]/30">
                    <button
                      type="button"
                      disabled={p.hasCalledLegendThisTurn}
                      onClick={() => handleCallLegendAction(displayCard.instanceId)}
                      className={`w-full py-2 px-2.5 rounded font-mono font-black text-[10px] uppercase tracking-wider flex items-center justify-between transition-all ${
                        p.hasCalledLegendThisTurn
                          ? 'bg-gray-900 text-gray-500 border border-gray-800 cursor-not-allowed'
                          : availableEddies > 0
                          ? 'bg-[#0dfceb] hover:bg-white text-black shadow-[0_0_15px_rgba(13,252,235,0.7)] cursor-pointer'
                          : 'bg-[#0dfceb]/20 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb] shadow-[0_0_10px_rgba(13,252,235,0.3)] cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>👑</span>
                        <span>HACER CALL (DAR LA VUELTA)</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black text-[#0dfceb] rounded">1 €$</span>
                    </button>
                    {p.hasCalledLegendThisTurn && (
                      <span className="text-[8px] text-gray-500 block text-center mt-1">
                        Límite alcanzado: 1 llamada por turno.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-gray-500 py-6">
                <div className="w-10 h-10 rounded-full border border-dashed border-[#0dfceb]/40 flex items-center justify-center mb-2 animate-pulse">
                  <span className="text-[#0dfceb] text-base font-black">⊕</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                  PASA EL RATÓN SOBRE UNA CARTA
                </span>
                <span className="text-[8px] text-gray-600 block max-w-[180px]">
                  Pasa el cursor sobre cualquier carta boca arriba en el campo, leyendas o mano para verla en grande.
                </span>
              </div>
            )}
          </div>

          {/* SECCIÓN JUGADOR (TÚ) — SITUADA EN LA PARTE INFERIOR */}
          <div className="space-y-2.5 pt-1 mt-auto">
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
                className={`bg-[#000000] border p-2 transition-all ${
                  availableEddies > 0
                    ? 'border-[#0dfceb] shadow-[0_0_15px_rgba(13,252,235,0.4)]'
                    : 'border-[#0dfceb]/40'
                }`}
                title={`${availableEddies} €$ girados listos para gastar (${unspentEddiesCount + unspentLegendsCount} cartas disponibles para girar)`}
              >
                <span className="text-[9px] text-gray-400 uppercase block font-bold">TUS EDDIES</span>
                <span
                  className={`text-xl font-black font-mono transition-colors ${
                    availableEddies > 0
                      ? 'text-[#0dfceb] drop-shadow-[0_0_8px_rgba(13,252,235,0.8)]'
                      : 'text-gray-500'
                  }`}
                >
                  {availableEddies} €$
                </span>
                <span className="text-[8px] text-gray-400 block font-mono">
                  {unspentEddiesCount + unspentLegendsCount > 0
                    ? `${unspentEddiesCount + unspentLegendsCount} POR GIRAR`
                    : '0 DISPONIBLES'}
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
        <main className="flex-1 flex flex-col justify-between overflow-y-auto relative p-2 sm:p-3 pb-36 sm:pb-40 gap-2 font-mono">
          {/* ===============================================================
              1. SECCIÓN SUPERIOR: TAPETE DEL RIVAL (BOT) — MODO ESPEJO
              - Fila superior (Backline): Leyendas (3 slots a la izquierda) + Zona de Eddies (a la derecha)
              - Barra de Gigs con dados interactivos y Street Cred
              - Campo de Batalla Rival (cartas compactas con hover preview)
              - Columna Derecha: Trash (arriba) y Deck (abajo)
             =============================================================== */}
          <div className="flex gap-2 sm:gap-3 w-full items-stretch">
            {/* 1.A ZONA CENTRAL DEL RIVAL: BACKLINE (LEYENDAS + EDDIES) -> GIGS -> FRONTLINE (CAMPO) */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {/* FILA SUPERIOR (BACKLINE): LEYENDAS RIVAL A LA IZQUIERDA + EDDIES RIVAL A LA DERECHA */}
              <div className="h-20 sm:h-24 md:h-28 flex gap-2 items-stretch w-full">
                {/* LEYENDAS RIVAL (3 SLOTS) A LA IZQUIERDA */}
                <div className="rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-1.5 sm:p-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                  {bot.legends.map((leg, i) => (
                    <div
                      key={leg.instanceId || i}
                      onMouseEnter={() => {
                        if (leg.isFaceUp) {
                          setHoveredCard(leg);
                          setPreviewCard(leg);
                        }
                      }}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => leg.isFaceUp && setInspectedCard(leg)}
                      className={`w-11 sm:w-13 md:w-15 h-16 sm:h-20 md:h-24 rounded-lg border transition-all flex flex-col items-center justify-center relative shadow-md ${
                        leg.isFaceUp
                          ? leg.isSpent
                            ? 'border-[#FF003C]/70 shadow-[0_0_8px_rgba(255,0,60,0.3)] cursor-pointer'
                            : 'border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.5)] cursor-pointer'
                          : leg.isSpent
                          ? 'border-gray-800 opacity-60'
                          : 'border-[#FF003C]/40'
                      }`}
                      title={leg.isFaceUp ? leg.name : 'Leyenda boca abajo del Rival'}
                    >
                      <div
                        className={`w-full h-full transition-transform duration-500 flex items-center justify-center ${
                          leg.isSpent ? 'rotate-90 scale-75' : ''
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {leg.isFaceUp ? (
                            <motion.div
                              key={`b-leg-up-${leg.instanceId}`}
                              initial={{ rotateY: -90, opacity: 0.7 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              exit={{ rotateY: 90, opacity: 0 }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                              className="w-full h-full rounded-md overflow-hidden bg-black flex items-center justify-center border border-[#FF003C]/50 shadow"
                            >
                              <img
                                src={leg.image}
                                alt={leg.name}
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`b-leg-down-${leg.instanceId}`}
                              initial={{ rotateY: 90, opacity: 0.7 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              exit={{ rotateY: -90, opacity: 0 }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                              className="w-full h-full rounded-md overflow-hidden"
                            >
                              <CyberCardBack isLegend={true} className="w-full h-full" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Indicador sutil de girada sin tapar la ilustración */}
                      {leg.isSpent && (
                        <div className="absolute bottom-0.5 left-0.5 z-20 pointer-events-none">
                          <span className="px-1 py-0.2 bg-black/90 border border-[#FF003C]/60 text-[#FF003C] font-mono font-black text-[6px] sm:text-[7px] uppercase tracking-tighter shadow">
                            GIRADA
                          </span>
                        </div>
                      )}

                      {/* Badge de Gear si tiene equipo anexado */}
                      {leg.gear && leg.gear.length > 0 && (
                        <div className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-[#FCEE0A] text-black font-mono font-black text-[6px] sm:text-[7px] uppercase shadow z-10">
                          🔧 {leg.gear.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ZONA DE EDDIES RIVAL (A LA DERECHA DE SUS LEYENDAS) */}
                <div className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-2 sm:p-2.5 relative flex items-center overflow-hidden">
                  {bot.eddies.length === 0 ? (
                    <div className="text-gray-500 font-mono text-xs sm:text-sm select-none pl-2">
                      No Eddies yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5 pr-24 overflow-x-auto w-full">
                      {bot.eddies.map((ed, idx) => (
                        <div
                          key={ed.instanceId || idx}
                          className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                            ed.isSpent ? 'w-14 sm:w-16 h-10 sm:h-12 my-0.5' : 'w-10 sm:w-12 h-14 sm:h-16'
                          }`}
                          title={ed.isSpent ? 'Eddie del rival gastado' : '1 €$ del rival disponible'}
                        >
                          <div
                            className={`w-10 sm:w-12 h-14 sm:h-16 rounded-md overflow-hidden border transition-transform duration-300 relative shadow-md ${
                              ed.isSpent
                                ? 'rotate-90 opacity-40 border-gray-800'
                                : 'border-[#FF003C]/60 shadow-[0_0_10px_rgba(255,0,60,0.3)]'
                            }`}
                          >
                            <CyberCardBack className="w-full h-full" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span
                                className={`font-mono font-black text-[8px] px-1 bg-black/90 ${
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
                  <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#031525]/90 border border-[#FF003C]/60 text-[#FF003C] font-mono text-[10px] sm:text-xs font-bold shadow-[0_0_10px_rgba(255,0,60,0.25)] select-none pointer-events-none">
                    <span>Eddies {getAvailableEddies(bot)}/{bot.eddies.length + bot.legends.length}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[#FF003C] flex items-center justify-center text-[9px] font-black leading-none">Ⓐ</span>
                  </div>
                </div>
              </div>

              {/* BARRA DE GIGS DEL RIVAL (DADOS VISIBLES CON VALOR Y ELECCIÓN AL ASALTAR) */}
              <div
                className={`px-3 py-1 rounded-xl bg-[#070a10] border transition-all flex items-center justify-between ${
                  canAttackGigs
                    ? 'border-[#FCEE0A] bg-[#FCEE0A]/10 shadow-[0_0_20px_rgba(252,238,10,0.35)]'
                    : 'border-[#FF003C]/35'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#FF003C] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF003C] animate-pulse" />
                    <span>GIGS RIVAL ({bot.gigs.length}/7):</span>
                  </span>
                  {canAttackGigs ? (
                    <span className="text-[10px] sm:text-[11px] font-mono font-black text-[#FCEE0A] animate-pulse">
                      ⚡ ¡HAZ CLIC EN EL DADO QUE QUIERES ROBAR! (Roba {gigsToSteal} Gig)
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-gray-500 hidden sm:inline">
                      (Asalta esta zona con una unidad lista para robar dados)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {bot.gigs.length === 0 ? (
                    <span className="text-[10px] font-mono text-gray-500 italic">
                      Sin Gigs en juego aún
                    </span>
                  ) : (
                    bot.gigs.map((gig, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (canAttackGigs) {
                            handleStealSpecificDie(gig.die.toLowerCase());
                          }
                        }}
                        className={`transition-all duration-200 ${
                          canAttackGigs
                            ? 'cursor-pointer hover:scale-130 ring-2 ring-[#FF003C] hover:ring-[#FCEE0A] rounded-full p-0.5 animate-pulse'
                            : ''
                        }`}
                        title={
                          canAttackGigs
                            ? `¡Haz clic para robar este dado ${gig.die.toUpperCase()} (Valor: ${gig.value})!`
                            : `Dado ${gig.die.toUpperCase()} del Rival (Valor: ${gig.value})`
                        }
                      >
                        <PolyhedralDie
                          type={gig.die.toLowerCase()}
                          value={gig.value}
                          isWaiting={false}
                          isStolen={Boolean(gig.stolenFrom)}
                          size={canAttackGigs ? 32 : 26}
                        />
                      </div>
                    ))
                  )}
                  <span className="text-xs font-mono font-black text-[#FF003C] ml-1.5">
                    ⭐ {botStreetCred}
                  </span>
                </div>
              </div>

              {/* FRONTLINE: CAMPO DE BATALLA DEL RIVAL (FIELD) — CARTAS MÁS PEQUEÑAS CON HOVER PREVIEW */}
              <div className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 p-2 sm:p-2.5 min-h-[90px] sm:min-h-[110px] flex items-center relative overflow-x-auto">
                <div className="flex items-center gap-2.5 sm:gap-3 w-full justify-start">
                  {bot.field.map((unit) => {
                    const canAttackThisUnit =
                      selectedFieldUnit &&
                      !selectedFieldUnit.isSpent &&
                      !selectedFieldUnit.isLagging &&
                      unit.isSpent;

                    return (
                      <div
                        key={unit.instanceId}
                        onMouseEnter={() => {
                          setHoveredCard(unit);
                          setPreviewCard(unit);
                        }}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                          unit.isSpent
                            ? 'w-24 sm:w-28 h-16 sm:h-20 my-0.5'
                            : 'w-14 sm:w-16 md:w-20 h-20 sm:h-24 md:h-28'
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
                              ? '0 0 12px rgba(255, 0, 60, 0.25)'
                              : '0 0 0px rgba(0,0,0,0)'
                          }}
                          transition={{
                            boxShadow: {
                              repeat: canAttackThisUnit ? Infinity : 0,
                              duration: 1.2
                            }
                          }}
                          whileHover={{ scale: canAttackThisUnit ? 1.08 : 1.04 }}
                          onClick={() => {
                            if (canAttackThisUnit) {
                              handlePlayerAttack('UNIT', unit.instanceId);
                            } else {
                              setInspectedCard(unit);
                            }
                          }}
                          style={{ clipPath: CYBER_CARD_CLIP }}
                          className={`w-14 sm:w-16 md:w-20 h-20 sm:h-24 md:h-28 bg-black border-2 transition-transform duration-300 cursor-pointer flex flex-col justify-between relative shadow-xl ${
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
                          <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5 z-10 pointer-events-none">
                            {hasKeyword(unit, 'Blocker') && (
                              <span className="px-1 py-0.2 bg-[#0dfceb] text-black font-mono font-black text-[6px] sm:text-[7px] uppercase shadow">
                                🛡️
                              </span>
                            )}
                            {hasKeyword(unit, 'Adrenaline') && (
                              <span className="px-1 py-0.2 bg-[#FCEE0A] text-black font-mono font-black text-[6px] sm:text-[7px] uppercase shadow">
                                ⚡
                              </span>
                            )}
                            {hasKeyword(unit, 'Go Solo') && (
                              <span className="px-1 py-0.2 bg-[#FF003C] text-white font-mono font-black text-[6px] sm:text-[7px] uppercase shadow">
                                🔥
                              </span>
                            )}
                          </div>

                          {/* Insignia de Poder */}
                          <div className="absolute bottom-0.5 right-0.5 px-1.5 py-0.2 bg-[#FF003C] text-white font-mono font-black text-[9px] sm:text-[10px] shadow-md">
                            {unit.currentPower}
                          </div>

                          {/* Estado: GASTADA */}
                          {unit.isSpent && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                              <span className="px-1 py-0.5 bg-black border border-[#FF003C] text-[#FF003C] font-mono font-black text-[8px] uppercase tracking-wider -rotate-90">
                                GASTADA
                              </span>
                            </div>
                          )}

                          {/* Badge de Gear del Rival */}
                          {unit.gear && unit.gear.length > 0 && (
                            <div className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-[#FCEE0A] text-black font-mono font-black text-[6px] sm:text-[7px] uppercase shadow z-10 flex items-center gap-0.5">
                              <span>🔧</span>
                              <span>{unit.gear.length}</span>
                            </div>
                          )}
                        </motion.div>

                        {/* GEARS EQUIPADOS AL RIVAL (Sobresaliendo por debajo de la unidad) */}
                        {unit.gear && unit.gear.length > 0 && (
                          <div className="w-full flex flex-col items-center -mt-1 z-0">
                            {unit.gear.map((g, gIdx) => (
                              <div
                                key={g.instanceId || gIdx}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setHoveredCard(g);
                                  setPreviewCard(g);
                                }}
                                onMouseLeave={() => setHoveredCard(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedCard(g);
                                }}
                                style={{ clipPath: CYBER_CARD_CLIP }}
                                className="w-[92%] h-5 sm:h-6 bg-[#070a10] border border-[#FF003C]/80 flex items-center justify-between px-1 py-0.5 cursor-pointer shadow hover:border-[#FCEE0A] transition-all -mt-0.5 group"
                                title={`Gear equipado: ${g.name} (${g.power || '+Fuerza'}) - Clic para ver`}
                              >
                                <span className="text-[6px] sm:text-[7px] text-[#FF003C] group-hover:text-white truncate font-bold">
                                  🔧 {g.name}
                                </span>
                                <span className="text-[6px] sm:text-[7px] font-black text-[#FCEE0A] shrink-0">
                                  {g.powerVal || g.power || 'GEAR'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Slots vacíos de cartas (Rival) */}
                  {Array.from({ length: Math.max(0, 4 - bot.field.length) }).map((_, slotIdx) => (
                    <div
                      key={`bot-slot-${slotIdx}`}
                      className="w-14 sm:w-16 md:w-20 h-20 sm:h-24 md:h-28 rounded-xl border border-[#FF003C]/20 bg-black/25 flex items-center justify-center pointer-events-none shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 1.B COLUMNA DERECHA: TRASH (ARRIBA) Y DECK (ABAJO) DEL RIVAL */}
            <div className="flex flex-col gap-1.5 shrink-0 w-16 sm:w-20 md:w-24">
              {/* TRASH RIVAL */}
              <div
                className="h-16 sm:h-20 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-1 relative shadow-md select-none"
                title={`Descartes del Rival (Trash): ${bot.trash.length} cartas`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono text-gray-500 uppercase font-bold mb-0.5">TRASH</span>
                <span className="text-base sm:text-lg font-black font-mono text-gray-500">
                  {bot.trash.length}
                </span>
              </div>

              {/* DECK RIVAL */}
              <div
                className="flex-1 rounded-2xl border border-[#FF003C]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-1.5 relative shadow-md select-none"
                title={`Mazo del Rival (Deck): ${bot.deck.length} cartas`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono text-gray-500 uppercase font-bold mb-0.5">DECK</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.7)]">
                  {bot.deck.length}
                </span>
              </div>
            </div>
          </div>

          {/* ===============================================================
              2. SELECTOR E INDICADOR DE FASES EN TIEMPO REAL (HOW A TURN WORKS)
             =============================================================== */}
          <div className="my-1 relative flex items-center justify-center shrink-0 w-full px-2">
            {/* Línea láser de neón con resplandor */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FCEE0A] to-transparent shadow-[0_0_20px_#FCEE0A]" />

            {/* Contenedor flotante central con indicadores de fase */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 bg-[#070a10]/95 border-2 border-[#FCEE0A] px-3 sm:px-4 py-1.5 font-mono text-xs shadow-[0_0_25px_rgba(252,238,10,0.5)] max-w-5xl w-full"
            >
              {/* Turno e Indicador Oficial */}
              <div className="flex items-center gap-2">
                <span className="text-[#0dfceb] font-black tracking-wider text-xs sm:text-sm">
                  TURNO {gameState.turnNumber}
                </span>

                {/* Botón Guía de Fases oficial */}
                <button
                  type="button"
                  onClick={() => setShowTurnGuideModal(true)}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-2 py-0.5 bg-[#0dfceb]/10 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb]/50 text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                  title="Ver infografía oficial de cómo funciona un turno (Rules 8.1–8.18)"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">CÓMO FUNCIONA UN TURNO</span>
                </button>
              </div>

              {/* Stepper Oficial de Fases: 1. START PHASE -> 2. MAIN PHASE -> 3. END */}
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] font-bold">
                {/* 1. START PHASE */}
                <div
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    gameState.pendingGigRoll || gameState.phase === 'START_GIG_SELECT'
                      ? 'bg-[#FCEE0A] text-black font-black animate-pulse shadow-[0_0_10px_#FCEE0A]'
                      : 'bg-black border border-[#0dfceb]/30 text-gray-400'
                  }`}
                  title="Paso 1 a 5 de Fase de Inicio: 1. Win check (7+ Gigs) -> 2. Triggers -> 3. Ready cartas -> 4. Robar -> 5. Rodar dado del Fixer"
                >
                  <span>{gameState.pendingGigRoll ? '⏳ 1. INICIO (RODAR DADO)' : '✓ 1. INICIO'}</span>
                </div>

                <span className="text-gray-600">➔</span>

                {/* 2. MAIN PHASE */}
                <div
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    isMyTurn && !gameState.pendingGigRoll
                      ? 'bg-[#0dfceb] text-black font-black shadow-[0_0_15px_#0dfceb]'
                      : 'bg-black border border-gray-800 text-gray-500'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>2. FASE PRINCIPAL</span>
                </div>

                {/* Chips tácticos de acciones en tiempo real (según la infografía oficial) */}
                {isMyTurn && !gameState.pendingGigRoll && (
                  <div className="hidden xl:flex items-center gap-1 text-[9px]">
                    {/* Sell for Turn */}
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        p.hasSoldThisTurn
                          ? 'border-gray-800 bg-black/60 text-gray-500'
                          : 'border-[#FCEE0A]/60 bg-[#FCEE0A]/10 text-[#FCEE0A]'
                      }`}
                      title={p.hasSoldThisTurn ? 'Ya has vendido una carta este turno' : 'Venta de carta a Eddies disponible (1 vez por turno)'}
                    >
                      💰 VENTA: {p.hasSoldThisTurn ? '✓ USADO' : '1/1'}
                    </span>

                    {/* Call a Legend */}
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        p.hasCalledLegendThisTurn
                          ? 'border-gray-800 bg-black/60 text-gray-500'
                          : 'border-[#0dfceb]/60 bg-[#0dfceb]/10 text-[#0dfceb]'
                      }`}
                      title={p.hasCalledLegendThisTurn ? 'Ya has llamado a una leyenda este turno' : 'Llamar a una leyenda disponible (1 €$, 1 vez por turno)'}
                    >
                      👑 CALL: {p.hasCalledLegendThisTurn ? '✓ USADO' : '1 €$'}
                    </span>

                    {/* Attack tracker */}
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        selectedFieldUnit
                          ? 'border-[#FF003C] bg-[#FF003C]/20 text-[#FF003C] animate-pulse font-black'
                          : 'border-gray-800 bg-black/60 text-gray-400'
                      }`}
                    >
                      ⚔️ {selectedFieldUnit ? `ATACANDO: ${selectedFieldUnit.name}` : 'ATAQUE (1 A LA VEZ)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de Asaltar Gigs o Acciones Rápidas */}
              <div className="flex items-center gap-2">
                {selectedFieldUnit && !selectedFieldUnit.isSpent && !selectedFieldUnit.isLagging && (() => {
                  const gigsToSteal = calculateGigsToSteal(selectedFieldUnit.currentPower);
                  const hasGigs = bot.gigs.length > 0;

                  return (
                    <button
                      type="button"
                      disabled={!hasGigs}
                      onClick={() => {
                        if (gigsToSteal <= 0) {
                          handlePlayerAttack('GIGS', null, []);
                        } else if (bot.gigs.length > 1) {
                          setPendingGigTheft({
                            countToSteal: Math.min(gigsToSteal, bot.gigs.length),
                            selectedDice: [],
                            attackerUnit: selectedFieldUnit
                          });
                        } else {
                          handlePlayerAttack('GIGS', null, [bot.gigs[0].die.toLowerCase()]);
                        }
                      }}
                      style={{ clipPath: CYBER_BUTTON }}
                      className="px-3 py-1 bg-[#FF003C] hover:bg-[#FCEE0A] hover:text-[#070a10] text-white font-black text-xs uppercase animate-pulse cursor-pointer shadow-[0_0_20px_rgba(255,0,60,0.85)] transition-colors disabled:opacity-40"
                      title={
                        !hasGigs
                          ? 'El rival no tiene Gigs para robar'
                          : gigsToSteal === 0
                          ? 'Robará 0 Gigs (Poder 0 según reglas oficiales), pero ejecutará su habilidad ATTACK antes de la reacción'
                          : `Robarás ${gigsToSteal} Gig(s) según tu poder de ${selectedFieldUnit.currentPower}`
                      }
                    >
                      {gigsToSteal > 0
                        ? `⚡ ¡ASALTAR GIGS (${gigsToSteal} ${gigsToSteal === 1 ? 'GIG' : 'GIGS'})!`
                        : `⚡ ¡ASALTAR GIGS (0 GIGS)!`}
                    </button>
                  );
                })()}

                {/* Si no hay unidad seleccionada, acceso directo a terminar turno */}
                {isMyTurn && !selectedFieldUnit && !gameState.pendingGigRoll && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHandCard(null);
                      setSelectedFieldUnit(null);
                      setHistory([]);
                      passTurn(gameState);
                      setGameState({ ...gameState });
                    }}
                    style={{ clipPath: CYBER_BUTTON }}
                    className="px-2.5 sm:px-3 py-1 bg-[#FCEE0A] hover:bg-[#0dfceb] text-black font-black text-[10px] sm:text-xs uppercase transition-all shadow-[0_0_10px_rgba(252,238,10,0.4)] cursor-pointer flex items-center gap-1"
                    title="Terminar turno (Limpia Lag y efectos de turno)"
                  >
                    <span>TERMINAR TURNO</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ===============================================================
              3. SECCIÓN INFERIOR: TAPETE DEL JUGADOR (TÚ) — MODO ESPEJO
              - Frontline: Campo de Batalla Jugador (cartas grandes con hover preview)
              - Barra de Gigs del Jugador con dados activos y Street Cred
              - Backline: Leyendas (3 slots a la izquierda) + Zona de Eddies (a la derecha)
              - Columna Derecha: Deck (arriba) y Trash (abajo)
             =============================================================== */}
          <div className="flex gap-2 sm:gap-3 w-full items-stretch">
            {/* 3.A ZONA CENTRAL DEL JUGADOR: FRONTLINE (CAMPO) -> GIGS -> BACKLINE (LEYENDAS + EDDIES) */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
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
                className={`flex-1 rounded-2xl border transition-all p-2.5 sm:p-3 min-h-[140px] sm:min-h-[160px] flex items-center relative overflow-x-auto ${
                  isDragOverField
                    ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_35px_rgba(13,252,235,0.45)]'
                    : 'border-[#0dfceb]/30 bg-[#060b14]/80'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                  {p.field.map((unit) => {
                    const isSelected = selectedFieldUnit?.instanceId === unit.instanceId;
                    const canAttack = isMyTurn && !unit.isSpent && !unit.isLagging;
                    const isEligibleBlocker = Boolean(
                      gameState.pendingReaction &&
                      gameState.pendingReaction.attackerPlayerKey === 'bot' &&
                      !unit.isSpent &&
                      !unit.isLagging &&
                      hasKeyword(unit, 'Blocker')
                    );
                    const isCurrentBlocker = Boolean(
                      gameState.pendingReaction &&
                      gameState.pendingReaction.blockerUnitId === unit.instanceId
                    );

                    return (
                      <div
                        key={unit.instanceId}
                        onMouseEnter={() => {
                          setHoveredCard(unit);
                          setPreviewCard(unit);
                        }}
                        onMouseLeave={() => setHoveredCard(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const draggedCardId = e.dataTransfer.getData('text/plain');
                          if (draggedCardId) {
                            handlePlayCard(draggedCardId, unit.instanceId);
                          }
                        }}
                        className={`transition-all duration-300 flex flex-col items-center justify-center shrink-0 ${
                          unit.isSpent
                            ? 'w-32 sm:w-36 md:w-40 h-20 sm:h-24 md:h-28 my-1'
                            : 'w-20 sm:w-24 md:w-28 h-28 sm:h-34 md:h-38'
                        }`}
                      >
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            boxShadow: isCurrentBlocker
                              ? '0 0 30px rgba(13, 252, 235, 0.95), inset 0 0 15px rgba(13, 252, 235, 0.4)'
                              : isEligibleBlocker
                              ? [
                                  '0 0 10px rgba(13, 252, 235, 0.5)',
                                  '0 0 25px rgba(13, 252, 235, 0.95)',
                                  '0 0 10px rgba(13, 252, 235, 0.5)'
                                ]
                              : isSelected
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
                              repeat: (canAttack && !isSelected) || isEligibleBlocker ? Infinity : 0,
                              duration: 1.8,
                              ease: 'easeInOut'
                            }
                          }}
                          whileHover={{ scale: canAttack || isEligibleBlocker ? 1.08 : 1.03, y: -3 }}
                          onClick={() => {
                            if (gameState.pendingReaction && gameState.pendingReaction.attackerPlayerKey === 'bot') {
                              if (isEligibleBlocker || isCurrentBlocker) {
                                handleSelectBlocker(unit.instanceId);
                                return;
                              }
                            }
                            if (canAttack) {
                              setSelectedFieldUnit(isSelected ? null : unit);
                            } else {
                              setInspectedCard(unit);
                            }
                          }}
                          style={{ clipPath: CYBER_CARD_CLIP }}
                          className={`w-20 sm:w-24 md:w-28 h-28 sm:h-34 md:h-38 bg-black border-2 transition-transform duration-300 cursor-pointer flex flex-col justify-between relative shadow-xl ${
                            isCurrentBlocker
                              ? 'border-[#0dfceb] ring-4 ring-[#0dfceb] -translate-y-2 scale-105'
                              : isEligibleBlocker
                              ? 'border-[#0dfceb] animate-pulse hover:border-white'
                              : isSelected
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
                            {isCurrentBlocker && (
                              <span className="px-1 py-0.5 bg-[#0dfceb] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow animate-bounce">
                                🛡️ BLOQUEANDO
                              </span>
                            )}
                            {isEligibleBlocker && !isCurrentBlocker && (
                              <span className="px-1 py-0.5 bg-[#0dfceb] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow">
                                🛡️ CLIC BLOQUEO
                              </span>
                            )}
                            {hasKeyword(unit, 'Blocker') && !isCurrentBlocker && !isEligibleBlocker && (
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

                          {/* Badge de Gear del Jugador */}
                          {unit.gear && unit.gear.length > 0 && (
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#FCEE0A] text-black font-mono font-black text-[7px] sm:text-[8px] uppercase shadow z-10 flex items-center gap-0.5">
                              <span>🔧</span>
                              <span>{unit.gear.length}</span>
                            </div>
                          )}

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

                        {/* GEARS EQUIPADOS AL JUGADOR (Sobresaliendo por debajo de la unidad) */}
                        {unit.gear && unit.gear.length > 0 && (
                          <div className="w-full flex flex-col items-center -mt-2 z-0">
                            {unit.gear.map((g, gIdx) => (
                              <div
                                key={g.instanceId || gIdx}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setHoveredCard(g);
                                  setPreviewCard(g);
                                }}
                                onMouseLeave={() => setHoveredCard(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedCard(g);
                                }}
                                style={{ clipPath: CYBER_CARD_CLIP }}
                                className="w-[92%] h-6 sm:h-7 bg-[#070a10] border border-[#FCEE0A] flex items-center justify-between px-1.5 py-0.5 cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.8)] hover:border-[#0dfceb] transition-all -mt-1 group"
                                title={`Gear equipado: ${g.name} (${g.power || '+Fuerza'}) - Clic para ver`}
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[7px] sm:text-[8px] text-[#FCEE0A] group-hover:text-white truncate font-bold">
                                    🔧 {g.name}
                                  </span>
                                </div>
                                <span className="text-[7px] sm:text-[8px] font-black text-[#0dfceb] shrink-0">
                                  {g.powerVal || g.power || 'GEAR'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Slots vacíos de cartas (diseño idéntico al playmat de referencia) */}
                  {Array.from({ length: Math.max(0, 4 - p.field.length) }).map((_, slotIdx) => (
                    <div
                      key={`p-slot-${slotIdx}`}
                      className="w-20 sm:w-24 md:w-28 h-28 sm:h-34 md:h-38 rounded-xl border border-[#0dfceb]/20 bg-black/25 flex items-center justify-center pointer-events-none shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* BARRA DE GIGS DEL JUGADOR (DADOS ACTIVOS Y STREET CRED) */}
              <div className="px-3 py-1 rounded-xl bg-[#070a10] border border-[#0dfceb]/35 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#0dfceb] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0dfceb] animate-pulse" />
                    <span>TUS GIGS ({p.gigs.length}/7):</span>
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 hidden sm:inline">
                    {p.gigs.length >= 7
                      ? '¡7 GIGS ALCANZADOS! ¡VICTORIA!'
                      : `Consigue ${7 - p.gigs.length} más para ganar la partida`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {p.gigs.length === 0 ? (
                    <span className="text-[10px] font-mono text-gray-500 italic">
                      Sin Gigs en juego aún (tira un dado al inicio del turno)
                    </span>
                  ) : (
                    p.gigs.map((gig, idx) => (
                      <div
                        key={idx}
                        className="transition-transform hover:scale-110"
                        title={`Dado ${gig.die.toUpperCase()} (Valor: ${gig.value})${gig.stolenFrom ? ' - ¡Robado al Rival!' : ''}`}
                      >
                        <PolyhedralDie
                          type={gig.die.toLowerCase()}
                          value={gig.value}
                          isWaiting={false}
                          isStolen={Boolean(gig.stolenFrom)}
                          size={26}
                        />
                      </div>
                    ))
                  )}
                  <span className="text-xs font-mono font-black text-[#0dfceb] ml-1.5">
                    ⭐ {playerStreetCred}
                  </span>
                </div>
              </div>

              {/* FILA INFERIOR (BACKLINE): LEYENDAS JUGADOR A LA IZQUIERDA + ZONA DE EDDIES JUGADOR */}
              <div className="h-20 sm:h-24 md:h-28 flex gap-2 items-stretch w-full">
                {/* 1. LEYENDAS JUGADOR (3 SLOTS) A LA IZQUIERDA */}
                <div className={`rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 p-1.5 sm:p-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 ${
                  legendMenuId ? 'relative z-40' : ''
                }`}>
                  {p.legends.map((leg, i) => {
                    const isTurn1Penalty = leg.isSpent && gameState.turnNumber === 1 && i < 2;
                    const isMenuOpen = legendMenuId === leg.instanceId;

                    return (
                      <div
                        key={leg.instanceId || i}
                        data-legend-slot="true"
                        className={`relative flex flex-col items-center ${
                          isMenuOpen ? 'z-50' : ''
                        }`}
                      >
                        {/* VENTANA FLOTANTE PEQUEÑA ENCIMA DE LA LEYENDA (ELECCIÓN HACER CALL O SACAR EDDIE) */}
                        {isMenuOpen && (
                          <div
                            ref={legendMenuRef}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{ clipPath: CYBER_CLIP }}
                            className={`absolute bottom-[calc(100%+8px)] ${
                              i === 0
                                ? 'left-0'
                                : i === 2
                                ? 'right-0'
                                : 'left-1/2 -translate-x-1/2'
                            } z-50 w-56 sm:w-64 bg-[#070a10]/98 border-2 border-[#0dfceb] p-3 shadow-[0_0_35px_rgba(13,252,235,0.7)] backdrop-blur-md font-mono select-none`}
                          >
                            {/* Cabecera del Popover */}
                            <div className="flex items-center justify-between pb-1 mb-2 border-b border-[#0dfceb]/30 text-[9px]">
                              <span className="font-black uppercase text-[#0dfceb] tracking-wider truncate max-w-[140px]">
                                {leg.name || 'LEYENDA'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLegendMenuId(null);
                                }}
                                className="text-gray-400 hover:text-white px-1 font-bold cursor-pointer"
                                title="Cerrar"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Opción 1: HACER CALL // DAR LA VUELTA */}
                            {!leg.isFaceUp && (
                              <button
                                type="button"
                                disabled={p.hasCalledLegendThisTurn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLegendMenuId(null);
                                  handleCallLegendAction(leg.instanceId);
                                }}
                                className={`w-full py-2 px-2.5 mb-1.5 text-left flex items-center justify-between rounded text-[10px] sm:text-[11px] font-black uppercase transition-all ${
                                  p.hasCalledLegendThisTurn
                                    ? 'bg-gray-900 text-gray-500 border border-gray-800 cursor-not-allowed opacity-60'
                                    : availableEddies > 0
                                    ? 'bg-[#0dfceb] text-black border border-[#0dfceb] shadow-[0_0_15px_rgba(13,252,235,0.6)] cursor-pointer hover:bg-white hover:scale-[1.02]'
                                    : 'bg-[#0dfceb]/25 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb]/70 shadow-[0_0_10px_rgba(13,252,235,0.3)] cursor-pointer hover:scale-[1.02]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>👑</span>
                                  <span>HACER CALL (DAR LA VUELTA)</span>
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  availableEddies > 0 ? 'bg-black text-[#0dfceb]' : 'bg-black/60 text-[#0dfceb]'
                                }`}>
                                  1 €$
                                </span>
                              </button>
                            )}

                            {/* Mensaje de límite de 1 Call por turno */}
                            {!leg.isFaceUp && p.hasCalledLegendThisTurn && (
                              <div className="text-[8px] text-[#FF003C] font-mono text-center pb-1">
                                Ya has llamado a 1 Leyenda este turno (límite: 1/turno).
                              </div>
                            )}

                            {/* Opción 2: SACAR EDDIE (si está enderezada) */}
                            {!leg.isSpent && (
                              <button
                                type="button"
                                disabled={isTurn1Penalty}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLegendMenuId(null);
                                  if (isTurn1Penalty) return;
                                  handleToggleLegend(leg.instanceId);
                                }}
                                className={`w-full py-1.5 px-2 text-left flex items-center justify-between rounded text-[10px] font-black uppercase transition-all ${
                                  isTurn1Penalty
                                    ? 'bg-gray-900 text-gray-500 border border-gray-800 cursor-not-allowed'
                                    : 'bg-[#FCEE0A]/20 hover:bg-[#FCEE0A] text-[#FCEE0A] hover:text-black border border-[#FCEE0A]/60 shadow-[0_0_10px_rgba(252,238,10,0.3)] cursor-pointer hover:scale-[1.02]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>💶</span>
                                  <span>SACAR EDDIE</span>
                                </span>
                                <span className="text-[9px] font-bold">+1 €$</span>
                              </button>
                            )}

                            {/* Aviso informativo si tiene penalización de Turno 1 */}
                            {isTurn1Penalty && (
                              <div className="text-[9px] text-gray-400 italic text-center py-1.5 px-2 bg-black/60 rounded border border-gray-800 mb-1 leading-tight">
                                ⚠️ Penalización T1: Comienza girada.<br />
                                <span className="text-[#0dfceb] not-italic font-bold">¡Pero SÍ puedes hacer Call para darle la vuelta!</span>
                              </div>
                            )}

                            {/* Opción 3: Si ya está girada pero aún quedan eddies en reserva: ENDEREZAR */}
                            {leg.isSpent && availableEddies > 0 && !isTurn1Penalty && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLegendMenuId(null);
                                  handleToggleLegend(leg.instanceId);
                                }}
                                className="w-full py-1.5 px-2 text-left flex items-center justify-between rounded text-[10px] font-black uppercase bg-[#0dfceb]/20 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb]/60 cursor-pointer shadow hover:scale-[1.02]"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>🔄</span>
                                  <span>ENDEREZAR</span>
                                </span>
                                <span className="text-[9px] font-bold">-1 €$</span>
                              </button>
                            )}

                            {/* Si está girada y ya fue consumida */}
                            {leg.isSpent && availableEddies === 0 && !isTurn1Penalty && (
                              <div className="text-[9px] text-gray-400 italic text-center py-1 bg-black/60 rounded border border-gray-800 mb-1">
                                Eddie ya consumido en cartas
                              </div>
                            )}

                            {/* Opción 4: Inspeccionar carta en grande */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLegendMenuId(null);
                                setInspectedCard(leg);
                              }}
                              className="w-full mt-1.5 py-1 px-2 text-center text-[9px] font-bold text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors cursor-pointer border border-gray-800 hover:border-gray-600"
                            >
                              🔍 Ver en grande
                            </button>

                            {/* Flecha indicadora hacia la carta */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#070a10] border-r-2 border-b-2 border-[#0dfceb] rotate-45 pointer-events-none" />
                          </div>
                        )}

                        {/* Carta de Leyenda */}
                        <div
                          onMouseEnter={() => {
                            setHoveredCard(leg);
                            setPreviewCard(leg);
                          }}
                          onMouseLeave={() => setHoveredCard(null)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const draggedCardId = e.dataTransfer.getData('text/plain');
                            if (draggedCardId) {
                              handlePlayCard(draggedCardId, leg.instanceId);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredCard(leg);
                            setPreviewCard(leg);
                            if (!isMyTurn) {
                              setInspectedCard(leg);
                              return;
                            }
                            setLegendMenuId((prev) => (prev === leg.instanceId ? null : leg.instanceId));
                          }}
                          className={`w-11 sm:w-13 md:w-15 h-16 sm:h-20 md:h-24 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center relative shadow-md group ${
                            isMenuOpen
                              ? 'border-[#0dfceb] ring-2 ring-[#0dfceb] shadow-[0_0_18px_rgba(13,252,235,0.6)]'
                              : leg.isFaceUp
                              ? leg.isSpent
                                ? 'border-[#FCEE0A]/70 shadow-[0_0_8px_rgba(252,238,10,0.3)]'
                                : 'border-[#FCEE0A] hover:border-[#0dfceb] shadow-[0_0_14px_rgba(252,238,10,0.5)]'
                              : leg.isSpent
                              ? 'border-[#0dfceb]/30 opacity-70 hover:border-[#0dfceb]'
                              : 'border-[#0dfceb]/50 hover:border-[#FCEE0A] shadow-[0_0_8px_rgba(13,252,235,0.2)]'
                          }`}
                          title={
                            isTurn1Penalty
                              ? 'Penalización Turno 1: Esta leyenda empieza gastada por ir primero.'
                              : leg.isSpent
                              ? availableEddies > 0
                                ? 'Leyenda girada (+1 €$ en reserva). Clic para opciones'
                                : 'Leyenda consumida este turno en cartas'
                              : leg.isFaceUp
                              ? `${leg.name} (Clic para opciones: Sacar Eddie o Ver)`
                              : 'Leyenda boca abajo (Clic para opciones: Hacer Call o Sacar Eddie)'
                          }
                        >
                          <div
                            className={`w-full h-full transition-transform duration-500 flex items-center justify-center ${
                              leg.isSpent ? 'rotate-90 scale-75' : ''
                            }`}
                          >
                            <AnimatePresence mode="wait">
                              {leg.isFaceUp ? (
                                <motion.div
                                  key={`p-leg-up-${leg.instanceId}`}
                                  initial={{ rotateY: -90, opacity: 0.7 }}
                                  animate={{ rotateY: 0, opacity: 1 }}
                                  exit={{ rotateY: 90, opacity: 0 }}
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  className="w-full h-full rounded-md overflow-hidden bg-black flex items-center justify-center border border-[#FCEE0A]/60 shadow"
                                >
                                  <img
                                    src={leg.image}
                                    alt={leg.name}
                                    className="w-full h-full object-cover select-none pointer-events-none"
                                  />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key={`p-leg-down-${leg.instanceId}`}
                                  initial={{ rotateY: 90, opacity: 0.7 }}
                                  animate={{ rotateY: 0, opacity: 1 }}
                                  exit={{ rotateY: -90, opacity: 0 }}
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  className="w-full h-full rounded-md overflow-hidden"
                                >
                                  <CyberCardBack isLegend={true} className="w-full h-full" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Indicador elegante de Penalización Turno 1 o Gastada sin tapar la carta */}
                          {leg.isSpent && (
                            <div className="absolute bottom-0.5 left-0.5 z-20 pointer-events-none">
                              <span className="px-1 py-0.2 bg-black/90 border border-[#FCEE0A]/60 text-[#FCEE0A] font-mono font-black text-[6px] sm:text-[7px] uppercase tracking-tighter shadow">
                                {isTurn1Penalty ? 'T1 GIRADA' : 'GIRADA'}
                              </span>
                            </div>
                          )}

                          {/* Badge de Gear del Jugador */}
                          {leg.gear && leg.gear.length > 0 && (
                            <div className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-[#FCEE0A] text-black font-mono font-black text-[6px] sm:text-[7px] uppercase shadow z-10">
                              🔧 {leg.gear.length}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. ZONA DE EDDIES JUGADOR (CON SOPORTE DRAG & DROP Y BADGE EDDIES X/Y Ⓐ) */}
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
                  className={`flex-1 rounded-2xl border transition-all relative flex items-center p-2 sm:p-2.5 overflow-hidden ${
                    isDragOverEddies
                      ? 'border-[#FCEE0A] bg-[#FCEE0A]/15 shadow-[0_0_25px_rgba(252,238,10,0.4)]'
                      : 'border-[#0dfceb]/30 bg-[#060b14]/80'
                  }`}
                >
                  {/* Contenido cuando no hay Eddies vs cuando hay Eddies vendidos */}
                  {p.eddies.length === 0 ? (
                    <div className="text-gray-400 font-mono text-xs sm:text-sm select-none pl-2 sm:pl-3">
                      {isDragOverEddies ? (
                        <span className="text-[#FCEE0A] font-bold animate-pulse">
                          ¡Suelta aquí para vender (+1 €$)!
                        </span>
                      ) : (
                        <span>No Eddies yet.</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5 pr-24 overflow-x-auto w-full">
                      {p.eddies.map((ed, idx) => (
                        <div
                          key={ed.instanceId || idx}
                          onClick={() => handleToggleEddie(ed.instanceId)}
                          className={`transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
                            ed.isSpent ? 'w-16 sm:w-20 h-10 sm:h-12 my-0.5' : 'w-10 sm:w-12 h-14 sm:h-16'
                          }`}
                          title={
                            ed.isSpent
                              ? availableEddies > 0
                                ? 'Eddie girado (+1 €$ en reserva). Clic para enderezar (-1 €$)'
                                : 'Eddie consumido este turno en cartas'
                              : '1 €$ disponible. Haz clic para girar 90° y añadir +1 €$ a Tus Eddies'
                          }
                        >
                          <div
                            className={`w-10 sm:w-12 h-14 sm:h-16 rounded-md overflow-hidden border transition-transform duration-300 relative shadow-md ${
                              ed.isSpent
                                ? availableEddies > 0
                                  ? 'rotate-90 border-[#0dfceb] opacity-80 shadow-[0_0_10px_rgba(13,252,235,0.3)]'
                                  : 'rotate-90 opacity-40 border-gray-800'
                                : 'border-[#0dfceb] hover:border-[#FCEE0A] hover:scale-105 shadow-[0_0_10px_rgba(13,252,235,0.4)]'
                            }`}
                          >
                            <CyberCardBack className="w-full h-full" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span
                                className={`font-mono font-black text-[8px] px-1 bg-black/90 ${
                                  ed.isSpent
                                    ? availableEddies > 0
                                      ? '-rotate-90 text-[#0dfceb]'
                                      : '-rotate-90 text-gray-500'
                                    : 'text-[#FCEE0A]'
                                }`}
                              >
                                {ed.isSpent ? (availableEddies > 0 ? '+1 €$' : 'USADO') : 'GIRAR 1€$'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badge inferior derecho: Eddies X/Y Ⓐ exactamente como en la imagen */}
                  <div
                    className="absolute bottom-1.5 right-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#031525]/90 border border-[#00F0FF]/60 text-[#00F0FF] font-mono text-[10px] sm:text-xs font-bold shadow-[0_0_10px_rgba(0,240,255,0.25)] select-none pointer-events-none"
                    title={`${availableEddies} €$ girados listos para gastar`}
                  >
                    <span>Eddies {availableEddies}/{p.eddies.length + p.legends.length}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[#00F0FF] flex items-center justify-center text-[9px] font-black leading-none">Ⓐ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3.B COLUMNA DERECHA DEL JUGADOR: DECK (ARRIBA) Y TRASH (ABAJO) */}
            <div className="flex flex-col gap-1.5 shrink-0 w-16 sm:w-20 md:w-24">
              {/* DECK JUGADOR */}
              <div
                className="flex-1 rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-1.5 relative shadow-md select-none"
                title={`Mazo principal (Deck): ${p.deck.length} cartas restantes`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono text-gray-400 uppercase font-bold mb-0.5">DECK</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.7)]">
                  {p.deck.length}
                </span>
              </div>

              {/* TRASH JUGADOR */}
              <div
                onClick={() => p.trash.length > 0 && setInspectedCard(p.trash[p.trash.length - 1])}
                className="h-16 sm:h-20 rounded-2xl border border-[#0dfceb]/30 bg-[#060b14]/80 flex flex-col items-center justify-center p-1 relative shadow-md select-none cursor-pointer hover:border-[#FCEE0A]"
                title={`Descartes (Trash): ${p.trash.length} cartas (clic para inspeccionar última)`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono text-gray-400 uppercase font-bold mb-0.5">TRASH</span>
                <span className="text-base sm:text-lg font-black font-mono text-gray-400">
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
              TU MANO ({p.hand.length} CARTAS) • EDDIES GIRADOS: <strong className={`font-mono ${availableEddies > 0 ? 'text-[#0dfceb]' : 'text-gray-400'}`}>{availableEddies} €$</strong>
              {unspentEddiesCount + unspentLegendsCount > 0 && (
                <span className="text-[10px] text-gray-500 ml-2">({unspentEddiesCount + unspentLegendsCount} disponibles para girar)</span>
              )}
            </span>

            {selectedHandCard && (
              <div className="flex items-center gap-2">
                <span className="text-[#FCEE0A] font-bold text-xs truncate max-w-[200px]">
                  {selectedHandCard.name} ({selectedHandCard.parsedCost} €$)
                </span>

                {(() => {
                  const cardType = getCardType(selectedHandCard);
                  const isProgram = cardType === 'PROGRAM';
                  const isGear = cardType === 'GEAR';
                  const gearTarget = selectedFieldUnit?.instanceId || (p.field.length > 0 ? p.field[0].instanceId : (p.legends[0]?.instanceId || null));
                  const cardCost = selectedHandCard.parsedCost || 0;
                  const canAfford = availableEddies >= cardCost;
                  const missingEddies = Math.max(0, cardCost - availableEddies);
                  const canPlay = isMyTurn && canAfford && (!isGear || Boolean(gearTarget));

                  let actionLabel = `JUGAR UNIDAD (${cardCost} €$)`;
                  if (!canAfford) {
                    actionLabel = `FALTAN ${missingEddies} €$ (GIRAR MÁS)`;
                  } else if (isProgram) {
                    actionLabel = `LANZAR PROGRAMA (${cardCost} €$)`;
                  } else if (isGear) {
                    if (selectedFieldUnit) {
                      actionLabel = `EQUIPAR A ${selectedFieldUnit.name.split(' ')[0]} (${cardCost} €$)`;
                    } else if (gearTarget) {
                      actionLabel = `EQUIPAR GEAR (${cardCost} €$)`;
                    } else {
                      actionLabel = 'GEAR (SIN OBJETIVO)';
                    }
                  }

                  return (
                    <button
                      type="button"
                      disabled={isGear && canAfford && !gearTarget}
                      onClick={() => {
                        if (!canAfford) {
                          setHolocall({
                            title: 'EDDIES INSUFICIENTES',
                            message: `¡Atención, Netrunner! Necesitas ${cardCost} €$ para jugar "${selectedHandCard.name}", pero solo tienes ${availableEddies} €$ girados. Te faltan ${missingEddies} €$. Haz clic en tus cartas de la Zona de Eddies o Leyendas para girarlas antes de jugar.`,
                            characterName: 'VIKTOR // RIPPERDOC',
                            missingEddies,
                            type: 'warning'
                          });
                          return;
                        }
                        handlePlayCard(selectedHandCard.instanceId, isGear ? gearTarget : null);
                      }}
                      style={{ clipPath: CYBER_BUTTON }}
                      className={`px-3 py-1 font-black text-xs uppercase cursor-pointer transition-all shadow-md ${
                        !canAfford
                          ? 'bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] hover:bg-[#FF003C] hover:text-white animate-pulse'
                          : isProgram
                          ? 'bg-[#0dfceb] hover:bg-white text-[#070a10] shadow-[0_0_15px_rgba(13,252,235,0.4)]'
                          : isGear
                          ? 'bg-[#FCEE0A] hover:bg-white text-[#070a10] shadow-[0_0_15px_rgba(252,238,10,0.4)]'
                          : 'bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10] shadow-[0_0_15px_rgba(13,252,235,0.4)]'
                      }`}
                      title={
                        !canAfford
                          ? `Te faltan ${missingEddies} €$. Haz clic para ver detalles o gira cartas de Eddies/Leyendas`
                          : isProgram
                          ? 'Lanza este programa: se descuentan los Eddies girados y va a Trash'
                          : isGear
                          ? 'Equipa este Gear al objetivo seleccionado'
                          : 'Despliega esta Unidad en el campo de batalla'
                      }
                    >
                      {actionLabel}
                    </button>
                  );
                })()}

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
              [CARRUSEL DE MANO IZQUIERDA/CENTRO] [PILAS DE MAZO Y TRASH A LA DERECHA] [BOTÓN TERMINAR TURNO DERECHA] */}
          <div className="flex items-center justify-between gap-3">
            {/* IZQUIERDA/CENTRO: Carrusel de cartas de la mano con Framer Motion (hover lift) */}
            <div className="flex-1 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-1 px-2">
              {p.hand.map((card) => {
                const isSelected = selectedHandCard?.instanceId === card.instanceId;
                const canAfford = availableEddies >= (card.parsedCost || 0);
                const isJustDrawn = Boolean(card.isJustDrawn);

                return (
                  <motion.div
                    key={card.instanceId}
                    draggable={isMyTurn}
                    onDragStart={(e) => {
                      if (card.isJustDrawn) delete card.isJustDrawn;
                      e.dataTransfer.setData('text/plain', card.instanceId);
                      setSelectedHandCard(card);
                    }}
                    whileHover={{ y: -16, scale: 1.15, zIndex: 40 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => {
                      setHoveredCard(card);
                      setPreviewCard(card);
                      if (card.isJustDrawn) {
                        delete card.isJustDrawn;
                        setGameState((prev) => ({ ...prev }));
                      }
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => {
                      setSelectedHandCard(isSelected ? null : card);
                      setPreviewCard(card);
                      if (card.isJustDrawn) {
                        delete card.isJustDrawn;
                        setGameState((prev) => ({ ...prev }));
                      }
                    }}
                    style={{ clipPath: CYBER_CARD_CLIP }}
                    className={`w-14 sm:w-18 md:w-22 h-20 sm:h-26 md:h-30 bg-black border transition-all duration-150 cursor-grab active:cursor-grabbing shrink-0 relative shadow-lg ${
                      isSelected
                        ? 'border-[#FCEE0A] shadow-[0_0_25px_rgba(252,238,10,0.85)] -translate-y-4 scale-110 z-30'
                        : isJustDrawn
                        ? 'border-2 border-[#0dfceb] shadow-[0_0_22px_rgba(13,252,235,0.95)] animate-pulse z-20'
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

                    {/* Badge destacado de carta recién robada */}
                    {isJustDrawn && (
                      <div className="absolute top-0 inset-x-0 bg-[#0dfceb] text-[#070a10] text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-center py-0.5 z-20 shadow-[0_0_10px_#0dfceb] animate-bounce">
                        ⚡ ROBADA
                      </div>
                    )}

                    {/* Distintivo de Carta Vendible oficial (Programas, Gears y MT0D12 Flathead) */}
                    {isCardVendible(card) && (
                      <div className={`absolute ${isJustDrawn ? 'top-3.5' : 'top-0.5'} right-0.5 px-1 bg-[#FCEE0A] text-[#070a10] text-[7px] font-black uppercase tracking-tighter shadow z-10`}>
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

            {/* LADO DERECHO: Pilas de Mazo (deck) y Descartes (trash) + Botón de Terminar Turno */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
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
              onClick={() => {
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(CP_SIM_STORAGE_KEY);
                  }
                } catch {}
                handleStartGame(selectedPlayerDeckIdx, selectedBotDeckIdx, true);
              }}
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

      {/* 5.5. MODAL TÁCTICO: FASE DE RESPUESTA DEL JUGADOR ANTE ATAQUE DEL RIVAL */}
      {gameState?.pendingReaction && gameState.pendingReaction.attackerPlayerKey === 'bot' && (() => {
        const reaction = gameState.pendingReaction;
        // REGLA OFICIAL: Las unidades con Blocker pueden bloquear aunque tengan Lag (solo deben estar Ready/no giradas)
        const readyBlockers = (p.field || []).filter(
          (u) => !u.isSpent && hasKeyword(u, 'Blocker')
        );
        const currentBlocker = (p.field || []).find((u) => u.instanceId === reaction.blockerUnitId);
        const uncalledLegends = (p.legends || []).filter((l) => !l.isFaceUp);
        const faceUpLegends = (p.legends || []).filter((l) => l.isFaceUp);
        const totalEddies = getTotalAvailableEddies(p);
        const quickCards = (p.hand || []).filter(
          (c) => hasKeyword(c, 'Quick') && (c.parsedCost || 0) <= totalEddies
        );

        return (
          <div className="fixed inset-0 z-45 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              style={{ clipPath: CYBER_CLIP }}
              className="max-w-2xl w-full bg-[#070a10]/98 border-2 border-[#FF003C] p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[0_0_60px_rgba(255,0,60,0.5)] relative max-h-[90vh] overflow-y-auto cyber-scrollbar"
            >
              {/* Cabecera de Alerta */}
              <div className="flex items-center justify-between border-b border-[#FF003C]/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#FF003C] rounded-full animate-ping" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#FF003C]">
                    // COMBATE OFICIAL // FASE 2: FASE DE REACCIÓN //
                  </span>
                </div>
                <span className="text-[10px] text-[#FCEE0A] uppercase font-bold tracking-widest">
                  TU TURNO DE RESPUESTA
                </span>
              </div>

              {/* Resumen del Ataque Entrante */}
              <div className="bg-[#000000] border border-[#FF003C]/60 p-3 rounded flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                {/* Atacante (Rival) */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-22 rounded border-2 border-[#FF003C] overflow-hidden shrink-0 bg-black shadow-[0_0_15px_rgba(255,0,60,0.4)]">
                    <img
                      src={reaction.attackerImage}
                      alt={reaction.attackerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#FF003C] font-black block uppercase tracking-wider">
                      ⚔️ FASE 1: ATACANTE RIVAL (SPENT)
                    </span>
                    <span className="text-sm sm:text-base font-black text-white uppercase block">
                      {reaction.attackerName}
                    </span>
                    <span className="text-xs font-mono font-black text-[#FCEE0A] block">
                      ⚡ FUERZA: {reaction.attackerPower}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-xl font-black text-[#FF003C] animate-pulse">VS</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">
                    {reaction.targetType === 'GIGS' ? 'ASALTO A TUS GIGS' : 'ATAQUE A TU UNIDAD'}
                  </span>
                </div>

                {/* Objetivo o Blocker asignado */}
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">
                    {currentBlocker ? '🛡️ INTERCEPTANDO CON (BLOCKER)' : '🎯 OBJETIVO DECLARADO'}
                  </span>
                  <span className={`text-sm sm:text-base font-black uppercase block ${currentBlocker ? 'text-[#0dfceb]' : 'text-white'}`}>
                    {currentBlocker ? currentBlocker.name : reaction.targetName}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-300 block">
                    {currentBlocker
                      ? `⚡ FUERZA: ${currentBlocker.currentPower}`
                      : reaction.targetType === 'GIGS'
                      ? `⚠️ Robará ${calculateGigsToSteal(reaction.attackerPower)} Gig(s)`
                      : `⚡ FUERZA: ${reaction.targetPower}`}
                  </span>
                </div>
              </div>

              {/* Panel de Opciones Tácticas de Respuesta */}
              <div className="space-y-2.5">
                {/* Opción 1: Interceptar con Blocker */}
                <div className="bg-[#000000]/80 border border-gray-800 p-2.5 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-[#0dfceb] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#0dfceb]" />
                      1. INTERCEPTAR CON BLOCKER (PUEDEN BLOQUEAR AUNQUE TENGAN LAG)
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {currentBlocker ? '1 UNIDAD ASIGNADA' : `${readyBlockers.length} DISPONIBLES`}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 mb-1.5">
                    Al interceptar con un Bloqueador, el ataque se convierte en una lucha contra él y <strong className="text-[#0dfceb]">NO se roba ningún Gig</strong> aunque el atacante gane.
                  </p>

                  {readyBlockers.length === 0 ? (
                    <span className="text-[10px] text-gray-500 italic block">
                      No tienes unidades listas con la habilidad Blocker para interceptar.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {readyBlockers.map((b) => {
                        const isAssigned = reaction.blockerUnitId === b.instanceId;
                        return (
                          <button
                            key={b.instanceId}
                            type="button"
                            onClick={() => handleSelectBlocker(b.instanceId)}
                            style={{ clipPath: CYBER_BUTTON }}
                            className={`px-3 py-1.5 text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                              isAssigned
                                ? 'bg-[#0dfceb] text-black shadow-[0_0_15px_#0dfceb]'
                                : 'bg-[#070a10] border border-[#0dfceb]/50 text-[#0dfceb] hover:border-[#0dfceb]'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>{b.name} (⚡{b.currentPower})</span>
                            <span className="text-[9px] underline">
                              {isAssigned ? '[DESASIGNAR]' : '[BLOQUEAR]'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Opción 2: Llamar a una Leyenda */}
                <div className="bg-[#000000]/80 border border-gray-800 p-2.5 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase text-[#FCEE0A] flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#FCEE0A]" />
                      2. LLAMAR A UNA LEYENDA (COSTE: 1 €$)
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {p.hasCalledLegendThisTurn ? 'YA LLAMASTE ESTE TURNO' : `DISPONES DE ${totalEddies} €$`}
                    </span>
                  </div>

                  {p.hasCalledLegendThisTurn ? (
                    <span className="text-[10px] text-gray-500 italic block">
                      Ya has llamado a una Leyenda este turno (límite oficial: 1 por turno).
                    </span>
                  ) : uncalledLegends.length === 0 ? (
                    <span className="text-[10px] text-gray-500 italic block">
                      No tienes más Leyendas boca abajo en tu zona de mando.
                    </span>
                  ) : totalEddies < 1 ? (
                    <span className="text-[10px] text-[#FF003C] italic block">
                      Necesitas 1 €$ para llamar a una Leyenda.
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 my-2">
                      {uncalledLegends.map((leg) => {
                        const slotIdx = (p.legends || []).findIndex((l) => l.instanceId === leg.instanceId) + 1;
                        const rules = getCardRulesText(leg);
                        const hasCall = /CALL\b/i.test(rules);

                        return (
                          <div
                            key={leg.instanceId}
                            className="bg-[#070a10] border border-[#FCEE0A]/40 hover:border-[#FCEE0A] p-2 rounded flex flex-col justify-between transition-all shadow-[0_0_12px_rgba(252,238,10,0.15)] group"
                          >
                            <div>
                              <div className="flex items-start gap-2 mb-1.5">
                                <div className="w-12 h-16 rounded border border-[#FCEE0A] overflow-hidden shrink-0 bg-black shadow">
                                  <img
                                    src={leg.image || leg.img}
                                    alt={leg.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] px-1 bg-[#FCEE0A] text-black font-black uppercase rounded">
                                      SLOT #{slotIdx}
                                    </span>
                                    <span className="text-[8px] text-gray-400 font-mono">
                                      {leg.aspect || 'NEUTRAL'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-black text-white uppercase block truncate mt-0.5" title={leg.name}>
                                    {leg.name}
                                  </span>
                                  {hasCall ? (
                                    <span className="text-[8px] font-bold text-[#FCEE0A] animate-pulse block">
                                      ⚡ TIENE DISPARADOR CALL
                                    </span>
                                  ) : (
                                    <span className="text-[8px] text-[#0dfceb] block">
                                      👑 HABILIDAD PASIVA
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="bg-black/80 border border-gray-800 p-1 rounded text-[8px] text-gray-300 font-mono mb-2 max-h-16 overflow-y-auto cyber-scrollbar leading-tight">
                                {rules || 'Sin texto de reglas.'}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={p.hasCalledLegendThisTurn || totalEddies < 1}
                              onClick={() => handleReactionCallLegend(leg.instanceId)}
                              style={{ clipPath: CYBER_BUTTON }}
                              className={`w-full py-1.5 px-2 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow ${
                                p.hasCalledLegendThisTurn || totalEddies < 1
                                  ? 'bg-gray-900 text-gray-500 border border-gray-800 cursor-not-allowed'
                                  : 'bg-[#FCEE0A] hover:bg-white text-black shadow-[0_0_15px_rgba(252,238,10,0.6)]'
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>LLAMAR (1 €$)</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {faceUpLegends.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap items-center gap-1.5 text-[9px] text-gray-400">
                      <span className="font-bold text-gray-500 uppercase">🔒 Ya boca arriba (no se pueden volver a llamar):</span>
                      {faceUpLegends.map((l) => (
                        <span key={l.instanceId} className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 rounded">
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opción 3: Jugar Cartas con Quick */}
                <div className="bg-[#000000]/80 border border-gray-800 p-2.5 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase text-[#0dfceb] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#0dfceb]" />
                      3. JUGAR CARTA CON QUICK
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {quickCards.length} CARTAS QUICK PAGABLES
                    </span>
                  </div>

                  {quickCards.length === 0 ? (
                    <span className="text-[10px] text-gray-500 italic block">
                      No tienes cartas con palabra clave "Quick" pagables en la mano.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {quickCards.map((qc) => (
                        <button
                          key={qc.instanceId}
                          type="button"
                          onClick={() => handleReactionPlayQuickCard(qc.instanceId)}
                          style={{ clipPath: CYBER_BUTTON }}
                          className="px-3 py-1 bg-[#0dfceb]/15 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb]/60 text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Jugar {qc.name} ({qc.parsedCost || 0} €$)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Resolver Combate / Pasar Respuesta */}
              <div className="pt-2 border-t border-[#FF003C]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[9px] text-gray-400">
                  {currentBlocker ? (
                    <span className="text-[#0dfceb] font-bold">
                      ✓ El ataque será desviado hacia "{currentBlocker.name}". ¡No se robarán Gigs!
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Sin bloqueo: el ataque resolverá directamente contra el objetivo.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResolveReactionCombat}
                  style={{ clipPath: CYBER_BUTTON }}
                  className={`w-full sm:w-auto px-6 py-2.5 font-black text-xs uppercase cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 ${
                    currentBlocker
                      ? 'bg-[#0dfceb] hover:bg-white text-black shadow-[0_0_20px_#0dfceb]'
                      : 'bg-[#FF003C] hover:bg-white text-white hover:text-black shadow-[0_0_20px_#FF003C]'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {currentBlocker
                      ? `INTERCEPTAR Y RESOLVER COMBATE (FASE 3)`
                      : reaction.targetType === 'GIGS'
                      ? `PASAR RESPUESTA Y RESOLVER ROBO DE GIGS (FASE 4)`
                      : `PASAR RESPUESTA Y RESOLVER COMBATE (FASE 3)`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* 5.6. MODAL INTERACTIVO DE ELECCIÓN DE CARTAS (TRIGGERS: SKETCHY RIPPER, VIKTOR VEKTOR, THREE MOUTHS, ETC.) */}
      {gameState?.pendingCardChoice && (() => {
        const choice = gameState.pendingCardChoice;
        const eligibleIds = new Set(choice.eligibleIds || []);
        const hasEligible = eligibleIds.size > 0;
        const selectedIds = choice.selectedIds || [];

        return (
          <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              style={{ clipPath: CYBER_CLIP }}
              className="max-w-2xl w-full bg-[#070a10]/98 border-2 border-[#0dfceb] p-4 sm:p-5 space-y-4 shadow-[0_0_60px_rgba(13,252,235,0.45)] relative max-h-[90vh] overflow-y-auto cyber-scrollbar"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-[#0dfceb]/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#0dfceb] rounded-full animate-ping" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0dfceb]">
                    {choice.title}
                  </span>
                </div>
                <span className="text-[10px] text-[#FCEE0A] uppercase font-bold tracking-widest">
                  ELECCIÓN INTERACTIVA
                </span>
              </div>

              {/* Instrucciones */}
              <div className="bg-[#000000] border border-[#0dfceb]/40 p-3 rounded flex items-center gap-3">
                {choice.sourceCardImage && (
                  <div className="w-12 h-16 rounded border border-[#0dfceb] overflow-hidden shrink-0 bg-black">
                    <img src={choice.sourceCardImage} alt={choice.sourceCardName} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-white leading-relaxed">
                    {choice.prompt}
                  </p>
                  <span className="text-[9px] text-[#0dfceb] block mt-1">
                    Criterio: <strong className="text-[#FCEE0A]">{choice.filterDescription || 'Requisito de carta'}</strong> • Máx: {choice.maxChoices}
                  </span>
                </div>
              </div>

              {/* Grid de cartas reveladas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2 justify-items-center">
                {(choice.cards || []).map((card) => {
                  const isEligible = eligibleIds.has(card.instanceId);
                  const isSelected = selectedIds.includes(card.instanceId);

                  return (
                    <div
                      key={card.instanceId}
                      onClick={() => {
                        if (!isEligible) return;
                        let next;
                        if (isSelected) {
                          next = selectedIds.filter((id) => id !== card.instanceId);
                        } else {
                          if (selectedIds.length >= choice.maxChoices) {
                            next = choice.maxChoices === 1 ? [card.instanceId] : selectedIds;
                          } else {
                            next = [...selectedIds, card.instanceId];
                          }
                        }
                        setGameState((prev) => ({
                          ...prev,
                          pendingCardChoice: {
                            ...prev.pendingCardChoice,
                            selectedIds: next
                          }
                        }));
                      }}
                      className={`relative w-28 sm:w-32 aspect-[7/10] rounded overflow-hidden border-2 transition-all duration-200 flex flex-col justify-between ${
                        !isEligible
                          ? 'border-gray-800 opacity-40 cursor-not-allowed grayscale'
                          : isSelected
                          ? 'border-[#0dfceb] ring-2 ring-[#0dfceb] shadow-[0_0_20px_rgba(13,252,235,0.8)] -translate-y-1.5 cursor-pointer'
                          : 'border-gray-700 hover:border-[#0dfceb] cursor-pointer hover:scale-105'
                      }`}
                    >
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />

                      {/* Badge superior */}
                      <div className="absolute top-1 inset-x-1 flex items-center justify-between">
                        <span className="px-1 py-0.2 bg-black/90 text-[7px] text-gray-300 rounded font-black uppercase">
                          {card.officialType || 'CARD'}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 bg-[#0dfceb] text-black font-black text-[9px] rounded-full shadow">
                            ✓ ELEGIDA
                          </span>
                        )}
                        {!isEligible && (
                          <span className="px-1 py-0.2 bg-[#FF003C] text-white text-[7px] font-black uppercase rounded">
                            NO VÁLIDA
                          </span>
                        )}
                      </div>

                      {/* Pie de carta */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/90 p-1 border-t border-gray-800 text-center">
                        <span className="text-[8px] font-bold text-white uppercase truncate block">
                          {card.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón de Confirmación */}
              <div className="pt-2 border-t border-[#0dfceb]/30 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  {selectedIds.length} de {choice.maxChoices} seleccionada(s)
                </span>
                <button
                  type="button"
                  disabled={hasEligible && selectedIds.length === 0}
                  onClick={() => handleResolveCardChoice(selectedIds)}
                  style={{ clipPath: CYBER_BUTTON }}
                  className={`px-5 py-2 font-mono font-black text-xs uppercase transition-all cursor-pointer ${
                    hasEligible && selectedIds.length === 0
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-[#0dfceb] hover:bg-white text-black shadow-[0_0_20px_rgba(13,252,235,0.7)]'
                  }`}
                >
                  {hasEligible && selectedIds.length > 0
                    ? `AÑADIR A LA MANO (${selectedIds.length})`
                    : hasEligible
                    ? 'SELECCIONA UNA CARTA'
                    : 'NO HAY COINCIDENCIAS // CONTINUAR'}
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* 5.7. MODAL INTERACTIVO PARA ELEGIR GIGS A ROBAR DEL RIVAL */}
      {pendingGigTheft && (() => {
        const { countToSteal, selectedDice, attackerUnit } = pendingGigTheft;
        const availableGigs = bot.gigs || [];

        return (
          <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              style={{ clipPath: CYBER_CLIP }}
              className="max-w-xl w-full bg-[#070a10]/98 border-2 border-[#FCEE0A] p-5 space-y-4 shadow-[0_0_60px_rgba(252,238,10,0.5)] relative max-h-[90vh] overflow-y-auto cyber-scrollbar"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-[#FCEE0A]/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#FCEE0A] rounded-full animate-ping" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#FCEE0A]">
                    ⚡ ASALTO A LOS GIGS DEL RIVAL
                  </span>
                </div>
                <span className="text-[10px] text-[#FF003C] uppercase font-bold tracking-widest">
                  FASE DE ROBO
                </span>
              </div>

              {/* Resumen */}
              <div className="bg-[#000000] border border-[#FCEE0A]/40 p-3 rounded flex items-center gap-3">
                <div className="w-12 h-16 rounded border border-[#FF003C] overflow-hidden shrink-0 bg-black">
                  <img src={attackerUnit.image} alt={attackerUnit.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-xs text-white font-bold block uppercase">
                    {attackerUnit.name} (Fuerza {attackerUnit.currentPower})
                  </span>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Según tu poder, puedes arrebatar <strong className="text-[#FCEE0A]">{countToSteal} Gig(s)</strong> al rival.
                  </p>
                  <span className="text-[9px] text-[#0dfceb] block mt-1">
                    Haz clic en los dados que deseas llevarte a tu área ({selectedDice.length}/{countToSteal} seleccionados):
                  </span>
                </div>
              </div>

              {/* Grid de Dados del Rival */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 justify-items-center">
                {availableGigs.map((gig, idx) => {
                  const dieKey = gig.die.toLowerCase();
                  const isSelected = selectedDice.includes(dieKey);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        let next;
                        if (isSelected) {
                          next = selectedDice.filter((d) => d !== dieKey);
                        } else {
                          if (selectedDice.length >= countToSteal) {
                            next = countToSteal === 1 ? [dieKey] : selectedDice;
                          } else {
                            next = [...selectedDice, dieKey];
                          }
                        }
                        setPendingGigTheft((prev) => ({
                          ...prev,
                          selectedDice: next
                        }));
                      }}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer w-full bg-[#000000] ${
                        isSelected
                          ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_20px_rgba(13,252,235,0.7)] scale-105'
                          : 'border-gray-800 hover:border-[#FCEE0A] hover:bg-[#FCEE0A]/5'
                      }`}
                    >
                      <PolyhedralDie
                        type={dieKey}
                        value={gig.value}
                        isWaiting={false}
                        isStolen={Boolean(gig.stolenFrom)}
                        size={38}
                      />
                      <div className="text-center">
                        <span className="text-xs font-black text-white uppercase block">
                          {gig.die.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-[#FCEE0A] font-bold block">
                          VALOR: {gig.value}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        isSelected ? 'bg-[#0dfceb] text-black font-black' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {isSelected ? '✓ SELECCIONADO' : 'ELEGIR'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Botones de acción */}
              <div className="pt-2 border-t border-[#FCEE0A]/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPendingGigTheft(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white font-bold uppercase cursor-pointer"
                >
                  ✕ CANCELAR
                </button>
                <button
                  type="button"
                  disabled={selectedDice.length === 0}
                  onClick={() => {
                    const chosen = [...selectedDice];
                    setPendingGigTheft(null);
                    handlePlayerAttack('GIGS', null, chosen);
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className={`px-5 py-2 font-mono font-black text-xs uppercase transition-all cursor-pointer ${
                    selectedDice.length === 0
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-[#FCEE0A] hover:bg-white text-black shadow-[0_0_20px_rgba(252,238,10,0.8)]'
                  }`}
                >
                  ⚡ ROBAR {selectedDice.length} GIG(S)
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* 6. MODAL DE TRANSMISIÓN / HOLOCALL DE PERSONAJE (AVISOS DE EDDIES Y TRIGGERS) */}
      {holocall && (
        <div
          className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none"
          onClick={() => setHolocall(null)}
        >
          <div
            style={{ clipPath: CYBER_CLIP }}
            className={`max-w-lg w-full bg-[#070a10] border-2 p-6 flex flex-col space-y-4 relative overflow-hidden transition-all ${
              holocall.type === 'warning'
                ? 'border-[#FF003C] shadow-[0_0_50px_rgba(255,0,60,0.45)]'
                : 'border-[#0dfceb] shadow-[0_0_50px_rgba(13,252,235,0.45)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Holocall */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full animate-ping ${
                    holocall.type === 'warning' ? 'bg-[#FF003C]' : 'bg-[#0dfceb]'
                  }`}
                />
                <span
                  className={`text-xs font-black uppercase tracking-widest ${
                    holocall.type === 'warning' ? 'text-[#FF003C]' : 'text-[#0dfceb]'
                  }`}
                >
                  // TRANSMISIÓN KIROSHI ENTRANTE //
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHolocall(null)}
                className="text-gray-500 hover:text-white text-base px-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido Principal con Avatar y Mensaje */}
            <div className="flex items-start gap-4">
              {/* Avatar del Personaje (o fallback Netrunner) */}
              <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded border-2 border-[#0dfceb]/60 bg-black flex items-center justify-center overflow-hidden relative shadow-[0_0_15px_rgba(13,252,235,0.3)]">
                {holocall.characterImage ? (
                  <img
                    src={holocall.characterImage}
                    alt={holocall.characterName || 'Personaje'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0dfceb]/20 to-black text-[#0dfceb]">
                    <User className="w-10 h-10 animate-pulse" />
                    <span className="text-[7px] font-mono uppercase tracking-tighter mt-1 text-gray-400">
                      KIROSHI COMM
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Texto y Diálogo */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#FCEE0A] uppercase tracking-wider">
                    {holocall.characterName || 'VIKTOR // RIPPERDOC'}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">
                    {holocall.title || 'AVISO'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans bg-black/50 p-2.5 rounded border border-gray-900 shadow-inner">
                  "{holocall.message}"
                </p>
              </div>
            </div>

            {/* Botón de Aceptar */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHolocall(null)}
                style={{ clipPath: CYBER_BUTTON }}
                className={`px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-[0_0_15px_rgba(13,252,235,0.4)] ${
                  holocall.type === 'warning'
                    ? 'bg-[#FF003C] hover:bg-white text-white hover:text-black'
                    : 'bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10]'
                }`}
              >
                ENTENDIDO // CONTINUAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.5. MODAL OFICIAL: CÓMO FUNCIONA UN TURNO (HOW A TURN WORKS - RULES 8.1–8.18) */}
      <AnimatePresence>
        {showTurnGuideModal && (
          <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              style={{ clipPath: CYBER_CLIP }}
              className="max-w-4xl w-full bg-[#070a14] border-2 border-[#FCEE0A] p-4 sm:p-6 space-y-4 shadow-[0_0_60px_rgba(252,238,10,0.5)] relative text-white max-h-[92vh] overflow-y-auto"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-[#FCEE0A]/40 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#FCEE0A]" />
                    <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-white">
                      HOW A TURN WORKS // CÓMO FUNCIONA UN TURNO
                    </h2>
                  </div>
                  <p className="text-xs text-gray-400 font-sans">
                    Start Phase steps happen in order. Main Phase actions are optional and in any order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTurnGuideModal(false)}
                  className="w-8 h-8 rounded border border-gray-700 bg-black flex items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido en 2 Columnas Enfrentadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COLUMNA 1: 1. START PHASE */}
                <div className="bg-[#05070e] border border-[#FCEE0A]/60 rounded-lg p-4 space-y-3 relative shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#FCEE0A]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FCEE0A] animate-ping" />
                      <span className="text-sm font-black text-[#FCEE0A] uppercase tracking-wider">
                        1. START PHASE
                      </span>
                    </div>
                    <span className="text-[10px] text-black font-black uppercase bg-[#FCEE0A] px-2 py-0.5 rounded">
                      EN ORDEN (1 A 5)
                    </span>
                  </div>

                  <ol className="space-y-2.5 text-xs text-gray-200">
                    <li className="flex items-start gap-2.5 bg-black/40 p-2 rounded border border-gray-900">
                      <span className="w-5 h-5 rounded-full bg-[#FCEE0A] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <strong className="text-white block font-bold">Check for a win (7+ Gig dice)</strong>
                        <span className="text-[11px] text-gray-400 font-sans">
                          Comprueba victoria automática si controlas 7 o más dados de Gig.
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5 bg-black/40 p-2 rounded border border-gray-900">
                      <span className="w-5 h-5 rounded-full bg-[#FCEE0A] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <strong className="text-white block font-bold">Resolve start-of-turn effects</strong>
                        <span className="text-[11px] text-gray-400 font-sans">
                          Dispara efectos automáticos de inicio (ej. Hanako Arasaka si tienes dados pares).
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5 bg-black/40 p-2 rounded border border-gray-900">
                      <span className="w-5 h-5 rounded-full bg-[#FCEE0A] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <strong className="text-white block font-bold">Ready all your spent cards</strong>
                        <span className="text-[11px] text-gray-400 font-sans">
                          Endereza todas tus cartas gastadas (Eddies, Leyendas y Unidades) y limpia Lag.
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5 bg-black/40 p-2 rounded border border-gray-900">
                      <span className="w-5 h-5 rounded-full bg-[#FCEE0A] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </span>
                      <div>
                        <strong className="text-white block font-bold">Draw 1 card</strong>
                        <span className="text-[11px] text-gray-400 font-sans">
                          Roba 1 carta de tu mazo (pierdes la partida si tu mazo se queda sin cartas).
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2.5 bg-black/40 p-2 rounded border border-gray-900">
                      <span className="w-5 h-5 rounded-full bg-[#FCEE0A] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        5
                      </span>
                      <div>
                        <strong className="text-white block font-bold">Roll in a Gig die from the fixer</strong>
                        <span className="text-[11px] text-gray-400 font-sans">
                          Elige y rueda un dado (D4, D6, D8, D10, D12). <em className="text-[#FCEE0A]">El D20 solo se puede rodar una vez que los otros 5 dados ya están en juego.</em>
                        </span>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* COLUMNA 2: 2. MAIN PHASE */}
                <div className="bg-[#05070e] border border-[#0dfceb]/60 rounded-lg p-4 space-y-3 relative shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#0dfceb]" />
                      <span className="text-sm font-black text-[#0dfceb] uppercase tracking-wider">
                        2. MAIN PHASE
                      </span>
                    </div>
                    <span className="text-[10px] text-black font-black uppercase bg-[#0dfceb] px-2 py-0.5 rounded">
                      OPCIONAL / EN CUALQUIER ORDEN
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-gray-800">
                      <div>
                        <strong className="text-[#FCEE0A] block uppercase font-black text-xs">SELL FOR TURN</strong>
                        <span className="text-[11px] text-gray-300 font-sans">
                          Vender 1 carta de la mano a la zona de Eddies (+1 €$).
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#FCEE0A] bg-[#FCEE0A]/10 border border-[#FCEE0A]/40 px-2 py-0.5 rounded">
                        once (1 vez)
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-gray-800">
                      <div>
                        <strong className="text-[#0dfceb] block uppercase font-black text-xs">CALL A LEGEND</strong>
                        <span className="text-[11px] text-gray-300 font-sans">
                          Gastar 1 €$ para voltear una Leyenda boca arriba.
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#0dfceb] bg-[#0dfceb]/10 border border-[#0dfceb]/40 px-2 py-0.5 rounded">
                        once, 1 €$
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-gray-800">
                      <div>
                        <strong className="text-white block uppercase font-black text-xs">PLAY CARDS</strong>
                        <span className="text-[11px] text-gray-300 font-sans">
                          Pagar Eddies para desplegar Unidades, Gears o Programas.
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-300 bg-gray-900 border border-gray-700 px-2 py-0.5 rounded">
                        any number
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-gray-800">
                      <div>
                        <strong className="text-white block uppercase font-black text-xs">ACTIVATE EFFECTS</strong>
                        <span className="text-[11px] text-gray-300 font-sans">
                          Activar habilidades de cartas o Leyendas boca arriba (↷ Spend).
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-300 bg-gray-900 border border-gray-700 px-2 py-0.5 rounded">
                        any number
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 p-2 rounded border border-gray-800">
                      <div>
                        <strong className="text-[#FF003C] block uppercase font-black text-xs">ATTACK</strong>
                        <span className="text-[11px] text-gray-300 font-sans">
                          Girar unidad lista sin Lag para atacar unidad rival gastada (Spent) o asaltar Gigs.
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#FF003C] bg-[#FF003C]/10 border border-[#FF003C]/40 px-2 py-0.5 rounded">
                        one Unit at a time
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie con la Regla de Cierre Oficial */}
              <div className="p-3 bg-black/80 border border-gray-800 rounded-lg text-center text-xs text-gray-300 font-sans leading-relaxed">
                <span className="text-white font-bold block mb-1">
                  Then pass. At the end of the turn, "this turn" effects end and every Unit loses Lag. Your Rival's turn begins.
                </span>
                <span className="text-[10px] text-[#0dfceb] font-mono">
                  Rules 8.1–8.18: WeirdCo Comprehensive Rules · PlayDreamz
                </span>
              </div>

              {/* Botón de Cierre */}
              <div className="flex justify-end pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowTurnGuideModal(false)}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-6 py-2.5 bg-[#FCEE0A] hover:bg-[#0dfceb] text-black font-black text-xs uppercase cursor-pointer transition-all shadow-[0_0_20px_rgba(252,238,10,0.5)]"
                >
                  ENTENDIDO // CONTINUAR PARTIDA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. POP-OUT FLOTANTE: CARTA A TAMAÑO COMPLETO AL HACER HOVER EN EL ESCÁNER KIROSHI */}
      <AnimatePresence>
        {isKiroshiHoverZoom && displayCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -15 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -15 }}
            transition={{ duration: 0.15 }}
            className="fixed left-[295px] sm:left-[330px] top-1/2 -translate-y-1/2 z-50 pointer-events-none select-none flex flex-col items-center"
          >
            <div
              style={{ clipPath: CYBER_CARD_CLIP }}
              className="w-[320px] sm:w-[380px] md:w-[420px] max-h-[85vh] aspect-[7/10] bg-black border-2 border-[#FCEE0A] shadow-[0_0_60px_rgba(252,238,10,0.7),0_0_100px_rgba(13,252,235,0.35)] rounded-sm overflow-hidden relative flex flex-col justify-between"
            >
              <img
                src={displayCard.image}
                alt={displayCard.name}
                className="w-full h-full object-contain bg-black"
              />

              {/* Badge de coste en esquina superior izquierda */}
              <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/90 border border-[#0dfceb] text-[#0dfceb] font-mono font-black text-xs shadow-md rounded-sm">
                {displayCard.parsedCost !== undefined && displayCard.parsedCost !== null
                  ? `${displayCard.parsedCost} €$`
                  : 'LEYENDA'}
              </div>

              {/* Badge de RAM si aplica */}
              {displayCard.ram && (
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-black/90 border border-[#FCEE0A] text-[#FCEE0A] font-mono font-black text-xs shadow-md rounded-sm">
                  RAM {displayCard.ram}
                </div>
              )}

              {/* Badge de Poder en esquina inferior derecha */}
              {displayCard.currentPower !== undefined && (
                <div className="absolute bottom-2 right-2 px-3 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-sm shadow-xl rounded flex items-center gap-1">
                  <span>⚡</span>
                  <span>{displayCard.currentPower} FUERZA</span>
                </div>
              )}
            </div>

            <div className="mt-2 px-3 py-1 bg-black/95 border border-[#0dfceb] text-[#0dfceb] font-mono text-[10px] font-bold uppercase tracking-wider rounded shadow flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0dfceb] animate-ping" />
              <span>VISTA A TAMAÑO COMPLETO // CLIC PARA ABRIR REVERSO</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
