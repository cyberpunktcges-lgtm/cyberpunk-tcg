import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Swords,
  Edit3,
  Trash2,
  Copy,
  Check,
  Printer,
  Plus,
  X,
  Search,
  ExternalLink,
  Crown,
  Sparkles
} from 'lucide-react';
import { deleteUserDeck } from '../utils/firebase.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberMyDecksModal({
  isOpen,
  onClose,
  currentUser,
  decks = [],
  onDecksChanged,
  onLoadDeckToBuilder,
  onPrintDeckProxies
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaction, setSelectedFaction] = useState('TODAS');
  const [copiedDeckId, setCopiedDeckId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  // Filtrado de mazos
  const filteredDecks = decks.filter((deck) => {
    const q = searchQuery.trim().toLowerCase();
    const matchName = !q || deck.name?.toLowerCase().includes(q);
    const matchFaction =
      selectedFaction === 'TODAS' ||
      (deck.faction || '').toUpperCase() === selectedFaction.toUpperCase();
    return matchName && matchFaction;
  });

  // Helper para contar cartas de un mazo
  const countDeckCards = (deck) => {
    if (!deck) return 0;
    const cards = deck.deckList || deck.cards || [];
    return cards.reduce((acc, c) => acc + (c.qty || 1), 0);
  };

  // Helper para obtener leyendas
  const getDeckLegends = (deck) => {
    if (!deck) return [];
    if (deck.legends && deck.legends.length > 0) return deck.legends;
    const cards = deck.deckList || deck.cards || [];
    return cards.filter(
      (c) => c.officialType === 'LEGEND' || (c.cardType || '').toUpperCase().includes('LEGEND')
    );
  };

  // Copiar lista de mazo al portapapeles
  const handleCopyDeck = (deck) => {
    const cards = deck.deckList || deck.cards || [];
    const text = cards.map((c) => `${c.qty || 1}x ${c.name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedDeckId(deck.id);
    setTimeout(() => setCopiedDeckId(null), 2500);
  };

  // Probar mazo en simulador
  const handlePlayInSimulator = (deck) => {
    try {
      localStorage.setItem('cp_tcg_custom_deck', JSON.stringify(deck));
    } catch {}
    window.location.href = '/simulador?deck=custom';
  };

  // Editar en Deckbuilder
  const handleEditDeck = (deck) => {
    if (onLoadDeckToBuilder) {
      onLoadDeckToBuilder(deck);
      onClose();
    } else {
      try {
        localStorage.setItem('cp_tcg_custom_deck', JSON.stringify(deck));
      } catch {}
      window.location.href = '/cartas';
    }
  };

  // Crear nuevo mazo
  const handleCreateNewDeck = () => {
    try {
      localStorage.removeItem('cp_tcg_custom_deck');
    } catch {}
    window.location.href = '/cartas';
  };

  // Eliminar mazo
  const handleDeleteDeck = async (deckId) => {
    if (!currentUser?.uid || !window.confirm('¿Seguro que deseas eliminar este mazo de tu cuenta?')) return;
    setDeletingId(deckId);
    try {
      await deleteUserDeck(currentUser.uid, deckId);
      if (onDecksChanged) onDecksChanged();
    } catch (err) {
      alert('Error eliminando mazo: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#000000]/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono select-none"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#070a10] border-2 border-[#FCEE0A] p-4 sm:p-6 shadow-[0_0_50px_rgba(252,238,10,0.3)] flex flex-col justify-between text-white overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#FCEE0A]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-white">
                // TERMINAL NETRUNNER // <span className="text-[#FCEE0A]">MIS MAZOS</span>
              </h2>
              <span className="text-[10px] text-gray-400 block font-mono">
                GESTIONA, EDITA, IMPRIME EN PROXYS Y PRUEBA TUS MAZOS GUARDADOS EN LA NUBE ({decks.length})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewDeck}
              style={{ clipPath: CYBER_BUTTON }}
              className="px-3 py-1.5 bg-[#00F0FF] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_10px_rgba(0,240,255,0.4)]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">CREAR NUEVO MAZO</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="py-3 flex flex-wrap items-center gap-2 border-b border-gray-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mazo por nombre..."
              className="w-full bg-[#000000] border border-gray-800 focus:border-[#FCEE0A] pl-8 pr-3 py-1.5 text-white text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {['TODAS', 'Arasaka', 'Aldecaldos', 'Maelstrom'].map((fac) => (
              <button
                key={`filter-${fac}`}
                type="button"
                onClick={() => setSelectedFaction(fac)}
                className={`px-2 py-1 uppercase font-bold transition-all cursor-pointer ${
                  selectedFaction === fac
                    ? 'bg-[#FCEE0A] text-black'
                    : 'bg-black text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {fac}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Mazos Guardados */}
        <div className="py-3 space-y-3 overflow-y-auto cyber-scrollbar flex-1 pr-1">
          {decks.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#000000] border border-dashed border-gray-800 rounded space-y-3">
              <Sparkles className="w-8 h-8 text-[#FCEE0A] mx-auto opacity-70" />
              <h3 className="text-sm font-black uppercase text-white">
                AÚN NO TIENES MAZOS GUARDADOS EN TU CUENTA
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Ve al Constructor de Mazos en <strong>/cartas</strong>, construye tu estrategia preferida y pulsa <strong>"Guardar en mi Cuenta"</strong> para acceder a ella desde cualquier lugar.
              </p>
              <button
                type="button"
                onClick={handleCreateNewDeck}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-5 py-2 bg-[#FCEE0A] text-black font-black text-xs uppercase cursor-pointer hover:bg-white shadow-[0_0_15px_rgba(252,238,10,0.4)]"
              >
                ➔ IR AL CONSTRUCTOR DE MAZOS
              </button>
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              No hay ningún mazo que coincida con tu búsqueda.
            </div>
          ) : (
            filteredDecks.map((deck) => {
              const legends = getDeckLegends(deck);
              const totalCards = countDeckCards(deck);

              return (
                <div
                  key={deck.id}
                  className="p-3.5 bg-[#000000] border border-gray-800 hover:border-[#FCEE0A]/60 transition-all rounded space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white uppercase tracking-wider">
                          {deck.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[9px] font-bold uppercase">
                          {deck.faction || 'Neutral'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                        {totalCards} cartas en total • {legends.length} Leyendas
                        {deck.updatedAt && ' • Guardado en la nube'}
                      </span>
                    </div>

                    {/* Acciones principales */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePlayInSimulator(deck)}
                        style={{ clipPath: CYBER_BUTTON }}
                        className="px-3 py-1 bg-[#00F0FF] hover:bg-white text-black font-black text-[11px] uppercase flex items-center gap-1 cursor-pointer transition-colors shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                        title="Probar este mazo en el simulador contra bot"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>PROBAR EN SIMULADOR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditDeck(deck)}
                        className="px-2.5 py-1 bg-black border border-gray-700 hover:border-[#00F0FF] text-gray-300 hover:text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                        title="Cargar este mazo en el constructor /cartas para editarlo"
                      >
                        <Edit3 className="w-3 h-3 text-[#00F0FF]" />
                        <span>EDITAR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onPrintDeckProxies) {
                            onPrintDeckProxies(deck);
                          } else {
                            handleEditDeck(deck);
                          }
                        }}
                        className="px-2.5 py-1 bg-black border border-gray-700 hover:border-[#FCEE0A] text-gray-300 hover:text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                        title="Imprimir proxys en PDF A4 estándar Choombattler"
                      >
                        <Printer className="w-3 h-3 text-[#FCEE0A]" />
                        <span>PROXYS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyDeck(deck)}
                        className="p-1 bg-black border border-gray-700 hover:border-white text-gray-400 hover:text-white cursor-pointer"
                        title="Copiar lista de cartas"
                      >
                        {copiedDeckId === deck.id ? (
                          <Check className="w-3.5 h-3.5 text-[#00F0FF]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeck(deck.id)}
                        disabled={deletingId === deck.id}
                        className="p-1 bg-black border border-gray-700 hover:border-[#FF003C] text-gray-400 hover:text-[#FF003C] cursor-pointer disabled:opacity-50"
                        title="Eliminar este mazo de tu cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Vista previa de Leyendas si existen */}
                  {legends.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-[#FCEE0A] uppercase flex items-center gap-1">
                        <Crown className="w-3 h-3 text-[#FCEE0A]" />
                        LEYENDAS:
                      </span>
                      <div className="flex items-center gap-2">
                        {legends.map((leg, idx) => (
                          <div
                            key={`leg-prev-${deck.id}-${idx}`}
                            className="flex items-center gap-1 bg-[#070a10] border border-gray-800 px-1.5 py-0.5 rounded text-[9px] text-gray-300"
                          >
                            {leg.image && (
                              <img src={leg.image} alt={leg.name} className="w-4 h-5 object-cover rounded-xs" />
                            )}
                            <span className="truncate max-w-[120px] font-bold">{leg.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <span className="text-[10px] text-gray-500 font-mono">
            Tus mazos se sincronizan automáticamente con tu cuenta de Google / Firebase.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
          >
            CERRAR
          </button>
        </div>
      </motion.div>
    </div>
  );
}
