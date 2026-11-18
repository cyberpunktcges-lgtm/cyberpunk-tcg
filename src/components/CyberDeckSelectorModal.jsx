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
  LogIn
} from 'lucide-react';
import { getUserDecks, deleteUserDeck } from '../utils/firebase.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberDeckSelectorModal({
  isOpen,
  onClose,
  currentUser = null,
  metaDecks = [],
  onSelectDecks, // ({ playerDeck, botDeck })
  onOpenAuthModal = null,
  currentSelectedPlayerDeck = null,
  currentSelectedBotDeck = null
}) {
  const [activeTab, setActiveTab] = useState('cloud'); // 'cloud' | 'meta' | 'local'
  const [userDecks, setUserDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [localDeck, setLocalDeck] = useState(null);

  // Selecciones actuales
  const [selectedPlayerDeck, setSelectedPlayerDeck] = useState(currentSelectedPlayerDeck || metaDecks[0] || null);
  const [selectedBotDeck, setSelectedBotDeck] = useState(currentSelectedBotDeck || metaDecks[1] || metaDecks[0] || null);

  // Cargar mazos del usuario si está logueado
  useEffect(() => {
    if (!isOpen) return;

    if (currentUser?.uid) {
      setLoadingDecks(true);
      getUserDecks(currentUser.uid)
        .then((decks) => {
          setUserDecks(decks);
          if (decks.length > 0 && !selectedPlayerDeck) {
            setSelectedPlayerDeck(decks[0]);
          }
        })
        .catch((err) => console.error('Error cargando mazos del usuario:', err))
        .finally(() => setLoadingDecks(false));
    } else {
      setUserDecks([]);
    }

    // Cargar mazo temporal de localStorage si existe
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
    if (onSelectDecks) {
      onSelectDecks({
        playerDeck: selectedPlayerDeck,
        botDeck: selectedBotDeck || metaDecks[1] || metaDecks[0]
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
      className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono select-none"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#070a10] border-2 border-[#0dfceb] p-4 sm:p-6 shadow-[0_0_40px_rgba(13,252,235,0.35)] flex flex-col justify-between text-white overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A]">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-white">
                // SALA DE COMBATE // <span className="text-[#0dfceb]">ELEGIR MAZOS</span>
              </h2>
              <span className="text-[10px] text-gray-400 block font-mono">
                SELECCIONA TU BARAJA Y LA BARAJA DE LA IA ANTES DE INICIAR EL DUELO
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido dividido en 2 columnas: Tu Mazo a la izquierda / Mazo de la IA a la derecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 overflow-y-auto cyber-scrollbar flex-1 pr-1 my-2">
          
          {/* =========================================================
              COLUMNA 1: MAZO DEL JUGADOR
             ========================================================= */}
          <div className="flex flex-col gap-2.5 bg-[#000000]/80 border border-[#0dfceb]/40 p-3 rounded">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-black uppercase text-[#0dfceb] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0dfceb]" />
                <span>1. TU MAZO (JUGADOR):</span>
              </span>
              <span className="text-[10px] font-bold text-[#FCEE0A] truncate max-w-[160px]">
                {selectedPlayerDeck ? selectedPlayerDeck.name : 'Ninguno'}
              </span>
            </div>

            {/* Pestañas de origen de mazo: Mis Mazos (Nube) | Mazos del Meta | Local */}
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

            {/* Lista de mazos según la pestaña activa */}
            <div className="space-y-2 max-h-60 overflow-y-auto cyber-scrollbar pr-1">
              {activeTab === 'cloud' && (
                <>
                  {!currentUser ? (
                    <div className="text-center py-6 px-3 bg-[#070a10] border border-dashed border-[#0dfceb]/30 rounded">
                      <Sparkles className="w-6 h-6 text-[#FCEE0A] mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-white block mb-1">
                        GUARDA TUS MAZOS EN LA NUBE
                      </span>
                      <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                        Inicia sesión con Google o crea una cuenta gratis para sincronizar tus mazos entre el PC y el móvil.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenAuthModal) onOpenAuthModal('login');
                        }}
                        style={{ clipPath: CYBER_BUTTON }}
                        className="px-4 py-1.5 bg-[#0dfceb] text-black font-black text-xs uppercase cursor-pointer hover:bg-white shadow-[0_0_12px_rgba(13,252,235,0.4)]"
                      >
                        ENTRAR / REGISTRARSE
                      </button>
                    </div>
                  ) : loadingDecks ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Cargando tus mazos desde la nube...
                    </div>
                  ) : userDecks.length === 0 ? (
                    <div className="text-center py-6 px-3 bg-[#070a10] border border-dashed border-gray-800 rounded">
                      <span className="text-xs font-bold text-gray-400 block mb-1">
                        NO TIENES MAZOS GUARDADOS EN TU CUENTA
                      </span>
                      <p className="text-[10px] text-gray-500 mb-2">
                        Ve al Constructor de Mazos en <strong>/cartas</strong> y pulsa "Guardar Mazo en mi Cuenta".
                      </p>
                      <a
                        href="/cartas"
                        className="text-[11px] text-[#0dfceb] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
                          className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_15px_rgba(13,252,235,0.3)]'
                              : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white uppercase truncate">
                                {deck.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[9px] font-bold">
                                {deck.faction || 'Arasaka'}
                              </span>
                            </div>
                            <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                              {countDeckCards(deck)} cartas • {legends.length} Leyendas
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDeck(deck.id, e)}
                              className="p-1 text-gray-500 hover:text-[#FF003C] transition-colors"
                              title="Eliminar mazo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  const legends = getDeckLegends(deck);
                  return (
                    <div
                      key={deck.id || idx}
                      onClick={() => setSelectedPlayerDeck(deck)}
                      className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_15px_rgba(13,252,235,0.3)]'
                          : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white uppercase truncate">
                            {deck.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[9px] font-bold">
                            {deck.tier || 'TIER 1'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                          {deck.archetype} • {countDeckCards(deck)} cartas
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5 shrink-0">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  );
                })}

              {activeTab === 'local' && localDeck && (
                <div
                  onClick={() => setSelectedPlayerDeck(localDeck)}
                  className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                    selectedPlayerDeck?.name === localDeck.name
                      ? 'border-[#0dfceb] bg-[#0dfceb]/15 shadow-[0_0_15px_rgba(13,252,235,0.3)]'
                      : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase truncate">
                        {localDeck.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-black text-[#0dfceb] border border-[#0dfceb]/40 text-[9px] font-bold">
                        BORRADOR
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                      {countDeckCards(localDeck)} cartas en tu navegador
                    </span>
                  </div>
                  {selectedPlayerDeck?.name === localDeck.name && (
                    <span className="text-[#0dfceb] text-xs font-black flex items-center gap-0.5 shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* =========================================================
              COLUMNA 2: MAZO DEL RIVAL (IA / BOT RAY)
             ========================================================= */}
          <div className="flex flex-col gap-2.5 bg-[#000000]/80 border border-[#FF003C]/40 p-3 rounded">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-black uppercase text-[#FF003C] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#FF003C]" />
                <span>2. MAZO DEL RIVAL (IA / RAY):</span>
              </span>
              <span className="text-[10px] font-bold text-[#FCEE0A] truncate max-w-[160px]">
                {selectedBotDeck ? selectedBotDeck.name : 'Ninguno'}
              </span>
            </div>

            <span className="text-[10px] text-gray-400 leading-tight">
              Elige con qué facción y baraja competirá la IA de Night City contra ti:
            </span>

            {/* Lista de Mazos Disponibles para el Bot */}
            <div className="space-y-2 max-h-60 overflow-y-auto cyber-scrollbar pr-1">
              {metaDecks.map((deck, idx) => {
                const isSelected =
                  selectedBotDeck?.id === deck.id ||
                  (!selectedBotDeck?.id && selectedBotDeck?.name === deck.name);
                return (
                  <div
                    key={`bot-deck-${deck.id || idx}`}
                    onClick={() => setSelectedBotDeck(deck)}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#FF003C] bg-[#FF003C]/15 shadow-[0_0_15px_rgba(255,0,60,0.3)]'
                        : 'border-gray-800 bg-[#070a10] hover:border-gray-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase truncate">
                          {deck.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-black text-[#FF003C] border border-[#FF003C]/40 text-[9px] font-bold">
                          {deck.archetype || 'CONTROL'}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                        {countDeckCards(deck)} cartas • Winrate: {deck.winrate || '58%'}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[#FF003C] text-xs font-black flex items-center gap-0.5 shrink-0">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie del modal con botón de confirmación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#0dfceb]/30 pt-3">
          <div className="text-[11px] text-gray-400 font-mono text-center sm:text-left">
            Duelo preparado: <strong className="text-[#0dfceb]">{selectedPlayerDeck?.name}</strong> vs{' '}
            <strong className="text-[#FF003C]">{selectedBotDeck?.name}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
            >
              CANCELAR
            </button>

            <button
              type="button"
              onClick={handleConfirmStart}
              style={{ clipPath: CYBER_BUTTON }}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#FCEE0A] hover:bg-[#0dfceb] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(252,238,10,0.5)] cursor-pointer transition-all"
            >
              <Swords className="w-4 h-4" />
              <span>INICIAR DUELO CON ESTOS MAZOS ➔</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
