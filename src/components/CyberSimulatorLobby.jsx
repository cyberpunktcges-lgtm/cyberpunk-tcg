import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Swords,
  Trophy,
  FlaskConical,
  Layers,
  Play,
  Crown,
  Flame,
  Bot,
  BookOpen,
  Bug,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Trash2,
  Edit3,
  Lock,
  Shuffle
} from 'lucide-react';
import CyberUserDropdown from './CyberUserDropdown.jsx';
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';
import { getLeaderboardTop } from '../utils/firebase.js';
import {
  CURRENT_RANKING_SEASON,
  BOT_DIFFICULTY_LEVELS,
  getRankForPoints,
  getUnlockedBotDifficulty,
  getBotDifficultyMeta,
  computeWinRate,
  resolvePublicNickname
} from '../utils/rankingSystem.js';
import { AVATARS } from '../data/avatars.js';
import {
  ARASAKA_TOWER_RIVALS,
  getTowerProgress,
  resetTowerRun
} from '../data/rankedTower.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';

export default function CyberSimulatorLobby({
  currentUser,
  userProfile,
  userCloudDecks = [],
  userRankingStats = null,
  playerAvatar,
  activePlayerDeck,
  activeBotDeck,
  selectedBotDifficulty = 1,
  onSelectBotDifficulty,
  resumableMatch = null, // { gameState, seriesState, playerDeckName, botDeckName }
  onResumeMatch,
  onDiscardSavedMatch,
  onOpenDeckSelector, // ('arasaka_tower' | 'ranked_bo3' | 'practice')
  towerProgressVersion = 0,
  onTowerProgressReset,
  onOpenLeaderboard,
  onOpenMyDecks,
  onOpenProfile,
  onOpenAuthModal,
  onOpenRules,
  onOpenBugReport
}) {
  const [topRows, setTopRows] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [localTowerTick, setLocalTowerTick] = useState(0);

  const fetchTop = async () => {
    setLoadingTop(true);
    try {
      const list = await getLeaderboardTop(5);
      setTopRows(list);
    } catch {
      setTopRows([]);
    } finally {
      setLoadingTop(false);
    }
  };

  useEffect(() => {
    fetchTop();
  }, [userRankingStats?.points, userRankingStats?.wins]);

  const myWins = userRankingStats?.wins || 0;
  const myLosses = userRankingStats?.losses || 0;
  const myPoints = userRankingStats?.points || 0;
  const myStreak = userRankingStats?.currentStreak || 0;
  const myRank = getRankForPoints(myPoints);
  const myBotProg = getUnlockedBotDifficulty(myWins);
  const towerProgress = getTowerProgress(currentUser?.uid || null);
  void towerProgressVersion;
  void localTowerTick;
  const nextTowerRival = towerProgress.currentRival;
  const towerRivalDiffMeta = getBotDifficultyMeta(nextTowerRival?.botDifficulty || 1);
  const activeDiffMeta = getBotDifficultyMeta(selectedBotDifficulty);
  const publicNick = currentUser ? resolvePublicNickname(userProfile, currentUser) : 'Invitado';

  const handleResetTowerClick = () => {
    if (!window.confirm('¿Reiniciar tu escalada en «Conquista la Torre Arasaka» desde el Piso 1 (Pepe Najarro)? Tu historial de conquistas se conservará.')) {
      return;
    }
    resetTowerRun(currentUser?.uid || null);
    setLocalTowerTick((v) => v + 1);
    if (onTowerProgressReset) onTowerProgressReset();
  };

  const resolveAvatar = (row) => {
    if (row?.avatarImage) return { image: row.avatarImage, name: row.nickname || 'V' };
    return AVATARS.find((a) => a.id === row?.avatarId) || AVATARS[0];
  };

  return (
    <div className="min-h-[100dvh] bg-[#070a10] text-white font-mono relative overflow-x-hidden flex flex-col justify-between select-none">
      {/* Fondo atmosférico: Alt Cunningham // Soulkiller Architect */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-[center_20%] opacity-[0.38] scale-[1.02]"
        style={{
          backgroundImage:
            "url('/images/pandart-studio-alt-cunningham-soulkiller-architect.webp')"
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#070a10]/65 via-[#070a10]/35 to-[#070a10]/88" />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 32%, transparent 25%, rgba(7, 10, 16, 0.72) 92%)'
        }}
      />

      {/* Cuadrícula Cyberpunk y resplandores neón */}
      <div
        className="pointer-events-none fixed inset-0 opacity-15 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(13, 252, 235, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.1) 1px, transparent 1px)',
          backgroundSize: '44px 44px'
        }}
      />
      <div className="pointer-events-none fixed -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#0dfceb]/10 blur-[120px] z-0" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-[#FF003C]/10 blur-[130px] z-0" />

      {/* Barra Superior del Lobby */}
      <header className="relative z-30 border-b border-[#0dfceb]/30 bg-[#000000]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/"
              className="px-2.5 py-1.5 bg-[#070a10] border border-gray-800 hover:border-[#0dfceb] text-gray-300 hover:text-[#0dfceb] text-[11px] font-bold uppercase flex items-center gap-1 transition-colors shrink-0"
              title="Volver al portal cyberpunktcg.es"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PORTAL</span>
            </a>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0dfceb] animate-pulse shrink-0" />
              <h1 className="font-black text-sm sm:text-base uppercase tracking-wider truncate">
                CYBERPUNK TCG // <span className="text-[#FCEE0A]">SIMULADOR</span>
              </h1>
              <span className="px-1.5 py-0.5 bg-[#FF003C] text-white text-[9px] font-black tracking-widest shrink-0">
                BETA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenRules}
              style={{ clipPath: CYBER_BUTTON }}
              className="px-2.5 py-1.5 bg-[#070a10] border border-gray-700 hover:border-[#0dfceb] text-gray-300 hover:text-[#0dfceb] text-[11px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">REGLAS</span>
            </button>

            <button
              type="button"
              onClick={onOpenBugReport}
              style={{ clipPath: CYBER_BUTTON }}
              className="px-2.5 py-1.5 bg-[#FF003C]/15 hover:bg-[#FF003C] border border-[#FF003C] text-[#FF003C] hover:text-white text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Bug className="w-3.5 h-3.5" />
              <span className="hidden md:inline">REPORTAR BUG</span>
            </button>

            <CyberUserDropdown
              currentUser={currentUser}
              userProfile={userProfile}
              userDecksCount={userCloudDecks.length}
              onOpenAuthModal={onOpenAuthModal}
              onOpenMyDecks={onOpenMyDecks}
              onOpenProfile={onOpenProfile}
              themeColor="#0dfceb"
            />
          </div>
        </div>
      </header>

      {/* Contenido Principal del Lobby */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Banner de Partida en Curso (si existe una partida sin terminar en caché) */}
        {resumableMatch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ clipPath: CYBER_CLIP }}
            className="bg-[#000000]/95 border-2 border-[#0dfceb] p-4 shadow-[0_0_30px_rgba(13,252,235,0.28)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-[#0dfceb]/15 border border-[#0dfceb] flex items-center justify-center text-[#0dfceb] shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-[#0dfceb]">
                    ⚡ PARTIDA EN CURSO GUARDADA
                  </span>
                  {resumableMatch.seriesState?.mode === 'arasaka_tower' ? (
                    <span className="px-1.5 py-0.5 bg-[#FF003C] text-white text-[9px] font-black uppercase">
                      🗼 TORRE ARASAKA • PISO {resumableMatch.seriesState.towerStage || 1}/11
                    </span>
                  ) : resumableMatch.seriesState?.mode === 'ranked_bo3' ? (
                    <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-black text-[9px] font-black uppercase">
                      🏆 RANKED BO3 • J{resumableMatch.seriesState.currentGame}/3 ({resumableMatch.seriesState.playerScore}-{resumableMatch.seriesState.botScore})
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 text-gray-300 text-[9px] font-bold uppercase">
                      🧪 MODO TESTEO
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-300 truncate mt-0.5">
                  Turno {resumableMatch.gameState?.turnNumber || 1} •{' '}
                  <strong className="text-white">{resumableMatch.playerDeckName || 'Tu Mazo'}</strong> vs{' '}
                  <strong className="text-[#FF003C]">{resumableMatch.botDeckName || 'Rival IA'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onResumeMatch}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-5 py-2 bg-[#0dfceb] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(13,252,235,0.45)] transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>REANUDAR PARTIDA</span>
              </button>
              <button
                type="button"
                onClick={onDiscardSavedMatch}
                className="p-2 bg-black border border-gray-800 hover:border-[#FF003C] text-gray-400 hover:text-[#FF003C] cursor-pointer transition-colors"
                title="Descartar partida guardada"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Cabecera Hero */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-xs font-black text-[#0dfceb] tracking-[0.2em] uppercase block">
              // ARENA DE COMBATE TÁCTICO • SET 01 WELCOME TO NIGHT CITY //
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none">
              ELIGE TU <span className="text-[#FCEE0A]">MODO DE COMBATE</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-sans max-w-2xl">
              Compite en series <strong className="text-white">Ranked al Mejor de 3 (Suizo)</strong> contra mazos rivales aleatorios para subir en el Ranking, o entra en <strong className="text-white">Modo Práctica</strong> para testear tus mazos contra el emparejamiento que tú elijas.
            </p>
          </div>

          {/* Tarjeta rápida del Netrunner actual */}
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="bg-[#000000]/90 border border-[#0dfceb]/40 px-4 py-2.5 flex items-center gap-3 shrink-0"
          >
            <div className="w-11 h-11 bg-black border-2 border-[#0dfceb] overflow-hidden shrink-0">
              <AvatarDisplay avatar={playerAvatar} fallbackType="player" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white uppercase truncate max-w-[140px]">
                  {publicNick}
                </span>
                {myStreak >= 3 && (
                  <span className="px-1 py-0.2 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] text-[9px] font-black flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" />
                    {myStreak}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase block" style={{ color: myRank.color }}>
                {myRank.emoji} {myRank.name} • {myPoints} ⭐
              </span>
              <span className="text-[9px] text-gray-400 block">
                {myWins}V - {myLosses}D ({computeWinRate(myWins, myLosses)}%) • {userCloudDecks.length} mazos en cuenta
              </span>
            </div>
          </div>
        </div>

        {/* Grid Principal: Izquierda (Modos + Mazos + Nivel IA) | Derecha (Ranking Night City Live) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA (7 cols): MODOS DE JUEGO + DIFICULTAD IA + ACCESOS MAZOS */}
          <div className="lg:col-span-7 space-y-5">
            {/* TARJETA HERO DESTACADA: MODO AVENTURA «CONQUISTA LA TORRE ARASAKA» */}
            <motion.div
              whileHover={{ y: -2 }}
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000]/92 backdrop-blur-sm border-2 border-[#FF003C] p-4 sm:p-5 shadow-[0_0_40px_rgba(255,0,60,0.25)] relative overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                {/* Columna GIF animado de la Torre Arasaka */}
                <div className="sm:col-span-5 relative rounded overflow-hidden border-2 border-[#FF003C]/70 bg-black min-h-[190px] sm:min-h-[225px] shadow-[0_0_25px_rgba(255,0,60,0.28)]">
                  <img
                    src="/images/torre_arasaka.gif"
                    alt="Conquista la Torre Arasaka"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/45" />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 bg-[#FF003C] text-white text-[9px] font-black uppercase tracking-widest shadow">
                      MODO AVENTURA
                    </span>
                    {towerProgress.completions > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-black text-[9px] font-black uppercase">
                        👑 ×{towerProgress.completions}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-black uppercase">
                    <span className="text-[#FCEE0A] drop-shadow">
                      {towerProgress.isChampion
                        ? '👑 TORRE CONQUISTADA'
                        : `🗼 PISO ${towerProgress.currentStage} DE ${towerProgress.totalStages}`}
                    </span>
                    <span className="text-white/90 text-[9px]">
                      {towerProgress.defeatedCount}/{towerProgress.totalStages} K.O.
                    </span>
                  </div>
                </div>

                {/* Columna Info + Próximo Rival + Barra de 11 pisos */}
                <div className="sm:col-span-7 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#FF003C] block">
                          ARCADE ESTILO STREET FIGHTER II • 11 RIVALES
                        </span>
                        <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide leading-tight mt-0.5">
                          CONQUISTA LA <span className="text-[#FF003C]">TORRE ARASAKA</span>
                        </h3>
                      </div>
                      {towerProgress.defeatedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetTowerClick}
                          className="px-2 py-1 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-[9px] text-gray-400 hover:text-[#FF003C] font-bold uppercase cursor-pointer shrink-0 transition-colors"
                          title="Reiniciar la escalada desde el Piso 1 (Pepe Najarro)"
                        >
                          🔄 REINICIAR
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 font-sans leading-relaxed">
                      Enfréntate uno a uno a los <strong className="text-white">11 iconos de Night City</strong> (cada uno con <strong className="text-[#0dfceb]">su propio mazo exclusivo</strong>) desde{' '}
                      <strong className="text-[#FCEE0A]">Pepe Najarro</strong> hasta{' '}
                      <strong className="text-[#FF003C]">Adam Smasher, Johnny Silverhand y V</strong>.
                    </p>

                    {/* Tarjeta del Próximo Rival del Piso Actual */}
                    <div className="bg-[#070a10] border border-[#FF003C]/45 p-2.5 rounded space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded border-2 border-[#FF003C] overflow-hidden bg-black shrink-0 shadow-[0_0_12px_rgba(255,0,60,0.35)]">
                          <img
                            src={nextTowerRival.okImage}
                            alt={nextTowerRival.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-black uppercase text-[#FCEE0A] tracking-wider">
                              {towerProgress.isChampion
                                ? '👑 MODO LEYENDA (RETO ÉLITE)'
                                : `RIVAL ACTUAL • PISO ${towerProgress.currentStage}/${towerProgress.totalStages}`}
                            </span>
                            <span
                              className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black border"
                              style={{
                                color: towerRivalDiffMeta.color,
                                borderColor: `${towerRivalDiffMeta.color}66`
                              }}
                            >
                              {towerRivalDiffMeta.shortLabel}
                            </span>
                          </div>
                          <span className="text-xs font-black text-white uppercase truncate block mt-0.5">
                            {towerProgress.isChampion ? 'Jefe Aleatorio de la Torre' : nextTowerRival.name}
                          </span>
                          <span className="text-[9px] text-gray-400 block truncate font-sans">
                            {towerProgress.isChampion
                              ? 'Ya venciste a los 11 pisos — desafía a cualquiera o reinicia'
                              : nextTowerRival.title}
                          </span>
                        </div>
                      </div>

                      {/* Barra visual de los 11 pisos */}
                      <div className="grid grid-cols-11 gap-1">
                        {ARASAKA_TOWER_RIVALS.map((rv) => {
                          const isDefeated = rv.stage <= towerProgress.defeatedCount;
                          const isCurrent = !towerProgress.isChampion && rv.stage === towerProgress.currentStage;
                          return (
                            <div
                              key={rv.id}
                              title={`Piso ${rv.stage}/11: ${rv.name} (${rv.tier})`}
                              className={`h-1.5 rounded-sm transition-all ${
                                isDefeated
                                  ? 'bg-[#00FF9C]'
                                  : isCurrent
                                  ? 'bg-[#FF003C] animate-pulse shadow-[0_0_6px_#FF003C]'
                                  : 'bg-gray-800'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDeckSelector('arasaka_tower')}
                    style={{ clipPath: CYBER_BUTTON }}
                    className="w-full py-3 px-4 bg-[#FF003C] hover:bg-[#FCEE0A] text-white hover:text-[#070a10] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_22px_rgba(255,0,60,0.5)] transition-colors"
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      {towerProgress.isChampion
                        ? 'COMBATIR EN MODO LEYENDA (TORRE) ➔'
                        : `ASALTAR PISO ${towerProgress.currentStage}/11: ${nextTowerRival.shortName.toUpperCase()} ➔`}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 2 Tarjetas Inferiores: MODO RANKED BO3 vs MODO TESTEO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TARJETA 2: RANKED BO3 (SUIZO) — ORIGINAL */}
              <motion.div
                whileHover={{ y: -3 }}
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000]/92 backdrop-blur-sm border-2 border-[#FCEE0A] p-5 shadow-[0_0_35px_rgba(252,238,10,0.18)] flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A]">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 bg-[#FCEE0A] text-black text-[9px] font-black uppercase tracking-wider">
                      PUNTÚA ⭐ • BO3 SUIZO
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black uppercase text-[#FCEE0A] tracking-wide">
                      MODO RANKED BO3
                    </h3>
                    <p className="text-xs text-gray-300 font-sans mt-1 leading-relaxed">
                      Serie competitiva <strong>al mejor de 3 partidas</strong>. Eliges tu mazo y el rival usa un{' '}
                      <strong className="text-white">mazo aleatorio del meta oficial</strong>.
                    </p>
                  </div>

                  <div className="bg-[#070a10] border border-gray-800 p-2.5 rounded space-y-1 text-[10px] text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Victoria limpia 2-0:</span>
                      <strong className="text-[#00FF9C]">+{activeDiffMeta.sweepPoints} ⭐</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Victoria 2-1:</span>
                      <strong className="text-[#FCEE0A]">+{activeDiffMeta.winPoints} ⭐</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Derrota 1-2 / 0-2:</span>
                      <strong className="text-[#FF003C]">-5 ⭐ / -15 ⭐</strong>
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-gray-800 text-[9px] text-[#0dfceb]">
                      <Shuffle className="w-3 h-3 shrink-0" />
                      <span>Bot actual: {activeDiffMeta.shortLabel}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDeckSelector('ranked_bo3')}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="w-full py-3 px-4 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.45)] transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  <span>ELEGIR MAZO Y JUGAR RANKED ➔</span>
                </button>
              </motion.div>

              {/* TARJETA 3: MODO TESTEO / PRÁCTICA */}
              <motion.div
                whileHover={{ y: -3 }}
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#000000]/95 border-2 border-[#0dfceb]/80 p-5 shadow-[0_0_30px_rgba(13,252,235,0.16)] flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded bg-[#0dfceb]/15 border border-[#0dfceb] flex items-center justify-center text-[#0dfceb]">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 bg-[#070a10] border border-[#0dfceb]/50 text-[#0dfceb] text-[9px] font-black uppercase tracking-wider">
                      LIBRE • NO PUNTÚA
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black uppercase text-[#0dfceb] tracking-wide">
                      MODO PRÁCTICA / TESTEO
                    </h3>
                    <p className="text-xs text-gray-300 font-sans mt-1 leading-relaxed">
                      Partida suelta con total libertad. Elige <strong>tu mazo y el mazo exacto del Bot</strong> para entrenar emparejamientos o probar cartas nuevas.
                    </p>
                  </div>

                  <div className="bg-[#070a10] border border-gray-800 p-2.5 rounded space-y-1 text-[10px] text-gray-300">
                    <div>• Elige cualquier mazo tuyo o del Meta.</div>
                    <div>• Selecciona el arquetipo rival y avatares.</div>
                    <div>• Revancha directa con los mismos mazos.</div>
                    <div className="pt-1 border-t border-gray-800 text-[9px] text-gray-400">
                      Sin riesgo: nunca resta ni suma puntos de Ranking.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDeckSelector('practice')}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="w-full py-3 px-4 bg-[#0dfceb] hover:bg-white text-[#070a10] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(13,252,235,0.4)] transition-colors"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>ELEGIR MAZOS Y TESTEAR ➔</span>
                </button>
              </motion.div>
            </div>

            {/* Selector de Dificultad Progresiva del Bot */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000]/90 border border-gray-800 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#FF003C]" />
                  <span>NIVEL DE DIFICULTAD DE LA IA RIVAL</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {currentUser
                    ? myBotProg.nextTier
                      ? `Gana ${myBotProg.winsToNextLevel} serie(s) BO3 más para desbloquear ${myBotProg.nextTier.name}`
                      : '¡Nivel máximo desbloqueado!'
                    : 'Inicia sesión para desbloquear niveles'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BOT_DIFFICULTY_LEVELS.map((tier) => {
                  const unlocked = currentUser ? myWins >= tier.minWins : tier.level === 1;
                  const isSelected = Number(selectedBotDifficulty) === tier.level;
                  return (
                    <button
                      key={tier.level}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && onSelectBotDifficulty && onSelectBotDifficulty(tier.level)}
                      className={`p-2.5 rounded border text-left transition-all ${
                        !unlocked
                          ? 'bg-[#05070d] border-gray-800/80 opacity-55 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#FCEE0A]/15 border-[#FCEE0A] shadow-[0_0_14px_rgba(252,238,10,0.25)] cursor-pointer'
                          : 'bg-[#070a10] border-gray-800 hover:border-[#0dfceb] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-[10px] font-black uppercase flex items-center gap-1"
                          style={{ color: unlocked ? tier.color : '#6b7280' }}
                        >
                          {!unlocked && <Lock className="w-3 h-3" />}
                          <span>{tier.shortLabel}</span>
                        </span>
                        <span className="text-[9px] font-black text-[#FCEE0A]">+{tier.sweepPoints}⭐</span>
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-1 font-sans leading-tight">
                        {unlocked ? tier.description : `Requiere ${tier.minWins} series BO3 ganadas.`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accesos Rápidos de Gestión de Mazos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenMyDecks}
                style={{ clipPath: CYBER_BUTTON }}
                className="p-3.5 bg-[#000000]/90 border border-gray-800 hover:border-[#FCEE0A] text-left flex items-center justify-between gap-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded bg-[#FCEE0A]/15 border border-[#FCEE0A]/60 flex items-center justify-center text-[#FCEE0A] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black uppercase text-white group-hover:text-[#FCEE0A] block">
                      MIS MAZOS ({userCloudDecks.length})
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate font-sans">
                      Importar .txt, pegar lista, editar o imprimir proxys
                    </span>
                  </div>
                </div>
                <span className="text-[#FCEE0A] text-xs font-black">➔</span>
              </button>

              <a
                href="/cartas"
                style={{ clipPath: CYBER_BUTTON }}
                className="p-3.5 bg-[#000000]/90 border border-gray-800 hover:border-[#0dfceb] text-left flex items-center justify-between gap-3 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded bg-[#0dfceb]/15 border border-[#0dfceb]/60 flex items-center justify-center text-[#0dfceb] shrink-0">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black uppercase text-white group-hover:text-[#0dfceb] block">
                      CONSTRUCTOR DE MAZOS
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate font-sans">
                      Explora las 151 cartas y crea nuevas barajas
                    </span>
                  </div>
                </div>
                <span className="text-[#0dfceb] text-xs font-black">➔</span>
              </a>
            </div>
          </div>

          {/* COLUMNA DERECHA (5 cols): RANKING NIGHT CITY EN DIRECTO (TOP 5) + VISUAL NIGHT CITY */}
          <aside className="lg:col-span-5 flex flex-col gap-5">
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="w-full bg-[#000000]/88 backdrop-blur-sm border-2 border-[#FCEE0A]/70 p-4 sm:p-5 shadow-[0_0_35px_rgba(252,238,10,0.16)] space-y-4"
            >
            <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#FCEE0A]" />
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    TOP RANKING NIGHT CITY
                  </h3>
                </div>
                <span className="text-[9px] text-gray-400 uppercase block mt-0.5">
                  {CURRENT_RANKING_SEASON.label} • SE REINICIA AL SALIR DE BETA
                </span>
              </div>

              <button
                type="button"
                onClick={fetchTop}
                disabled={loadingTop}
                className="p-1.5 bg-[#070a10] border border-gray-800 hover:border-[#0dfceb] text-[#0dfceb] cursor-pointer"
                title="Actualizar clasificación"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTop ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingTop ? (
              <div className="py-10 text-center text-xs text-gray-400">
                Cargando clasificación...
              </div>
            ) : topRows.length === 0 ? (
              <div className="py-8 px-3 bg-[#070a10] border border-dashed border-gray-800 rounded text-center space-y-2">
                <Sparkles className="w-6 h-6 text-[#FCEE0A] mx-auto opacity-75" />
                <p className="text-xs font-black uppercase text-white">
                  ¡AÚN NO HAY LÍDER EN NIGHT CITY!
                </p>
                <p className="text-[11px] text-gray-400 font-sans">
                  Juega tu primera serie Ranked BO3 para estrenar el #1 de la Beta.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topRows.map((row) => {
                  const isMe = currentUser?.uid && row.userId === currentUser.uid;
                  const rankInfo = getRankForPoints(row.points);
                  const av = resolveAvatar(row);
                  return (
                    <div
                      key={row.userId}
                      className={`p-2.5 rounded border flex items-center justify-between gap-2 ${
                        row.rank === 1
                          ? 'bg-[#FCEE0A]/10 border-[#FCEE0A]'
                          : row.rank === 2
                          ? 'bg-[#0dfceb]/5 border-[#0dfceb]/60'
                          : row.rank === 3
                          ? 'bg-[#FF003C]/5 border-[#FF003C]/60'
                          : isMe
                          ? 'bg-[#0dfceb]/10 border-[#0dfceb]'
                          : 'bg-[#070a10] border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center font-black text-xs shrink-0 ${
                            row.rank === 1
                              ? 'bg-[#FCEE0A] text-black'
                              : row.rank === 2
                              ? 'bg-[#0dfceb] text-black'
                              : row.rank === 3
                              ? 'bg-[#FF003C] text-white'
                              : 'bg-black border border-gray-700 text-gray-300'
                          }`}
                        >
                          {row.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : `#${row.rank}`}
                        </div>

                        <div className="w-8 h-8 bg-black border border-gray-700 overflow-hidden shrink-0">
                          <AvatarDisplay avatar={av} fallbackType="player" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white uppercase truncate max-w-[130px]">
                              {row.nickname || row.displayName || 'Netrunner'}
                            </span>
                            {isMe && (
                              <span className="px-1 bg-[#0dfceb] text-black text-[8px] font-black">TÚ</span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 block">
                            <span style={{ color: rankInfo.color }}>{rankInfo.emoji} {rankInfo.name}</span>
                            {' • '}
                            {row.wins}V-{row.losses}D
                            {row.cleanSweeps > 0 ? ` • ⚡${row.cleanSweeps}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-[#FCEE0A] block">
                          {row.points} ⭐
                        </span>
                        <span className="text-[8px] text-gray-500">{row.winRate}% WR</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenLeaderboard}
              style={{ clipPath: CYBER_BUTTON }}
              className="w-full py-2.5 bg-[#FCEE0A]/15 hover:bg-[#FCEE0A] border border-[#FCEE0A] text-[#FCEE0A] hover:text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>VER RANKING COMPLETO Y CAMBIAR MI NICK</span>
            </button>
            </div>

            {/* Banner visual encuadrado al tamaño del recuadro del Ranking */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="w-full relative overflow-hidden border-2 border-[#0dfceb]/45 bg-[#000000] shadow-[0_0_30px_rgba(13,252,235,0.14)] group"
            >
              <img
                src="/images/wallpapers/2917197433_preview_1141084.jpg"
                alt="Night City Edgerunner"
                className="w-full aspect-[16/10] object-cover object-[50%_22%] transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070a10]/85 via-transparent to-[#070a10]/25" />
              <div className="pointer-events-none absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#0dfceb] drop-shadow">
                  NIGHT CITY // ARENA DE COMBATE
                </span>
                <span className="px-1.5 py-0.5 bg-[#FF003C]/90 text-white text-[8px] font-black uppercase tracking-wider">
                  SET 01
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Pie del Lobby */}
      <footer className="relative z-10 border-t border-gray-900 bg-black/80 py-3 px-4 text-center text-[10px] text-gray-500">
        CYBERPUNK TCG ESPAÑA // SIMULADOR TÁCTICO BETA • SOLO SE MUESTRA TU NICK PÚBLICO EN EL RANKING
      </footer>
    </div>
  );
}
