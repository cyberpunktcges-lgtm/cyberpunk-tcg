import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Layers,
  Trophy,
  Newspaper,
  Search,
  Menu,
  X,
  Zap,
  ChevronRight,
  Flame,
  Eye,
  Clock,
  Database,
  Radio,
  Activity,
  Crosshair,
  Swords,
  Sparkles,
  MessageSquare,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  Download,
  Award,
  Filter,
  ArrowUpDown,
  Wrench
} from 'lucide-react';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

/**
 * Botón Cyberpulse:
 * Fondo amarillo (#FCEE0A), texto negro (#070a10), esquina biselada con clip-path
 * y efecto glitch rápido al pasar el ratón con Framer Motion + capas cromáticas (#FF003C / #00F0FF).
 */
function CyberpulseButton({
  children,
  onClick,
  variant = 'primary',
  icon: Icon,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isPrimary = variant === 'primary';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        scale: 1.03,
        x: [0, -3, 3, -2, 2, 0],
        y: [0, 1, -1, 1, 0],
        transition: { duration: 0.22 }
      }}
      whileTap={{ scale: 0.97 }}
      style={{ clipPath: CYBER_CLIP }}
      className={`relative group rounded-none font-mono font-black uppercase tracking-widest text-xs sm:text-sm px-6 py-3.5 cursor-pointer select-none overflow-hidden transition-shadow duration-200 ${
        isPrimary
          ? 'bg-[#FCEE0A] text-[#070a10] hover:shadow-[0_0_25px_rgba(252,238,10,0.75)]'
          : 'bg-[#070a10] text-[#00F0FF] border border-[#00F0FF] hover:bg-[#00F0FF]/15 hover:shadow-[0_0_25px_rgba(0,240,255,0.65)]'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[#FF003C] mix-blend-screen transition-opacity duration-150 ${
          isHovered ? 'opacity-30 translate-x-[2px] -translate-y-[1px]' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[#00F0FF] mix-blend-screen transition-opacity duration-150 ${
          isHovered ? 'opacity-30 -translate-x-[2px] translate-y-[1px]' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 right-0 w-4 h-1 ${
          isPrimary ? 'bg-[#FF003C]' : 'bg-[#FCEE0A]'
        }`}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        <span>{children}</span>
        {Icon && <Icon className="w-4 h-4 stroke-[2.5]" />}
      </span>
    </motion.button>
  );
}

