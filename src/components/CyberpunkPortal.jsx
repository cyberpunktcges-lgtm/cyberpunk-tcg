import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  Layers,
  Trophy,
  Newspaper,
  Search,
  Menu,
  X,
  Zap,
  Shield,
  ChevronRight,
  Flame,
  Eye,
  Clock,
  Database,
  Radio,
  Activity,
  Lock,
  Sparkles,
  ExternalLink,
  BarChart3
} from 'lucide-react';

const heroArticle = {
  id: 'NC-2077-01',
  category: 'META REPORT // CORPO & NETRUNNER',
  faction: 'Arasaka / DeepNet',
  title: 'Protocolo Blackwall: Cómo el nuevo ICE de Arasaka está redefiniendo el Meta Competitivo',
  excerpt:
    'Analizamos el impacto del ciclo "Subred Fantasma" en los torneos regionales de Night City. Los mazos de control corporativo alcanzan un 58% de efectividad frente a los agresivos rigs de desconexión neuronal.',
  author: 'ZeroCool_99',
  role: 'Analista Jefe de la Red',
  date: '09 NOV 2026',
  readTime: '7 min lectura',
  views: '14.8K',
  threatLevel: 'CRÍTICO // NIVEL 5',
  highlights: [
    'Incremento del +18% en barajas de bloqueo de subrutinas',
    'Nuevos rompehielos sigilosos para facciones Anarquistas',
    'Guía completa de side-deck para el Regional de Neo-Tokyo'
  ]
};

const recentArticles = [
  {
    id: 'ART-01',
    category: 'SPOILER EXPANSIÓN',
    faction: 'Netrunner',
    title: 'Exclusiva: "Sobrecarga Sináptica", el evento legendario que destruye servidores remotos',
    excerpt:
      'Revelamos las estadísticas y el coste de memoria de la carta más esperada del set Cyber-Genesis.',
    author: 'Nyx_Runner',
    date: 'Hace 3 horas',
    readTime: '4 min',
    views: '8.2K',
    tagColor: 'text-[#0dfceb] border-[#0dfceb]/40 bg-[#0dfceb]/10'
  },
  {
    id: 'ART-02',
    category: 'ESTRATEGIA CORPO',
    faction: 'Corpo',
    title: 'Arquitectura de Servidores Impenetrables: Economía de Créditos en Turnos 1-3',
    excerpt:
      'Aprende a gestionar tu reserva de bit-créditos sin ceder presión de agendas frente a mazos Rush.',
    author: 'Exec_Vance',
    date: 'Hace 8 horas',
    readTime: '9 min',
    views: '6.5K',
    tagColor: 'text-rose-400 border-rose-500/40 bg-rose-500/10'
  },
  {
    id: 'ART-03',
    category: 'TORNEOS // CIRCUIT',
    faction: 'Global',
    title: 'Resumen del Night City Championship: Top 8 Barajas y Estadísticas de Facciones',
    excerpt:
      'Más de 512 jugadores se enfrentaron en la red. Revisa el desglose completo de enfrentamientos y ratios de conversión.',
    author: 'DataHound',
    date: 'Ayer',
    readTime: '12 min',
    views: '19.4K',
    tagColor: 'text-amber-300 border-amber-400/40 bg-amber-400/10'
  },
  {
    id: 'ART-04',
    category: 'GUÍA DE INICIO',
    faction: 'Netrunner',
    title: 'De Novato a Leyenda del Ciberespacio: Cómo construir tu primer Rig de Infiltración',
    excerpt:
      'Todo lo que necesitas saber sobre unidades de memoria (MU), consolas, programas de desencriptación y gestión de daño cerebral.',
    author: 'GhostInShell',
    date: 'Hace 2 días',
    readTime: '6 min',
    views: '11.1K',
    tagColor: 'text-[#0dfceb] border-[#0dfceb]/40 bg-[#0dfceb]/10'
  }
];

