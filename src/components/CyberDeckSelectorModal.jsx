import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Shield,
  Layers,
  Crown,
  Bot,
  User,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  X,
  Sparkles,
  LogIn,
  ChevronRight,
  Flame,
  Zap,
  RotateCcw,
  Trophy,
  Shuffle,
  FlaskConical,
  Lock
} from 'lucide-react';
import { getBotDifficultyMeta } from '../utils/rankingSystem.js';
import { getUserDecks, deleteUserDeck } from '../utils/firebase.js';
import {
  AVATARS,
  DEFAULT_PLAYER_AVATAR,
  DEFAULT_BOT_AVATAR,
  getRandomBotAvatar
} from '../data/avatars.js';
import {
  pickTowerAdventureRival,
  getRivalAsBotAvatar,
  getTowerRivalDeck,
  TOTAL_TOWER_STAGES
} from '../data/rankedTower.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

/**
 * Componente para mostrar la imagen de un avatar con fallback dinámico
 * Si la imagen aún no existe o da 404, muestra un icono Cyberpunk estilizado con el color del personaje.
 */
export function AvatarDisplay({
  avatar,
  fallbackType = 'player',
  className = 'w-full h-full'
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatar?.id, avatar?.image]);

  if (avatar?.image && !hasError) {
    return (
      <img
        src={avatar.image}
        alt={avatar.name || 'Avatar'}
        onError={() => setHasError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  const color = avatar?.color || (fallbackType === 'bot' ? '#FF003C' : '#0dfceb');
  const FallbackIcon = fallbackType === 'bot' ? Bot : User;

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/80">
      <FallbackIcon className="w-6 h-6" style={{ color }} />
    </div>
  );
}

export default function CyberDeckSelectorModal({
  isOpen,
  onClose,
  currentUser = null,
  metaDecks = [],
  onSelectDecks, // ({ playerDeck, botDeck, playerAvatar, botAvatar, matchMode })
  onOpenAuthModal = null,
  currentSelectedPlayerDeck = null,
  currentSelectedBotDeck = null,
  currentSelectedPlayerAvatar = null,
  currentSelectedBotAvatar = null,
  initialMatchMode = 'practice',
  botDifficulty = 1,
  towerProgressVersion = 0
}) {
  const [matchMode, setMatchMode] = useState(initialMatchMode || 'practice'); // 'arasaka_tower' | 'ranked_bo3' | 'practice'
  const [activeTowerMatchup, setActiveTowerMatchup] = useState(() =>
    pickTowerAdventureRival(currentUser?.uid || null)
  );
  const [activeTab, setActiveTab] = useState('meta'); // 'cloud' | 'meta' | 'local'
  const [userDecks, setUserDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [localDeck, setLocalDeck] = useState(null);

  // Selecciones de mazos
  const [selectedPlayerDeck, setSelectedPlayerDeck] = useState(
    currentSelectedPlayerDeck || metaDecks[0] || null
  );
  const [selectedBotDeck, setSelectedBotDeck] = useState(
    currentSelectedBotDeck || metaDecks[1] || metaDecks[0] || null
  );

  // Selecciones de avatares
  const [selectedPlayerAvatar, setSelectedPlayerAvatar] = useState(
    currentSelectedPlayerAvatar || DEFAULT_PLAYER_AVATAR
  );
  const [selectedBotAvatar, setSelectedBotAvatar] = useState(
    currentSelectedBotAvatar || DEFAULT_BOT_AVATAR
  );

  // Estados para abrir el selector rápido de avatar
  const [isChangingPlayerAvatar, setIsChangingPlayerAvatar] = useState(false);
  const [isChangingBotAvatar, setIsChangingBotAvatar] = useState(false);

  // Mantener sincronizado el rival de la Torre Arasaka cuando cambia el progreso de aventura
  useEffect(() => {
    if (!isOpen) return;
    setActiveTowerMatchup(pickTowerAdventureRival(currentUser?.uid || null));
  }, [isOpen, currentUser?.uid, towerProgressVersion]);

  // Sincronizar selecciones iniciales cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    setMatchMode(initialMatchMode || 'practice');

    if (currentSelectedPlayerDeck) setSelectedPlayerDeck(currentSelectedPlayerDeck);
    else if (!selectedPlayerDeck && metaDecks.length > 0) setSelectedPlayerDeck(metaDecks[0]);

    if (currentSelectedBotDeck) setSelectedBotDeck(currentSelectedBotDeck);
    else if (!selectedBotDeck && metaDecks.length > 1) setSelectedBotDeck(metaDecks[1]);

    if (currentSelectedPlayerAvatar) setSelectedPlayerAvatar(currentSelectedPlayerAvatar);
    if (currentSelectedBotAvatar) {
      setSelectedBotAvatar(currentSelectedBotAvatar);
    } else {
      setSelectedBotAvatar(getRandomBotAvatar('v-chico'));
    }

    if (currentUser?.uid) {
      setLoadingDecks(true);
      getUserDecks(currentUser.uid)
        .then((decks) => {
          setUserDecks(decks);
          if (decks.length > 0) {
            setActiveTab('cloud');
            if (!currentSelectedPlayerDeck) setSelectedPlayerDeck(decks[0]);
          }
        })
        .catch((err) => console.error('Error cargando mazos del usuario:', err))
        .finally(() => setLoadingDecks(false));
    } else {
      setUserDecks([]);
      setActiveTab('meta');
    }

    try {
      const saved = localStorage.getItem('cp_tcg_custom_deck');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cards && parsed.cards.length > 0) {
          setLocalDeck(parsed);
        }
      }
    } catch {}
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleDeleteDeck = async (deckId, e) => {
    e.stopPropagation();
    if (!currentUser?.uid || !window.confirm('¿Deseas eliminar este mazo guardado?')) return;
    try {
      await deleteUserDeck(currentUser.uid, deckId);
      setUserDecks((prev) => prev.filter((d) => d.id !== deckId));
      if (selectedPlayerDeck?.id === deckId) {
        setSelectedPlayerDeck(metaDecks[0] || null);
      }
    } catch (err) {
      alert('Error al eliminar mazo: ' + err.message);
    }
  };

  const handleConfirmStart = () => {
    if (!selectedPlayerDeck) {
      alert('Por favor selecciona un mazo para jugar.');
      return;
    }
    if (matchMode === 'ranked_bo3' && !currentUser?.uid) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    let finalBotDeck = selectedBotDeck || metaDecks[1] || metaDecks[0];
    let finalBotAvatar = selectedBotAvatar || DEFAULT_BOT_AVATAR;
    let finalTowerRival = null;

    const pickRandomMetaDeck = () => {
      if (metaDecks.length === 0) return finalBotDeck;
      let randIdx = Math.floor(Math.random() * metaDecks.length);
      try {
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
          const buf = new Uint32Array(1);
          window.crypto.getRandomValues(buf);
          randIdx = buf[0] % metaDecks.length;
        }
      } catch {}
      return metaDecks[randIdx];
    };

    if (matchMode === 'arasaka_tower') {
      finalTowerRival =
        activeTowerMatchup?.rival || pickTowerAdventureRival(currentUser?.uid || null).rival;
      finalBotDeck = getTowerRivalDeck(finalTowerRival?.id) || pickRandomMetaDeck();
      finalBotAvatar =
        getRivalAsBotAvatar(finalTowerRival) || getRandomBotAvatar(selectedPlayerAvatar?.id || 'v-chico');
    } else if (matchMode === 'ranked_bo3') {
      // En Modo Ranked BO3 (original): mazo Meta aleatorio + avatar aleatorio
      finalBotDeck = pickRandomMetaDeck();
      finalBotAvatar = getRandomBotAvatar(selectedPlayerAvatar?.id || 'v-chico');
    }

    if (onSelectDecks) {
      onSelectDecks({
        playerDeck: selectedPlayerDeck,
        botDeck: finalBotDeck,
        playerAvatar: selectedPlayerAvatar || DEFAULT_PLAYER_AVATAR,
        botAvatar: finalBotAvatar,
        matchMode,
        towerRival: finalTowerRival
      });
    }
    onClose();
  };

  // Helper para contar cartas de un mazo
  const countDeckCards = (deck) => {
    if (!deck) return 0;
    const cards = deck.deckList || deck.cards || [];
    return cards.reduce((acc, c) => acc + (c.qty || 1), 0);
  };

  // Helper para obtener leyendas de un mazo
  const getDeckLegends = (deck) => {
    if (!deck) return [];
    if (deck.legends && deck.legends.length > 0) return deck.legends;
    const cards = deck.deckList || deck.cards || [];
    return cards.filter(
      (c) => c.officialType === 'LEGEND' || (c.cardType || '').toUpperCase().includes('LEGEND')
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#000000]/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono select-none"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-5xl max-h-[92vh] bg-[#070a10] border-2 border-[#0dfceb] p-4 sm:p-6 shadow-[0_0_50px_rgba(13,252,235,0.35)] flex flex-col justify-between text-white overflow-hidden"
      >
        {/* Cabecera Cyberpunk */}
        <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A]">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-white">
                // SALA DE COMBATE // <span className="text-[#0dfceb]">NUEVA PARTIDA</span>
              </h2>
              <span className="text-[10px] text-gray-400 block font-mono">
                ELIGE TU PERSONAJE, TU RIVAL Y LOS MAZOS ANTES DE ENTRAR EN LA ARENA
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
            title="Cerrar preparación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Modo de Juego: AVENTURA TORRE ARASAKA vs RANKED BO3 vs TESTEO */}
        {(() => {
          const diffMeta = getBotDifficultyMeta(botDifficulty);
          const towerRivalPreview = activeTowerMatchup?.rival;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setMatchMode('arasaka_tower')}
                className={`p-2.5 rounded border-2 text-left transition-all cursor-pointer ${
                  matchMode === 'arasaka_tower'
                    ? 'bg-[#FF003C]/15 border-[#FF003C] shadow-[0_0_20px_rgba(255,0,60,0.3)]'
                    : 'bg-black/80 border-gray-800 hover:border-[#FF003C]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#FF003C] flex items-center gap-1">
                    <span>🗼 TORRE ARASAKA</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#FF003C] text-white text-[8px] font-black uppercase">
                    AVENTURA
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-1 font-sans leading-snug">
                  Escala los <strong>11 pisos Arcade</strong> ({towerRivalPreview ? `Piso ${towerRivalPreview.stage}/11: ${towerRivalPreview.shortName}` : 'Pepe → V'}). Cada jefe juega <strong>su mazo exclusivo</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMatchMode('ranked_bo3')}
                className={`p-2.5 rounded border-2 text-left transition-all cursor-pointer ${
                  matchMode === 'ranked_bo3'
                    ? 'bg-[#FCEE0A]/15 border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.28)]'
                    : 'bg-black/80 border-gray-800 hover:border-[#FCEE0A]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#FCEE0A] flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 shrink-0" />
                    <span>RANKED BO3</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-black text-[8px] font-black uppercase">
                    PUNTÚA ⭐
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-1 font-sans leading-snug">
                  BO3 Suizo (<strong>2-0</strong>: +{diffMeta.sweepPoints}⭐ · <strong>2-1</strong>: +{diffMeta.winPoints}⭐). Mazo rival aleatorio ({diffMeta.shortLabel}).
                </p>
                {!currentUser && (
                  <span className="text-[9px] text-[#FF003C] font-bold flex items-center gap-1 mt-1">
                    <Lock className="w-3 h-3" />
                    Requiere iniciar sesión
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMatchMode('practice')}
                className={`p-2.5 rounded border-2 text-left transition-all cursor-pointer ${
                  matchMode === 'practice'
                    ? 'bg-[#0dfceb]/15 border-[#0dfceb] shadow-[0_0_20px_rgba(13,252,235,0.25)]'
                    : 'bg-black/80 border-gray-800 hover:border-[#0dfceb]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#0dfceb] flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                    <span>MODO TESTEO</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 text-gray-300 text-[8px] font-black uppercase">
                    LIBRE
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-1 font-sans leading-snug">
                  Elige tu mazo y el mazo exacto del Bot para probar combos o cartas nuevas sin afectar al Ranking.
                </p>
              </button>
            </div>
          );
        })()}

        {/* Contenido dividido en 2 columnas: Tu Personaje & Mazo (Izquierda) / Rival & Mazo (Derecha) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 overflow-y-auto cyber-scrollbar flex-1 pr-1 my-1">
          
          {/* =========================================================
              COLUMNA 1: TÚ (JUGADOR)
             ========================================================= */}
          <div className="flex flex-col gap-3 bg-[#000000]/80 border border-[#0dfceb]/40 p-3 sm:p-4 rounded">
            {/* Cabecera Columna 1 */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-black uppercase text-[#0dfceb] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0dfceb]" />
                <span>1. TU IDENTIDAD // NETRUNNER</span>
              </span>
              <span className="text-[10px] font-bold text-[#FCEE0A] uppercase">
                {currentUser ? (currentUser.displayName || 'USUARIO CONECTADO') : 'MODO INVITADO'}
              </span>
            </div>

            {/* Ficha del Avatar Seleccionado del Jugador */}
            <div className="bg-[#070a10] border border-[#0dfceb]/50 p-2.5 rounded relative space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black border-2 border-[#0dfceb] shrink-0 overflow-hidden shadow-[0_0_10px_rgba(13,252,235,0.4)]">
                  <AvatarDisplay avatar={selectedPlayerAvatar} fallbackType="player" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white uppercase tracking-wider truncate">
                      {selectedPlayerAvatar.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChangingPlayerAvatar(!isChangingPlayerAvatar)}
                      className="px-2 py-0.5 bg-[#0dfceb]/20 hover:bg-[#0dfceb] text-[#0dfceb] hover:text-black border border-[#0dfceb]/60 text-[9px] font-bold uppercase transition-all cursor-pointer rounded"
                    >
                      {isChangingPlayerAvatar ? 'CERRAR' : 'CAMBIAR'}
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 block truncate font-mono">
                    {selectedPlayerAvatar.title}
                  </span>
                  <span className="text-[9px] text-gray-500 italic block truncate mt-0.5">
                    "{selectedPlayerAvatar.quote}"
                  </span>
                </div>
              </div>

              {/* Selector Desplegable de Personajes del Jugador */}
              {isChangingPlayerAvatar && (
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">
                    Selecciona tu personaje para esta partida:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto cyber-scrollbar pr-1">
                    {AVATARS.map((av) => {
                      const isChosen = selectedPlayerAvatar.id === av.id;
                      return (
                        <div
                          key={`player-av-${av.id}`}
                          onClick={() => {
                            setSelectedPlayerAvatar(av);
                            setIsChangingPlayerAvatar(false);
                          }}
                          className={`p-1.5 rounded border transition-all cursor-pointer flex items-center gap-2 ${
                            isChosen
                              ? 'border-[#0dfceb] bg-[#0dfceb]/20 shadow-[0_0_8px_#0dfceb]'
                              : 'border-gray-800 bg-black hover:border-gray-600'
                          }`}
                        >
                          <div className="w-7 h-7 bg-black border border-gray-700 shrink-0 overflow-hidden">
                            <AvatarDisplay avatar={av} fallbackType="player" />
                          </div>
                          <span className="text-[9px] font-bold text-white truncate uppercase">
                            {av.name.split('//')[0].trim()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SELECCIÓN DE MAZO DEL JUGADOR */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#0dfceb] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#0dfceb]" />
                  <span>TU MAZO DE COMBATE:</span>
                </span>
                <span className="text-[10px] font-bold text-[#FCEE0A] truncate max-w-[140px]">
                  {selectedPlayerDeck ? selectedPlayerDeck.name : 'Ninguno'}
                </span>
              </div>

              {/* Pestañas: Mis Mazos (Nube) | Mazos del Meta | Borrador */}
              <div className="flex items-center gap-1 bg-[#070a10] p-1 border border-gray-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('cloud')}
                  className={`flex-1 py-1 px-1.5 font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'cloud'
                      ? 'bg-[#0dfceb] text-black shadow-[0_0_8px_#0dfceb]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>☁️ MIS MAZOS</span>
                  {userDecks.length > 0 && <span className="text-[9px]">({userDecks.length})</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('meta')}
                  className={`flex-1 py-1 px-1.5 font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'meta'
                      ? 'bg-[#0dfceb] text-black shadow-[0_0_8px_#0dfceb]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>🏆 DEL META</span>
                  <span className="text-[9px]">({metaDecks.length})</span>
                </button>

                {localDeck && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('local')}
                    className={`py-1 px-2 font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'local'
                        ? 'bg-[#0dfceb] text-black shadow-[0_0_8px_#0dfceb]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Mazo temporal en edición del Deckbuilder"
                  >
                    <span>BORRADOR</span>
                  </button>
                )}
              </div>

              {/* Lista de Mazos Disponibles para el Jugador */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto cyber-scrollbar pr-1">
                {activeTab === 'cloud' && (
                  <>
                    {!currentUser ? (
                      <div className="text-center py-5 px-3 bg-[#070a10] border border-dashed border-[#0dfceb]/30 rounded">
                        <Sparkles className="w-5 h-5 text-[#FCEE0A] mx-auto mb-1" />
                        <span className="text-[11px] font-bold text-white block mb-0.5">
                          GUARDA TUS MAZOS EN LA NUBE
                        </span>
                        <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                          Inicia sesión con Google o crea una cuenta para acceder a tus mazos desde cualquier dispositivo.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenAuthModal) onOpenAuthModal('login');
                          }}
                          style={{ clipPath: CYBER_BUTTON }}
                          className="px-3 py-1 bg-[#0dfceb] text-black font-black text-[10px] uppercase cursor-pointer hover:bg-white shadow-[0_0_10px_rgba(13,252,235,0.4)]"
                        >
                          ENTRAR / REGISTRARSE
                        </button>
                      </div>
                    ) : loadingDecks ? (
                      <div className="text-center py-6 text-gray-400 text-xs">
                        Cargando tus mazos desde la nube...
                      </div>
                    ) : userDecks.length === 0 ? (
                      <div className="text-center py-5 px-3 bg-[#070a10] border border-dashed border-gray-800 rounded">
                        <span className="text-[11px] font-bold text-gray-400 block mb-0.5">
                          NO TIENES MAZOS GUARDADOS EN TU CUENTA
                        </span>
                        <p className="text-[9px] text-gray-500 mb-2">
                          Ve al Constructor de Mazos en <strong>/cartas</strong> y pulsa "Guardar Mazo en mi Cuenta".
                        </p>
                        <a
                          href="/cartas"
                          className="text-[10px] text-[#0dfceb] hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Crear mi primer mazo</span>
                        </a>
                      </div>
                    ) : (
                      userDecks.map((deck) => {
                        const isSelected = selectedPlayerDeck?.id === deck.id;
                        const legends = getDeckLegends(deck);
                        return (
                          <div
                            key={deck.id}
                            onClick={() => setSelectedPlayerDeck(deck)}
                            className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_12px_rgba(13,252,235,0.3)]'
                                : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white uppercase truncate">
                                  {deck.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[8px] font-bold">
                                  {deck.faction || 'Arasaka'}
                                </span>
                              </div>
                              <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                                {countDeckCards(deck)} cartas • {legends.length} Leyendas
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isSelected && (
                                <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDeck(deck.id, e)}
                                className="p-1 text-gray-500 hover:text-[#FF003C] transition-colors"
                                title="Eliminar mazo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {activeTab === 'meta' &&
                  metaDecks.map((deck, idx) => {
                    const isSelected =
                      selectedPlayerDeck?.id === deck.id ||
                      (!selectedPlayerDeck?.id && selectedPlayerDeck?.name === deck.name);
                    return (
                      <div
                        key={`player-meta-${deck.id || idx}`}
                        onClick={() => setSelectedPlayerDeck(deck)}
                        className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_12px_rgba(13,252,235,0.3)]'
                            : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white uppercase truncate">
                              {deck.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[8px] font-bold">
                              {deck.tier || 'TIER 1'}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                            {deck.archetype} • {countDeckCards(deck)} cartas
                          </span>
                        </div>

                        {isSelected && (
                          <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })}

                {activeTab === 'local' && localDeck && (
                  <div
                    onClick={() => setSelectedPlayerDeck(localDeck)}
                    className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                      selectedPlayerDeck?.name === localDeck.name
                        ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_12px_rgba(13,252,235,0.3)]'
                        : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white uppercase truncate">
                          {localDeck.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-black text-[#0dfceb] border border-[#0dfceb]/40 text-[8px] font-bold">
                          BORRADOR
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                        {countDeckCards(localDeck)} cartas en tu navegador
                      </span>
                    </div>
                    {selectedPlayerDeck?.name === localDeck.name && (
                      <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================
              COLUMNA 2: RIVAL (IA)
             ========================================================= */}
          <div className="flex flex-col gap-3 bg-[#000000]/80 border border-[#FF003C]/40 p-3 sm:p-4 rounded">
            {/* Cabecera Columna 2 */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-black uppercase text-[#FF003C] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#FF003C]" />
                <span>2. TU OPONENTE // RIVAL IA</span>
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                IA NIGHT CITY
              </span>
            </div>

            {/* Ficha del Avatar Seleccionado del Rival (en Torre Arasaka muestra el jefe del piso actual) */}
            {matchMode === 'arasaka_tower' && activeTowerMatchup?.rival ? (() => {
              const rival = activeTowerMatchup.rival;
              const rivalDiff = getBotDifficultyMeta(rival.botDifficulty);
              return (
                <div className="bg-[#070a10] border-2 border-[#FF003C]/80 p-3 rounded relative space-y-2 shadow-[0_0_22px_rgba(255,0,60,0.22)]">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-black border-2 border-[#FF003C] shrink-0 overflow-hidden shadow-[0_0_12px_rgba(255,0,60,0.45)]">
                      <img
                        src={rival.okImage}
                        alt={rival.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-[#FF003C] text-white text-[9px] font-black uppercase tracking-wider">
                          {activeTowerMatchup.isChampionRematch
                            ? `👑 RETO LEYENDA • PISO ${rival.stage}/${TOTAL_TOWER_STAGES}`
                            : `🗼 TORRE ARASAKA • PISO ${rival.stage}/${TOTAL_TOWER_STAGES}`}
                        </span>
                        <span
                          className="px-1.5 py-0.5 bg-black border text-[9px] font-black uppercase"
                          style={{ color: rivalDiff.color, borderColor: `${rivalDiff.color}88` }}
                        >
                          {rivalDiff.shortLabel}
                        </span>
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-wider truncate block mt-1">
                        {rival.name}
                      </span>
                      <span className="text-[10px] text-[#0dfceb] block truncate font-mono">
                        {rival.title}
                      </span>
                      <span className="text-[10px] text-gray-300 italic block mt-0.5 leading-snug">
                        {rival.tauntQuote}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })() : (
            <div className="bg-[#070a10] border border-[#FF003C]/50 p-2.5 rounded relative space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black border-2 border-[#FF003C] shrink-0 overflow-hidden shadow-[0_0_10px_rgba(255,0,60,0.4)]">
                  <AvatarDisplay avatar={selectedBotAvatar} fallbackType="bot" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white uppercase tracking-wider truncate">
                      {selectedBotAvatar.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChangingBotAvatar(!isChangingBotAvatar)}
                      className="px-2 py-0.5 bg-[#FF003C]/20 hover:bg-[#FF003C] text-[#FF003C] hover:text-white border border-[#FF003C]/60 text-[9px] font-bold uppercase transition-all cursor-pointer rounded"
                    >
                      {isChangingBotAvatar ? 'CERRAR' : 'CAMBIAR'}
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 block truncate font-mono">
                    {selectedBotAvatar.title}
                  </span>
                  <span className="text-[9px] text-gray-500 italic block truncate mt-0.5">
                    "{selectedBotAvatar.quote}"
                  </span>
                </div>
              </div>

              {/* Selector Desplegable de Personajes del Rival */}
              {isChangingBotAvatar && (
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">
                    Selecciona contra quién quieres enfrentarte:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto cyber-scrollbar pr-1">
                    {AVATARS.map((av) => {
                      const isChosen = selectedBotAvatar.id === av.id;
                      return (
                        <div
                          key={`bot-av-${av.id}`}
                          onClick={() => {
                            setSelectedBotAvatar(av);
                            setIsChangingBotAvatar(false);
                          }}
                          className={`p-1.5 rounded border transition-all cursor-pointer flex items-center gap-2 ${
                            isChosen
                              ? 'border-[#FF003C] bg-[#FF003C]/20 shadow-[0_0_8px_#FF003C]'
                              : 'border-gray-800 bg-black hover:border-gray-600'
                          }`}
                        >
                          <div className="w-7 h-7 bg-black border border-gray-700 shrink-0 overflow-hidden">
                            <AvatarDisplay avatar={av} fallbackType="bot" />
                          </div>
                          <span className="text-[9px] font-bold text-white truncate uppercase">
                            {av.name.split('//')[0].trim()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* SELECCIÓN DE MAZO DEL RIVAL */}
            {matchMode === 'arasaka_tower' ? (() => {
              const bossDeck = getTowerRivalDeck(activeTowerMatchup?.rival?.id);
              const bossMainCount = bossDeck
                ? (bossDeck.deckList || []).reduce((s, c) => s + (c.qty || 1), 0)
                : 40;
              return (
                <div className="flex-1 flex flex-col justify-center bg-[#070a10] border-2 border-dashed border-[#FF003C]/65 rounded p-4 text-center space-y-2.5 my-1">
                  <div className="w-12 h-12 rounded-full bg-[#FF003C]/15 border border-[#FF003C] flex items-center justify-center mx-auto text-[#FF003C]">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase text-[#FF003C] tracking-wider">
                    MAZO EXCLUSIVO DEL JEFE DE PISO
                  </h3>
                  {bossDeck ? (
                    <div className="bg-black/85 border border-[#FF003C]/50 rounded p-2.5 space-y-1">
                      <span className="text-xs font-black uppercase text-[#FCEE0A] block">
                        🃏 {bossDeck.name}
                      </span>
                      <span className="text-[10px] text-[#0dfceb] font-bold uppercase block">
                        {bossDeck.faction} • 3 Leyendas + {bossMainCount} Cartas
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                      Este jefe defiende su piso con un mazo del Meta Oficial.
                    </p>
                  )}
                  <div className="bg-black/80 border border-gray-800 rounded p-2.5 text-[10px] text-gray-400 space-y-1 text-left">
                    <div>• <strong className="text-[#FCEE0A]">11 Pisos Arcade:</strong> cada personaje combate con su baraja personalizada hasta llegar a <strong>V</strong>.</div>
                    <div>• <strong className="text-[#0dfceb]">Pantallas YOU WIN / YOU LOSE:</strong> cada jefe reacciona con su ilustración exclusiva al terminar.</div>
                    <div>• <strong className="text-[#00FF9C]">Sin riesgo de Ranking:</strong> juega a tu ritmo sin perder puntos de Street Cred.</div>
                  </div>
                </div>
              );
            })() : matchMode === 'ranked_bo3' ? (
              <div className="flex-1 flex flex-col justify-center bg-[#070a10] border-2 border-dashed border-[#FCEE0A]/60 rounded p-4 text-center space-y-2.5 my-1">
                <div className="w-12 h-12 rounded-full bg-[#FCEE0A]/15 border border-[#FCEE0A] flex items-center justify-center mx-auto text-[#FCEE0A]">
                  <Shuffle className="w-6 h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase text-[#FCEE0A] tracking-wider">
                  MAZO RIVAL ALEATORIO (META OFICIAL)
                </h3>
                <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                  En <strong className="text-white">Ranked BO3</strong> el simulador sortea automáticamente uno de los{' '}
                  <strong>{metaDecks.length} mazos oficiales del meta</strong> para el Bot al iniciar la serie.
                </p>
                <div className="bg-black/80 border border-gray-800 rounded p-2.5 text-[10px] text-gray-400 space-y-1 text-left">
                  <div>• <strong className="text-[#0dfceb]">Formato Suizo BO3:</strong> gana 2 partidas (2-0 o 2-1) para llevarte la serie.</div>
                  <div>• <strong className="text-[#FCEE0A]">Mismos mazos toda la serie:</strong> el perdedor de cada partida elige quién sale primero en la siguiente.</div>
                  <div>• <strong className="text-[#FF003C]">Sin farmeo:</strong> el rival es secreto hasta que empieza la partida 1.</div>
                </div>
              </div>
            ) : (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#FF003C] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#FF003C]" />
                  <span>MAZO DEL RIVAL (DEL META):</span>
                </span>
                <span className="text-[10px] font-bold text-[#FCEE0A] truncate max-w-[140px]">
                  {selectedBotDeck ? selectedBotDeck.name : 'Ninguno'}
                </span>
              </div>

              <span className="text-[10px] text-gray-400 block font-mono">
                Elige la estrategia del meta con la que jugará la IA:
              </span>

              {/* Lista de Mazos Meta para el Bot */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto cyber-scrollbar pr-1">
                {metaDecks.map((deck, idx) => {
                  const isSelected =
                    selectedBotDeck?.id === deck.id ||
                    (!selectedBotDeck?.id && selectedBotDeck?.name === deck.name);
                  return (
                    <div
                      key={`bot-deck-${deck.id || idx}`}
                      onClick={() => setSelectedBotDeck(deck)}
                      className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#FF003C] bg-[#FF003C]/15 shadow-[0_0_12px_rgba(255,0,60,0.3)]'
                          : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white uppercase truncate">
                            {deck.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-black text-[#FF003C] border border-[#FF003C]/40 text-[8px] font-bold">
                            {deck.archetype || 'CONTROL'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                          {countDeckCards(deck)} cartas • Winrate: {deck.winrate || '58%'}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-[#FF003C] text-xs font-black flex items-center gap-0.5 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Barra Inferior de Confirmación e Inicio de Combate */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#0dfceb]/30 pt-3 mt-1">
          <div className="text-[11px] text-gray-300 font-mono text-center sm:text-left flex flex-wrap items-center gap-1.5">
            <span className="text-gray-500 uppercase">
              {matchMode === 'arasaka_tower'
                ? 'Aventura Torre Arasaka:'
                : matchMode === 'ranked_bo3'
                ? 'Serie Ranked BO3:'
                : 'Modo Testeo:'}
            </span>
            <span className="text-[#0dfceb] font-bold">
              {selectedPlayerAvatar.name.split('//')[0].trim()} ({selectedPlayerDeck?.name || 'Mazo'})
            </span>
            <span className="text-[#FCEE0A] font-black">VS</span>
            <span className="text-[#FF003C] font-bold">
              {matchMode === 'arasaka_tower' && activeTowerMatchup?.rival
                ? `🗼 Piso ${activeTowerMatchup.rival.stage}/11: ${activeTowerMatchup.rival.name} (${getTowerRivalDeck(activeTowerMatchup.rival.id)?.name || 'Mazo Exclusivo'})`
                : matchMode === 'ranked_bo3'
                ? '🎲 Rival Aleatorio (Meta Oficial)'
                : `${selectedBotAvatar.name.split('//')[0].trim()} (${selectedBotDeck?.name || 'Mazo'})`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              CANCELAR
            </button>

            <button
              type="button"
              onClick={handleConfirmStart}
              style={{ clipPath: CYBER_BUTTON }}
              className={`flex-1 sm:flex-none px-6 py-2.5 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                matchMode === 'arasaka_tower'
                  ? 'bg-[#FF003C] hover:bg-[#FCEE0A] text-white hover:text-black shadow-[0_0_20px_rgba(255,0,60,0.55)]'
                  : 'bg-[#FCEE0A] hover:bg-[#0dfceb] text-black shadow-[0_0_20px_rgba(252,238,10,0.5)]'
              }`}
            >
              {matchMode === 'ranked_bo3' ? <Trophy className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
              <span>
                {matchMode === 'arasaka_tower'
                  ? activeTowerMatchup?.rival
                    ? `ASALTAR PISO ${activeTowerMatchup.rival.stage}/11 ➔`
                    : 'ASALTAR TORRE ARASAKA ➔'
                  : matchMode === 'ranked_bo3'
                  ? currentUser
                    ? 'INICIAR RANKED BO3 ➔'
                    : 'ENTRAR PARA RANKED ➔'
                  : 'ENTRAR EN MODO TESTEO ➔'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
