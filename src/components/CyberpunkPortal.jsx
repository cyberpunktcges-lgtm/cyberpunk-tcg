import React, { useState } from 'react';
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
  Settings,
  ExternalLink,
  Calendar,
  MapPin,
  Users
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

export default function CyberpunkPortal({ initialCms = {}, initialCards = [] }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Datos dinámicos cargados desde el Backend CMS (src/data/cms.json)
  const heroArticle = initialCms.heroArticle || {};
  const recentArticles = initialCms.news || [];
  const topDecks = initialCms.decks || [];
  const tournaments = initialCms.tournaments || [];
  const allCards = initialCards || [];

  // Estados de filtrado de Noticias
  const [selectedFaction, setSelectedFaction] = useState('TODOS');

  // Estados del Buscador de Base de Cartas (GitHub: cyberpunk-tcg-cartas)
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardFactionFilter, setCardFactionFilter] = useState('TODOS');
  const [visibleCardsCount, setVisibleCardsCount] = useState(18);
  const [modalCard, setModalCard] = useState(null);

  // Estados de Top Mazos
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState(
    topDecks[0]?.cards?.[0] || null
  );

  // Menú superior en el orden exacto solicitado
  const navItems = [
    { name: 'Inicio', href: '#inicio', icon: Terminal, active: true, badge: null },
    { name: 'Noticias', href: '#noticias', icon: Newspaper, active: false, badge: null },
    { name: 'Base de Cartas', href: '#base-de-cartas', icon: Database, active: false, badge: `${allCards.length}` },
    { name: 'Mazos', href: '#mazos', icon: Layers, active: false, badge: 'META' },
    { name: 'Torneos', href: '#torneos', icon: Trophy, active: false, badge: 'LIVE' },
    { name: 'Foro', href: '#foro', icon: MessageSquare, active: false, badge: null }
  ];

  // Filtrado de Noticias
  const filteredArticles = recentArticles.filter((article) => {
    return selectedFaction === 'TODOS' || article.faction === selectedFaction;
  });

  // Filtrado en tiempo real de las 151 cartas del GitHub (cyberpunktcges-lgtm/cyberpunk-tcg-cartas)
  const filteredDatabaseCards = allCards.filter((card) => {
    const matchesFaction =
      cardFactionFilter === 'TODOS' || card.faction === cardFactionFilter;
    const q = cardSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      card.name.toLowerCase().includes(q) ||
      card.slug.toLowerCase().includes(q) ||
      card.id.toLowerCase().includes(q) ||
      card.faction.toLowerCase().includes(q);
    return matchesFaction && matchesSearch;
  });

  // Resultados rápidos para el buscador de la cabecera
  const quickHeaderResults =
    cardSearchQuery.trim().length > 0
      ? filteredDatabaseCards.slice(0, 6)
      : [];

  const activeDeck = topDecks[activeDeckIndex] || topDecks[0];

  const handleSelectDeck = (index) => {
    setActiveDeckIndex(index);
    if (topDecks[index]?.cards?.length > 0) {
      setSelectedCard(topDecks[index].cards[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans selection:bg-[#FCEE0A] selection:text-[#000000] relative overflow-x-hidden rounded-none">
      {/* Rejilla Técnica de Fondo Cyberpulse */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 240, 255, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* Barra Superior de Telemetría + Acceso al Backend CMS */}
      <div className="relative z-40 border-b border-gray-800 bg-[#000000] text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-[#FCEE0A] font-bold tracking-widest">
              <Radio className="w-3.5 h-3.5 text-[#FF003C] animate-pulse" />
              CYBERPUNK TCG ESPAÑA // NET-OS
            </span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-gray-300">
              <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
              CARTAS GITHUB SINCRONIZADAS: <strong className="text-[#00F0FF]">{allCards.length}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="/admin"
              style={{ clipPath: CYBER_CLIP }}
              className="px-3 py-1 bg-[#FCEE0A] text-[#070a10] hover:bg-[#00F0FF] font-mono font-black text-[11px] tracking-wider uppercase flex items-center gap-1.5 transition-colors rounded-none"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>PANEL BACKEND // ADMIN</span>
            </a>
          </div>
        </div>
      </div>

      {/* Header Principal */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#070a10]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-3">
            {/* Logo e Identidad (Arriba a la izquierda) */}
            <a
              href="#inicio"
              style={{ clipPath: CYBER_CLIP }}
              className="flex items-center shrink-0 bg-[#FCEE0A] border border-[#FCEE0A] hover:border-[#00F0FF] shadow-[0_0_20px_rgba(252,238,10,0.35)] hover:shadow-[0_0_25px_rgba(0,240,255,0.55)] transition-all duration-200 overflow-hidden rounded-none"
            >
              <img
                src="/images/logo-cyberpunk-tcg-españa.jpg"
                alt="Cyberpunk TCG España"
                className="h-12 sm:h-14 w-auto object-contain block"
              />
            </a>

            {/* Navegación Desktop (6 apartados en el orden solicitado) */}
            <nav className="hidden lg:flex items-center space-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] xl:text-xs font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 rounded-none border ${
                      item.active
                        ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_15px_rgba(252,238,10,0.45)]'
                        : 'bg-[#000000]/70 text-gray-200 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-none ${
                          item.active
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

              {/* Desplegable instantáneo con las cartas encontradas al buscar arriba */}
              {quickHeaderResults.length > 0 && (
                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="absolute top-14 right-0 w-80 bg-[#000000] border border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.5)] p-3 z-50 space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#FCEE0A] border-b border-gray-800 pb-1.5">
                    <span>CARTAS ENCONTRADAS ({filteredDatabaseCards.length})</span>
                    <a
                      href="#base-de-cartas"
                      className="text-[#00F0FF] underline"
                    >
                      Ver todas
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
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="relative bg-[#070a10] border border-gray-800 rounded-none"
            >
              <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                placeholder="BUSCAR CARTA EN GITHUB..."
                className="w-full pl-9 pr-3 py-2.5 text-xs font-mono bg-transparent text-white placeholder-gray-500 focus:outline-none rounded-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-mono font-bold uppercase border rounded-none ${
                      item.active
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
          MODAL VISOR DE CARTA EN GRANDE (CUANDO EL USUARIO SELECCIONA UNA CARTA)
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
                    ARCHIVO GITHUB // {modalCard.id} • {modalCard.faction}
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
                <span>Archivo: {modalCard.fileName}</span>
                <a
                  href={modalCard.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FCEE0A] hover:text-[#00F0FF] flex items-center gap-1 font-bold"
                >
                  <span>Ver en GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          1. HERO SECTION CON WALLPAPER LOCAL Y TARJETA DE NOTICIA DESTACADA
         ===================================================================== */}
      <section id="inicio" aria-labelledby="hero-heading" className="relative border-b border-gray-800">
        <div className="relative min-h-[600px] lg:min-h-[660px] flex items-center overflow-hidden">
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
                    <a href="#base-de-cartas">
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
                    CARTA MVP // TEMPORADA 01
                  </span>
                  <span
                    style={{ clipPath: CYBER_CLIP }}
                    className="px-2 py-0.5 text-[10px] font-mono font-black bg-[#00F0FF] text-[#070a10] rounded-none"
                  >
                    TIER S+
                  </span>
                </div>

                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="relative h-80 w-full overflow-hidden border border-gray-800 bg-[#000000] rounded-none group"
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

      {/* Contenedor Principal del Portal */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-24">
        {/* =====================================================================
            2. GRID DE NOTICIAS (GESTIONADO DESDE /admin)
           ===================================================================== */}
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

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {['TODOS', 'NETRUNNER', 'CORPO', 'BANDAS', 'MERCENARIO'].map((faction) => (
                <button
                  key={faction}
                  type="button"
                  onClick={() => setSelectedFaction(faction)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-4 py-2 font-bold uppercase tracking-wider border transition-all cursor-pointer rounded-none ${
                    selectedFaction === faction
                      ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_18px_rgba(252,238,10,0.5)]'
                      : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                  }`}
                >
                  {faction}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredArticles.map((article, idx) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ y: -6 }}
                style={{ clipPath: CYBER_CLIP }}
                className="group bg-[#000000] border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300 flex flex-col justify-between overflow-hidden rounded-none"
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

                    <p className="text-xs text-gray-300 leading-relaxed">
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

        {/* =====================================================================
            3. BASE DE CARTAS (CONECTADA A GITHUB: cyberpunk-tcg-cartas)
           ===================================================================== */}
        <section id="base-de-cartas" aria-labelledby="cards-db-heading" className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-gray-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
                <Database className="w-4 h-4 text-[#00F0FF]" />
                <span>
                  REPOSITORIO OFICIAL // GITHUB.COM/CYBERPUNKTCGES-LGTM/CYBERPUNK-TCG-CARTAS
                </span>
              </div>
              <h2
                id="cards-db-heading"
                className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
              >
                BASE DE <span className="text-[#00F0FF]">CARTAS</span>{' '}
                <span className="text-lg font-mono text-[#FCEE0A]">
                  ({filteredDatabaseCards.length} / {allCards.length})
                </span>
              </h2>
            </div>

            {/* Buscador Principal de Cartas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="relative bg-[#000000] border-2 border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.25)] focus-within:border-[#00F0FF] focus-within:shadow-[0_0_25px_rgba(0,240,255,0.45)] transition-all flex-1 sm:w-80 rounded-none"
              >
                <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cardSearchQuery}
                  onChange={(e) => {
                    setCardSearchQuery(e.target.value);
                    setVisibleCardsCount(18);
                  }}
                  placeholder="Escribe el nombre de la carta (ej: Smasher, Lucy, Arasaka)..."
                  className="w-full pl-10 pr-8 py-3 text-xs font-mono bg-transparent text-white placeholder-gray-400 focus:outline-none rounded-none"
                />
                {cardSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCardSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF003C] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filtros de Facción de la Base de Cartas */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {['TODOS', 'CORPO', 'NETRUNNER', 'BANDAS', 'MERCENARIO'].map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => {
                    setCardFactionFilter(fac);
                    setVisibleCardsCount(18);
                  }}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-4 py-2 font-bold uppercase tracking-wider border transition-all cursor-pointer rounded-none ${
                    cardFactionFilter === fac
                      ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.5)]'
                      : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#FCEE0A] hover:text-[#FCEE0A]'
                  }`}
                >
                  {fac}
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-gray-400">
              Haz clic en cualquier carta para abrir el escáner en alta resolución
            </span>
          </div>

          {/* Grid de Cartas Buscadas */}
          {filteredDatabaseCards.length === 0 ? (
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000] border border-gray-800 p-12 text-center space-y-3"
            >
              <p className="text-lg font-mono font-bold text-[#FF003C] uppercase">
                NO SE ENCONTRARON CARTAS PARA "{cardSearchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setCardSearchQuery('');
                  setCardFactionFilter('TODOS');
                }}
                style={{ clipPath: CYBER_CLIP }}
                className="px-4 py-2 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase cursor-pointer"
              >
                MOSTRAR LAS {allCards.length} CARTAS
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {filteredDatabaseCards.slice(0, visibleCardsCount).map((card) => (
                  <motion.div
                    key={card.id}
                    onClick={() => setModalCard(card)}
                    whileHover={{
                      scale: 1.05,
                      y: -6,
                      boxShadow: '0 0 25px rgba(0, 240, 255, 0.6)'
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    style={{ clipPath: CYBER_CLIP }}
                    className="group cursor-pointer bg-[#000000] border border-gray-800 hover:border-[#00F0FF] overflow-hidden flex flex-col justify-between rounded-none"
                  >
                    <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden border-b border-gray-800">
                      <img
                        src={card.image}
                        alt={card.name}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 bg-[#000000]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span className="text-[#FCEE0A] font-bold">{card.id}</span>
                        <span className="text-[#00F0FF]">{card.faction}</span>
                      </div>
                      <h3 className="text-xs font-black text-white uppercase truncate mt-1 group-hover:text-[#FCEE0A] transition-colors">
                        {card.name}
                      </h3>
                    </div>
                  </motion.div>
                ))}
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
            </>
          )}
        </section>

        {/* =====================================================================
            4. MAZOS COMPETITIVOS (CON FRAMER MOTION Y GESTIÓN EN BACKEND)
           ===================================================================== */}
        {activeDeck && (
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
                  TOP <span className="text-[#00F0FF]">MAZOS DEL META</span>
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                {topDecks.map((deck, idx) => {
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
                          ESCÁNER DE CARTA // {selectedCard.id}
                        </span>
                        <span className="text-xs font-mono font-black text-[#FCEE0A]">
                          {selectedCard.rarity}
                        </span>
                      </div>

                      <div
                        style={{ clipPath: CYBER_CLIP }}
                        className="relative h-80 w-full overflow-hidden border border-gray-800 bg-[#070a10] rounded-none"
                      >
                        <img
                          src={selectedCard.image}
                          alt={selectedCard.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider block">
                          {selectedCard.type}
                        </span>
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
        )}

        {/* =====================================================================
            5. TORNEOS COMPETITIVOS (GESTIONADOS DESDE EL BACKEND /admin)
           ===================================================================== */}
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
                CALENDARIO DE <span className="text-[#FCEE0A]">TORNEOS</span>
              </h2>
            </div>

            <a
              href="/admin"
              style={{ clipPath: CYBER_CLIP }}
              className="px-4 py-2.5 bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] text-[#FCEE0A] font-mono text-xs font-bold uppercase tracking-wider rounded-none"
            >
              + GESTIONAR TORNEOS EN BACKEND
            </a>
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
                        <span>{tour.players} • {tour.format}</span>
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

        {/* =====================================================================
            6. FORO DE LA COMUNIDAD (#foro)
           ===================================================================== */}
        <section id="foro" aria-labelledby="forum-heading" className="space-y-6">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="bg-[#000000] border border-gray-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-widest">
                <MessageSquare className="w-4 h-4 text-[#FCEE0A]" />
                <span>SUBRED DE DISCUSIÓN // COMUNIDAD ESPAÑA</span>
              </div>
              <h2
                id="forum-heading"
                className="text-2xl sm:text-3xl font-black uppercase text-white"
              >
                FORO TÁCTICO & <span className="text-[#FCEE0A]">INTERCAMBIO DE CARTAS</span>
              </h2>
              <p className="text-sm text-gray-300 max-w-2xl">
                Comparte tus listas de mazos, resuelve dudas de reglas del reglamento oficial y
                organiza partidas con otros jugadores de Cyberpunk TCG España.
              </p>
            </div>

            <CyberpulseButton variant="primary" icon={MessageSquare}>
              ENTRAR AL FORO
            </CyberpulseButton>
          </div>
        </section>
      </main>

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
              CYBERPUNK TCG ESPAÑA // PORTAL & BACKEND CMS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-[#FCEE0A] hover:underline font-bold">
              PANEL ADMIN (/admin)
            </a>
            <span>•</span>
            <span>{allCards.length} CARTAS GITHUB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
