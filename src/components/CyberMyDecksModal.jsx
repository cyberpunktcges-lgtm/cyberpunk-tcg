import React, { useState, useMemo, useRef } from 'react';
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
  Crown,
  Sparkles,
  Upload,
  FileText,
  AlertTriangle,
  Save
} from 'lucide-react';
import { deleteUserDeck, saveUserDeck } from '../utils/firebase.js';
import { parseImportedDeck, replaceDeckImportLine } from '../utils/deckImportParser.js';
import allCardsData from '../data/cards.json';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

const FACTIONS = ['Arasaka', 'Aldecaldos', 'Maelstrom', 'Corpo', 'Mercenario', 'Netrunner', 'Neutral'];

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

  // Estados de la ventana de Importar Mazo
  const [showImportView, setShowImportView] = useState(false);
  const [importDeckName, setImportDeckName] = useState('');
  const [importFaction, setImportFaction] = useState('Neutral');
  const [importRawText, setImportRawText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [isImportingSave, setIsImportingSave] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', text: string }
  const fileInputRef = useRef(null);

  // Parseo en vivo del texto pegado o del archivo cargado
  const parsedImport = useMemo(
    () => parseImportedDeck(importRawText, allCardsData),
    [importRawText]
  );

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
        localStorage.setItem(
          'cp_tcg_custom_deck',
          JSON.stringify({
            id: deck.id || null,
            name: deck.name || 'Mazo Cargado',
            faction: deck.faction || 'Neutral',
            cards: Array.isArray(deck.cards)
              ? deck.cards
              : Array.isArray(deck.deckList)
              ? deck.deckList
              : [],
            sideboard: Array.isArray(deck.sideboard) ? deck.sideboard : []
          })
        );
      } catch {}
      window.location.href = '/cartas?editDeck=1';
    }
  };

  // Crear nuevo mazo
  const handleCreateNewDeck = () => {
    try {
      localStorage.removeItem('cp_tcg_custom_deck');
    } catch {}
    window.location.href = '/cartas';
  };

  // Abrir vista de importación limpia
  const handleOpenImport = () => {
    setImportDeckName('');
    setImportFaction('Neutral');
    setImportRawText('');
    setImportFileName('');
    setImportStatus(null);
    setShowImportView(true);
  };

  // Leer archivo .txt / .dec / .json / .csv seleccionado por el usuario
  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setImportRawText(content);

      // Autocompletar nombre y facción si estaban vacíos
      const preview = parseImportedDeck(content, allCardsData);
      if (!importDeckName.trim()) {
        const cleanFileName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
        setImportDeckName(preview.detectedName || cleanFileName || 'Mazo Importado');
      }
      if (preview.detectedFaction) {
        const matchedFac = FACTIONS.find(
          (f) => f.toLowerCase() === preview.detectedFaction.toLowerCase()
        );
        if (matchedFac) setImportFaction(matchedFac);
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', text: 'No se pudo leer el archivo seleccionado.' });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Manejar pegado/edición de texto con autodetección de nombre y facción
  const handleRawTextChange = (val) => {
    setImportRawText(val);
    setImportStatus(null);
    if (!importDeckName.trim() && val.trim()) {
      const preview = parseImportedDeck(val, allCardsData);
      if (preview.detectedName) setImportDeckName(preview.detectedName);
      if (preview.detectedFaction) {
        const matchedFac = FACTIONS.find(
          (f) => f.toLowerCase() === preview.detectedFaction.toLowerCase()
        );
        if (matchedFac) setImportFaction(matchedFac);
      }
    }
  };

  // Aplicar una sugerencia concreta sobre una línea del texto pegado
  const handleApplySuggestion = (unmatchedItem, chosenCard) => {
    if (!unmatchedItem?.lineNumber || !chosenCard) return;
    setImportRawText((prev) => replaceDeckImportLine(prev, unmatchedItem, chosenCard));
    setImportStatus(null);
  };

  // Autocorregir de golpe todas las líneas que tengan al menos una sugerencia
  const handleAutoFixAllSuggestions = () => {
    const fixable = parsedImport.unmatchedLines.filter(
      (u) => u.lineNumber && u.suggestions && u.suggestions.length > 0
    );
    if (fixable.length === 0) return;
    setImportRawText((prev) => {
      let next = prev;
      fixable.forEach((u) => {
        next = replaceDeckImportLine(next, u, u.suggestions[0].card);
      });
      return next;
    });
    setImportStatus(null);
  };

  // Guardar mazo importado en Mis Mazos (Firebase del usuario) y opcionalmente abrirlo en el constructor
  const handleConfirmImport = async (openInBuilderAfter = false) => {
    if (parsedImport.cards.length === 0 && parsedImport.sideboard.length === 0) {
      setImportStatus({
        type: 'error',
        text: 'No se ha reconocido ninguna carta válida. Pega una lista o elige un archivo .txt compatible.'
      });
      return;
    }

    const finalName = importDeckName.trim() || parsedImport.detectedName || 'Mazo Importado';
    const deckPayload = {
      name: finalName,
      faction: importFaction || parsedImport.detectedFaction || 'Neutral',
      cards: parsedImport.cards,
      sideboard: parsedImport.sideboard
    };

    setIsImportingSave(true);
    setImportStatus(null);
    try {
      let savedDeck = deckPayload;
      if (currentUser?.uid) {
        savedDeck = await saveUserDeck(currentUser.uid, deckPayload);
        if (onDecksChanged) await Promise.resolve(onDecksChanged());
      } else {
        try {
          localStorage.setItem('cp_tcg_custom_deck', JSON.stringify(deckPayload));
        } catch {}
      }

      if (openInBuilderAfter) {
        setShowImportView(false);
        handleEditDeck(savedDeck);
      } else {
        setImportStatus({
          type: 'success',
          text: currentUser?.uid
            ? `¡Mazo "${finalName}" guardado correctamente en Mis Mazos!`
            : `¡Mazo "${finalName}" importado en almacenamiento local! Inicia sesión para sincronizarlo en la nube.`
        });
        setTimeout(() => {
          setShowImportView(false);
          setImportStatus(null);
        }, 900);
      }
    } catch (err) {
      setImportStatus({
        type: 'error',
        text: 'Error guardando el mazo importado: ' + (err?.message || 'Error desconocido')
      });
    } finally {
      setIsImportingSave(false);
    }
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
        <div className="flex items-center justify-between gap-2 border-b border-[#FCEE0A]/30 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded bg-[#FCEE0A]/20 border border-[#FCEE0A] flex items-center justify-center text-[#FCEE0A] shrink-0">
              {showImportView ? <Upload className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-lg uppercase tracking-wider text-white truncate">
                // TERMINAL NETRUNNER //{' '}
                <span className="text-[#FCEE0A]">
                  {showImportView ? 'IMPORTAR MAZO' : 'MIS MAZOS'}
                </span>
              </h2>
              <span className="text-[10px] text-gray-400 block font-mono truncate">
                {showImportView
                  ? 'PEGA UNA LISTA O CARGA UN ARCHIVO .TXT / .DEC / .JSON / .CSV Y GUÁRDALO EN TU CUENTA'
                  : `GESTIONA, IMPORTA, EDITA, IMPRIME EN PROXYS Y PRUEBA TUS MAZOS EN LA NUBE (${decks.length})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!showImportView ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenImport}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-3 py-1.5 bg-[#FCEE0A] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_10px_rgba(252,238,10,0.4)]"
                  title="Importar mazo pegando texto o cargando un archivo .txt"
                >
                  <Upload className="w-4 h-4" />
                  <span>IMPORTAR</span>
                  <span className="hidden sm:inline">MAZO</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateNewDeck}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="px-3 py-1.5 bg-[#00F0FF] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">CREAR NUEVO</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowImportView(false)}
                className="px-3 py-1.5 bg-black border border-gray-700 hover:border-[#FCEE0A] text-gray-300 hover:text-white font-bold text-xs uppercase cursor-pointer"
              >
                ← VOLVER A MIS MAZOS
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================
            VISTA A: VENTANA DE IMPORTACIÓN DE MAZO (PEGAR TEXTO O ARCHIVO TXT)
           ================================================================= */}
        {showImportView ? (
          <div className="py-3 space-y-4 overflow-y-auto cyber-scrollbar flex-1 pr-1 select-text">
            {/* Nombre del Mazo + Facción + Botón Cargar Archivo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#000000] border border-gray-800 p-3.5 rounded">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] font-black text-[#FCEE0A] uppercase block">
                  NOMBRE DEL MAZO *
                </label>
                <input
                  type="text"
                  value={importDeckName}
                  onChange={(e) => setImportDeckName(e.target.value)}
                  placeholder="Ej: Arasaka Control, Johnny Aggro..."
                  className="w-full bg-[#070a10] border border-gray-700 focus:border-[#FCEE0A] px-3 py-2 text-white text-xs outline-none"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-[#00F0FF] uppercase block">
                  FACCIÓN
                </label>
                <select
                  value={importFaction}
                  onChange={(e) => setImportFaction(e.target.value)}
                  className="w-full bg-[#070a10] border border-gray-700 focus:border-[#00F0FF] px-2.5 py-2 text-white text-xs outline-none"
                >
                  {FACTIONS.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex flex-col justify-end space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  O CARGA UN ARCHIVO COMPATIBLE
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.dec,.json,.csv,.md,text/plain"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ clipPath: CYBER_BUTTON }}
                  className="w-full px-3 py-2 bg-[#00F0FF] hover:bg-[#FCEE0A] text-black font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ELEGIR ARCHIVO (.TXT / .JSON)</span>
                </button>
              </div>
            </div>

            {importFileName && (
              <div className="text-[11px] text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/40 px-3 py-1.5 rounded flex items-center justify-between">
                <span>📂 Archivo cargado: <strong>{importFileName}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setImportFileName('');
                    setImportRawText('');
                  }}
                  className="text-gray-400 hover:text-white text-[10px] underline cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* Textarea para pegar el mazo + Previsualización en vivo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-300 uppercase">
                    PEGA AQUÍ LA LISTA DE CARTAS DEL MAZO:
                  </label>
                  <span className="text-[9px] text-gray-500">
                    Acepta: 3x Nombre, 3 Nombre, Nombre x3, CP-054, CSV, JSON y .txt de la web
                  </span>
                </div>
                <textarea
                  rows={11}
                  value={importRawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  placeholder={`// Ejemplo compatible:\n1x Adam Smasher // Ender of Legends\n1x Dexter DeShawn // Off the Grid\n1x Hanako Arasaka // Daughter of the Emperor\n\n3x Sketchy Ripper\n3x 6th Street Recruits\n3x Pyramid Song\n2x Mandibular Upgrade\n\n// Banquillo / Sideboard\n2x Trust No One`}
                  className="w-full bg-[#000000] border border-gray-800 focus:border-[#FCEE0A] p-3 text-xs text-white font-mono leading-relaxed outline-none cyber-scrollbar resize-y"
                />
              </div>

              {/* Previsualización en tiempo real de cartas detectadas */}
              <div className="lg:col-span-5 bg-[#000000] border border-gray-800 rounded p-3 flex flex-col max-h-[300px]">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                  <span className="text-[10px] font-black text-[#FCEE0A] uppercase">
                    CARTAS RECONOCIDAS
                  </span>
                  <span className="text-[10px] font-bold text-[#00F0FF]">
                    {parsedImport.legendsCount} LEY • {parsedImport.mainCount} MAIN • {parsedImport.sideboardCount} SB
                  </span>
                </div>

                {parsedImport.cards.length === 0 && parsedImport.sideboard.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 text-[11px] py-6 px-2">
                    <Layers className="w-6 h-6 mb-2 opacity-40" />
                    Pega una lista o sube un archivo `.txt` para previsualizar las cartas detectadas al instante.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto cyber-scrollbar space-y-1.5 pr-1">
                    {parsedImport.cards.map((c) => {
                      const isLeg = c.officialType === 'LEGEND';
                      return (
                        <div
                          key={`imp-main-${c.id}`}
                          className="flex items-center justify-between gap-2 bg-[#070a10] border border-gray-800 px-2 py-1 rounded text-[10px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {c.image && (
                              <img src={c.image} alt={c.name} className="w-5 h-7 object-cover rounded-xs shrink-0" />
                            )}
                            <span className="font-black text-[#FCEE0A] shrink-0">{c.qty}x</span>
                            <span className="text-white truncate">{c.name}</span>
                          </div>
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                              isLeg ? 'bg-[#FCEE0A]/20 text-[#FCEE0A]' : 'bg-[#00F0FF]/15 text-[#00F0FF]'
                            }`}
                          >
                            {c.officialType || 'CARD'}
                          </span>
                        </div>
                      );
                    })}

                    {parsedImport.sideboard.length > 0 && (
                      <>
                        <div className="text-[9px] font-black text-[#FF003C] uppercase pt-2 border-t border-gray-800">
                          BANQUILLO / SIDEBOARD ({parsedImport.sideboardCount})
                        </div>
                        {parsedImport.sideboard.map((c) => (
                          <div
                            key={`imp-sb-${c.id}`}
                            className="flex items-center justify-between gap-2 bg-[#070a10] border border-[#FF003C]/30 px-2 py-1 rounded text-[10px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {c.image && (
                                <img src={c.image} alt={c.name} className="w-5 h-7 object-cover rounded-xs shrink-0" />
                              )}
                              <span className="font-black text-[#FF003C] shrink-0">{c.qty}x</span>
                              <span className="text-gray-200 truncate">{c.name}</span>
                            </div>
                            <span className="text-[8px] text-gray-400 uppercase shrink-0">SB</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de líneas no reconocidas / ambiguas con autocompletado y sugerencias clicables */}
            {parsedImport.unmatchedLines.length > 0 && (() => {
              const fixableCount = parsedImport.unmatchedLines.filter(
                (u) => u.lineNumber && u.suggestions && u.suggestions.length > 0
              ).length;

              return (
                <div className="bg-[#FF003C]/10 border border-[#FF003C]/50 rounded p-3 text-[11px] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#FF003C] font-black uppercase">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        {parsedImport.unmatchedLines.length} línea(s) por revisar (haz clic en una sugerencia para autocompletarla):
                      </span>
                    </div>

                    {fixableCount > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoFixAllSuggestions}
                        style={{ clipPath: CYBER_BUTTON }}
                        className="px-3 py-1 bg-[#FCEE0A] hover:bg-white text-black font-black text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors shadow-[0_0_10px_rgba(252,238,10,0.4)]"
                        title="Sustituye automáticamente cada línea por su mejor coincidencia sugerida"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AUTOCORREGIR TODAS ({fixableCount})</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-52 overflow-y-auto cyber-scrollbar space-y-2 pr-1">
                    {parsedImport.unmatchedLines.map((u, idx) => {
                      const hasSuggestions = u.suggestions && u.suggestions.length > 0;
                      const isAmbiguous = u.reason === 'ambiguous';

                      return (
                        <div
                          key={`unm-${u.lineNumber ?? idx}-${u.text}`}
                          className="bg-[#070a10] border border-gray-800 rounded p-2 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                            <div className="text-gray-300">
                              {u.lineNumber && (
                                <span className="text-gray-500 mr-1">Línea {u.lineNumber}:</span>
                              )}
                              <span className="text-white font-bold">{u.text}</span>
                            </div>
                            <span
                              className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                                isAmbiguous
                                  ? 'bg-[#FCEE0A]/20 text-[#FCEE0A] border border-[#FCEE0A]/40'
                                  : hasSuggestions
                                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40'
                                  : 'bg-[#FF003C]/20 text-[#FF003C] border border-[#FF003C]/40'
                              }`}
                            >
                              {isAmbiguous
                                ? 'VARIAS COINCIDENCIAS — ELIGE CARTA'
                                : hasSuggestions
                                ? '¿QUISISTE DECIR...?'
                                : 'NO ENCONTRADA (SE OMITIRÁ)'}
                            </span>
                          </div>

                          {hasSuggestions && u.lineNumber && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {u.suggestions.map(({ card: sug }) => {
                                const isLeg = sug.officialType === 'LEGEND';
                                return (
                                  <button
                                    key={`sug-${u.lineNumber}-${sug.id}`}
                                    type="button"
                                    onClick={() => handleApplySuggestion(u, sug)}
                                    className="flex items-center gap-1.5 bg-[#000000] hover:bg-[#FCEE0A] text-white hover:text-black border border-gray-700 hover:border-[#FCEE0A] px-2 py-1 rounded text-[10px] transition-colors cursor-pointer group"
                                    title={`Reemplazar línea ${u.lineNumber} por "${u.hasSbPrefix ? 'SB: ' : ''}${u.qty}x ${sug.name}"`}
                                  >
                                    {sug.image && (
                                      <img
                                        src={sug.image}
                                        alt={sug.name}
                                        className="w-4 h-6 object-cover rounded-xs shrink-0"
                                      />
                                    )}
                                    <span className="font-bold text-left">{sug.name}</span>
                                    <span
                                      className={`text-[8px] px-1 py-0.2 rounded font-black uppercase shrink-0 ${
                                        isLeg
                                          ? 'bg-[#FCEE0A]/25 text-[#FCEE0A] group-hover:bg-black group-hover:text-[#FCEE0A]'
                                          : 'bg-[#00F0FF]/20 text-[#00F0FF] group-hover:bg-black group-hover:text-[#00F0FF]'
                                      }`}
                                    >
                                      {sug.officialType || 'CARD'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Mensaje de estado / éxito / error */}
            {importStatus && (
              <div
                className={`px-3 py-2 rounded border text-xs font-bold ${
                  importStatus.type === 'success'
                    ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]'
                    : 'bg-[#FF003C]/15 border-[#FF003C] text-[#FF003C]'
                }`}
              >
                {importStatus.text}
              </div>
            )}

            {/* Botones de confirmación de importación */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowImportView(false)}
                className="px-4 py-2 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
              >
                CANCELAR
              </button>

              <button
                type="button"
                disabled={isImportingSave || (parsedImport.cards.length === 0 && parsedImport.sideboard.length === 0)}
                onClick={() => handleConfirmImport(true)}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-4 py-2 bg-[#00F0FF] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>GUARDAR Y EDITAR EN CONSTRUCTOR</span>
              </button>

              <button
                type="button"
                disabled={isImportingSave || (parsedImport.cards.length === 0 && parsedImport.sideboard.length === 0)}
                onClick={() => handleConfirmImport(false)}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-5 py-2 bg-[#FCEE0A] hover:bg-white text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(252,238,10,0.4)]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isImportingSave ? 'GUARDANDO...' : 'GUARDAR EN MIS MAZOS'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* =================================================================
             VISTA B: LISTADO DE MIS MAZOS GUARDADOS
             ================================================================= */
          <>
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
                    Crea un mazo en <strong>/cartas</strong> o pulsa <strong>«Importar Mazo»</strong> para pegar una lista o subir un archivo `.txt` directamente a tu cuenta.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenImport}
                      style={{ clipPath: CYBER_BUTTON }}
                      className="px-5 py-2 bg-[#FCEE0A] text-black font-black text-xs uppercase cursor-pointer hover:bg-white shadow-[0_0_15px_rgba(252,238,10,0.4)] flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>IMPORTAR MAZO (.TXT / PEGAR)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewDeck}
                      style={{ clipPath: CYBER_BUTTON }}
                      className="px-5 py-2 bg-[#00F0FF] text-black font-black text-xs uppercase cursor-pointer hover:bg-white"
                    >
                      ➔ IR AL CONSTRUCTOR DE MAZOS
                    </button>
                  </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold text-[#FCEE0A] uppercase flex items-center gap-1">
                            <Crown className="w-3 h-3 text-[#FCEE0A]" />
                            LEYENDAS:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
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
          </>
        )}
      </motion.div>
    </div>
  );
}
