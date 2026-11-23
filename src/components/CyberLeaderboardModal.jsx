import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  X,
  RefreshCw,
  Flame,
  Crown,
  Bot,
  Lock,
  User,
  AlertTriangle,
  Sparkles,
  Swords,
  Edit3,
  Check
} from 'lucide-react';
import { getLeaderboardTop, updateUserPublicNickname } from '../utils/firebase.js';
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
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberLeaderboardModal({
  isOpen,
  onClose,
  currentUser,
  userProfile = null,
  userRankingStats = null,
  selectedBotDifficulty = 1,
  onSelectBotDifficulty,
  onOpenAuthModal,
  onStartRankedBO3,
  onNicknameUpdated
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [nickInput, setNickInput] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [nickSaved, setNickSaved] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const top = await getLeaderboardTop(25);
      setRows(top);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo cargar el ranking desde Firebase Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
      if (currentUser?.uid) {
        setNickInput(resolvePublicNickname(userProfile, currentUser));
        setNickSaved(false);
      }
    }
  }, [isOpen, currentUser?.uid, userProfile?.nickname, userProfile?.displayName]);

  const handleSaveNick = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !nickInput.trim()) return;
    setSavingNick(true);
    setNickSaved(false);
    try {
      const savedNick = await updateUserPublicNickname(currentUser.uid, nickInput.trim());
      setNickInput(savedNick);
      setNickSaved(true);
      if (onNicknameUpdated) onNicknameUpdated(savedNick);
      await loadLeaderboard();
      setTimeout(() => setNickSaved(false), 2500);
    } catch (err) {
      alert(err?.message || 'No se pudo guardar el Nick.');
    } finally {
      setSavingNick(false);
    }
  };

  if (!isOpen) return null;

  const myRowIdx = currentUser?.uid ? rows.findIndex((r) => r.userId === currentUser.uid) : -1;
  const myRow = myRowIdx >= 0 ? rows[myRowIdx] : null;
  const aboveRow = myRowIdx > 0 ? rows[myRowIdx - 1] : null;

  const myPoints = myRow?.points ?? userRankingStats?.points ?? 0;
  const myWins = myRow?.wins ?? userRankingStats?.wins ?? 0;
  const myLosses = myRow?.losses ?? userRankingStats?.losses ?? 0;
  const myStreak = myRow?.currentStreak ?? userRankingStats?.currentStreak ?? 0;
  const myRankInfo = getRankForPoints(myPoints);
  const myBotProg = getUnlockedBotDifficulty(myWins);

  const resolveAvatar = (row) => {
    if (row?.avatarImage) return { image: row.avatarImage, name: row.displayName || 'V' };
    return AVATARS.find((a) => a.id === row?.avatarId) || AVATARS[0];
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-[#000000]/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono select-none"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#070a10] border-2 border-[#FCEE0A] p-4 sm:p-6 shadow-[0_0_55px_rgba(252,238,10,0.3)] flex flex-col text-white overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 border-b border-[#FCEE0A]/30 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A] shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-sm sm:text-lg uppercase tracking-wider text-white truncate">
                  // NIGHT CITY // <span className="text-[#FCEE0A]">RANKING STREET CRED</span>
                </h2>
                <span className="px-2 py-0.5 bg-[#FF003C] text-white text-[9px] font-black uppercase tracking-widest shrink-0">
                  {CURRENT_RANKING_SEASON.label}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block truncate">
                FORMATO SUIZO AL MEJOR DE 3 (BO3) CON MAZO RIVAL ALEATORIO • 2-0 (+10 BONUS) • 1-2 (-5) • 0-2 (-15)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-2.5 py-1.5 bg-black border border-gray-700 hover:border-[#0dfceb] text-[#0dfceb] text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Actualizar tabla de clasificación"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">ACTUALIZAR</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 cursor-pointer"
              aria-label="Cerrar ranking"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aviso de Reinicio de Temporada Beta + Editor Rápido de Nick Público */}
        <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {CURRENT_RANKING_SEASON.isBeta && (
            <div className="flex-1 px-3 py-1.5 bg-[#FF003C]/10 border border-[#FF003C]/40 rounded text-[10px] text-gray-200 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF003C] shrink-0" />
              <span>
                <strong className="text-[#FCEE0A] uppercase">TEMPORADA BETA:</strong>{' '}
                {CURRENT_RANKING_SEASON.resetNotice}
              </span>
            </div>
          )}

          {currentUser && (
            <form
              onSubmit={handleSaveNick}
              className="flex items-center gap-1.5 bg-black border border-[#0dfceb]/40 px-2.5 py-1 rounded shrink-0"
              title="En el Ranking solo se muestra tu Nick público (nunca tu nombre real ni apellidos)"
            >
              <Edit3 className="w-3 h-3 text-[#0dfceb] shrink-0" />
              <span className="text-[9px] text-gray-400 uppercase font-bold whitespace-nowrap">TU NICK:</span>
              <input
                type="text"
                maxLength={28}
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                placeholder="Tu Nick..."
                className="w-28 sm:w-32 bg-[#070a10] border border-gray-700 focus:border-[#FCEE0A] px-2 py-0.5 text-[11px] text-white font-bold outline-none"
              />
              <button
                type="submit"
                disabled={savingNick || nickInput.trim().length < 2}
                className="px-2 py-0.5 bg-[#0dfceb] hover:bg-[#FCEE0A] text-black font-black text-[9px] uppercase cursor-pointer disabled:opacity-40 flex items-center gap-0.5"
              >
                {nickSaved ? <Check className="w-3 h-3" /> : null}
                <span>{nickSaved ? 'OK' : savingNick ? '...' : 'GUARDAR'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Bloque de Progreso de Dificultad del Bot + Puntuación */}
        <div className="py-3 border-b border-gray-800 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <span className="font-black uppercase text-[#0dfceb] flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>PROGRESIÓN DE DIFICULTAD DEL BOT (ELIGE TU RETO):</span>
            </span>
            {currentUser ? (
              <span className="text-gray-400">
                Tus victorias: <strong className="text-[#FCEE0A]">{myWins}</strong>
                {myBotProg.nextTier
                  ? ` • Faltan ${myBotProg.winsToNextLevel} victoria(s) para ${myBotProg.nextTier.name}`
                  : ' • ¡Todos los niveles desbloqueados!'}
              </span>
            ) : (
              <span className="text-gray-500 italic">Inicia sesión para desbloquear niveles y puntuar</span>
            )}
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
                      ? 'bg-[#030509] border-gray-800 opacity-55 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#FCEE0A]/15 border-[#FCEE0A] shadow-[0_0_15px_rgba(252,238,10,0.25)] cursor-pointer'
                      : 'bg-black border-gray-800 hover:border-[#0dfceb] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[11px] font-black uppercase"
                      style={{ color: unlocked ? tier.color : '#6b7280' }}
                    >
                      {unlocked ? tier.shortLabel : `🔒 ${tier.shortLabel}`}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-black border border-gray-800 text-[#FCEE0A]">
                      2-0: +{tier.sweepPoints} ⭐ | 2-1: +{tier.winPoints} ⭐
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 leading-tight font-sans">
                    {unlocked
                      ? tier.description
                      : `Gana ${tier.minWins} partidas al Bot para desbloquear este nivel.`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla Top 25 */}
        <div className="flex-1 overflow-y-auto cyber-scrollbar py-3 pr-1 space-y-2">
          {errorMsg && (
            <div className="bg-[#FF003C]/10 border border-[#FF003C] p-3 rounded text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#FF003C] font-black uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Error cargando el Ranking desde Firestore</span>
              </div>
              <p className="text-gray-300 text-[11px]">{errorMsg}</p>
              <pre className="bg-black border border-gray-800 p-2 text-[10px] text-[#0dfceb] overflow-x-auto">
{`match /simulator_leaderboard/{userId} {
  allow read: if true;
  allow create, update: if request.auth != null && request.auth.uid == userId;
}`}
              </pre>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">
              Conectando con el servidor de Ranking de Night City...
            </div>
          ) : rows.length === 0 && !errorMsg ? (
            <div className="text-center py-12 px-4 bg-black border border-dashed border-gray-800 rounded space-y-2">
              <Sparkles className="w-8 h-8 text-[#FCEE0A] mx-auto opacity-75" />
              <p className="text-sm font-black uppercase text-white">
                ¡LA TABLA ESTÁ ABIERTA — SÉ EL PRIMER #1 DE NIGHT CITY!
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Termina tu primera partida contra el Bot con sesión iniciada para estrenar el Ranking de la Beta.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row) => {
                const isMe = currentUser?.uid && row.userId === currentUser.uid;
                const rankMeta = getRankForPoints(row.points);
                const botTier = getBotDifficultyMeta(row.unlockedBotLevel || 1);
                const avatar = resolveAvatar(row);

                const podiumBorder =
                  row.rank === 1
                    ? 'border-[#FCEE0A] bg-[#FCEE0A]/10 shadow-[0_0_20px_rgba(252,238,10,0.2)]'
                    : row.rank === 2
                    ? 'border-[#0dfceb]/70 bg-[#0dfceb]/5'
                    : row.rank === 3
                    ? 'border-[#FF003C]/70 bg-[#FF003C]/5'
                    : isMe
                    ? 'border-[#0dfceb] bg-[#0dfceb]/10'
                    : 'border-gray-800 bg-black/80';

                return (
                  <div
                    key={row.userId}
                    className={`p-2.5 sm:p-3 border rounded flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 transition-all ${podiumBorder}`}
                  >
                    {/* Izquierda: Posición + Avatar + Nombre/Rango */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center font-black text-sm shrink-0 ${
                          row.rank === 1
                            ? 'bg-[#FCEE0A] text-black'
                            : row.rank === 2
                            ? 'bg-[#0dfceb] text-black'
                            : row.rank === 3
                            ? 'bg-[#FF003C] text-white'
                            : 'bg-[#070a10] border border-gray-800 text-gray-300'
                        }`}
                      >
                        {row.rank === 1 ? <Crown className="w-4 h-4" /> : `#${row.rank}`}
                      </div>

                      <div className="w-9 h-9 bg-black border border-gray-700 shrink-0 overflow-hidden">
                        <AvatarDisplay avatar={avatar} fallbackType="player" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white uppercase truncate max-w-[160px] sm:max-w-[220px]">
                            {row.nickname || row.displayName || 'Netrunner'}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 bg-[#0dfceb] text-black text-[8px] font-black uppercase">
                              TÚ
                            </span>
                          )}
                          {(row.currentStreak || 0) >= 3 && (
                            <span
                              className="px-1.5 py-0.2 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] text-[9px] font-black flex items-center gap-0.5"
                              title={`Racha actual: ${row.currentStreak} victorias seguidas`}
                            >
                              <Flame className="w-2.5 h-2.5" />
                              {row.currentStreak}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[9px] text-gray-400 mt-0.5">
                          <span className="font-bold uppercase" style={{ color: rankMeta.color }}>
                            {rankMeta.emoji} {rankMeta.name}
                          </span>
                          <span>•</span>
                          <span style={{ color: botTier.color }}>{botTier.shortLabel}</span>
                          {row.favoriteDeck && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <span className="hidden md:inline truncate max-w-[180px] text-gray-500">
                                🃏 {row.favoriteDeck}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Derecha: Stats W-L, WR% y Puntos Street Cred */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
                      <div className="text-right text-[10px]">
                        <div className="font-black text-white">
                          <span className="text-[#00FF9C]">{row.wins}V</span>
                          {' - '}
                          <span className="text-[#FF003C]">{row.losses}D</span>
                        </div>
                        <div className="text-[9px] text-gray-400">
                          {row.winRate}% WR
                          {row.cleanSweeps > 0 ? ` • ⚡${row.cleanSweeps} (2-0)` : ''}
                          {row.bestStreak >= 2 ? ` • 🔥${row.bestStreak}` : ''}
                        </div>
                      </div>

                      <div className="px-2.5 py-1.5 bg-[#070a10] border border-[#FCEE0A]/60 rounded text-right min-w-[78px]">
                        <span className="text-sm font-black text-[#FCEE0A] block leading-none">
                          {row.points} ⭐
                        </span>
                        <span className="text-[8px] text-gray-500 uppercase">STREET CRED</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie fijo: Tu posición actual o invitación a iniciar sesión */}
        <div className="border-t border-gray-800 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {currentUser ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-black text-[#FCEE0A]">
                {myRankInfo.emoji} {myRankInfo.name.toUpperCase()} ({myPoints} ⭐)
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-300">
                {myWins}V - {myLosses}D ({computeWinRate(myWins, myLosses)}%)
                {myStreak >= 2 ? ` • Racha 🔥${myStreak}` : ''}
              </span>
              {myRow && aboveRow ? (
                <span className="text-[#0dfceb] font-bold">
                  • ¡A {Math.max(1, aboveRow.points - myRow.points + 1)} ⭐ de superar a {aboveRow.nickname || aboveRow.displayName}!
                </span>
              ) : myRow && myRow.rank === 1 ? (
                <span className="text-[#FCEE0A] font-bold">• 👑 ¡Lideras Night City!</span>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-gray-300">
              <Lock className="w-3.5 h-3.5 text-[#FCEE0A]" />
              <span>Inicia sesión gratis para registrar tus victorias y subir en el Ranking.</span>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-3 py-1 bg-[#FCEE0A] text-black font-black text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>ENTRAR</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onStartRankedBO3 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartRankedBO3();
                }}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-4 py-1.5 bg-[#FCEE0A] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(252,238,10,0.4)]"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>JUGAR RANKED BO3</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
            >
              CERRAR
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