const topDecks = [
  {
    id: 'DECK-01',
    name: 'Arasaka Black-ICE Fortress',
    type: 'CORPO // CONTROL',
    tier: 'TIER S',
    winrate: '64.2%',
    popularity: '22.5%',
    pilot: 'Kurogane_HQ',
    cost: '4,200 ¢',
    accent: 'rose',
    coreCards: ['Muro de Fuego Mk.IV', 'Directiva Letal', 'Bóveda Neural']
  },
  {
    id: 'DECK-02',
    name: 'Phantom Overclock (Stealth Rig)',
    type: 'NETRUNNER // AGGRO-COMBO',
    tier: 'TIER S',
    winrate: '61.8%',
    popularity: '19.8%',
    pilot: 'Sombra_01',
    cost: '3,850 ¢',
    accent: 'cyan',
    coreCards: ['Daemon Fantasma', 'Inyección SQL-Zero', 'Consola Ono-Sendai']
  },
  {
    id: 'DECK-03',
    name: 'Militech Orbital Scorched',
    type: 'CORPO // MIDRANGE TAG',
    tier: 'TIER A',
    winrate: '57.4%',
    popularity: '15.1%',
    pilot: 'TacticalValkyrie',
    cost: '3,600 ¢',
    accent: 'rose',
    coreCards: ['Rastreo Satelital', 'Respuesta Armada', 'Red de Peaje']
  },
  {
    id: 'DECK-04',
    name: 'Virus Krash & Mill Protocol',
    type: 'NETRUNNER // DISRUPTION',
    tier: 'TIER A',
    winrate: '55.9%',
    popularity: '12.4%',
    pilot: 'AcidBurn_X',
    cost: '2,950 ¢',
    accent: 'cyan',
    coreCards: ['Parásito Polimórfico', 'Sobrecarga de Caché', 'Implante Reflejo']
  }
];

