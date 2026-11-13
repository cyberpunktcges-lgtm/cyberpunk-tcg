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
  ArrowRight
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
  DICE_CONFIG
} from '../utils/cyberpunkEngine.js';
import { runBotTurn } from '../utils/botAi.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

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
    const bDeck = availableDecks[bDeckIdx] || availableDecks[1] || availableDecks[0] || { deckList: [], legends: [] };

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

  // Turno del bot automático cuando le toque
  useEffect(() => {
    if (!gameState || gameState.isGameOver) return;

    if (gameState.activePlayer === 'bot' && !isBotThinking) {
      setIsBotThinking(true);
      runBotTurn(
        gameState,
        (updated) => setGameState({ ...updated }),
        650
      ).then(() => {
        setIsBotThinking(false);
      });
    }
  }, [gameState?.activePlayer, gameState?.turnNumber, gameState?.isGameOver]);

  // Si no está autenticado, mostrar pantalla de clave
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070a10] text-white flex items-center justify-center p-4 relative overflow-hidden font-mono">
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
  const isMyTurn = gameState.activePlayer === 'player' && !gameState.isGameOver;
  const playerStreetCred = calculateStreetCred(p.gigs);
  const botStreetCred = calculateStreetCred(bot.gigs);
  const availableEddies = getAvailableEddies(p);

  return (
    <div className="min-h-screen bg-[#05070c] text-white font-sans select-none flex flex-col justify-between relative overflow-x-hidden">
      {/* Rejilla de Fondo */}
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
      <header className="relative z-10 bg-[#000000] border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse" />
            <span className="font-black text-white uppercase tracking-wider text-sm">
              CYBERPUNK TCG // <span className="text-[#FCEE0A]">SIMULADOR ALPHA</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-gray-400 pl-3 border-l border-gray-800">
            <span>TURNO {gameState.turnNumber}</span>
            <span className="text-gray-700">•</span>
            <span
              className={`font-black uppercase px-2 py-0.5 ${
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
            className="px-3 py-1.5 bg-[#070a10] border border-gray-700 hover:border-[#00F0FF] text-[#00F0FF] font-bold uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>REGISTRO ({gameState.actionLog.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartGame()}
            style={{ clipPath: CYBER_CLIP }}
            className="px-3 py-1.5 bg-[#070a10] border border-gray-700 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REINICIAR</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          TABLERO DE JUEGO (PLAYMAT OFICIAL DUAL: BOT ARRIBA / JUGADOR ABAJO)
         ===================================================================== */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col justify-between gap-3">
        {/* ===============================================================
            ZONA DEL RIVAL (BOT - MITAD SUPERIOR)
           =============================================================== */}
        <div className="bg-[#000000]/80 border border-gray-800/80 p-3 rounded-none space-y-2 relative">
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-gray-900 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF003C]" />
              <span className="text-gray-300 font-bold uppercase">{bot.name}</span>
              <span className="text-gray-500">|</span>
              <span className="text-[#FCEE0A]">
                GIGS: {bot.gigs.length}/7 (⭐ {botStreetCred} Cred)
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-[#00F0FF]">
                EDDIES DISP: {getAvailableEddies(bot)} €$
              </span>
            </div>

            {/* Mano del rival (boca abajo) */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">MANO ({bot.hand.length}):</span>
              {bot.hand.map((_, idx) => (
                <div
                  key={idx}
                  className="w-4 h-6 bg-[#070a10] border border-gray-800 rounded-none shadow-sm"
                  title="Carta en mano de la IA"
                />
              ))}
            </div>
          </div>

          {/* Grid de Zonas del Bot */}
          <div className="grid grid-cols-12 gap-2 text-xs font-mono">
            {/* Fixer del Bot (Izquierda) */}
            <div className="col-span-2 bg-[#070a10]/60 border border-gray-900 p-2 flex flex-col justify-between min-h-[90px]">
              <span className="text-[9px] text-gray-500 uppercase block">FIXER RIVAL</span>
              <div className="flex flex-wrap gap-1">
                {bot.fixerDice.map((d, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 text-[9px] text-gray-400 font-bold"
                  >
                    {d.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Campo del Bot (Centro) */}
            <div className="col-span-8 bg-[#070a10]/80 border border-gray-900 p-2 flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-b border-gray-900/60 pb-1 mb-1">
                <span>CAMPO DE BATALLA (FIELD)</span>
                <span>{bot.field.length} UNIDADES</span>
              </div>

              {bot.field.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 text-[11px] italic">
                  No hay unidades enemigas en el campo
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-1">
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
                        className={`w-24 sm:w-28 p-1.5 bg-[#000000] border transition-all cursor-pointer flex flex-col justify-between relative ${
                          canAttackThisUnit
                            ? 'border-[#FF003C] animate-pulse hover:scale-105'
                            : unit.isSpent
                            ? 'border-gray-800 opacity-60'
                            : 'border-[#FF003C]/60 hover:border-[#FF003C]'
                        }`}
                      >
                        <div className="relative h-14 w-full overflow-hidden bg-black mb-1">
                          <img
                            src={unit.image}
                            alt={unit.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0.5 right-0.5 px-1 bg-[#FF003C] text-white text-[9px] font-black">
                            {unit.currentPower}
                          </span>
                        </div>

                        <p className="text-[10px] font-bold text-white truncate">{unit.name}</p>

                        <div className="flex items-center justify-between text-[8px] text-gray-400 mt-0.5">
                          <span>{unit.isSpent ? 'GIRADA' : 'LISTA'}</span>
                          {unit.isLagging && <span className="text-[#FCEE0A]">LAG</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mazo y Basura del Bot (Derecha) */}
            <div className="col-span-2 bg-[#070a10]/60 border border-gray-900 p-2 flex flex-col justify-between text-[9px]">
              <div>
                <span className="text-gray-500 block">MAZO:</span>
                <span className="text-[#00F0FF] font-bold">{bot.deck.length} cartas</span>
              </div>
              <div className="border-t border-gray-900 pt-1">
                <span className="text-gray-500 block">TRASH:</span>
                <span className="text-gray-400">{bot.trash.length} cartas</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===============================================================
            LÍNEA DE ENGAGEMENT / COMBATE Y CONTROLES DEL TURNO
           =============================================================== */}
        <div className="relative py-2 flex items-center justify-between border-y border-[#00F0FF]/30 bg-[#000000] px-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#FCEE0A]" />
            <span className="text-[#00F0FF] font-bold">
              {isMyTurn ? 'FASE PRINCIPAL // SELECCIONA ACCIONES' : 'IA PENSANDO SU MOVIMIENTO...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedFieldUnit && (
              <span className="text-xs text-[#FCEE0A] animate-pulse">
                Unidad seleccionada: <strong>{selectedFieldUnit.name}</strong>
              </span>
            )}

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
              className="px-5 py-2 bg-[#FCEE0A] hover:bg-[#00F0FF] text-[#070a10] font-black uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.5)] transition-all disabled:opacity-40"
            >
              PASAR TURNO ➔
            </button>
          </div>
        </div>

        {/* ===============================================================
            ZONA DEL JUGADOR (MITAD INFERIOR - FIGURE 4 PLAYMAT)
           =============================================================== */}
        <div className="bg-[#000000] border-2 border-[#00F0FF] p-3 sm:p-4 rounded-none space-y-3 relative shadow-[0_0_30px_rgba(0,240,255,0.15)]">
          {/* Cabecera del Jugador */}
          <div className="flex flex-wrap items-center justify-between text-xs font-mono border-b border-gray-800 pb-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF]" />
              <span className="text-white font-black uppercase text-sm">{p.name}</span>
              <span className="text-gray-700">|</span>
              <span className="text-[#00F0FF] font-bold">
                EDDIES DISP: <span className="text-[#FCEE0A] text-sm">{availableEddies} €$</span>
              </span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-400">
                GIGS CONTROLADOS: <strong className="text-white">{p.gigs.length} / 7</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#00F0FF]">
              <span>STREET CRED:</span>
              <span className="px-2 py-0.5 bg-[#070a10] border border-[#00F0FF] font-black text-[#FCEE0A]">
                ⭐ {playerStreetCred}
              </span>
            </div>
          </div>

          {/* Grid de 3 Columnas según Playmat Oficial */}
          <div className="grid grid-cols-12 gap-3 font-mono">
            {/* 1. COLUMNA IZQUIERDA: FIXER (D4 a D20) */}
            <div className="col-span-12 sm:col-span-2 bg-[#070a10] border border-gray-800 p-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#00F0FF] font-bold uppercase tracking-wider block border-b border-gray-800 pb-1 mb-2">
                  FIXER (DICE)
                </span>
                <p className="text-[9px] text-gray-500 mb-2">Tus dados de Gig esperan aquí:</p>
                <div className="space-y-1">
                  {['d20', 'd12', 'd10', 'd8', 'd6', 'd4'].map((dieKey) => {
                    const isStillInFixer = p.fixerDice.includes(dieKey);
                    return (
                      <div
                        key={dieKey}
                        className={`flex items-center justify-between px-2 py-1 text-[10px] border ${
                          isStillInFixer
                            ? 'bg-[#000000] border-gray-700 text-white font-bold'
                            : 'bg-transparent border-gray-900 text-gray-700 line-through'
                        }`}
                      >
                        <span>{dieKey.toUpperCase()}</span>
                        <span>{isStillInFixer ? 'LISTO' : 'LANZADO'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. COLUMNA CENTRAL: RIVAL GIGS / FRIENDLY GIGS / FIELD / LEGENDS / EDDIES */}
            <div className="col-span-12 sm:col-span-8 space-y-3">
              {/* Fila Superior: Rival Gigs vs Friendly Gigs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* RIVAL GIGS (Objetivo de ataque para robar) */}
                <div
                  onClick={() => {
                    if (
                      selectedFieldUnit &&
                      !selectedFieldUnit.isSpent &&
                      !selectedFieldUnit.isLagging
                    ) {
                      attackRivalGigs(gameState, 'player', selectedFieldUnit.instanceId);
                      setSelectedFieldUnit(null);
                      setGameState({ ...gameState });
                    }
                  }}
                  className={`p-2 bg-[#070a10] border transition-all ${
                    selectedFieldUnit && !selectedFieldUnit.isSpent && !selectedFieldUnit.isLagging
                      ? 'border-[#FF003C] shadow-[0_0_15px_rgba(255,0,60,0.4)] cursor-pointer animate-pulse'
                      : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#FF003C] uppercase">
                      RIVAL GIGS (ATACAR PARA ROBAR)
                    </span>
                    <span className="text-[10px] text-gray-400">{bot.gigs.length} dados</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
                    {bot.gigs.map((g, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[#FF003C]/20 border border-[#FF003C] text-[10px] text-white font-bold"
                      >
                        {g.die.toUpperCase()}: {g.value}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FRIENDLY GIGS (Tus dados de Gig) */}
                <div className="p-2 bg-[#070a10] border border-[#00F0FF]/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#00F0FF] uppercase">
                      FRIENDLY GIGS (TUS GIGS)
                    </span>
                    <span className="text-[10px] text-[#FCEE0A] font-bold">
                      ⭐ {playerStreetCred} Cred
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
                    {p.gigs.map((g, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[#00F0FF]/20 border border-[#00F0FF] text-[10px] text-[#00F0FF] font-bold"
                      >
                        {g.die.toUpperCase()}: {g.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* FIELD: Campo de Unidades del Jugador */}
              <div className="p-3 bg-[#070a10] border border-gray-800 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-2 text-[10px]">
                  <span className="text-[#00F0FF] font-bold uppercase">
                    CAMPO DE BATALLA (FIELD) // {p.field.length} UNIDADES ACTIVAS
                  </span>
                  <span className="text-gray-500">
                    Haz clic en una unidad lista para declarar ataque
                  </span>
                </div>

                {p.field.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-xs italic">
                    No tienes unidades en el campo. Selecciona una carta de tu mano abajo para jugarla.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
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
                          className={`w-28 sm:w-32 p-2 bg-[#000000] border transition-all cursor-pointer flex flex-col justify-between relative ${
                            isSelected
                              ? 'border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.5)] scale-105'
                              : canAttack
                              ? 'border-[#00F0FF] hover:border-[#FCEE0A]'
                              : unit.isSpent
                              ? 'border-gray-800 opacity-60'
                              : 'border-gray-800'
                          }`}
                        >
                          <div className="relative h-16 w-full overflow-hidden bg-black mb-1.5">
                            <img
                              src={unit.image}
                              alt={unit.name}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] text-[10px] font-black">
                              {unit.currentPower} PWR
                            </span>
                          </div>

                          <p className="text-[11px] font-bold text-white truncate">{unit.name}</p>

                          <div className="flex items-center justify-between text-[9px] mt-1 pt-1 border-t border-gray-900">
                            <span className={unit.isSpent ? 'text-gray-500' : 'text-[#00F0FF]'}>
                              {unit.isSpent ? 'GIRADA' : 'LISTA'}
                            </span>
                            {unit.isLagging && (
                              <span className="text-[#FF003C] font-bold">LAG</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fila Inferior: LEGENDS y EDDIES */}
              <div className="grid grid-cols-12 gap-2 text-xs">
                {/* ZONA DE LEYENDAS (3 Slots) */}
                <div className="col-span-6 p-2.5 bg-[#070a10] border border-gray-800">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-2">
                    <span className="text-[10px] text-[#FCEE0A] font-bold uppercase flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      <span>LEYENDAS (3 SLOTS)</span>
                    </span>
                    <span className="text-[9px] text-gray-500">
                      Gastar = 1 €$ | Revelar = Activar
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {p.legends.map((leg, idx) => (
                      <div
                        key={leg.instanceId || idx}
                        onClick={() => {
                          if (!leg.isFaceUp && isMyTurn && !p.hasCalledLegendThisTurn) {
                            callLegendFaceUp(gameState, 'player', leg.instanceId);
                            setGameState({ ...gameState });
                          } else {
                            setInspectedCard(leg);
                          }
                        }}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`h-24 p-1 bg-[#000000] border cursor-pointer flex flex-col justify-between text-center transition-all ${
                          leg.isSpent
                            ? 'border-gray-900 opacity-40'
                            : leg.isFaceUp
                            ? 'border-[#FCEE0A]'
                            : 'border-gray-800 hover:border-[#00F0FF]'
                        }`}
                        title={leg.isFaceUp ? leg.name : 'Leyenda boca abajo (clic para revelar)'}
                      >
                        {leg.isFaceUp ? (
                          <>
                            <img
                              src={leg.image}
                              alt={leg.name}
                              className="h-14 w-full object-cover"
                            />
                            <p className="text-[9px] font-bold text-[#FCEE0A] truncate">
                              {leg.name}
                            </p>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-[9px] text-gray-400">
                            <Crown className="w-5 h-5 text-gray-600 mb-1" />
                            <span>BOCA ABAJO</span>
                            <span className="text-[7px] text-[#00F0FF]">REVELAR</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZONA DE EDDIES (Cartas boca abajo vendidas por 1 €$) */}
                <div className="col-span-6 p-2.5 bg-[#070a10] border border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-2">
                    <span className="text-[10px] text-[#00F0FF] font-bold uppercase flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>EDDIES (€$)</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#FCEE0A]">
                      {p.eddies.filter((e) => !e.isSpent).length} €$ DISPONIBLES
                    </span>
                  </div>

                  <p className="text-[9px] text-gray-500 mb-2">
                    Vende 1 carta por turno desde tu mano para acumular Eddies permanentes:
                  </p>

                  <div className="flex flex-wrap gap-1 min-h-[30px] items-center">
                    {p.eddies.map((ed, idx) => (
                      <div
                        key={idx}
                        className={`w-7 h-10 border text-[8px] flex items-center justify-center font-bold ${
                          ed.isSpent
                            ? 'bg-[#000000] border-gray-900 text-gray-700'
                            : 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]'
                        }`}
                        title={ed.isSpent ? 'Eddies gastado este turno' : '1 €$ disponible'}
                      >
                        €$
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. COLUMNA DERECHA: DECK Y TRASH */}
            <div className="col-span-12 sm:col-span-2 bg-[#070a10] border border-gray-800 p-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#00F0FF] font-bold uppercase tracking-wider block border-b border-gray-800 pb-1 mb-2">
                  MAZO & TRASH
                </span>

                <div className="space-y-3">
                  <div className="p-2 bg-[#000000] border border-gray-800">
                    <span className="text-[9px] text-gray-400 uppercase block">MAZO (DECK)</span>
                    <span className="text-sm font-black text-white">{p.deck.length} CARTAS</span>
                  </div>

                  <div className="p-2 bg-[#000000] border border-gray-800">
                    <span className="text-[9px] text-gray-400 uppercase block">
                      BASURA (TRASH)
                    </span>
                    <span className="text-sm font-black text-gray-400">
                      {p.trash.length} CARTAS
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-2 text-[9px] text-gray-500">
                Pérdida inmediata si se requiere robar sin cartas en mazo.
              </div>
            </div>
          </div>
        </div>

        {/* ===============================================================
            MANO DEL JUGADOR (BOTTOM DRAWER INTERACTIVO)
           =============================================================== */}
        <div className="bg-[#000000] border-t-2 border-gray-800 p-3 relative font-mono">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2 text-xs">
            <span className="text-gray-300 font-bold uppercase">
              TU MANO ({p.hand.length} CARTAS) // HAZ CLIC EN UNA CARTA PARA JUGARLA O VENDERLA
            </span>

            {selectedHandCard && (
              <div className="flex items-center gap-2">
                <span className="text-[#FCEE0A] text-xs">
                  Seleccionada: <strong>{selectedHandCard.name}</strong> (Coste:{' '}
                  {selectedHandCard.parsedCost} €$)
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
                  className="px-3 py-1 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black uppercase text-xs cursor-pointer disabled:opacity-40"
                >
                  JUGAR UNIDAD ({selectedHandCard.parsedCost} €$)
                </button>

                <button
                  type="button"
                  disabled={!isMyTurn || p.hasSoldThisTurn}
                  onClick={() => {
                    const res = sellCardForEddies(
                      gameState,
                      'player',
                      selectedHandCard.instanceId
                    );
                    if (res.success) {
                      setSelectedHandCard(null);
                      setGameState({ ...gameState });
                    } else {
                      alert(res.reason);
                    }
                  }}
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-3 py-1 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black uppercase text-xs cursor-pointer disabled:opacity-40"
                >
                  VENDER (+1 €$)
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

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {p.hand.map((card) => {
              const isSelected = selectedHandCard?.instanceId === card.instanceId;
              const canAfford = availableEddies >= (card.parsedCost || 0);

              return (
                <div
                  key={card.instanceId}
                  onClick={() => setSelectedHandCard(isSelected ? null : card)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`w-28 sm:w-32 p-1.5 bg-[#070a10] border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.5)] -translate-y-2'
                      : canAfford && isMyTurn
                      ? 'border-gray-700 hover:border-[#00F0FF]'
                      : 'border-gray-900 opacity-60'
                  }`}
                >
                  <div className="relative h-20 w-full overflow-hidden bg-black mb-1">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-0.5 left-0.5 px-1 bg-[#000000]/80 text-[#00F0FF] text-[9px] font-black">
                      {card.parsedCost} €$
                    </span>
                    <span className="absolute bottom-0.5 right-0.5 px-1 bg-[#FF003C] text-white text-[9px] font-black">
                      {card.parsedPower}
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-white truncate">{card.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* =====================================================================
          MODAL DE REGISTRO DE COMBATE (TERMINAL LOG)
         ===================================================================== */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs"
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
                <span>TERMINAL LOG // HISTORIAL DE COMBATE</span>
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
                      ? 'text-[#FF003C]'
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