export default function CyberpunkPortal({
  initialCms = {},
  initialCards = [],
  currentPage = 'inicio'
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Datos dinámicos cargados desde el Backend CMS (src/data/cms.json)
  const heroArticle = initialCms.heroArticle || {};
  const recentArticles = initialCms.news || [];
  const topDecks = initialCms.decks || [];
  const tournaments = initialCms.tournaments || [];
  const pastTournaments = initialCms.pastTournaments || [];
  const altArtCards = (initialCms.altArtCards || []).slice(0, 3);
  const forumUrl = initialCms.forumUrl || 'https://foro.cyberpunktcg.es';
  const allCards = initialCards || [];

  // Estados de filtrado de Noticias (Portada y Página /noticias)
  const [selectedFaction, setSelectedFaction] = useState('TODOS');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsSortOrder, setNewsSortOrder] = useState('DESC'); // DESC = más recientes primero
  const [readingArticle, setReadingArticle] = useState(null);

  // Estados del Buscador de Base de Cartas
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardFactionFilter, setCardFactionFilter] = useState('TODOS');
  const [visibleCardsCount, setVisibleCardsCount] = useState(24);
  const [modalCard, setModalCard] = useState(null);

  // Estados del Constructor de Mazos (Deckbuilder en /cartas)
  const [deckbuilderOpen, setDeckbuilderOpen] = useState(true);
  const [customDeckName, setCustomDeckName] = useState('Mi Mazo Edgerunner');
  const [customDeckFaction, setCustomDeckFaction] = useState('NETRUNNER');
  const [customDeckList, setCustomDeckList] = useState([]);
  const [copiedDeck, setCopiedDeck] = useState(false);

  // Cargar y persistir borrador del Constructor de Mazos en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cp_tcg_custom_deck');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setCustomDeckName(parsed.name);
        if (parsed.faction) setCustomDeckFaction(parsed.faction);
        if (Array.isArray(parsed.cards)) setCustomDeckList(parsed.cards);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'cp_tcg_custom_deck',
        JSON.stringify({
          name: customDeckName,
          faction: customDeckFaction,
          cards: customDeckList
        })
      );
    } catch {}
  }, [customDeckName, customDeckFaction, customDeckList]);

  // Funciones del Constructor de Mazos
  const totalDeckCards = customDeckList.reduce((acc, item) => acc + item.qty, 0);

  const handleAddCardToBuilder = (card, e) => {
    if (e) e.stopPropagation();
    setCustomDeckList((prev) => {
      const existing = prev.find((c) => c.id === card.id);
      if (existing) {
        if (existing.qty >= 4) return prev; // Máximo 4 copias por carta
        return prev.map((c) => (c.id === card.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...card, qty: 1 }];
    });
  };

  const handleDecrementCardInBuilder = (cardId) => {
    setCustomDeckList((prev) =>
      prev
        .map((c) => (c.id === cardId ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const handleCopyDeckList = () => {
    const lines = [
      `// MAZO: ${customDeckName.toUpperCase()}`,
      `// FACCIÓN: ${customDeckFaction} | TOTAL: ${totalDeckCards} CARTAS`,
      `// GENERADO EN CYBERPUNK TCG ESPAÑA`,
      '',
      ...customDeckList.map((c) => `${c.qty}x ${c.name} (${c.id}) [${c.faction}]`)
    ];
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    }
    setCopiedDeck(true);
    setTimeout(() => setCopiedDeck(false), 2500);
  };

  const handleDownloadDeckTxt = () => {
    const lines = [
      `// MAZO: ${customDeckName.toUpperCase()}`,
      `// FACCIÓN: ${customDeckFaction} | TOTAL: ${totalDeckCards} CARTAS`,
      '',
      ...customDeckList.map((c) => `${c.qty}x ${c.name} (${c.id}) [${c.faction}]`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customDeckName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Estados de Top Mazos del Meta
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState(topDecks[0]?.cards?.[0] || null);

  // Menú superior multipágina
  const navItems = [
    { id: 'inicio', name: 'Inicio', href: '/', icon: Terminal },
    { id: 'noticias', name: 'Noticias', href: '/noticias', icon: Newspaper, badge: 'LIVE' },
    {
      id: 'cartas',
      name: 'Base de Cartas',
      href: '/cartas',
      icon: Database,
      badge: `${allCards.length}`
    },
    { id: 'mazos', name: 'Mazos', href: '/mazos', icon: Layers, badge: 'META' },
    { id: 'torneos', name: 'Torneos', href: '/torneos', icon: Trophy },
    {
      id: 'foro',
      name: 'Foro',
      href: forumUrl,
      icon: MessageSquare,
      external: true
    }
  ];

  // Categorías únicas de noticias
  const newsCategories = [
    'TODAS',
    ...Array.from(new Set(recentArticles.map((a) => a.category).filter(Boolean)))
  ];

  // Filtrado y orden cronológico de noticias
  const filteredArticles = recentArticles
    .filter((article) => {
      const matchFaction =
        selectedFaction === 'TODOS' || article.faction === selectedFaction;
      const matchCat =
        selectedCategory === 'TODAS' || article.category === selectedCategory;
      const q = newsSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        article.title?.toLowerCase().includes(q) ||
        article.excerpt?.toLowerCase().includes(q) ||
        article.author?.toLowerCase().includes(q);
      return matchFaction && matchCat && matchSearch;
    });

  const sortedArticles =
    newsSortOrder === 'DESC' ? filteredArticles : [...filteredArticles].reverse();

  // Filtrado en tiempo real de las 151 cartas de GitHub
  const filteredDatabaseCards = allCards.filter((card) => {
    const matchesFaction =
      cardFactionFilter === 'TODOS' || card.faction === cardFactionFilter;
    const q = cardSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      card.name.toLowerCase().includes(q) ||
      card.slug.toLowerCase().includes(q) ||
      card.id.toLowerCase().includes(q) ||
      card.faction.toLowerCase().includes(q);
    return matchesFaction && matchesQuery;
  });

  const quickHeaderResults =
    cardSearchQuery.trim().length > 0 ? filteredDatabaseCards.slice(0, 6) : [];

  const activeDeck = topDecks[activeDeckIndex] || topDecks[0];

  const handleSelectDeck = (index) => {
    setActiveDeckIndex(index);
    if (topDecks[index]?.cards?.length > 0) {
      setSelectedCard(topDecks[index].cards[0]);
    }
  };

  // =====================================================================
  // BLOQUES REUTILIZABLES ENTRE INICIO Y PÁGINAS DEDICADAS
  // =====================================================================

  const renderAltArtShowcase = () => {
    if (!altArtCards || altArtCards.length === 0) return null;
    return (
      <section aria-labelledby="alt-art-heading" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              <span>SELECCIÓN ESPECIAL DE LA ADMINISTRACIÓN // NIGHT CITY VAULT</span>
            </div>
            <h2
              id="alt-art-heading"
              className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
            >
              CARTAS DE <span className="text-[#00F0FF]">ARTE ALTERNATIVO</span>
            </h2>
          </div>

          <a
            href="/cartas"
            style={{ clipPath: CYBER_CLIP }}
            className="px-4 py-2.5 bg-[#000000] border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#070a10] font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all rounded-none self-start md:self-auto"
          >
            <span>VER LAS {allCards.length} CARTAS</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {altArtCards.map((card, idx) => (
            <motion.div
              key={card.id || idx}
              onClick={() => setModalCard(card)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{
                y: -10,
                scale: 1.02,
                boxShadow: '0 0 35px rgba(252, 238, 10, 0.45)'
              }}
              style={{ clipPath: CYBER_CLIP }}
              className="group cursor-pointer bg-[#000000] border-2 border-[#FCEE0A]/80 hover:border-[#00F0FF] transition-all duration-300 flex flex-col justify-between overflow-hidden rounded-none relative"
            >
              <div className="p-4 border-b border-gray-800 bg-[#070a10] flex items-center justify-between">
                <span
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-2.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-[10px] uppercase tracking-wider"
                >
                  {card.badge || `ARTE ALTERNATIVO #0${idx + 1}`}
                </span>
                <span className="text-xs font-mono font-bold text-[#00F0FF]">
                  {card.faction}
                </span>
              </div>

              <div className="relative h-96 w-full bg-gradient-to-b from-[#070a10] via-[#000000] to-[#070a10] p-6 flex items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.14),transparent_70%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                <img
                  src={card.image}
                  alt={card.name}
                  className="relative z-10 max-h-full w-auto object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]"
                />
              </div>

              <div className="p-5 bg-[#000000] border-t border-gray-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">
                    {card.artist || 'Edición Especial Coleccionista'}
                  </span>
                  <h3 className="text-base font-black text-white uppercase truncate group-hover:text-[#FCEE0A] transition-colors">
                    {card.name}
                  </h3>
                </div>
                <span className="shrink-0 text-xs font-mono font-bold text-[#00F0FF] group-hover:text-[#FCEE0A] uppercase flex items-center gap-1">
                  <span>INSPECCIONAR</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    );
  };

  const renderMetaDecksSection = (showAllLink = false) => {
    if (!activeDeck) return null;
    const decksToDisplay = showAllLink ? topDecks.slice(0, 3) : topDecks;

    return (
      <section id="mazos" aria-labelledby="decks-heading" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF003C] uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-[#FF003C]" />
              <span>BASE DE DATOS COMPETITIVA // TIER S & A</span>
            </div>
            <h2
              id="decks-heading"
              className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
            >
              {showAllLink ? 'TOP 3 ' : 'TOP '}
              <span className="text-[#00F0FF]">MAZOS DEL META</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {decksToDisplay.map((deck, idx) => {
              const isSelected = idx === activeDeckIndex;
              return (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => handleSelectDeck(idx)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.55)]'
                      : 'bg-[#000000] text-gray-200 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  }`}
                >
                  <span>{deck.rank}</span>
                  <span>{deck.name}</span>
                </button>
              );
            })}

            {showAllLink && (
              <a
                href="/mazos"
                style={{ clipPath: CYBER_CLIP }}
                className="px-4 py-2.5 bg-[#070a10] border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#070a10] font-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all rounded-none"
              >
                <span>PÁGINA DE MAZOS</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="relative overflow-hidden border border-gray-800 bg-[#000000] p-6 sm:p-8 rounded-none"
            >
              <img
                src={activeDeck.bannerWallpaper}
                alt={activeDeck.name}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#070a10]/90 to-transparent" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-2.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs rounded-none"
                    >
                      {activeDeck.rank} // {activeDeck.tier}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
                      {activeDeck.archetype}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white uppercase">
                    {activeDeck.name}
                  </h3>
                  <p className="text-sm text-gray-200 max-w-2xl">
                    {activeDeck.description}
                  </p>
                </div>

                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="bg-[#070a10]/90 border border-gray-800 px-5 py-3 text-right font-mono shrink-0 rounded-none"
                >
                  <span className="text-[10px] text-gray-400 uppercase block">
                    WINRATE CONFIRMADO
                  </span>
                  <span className="text-2xl font-black text-[#FCEE0A]">
                    {activeDeck.winrate}
                  </span>
                  <span className="text-[11px] text-[#00F0FF] block">
                    PILOTO: @{activeDeck.pilot}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {activeDeck.cards?.map((card) => {
                const isActiveCard = selectedCard?.id === card.id;
                return (
                  <motion.div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    whileHover={{
                      scale: 1.05,
                      y: -8,
                      boxShadow: '0 0 28px rgba(0, 240, 255, 0.65)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`group cursor-pointer bg-[#000000] border transition-colors duration-200 flex flex-col justify-between overflow-hidden rounded-none ${
                      isActiveCard
                        ? 'border-[#FCEE0A] shadow-[0_0_24px_rgba(252,238,10,0.45)]'
                        : 'border-gray-800 hover:border-[#00F0FF]'
                    }`}
                  >
                    <div className="relative h-64 w-full overflow-hidden bg-[#070a10] border-b border-gray-800">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors leading-snug">
                        {card.name}
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                        {card.ability}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Carta Featured a la derecha */}
          <aside className="lg:col-span-4">
            <AnimatePresence mode="wait">
              {selectedCard && (
                <motion.div
                  key={selectedCard.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.25 }}
                  style={{ clipPath: CYBER_CLIP }}
                  className="bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] hover:shadow-[0_0_28px_rgba(252,238,10,0.35)] transition-all duration-300 p-6 space-y-5 rounded-none"
                >
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-xs font-mono font-bold uppercase text-[#00F0FF] flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-[#FF003C]" />
                      CARTA DESTACADA // {selectedCard.id}
                    </span>
                    <span className="text-xs font-mono font-black text-[#FCEE0A]">
                      {selectedCard.rarity}
                    </span>
                  </div>

                  <div
                    onClick={() => setModalCard(selectedCard)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="relative h-80 w-full overflow-hidden border border-gray-800 bg-[#070a10] rounded-none cursor-pointer group"
                  >
                    <img
                      src={selectedCard.image}
                      alt={selectedCard.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider">
                      <span>{selectedCard.type}</span>
                      {selectedCard.cost && (
                        <span className="text-[#FCEE0A] font-bold">{selectedCard.cost}</span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white uppercase">
                      {selectedCard.name}
                    </h3>
                    <p className="text-sm text-gray-200 leading-relaxed bg-[#070a10] p-3.5 border border-gray-800">
                      {selectedCard.ability}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </section>
    );
  };

  const renderTournamentsSection = (includeHistory = false) => (
    <div className="space-y-20">
      <section id="torneos" aria-labelledby="tournaments-heading" className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-widest mb-1">
              <Trophy className="w-4 h-4 text-[#FCEE0A]" />
              <span>CIRCUITO COMPETITIVO OFICIAL // ESPAÑA</span>
            </div>
            <h2
              id="tournaments-heading"
              className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
            >
              PRÓXIMOS <span className="text-[#FCEE0A]">TORNEOS</span>
            </h2>
          </div>

          {!includeHistory ? (
            <a
              href="/torneos"
              style={{ clipPath: CYBER_CLIP }}
              className="px-4 py-2.5 bg-[#000000] border border-[#FCEE0A] text-[#FCEE0A] hover:bg-[#FCEE0A] hover:text-[#070a10] font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all rounded-none"
            >
              <span>VER HISTÓRICO Y RESULTADOS</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          ) : (
            <div className="text-xs font-mono text-[#00F0FF] uppercase tracking-wider">
              [CALENDARIO OFICIAL & HISTÓRICO DE CAMPEONES]
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tournaments.map((tour) => (
            <div
              key={tour.id}
              style={{ clipPath: CYBER_CLIP }}
              className="group bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] hover:shadow-[0_0_25px_rgba(252,238,10,0.35)] transition-all duration-300 flex flex-col justify-between overflow-hidden rounded-none"
            >
              <div>
                <div className="relative h-40 w-full overflow-hidden border-b border-gray-800">
                  <img
                    src={tour.image || '/images/wallpapers/Night_City_3840x2160.png'}
                    alt={tour.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent" />
                  <span
                    style={{ clipPath: CYBER_CLIP }}
                    className="absolute top-3 left-3 px-2.5 py-1 bg-[#FF003C] text-white font-mono font-black text-[10px] uppercase tracking-wider"
                  >
                    {tour.status}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors">
                    {tour.name}
                  </h3>

                  <div className="space-y-1.5 text-xs font-mono text-gray-300">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#FCEE0A]" />
                      <span>{tour.date}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>{tour.location}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#FF003C]" />
                      <span>
                        {tour.players} • {tour.format}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 bg-[#070a10] flex items-center justify-between text-xs font-mono">
                <span className="text-[#00F0FF] font-bold truncate">
                  Premios: {tour.prizePool}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {includeHistory && (
        <section id="historico-torneos" aria-labelledby="history-heading" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
                <Award className="w-4 h-4 text-[#00F0FF]" />
                <span>ARCHIVO DE RESULTADOS // HALL OF FAME</span>
              </div>
              <h2
                id="history-heading"
                className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
              >
                HISTÓRICO DE <span className="text-[#00F0FF]">TORNEOS Y MAZOS GANADORES</span>
              </h2>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {pastTournaments.length} TORNEOS REGISTRADOS
            </span>
          </div>

          {pastTournaments.length === 0 ? (
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000] border border-gray-800 p-10 text-center font-mono text-sm text-gray-400"
            >
              Aún no hay torneos finalizados en el histórico. Puedes añadirlos desde el panel /admin.
            </div>
          ) : (
            <div className="space-y-6">
              {pastTournaments.map((hist) => (
                <div
                  key={hist.id}
                  style={{ clipPath: CYBER_CLIP }}
                  className="bg-[#000000] border border-gray-800 hover:border-[#00F0FF] transition-all p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-none"
                >
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <span
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-3 py-1 bg-[#FCEE0A] text-[#070a10] font-black uppercase"
                      >
                        FINALIZADO // {hist.date}
                      </span>
                      <span className="px-3 py-1 bg-[#070a10] border border-gray-800 text-[#00F0FF]">
                        {hist.location}
                      </span>
                      <span className="text-gray-400">{hist.players}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase">
                      {hist.name}
                    </h3>

                    <p className="text-sm text-gray-300 leading-relaxed">
                      {hist.summary}
                    </p>

                    {/* Podio y Mazo Ganador */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div
                        style={{ clipPath: CYBER_CLIP }}
                        className="bg-[#070a10] border border-[#FCEE0A]/60 p-3.5"
                      >
                        <span className="text-[10px] font-mono text-[#FCEE0A] uppercase block">
                          🏆 CAMPEÓN ({hist.score || '1º PUESTO'})
                        </span>
                        <p className="text-sm font-black text-white mt-0.5">{hist.winner}</p>
                        <p className="text-xs font-mono text-[#00F0FF] mt-0.5">
                          Mazo: {hist.winningDeck}
                        </p>
                      </div>

                      {hist.runnerUp && (
                        <div
                          style={{ clipPath: CYBER_CLIP }}
                          className="bg-[#070a10] border border-gray-800 p-3.5"
                        >
                          <span className="text-[10px] font-mono text-gray-400 uppercase block">
                            🥈 FINALISTA (2º PUESTO)
                          </span>
                          <p className="text-xs font-bold text-gray-200 mt-1">{hist.runnerUp}</p>
                        </div>
                      )}

                      {hist.thirdPlace && (
                        <div
                          style={{ clipPath: CYBER_CLIP }}
                          className="bg-[#070a10] border border-gray-800 p-3.5"
                        >
                          <span className="text-[10px] font-mono text-gray-400 uppercase block">
                            🥉 SEMIFINALISTA (3º PUESTO)
                          </span>
                          <p className="text-xs font-bold text-gray-200 mt-1">{hist.thirdPlace}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Carta insignia del mazo campeón */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#070a10] border border-gray-800 p-4">
                    <span className="text-[10px] font-mono text-[#FCEE0A] uppercase tracking-widest mb-2">
                      MAZO CAMPEÓN // {hist.winningFaction || 'META'}
                    </span>
                    {hist.featuredCardImg && (
                      <img
                        src={hist.featuredCardImg}
                        alt={hist.winningDeck}
                        onClick={() =>
                          setModalCard({
                            id: hist.id,
                            name: hist.winningDeck,
                            faction: hist.winningFaction || 'CAMPEÓN',
                            image: hist.featuredCardImg,
                            fileName: 'Carta Insignia del Torneo'
                          })
                        }
                        className="h-56 w-auto object-contain cursor-pointer hover:scale-105 transition-transform"
                      />
                    )}
                    <a
                      href="/mazos"
                      className="mt-3 text-xs font-mono font-bold text-[#00F0FF] hover:text-[#FCEE0A] uppercase flex items-center gap-1"
                    >
                      <span>Ver Mazos del Meta</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans selection:bg-[#FCEE0A] selection:text-[#000000] relative overflow-x-hidden rounded-none flex flex-col justify-between">
      {/* Rejilla Técnica de Fondo Cyberpulse */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 240, 255, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div>
        {/* Barra Superior de Telemetría */}
        <div className="relative z-40 border-b border-gray-800 bg-[#000000] text-xs font-mono">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5 text-[#FCEE0A] font-bold tracking-widest">
                <Radio className="w-3.5 h-3.5 text-[#FF003C] animate-pulse" />
                CYBERPUNK TCG ESPAÑA
              </span>
              <span className="hidden sm:inline text-gray-700">|</span>
              <span className="hidden sm:flex items-center gap-1.5 text-gray-300">
                <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>
                  Bienvenido a Night City, <strong className="text-[#00F0FF]">Edgerunner.</strong>
                </span>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-mono text-gray-300 tracking-wider">
                Cyberpunk TCG Set One -{' '}
                <strong className="text-[#FCEE0A]">Welcome to Night City</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Header Principal Multipágina */}
        <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#070a10]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20 gap-3">
              {/* Logo e Identidad */}
              <a
                href="/"
                style={{ clipPath: CYBER_CLIP }}
                className="flex items-center shrink-0 bg-[#FCEE0A] border border-[#FCEE0A] hover:border-[#00F0FF] shadow-[0_0_20px_rgba(252,238,10,0.35)] hover:shadow-[0_0_25px_rgba(0,240,255,0.55)] transition-all duration-200 overflow-hidden rounded-none"
              >
                <img
                  src="/images/logo-cyberpunk-tcg-españa.jpg"
                  alt="Cyberpunk TCG España"
                  className="h-12 sm:h-14 w-auto object-contain block"
                />
              </a>

              {/* Navegación Desktop (6 apartados) */}
              <nav className="hidden lg:flex items-center space-x-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.external && currentPage === item.id;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      style={{ clipPath: CYBER_CLIP }}
                      className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] xl:text-xs font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 rounded-none border ${
                        isActive
                          ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_15px_rgba(252,238,10,0.45)]'
                          : 'bg-[#000000]/70 text-gray-200 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.name}</span>
                      {item.external && <ExternalLink className="w-3 h-3 opacity-75" />}
                      {item.badge && (
                        <span
                          className={`ml-0.5 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-none ${
                            isActive
                              ? 'bg-[#070a10] text-[#FCEE0A]'
                              : 'bg-[#FF003C] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>

              {/* Buscador Rápido de Cartas en Cabecera */}
              <div className="hidden sm:flex items-center gap-3 relative">
                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="relative bg-[#000000] border border-gray-800 focus-within:border-[#00F0FF] focus-within:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all rounded-none"
                >
                  <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cardSearchQuery}
                    onChange={(e) => setCardSearchQuery(e.target.value)}
                    placeholder="BUSCAR CARTA..."
                    className="w-44 xl:w-56 pl-9 pr-7 py-2 text-xs font-mono bg-transparent text-white placeholder-gray-500 focus:outline-none rounded-none"
                  />
                  {cardSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCardSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF003C] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Desplegable instantáneo con las cartas encontradas */}
                {quickHeaderResults.length > 0 && (
                  <div
                    style={{ clipPath: CYBER_CLIP }}
                    className="absolute top-14 right-0 w-80 bg-[#000000] border border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.5)] p-3 z-50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#FCEE0A] border-b border-gray-800 pb-1.5">
                      <span>CARTAS ENCONTRADAS ({filteredDatabaseCards.length})</span>
                      <a href="/cartas" className="text-[#00F0FF] underline">
                        Ir a Base de Cartas
                      </a>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {quickHeaderResults.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setModalCard(card)}
                          className="w-full flex items-center gap-3 p-1.5 bg-[#070a10] hover:bg-[#FCEE0A]/15 border border-gray-800 hover:border-[#FCEE0A] text-left transition-all cursor-pointer"
                        >
                          <img
                            src={card.image}
                            alt={card.name}
                            className="w-10 h-14 object-cover object-top shrink-0 border border-gray-800"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-[#00F0FF] block">
                              {card.id} // {card.faction}
                            </span>
                            <p className="text-xs font-black text-white uppercase truncate">
                              {card.name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Menú Móvil */}
              <div className="flex lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  style={{ clipPath: CYBER_CLIP }}
                  aria-label="Abrir menú"
                  className="p-2.5 bg-[#000000] text-[#FCEE0A] border border-gray-800 hover:border-[#FCEE0A] rounded-none"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Drawer Móvil */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-800 bg-[#000000] px-4 pt-3 pb-6 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.external && currentPage === item.id;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ clipPath: CYBER_CLIP }}
                      className={`flex items-center justify-between px-4 py-3 text-xs font-mono font-bold uppercase border rounded-none ${
                        isActive
                          ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                          : 'bg-[#070a10] text-gray-200 border-gray-800 hover:border-[#00F0FF]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] bg-[#FF003C] text-white font-black rounded-none">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* =====================================================================
            MODAL VISOR DE CARTA EN ALTA RESOLUCIÓN
           ===================================================================== */}
        <AnimatePresence>
          {modalCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalCard(null)}
              className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ clipPath: CYBER_CLIP }}
                className="max-w-lg w-full bg-[#070a10] border-2 border-[#FCEE0A] shadow-[0_0_45px_rgba(252,238,10,0.45)] p-6 space-y-4 relative rounded-none"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-[#00F0FF] uppercase block">
                      ESCÁNER DE CARTA // {modalCard.id} • {modalCard.faction}
                    </span>
                    <h3 className="text-xl font-black text-white uppercase">
                      {modalCard.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalCard(null)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="p-2 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[#000000] border border-gray-800 p-3 flex items-center justify-center">
                  <img
                    src={modalCard.image}
                    alt={modalCard.name}
                    className="max-h-[460px] w-auto object-contain"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-1">
                  <span>{modalCard.fileName || modalCard.type || 'Carta Oficial Cyberpunk TCG'}</span>
                  {currentPage === 'cartas' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAddCardToBuilder(modalCard);
                        setModalCard(null);
                      }}
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-3 py-1.5 bg-[#FCEE0A] text-[#070a10] font-black uppercase cursor-pointer"
                    >
                      + AÑADIR AL MAZO
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================================
            MODAL LECTOR DE NOTICIA COMPLETA
           ===================================================================== */}
        <AnimatePresence>
          {readingArticle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReadingArticle(null)}
              className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.94, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ clipPath: CYBER_CLIP }}
                className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#070a10] border-2 border-[#00F0FF] shadow-[0_0_45px_rgba(0,240,255,0.35)] rounded-none"
              >
                <div className="relative h-64 w-full overflow-hidden border-b border-gray-800">
                  <img
                    src={readingArticle.image || readingArticle.wallpaper || '/images/wallpapers/Japantown.png'}
                    alt={readingArticle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/50 to-transparent" />
                  <button
                    type="button"
                    onClick={() => setReadingArticle(null)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="absolute top-4 right-4 p-2 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center gap-2">
                    <span
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-3 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase"
                    >
                      {readingArticle.category || readingArticle.tag}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#000000]/90 border border-gray-700 font-mono text-xs text-[#00F0FF]">
                      {readingArticle.faction}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-gray-800 pb-3">
                    <span>AUTOR: @{readingArticle.author}</span>
                    <span>
                      {readingArticle.date} • {readingArticle.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase leading-tight">
                    {readingArticle.title}
                  </h2>

                  <div className="space-y-4 text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    <p>{readingArticle.excerpt}</p>
                    {readingArticle.content && <p>{readingArticle.content}</p>}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================================
            VISTA 1: PÁGINA DE INICIO (/)
           ===================================================================== */}
        {currentPage === 'inicio' && (
          <>
            {/* HERO SECTION */}
            <section id="inicio" aria-labelledby="hero-heading" className="relative border-b border-gray-800">
              <div className="relative min-h-[580px] lg:min-h-[640px] flex items-center overflow-hidden">
                <img
                  src={heroArticle.wallpaper}
                  alt="Night City Cyberpunk 2077 Wallpaper"
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070a10] via-[#070a10]/90 to-[#070a10]/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/45 to-[#000000]/75" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FCEE0A] via-[#FF003C] to-[#00F0FF]" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ clipPath: CYBER_CLIP }}
                      className="lg:col-span-8 bg-[#070a10]/85 backdrop-blur-md border border-gray-800 hover:border-[#FCEE0A] hover:shadow-[0_0_35px_rgba(252,238,10,0.3)] transition-all duration-300 p-6 sm:p-8 lg:p-10 space-y-6 rounded-none relative"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#FCEE0A]" />

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest rounded-none"
                        >
                          {heroArticle.tag}
                        </span>
                        <span
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-none"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          {heroArticle.faction}
                        </span>
                        <span className="text-xs font-mono text-[#00F0FF] ml-auto">
                          ID // {heroArticle.id}
                        </span>
                      </div>

                      <h1
                        id="hero-heading"
                        className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-[1.08]"
                      >
                        {heroArticle.title}
                      </h1>

                      <p className="text-gray-200 text-base sm:text-lg leading-relaxed">
                        {heroArticle.excerpt}
                      </p>

                      {heroArticle.stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {heroArticle.stats.map((stat) => (
                            <div
                              key={stat.label}
                              style={{ clipPath: CYBER_CLIP }}
                              className="bg-[#000000]/80 border border-gray-800 p-3.5 rounded-none"
                            >
                              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                {stat.label}
                              </p>
                              <p className={`text-xl font-mono font-black mt-0.5 ${stat.color}`}>
                                {stat.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-5 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-xs font-mono text-gray-300">
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{ clipPath: CYBER_CLIP }}
                              className="w-9 h-9 bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] font-black flex items-center justify-center rounded-none"
                            >
                              ZC
                            </div>
                            <div>
                              <p className="text-white font-bold">{heroArticle.author}</p>
                              <p className="text-[11px] text-gray-400">{heroArticle.role}</p>
                            </div>
                          </div>
                          <span className="hidden sm:inline text-gray-700">|</span>
                          <span className="flex items-center gap-1 text-gray-300">
                            <Clock className="w-3.5 h-3.5 text-[#FCEE0A]" />
                            {heroArticle.readTime}
                          </span>
                          <span className="flex items-center gap-1 text-gray-300">
                            <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
                            {heroArticle.views}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <a href="/cartas">
                            <CyberpulseButton variant="primary" icon={ChevronRight}>
                              EXPLORAR BASE DE CARTAS
                            </CyberpulseButton>
                          </a>
                        </div>
                      </div>
                    </motion.div>

                    {/* Columna Derecha Hero: Carta MVP */}
                    <motion.div
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                      whileHover={{ scale: 1.02 }}
                      style={{ clipPath: CYBER_CLIP }}
                      className="lg:col-span-4 bg-[#070a10]/90 backdrop-blur-md border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_30px_rgba(0,240,255,0.45)] transition-all duration-300 p-5 space-y-4 rounded-none"
                    >
                      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FCEE0A] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#FCEE0A]" />
                          CARTA MVP // SET ONE
                        </span>
                        <span
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-2 py-0.5 text-[10px] font-mono font-black bg-[#00F0FF] text-[#070a10] rounded-none"
                        >
                          TIER S+
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setModalCard({
                            id: 'MVP-01',
                            name: 'Alt Cunningham // Soulkiller Architect',
                            faction: 'NETRUNNER',
                            image: heroArticle.featuredCardImg
                          })
                        }
                        style={{ clipPath: CYBER_CLIP }}
                        className="relative h-80 w-full overflow-hidden border border-gray-800 bg-[#000000] rounded-none group cursor-pointer"
                      >
                        <img
                          src={heroArticle.featuredCardImg}
                          alt="Alt Cunningham Soulkiller Architect"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-24">
              {/* 1. ÚLTIMAS NOTICIAS EN PORTADA */}
              <section id="noticias" aria-labelledby="news-heading" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-widest mb-1">
                      <Newspaper className="w-4 h-4 text-[#FCEE0A]" />
                      <span>FEED DE INFORMACIÓN // NIGHT CITY NET</span>
                    </div>
                    <h2
                      id="news-heading"
                      className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
                    >
                      ÚLTIMAS <span className="text-[#FCEE0A]">NOTICIAS</span>
                    </h2>
                  </div>

                  <a
                    href="/noticias"
                    style={{ clipPath: CYBER_CLIP }}
                    className="px-4 py-2.5 bg-[#FCEE0A] text-[#070a10] hover:bg-[#00F0FF] font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all rounded-none self-start md:self-auto"
                  >
                    <span>VER ARCHIVO COMPLETO DE NOTICIAS</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentArticles.slice(0, 4).map((article, idx) => (
                    <motion.article
                      key={article.id}
                      onClick={() => setReadingArticle(article)}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: idx * 0.06 }}
                      whileHover={{ y: -6 }}
                      style={{ clipPath: CYBER_CLIP }}
                      className="group cursor-pointer bg-[#000000] border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300 flex flex-col justify-between overflow-hidden rounded-none"
                    >
                      <div>
                        <div className="relative h-44 w-full overflow-hidden border-b border-gray-800">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/30 to-transparent" />
                          <span
                            style={{ clipPath: CYBER_CLIP }}
                            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-[#FCEE0A] text-[#070a10] rounded-none"
                          >
                            {article.category}
                          </span>
                          <span className="absolute bottom-2 right-3 text-[10px] font-mono text-gray-300 bg-[#070a10]/90 px-2 py-0.5 border border-gray-800">
                            {article.faction}
                          </span>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                            <span>@{article.author}</span>
                            <span>{article.date}</span>
                          </div>

                          <h3 className="text-base font-black text-white uppercase leading-snug group-hover:text-[#FCEE0A] transition-colors">
                            {article.title}
                          </h3>

                          <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                            {article.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 py-3.5 border-t border-gray-800 bg-[#070a10] flex items-center justify-between text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                          {article.readTime}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-[#FCEE0A] group-hover:text-[#00F0FF] transition-colors uppercase">
                          <span>LEER MÁS</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>

              {/* 2. TRES CARTAS DE ARTE ALTERNATIVO (ELEGIDAS DESDE /admin) */}
              {renderAltArtShowcase()}

              {/* 3. TOP 3 MAZOS DEL META */}
              {renderMetaDecksSection(true)}

              {/* 4. PRÓXIMOS TORNEOS */}
              {renderTournamentsSection(false)}
            </main>
          </>
        )}

        {/* =====================================================================
            VISTA 2: PÁGINA DEDICADA DE NOTICIAS (/noticias)
           ===================================================================== */}
        {currentPage === 'noticias' && (
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
            <div className="border-b border-gray-800 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-widest mb-1">
                  <Newspaper className="w-4 h-4 text-[#FCEE0A]" />
                  <span>ARCHIVO CRONOLÓGICO // NIGHT CITY PRESS</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  TODAS LAS <span className="text-[#FCEE0A]">NOTICIAS</span>
                </h1>
              </div>

              {/* Buscador y Orden Cronológico */}
              <div className="flex flex-wrap items-center gap-3">
                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="relative bg-[#000000] border border-gray-800 focus-within:border-[#00F0FF]"
                >
                  <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newsSearchQuery}
                    onChange={(e) => setNewsSearchQuery(e.target.value)}
                    placeholder="Buscar titular o autor..."
                    className="pl-9 pr-4 py-2.5 text-xs font-mono bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setNewsSortOrder(newsSortOrder === 'DESC' ? 'ASC' : 'DESC')}
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-4 py-2.5 bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] text-xs font-mono font-bold text-[#FCEE0A] uppercase flex items-center gap-2 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{newsSortOrder === 'DESC' ? 'ORDEN: MÁS RECIENTES' : 'ORDEN: MÁS ANTIGUAS'}</span>
                </button>
              </div>
            </div>

            {/* Filtros por Categoría y por Facción */}
            <div className="bg-[#000000] border border-gray-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-gray-400 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#FCEE0A]" /> CATEGORÍA:
                </span>
                {newsCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`px-3.5 py-1.5 font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                        : 'bg-[#070a10] text-gray-300 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-xs pt-2 border-t border-gray-800">
                <span className="text-gray-400 mr-2">FACCIÓN:</span>
                {['TODOS', 'NETRUNNER', 'CORPO', 'BANDAS', 'MERCENARIO'].map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setSelectedFaction(fac)}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`px-3.5 py-1.5 font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                      selectedFaction === fac
                        ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                        : 'bg-[#070a10] text-gray-300 border-gray-800 hover:border-[#FCEE0A] hover:text-[#FCEE0A]'
                    }`}
                  >
                    {fac}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado Cronológico de Noticias */}
            {sortedArticles.length === 0 ? (
              <div className="bg-[#000000] border border-gray-800 p-12 text-center font-mono text-gray-400">
                No hay noticias que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedArticles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => setReadingArticle(article)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="group cursor-pointer bg-[#000000] border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_25px_rgba(0,240,255,0.35)] transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      <div className="relative h-48 w-full overflow-hidden border-b border-gray-800">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span
                          style={{ clipPath: CYBER_CLIP }}
                          className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-mono font-black uppercase bg-[#FCEE0A] text-[#070a10]"
                        >
                          {article.category}
                        </span>
                        <span className="absolute bottom-2 right-3 text-[10px] font-mono text-[#00F0FF] bg-[#070a10]/90 px-2 py-0.5 border border-gray-800">
                          {article.faction}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>@{article.author}</span>
                          <span className="text-[#FCEE0A]">{article.date}</span>
                        </div>
                        <h2 className="text-lg font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {article.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-gray-800 bg-[#070a10] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">{article.readTime}</span>
                      <span className="text-[#00F0FF] font-bold uppercase flex items-center gap-1">
                        <span>LEER ARTÍCULO</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        )}

        {/* =====================================================================
            VISTA 3: BASE DE CARTAS + CONSTRUCTOR DE MAZOS (/cartas)
           ===================================================================== */}
        {currentPage === 'cartas' && (
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-gray-800 pb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
                  <Database className="w-4 h-4 text-[#00F0FF]" />
                  <span>CATÁLOGO OFICIAL ({allCards.length} CARTAS) + DECKBUILDER</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  BASE DE <span className="text-[#00F0FF]">CARTAS</span> &{' '}
                  <span className="text-[#FCEE0A]">CONSTRUCTOR</span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="relative bg-[#000000] border-2 border-[#FCEE0A] focus-within:border-[#00F0FF] flex-1 sm:w-72"
                >
                  <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cardSearchQuery}
                    onChange={(e) => {
                      setCardSearchQuery(e.target.value);
                      setVisibleCardsCount(24);
                    }}
                    placeholder="Buscar carta (Smasher, Lucy, Arasaka)..."
                    className="w-full pl-10 pr-8 py-2.5 text-xs font-mono bg-transparent text-white placeholder-gray-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setDeckbuilderOpen(!deckbuilderOpen)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-4 py-3 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border ${
                    deckbuilderOpen
                      ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                      : 'bg-[#000000] text-[#00F0FF] border-[#00F0FF]'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>
                    CONSTRUCTOR DE MAZOS ({totalDeckCards}/50)
                  </span>
                </button>
              </div>
            </div>

            {/* Filtros de Facción */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {['TODOS', 'CORPO', 'NETRUNNER', 'BANDAS', 'MERCENARIO'].map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => {
                      setCardFactionFilter(fac);
                      setVisibleCardsCount(24);
                    }}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`px-4 py-2 font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      cardFactionFilter === fac
                        ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                        : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#FCEE0A] hover:text-[#FCEE0A]'
                    }`}
                  >
                    {fac}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-gray-400">
                Pulsa <strong className="text-[#FCEE0A]">+ MAZO</strong> en cualquier carta para añadirla a tu lista
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Catálogo de Cartas */}
              <div className={deckbuilderOpen ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 ${
                    deckbuilderOpen ? 'md:grid-cols-4' : 'md:grid-cols-6'
                  } gap-4`}
                >
                  {filteredDatabaseCards.slice(0, visibleCardsCount).map((card) => {
                    const inDeck = customDeckList.find((c) => c.id === card.id);
                    return (
                      <div
                        key={card.id}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`group bg-[#000000] border transition-all flex flex-col justify-between overflow-hidden ${
                          inDeck ? 'border-[#FCEE0A]' : 'border-gray-800 hover:border-[#00F0FF]'
                        }`}
                      >
                        <div
                          onClick={() => setModalCard(card)}
                          className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden border-b border-gray-800 cursor-pointer"
                        >
                          <img
                            src={card.image}
                            alt={card.name}
                            loading="lazy"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                          {inDeck && (
                            <span className="absolute top-2 right-2 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs px-2 py-0.5">
                              {inDeck.qty}x EN MAZO
                            </span>
                          )}
                        </div>

                        <div className="p-3 space-y-2 bg-[#000000]">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[#FCEE0A] font-bold">{card.id}</span>
                            <span className="text-[#00F0FF]">{card.faction}</span>
                          </div>
                          <h3
                            onClick={() => setModalCard(card)}
                            className="text-xs font-black text-white uppercase truncate cursor-pointer hover:text-[#FCEE0A]"
                          >
                            {card.name}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => handleAddCardToBuilder(card, e)}
                            style={{ clipPath: CYBER_CLIP }}
                            className="w-full py-1.5 bg-[#070a10] hover:bg-[#FCEE0A] text-[#FCEE0A] hover:text-[#070a10] border border-[#FCEE0A]/50 font-mono font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>AÑADIR AL MAZO</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {visibleCardsCount < filteredDatabaseCards.length && (
                  <div className="flex justify-center pt-4">
                    <CyberpulseButton
                      variant="primary"
                      icon={Database}
                      onClick={() => setVisibleCardsCount((prev) => prev + 24)}
                    >
                      CARGAR MÁS CARTAS ({filteredDatabaseCards.length - visibleCardsCount} RESTANTES)
                    </CyberpulseButton>
                  </div>
                )}
              </div>

              {/* Panel Lateral: Constructor de Mazos (Deckbuilder) */}
              {deckbuilderOpen && (
                <aside
                  style={{ clipPath: CYBER_CLIP }}
                  className="lg:col-span-4 bg-[#000000] border-2 border-[#FCEE0A] p-5 space-y-5 lg:sticky lg:top-24"
                >
                  <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#00F0FF] uppercase block">
                        DECKBUILDER // MAX 4 COPIAS POR CARTA
                      </span>
                      <h2 className="text-lg font-black uppercase text-[#FCEE0A]">
                        CONSTRUCTOR DE MAZOS
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs">
                      {totalDeckCards} / 50
                    </span>
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <label className="text-gray-400 block mb-1">NOMBRE DEL MAZO</label>
                      <input
                        type="text"
                        value={customDeckName}
                        onChange={(e) => setCustomDeckName(e.target.value)}
                        className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">FACCIÓN PRINCIPAL</label>
                      <select
                        value={customDeckFaction}
                        onChange={(e) => setCustomDeckFaction(e.target.value)}
                        className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white font-bold"
                      >
                        <option value="NETRUNNER">NETRUNNER</option>
                        <option value="CORPO">CORPO</option>
                        <option value="BANDAS">BANDAS</option>
                        <option value="MERCENARIO">MERCENARIO</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista de Cartas en el Mazo */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 border-t border-b border-gray-800 py-3">
                    {customDeckList.length === 0 ? (
                      <p className="text-xs font-mono text-gray-500 text-center py-8">
                        Tu mazo está vacío. Haz clic en "+ AÑADIR AL MAZO" sobre cualquier carta de la izquierda.
                      </p>
                    ) : (
                      customDeckList.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 bg-[#070a10] border border-gray-800 p-2 text-xs font-mono"
                        >
                          <div
                            onClick={() => setModalCard(item)}
                            className="flex items-center gap-2 min-w-0 cursor-pointer"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-8 h-11 object-cover border border-gray-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-white font-bold truncate">{item.name}</p>
                              <span className="text-[10px] text-[#00F0FF]">{item.faction}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDecrementCardInBuilder(item.id)}
                              className="p-1 bg-[#000000] border border-gray-700 hover:border-[#FF003C] text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-black text-[#FCEE0A]">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleAddCardToBuilder(item, e)}
                              className="p-1 bg-[#000000] border border-gray-700 hover:border-[#00F0FF] text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Acciones del Constructor */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDeckList}
                      disabled={customDeckList.length === 0}
                      style={{ clipPath: CYBER_CLIP }}
                      className="py-2.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {copiedDeck ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedDeck ? '¡COPIADO!' : 'COPIAR LISTA'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDeckTxt}
                      disabled={customDeckList.length === 0}
                      style={{ clipPath: CYBER_CLIP }}
                      className="py-2.5 bg-[#070a10] border border-[#00F0FF] text-[#00F0FF] font-mono font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      <span>EXPORTAR .TXT</span>
                    </button>
                  </div>

                  {customDeckList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomDeckList([])}
                      className="w-full py-1.5 text-[11px] font-mono text-[#FF003C] hover:underline flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vaciar mazo completo</span>
                    </button>
                  )}
                </aside>
              )}
            </div>
          </main>
        )}

        {/* =====================================================================
            VISTA 4: PÁGINA DEDICADA DE MAZOS DEL META (/mazos)
           ===================================================================== */}
        {currentPage === 'mazos' && (
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            {renderMetaDecksSection(false)}
          </main>
        )}

        {/* =====================================================================
            VISTA 5: PÁGINA DEDICADA DE TORNEOS + HISTÓRICO (/torneos)
           ===================================================================== */}
        {currentPage === 'torneos' && (
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
            {renderTournamentsSection(true)}
          </main>
        )}
      </div>

      {/* Footer Geométrico Cyberpulse + Cyberpunk 2077 */}
      <footer className="relative z-10 border-t border-gray-800 bg-[#000000] mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-cyberpunk-tcg-españa.jpg"
              alt="Cyberpunk TCG España"
              className="h-9 w-auto object-contain"
            />
            <span className="text-white font-bold uppercase">
              CYBERPUNK TCG ESPAÑA // PORTAL OFICIAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={forumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:text-[#FCEE0A] transition-colors flex items-center gap-1"
            >
              <span>FORO COMUNIDAD</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a href="/admin" className="text-gray-500 hover:text-[#FCEE0A] transition-colors">
              ACCESO STAFF
            </a>
            <span>•</span>
            <span>{allCards.length} CARTAS OFICIALES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
