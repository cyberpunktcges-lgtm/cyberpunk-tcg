import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Lock,
  Unlock,
  Users,
  Eye,
  PlusCircle,
  Swords,
  Copy,
  Check,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import CyberPvpChat from './CyberPvpChat.jsx';
import {
  createPvpRoom,
  joinPvpRoom,
  enterPvpSpectator,
  subscribePvpRoomsList,
  subscribeOnlineLobbyPlayers,
  subscribeMyPresence,
  upsertLobbyPresence,
  removeLobbyPresence,
  sendDirectChallenge,
  clearIncomingChallenge,
  setPvpSeatReady,
  updatePvpSeatDeck,
  startPvpD20Duel,
  leavePvpRoom,
  normalizeRoomCode
} from '../utils/pvpService.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BTN =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberPvpLobbyModal({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  playerAvatar,
  selectedDeckName,
  selectedDeckObj,
  availableDecks = [],
  onSelectDeckId,
  selectedDeckId,
  activeRoom,
  mySeat,
  chatMessages = [],
  spectators = [],
  initialRoomCodeFromUrl = '',
  onRoomEntered,
  onRoomExited,
  onOpenAuthModal
}) {
  const [tab, setTab] = useState('rooms'); // 'rooms' | 'create' | 'online'
  const [rooms, setRooms] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Crear sala
  const defaultDisplayName =
    userProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Netrunner';
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [allowSpectatorChat, setAllowSpectatorChat] = useState(true);

  // Unirse por código o contraseña en tarjeta
  const [codeInput, setCodeInput] = useState(initialRoomCodeFromUrl || '');
  const [passwordPromptRoom, setPasswordPromptRoom] = useState(null); // { roomCode, mode: 'join' | 'spectate' }
  const [joinPasswordInput, setJoinPasswordInput] = useState('');

  useEffect(() => {
    if (initialRoomCodeFromUrl) {
      setCodeInput(normalizeRoomCode(initialRoomCodeFromUrl));
    }
  }, [initialRoomCodeFromUrl]);

  // Suscripción a lista de salas, jugadores online y retos entrantes mientras el lobby esté abierto
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    const unsubRooms = subscribePvpRoomsList(
      (list) => setRooms(list),
      (err) => {
        if (String(err?.code || '').includes('permission')) {
          setErrorMsg(
            'Permisos de Firestore pendientes para `pvp_rooms`. Pega las reglas de seguridad de `pvp_rooms` y `pvp_presence` en Firebase Console.'
          );
        }
      }
    );
    const unsubOnline = subscribeOnlineLobbyPlayers((list) => setOnlinePlayers(list));
    const unsubMe = subscribeMyPresence(currentUser.uid, (pres) => {
      const ch = pres?.incomingChallenge;
      if (ch && ch.roomCode && Date.now() - Number(ch.createdAt || 0) < 120_000) {
        setIncomingChallenge(ch);
      } else {
        setIncomingChallenge(null);
      }
    });

    const pushPresence = () =>
      upsertLobbyPresence({
        uid: currentUser.uid,
        name: defaultDisplayName,
        avatarId: userProfile?.avatarId || playerAvatar?.id || 'v-chico',
        avatarImage: userProfile?.avatarImage || playerAvatar?.image || '',
        status: activeRoom ? 'IN_ROOM' : 'LOBBY',
        roomCode: activeRoom?.roomCode || null
      });
    pushPresence();
    const hb = window.setInterval(pushPresence, 28_000);

    return () => {
      unsubRooms();
      unsubOnline();
      unsubMe();
      window.clearInterval(hb);
      if (!activeRoom) {
        removeLobbyPresence(currentUser.uid);
      }
    };
  }, [isOpen, currentUser?.uid, activeRoom?.roomCode, defaultDisplayName]);

  if (!isOpen) return null;

  const myUserPayload = currentUser
    ? {
        uid: currentUser.uid,
        displayName: defaultDisplayName,
        email: currentUser.email || ''
      }
    : null;

  const handleCopy = (text, key) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch {}
  };

  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    if (!myUserPayload || busy) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await createPvpRoom({
        user: myUserPayload,
        roomName: roomName.trim() || `Sala de ${defaultDisplayName}`,
        password: roomPassword,
        allowSpectators,
        allowSpectatorChat,
        deckName: selectedDeckName,
        deckSnapshot: selectedDeckObj,
        avatarId: userProfile?.avatarId || playerAvatar?.id || 'v-chico',
        avatarImage: userProfile?.avatarImage || playerAvatar?.image || ''
      });
      onRoomEntered(res.roomCode, res.seat);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo crear la sala online.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRoom = async (roomCode, password = '') => {
    if (!myUserPayload || busy) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await joinPvpRoom({
        roomCode,
        user: myUserPayload,
        password,
        deckName: selectedDeckName,
        deckSnapshot: selectedDeckObj,
        avatarId: userProfile?.avatarId || playerAvatar?.id || 'v-chico',
        avatarImage: userProfile?.avatarImage || playerAvatar?.image || ''
      });
      setPasswordPromptRoom(null);
      setJoinPasswordInput('');
      onRoomEntered(res.roomCode, res.seat);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo entrar a la sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleSpectateRoom = async (roomCode, password = '') => {
    if (!myUserPayload || busy) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await enterPvpSpectator({
        roomCode,
        user: myUserPayload,
        password
      });
      setPasswordPromptRoom(null);
      setJoinPasswordInput('');
      onRoomEntered(res.roomCode, res.seat);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo entrar como espectador.');
    } finally {
      setBusy(false);
    }
  };

  const handleChallengePlayer = async (targetPlayer) => {
    if (!myUserPayload || busy || !targetPlayer?.uid) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await createPvpRoom({
        user: myUserPayload,
        roomName: `Duelo: ${defaultDisplayName} vs ${targetPlayer.name}`,
        password: '',
        allowSpectators: true,
        allowSpectatorChat: true,
        deckName: selectedDeckName,
        deckSnapshot: selectedDeckObj,
        avatarId: userProfile?.avatarId || playerAvatar?.id || 'v-chico',
        avatarImage: userProfile?.avatarImage || playerAvatar?.image || ''
      });
      await sendDirectChallenge(targetPlayer.uid, {
        fromUid: myUserPayload.uid,
        fromName: defaultDisplayName,
        fromAvatarImage: userProfile?.avatarImage || playerAvatar?.image || '',
        roomCode: res.roomCode,
        roomName: `Duelo vs ${defaultDisplayName}`
      });
      onRoomEntered(res.roomCode, res.seat);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo enviar el reto.');
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptChallenge = async () => {
    if (!incomingChallenge?.roomCode || !currentUser?.uid) return;
    const code = incomingChallenge.roomCode;
    await clearIncomingChallenge(currentUser.uid);
    setIncomingChallenge(null);
    await handleJoinRoom(code, '');
  };

  const handleDeclineChallenge = async () => {
    if (!currentUser?.uid) return;
    await clearIncomingChallenge(currentUser.uid);
    setIncomingChallenge(null);
  };

  const handleLeaveCurrentRoom = async () => {
    if (!activeRoom?.roomCode) return;
    setBusy(true);
    try {
      await leavePvpRoom(activeRoom.roomCode, mySeat, currentUser?.uid);
      onRoomExited();
    } catch (err) {
      setErrorMsg(err?.message || 'Error al salir de la sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchDeckInRoom = async (newDeckId) => {
    if (onSelectDeckId) onSelectDeckId(newDeckId);
    if (!activeRoom?.roomCode || (mySeat !== 'p1' && mySeat !== 'p2')) return;
    const picked = availableDecks.find((d) => String(d.id) === String(newDeckId));
    if (!picked) return;
    try {
      await updatePvpSeatDeck(activeRoom.roomCode, mySeat, picked.name, picked);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo actualizar el mazo.');
    }
  };

  const shareUrl =
    typeof window !== 'undefined' && activeRoom?.roomCode
      ? `${window.location.origin}${window.location.pathname}?room=${activeRoom.roomCode}`
      : '';

  const p1 = activeRoom?.players?.p1 || null;
  const p2 = activeRoom?.players?.p2 || null;
  const myPlayerObj = mySeat === 'p1' ? p1 : mySeat === 'p2' ? p2 : null;
  const bothReady = Boolean(p1?.ready && p2?.ready);

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ clipPath: CYBER_CLIP }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#070b14] border-2 border-[#0dfceb]/80 shadow-[0_0_60px_rgba(13,252,235,0.28)] flex flex-col overflow-hidden"
      >
        {/* Cabecera */}
        <div className="px-4 sm:px-5 py-3 bg-[#0a1020] border-b border-[#0dfceb]/35 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0dfceb] animate-pulse shrink-0" />
            <Globe className="w-4 h-4 text-[#0dfceb] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                {activeRoom
                  ? `SALA ONLINE // ${activeRoom.roomName || activeRoom.roomCode}`
                  : 'NETWATCH ARENA // MULTIJUGADOR ONLINE PVP'}
              </h2>
              <p className="text-[10px] text-gray-400 truncate">
                {activeRoom
                  ? `Código ${activeRoom.roomCode} · ${activeRoom.hasPassword ? '🔒 Con contraseña' : '🔓 Pública'} · 👁️ ${spectators.length} espectadores`
                  : `${rooms.length} sala(s) activa(s) · ${onlinePlayers.length} Netrunner(s) online`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={activeRoom ? handleLeaveCurrentRoom : onClose}
            className="px-2.5 py-1 text-xs font-black uppercase text-gray-400 hover:text-[#FF003C] border border-white/15 hover:border-[#FF003C]/60 rounded cursor-pointer transition-colors"
          >
            {activeRoom ? '🚪 SALIR SALA' : '✕ CERRAR'}
          </button>
        </div>

        {/* Banner de Reto Directo Entrante */}
        {incomingChallenge && !activeRoom && (
          <div className="px-4 py-2.5 bg-[#1b1506] border-b border-[#FCEE0A] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#FCEE0A]">
              <Swords className="w-4 h-4 animate-bounce shrink-0" />
              <span>
                <strong>{incomingChallenge.fromName}</strong> te ha retado a un duelo online ({incomingChallenge.roomCode})!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeclineChallenge}
                className="px-2.5 py-1 text-[10px] font-black uppercase border border-white/20 text-gray-300 hover:text-white rounded cursor-pointer"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={handleAcceptChallenge}
                style={{ clipPath: CYBER_BTN }}
                className="px-3 py-1 text-[10px] font-black uppercase bg-[#FCEE0A] hover:bg-white text-black cursor-pointer"
              >
                ⚡ ACEPTAR RETO
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="px-4 py-2 bg-[#220710] border-b border-[#FF003C] text-[#ff8fa3] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FF003C] shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar">
          {!currentUser?.uid ? (
            /* Pantalla de login requerido */
            <div className="p-8 text-center space-y-4">
              <Globe className="w-12 h-12 text-[#0dfceb] mx-auto opacity-80" />
              <h3 className="text-base font-black uppercase text-white">
                Inicia sesión para entrar al Multijugador Online
              </h3>
              <p className="text-xs text-gray-400 font-sans max-w-md mx-auto">
                Necesitas tu cuenta de Netrunner (Google o Correo) para hostear salas, retar a otros jugadores, entrar como espectador o usar el chat en vivo.
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  style={{ clipPath: CYBER_BTN }}
                  className="px-5 py-2.5 bg-[#0dfceb] hover:bg-white text-[#070a10] font-black text-xs uppercase cursor-pointer shadow-[0_0_24px_rgba(13,252,235,0.5)]"
                >
                  🔐 INICIAR SESIÓN / REGISTRARME
                </button>
              )}
            </div>
          ) : activeRoom ? (
            /* SALA DE ESPERA EN VIVO (LOBBY DE PARTIDA + CHAT) */
            <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-[430px]">
              {/* Izquierda: Slots de jugadores, código, selector de mazo y botón Listo/Empezar */}
              <div className="md:col-span-3 p-4 space-y-4 border-b md:border-b-0 md:border-r border-white/10">
                {/* Código e invitación */}
                <div className="bg-[#0b1222] border border-[#0dfceb]/35 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block">Código de Sala</span>
                    <span className="text-xl font-black tracking-[0.22em] text-[#FCEE0A]">
                      {activeRoom.roomCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(activeRoom.roomCode, 'code')}
                      className="px-2.5 py-1.5 bg-[#121c33] hover:bg-[#1a2847] border border-white/15 text-[10px] font-bold text-gray-200 rounded flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-[#0dfceb]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'code' ? 'COPIADO' : 'CÓDIGO'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(shareUrl, 'link')}
                      className="px-2.5 py-1.5 bg-[#0dfceb]/15 hover:bg-[#0dfceb]/30 border border-[#0dfceb]/50 text-[10px] font-black text-[#0dfceb] rounded flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'link' ? 'ENLACE COPIADO' : 'COPIAR ENLACE'}</span>
                    </button>
                  </div>
                </div>

                {/* Dos asientos: P1 vs P2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { seatKey: 'p1', label: 'ANFITRIÓN (P1)', data: p1, accent: '#0dfceb' },
                    { seatKey: 'p2', label: 'RETADOR (P2)', data: p2, accent: '#FF003C' }
                  ].map(({ seatKey, label, data, accent }) => (
                    <div
                      key={seatKey}
                      className="rounded-lg border p-3 bg-[#090e1a] space-y-2"
                      style={{
                        borderColor: data?.ready ? '#FCEE0A' : `${accent}55`
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                        <span style={{ color: accent }}>{label}</span>
                        {data && (
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              data.ready
                                ? 'bg-[#FCEE0A] text-black'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {data.ready ? '✓ LISTO' : 'PREPARANDO'}
                          </span>
                        )}
                      </div>

                      {data ? (
                        <div className="flex items-center gap-2.5">
                          {data.avatarImage ? (
                            <img
                              src={data.avatarImage}
                              alt={data.name}
                              className="w-10 h-10 rounded-full object-cover border border-white/25 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center text-sm font-black text-white shrink-0">
                              {(data.name || 'N')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">
                              {data.name} {mySeat === seatKey ? '(Tú)' : ''}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              Mazo: <span className="text-gray-200">{data.deckName || 'Mazo'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 text-center text-[11px] text-gray-500 italic">
                          ⏳ Esperando a que se una un oponente...
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cambio rápido de mazo dentro de la sala */}
                {(mySeat === 'p1' || mySeat === 'p2') && availableDecks.length > 0 && (
                  <div className="bg-[#090e1a] border border-white/10 rounded-lg p-3 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 block">
                      Tu mazo para este duelo
                    </label>
                    <select
                      value={selectedDeckId || ''}
                      onChange={(e) => handleSwitchDeckInRoom(e.target.value)}
                      className="w-full bg-[#0e1526] border border-white/20 focus:border-[#0dfceb] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      {availableDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Controles de Listo / Iniciar o Banner de Espectador */}
                {mySeat === 'spectator' ? (
                  <div className="p-3 rounded-lg bg-[#1a1506] border border-[#FCEE0A]/60 text-xs text-[#FCEE0A] flex items-center gap-2">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>
                      Modo Espectador activo (solo visualización). Entrarás al tablero automáticamente en cuanto empiece el duelo.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPvpSeatReady(activeRoom.roomCode, mySeat, !myPlayerObj?.ready)}
                      style={{ clipPath: CYBER_BTN }}
                      className={`px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all ${
                        myPlayerObj?.ready
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/20'
                          : 'bg-[#0dfceb] hover:bg-white text-black shadow-[0_0_20px_rgba(13,252,235,0.5)]'
                      }`}
                    >
                      {myPlayerObj?.ready ? '✕ QUITAR LISTO' : '✓ MARCAR LISTO'}
                    </button>

                    {mySeat === 'p1' && (
                      <button
                        type="button"
                        disabled={!bothReady || busy}
                        onClick={async () => {
                          setBusy(true);
                          setErrorMsg('');
                          try {
                            await startPvpD20Duel(activeRoom.roomCode);
                          } catch (err) {
                            setErrorMsg(err?.message || 'No se pudo iniciar la partida.');
                          } finally {
                            setBusy(false);
                          }
                        }}
                        style={{ clipPath: CYBER_BTN }}
                        className={`px-5 py-2 text-xs font-black uppercase transition-all ${
                          bothReady
                            ? 'bg-[#FCEE0A] hover:bg-white text-black shadow-[0_0_24px_rgba(252,238,10,0.75)] cursor-pointer'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        ⚔️ INICIAR DUELO (TIRAR D20)
                      </button>
                    )}

                    {mySeat === 'p2' && (
                      <span className="text-[10px] text-gray-400">
                        {bothReady
                          ? '⚡ Esperando a que el Anfitrión pulse «Iniciar Duelo»...'
                          : 'Marca LISTO cuando tengas tu mazo elegido.'}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-white/10">
                  <span>
                    Espectadores: {activeRoom.allowSpectators ? `Permitidos (${spectators.length} viendo)` : 'Desactivados'}
                  </span>
                  <button
                    type="button"
                    onClick={handleLeaveCurrentRoom}
                    className="text-gray-400 hover:text-[#FF003C] flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Abandonar sala
                  </button>
                </div>
              </div>

              {/* Derecha: Chat en tiempo real de la sala */}
              <div className="md:col-span-2 h-[360px] md:h-auto min-h-[340px]">
                <CyberPvpChat
                  roomCode={activeRoom.roomCode}
                  messages={chatMessages}
                  currentUser={myUserPayload}
                  mySeat={mySeat}
                  allowSpectatorChat={activeRoom.allowSpectatorChat !== false}
                />
              </div>
            </div>
          ) : (
            /* NAVEGADOR PRINCIPAL DEL LOBBY (SALAS / CREAR / ONLINE) */
            <div className="p-4 space-y-4">
              {/* Pestañas */}
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2.5">
                {[
                  { id: 'rooms', label: `SALAS ACTIVAS (${rooms.length})`, icon: Globe },
                  { id: 'create', label: 'HOSTEAR SALA', icon: PlusCircle },
                  { id: 'online', label: `ONLINE & RETOS (${onlinePlayers.length})`, icon: Users }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTab(id);
                      setErrorMsg('');
                    }}
                    style={{ clipPath: CYBER_BTN }}
                    className={`px-3.5 py-1.5 text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                      tab === id
                        ? 'bg-[#0dfceb] text-[#070a10] shadow-[0_0_16px_rgba(13,252,235,0.5)]'
                        : 'bg-[#0d1424] text-gray-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: LISTA DE SALAS + ENTRAR POR CÓDIGO */}
              {tab === 'rooms' && (
                <div className="space-y-3">
                  {/* Barra rápida para entrar por código */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (codeInput.trim()) handleJoinRoom(codeInput.trim(), '');
                    }}
                    className="flex flex-wrap items-center gap-2 bg-[#0a1020] border border-white/10 rounded-lg p-2.5"
                  >
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      ¿Tienes código?
                    </span>
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(normalizeRoomCode(e.target.value))}
                      placeholder="Ej: NC4K8P"
                      className="w-32 bg-[#060a14] border border-white/20 focus:border-[#0dfceb] rounded px-2.5 py-1 text-xs font-black tracking-widest uppercase text-[#FCEE0A] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!codeInput.trim() || busy}
                      style={{ clipPath: CYBER_BTN }}
                      className="px-3 py-1 bg-[#FCEE0A] hover:bg-white disabled:bg-gray-800 disabled:text-gray-500 text-black font-black text-[10px] uppercase cursor-pointer"
                    >
                      ENTRAR
                    </button>
                    <button
                      type="button"
                      disabled={!codeInput.trim() || busy}
                      onClick={() => codeInput.trim() && handleSpectateRoom(codeInput.trim(), '')}
                      className="px-3 py-1 bg-[#121a2d] hover:bg-[#1c2947] disabled:opacity-40 border border-white/15 text-gray-200 font-bold text-[10px] uppercase rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> VER
                    </button>
                  </form>

                  {/* Lista de salas */}
                  {rooms.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-white/15 rounded-lg bg-[#090e1a]/60 space-y-2">
                      <Globe className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-xs font-bold text-gray-400 uppercase">
                        No hay salas abiertas ahora mismo
                      </p>
                      <p className="text-[11px] font-sans text-gray-500">
                        Crea una sala pública o con contraseña y aparecerá aquí al instante para otros jugadores.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTab('create')}
                        style={{ clipPath: CYBER_BTN }}
                        className="mt-2 px-4 py-1.5 bg-[#0dfceb] hover:bg-white text-black font-black text-[11px] uppercase cursor-pointer"
                      >
                        ➕ HOSTEAR PRIMERA SALA
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rooms.map((r) => {
                        const isMine =
                          r.players?.p1?.uid === currentUser.uid ||
                          r.players?.p2?.uid === currentUser.uid;
                        const playerCount = (r.players?.p1 ? 1 : 0) + (r.players?.p2 ? 1 : 0);
                        const canJoin = isMine || (r.status === 'LOBBY' && playerCount < 2);
                        const canSpec = Boolean(r.allowSpectators) && !isMine;
                        const askingPass = passwordPromptRoom?.roomCode === r.roomCode;

                        return (
                          <div
                            key={r.roomCode}
                            className="bg-[#0a101e] border border-white/15 hover:border-[#0dfceb]/55 rounded-lg p-3 transition-colors space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {r.hasPassword ? (
                                    <Lock className="w-3.5 h-3.5 text-[#FCEE0A] shrink-0" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5 text-[#0dfceb] shrink-0" />
                                  )}
                                  <span className="text-xs font-black text-white truncate">
                                    {r.roomName || `Sala ${r.roomCode}`}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-[#FCEE0A] font-black tracking-wider">
                                    {r.roomCode}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                                      r.status === 'LOBBY'
                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40'
                                        : r.status === 'FINISHED'
                                        ? 'bg-gray-800 text-gray-400'
                                        : 'bg-[#FF003C]/20 text-[#FF003C] border border-[#FF003C]/40'
                                    }`}
                                  >
                                    {r.status === 'LOBBY'
                                      ? `ESPERANDO (${playerCount}/2)`
                                      : r.status === 'FINISHED'
                                      ? 'FINALIZADA'
                                      : '⚔️ EN PARTIDA'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                  Host: <strong className="text-gray-200">{r.players?.p1?.name || 'Anfitrión'}</strong>
                                  {r.players?.p2 ? (
                                    <>
                                      {' '}vs <strong className="text-gray-200">{r.players.p2.name}</strong>
                                    </>
                                  ) : null}
                                  {' · '}
                                  {r.allowSpectators ? '👁️ Espectadores ON' : 'Sin espectadores'}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {canJoin && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      if (!isMine && r.hasPassword) {
                                        setPasswordPromptRoom({ roomCode: r.roomCode, mode: 'join' });
                                        setJoinPasswordInput('');
                                      } else {
                                        handleJoinRoom(r.roomCode, '');
                                      }
                                    }}
                                    style={{ clipPath: CYBER_BTN }}
                                    className="px-3.5 py-1.5 bg-[#0dfceb] hover:bg-white text-black font-black text-[10px] uppercase cursor-pointer"
                                  >
                                    {isMine ? '🔄 RECONECTAR' : '⚡ UNIRSE'}
                                  </button>
                                )}
                                {canSpec && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      if (r.hasPassword) {
                                        setPasswordPromptRoom({ roomCode: r.roomCode, mode: 'spectate' });
                                        setJoinPasswordInput('');
                                      } else {
                                        handleSpectateRoom(r.roomCode, '');
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-[#121a2d] hover:bg-[#1d2b4a] border border-white/15 text-[#FCEE0A] font-black text-[10px] uppercase rounded flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> VER
                                  </button>
                                )}
                              </div>
                            </div>

                            {askingPass && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (passwordPromptRoom.mode === 'spectate') {
                                    handleSpectateRoom(r.roomCode, joinPasswordInput);
                                  } else {
                                    handleJoinRoom(r.roomCode, joinPasswordInput);
                                  }
                                }}
                                className="pt-2 border-t border-white/10 flex items-center gap-2"
                              >
                                <input
                                  type="password"
                                  autoFocus
                                  value={joinPasswordInput}
                                  onChange={(e) => setJoinPasswordInput(e.target.value)}
                                  placeholder="Introduce contraseña de la sala..."
                                  className="flex-1 bg-[#060a14] border border-[#FCEE0A]/60 rounded px-2.5 py-1 text-xs text-white outline-none"
                                />
                                <button
                                  type="submit"
                                  disabled={busy}
                                  className="px-3 py-1 bg-[#FCEE0A] text-black font-black text-[10px] uppercase rounded cursor-pointer"
                                >
                                  CONFIRMAR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPasswordPromptRoom(null)}
                                  className="px-2 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
                                >
                                  ✕
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CREAR / HOSTEAR SALA */}
              {tab === 'create' && (
                <form onSubmit={handleCreateRoom} className="max-w-lg mx-auto space-y-3.5 bg-[#0a101e] border border-white/15 rounded-lg p-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                      Nombre de la sala
                    </label>
                    <input
                      type="text"
                      maxLength={42}
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder={`Sala de ${defaultDisplayName}`}
                      className="w-full bg-[#060a14] border border-white/20 focus:border-[#0dfceb] rounded px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                      Contraseña (opcional — déjalo vacío para sala pública abierta)
                    </label>
                    <input
                      type="password"
                      maxLength={32}
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Sin contraseña (abierta a todos)"
                      className="w-full bg-[#060a14] border border-white/20 focus:border-[#FCEE0A] rounded px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSpectators}
                        onChange={(e) => setAllowSpectators(e.target.checked)}
                        className="accent-[#0dfceb]"
                      />
                      <span>👁️ Permitir espectadores (solo visualización, manos ocultas)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!allowSpectators}
                        checked={allowSpectators && allowSpectatorChat}
                        onChange={(e) => setAllowSpectatorChat(e.target.checked)}
                        className="accent-[#0dfceb]"
                      />
                      <span className={!allowSpectators ? 'opacity-40' : ''}>
                        💬 Permitir que los espectadores escriban en el chat
                      </span>
                    </label>
                  </div>

                  <div className="text-[11px] text-gray-400 bg-black/40 border border-white/10 rounded px-3 py-2">
                    Mazo seleccionado: <strong className="text-[#0dfceb]">{selectedDeckName}</strong>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    style={{ clipPath: CYBER_BTN }}
                    className="w-full py-2.5 bg-[#FCEE0A] hover:bg-white disabled:bg-gray-800 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_24px_rgba(252,238,10,0.5)]"
                  >
                    {busy ? 'CREANDO SALA...' : '🚀 CREAR Y HOSTEAR SALA'}
                  </button>
                </form>
              )}

              {/* TAB 3: NETRUNNERS ONLINE & RETOS DIRECTOS */}
              {tab === 'online' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-sans text-gray-400">
                    Jugadores conectados ahora mismo en el Lobby Online. Puedes enviarles un reto directo con 1 clic.
                  </p>
                  {onlinePlayers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-white/15 rounded-lg">
                      No hay otros Netrunners en el Lobby en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {onlinePlayers.map((u) => {
                        const isSelf = u.uid === currentUser.uid;
                        return (
                          <div
                            key={u.uid}
                            className="bg-[#0a101e] border border-white/15 rounded-lg p-3 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              {u.avatarImage ? (
                                <img
                                  src={u.avatarImage}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-black text-white shrink-0">
                                  {(u.name || 'N')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-black text-white truncate">
                                  {u.name} {isSelf ? '(Tú)' : ''}
                                </div>
                                <div className="text-[9px] text-gray-400 uppercase">
                                  {u.status === 'IN_ROOM'
                                    ? 'En sala de espera'
                                    : u.status === 'PLAYING'
                                    ? 'En partida'
                                    : 'Disponible en Lobby'}
                                </div>
                              </div>
                            </div>

                            {!isSelf && u.status === 'LOBBY' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleChallengePlayer(u)}
                                style={{ clipPath: CYBER_BTN }}
                                className="px-3 py-1.5 bg-[#FF003C] hover:bg-[#FCEE0A] hover:text-black text-white font-black text-[10px] uppercase flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                              >
                                <Swords className="w-3 h-3" /> RETAR
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