export default function CyberpunkPortal() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedFaction, setSelectedFaction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { name: 'Inicio', icon: Terminal, active: true, badge: null },
    { name: 'Base de Cartas', icon: Database, active: false, badge: '1,240' },
    { name: 'Meta & Mazos', icon: Layers, active: false, badge: 'LIVE' },
    { name: 'Torneos', icon: Trophy, active: false, badge: null },
    { name: 'Noticias', icon: Newspaper, active: false, badge: null }
  ];

  const filteredArticles = recentArticles.filter((article) => {
    const matchesFaction =
      selectedFaction === 'ALL' ||
      article.faction.toUpperCase() === selectedFaction;
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFaction && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-[#0dfceb] selection:text-[#0b0f19] relative overflow-x-hidden">
      {/* Ambient Cyberpunk Grid & Glow Overlays */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(13, 252, 235, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(13, 252, 235, 0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="pointer-events-none fixed -top-40 -left-40 w-96 h-96 bg-[#0dfceb]/10 rounded-full blur-[120px] z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px] z-0" />

      {/* Top System Telemetry Bar */}
      <div className="relative z-20 border-b border-[#0dfceb]/20 bg-[#070a11]/90 backdrop-blur-md text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-[#0dfceb] font-mono tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              NET-STATUS: ONLINE
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-[#0dfceb]" />
              SERVIDOR: NIGHT-CITY-NODE-04
            </span>
          </div>
          <div className="flex items-center space-x-4 font-mono">
            <span className="hidden md:inline text-slate-400">
              TEMPORADA 04: <strong className="text-[#0dfceb]">SUBRED FANTASMA</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] tracking-widest uppercase">
              CORPO ALERT LVL 5
            </span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#0dfceb]/25 bg-[#0b0f19]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#0dfceb]/10 border border-[#0dfceb] flex items-center justify-center shadow-[0_0_15px_rgba(13,252,235,0.35)]">
                <Cpu className="w-6 h-6 text-[#0dfceb]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-wider text-white uppercase">
                    CYBER<span className="text-[#0dfceb]">NEXUS</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0dfceb]/15 text-[#0dfceb] border border-[#0dfceb]/40">
                    TCG v2.4
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">
                  Portal Netrunner // Corpo
                </p>
              </div>
            </div>

            {/* Desktop Menu Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={`#${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`group flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      item.active
                        ? 'bg-[#0dfceb]/15 text-[#0dfceb] border border-[#0dfceb]/50 shadow-[0_0_12px_rgba(13,252,235,0.2)]'
                        : 'text-slate-300 hover:text-[#0dfceb] hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#0dfceb]/20 text-[#0dfceb]">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Search & Action CTA */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar carta, mazo o artículo..."
                  className="w-56 xl:w-64 pl-9 pr-3 py-1.5 text-sm bg-slate-900/90 border border-slate-700/80 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0dfceb] focus:ring-1 focus:ring-[#0dfceb] transition-all font-mono"
                />
              </div>
              <button className="px-4 py-2 rounded-md bg-[#0dfceb] text-[#0b0f19] font-bold text-xs uppercase tracking-wider hover:bg-[#0dfceb]/90 transition-all shadow-[0_0_20px_rgba(13,252,235,0.4)] flex items-center gap-1.5 cursor-pointer">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Conectar Rig</span>
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menú de navegación"
                className="p-2 rounded-md text-slate-300 hover:text-[#0dfceb] hover:bg-slate-800/70 border border-slate-700/70"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#0dfceb]/20 bg-[#0b0f19]/95 px-4 pt-3 pb-5 space-y-3">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en la subred..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0dfceb]"
              />
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={`#${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium ${
                      item.active
                        ? 'bg-[#0dfceb]/15 text-[#0dfceb] border border-[#0dfceb]/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#0dfceb]/20 text-[#0dfceb]">
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

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* HERO ARTICLE SECTION */}
        <section aria-labelledby="hero-heading" className="relative">
          <div className="relative rounded-xl overflow-hidden border border-[#0dfceb]/40 bg-gradient-to-br from-slate-900/95 via-[#0b0f19] to-slate-950 shadow-[0_0_35px_rgba(13,252,235,0.12)]">
            {/* Top HUD Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#0dfceb] via-cyan-400 to-rose-500" />

            <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Hero Article Info */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#0dfceb] text-[#0b0f19] shadow-[0_0_12px_rgba(13,252,235,0.5)]">
                    {heroArticle.category}
                  </span>
                  <span className="px-2.5 py-1 rounded text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {heroArticle.threatLevel}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {heroArticle.id}
                  </span>
                </div>

                <h1
                  id="hero-heading"
                  className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight"
                >
                  {heroArticle.title}
                </h1>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl">
                  {heroArticle.excerpt}
                </p>

                {/* Key Highlights */}
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {heroArticle.highlights.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-[#0dfceb]/40 transition-colors flex items-start gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-[#0dfceb] shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-300 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Author & Meta Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0dfceb]/20 border border-[#0dfceb] flex items-center justify-center text-[#0dfceb] font-bold">
                        ZC
                      </div>
                      <div>
                        <p className="text-slate-200 font-semibold">{heroArticle.author}</p>
                        <p className="text-[11px] text-slate-400">{heroArticle.role}</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline text-slate-700">|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0dfceb]" />
                      {heroArticle.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#0dfceb]" />
                      {heroArticle.views} lecturas
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 rounded-md bg-[#0dfceb] text-[#0b0f19] font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-[#0dfceb]/90 transition-all shadow-[0_0_20px_rgba(13,252,235,0.35)] flex items-center gap-2 cursor-pointer">
                      <span>Leer Informe Completo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Cyber-Card Preview / Telemetry Box */}
              <div className="lg:col-span-4">
                <div className="relative rounded-xl bg-[#070a12] border border-[#0dfceb]/50 p-5 shadow-[0_0_25px_rgba(13,252,235,0.15)] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#0dfceb] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      CARTA DESTACADA DEL META
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">
                      CORPO // ICE
                    </span>
                  </div>

                  {/* Simulated Card Frame */}
                  <div className="rounded-lg bg-gradient-to-b from-slate-900 via-[#0d1526] to-slate-950 border border-[#0dfceb]/30 p-4 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-white tracking-wide">
                        PROTOCOLO BLACKWALL v4
                      </span>
                      <span className="w-7 h-7 rounded-full bg-[#0dfceb]/20 border border-[#0dfceb] text-[#0dfceb] font-mono text-xs font-bold flex items-center justify-center">
                        8¢
                      </span>
                    </div>

                    <div className="h-28 rounded bg-gradient-to-r from-[#0b0f19] via-cyan-950/60 to-rose-950/50 border border-slate-800 flex flex-col items-center justify-center p-3 text-center relative">
                      <Cpu className="w-10 h-10 text-[#0dfceb] mb-1.5 opacity-90" />
                      <span className="text-[11px] font-mono text-[#0dfceb] tracking-widest uppercase">
                        [ BARRERA // IA CUÁNTICA ]
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono text-slate-300 bg-slate-950/80 p-3 rounded border border-slate-800/90">
                      <p className="flex items-start gap-1.5">
                        <span className="text-[#0dfceb]">↳</span>
                        <span>Inflige 2 de daño neuronal si el Runner no tiene enlaces activos.</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-[#0dfceb]">↳</span>
                        <span>Termina la incursión inmediatamente y bloquea 1 MU.</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span>FUERZA: <strong className="text-white">6</strong></span>
                      <span>INFLUENCIA: <strong className="text-[#0dfceb]">●●●●○</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                    <span>Ratio de inclusión:</span>
                    <span className="text-[#0dfceb] font-bold">84.6% en Mazos Corpo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN GRID: RECENT ARTICLES (LEFT 8 COLS) & TOP DECKS (RIGHT 4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* RECENT ARTICLES SECTION */}
          <section className="lg:col-span-8 space-y-6" aria-labelledby="recent-articles-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Newspaper className="w-5 h-5 text-[#0dfceb]" />
                <h2
                  id="recent-articles-heading"
                  className="text-xl sm:text-2xl font-black tracking-wide uppercase text-white"
                >
                  Transmisiones Recientes
                </h2>
              </div>

              {/* Faction Filter Pills */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {['ALL', 'NETRUNNER', 'CORPO'].map((faction) => (
                  <button
                    key={faction}
                    onClick={() => setSelectedFaction(faction)}
                    className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                      selectedFaction === faction
                        ? 'bg-[#0dfceb] text-[#0b0f19] border-[#0dfceb] font-bold shadow-[0_0_10px_rgba(13,252,235,0.3)]'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-[#0dfceb]/40 hover:text-slate-200'
                    }`}
                  >
                    {faction === 'ALL' ? 'TODOS' : faction}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="group rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-[#0dfceb]/60 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_0_20px_rgba(13,252,235,0.1)]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase rounded border ${article.tagColor}`}
                      >
                        {article.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {article.date}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-[#0dfceb] transition-colors leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-sm text-slate-400 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-slate-300 font-medium">@{article.author}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#0dfceb]" />
                        {article.readTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        {article.views}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* TOP DECKS SIDEBAR SECTION */}
          <aside className="lg:col-span-4 space-y-6" aria-labelledby="top-decks-heading">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-[#0dfceb]" />
                <h2
                  id="top-decks-heading"
                  className="text-xl font-black tracking-wide uppercase text-white"
                >
                  Top Decks // Meta
                </h2>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#0dfceb]/15 text-[#0dfceb] border border-[#0dfceb]/30">
                PATCH 2.4
              </span>
            </div>

            <div className="space-y-4">
              {topDecks.map((deck, index) => (
                <div
                  key={deck.id}
                  className="rounded-xl bg-slate-900/75 border border-slate-800 hover:border-[#0dfceb]/50 p-4 transition-all duration-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#0dfceb]">
                          #0{index + 1}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            deck.accent === 'rose'
                              ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                              : 'text-[#0dfceb] bg-[#0dfceb]/10 border-[#0dfceb]/30'
                          }`}
                        >
                          {deck.type}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {deck.name}
                      </h3>
                    </div>

                    <div className="text-right font-mono">
                      <span className="inline-block px-2 py-0.5 text-xs font-black rounded bg-[#0dfceb] text-[#0b0f19]">
                        {deck.tier}
                      </span>
                      <p className="text-xs text-emerald-400 font-bold mt-1">
                        {deck.winrate} WR
                      </p>
                    </div>
                  </div>

                  {/* Core cards chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {deck.coreCards.map((card) => (
                      <span
                        key={card}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0b0f19] text-slate-300 border border-slate-800"
                      >
                        {card}
                      </span>
                    ))}
                  </div>

                  {/* Deck Footer Info */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>
                      Piloto: <strong className="text-slate-200">{deck.pilot}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-[#0dfceb] hover:underline cursor-pointer">
                      <span>Ver Lista ({deck.cost})</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Meta Telemetry Summary Box */}
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-[#070a12] border border-[#0dfceb]/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#0dfceb] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  BALANCE DE FACCIONES
                </span>
                <span className="text-[11px] font-mono text-slate-400">Últimos 7 días</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#0dfceb]">NETRUNNER (Infiltración)</span>
                  <span className="text-white font-bold">51.2%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="bg-[#0dfceb] h-full" style={{ width: '51.2%' }} />
                  <div className="bg-rose-500 h-full" style={{ width: '48.8%' }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-400">CORPO (Defensa ICE)</span>
                  <span className="text-white font-bold">48.8%</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#0dfceb]/20 bg-[#070a11] mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0dfceb]" />
            <span className="text-slate-300 font-bold">CYBERNEXUS TCG</span>
            <span>// FASE 1 — PORTAL NETRUNNER & CORPO</span>
          </div>
          <div>
            <span>CONEXIÓN CIFRADA [SSL-2077] • PALETA #0b0f19 / #0dfceb</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
