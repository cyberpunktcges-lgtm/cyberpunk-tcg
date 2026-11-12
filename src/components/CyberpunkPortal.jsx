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
  Wrench,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Share2,
  Mail,
  Crown,
  Camera,
  Smartphone
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

/**
 * Extrae un resumen corto de 2-3 líneas al estilo WordPress:
 * - Si contiene la etiqueta <!--more-->, corta justo ahí.
 * - Elimina etiquetas HTML para que en la tarjeta previa se vea limpio.
 */
function getShortExcerpt(article, maxChars = 185) {
  if (!article) return '';
  const rawSource = article.excerpt || article.content || '';
  const beforeMore = rawSource.split(/<!--\s*more\s*-->/i)[0] || rawSource;
  const plain = beforeMore
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trim()}...`;
}

/**
 * Devuelve el HTML completo de la noticia (estilo WordPress / Elementor):
 * - Soporta listas (<ul>, <ol>, <li>), títulos (<h2>, <h3>), negritas (<strong>, <b>),
 *   citas (<blockquote>), enlaces (<a>) e imágenes (<img>).
 * - Si el texto viene en texto plano sin etiquetas HTML, convierte los saltos de línea en párrafos <p>.
 */
function getFullArticleHtml(article) {
  if (!article) return '';
  const fullRaw = (article.content && article.content.trim())
    ? article.content
    : (article.excerpt || '');
  const cleaned = fullRaw.replace(/<!--\s*more\s*-->/gi, '');
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(cleaned);

  if (hasHtmlTags) {
    return cleaned;
  }

  return cleaned
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function CyberpunkPortal({
  initialCms = {},
  initialCards = [],
  currentPage = 'inicio'
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmsState, setCmsState] = useState(initialCms);

  // Datos dinámicos cargados desde el Backend CMS (src/data/cms.json)
  const heroArticle = cmsState.heroArticle || {};
  const recentArticles = cmsState.news || [];
  const topDecks = cmsState.decks || [];
  const tournaments = cmsState.tournaments || [];
  const pastTournaments = cmsState.pastTournaments || [];
  const altArtCards = (cmsState.altArtCards || []).slice(0, 3);
  const forumUrl = cmsState.forumUrl || 'https://foro.cyberpunktcg.es';
  const allCards = initialCards || [];

  // Estados de filtrado de Noticias (Portada y Página /noticias)
  const [selectedFaction, setSelectedFaction] = useState('TODOS');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsSortOrder, setNewsSortOrder] = useState('DESC'); // DESC = más recientes primero
  const [readingArticle, setReadingArticle] = useState(null);

  // Abrir noticia y contabilizar visita real en el servidor
  const handleOpenArticle = async (article, isHero = false) => {
    if (!article) return;
    setReadingArticle(article);

    try {
      const storageKey = `cp_tcg_viewed_${isHero ? 'HERO' : article.id}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');

      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'increment_view',
          articleId: article.id,
          isHero
        })
      });
      const json = await res.json();
      if (json?.ok && json?.data) {
        setCmsState(json.data);
        if (isHero && json.data.heroArticle) {
          setReadingArticle(json.data.heroArticle);
        } else if (article.id && Array.isArray(json.data.news)) {
          const updated = json.data.news.find((n) => n.id === article.id);
          if (updated) setReadingArticle(updated);
        }
      }
    } catch {}
  };

  // Estados del Buscador de Base de Cartas
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState('TODOS');
  const [cardColorFilter, setCardColorFilter] = useState('TODOS');
  const [visibleCardsCount, setVisibleCardsCount] = useState(24);
  const [modalCard, setModalCard] = useState(null);

  // Estados del Constructor de Mazos (Deckbuilder en /cartas)
  const [deckbuilderOpen, setDeckbuilderOpen] = useState(true);
  const [customDeckName, setCustomDeckName] = useState('Mi Mazo Edgerunner');
  const [customDeckFaction, setCustomDeckFaction] = useState('Arasaka');
  const [customDeckList, setCustomDeckList] = useState([]);
  const [customSideboardList, setCustomSideboardList] = useState([]);
  const [deckBuilderTarget, setDeckBuilderTarget] = useState('main'); // 'main' | 'sideboard'
  const [copiedDeck, setCopiedDeck] = useState(false);
  const [visualDeckModalOpen, setVisualDeckModalOpen] = useState(false);
  const [socialFormat, setSocialFormat] = useState('horizontal'); // 'horizontal' | 'vertical' | 'story'
  const [deckViewTab, setDeckViewTab] = useState('list'); // 'list' | 'visual'
  const [isGeneratingDeckImg, setIsGeneratingDeckImg] = useState(false);
  const [deckToast, setDeckToast] = useState(null);

  // Cargar y persistir borrador del Constructor de Mazos en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cp_tcg_custom_deck');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setCustomDeckName(parsed.name);
        if (parsed.faction) setCustomDeckFaction(parsed.faction);
        if (Array.isArray(parsed.cards)) setCustomDeckList(parsed.cards);
        if (Array.isArray(parsed.sideboard)) setCustomSideboardList(parsed.sideboard);
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
          cards: customDeckList,
          sideboard: customSideboardList
        })
      );
    } catch {}
  }, [customDeckName, customDeckFaction, customDeckList, customSideboardList]);

  // Funciones del Constructor de Mazos (Baraja Principal + Banquillo)
  const totalDeckCards = customDeckList.reduce((acc, item) => acc + item.qty, 0);
  const totalSideboardCards = customSideboardList.reduce((acc, item) => acc + item.qty, 0);

  const getCardTotalCopies = (cardId) => {
    const mainQty = customDeckList.find((c) => c.id === cardId)?.qty || 0;
    const sideQty = customSideboardList.find((c) => c.id === cardId)?.qty || 0;
    return mainQty + sideQty;
  };

  const handleAddCardToBuilder = (card, e, target = deckBuilderTarget) => {
    if (e) e.stopPropagation();
    const currentTotal = getCardTotalCopies(card.id);
    if (currentTotal >= 3) return; // Máximo 3 copias totales entre baraja y banquillo

    if (target === 'sideboard') {
      if (totalSideboardCards >= 7) return; // Máximo 7 cartas en banquillo
      setCustomSideboardList((prev) => {
        const existing = prev.find((c) => c.id === card.id);
        if (existing) {
          return prev.map((c) => (c.id === card.id ? { ...c, qty: c.qty + 1 } : c));
        }
        return [...prev, { ...card, qty: 1 }];
      });
    } else {
      setCustomDeckList((prev) => {
        const existing = prev.find((c) => c.id === card.id);
        if (existing) {
          return prev.map((c) => (c.id === card.id ? { ...c, qty: c.qty + 1 } : c));
        }
        return [...prev, { ...card, qty: 1 }];
      });
    }
  };

  const handleDecrementCardInBuilder = (cardId, target = 'main') => {
    if (target === 'sideboard') {
      setCustomSideboardList((prev) =>
        prev
          .map((c) => (c.id === cardId ? { ...c, qty: c.qty - 1 } : c))
          .filter((c) => c.qty > 0)
      );
    } else {
      setCustomDeckList((prev) =>
        prev
          .map((c) => (c.id === cardId ? { ...c, qty: c.qty - 1 } : c))
          .filter((c) => c.qty > 0)
      );
    }
  };

  const handleCopyDeckList = () => {
    const lines = [
      `// ==========================================`,
      `// MAZO: ${customDeckName.toUpperCase()}`,
      `// FACCIÓN: ${customDeckFaction} | BARAJA: ${totalDeckCards} CARTAS | BANQUILLO: ${totalSideboardCards}/7`,
      `// GENERADO EN CYBERPUNK TCG ESPAÑA (https://cyberpunktcg.es)`,
      `// ==========================================`,
      '',
      `// --- BARAJA PRINCIPAL (${totalDeckCards} CARTAS) ---`,
      ...customDeckList.map((c) => `${c.qty}x ${c.name} (${c.cardId || c.id}) [${c.aspect || c.faction}]`)
    ];

    if (customSideboardList.length > 0) {
      lines.push('');
      lines.push(`// --- BANQUILLO / SIDEBOARD (${totalSideboardCards} CARTAS TECH) ---`);
      customSideboardList.forEach((c) => {
        lines.push(`${c.qty}x ${c.name} (${c.cardId || c.id}) [${c.aspect || c.faction}]`);
      });
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    }
    setCopiedDeck(true);
    setTimeout(() => setCopiedDeck(false), 2500);
  };

  const handleDownloadDeckTxt = () => {
    const lines = [
      `// ==========================================`,
      `// MAZO: ${customDeckName.toUpperCase()}`,
      `// FACCIÓN: ${customDeckFaction} | BARAJA: ${totalDeckCards} CARTAS | BANQUILLO: ${totalSideboardCards}/7`,
      `// ==========================================`,
      '',
      `// --- BARAJA PRINCIPAL (${totalDeckCards} CARTAS) ---`,
      ...customDeckList.map((c) => `${c.qty}x ${c.name} (${c.cardId || c.id}) [${c.aspect || c.faction}]`)
    ];

    if (customSideboardList.length > 0) {
      lines.push('');
      lines.push(`// --- BANQUILLO / SIDEBOARD (${totalSideboardCards} CARTAS TECH) ---`);
      customSideboardList.forEach((c) => {
        lines.push(`${c.qty}x ${c.name} (${c.cardId || c.id}) [${c.aspect || c.faction}]`);
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customDeckName.toLowerCase().replace(/\s+/g, '-')}-decklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clasificación oficial de cartas del mazo (Leyendas, Unidades, Programas, Gears y Banquillo)
  const getCategorizedDeck = (list = customDeckList, sideList = customSideboardList) => {
    const legends = (list || []).filter(
      (c) => c.officialType === 'LEGEND' || (c.cardType || '').toUpperCase().includes('LEGEND')
    );
    const units = (list || []).filter(
      (c) =>
        (c.officialType === 'UNIT' || (c.cardType || '').toUpperCase().includes('UNIT')) &&
        !legends.includes(c)
    );
    const programs = (list || []).filter(
      (c) =>
        (c.officialType === 'PROGRAM' || (c.cardType || '').toUpperCase().includes('PROGRAM')) &&
        !legends.includes(c)
    );
    const gears = (list || []).filter(
      (c) =>
        (c.officialType === 'GEAR' ||
          (c.cardType || '').toUpperCase().includes('GEAR') ||
          (c.cardType || '').toUpperCase().includes('CYBERWARE')) &&
        !legends.includes(c)
    );
    const others = (list || []).filter(
      (c) =>
        !legends.includes(c) &&
        !units.includes(c) &&
        !programs.includes(c) &&
        !gears.includes(c)
    );

    return {
      legends,
      units,
      programs,
      gears,
      others,
      sideboard: sideList || [],
      counts: {
        legends: legends.reduce((a, c) => a + (c.qty || 1), 0),
        units: units.reduce((a, c) => a + (c.qty || 1), 0),
        programs: programs.reduce((a, c) => a + (c.qty || 1), 0),
        gears: gears.reduce((a, c) => a + (c.qty || 1), 0),
        others: others.reduce((a, c) => a + (c.qty || 1), 0),
        sideboard: (sideList || []).reduce((a, c) => a + (c.qty || 1), 0),
        total: (list || []).reduce((a, c) => a + (c.qty || 1), 0)
      }
    };
  };

  // Compartir mazo en Redes Sociales con formato optimizado
  const handleShareDeckToSocial = (platform) => {
    if (customDeckList.length === 0 && customSideboardList.length === 0) return;
    const cat = getCategorizedDeck(customDeckList, customSideboardList);
    const title = `🃏 Mazo Cyberpunk TCG: ${customDeckName.toUpperCase()}`;
    const text = [
      title,
      `⚡ Facción: ${customDeckFaction} • Baraja: ${totalDeckCards} Cartas • Banquillo: ${cat.counts.sideboard}/7 Tech`,
      `👑 Leyendas (${cat.counts.legends}) | 🤖 Unidades (${cat.counts.units}) | 💾 Programas (${cat.counts.programs}) | ⚙️ Gears (${cat.counts.gears})`,
      cat.counts.sideboard > 0 ? `🔄 Banquillo (${cat.counts.sideboard} cartas tech)` : '',
      '',
      '💥 Creado con el Constructor Oficial de Cyberpunk TCG España',
      '#CyberpunkTCG #Cyberpunk2077 #NightCity #CardGame #Decklist'
    ].filter(Boolean).join('\n');

    const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/cartas' : 'https://cyberpunktcg.es';

    if (platform === 'x') {
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'whatsapp') {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'instagram') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text + '\n' + shareUrl);
        setDeckToast('¡Ficha copiada al portapapeles para Instagram!');
        setTimeout(() => setDeckToast(null), 3000);
      }
    }
  };

  // Descarga de Imagen HD del Mazo en Canvas (compatible con Redes Sociales)
  const handleDownloadDeckPosterImage = async (format = socialFormat) => {
    if (customDeckList.length === 0 || typeof document === 'undefined') return;
    setIsGeneratingDeckImg(true);

    try {
      const cat = getCategorizedDeck(customDeckList);
      const isVert = format === 'vertical';
      const isStory = format === 'story';

      // Dimensiones estándar para redes sociales
      let canvasW = 1920;
      let canvasH = 1080;
      if (isVert) {
        canvasW = 1080;
        canvasH = 1350; // Formato 4:5 Instagram Feed
      } else if (isStory) {
        canvasW = 1080;
        canvasH = 1920; // Formato 9:16 Instagram Stories / TikTok
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      // 1. Fondo Oscuro Cyberpunk
      ctx.fillStyle = '#05080e';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Degradado ambiental
      const grad = ctx.createRadialGradient(
        canvasW / 2,
        canvasH / 2,
        100,
        canvasW / 2,
        canvasH / 2,
        canvasW * 0.8
      );
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      grad.addColorStop(0.5, 'rgba(252, 238, 10, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Rejilla cyber
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < canvasW; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasH);
        ctx.stroke();
      }
      for (let y = 0; y < canvasH; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasW, y);
        ctx.stroke();
      }

      // Marco Neon Exterior
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, canvasW - 32, canvasH - 32);

      // Acentos en las esquinas
      ctx.fillStyle = '#FCEE0A';
      ctx.fillRect(16, 16, 40, 6);
      ctx.fillRect(16, 16, 6, 40);
      ctx.fillRect(canvasW - 56, 16, 40, 6);
      ctx.fillRect(canvasW - 22, 16, 6, 40);
      ctx.fillRect(16, canvasH - 22, 40, 6);
      ctx.fillRect(16, canvasH - 56, 6, 40);
      ctx.fillRect(canvasW - 56, canvasH - 22, 40, 6);
      ctx.fillRect(canvasW - 22, canvasH - 56, 6, 40);

      // 2. Cabecera del Póster
      const topPad = 48;
      ctx.fillStyle = '#FCEE0A';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('CYBERPUNK TCG ESPAÑA // DECK SHOWCASE RRSS', 48, topPad);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px sans-serif';
      ctx.fillText(customDeckName.toUpperCase(), 48, topPad + 45);

      // Subtítulo con facción y total
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 18px monospace';
      const statsText = `[FACCIÓN: ${customDeckFaction.toUpperCase()}] • ${totalDeckCards} CARTAS (👑 ${cat.counts.legends} LEYENDAS | 🤖 ${cat.counts.units} UNIDADES | 💾 ${cat.counts.programs} PROGRAMAS | ⚙️ ${cat.counts.gears} GEARS)`;
      ctx.fillText(statsText, 48, topPad + 75);

      // Línea divisoria
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(48, topPad + 95);
      ctx.lineTo(canvasW - 48, topPad + 95);
      ctx.stroke();

      // 3. Helper para cargar imágenes con timeout de seguridad
      const loadImg = (url) =>
        new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
          setTimeout(() => resolve(null), 3000);
        });

      // Secciones a renderizar (incluyendo Banquillo / Sideboard)
      const sections = [
        { title: '👑 LEYENDAS (LÍDERES)', list: cat.legends, color: '#FCEE0A' },
        { title: '🤖 UNIDADES (OPERATIVOS)', list: cat.units, color: '#FF003C' },
        { title: '💾 PROGRAMAS (NETRUNNING)', list: cat.programs, color: '#00F0FF' },
        { title: '⚙️ EQUIPO & GEAR (CYBERWARE)', list: cat.gears, color: '#00FF66' },
        { title: '🔄 BANQUILLO / SIDEBOARD (TECH)', list: cat.sideboard, color: '#00F0FF' }
      ].filter((s) => s.list.length > 0);

      let currentY = topPad + 130;
      const cardW = isVert || isStory ? 100 : 125;
      const cardH = Math.round(cardW * 1.4);
      const gapX = 14;
      const gapY = 16;
      const startX = 48;
      const availableW = canvasW - 96;

      for (const sec of sections) {
        if (currentY + cardH + 60 > canvasH - 70) break;

        // Título de sección
        ctx.fillStyle = sec.color;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${sec.title} (${sec.list.reduce((a, c) => a + (c.qty || 1), 0)})`, startX, currentY);
        currentY += 15;

        let curX = startX;
        let rowMaxY = currentY + cardH;

        for (const card of sec.list) {
          if (curX + cardW > startX + availableW) {
            curX = startX;
            currentY += cardH + gapY;
            rowMaxY = currentY + cardH;
            if (currentY + cardH > canvasH - 80) break;
          }

          const img = await loadImg(card.image);
          if (img) {
            ctx.drawImage(img, curX, currentY, cardW, cardH);
          } else {
            ctx.fillStyle = '#111827';
            ctx.fillRect(curX, currentY, cardW, cardH);
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '10px monospace';
            ctx.fillText((card.name || '').slice(0, 14), curX + 4, currentY + 30);
          }

          // Borde de la carta
          ctx.strokeStyle = sec.color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(curX, currentY, cardW, cardH);

          // Píldora de cantidad (x2, x3)
          if ((card.qty || 1) > 1) {
            ctx.fillStyle = '#FCEE0A';
            ctx.fillRect(curX + cardW - 28, currentY + 4, 24, 18);
            ctx.fillStyle = '#070a10';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`x${card.qty}`, curX + cardW - 25, currentY + 17);
          }

          curX += cardW + gapX;
        }

        currentY = rowMaxY + 28;
      }

      // 4. Pie de página del póster
      ctx.fillStyle = '#070a10';
      ctx.fillRect(20, canvasH - 60, canvasW - 40, 40);
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('CONSTRUIDO EN CYBERPUNK TCG ESPAÑA (https://cyberpunktcg.es)', 48, canvasH - 35);
      ctx.fillStyle = '#FCEE0A';
      ctx.fillText('#CyberpunkTCG #Cyberpunk2077 #NightCity #Decklist', canvasW - 460, canvasH - 35);

      // 5. Descargar imagen PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (customDeckName || 'mazo')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        a.download = `${cleanName}-${format}-cyberpunk-tcg.png`;
        a.click();
        URL.revokeObjectURL(url);
        setDeckToast('¡Póster HD (.PNG) descargado con éxito!');
        setTimeout(() => setDeckToast(null), 3000);
      }, 'image/png');
    } catch (err) {
      console.error('Error generating deck poster:', err);
      setDeckToast('Error al generar la imagen. Puedes hacer captura directa.');
      setTimeout(() => setDeckToast(null), 3500);
    } finally {
      setIsGeneratingDeckImg(false);
    }
  };

  // Estados de Top Mazos del Meta
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState(topDecks[0]?.cards?.[0] || null);
  const [deckViewMode, setDeckViewMode] = useState('graphic'); // 'graphic' | 'text'
  const [copiedFullDeck, setCopiedFullDeck] = useState(false);

  // Estados del Lightbox Interactivo con Zoom y Pantalla Completa
  const [lightboxCard, setLightboxCard] = useState(null);
  const [lightboxList, setLightboxList] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [socialToast, setSocialToast] = useState(null);

  // Sincronizar estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Seleccionar mazo activo desde la URL (?deck=ID) al cargar /mazos
  useEffect(() => {
    if (typeof window !== 'undefined' && topDecks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const deckParam = params.get('deck');
      if (deckParam) {
        const found = topDecks.findIndex(
          (d) =>
            d.id === deckParam ||
            d.slug === deckParam ||
            d.id?.toLowerCase() === deckParam.toLowerCase() ||
            (d.name && d.name.toLowerCase().includes(deckParam.toLowerCase()))
        );
        if (found !== -1) {
          setActiveDeckIndex(found);
        }
      }
    }
  }, [topDecks]);

  // Teclado para navegación en Lightbox
  useEffect(() => {
    if (!lightboxCard) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxCard(null);
        setLightboxZoom(false);
      } else if (e.key === 'ArrowLeft') {
        handlePrevLightboxCard();
      } else if (e.key === 'ArrowRight') {
        handleNextLightboxCard();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'z' || e.key === 'Z') {
        setLightboxZoom((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxCard, lightboxList, lightboxIndex]);

  // Manejador apertura de Lightbox
  const handleOpenLightbox = (card, list = [], index = 0) => {
    setLightboxCard(card);
    setLightboxList(list.length > 0 ? list : [card]);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxZoom(false);
    setZoomPos({ x: 50, y: 50 });
  };

  const handleNextLightboxCard = () => {
    if (lightboxList.length <= 1) return;
    const nextIdx = (lightboxIndex + 1) % lightboxList.length;
    setLightboxIndex(nextIdx);
    setLightboxCard(lightboxList[nextIdx]);
    setLightboxZoom(false);
  };

  const handlePrevLightboxCard = () => {
    if (lightboxList.length <= 1) return;
    const prevIdx = (lightboxIndex - 1 + lightboxList.length) % lightboxList.length;
    setLightboxIndex(prevIdx);
    setLightboxCard(lightboxList[prevIdx]);
    setLightboxZoom(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Movimiento del cursor para pan en Zoom 2X interactivo
  const handleMouseMoveZoom = (e) => {
    if (!lightboxZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  // Compartir en redes sociales
  const handleShareArticle = (article, platform) => {
    if (!article || typeof window === 'undefined') return;
    const url = window.location.origin + '/noticias#' + (article.id || '');
    const title = article.title || 'Cyberpunk TCG Noticia';
    const text = `${title} - Cyberpunk TCG España`;

    let shareUrl = '';
    if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'x') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'mail') {
      shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
      window.location.href = shareUrl;
    } else if (platform === 'instagram') {
      navigator.clipboard?.writeText(url);
      setSocialToast('Enlace copiado al portapapeles para Instagram');
      setTimeout(() => setSocialToast(null), 3000);
      return;
    }
  };

  // Helpers para obtener Leyendas y Carta Destacada del mazo
  const getDeckLegends = (deck) => {
    if (!deck) return [];
    if (Array.isArray(deck.legends) && deck.legends.length > 0) return deck.legends;
    if (Array.isArray(deck.cards)) return deck.cards.slice(0, 3);
    return [];
  };

  const getFeaturedCard = (deck) => {
    if (!deck) return null;
    if (deck.featuredCard) return deck.featuredCard;
    if (Array.isArray(deck.cards) && deck.cards.length > 3) return deck.cards[3];
    return null;
  };

  // Copiar lista de torneo completa
  const handleCopyFullDecklist = (deck) => {
    if (!deck) return;
    const legends = getDeckLegends(deck);
    const mainCards = deck.deckList || [];
    const sideCards = deck.sideboard || [];
    const mainTotal = mainCards.reduce((acc, c) => acc + (c.qty || 1), 0);
    const sideTotal = sideCards.reduce((acc, c) => acc + (c.qty || 1), 0);

    const lines = [
      `// ==========================================`,
      `// MAZO: ${(deck.name || '').trim().toUpperCase()}`,
      `// ${deck.tier || 'TIER 1'} | ARQUETIPO: ${deck.archetype || 'COMPETITIVO'}`,
      `// PILOTO: @${deck.pilot || 'ProPlayer'} | WINRATE: ${deck.winrate || '—'}`,
      `// ESTRUCTURA: 3 LEYENDAS + ${mainTotal} BARAJA PRINCIPAL + ${sideTotal} BANQUILLO`,
      `// GENERADO EN CYBERPUNK TCG ESPAÑA (https://cyberpunktcg.es)`,
      `// ==========================================`,
      '',
      `// --- 3 LEYENDAS (LÍDERES) ---`,
      ...legends.map((l) => `1x ${l.name} (${l.cardId || l.id}) [${l.aspect || l.faction || 'CORPO'}]`),
      '',
      `// --- BARAJA PRINCIPAL (${mainTotal} CARTAS) ---`
    ];

    const units = mainCards.filter(c => c.officialType === 'UNIT' || (c.cardType || '').toUpperCase().includes('UNIT'));
    const programs = mainCards.filter(c => c.officialType === 'PROGRAM' || (c.cardType || '').toUpperCase().includes('PROGRAM'));
    const gears = mainCards.filter(c => c.officialType === 'GEAR' || (c.cardType || '').toUpperCase().includes('GEAR') || (c.cardType || '').toUpperCase().includes('CYBERWARE'));
    const others = mainCards.filter(c => !units.includes(c) && !programs.includes(c) && !gears.includes(c));

    if (units.length > 0) {
      lines.push(`// [UNIDADES (${units.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      units.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (programs.length > 0) {
      lines.push(`// [PROGRAMAS (${programs.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      programs.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (gears.length > 0) {
      lines.push(`// [EQUIPO / GEAR (${gears.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      gears.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (others.length > 0) {
      lines.push(`// [OTRAS CARTAS (${others.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      others.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }

    if (sideCards.length > 0) {
      lines.push(`// --- BANQUILLO / SIDEBOARD (${sideTotal} CARTAS) ---`);
      sideCards.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }

    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setCopiedFullDeck(true);
      setTimeout(() => setCopiedFullDeck(false), 2500);
    });
  };

  // Descargar mazo de torneo en formato .txt
  const handleDownloadFullDeckTxt = (deck) => {
    if (!deck) return;
    const legends = getDeckLegends(deck);
    const mainCards = deck.deckList || [];
    const sideCards = deck.sideboard || [];
    const mainTotal = mainCards.reduce((acc, c) => acc + (c.qty || 1), 0);
    const sideTotal = sideCards.reduce((acc, c) => acc + (c.qty || 1), 0);

    const lines = [
      `// ==========================================`,
      `// MAZO: ${(deck.name || '').trim().toUpperCase()}`,
      `// ${deck.tier || 'TIER 1'} | ARQUETIPO: ${deck.archetype || 'COMPETITIVO'}`,
      `// PILOTO: @${deck.pilot || 'ProPlayer'} | WINRATE: ${deck.winrate || '—'}`,
      `// ESTRUCTURA: 3 LEYENDAS + ${mainTotal} BARAJA PRINCIPAL + ${sideTotal} BANQUILLO`,
      `// GENERADO EN CYBERPUNK TCG ESPAÑA (https://cyberpunktcg.es)`,
      `// ==========================================`,
      '',
      `// --- 3 LEYENDAS (LÍDERES) ---`,
      ...legends.map((l) => `1x ${l.name} (${l.cardId || l.id}) [${l.aspect || l.faction || 'CORPO'}]`),
      '',
      `// --- BARAJA PRINCIPAL (${mainTotal} CARTAS) ---`
    ];

    const units = mainCards.filter(c => c.officialType === 'UNIT' || (c.cardType || '').toUpperCase().includes('UNIT'));
    const programs = mainCards.filter(c => c.officialType === 'PROGRAM' || (c.cardType || '').toUpperCase().includes('PROGRAM'));
    const gears = mainCards.filter(c => c.officialType === 'GEAR' || (c.cardType || '').toUpperCase().includes('GEAR') || (c.cardType || '').toUpperCase().includes('CYBERWARE'));
    const others = mainCards.filter(c => !units.includes(c) && !programs.includes(c) && !gears.includes(c));

    if (units.length > 0) {
      lines.push(`// [UNIDADES (${units.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      units.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (programs.length > 0) {
      lines.push(`// [PROGRAMAS (${programs.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      programs.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (gears.length > 0) {
      lines.push(`// [EQUIPO / GEAR (${gears.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      gears.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }
    if (others.length > 0) {
      lines.push(`// [OTRAS CARTAS (${others.reduce((a, c) => a + (c.qty || 1), 0)})]`);
      others.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }

    if (sideCards.length > 0) {
      lines.push(`// --- BANQUILLO / SIDEBOARD (${sideTotal} CARTAS) ---`);
      sideCards.forEach(c => lines.push(`${c.qty || 1}x ${c.name} (${c.cardId || c.id})`));
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(deck.name || 'mazo-torneo').toLowerCase().replace(/[^a-z0-9]/g, '-')}-cyberpunk-tcg.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // Filtrado en tiempo real de las cartas del Catálogo Oficial
  const filteredDatabaseCards = allCards.filter((card) => {
    // 1. Filtro por Tipo de carta oficial
    let matchesType = true;
    if (cardTypeFilter === 'UNIDADES') {
      matchesType = card.officialType === 'UNIT' || (card.cardType || '').toUpperCase().includes('UNIT');
    } else if (cardTypeFilter === 'PROGRAMAS') {
      matchesType = card.officialType === 'PROGRAM' || (card.cardType || '').toUpperCase().includes('PROGRAM');
    } else if (cardTypeFilter === 'EQUIPO') {
      matchesType = card.officialType === 'GEAR' || (card.cardType || '').toUpperCase().includes('GEAR') || (card.cardType || '').toUpperCase().includes('CYBERWARE');
    } else if (cardTypeFilter === 'LEYENDAS') {
      matchesType = card.officialType === 'LEGEND' || (card.cardType || '').toUpperCase().includes('LEGEND');
    }

    // 2. Filtro por Color / Aspect oficial
    let matchesColor = true;
    const aspectUpper = (card.aspect || '').toUpperCase();
    if (cardColorFilter === 'ROJO') {
      matchesColor = aspectUpper === 'RED' || aspectUpper === 'ROJO';
    } else if (cardColorFilter === 'VERDE') {
      matchesColor = aspectUpper === 'GREEN' || aspectUpper === 'VERDE';
    } else if (cardColorFilter === 'AMARILLO') {
      matchesColor = aspectUpper === 'YELLOW' || aspectUpper === 'AMARILLO';
    } else if (cardColorFilter === 'AZUL') {
      matchesColor = aspectUpper === 'BLUE' || aspectUpper === 'AZUL';
    }

    // 3. Búsqueda por texto (nombre, id, habilidad, etc.)
    const q = cardSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      card.name?.toLowerCase().includes(q) ||
      card.slug?.toLowerCase().includes(q) ||
      card.id?.toLowerCase().includes(q) ||
      card.cardId?.toLowerCase().includes(q) ||
      card.aspect?.toLowerCase().includes(q) ||
      card.officialType?.toLowerCase().includes(q) ||
      card.ability?.toLowerCase().includes(q);

    return matchesType && matchesColor && matchesQuery;
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
      <section aria-labelledby="bestsellers-heading" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-[#FF003C]" />
              <span>BEST SELLERS // LO MÁS BUSCADO</span>
            </div>
            <h2
              id="bestsellers-heading"
              className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white"
            >
              CARTAS <span className="text-[#FCEE0A]">MÁS VENDIDAS</span>{' '}
              <span className="text-[#00F0FF]">// CARDMARKET</span>
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
              {/* Cabecera Ranking Cardmarket + ID */}
              <div className="p-4 border-b border-gray-800 bg-[#070a10] flex items-center justify-between gap-2">
                <span
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-2.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-[10px] uppercase tracking-wider"
                >
                  {card.badge || `TOP #0${idx + 1} BEST SELLER // CARDMARKET`}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#00F0FF] shrink-0">
                  {card.cardId || card.id}
                </span>
              </div>

              {/* Imagen de la Carta */}
              <div className="relative h-96 w-full bg-gradient-to-b from-[#070a10] via-[#000000] to-[#070a10] p-6 flex items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.14),transparent_70%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                <img
                  src={card.image}
                  alt={card.name}
                  className="relative z-10 max-h-full w-auto object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]"
                />
              </div>

              {/* Ficha Técnica Completa de la Carta */}
              <div className="p-5 bg-[#000000] border-t border-gray-800 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-black text-[#00F0FF] uppercase tracking-wider">
                      {card.cardType || card.faction || 'MERC // EDGERUNNER'}
                    </span>
                    <span className="text-[10px] font-mono text-[#FCEE0A] uppercase">
                      {card.edition || '—'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase truncate group-hover:text-[#FCEE0A] transition-colors">
                    {card.name}
                  </h3>
                </div>

                {/* Rejilla de Metadatos (ID, Tipo, Edición, Artista, Colección) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-900 text-[11px] font-mono">
                  <div className="bg-[#070a10] border border-gray-800/80 px-2.5 py-1.5">
                    <span className="text-[9px] text-gray-500 uppercase block">ARTISTA</span>
                    <span className="text-gray-200 font-bold truncate block">
                      {card.artist || '—'}
                    </span>
                  </div>
                  <div className="bg-[#070a10] border border-gray-800/80 px-2.5 py-1.5">
                    <span className="text-[9px] text-gray-500 uppercase block">ID CARTA</span>
                    <span className="text-[#00F0FF] font-bold truncate block">
                      {card.cardId || card.id}
                    </span>
                  </div>
                  <div className="col-span-2 bg-[#070a10] border border-gray-800/80 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-gray-500 uppercase block">COLECCIÓN</span>
                      <span className="text-[#FCEE0A] font-bold truncate block">
                        {card.collection || 'Welcome to Night City (Set 01)'}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono font-bold text-[#00F0FF] group-hover:text-[#FCEE0A] uppercase flex items-center gap-0.5">
                      <span>VER FICHA</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
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

    const deckLegends = getDeckLegends(activeDeck);
    const deckFeatured = getFeaturedCard(activeDeck);
    const isFeaturedInLegends =
      deckFeatured &&
      deckLegends.some(
        (l) => l.id === deckFeatured.id || l.name === deckFeatured.name || l.cardId === deckFeatured.cardId
      );

    const previewCards =
      isFeaturedInLegends || !deckFeatured
        ? deckLegends.map((l, i) => ({ ...l, previewBadge: `LEYENDA #0${i + 1}` }))
        : [
            ...deckLegends.map((l, i) => ({ ...l, previewBadge: `LEYENDA #0${i + 1}` })),
            { ...deckFeatured, previewBadge: '★ CARTA DESTACADA // TECH', isTech: true }
          ];

    const mainList = activeDeck.deckList || [];
    const mainUnits = mainList.filter(
      (c) => c.officialType === 'UNIT' || (c.cardType || '').toUpperCase().includes('UNIT')
    );
    const mainPrograms = mainList.filter(
      (c) => c.officialType === 'PROGRAM' || (c.cardType || '').toUpperCase().includes('PROGRAM')
    );
    const mainGears = mainList.filter(
      (c) =>
        c.officialType === 'GEAR' ||
        (c.cardType || '').toUpperCase().includes('GEAR') ||
        (c.cardType || '').toUpperCase().includes('CYBERWARE')
    );
    const mainOthers = mainList.filter(
      (c) => !mainUnits.includes(c) && !mainPrograms.includes(c) && !mainGears.includes(c)
    );

    const sideList = activeDeck.sideboard || [];
    const totalMainCards = mainList.reduce((acc, c) => acc + (c.qty || 1), 0);
    const totalSideCards = sideList.reduce((acc, c) => acc + (c.qty || 1), 0);

    return (
      <section id="mazos" aria-labelledby="decks-heading" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF003C] uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-[#FF003C]" />
              <span>{showAllLink ? 'TIER LISTS' : 'RANKING DE MAZOS'}</span>
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
                  key={deck.id || idx}
                  type="button"
                  onClick={() => handleSelectDeck(idx)}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.55)]'
                      : 'bg-[#000000] text-gray-200 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  }`}
                >
                  <span className="text-[#FF003C] font-bold">[{deck.tier || 'TIER 1'}]</span>
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

        <div className="space-y-6">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="relative overflow-hidden border border-gray-800 bg-[#000000] p-6 sm:p-8 rounded-none"
          >
            <img
              src={activeDeck.bannerWallpaper || '/images/wallpapers/Night_City_3840x2160.png'}
              alt={activeDeck.name}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#070a10]/90 to-transparent" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    style={{ clipPath: CYBER_CLIP }}
                    className="px-3 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase rounded-none"
                  >
                    {activeDeck.tier || 'TIER 1'}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider bg-[#070a10]/80 px-2.5 py-1 border border-gray-800">
                    {activeDeck.archetype}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    3 Leyendas • {totalMainCards} Baraja Principal • {totalSideCards} Banquillo
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase">
                  {activeDeck.name}
                </h3>
                <p className="text-sm text-gray-200 max-w-2xl leading-relaxed">
                  {activeDeck.description}
                </p>
              </div>

              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#070a10]/95 border border-gray-800 px-5 py-3.5 text-right font-mono shrink-0 rounded-none shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              >
                <span className="text-[10px] text-gray-400 uppercase block">
                  WINRATE CONFIRMADO
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#FCEE0A]">
                  {activeDeck.winrate || '58.4%'}
                </span>
                <span className="text-[11px] text-[#00F0FF] block mt-0.5">
                  PILOTO: @{activeDeck.pilot || 'ProPlayer'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <span className="text-xs font-mono text-[#00F0FF] uppercase flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-[#FF003C]" />
                <span>3 LEYENDAS {!isFeaturedInLegends && deckFeatured ? '+ 1 CARTA DESTACADA // SECRET TECH' : ''}</span>
              </span>
              <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-[#FCEE0A]" />
                <span>Haz clic en cualquier carta para ampliar</span>
              </span>
            </div>

            <div
              className={`grid grid-cols-1 ${
                previewCards.length === 4
                  ? 'sm:grid-cols-2 lg:grid-cols-4'
                  : 'sm:grid-cols-3'
              } gap-6`}
            >
              {previewCards.map((card, idx) => (
                <motion.div
                  key={`preview-${card.id || card.cardId || idx}`}
                  onClick={() => handleOpenLightbox(card, previewCards, idx)}
                  whileHover={{
                    scale: 1.03,
                    y: -6,
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.45)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  style={{ clipPath: CYBER_CLIP }}
                  className={`group cursor-pointer bg-[#000000] border transition-all flex flex-col justify-between overflow-hidden relative rounded-none ${
                    card.isTech
                      ? 'border-[#00F0FF] hover:border-[#FCEE0A]'
                      : 'border-gray-800 hover:border-[#00F0FF]'
                  }`}
                >
                  <div className="p-3 bg-[#070a10] border-b border-gray-800 flex items-center justify-between gap-2">
                    <span
                      style={{ clipPath: CYBER_CLIP }}
                      className={`px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider ${
                        card.isTech
                          ? 'bg-[#00F0FF] text-[#070a10]'
                          : 'bg-[#FCEE0A] text-[#070a10]'
                      }`}
                    >
                      {card.previewBadge}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-gray-400">
                      {card.cardId || card.id}
                    </span>
                  </div>

                  <div className="relative h-72 w-full bg-gradient-to-b from-[#070a10] to-[#000000] p-4 flex items-center justify-center overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="max-h-full w-auto object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.9)]"
                    />
                    <div className="absolute inset-0 bg-[#070a10]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-3 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase flex items-center gap-1.5"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>AMPLIAR</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#000000] border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#00F0FF] font-bold uppercase truncate">
                        {card.cardType || card.faction}
                      </span>
                      {card.cost && <span className="text-[#FCEE0A] font-bold">{card.cost}</span>}
                    </div>
                    <h4 className="text-base font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors truncate">
                      {card.name}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                      {card.ability}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {showAllLink && (
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000000] border-2 border-[#00F0FF] p-6 shadow-[0_0_30px_rgba(0,240,255,0.2)] rounded-none"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#FCEE0A] uppercase tracking-widest block">
                  ESTRUCTURA COMPETITIVA OFICIAL
                </span>
                <h4 className="text-lg sm:text-xl font-black text-white uppercase">
                  3 Leyendas + {totalMainCards} Cartas en Baraja Principal + {totalSideCards} en Banquillo
                </h4>
                <p className="text-xs font-mono text-gray-300">
                  Accede a la lista competitiva completa del mazo en formato gráfico interactivo y texto exportable para torneos.
                </p>
              </div>

              <a
                href={`/mazos?deck=${activeDeck.id}`}
                style={{ clipPath: CYBER_CLIP }}
                className="px-6 py-3.5 bg-[#00F0FF] text-[#070a10] hover:bg-[#FCEE0A] font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,255,0.5)] shrink-0 rounded-none cursor-pointer"
              >
                <span>VER MAZO COMPLETO ({totalMainCards} + {totalSideCards} CARTAS)</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          )}

          {!showAllLink && (
            <div className="space-y-6 pt-6 border-t-2 border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000000] border border-gray-800 p-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#00F0FF]" />
                    <span>BARAJA PRINCIPAL COMPETITIVA // {totalMainCards} CARTAS</span>
                  </h3>
                  <p className="text-xs font-mono text-gray-400">
                    3 Leyendas + {totalMainCards} Cartas Baraja Principal + {totalSideCards} Cartas en Banquillo (Sideboard)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setDeckViewMode('graphic')}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`px-4 py-2 font-black uppercase tracking-wider border cursor-pointer transition-all ${
                      deckViewMode === 'graphic'
                        ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                        : 'bg-[#070a10] text-gray-300 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                    }`}
                  >
                    [FORMATO GRÁFICO]
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeckViewMode('text')}
                    style={{ clipPath: CYBER_CLIP }}
                    className={`px-4 py-2 font-black uppercase tracking-wider border cursor-pointer transition-all ${
                      deckViewMode === 'text'
                        ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                        : 'bg-[#070a10] text-gray-300 border-gray-800 hover:border-[#FCEE0A] hover:text-[#FCEE0A]'
                    }`}
                  >
                    [FORMATO TEXTO]
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyFullDecklist(activeDeck)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="px-4 py-2 bg-[#070a10] border border-gray-700 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedFullDeck ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedFullDeck ? '¡COPIADO!' : 'COPIAR LISTA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadFullDeckTxt(activeDeck)}
                    style={{ clipPath: CYBER_CLIP }}
                    className="px-4 py-2 bg-[#070a10] border border-gray-700 hover:border-[#00F0FF] text-[#00F0FF] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>EXPORTAR .TXT</span>
                  </button>
                </div>
              </div>

              {deckViewMode === 'graphic' && (
                <div className="space-y-8">
                  {[
                    { title: 'UNIDADES', list: mainUnits, color: '#00F0FF' },
                    { title: 'PROGRAMAS', list: mainPrograms, color: '#FCEE0A' },
                    { title: 'EQUIPO / GEAR', list: mainGears, color: '#FF003C' },
                    { title: 'OTRAS CARTAS', list: mainOthers, color: '#FFFFFF' }
                  ]
                    .filter((cat) => cat.list.length > 0)
                    .map((cat) => {
                      const catTotal = cat.list.reduce((acc, c) => acc + (c.qty || 1), 0);
                      return (
                        <div key={cat.title} className="space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <h4
                              className="text-sm font-mono font-bold uppercase flex items-center gap-2"
                              style={{ color: cat.color }}
                            >
                              <span>// {cat.title} ({catTotal} CARTAS)</span>
                            </h4>
                            <span className="text-xs font-mono text-gray-500">
                              {cat.list.length} tipos de cartas diferentes
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {cat.list.map((card, idx) => (
                              <motion.div
                                key={`main-${cat.title}-${card.id || idx}`}
                                onClick={() => handleOpenLightbox(card, mainList)}
                                whileHover={{ scale: 1.05, y: -6 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ clipPath: CYBER_CLIP }}
                                className="group cursor-pointer bg-[#000000] border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex flex-col justify-between overflow-hidden relative"
                              >
                                <div className="p-2 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                  <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                                    x{card.qty || 1}
                                  </span>
                                  <span className="text-[#00F0FF] font-bold">{card.cardId || card.id}</span>
                                </div>

                                <div className="relative h-44 w-full bg-gradient-to-b from-[#070a10] to-[#000000] p-2 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={card.image}
                                    alt={card.name}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]"
                                  />
                                  <div className="absolute inset-0 bg-[#070a10]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <ZoomIn className="w-5 h-5 text-[#FCEE0A]" />
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#000000] border-t border-gray-800">
                                  <p className="text-[11px] font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors truncate">
                                    {card.name}
                                  </p>
                                  <span className="text-[9px] font-mono text-gray-500 block truncate">
                                    {card.cardType || card.faction}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {sideList.length > 0 && (
                    <div className="space-y-4 pt-6 border-t-2 border-dashed border-gray-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                        <h4 className="text-sm font-mono font-bold uppercase text-[#00F0FF] flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#FCEE0A]" />
                          <span>// BANQUILLO / SIDEBOARD ({totalSideCards} CARTAS TECH)</span>
                        </h4>
                        <span className="text-[11px] font-mono text-gray-400">
                          Cartas de sustitución táctica para enfrentamientos específicos (máximo 7 cartas en torneo)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {sideList.map((card, idx) => (
                          <motion.div
                            key={`side-${card.id}-${idx}`}
                            onClick={() => handleOpenLightbox(card, sideList)}
                            whileHover={{ scale: 1.05, y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ clipPath: CYBER_CLIP }}
                            className="group cursor-pointer bg-[#000000] border border-[#00F0FF]/40 hover:border-[#FCEE0A] hover:shadow-[0_0_20px_rgba(252,238,10,0.4)] transition-all flex flex-col justify-between overflow-hidden relative"
                          >
                            <div className="p-2 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black">
                                x{card.qty || 1}
                              </span>
                              <span className="text-gray-400 text-[9px] font-bold">SIDEBOARD</span>
                            </div>

                            <div className="relative h-44 w-full bg-gradient-to-b from-[#070a10] to-[#000000] p-2 flex items-center justify-center overflow-hidden">
                              <img
                                src={card.image}
                                alt={card.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]"
                              />
                              <div className="absolute inset-0 bg-[#070a10]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <ZoomIn className="w-5 h-5 text-[#FCEE0A]" />
                              </div>
                            </div>

                            <div className="p-2.5 bg-[#000000] border-t border-gray-800">
                              <p className="text-[11px] font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors truncate">
                                {card.name}
                              </p>
                              <span className="text-[9px] font-mono text-gray-500 block truncate">
                                {card.cardType || card.faction || 'TECH'}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deckViewMode === 'text' && (
                <div
                  style={{ clipPath: CYBER_CLIP }}
                  className="bg-[#000000] border-2 border-[#00F0FF] p-6 space-y-6 text-xs font-mono"
                >
                  <div className="border-b border-gray-800 pb-3 flex flex-wrap items-center justify-between gap-2 text-gray-400">
                    <span className="text-[#00F0FF]">
                      TERMINAL // DECKLIST: {activeDeck.name.toUpperCase()}
                    </span>
                    <span>
                      3 LEYENDAS + {totalMainCards} BARAJA PRINCIPAL + {totalSideCards} BANQUILLO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="space-y-2 bg-[#070a10] p-4 border border-gray-800">
                      <h4 className="text-xs font-black text-[#FCEE0A] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
                        <span>3 LEYENDAS</span>
                        <span>3/3</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        {deckLegends.map((l, i) => (
                          <li
                            key={`txt-leg-${l.id || i}`}
                            onClick={() => handleOpenLightbox(l, deckLegends)}
                            className="text-gray-300 hover:text-[#FCEE0A] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-white mr-1.5">1x</strong>
                              {l.name}
                            </span>
                            <span className="text-gray-500 text-[10px] shrink-0">{l.cardId || l.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 bg-[#070a10] p-4 border border-gray-800">
                      <h4 className="text-xs font-black text-[#00F0FF] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
                        <span>UNIDADES</span>
                        <span>{mainUnits.reduce((a, c) => a + (c.qty || 1), 0)}</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        {mainUnits.map((c, i) => (
                          <li
                            key={`txt-unit-${c.id || i}`}
                            onClick={() => handleOpenLightbox(c, mainList)}
                            className="text-gray-300 hover:text-[#00F0FF] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-white mr-1.5">{c.qty || 1}x</strong>
                              {c.name}
                            </span>
                            <span className="text-gray-500 text-[10px] shrink-0">{c.cardId || c.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 bg-[#070a10] p-4 border border-gray-800">
                      <h4 className="text-xs font-black text-[#FCEE0A] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
                        <span>PROGRAMAS</span>
                        <span>{mainPrograms.reduce((a, c) => a + (c.qty || 1), 0)}</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        {mainPrograms.map((c, i) => (
                          <li
                            key={`txt-prog-${c.id || i}`}
                            onClick={() => handleOpenLightbox(c, mainList)}
                            className="text-gray-300 hover:text-[#FCEE0A] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-white mr-1.5">{c.qty || 1}x</strong>
                              {c.name}
                            </span>
                            <span className="text-gray-500 text-[10px] shrink-0">{c.cardId || c.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 bg-[#070a10] p-4 border border-gray-800">
                      <h4 className="text-xs font-black text-[#FF003C] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
                        <span>EQUIPO / GEAR</span>
                        <span>{mainGears.reduce((a, c) => a + (c.qty || 1), 0)}</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        {mainGears.map((c, i) => (
                          <li
                            key={`txt-gear-${c.id || i}`}
                            onClick={() => handleOpenLightbox(c, mainList)}
                            className="text-gray-300 hover:text-[#FF003C] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-white mr-1.5">{c.qty || 1}x</strong>
                              {c.name}
                            </span>
                            <span className="text-gray-500 text-[10px] shrink-0">{c.cardId || c.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 bg-[#070a10] p-4 border border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                      <h4 className="text-xs font-black text-[#00F0FF] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
                        <span>BANQUILLO</span>
                        <span className="text-[#FCEE0A] font-bold">{totalSideCards}/7</span>
                      </h4>
                      <ul className="space-y-1.5 pt-1">
                        {sideList.map((c, i) => (
                          <li
                            key={`txt-side-${c.id || i}`}
                            onClick={() => handleOpenLightbox(c, sideList)}
                            className="text-gray-300 hover:text-[#00F0FF] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="truncate pr-2">
                              <strong className="text-white mr-1.5">{c.qty || 1}x</strong>
                              {c.name}
                            </span>
                            <span className="text-gray-500 text-[10px] shrink-0">{c.cardId || c.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[11px] text-gray-500 border-t border-gray-800">
                    <span>* Pulsa sobre cualquier carta para abrir el escáner Lightbox</span>
                    <button
                      type="button"
                      onClick={() => handleCopyFullDecklist(activeDeck)}
                      className="text-[#00F0FF] hover:text-[#FCEE0A] font-bold uppercase cursor-pointer"
                    >
                      Copiar lista completa al portapapeles
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
              <span>PANORAMA COMPETITIVO // ESPAÑA</span>
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
            MODAL VISOR DE CARTA EN ALTA RESOLUCIÓN // LIGHTBOX CON ZOOM Y PANTALLA COMPLETA
           ===================================================================== */}
        <AnimatePresence>
          {(lightboxCard || modalCard) && (() => {
            const currentCard = lightboxCard || modalCard;
            const currentList = lightboxList.length > 0 ? lightboxList : [currentCard];
            const currentIdx = lightboxIndex >= 0 ? lightboxIndex : 0;

            const handleCloseModal = () => {
              setLightboxCard(null);
              setModalCard(null);
              setLightboxZoom(false);
            };

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
                className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.92, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.92, y: 15 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ clipPath: CYBER_CLIP }}
                  className="max-w-2xl w-full bg-[#070a10] border-2 border-[#FCEE0A] shadow-[0_0_50px_rgba(252,238,10,0.4)] p-5 sm:p-6 space-y-4 relative rounded-none my-auto"
                >
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3 gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider block truncate">
                        ESCÁNER // {currentCard.cardId || currentCard.id} • {currentCard.officialType || currentCard.cardType || currentCard.type || currentCard.faction}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white uppercase truncate">
                        {currentCard.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxZoom(!lightboxZoom)}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          lightboxZoom
                            ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                            : 'bg-[#000000] text-[#FCEE0A] border-[#FCEE0A] hover:bg-[#FCEE0A] hover:text-[#070a10]'
                        }`}
                        title={lightboxZoom ? 'Ajustar imagen (1x)' : 'Zoom interactivo 2X'}
                      >
                        {lightboxZoom ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{lightboxZoom ? '1X' : '2X'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          isFullscreen
                            ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                            : 'bg-[#000000] text-[#00F0FF] border-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#070a10]'
                        }`}
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                      >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isFullscreen ? 'SALIR' : 'PANTALLA'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseModal}
                        style={{ clipPath: CYBER_CLIP }}
                        className="p-1.5 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] cursor-pointer transition-colors"
                        title="Cerrar visor (Escape)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative bg-[#000000] border border-gray-800 p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[380px] select-none">
                    {currentList.length > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevLightboxCard}
                        style={{ clipPath: CYBER_CLIP }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-[#070a10]/90 border border-gray-700 hover:border-[#00F0FF] text-white hover:text-[#00F0FF] cursor-pointer transition-all"
                        title="Carta anterior (Flecha Izquierda)"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    <div
                      className={`relative max-h-[58vh] overflow-hidden flex items-center justify-center ${
                        lightboxZoom ? 'cursor-zoom-out' : 'cursor-zoom-in'
                      }`}
                      onClick={() => setLightboxZoom(!lightboxZoom)}
                      onMouseMove={handleMouseMoveZoom}
                    >
                      <img
                        src={currentCard.image}
                        alt={currentCard.name}
                        style={
                          lightboxZoom
                            ? {
                                transform: 'scale(2.2)',
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transition: 'transform 0.12s ease-out'
                              }
                            : {
                                transform: 'scale(1)',
                                transition: 'transform 0.25s ease'
                              }
                        }
                        className="max-h-[55vh] w-auto object-contain drop-shadow-[0_0_35px_rgba(0,0,0,0.95)]"
                      />
                    </div>

                    {currentList.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNextLightboxCard}
                        style={{ clipPath: CYBER_CLIP }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-[#070a10]/90 border border-gray-700 hover:border-[#00F0FF] text-white hover:text-[#00F0FF] cursor-pointer transition-all"
                        title="Carta siguiente (Flecha Derecha)"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-gray-500 pointer-events-none">
                      <span>{currentList.length > 1 ? `Carta ${currentIdx + 1} de ${currentList.length}` : 'Visor Oficial'}</span>
                      <span>{lightboxZoom ? 'Mueve el ratón para explorar • Clic para reducir' : 'Haz clic o pulsa Z para zoom 2X'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-[#000000] border border-gray-800 p-3">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">ID CARTA</span>
                      <span className="text-[#00F0FF] font-bold block truncate">
                        {currentCard.cardId || currentCard.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">TIPO OFICIAL</span>
                      <span className="text-[#FCEE0A] font-bold block truncate">
                        {currentCard.officialType || currentCard.cardType || currentCard.type || 'CARTA'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">COLOR / ASPECT</span>
                      <span className="text-white font-bold block truncate">
                        {currentCard.aspect || currentCard.faction || 'INCOLORA'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">EDICIÓN</span>
                      <span className="text-gray-300 font-bold block truncate">
                        {currentCard.edition || 'Set 01'}
                      </span>
                    </div>

                    {(currentCard.cost || currentCard.power || currentCard.ram) && (
                      <div className="col-span-2 sm:col-span-4 flex items-center gap-4 pt-1 border-t border-gray-900 text-xs">
                        {currentCard.cost && (
                          <span className="text-[#FCEE0A] font-bold">
                            COSTE: {currentCard.cost}
                          </span>
                        )}
                        {currentCard.power && (
                          <span className="text-[#FF003C] font-bold">
                            PODER: {currentCard.power}
                          </span>
                        )}
                        {currentCard.ram && (
                          <span className="text-[#00F0FF] font-bold">
                            RAM: {currentCard.ram}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {currentCard.ability && (
                    <div className="bg-[#000000] border border-gray-800 p-3 text-xs text-gray-200 leading-relaxed font-sans">
                      <span className="text-[10px] font-mono text-[#00F0FF] uppercase block mb-1">
                        HABILIDAD // TEXTO DE REGLAS:
                      </span>
                      <p>{currentCard.ability}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-1">
                    <span>{currentCard.collection || 'Welcome to Night City'}</span>
                    {currentPage === 'cartas' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleAddCardToBuilder(currentCard, null, 'main');
                            handleCloseModal();
                          }}
                          disabled={getCardTotalCopies(currentCard.id) >= 3}
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-[#FCEE0A] text-[#070a10] font-black uppercase cursor-pointer hover:bg-[#00F0FF] disabled:opacity-40 text-xs"
                          title={getCardTotalCopies(currentCard.id) >= 3 ? 'Límite de 3 copias alcanzado' : 'Añadir a Baraja Principal'}
                        >
                          + BARAJA
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddCardToBuilder(currentCard, null, 'sideboard');
                            handleCloseModal();
                          }}
                          disabled={getCardTotalCopies(currentCard.id) >= 3 || totalSideboardCards >= 7}
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-[#00F0FF] text-[#070a10] font-black uppercase cursor-pointer hover:bg-[#FCEE0A] disabled:opacity-40 text-xs"
                          title={getCardTotalCopies(currentCard.id) >= 3 ? 'Límite de 3 copias alcanzado' : totalSideboardCards >= 7 ? 'Banquillo completo (7/7)' : 'Añadir al Banquillo (Tech)'}
                        >
                          + BANQUILLO ({totalSideboardCards}/7)
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

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
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-gray-400 border-b border-gray-800 pb-3">
                    <span>AUTOR: @{readingArticle.author}</span>
                    <span>
                      {readingArticle.date} • {readingArticle.readTime} •{' '}
                      <strong className="text-[#00F0FF]">
                        {Number(readingArticle.viewsCount) || 0}{' '}
                        {(Number(readingArticle.viewsCount) || 0) === 1 ? 'VISITA' : 'VISITAS'}
                      </strong>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase leading-tight">
                    {readingArticle.title}
                  </h2>

                  {readingArticle.source && (
                    <div className="bg-[#000000] border border-gray-800 px-4 py-2 text-xs font-mono flex items-center justify-between">
                      <span className="text-gray-400">FUENTE DE INFORMACIÓN:</span>
                      {readingArticle.source.startsWith('http') ? (
                        <a
                          href={readingArticle.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00F0FF] hover:text-[#FCEE0A] flex items-center gap-1 font-bold underline"
                        >
                          <span>{readingArticle.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-white font-bold">{readingArticle.source}</span>
                      )}
                    </div>
                  )}

                  <div
                    className="cyber-article-content"
                    dangerouslySetInnerHTML={{
                      __html: getFullArticleHtml(readingArticle)
                    }}
                  />

                  <div className="border-t border-gray-800 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                        COMPARTIR NOTICIA:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            (readingArticle.title || '') + ' ' + (typeof window !== 'undefined' ? window.location.href : '')
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-[#25D366]/20 border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-black font-mono text-xs font-bold transition-all"
                        >
                          WhatsApp
                        </a>

                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            readingArticle.title || ''
                          )}&url=${encodeURIComponent(
                            typeof window !== 'undefined' ? window.location.href : ''
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-white/10 border border-white text-white hover:bg-white hover:text-black font-mono text-xs font-bold transition-all"
                        >
                          X (Twitter)
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
                              setSocialToast('¡Enlace copiado para Instagram!');
                              setTimeout(() => setSocialToast(null), 2500);
                            }
                          }}
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-[#E1306C]/20 border border-[#E1306C] text-[#E1306C] hover:bg-[#E1306C] hover:text-black font-mono text-xs font-bold transition-all cursor-pointer"
                        >
                          {socialToast || 'Instagram'}
                        </button>

                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            readingArticle.title || ''
                          )}&body=${encodeURIComponent(
                            (readingArticle.excerpt || '') +
                              '\\n\\n' +
                              (typeof window !== 'undefined' ? window.location.href : '')
                          )}`}
                          style={{ clipPath: CYBER_CLIP }}
                          className="px-3 py-1.5 bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black font-mono text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReadingArticle(null)}
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-5 py-2.5 bg-[#FCEE0A] text-[#070a10] hover:bg-[#00F0FF] font-mono font-black text-xs uppercase tracking-wider cursor-pointer self-start sm:self-auto"
                    >
                      CERRAR NOTICIA
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        

        {/* =====================================================================
            MODAL VISOR VISUAL DEL MAZO // COMPATIBLE CON REDES SOCIALES (RRSS)
           ===================================================================== */}
        <AnimatePresence>
          {visualDeckModalOpen && (() => {
            const cat = getCategorizedDeck(customDeckList);

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setVisualDeckModalOpen(false)}
                className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.94, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.94, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ clipPath: CYBER_CLIP }}
                  className="max-w-6xl w-full max-h-[92vh] overflow-y-auto bg-[#070a10] border-2 border-[#00F0FF] shadow-[0_0_50px_rgba(0,240,255,0.35)] p-4 sm:p-6 space-y-6 relative rounded-none my-auto"
                >
                  {/* Barra Superior del Modal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#FCEE0A] uppercase tracking-wider mb-1">
                        <Sparkles className="w-4 h-4 text-[#00F0FF]" />
                        <span>TAPETE VIRTUAL // FORMATO REDES SOCIALES (RRSS)</span>
                      </div>
                      <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white">
                        VISTA VISUAL DE <span className="text-[#00F0FF]">{customDeckName}</span>
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Selector de Formato para Redes */}
                      <div className="flex items-center bg-[#000000] border border-gray-800 p-1 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setSocialFormat('horizontal')}
                          className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                            socialFormat === 'horizontal'
                              ? 'bg-[#00F0FF] text-[#070a10]'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Formato Horizontal 16:9 (X / Twitter, PC, Discord)"
                        >
                          16:9 (X / PC)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSocialFormat('vertical')}
                          className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                            socialFormat === 'vertical'
                              ? 'bg-[#FCEE0A] text-[#070a10]'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Formato Vertical 4:5 (Instagram Post)"
                        >
                          4:5 (Instagram)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSocialFormat('story')}
                          className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                            socialFormat === 'story'
                              ? 'bg-[#FF003C] text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Formato Vertical 9:16 (Instagram Stories / TikTok)"
                        >
                          9:16 (Story)
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadDeckPosterImage(socialFormat)}
                        disabled={isGeneratingDeckImg}
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-4 py-2 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer hover:bg-[#00F0FF] transition-all disabled:opacity-50"
                        title="Descargar imagen completa del mazo en alta resolución (.PNG)"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isGeneratingDeckImg ? 'GENERANDO...' : 'DESCARGAR PNG'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVisualDeckModalOpen(false)}
                        style={{ clipPath: CYBER_CLIP }}
                        className="p-2 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] cursor-pointer transition-colors"
                        title="Cerrar vista visual"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Toast de estado */}
                  {deckToast && (
                    <div className="bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] px-4 py-2 text-xs font-mono flex items-center justify-between">
                      <span>{deckToast}</span>
                      <button type="button" onClick={() => setDeckToast(null)} className="text-white font-bold ml-2">✕</button>
                    </div>
                  )}

                  {/* EL TAPETE / PÓSTER VISUAL (Contenedor adaptable al formato seleccionado) */}
                  <div
                    className={`mx-auto bg-[#05080e] border-2 border-gray-800 p-4 sm:p-6 space-y-6 transition-all ${
                      socialFormat === 'vertical'
                        ? 'max-w-2xl shadow-[0_0_40px_rgba(252,238,10,0.15)]'
                        : socialFormat === 'story'
                        ? 'max-w-md shadow-[0_0_40px_rgba(255,0,60,0.15)]'
                        : 'w-full shadow-[0_0_40px_rgba(0,240,255,0.15)]'
                    }`}
                  >
                    {/* Header del Tapete */}
                    <div className="border-b border-gray-800/80 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#FCEE0A] uppercase tracking-widest mb-1">
                          <img
                            src="/images/logo-cyberpunk-tcg-españa.jpg"
                            alt="Logo"
                            className="h-5 w-auto object-contain border border-gray-800"
                          />
                          <span>CYBERPUNK TCG ESPAÑA // DECK SHOWCASE</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                          {customDeckName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-xs">
                          <span
                            style={{ clipPath: CYBER_CLIP }}
                            className="px-2.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black uppercase"
                          >
                            FACCIÓN: {customDeckFaction}
                          </span>
                          <span className="text-gray-400">
                            TOTAL: <strong className="text-white">{cat.counts.total} CARTAS</strong>
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-400">
                            MÍN 40 BARAJA + {cat.counts.sideboard}/7 BANQUILLO
                          </span>
                        </div>
                      </div>

                      {/* Ficha Resumen de Composición */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="px-2 py-1 bg-[#FCEE0A]/15 border border-[#FCEE0A] text-[#FCEE0A] font-bold">
                          👑 {cat.counts.legends} LEYENDAS
                        </span>
                        <span className="px-2 py-1 bg-[#FF003C]/15 border border-[#FF003C] text-[#FF003C] font-bold">
                          🤖 {cat.counts.units} UNIDADES
                        </span>
                        <span className="px-2 py-1 bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] font-bold">
                          💾 {cat.counts.programs} PROGRAMAS
                        </span>
                        <span className="px-2 py-1 bg-[#00FF66]/15 border border-[#00FF66] text-[#00FF66] font-bold">
                          ⚙️ {cat.counts.gears} GEARS
                        </span>
                        <span className="px-2 py-1 bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] font-bold">
                          🔄 {cat.counts.sideboard} BANQUILLO
                        </span>
                      </div>
                    </div>

                    {/* SECCIÓN 1: 👑 LEYENDAS Y LÍDERES */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#FCEE0A]/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FCEE0A] uppercase tracking-wider">
                          <Crown className="w-4 h-4 text-[#FCEE0A]" />
                          <span>👑 3 LEYENDAS // LÍDERES DEL MAZO ({cat.counts.legends})</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                          {cat.legends.length} leyendas diferentes
                        </span>
                      </div>

                      {cat.legends.length === 0 ? (
                        <p className="text-xs font-mono text-gray-500 py-4 italic">
                          No has asignado leyendas. Filtra por "LEYENDAS" en el catálogo y añade tus 3 líderes.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {cat.legends.map((card, idx) => (
                            <div
                              key={`vis-legend-${card.id}-${idx}`}
                              onClick={() => handleOpenLightbox(card, customDeckList)}
                              style={{ clipPath: CYBER_CLIP }}
                              className="group bg-[#000000] border-2 border-[#FCEE0A] hover:border-[#00F0FF] shadow-[0_0_20px_rgba(252,238,10,0.25)] transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                              <div className="p-1.5 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                                  {card.qty}x
                                </span>
                                <span className="text-[#00F0FF] font-bold truncate max-w-[80px]">
                                  {card.cardId || card.id}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden p-1 flex items-center justify-center">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-2 bg-[#000000] border-t border-gray-800">
                                <p className="text-white text-xs font-black uppercase truncate group-hover:text-[#FCEE0A]">
                                  {card.name}
                                </p>
                                <span className="text-[9px] font-mono text-gray-400 block truncate">
                                  {card.aspect || card.faction}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 2: 🤖 UNIDADES */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-[#FF003C]/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF003C] uppercase tracking-wider">
                          <Users className="w-4 h-4 text-[#FF003C]" />
                          <span>🤖 UNIDADES // OPERATIVOS DE COMBATE ({cat.counts.units})</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                          {cat.units.length} tipos de unidades
                        </span>
                      </div>

                      {cat.units.length === 0 ? (
                        <p className="text-xs font-mono text-gray-500 py-4 italic">
                          Sin unidades en el mazo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {cat.units.map((card, idx) => (
                            <div
                              key={`vis-unit-${card.id}-${idx}`}
                              onClick={() => handleOpenLightbox(card, customDeckList)}
                              style={{ clipPath: CYBER_CLIP }}
                              className="group bg-[#000000] border border-gray-800 hover:border-[#FF003C] hover:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                              <div className="p-1.5 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                                  {card.qty}x
                                </span>
                                <span className="text-gray-400 font-bold truncate max-w-[80px]">
                                  {card.cardId || card.id}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden p-1 flex items-center justify-center">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-2 bg-[#000000] border-t border-gray-800">
                                <p className="text-white text-xs font-black uppercase truncate group-hover:text-[#FCEE0A]">
                                  {card.name}
                                </p>
                                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                                  <span>{card.aspect || 'UNIDAD'}</span>
                                  {card.power && <span className="text-[#FF003C] font-bold">{card.power}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 3: 💾 PROGRAMAS */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-[#00F0FF]/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
                          <Terminal className="w-4 h-4 text-[#00F0FF]" />
                          <span>💾 PROGRAMAS // SOFTWARE & ACCIONES ({cat.counts.programs})</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                          {cat.programs.length} programas diferentes
                        </span>
                      </div>

                      {cat.programs.length === 0 ? (
                        <p className="text-xs font-mono text-gray-500 py-4 italic">
                          Sin programas en el mazo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {cat.programs.map((card, idx) => (
                            <div
                              key={`vis-prog-${card.id}-${idx}`}
                              onClick={() => handleOpenLightbox(card, customDeckList)}
                              style={{ clipPath: CYBER_CLIP }}
                              className="group bg-[#000000] border border-gray-800 hover:border-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                              <div className="p-1.5 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black">
                                  {card.qty}x
                                </span>
                                <span className="text-gray-400 font-bold truncate max-w-[80px]">
                                  {card.cardId || card.id}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden p-1 flex items-center justify-center">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-2 bg-[#000000] border-t border-gray-800">
                                <p className="text-white text-xs font-black uppercase truncate group-hover:text-[#00F0FF]">
                                  {card.name}
                                </p>
                                <span className="text-[9px] font-mono text-gray-400 block truncate">
                                  {card.aspect || 'PROGRAMA'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 4: ⚙️ EQUIPO & GEAR */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-[#00FF66]/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00FF66] uppercase tracking-wider">
                          <Wrench className="w-4 h-4 text-[#00FF66]" />
                          <span>⚙️ EQUIPO // GEAR & CYBERWARE ({cat.counts.gears})</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                          {cat.gears.length} equipos diferentes
                        </span>
                      </div>

                      {cat.gears.length === 0 ? (
                        <p className="text-xs font-mono text-gray-500 py-4 italic">
                          Sin equipos o cyberware en el mazo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {cat.gears.map((card, idx) => (
                            <div
                              key={`vis-gear-${card.id}-${idx}`}
                              onClick={() => handleOpenLightbox(card, customDeckList)}
                              style={{ clipPath: CYBER_CLIP }}
                              className="group bg-[#000000] border border-gray-800 hover:border-[#00FF66] hover:shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                              <div className="p-1.5 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 bg-[#00FF66] text-[#070a10] font-black">
                                  {card.qty}x
                                </span>
                                <span className="text-gray-400 font-bold truncate max-w-[80px]">
                                  {card.cardId || card.id}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden p-1 flex items-center justify-center">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-2 bg-[#000000] border-t border-gray-800">
                                <p className="text-white text-xs font-black uppercase truncate group-hover:text-[#00FF66]">
                                  {card.name}
                                </p>
                                <span className="text-[9px] font-mono text-gray-400 block truncate">
                                  {card.aspect || 'GEAR'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 5: 🔄 BANQUILLO // SIDEBOARD (TECH) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-[#00F0FF]/40 pb-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
                          <Layers className="w-4 h-4 text-[#00F0FF]" />
                          <span>🔄 BANQUILLO // SIDEBOARD ({cat.counts.sideboard} / 7 CARTAS TECH)</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                          {cat.sideboard.length} cartas de sustitución táctica
                        </span>
                      </div>

                      {cat.sideboard.length === 0 ? (
                        <p className="text-xs font-mono text-gray-500 py-3 italic">
                          Sin cartas en el banquillo. Puedes añadir hasta 7 cartas tácticas usando el botón [+ BANQ] en el catálogo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                          {cat.sideboard.map((card, idx) => (
                            <div
                              key={`vis-side-${card.id}-${idx}`}
                              onClick={() => handleOpenLightbox(card, customSideboardList)}
                              style={{ clipPath: CYBER_CLIP }}
                              className="group bg-[#000000] border-2 border-[#00F0FF] hover:border-[#FCEE0A] hover:shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                              <div className="p-1.5 bg-[#070a10] border-b border-gray-800 flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black">
                                  {card.qty}x
                                </span>
                                <span className="text-gray-400 font-bold truncate max-w-[80px]">
                                  {card.cardId || card.id}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden p-1 flex items-center justify-center">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="p-2 bg-[#000000] border-t border-gray-800">
                                <p className="text-white text-xs font-black uppercase truncate group-hover:text-[#00F0FF]">
                                  {card.name}
                                </p>
                                <span className="text-[9px] font-mono text-gray-400 block truncate">
                                  {card.aspect || 'SIDEBOARD'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                                        {/* Pie de Página del Tapete */}
                    <div className="border-t border-gray-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="text-[#00F0FF] font-bold">CYBERPUNK TCG ESPAÑA</span>
                        <span>•</span>
                        <a href="https://cyberpunktcg.es" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FCEE0A]">
                          https://cyberpunktcg.es
                        </a>
                      </div>
                      <span className="text-[#FCEE0A] text-[11px]">
                        #CyberpunkTCG #Cyberpunk2077 #NightCity #Decklist
                      </span>
                    </div>
                  </div>

                  {/* Acciones para Redes Sociales */}
                  <div className="border-t border-gray-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 uppercase font-bold mr-1">
                        COMPARTIR EN:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleShareDeckToSocial('x')}
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white hover:text-black border border-white text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>X (Twitter)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareDeckToSocial('whatsapp')}
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-3.5 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366] hover:text-black border border-[#25D366] text-[#25D366] font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareDeckToSocial('instagram')}
                        style={{ clipPath: CYBER_CLIP }}
                        className="px-3.5 py-1.5 bg-[#E1306C]/20 hover:bg-[#E1306C] hover:text-white border border-[#E1306C] text-[#E1306C] font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Ficha Instagram</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadDeckPosterImage(socialFormat)}
                      disabled={isGeneratingDeckImg}
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-5 py-2.5 bg-[#00F0FF] text-[#070a10] hover:bg-[#FCEE0A] font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isGeneratingDeckImg ? 'GENERANDO IMAGEN...' : 'DESCARGAR IMAGEN RRSS (.PNG)'}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* =====================================================================
            VISTA 1: PÁGINA DE INICIO (/)
           ===================================================================== */}
        {currentPage === 'inicio' && (
          <>
            {/* HERO SECTION */}
            <section id="inicio" aria-labelledby="hero-heading" className="relative border-b border-gray-800">
              <div className="relative min-h-[580px] lg:min-h-[640px] flex items-center overflow-hidden">
                {/* Fondo ambiental de la sección */}
                <img
                  src={heroArticle.wallpaper || heroArticle.image || '/images/wallpapers/cyberpunk-hero.jpg'}
                  alt={heroArticle.title || 'Imagen Destacada'}
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-35 blur-[2px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/65 to-[#000000]/75" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FCEE0A] via-[#FF003C] to-[#00F0FF]" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ clipPath: CYBER_CLIP }}
                      className="lg:col-span-8 bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] hover:shadow-[0_0_35px_rgba(252,238,10,0.3)] transition-all duration-300 p-6 sm:p-8 lg:p-10 rounded-none relative overflow-hidden group"
                    >
                      {/* IMAGEN DESTACADA DE FONDO (ESTILO WORDPRESS FEATURED IMAGE) */}
                      <img
                        src={heroArticle.wallpaper || heroArticle.image || '/images/wallpapers/cyberpunk-hero.jpg'}
                        alt={heroArticle.title || 'Imagen Destacada'}
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-55 group-hover:scale-105 group-hover:opacity-65 transition-all duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/80 to-[#070a10]/35" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#070a10]/90 via-[#070a10]/55 to-transparent" />
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#FCEE0A] z-10" />

                      <div className="relative z-10 space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            style={{ clipPath: CYBER_CLIP }}
                            className="px-3.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest rounded-none"
                          >
                            {heroArticle.tag}
                          </span>

                          <span className="text-xs font-mono text-[#00F0FF] ml-auto bg-[#000000]/75 px-2.5 py-1 border border-gray-800">
                            ID // {heroArticle.id}
                          </span>
                        </div>

                        <h1
                          id="hero-heading"
                          className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-[1.08] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                        >
                          {heroArticle.title}
                        </h1>

                        <p className="text-gray-100 text-base sm:text-lg leading-relaxed line-clamp-3 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                          {getShortExcerpt(heroArticle, 220)}
                        </p>

                        {/* 3 Cajas de Metadatos de la Noticia Destacada (Categoría, Palabras Clave y Formato/Set) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {[
                            {
                              label: 'CATEGORÍA',
                              value:
                                heroArticle.category ||
                                heroArticle.stats?.[0]?.value ||
                                'NOTICIA OFICIAL',
                              color: 'text-[#00F0FF]'
                            },
                            {
                              label: 'PALABRAS CLAVE',
                              value:
                                heroArticle.keywords ||
                                heroArticle.stats?.[1]?.value ||
                                '#CyberpunkTCG #NightCity',
                              color: 'text-[#FCEE0A]'
                            },
                            {
                              label:
                                heroArticle.extraLabel ||
                                heroArticle.stats?.[2]?.label ||
                                'FORMATO / SET',
                              value:
                                heroArticle.extraValue ||
                                heroArticle.stats?.[2]?.value ||
                                'SET 01 // NIGHT CITY',
                              color: 'text-[#FF003C]'
                            }
                          ].map((stat, idx) => (
                            <div
                              key={idx}
                              style={{ clipPath: CYBER_CLIP }}
                              className="bg-[#000000]/85 backdrop-blur-sm border border-gray-800 p-3.5 rounded-none"
                            >
                              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                {stat.label}
                              </p>
                              <p className={`text-sm sm:text-base font-mono font-black mt-1 truncate ${stat.color}`}>
                                {stat.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="pt-5 border-t border-gray-800/90 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-gray-200">
                            <div className="flex items-center gap-2.5">
                              <div
                                style={{ clipPath: CYBER_CLIP }}
                                className="w-9 h-9 bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] font-black flex items-center justify-center rounded-none uppercase"
                              >
                                {(heroArticle.author || 'CP').slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-white font-bold">{heroArticle.author}</p>
                                <p className="text-[11px] text-gray-400">{heroArticle.role}</p>
                              </div>
                            </div>
                            <span className="hidden sm:inline text-gray-700">|</span>
                            <span className="flex items-center gap-1 text-gray-200" title="Fecha de publicación">
                              <Calendar className="w-3.5 h-3.5 text-[#FF003C]" />
                              {heroArticle.date || 'HOY'}
                            </span>
                            <span className="flex items-center gap-1 text-gray-200" title="Tiempo estimado de lectura">
                              <Clock className="w-3.5 h-3.5 text-[#FCEE0A]" />
                              {heroArticle.readTime}
                            </span>
                            <span className="flex items-center gap-1 text-gray-200" title="Visitas reales de la noticia">
                              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
                              {`${Number(heroArticle.viewsCount) || 0} ${(Number(heroArticle.viewsCount) || 0) === 1 ? 'VISITA' : 'VISITAS'}`}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <CyberpulseButton
                              variant="primary"
                              icon={ChevronRight}
                              onClick={() => handleOpenArticle(heroArticle, true)}
                            >
                              LEER NOTICIA COMPLETA
                            </CyberpulseButton>
                          </div>
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
                      <span>LAS NOTICIAS DE ARIF IQBAL // NIGHT CITY NEWS</span>
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
                      onClick={() => handleOpenArticle(article, false)}
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
                            {getShortExcerpt(article, 165)}
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
                  <span>ARCHIVO CRONOLÓGICO // NIGHT CITY NEWS</span>
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
                    placeholder="Buscar noticias..."
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
                    onClick={() => handleOpenArticle(article, false)}
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
                        
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>@{article.author}</span>
                          <span className="text-[#FCEE0A]">{article.date}</span>
                        </div>
                        <h2 className="text-lg font-black text-white uppercase group-hover:text-[#FCEE0A] transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                          {getShortExcerpt(article, 165)}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-gray-800 bg-[#070a10] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">{article.readTime}</span>
                      <span className="text-[#00F0FF] group-hover:text-[#FCEE0A] font-bold uppercase flex items-center gap-1">
                        <span>LEER MÁS</span>
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
                  <span className="text-[#FCEE0A]">DECK BUILDER</span>
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
                    CONSTRUCTOR DE MAZOS ({totalDeckCards} CARTAS)
                  </span>
                </button>
              </div>
            </div>

            {/* Filtros de Tipo y Color */}
            <div className="space-y-3">
              {/* Filtro por Tipo de Carta */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-gray-400 font-bold uppercase mr-1">TIPO:</span>
                  {[
                    { id: 'TODOS', label: 'TODOS LOS TIPOS (151)' },
                    { id: 'UNIDADES', label: 'UNIDADES (74)' },
                    { id: 'PROGRAMAS', label: 'PROGRAMAS (34)' },
                    { id: 'EQUIPO', label: 'EQUIPO / GEAR (16)' },
                    { id: 'LEYENDAS', label: 'LEYENDAS (27)' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCardTypeFilter(t.id);
                        setVisibleCardsCount(24);
                      }}
                      style={{ clipPath: CYBER_CLIP }}
                      className={`px-3.5 py-1.5 font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        cardTypeFilter === t.id
                          ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                          : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#FCEE0A] hover:text-[#FCEE0A]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-mono text-[#00F0FF]">
                  {filteredDatabaseCards.length} cartas encontradas
                </span>
              </div>

              {/* Filtro por Color / Aspect */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-900 pt-2">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-gray-400 font-bold uppercase mr-1">COLOR:</span>
                  {[
                    { id: 'TODOS', label: 'TODOS LOS COLORES (151)', activeBg: 'bg-[#FCEE0A]', activeText: 'text-[#070a10]', border: 'border-gray-800' },
                    { id: 'ROJO', label: 'ROJAS (38)', activeBg: 'bg-[#FF003C]', activeText: 'text-white', border: 'border-[#FF003C]/50' },
                    { id: 'VERDE', label: 'VERDES (38)', activeBg: 'bg-[#00FF66]', activeText: 'text-[#070a10]', border: 'border-[#00FF66]/50' },
                    { id: 'AMARILLO', label: 'AMARILLAS (37)', activeBg: 'bg-[#FCEE0A]', activeText: 'text-[#070a10]', border: 'border-[#FCEE0A]/50' },
                    { id: 'AZUL', label: 'AZULES (38)', activeBg: 'bg-[#00F0FF]', activeText: 'text-[#070a10]', border: 'border-[#00F0FF]/50' }
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        setCardColorFilter(col.id);
                        setVisibleCardsCount(24);
                      }}
                      style={{ clipPath: CYBER_CLIP }}
                      className={`px-3.5 py-1.5 font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        cardColorFilter === col.id
                          ? `${col.activeBg} ${col.activeText} font-black shadow-[0_0_15px_rgba(255,255,255,0.25)]`
                          : `bg-[#000000] text-gray-300 ${col.border} hover:border-[#FCEE0A] hover:text-[#FCEE0A]`
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-mono text-gray-400">
                  Pulsa <strong className="text-[#FCEE0A]">+ MAZO</strong> en cualquier carta para añadirla a tu lista
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Catálogo de Cartas */}
              <div className={deckbuilderOpen ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 ${
                    deckbuilderOpen ? 'md:grid-cols-4' : 'md:grid-cols-6'
                  } gap-4`}
                >
                  {filteredDatabaseCards.slice(0, visibleCardsCount).map((card, cardIdx) => {
                    const inDeck = customDeckList.find((c) => c.id === card.id);
                    const inSide = customSideboardList.find((c) => c.id === card.id);
                    const totalCopies = (inDeck?.qty || 0) + (inSide?.qty || 0);
                    return (
                      <div
                        key={card.id}
                        style={{ clipPath: CYBER_CLIP }}
                        className={`group bg-[#000000] border transition-all flex flex-col justify-between overflow-hidden ${
                          totalCopies > 0 ? 'border-[#FCEE0A]' : 'border-gray-800 hover:border-[#00F0FF]'
                        }`}
                      >
                        <div
                          onClick={() => handleOpenLightbox(card, filteredDatabaseCards, cardIdx)}
                          className="relative aspect-[3/4.2] w-full bg-[#070a10] overflow-hidden border-b border-gray-800 cursor-pointer"
                        >
                          <img
                            src={card.image}
                            alt={card.name}
                            loading="lazy"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            {inDeck && (
                              <span className="bg-[#FCEE0A] text-[#070a10] font-mono font-black text-[9px] px-1.5 py-0.5 shadow">
                                {inDeck.qty}x BARAJA
                              </span>
                            )}
                            {inSide && (
                              <span className="bg-[#00F0FF] text-[#070a10] font-mono font-black text-[9px] px-1.5 py-0.5 shadow">
                                {inSide.qty}x BANQ
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 space-y-2 bg-[#000000]">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-400 font-bold">{card.cardId || card.id}</span>
                            {card.aspect && (
                              <span
                                style={{ clipPath: CYBER_CLIP }}
                                className={`px-2 py-0.5 font-black text-[9px] uppercase ${
                                  card.aspect === 'Red'
                                    ? 'bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C]'
                                    : card.aspect === 'Green'
                                    ? 'bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66]'
                                    : card.aspect === 'Yellow'
                                    ? 'bg-[#FCEE0A]/20 border border-[#FCEE0A] text-[#FCEE0A]'
                                    : 'bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF]'
                                }`}
                              >
                                {card.aspect === 'Red'
                                  ? 'ROJO'
                                  : card.aspect === 'Green'
                                  ? 'VERDE'
                                  : card.aspect === 'Yellow'
                                  ? 'AMARILLO'
                                  : 'AZUL'}
                              </span>
                            )}
                          </div>
                          <h3
                            onClick={() => handleOpenLightbox(card, filteredDatabaseCards, cardIdx)}
                            className="text-xs font-black text-white uppercase truncate cursor-pointer hover:text-[#FCEE0A]"
                          >
                            {card.name}
                          </h3>
                          <div className="grid grid-cols-5 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={(e) => handleAddCardToBuilder(card, e, 'main')}
                              disabled={totalCopies >= 3}
                              style={{ clipPath: CYBER_CLIP }}
                              className="col-span-3 py-1.5 bg-[#070a10] hover:bg-[#FCEE0A] text-[#FCEE0A] hover:text-[#070a10] border border-[#FCEE0A]/50 font-mono font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-30"
                              title={totalCopies >= 3 ? 'Máximo 3 copias alcanzado' : 'Añadir a la Baraja Principal'}
                            >
                              <Plus className="w-3 h-3" />
                              <span>BARAJA</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleAddCardToBuilder(card, e, 'sideboard')}
                              disabled={totalCopies >= 3 || totalSideboardCards >= 7}
                              style={{ clipPath: CYBER_CLIP }}
                              className="col-span-2 py-1.5 bg-[#070a10] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#070a10] border border-[#00F0FF]/50 font-mono font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-30"
                              title={totalCopies >= 3 ? 'Máximo 3 copias alcanzado' : totalSideboardCards >= 7 ? 'Banquillo completo (7/7)' : 'Añadir al Banquillo (Tech)'}
                            >
                              <Layers className="w-3 h-3" />
                              <span>BANQ</span>
                            </button>
                          </div>
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
                        DECKBUILDER // MÁX 3 COPIAS POR CARTA
                      </span>
                      <h2 className="text-lg font-black uppercase text-[#FCEE0A]">
                        CONSTRUCTOR DE MAZOS
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs">
                      {totalDeckCards} BARAJA + {totalSideboardCards}/7 BANQ
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
                      <label className="text-gray-400 block mb-1 font-mono uppercase text-xs">
                        FACCIÓN PRINCIPAL // HOLOPHONE
                      </label>
                      <select
                        value={customDeckFaction}
                        onChange={(e) => setCustomDeckFaction(e.target.value)}
                        className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white font-bold text-xs font-mono cursor-pointer"
                      >
                        <option value="Arasaka">Arasaka</option>
                        <option value="Aldecaldos">Aldecaldos</option>
                        <option value="Maelstrom">Maelstrom</option>
                      </select>
                    </div>
                  </div>

                  {/* Botón Principal: Ver Mazo Visual para Redes Sociales */}
                  <button
                    type="button"
                    onClick={() => setVisualDeckModalOpen(true)}
                    disabled={customDeckList.length === 0}
                    style={{ clipPath: CYBER_CLIP }}
                    className="w-full py-2.5 bg-gradient-to-r from-[#00F0FF] via-[#FCEE0A] to-[#00F0FF] text-[#070a10] font-mono font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:brightness-110 transition-all rounded-none disabled:opacity-40"
                  >
                    <Eye className="w-4 h-4" />
                    <span>VER MAZO VISUAL // TAPETE RRSS</span>
                  </button>

                  {/* Selector de Vista en Barra Lateral: Compacta vs Visual */}
                  <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDeckViewTab('list')}
                        className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                          deckViewTab === 'list'
                            ? 'bg-[#FCEE0A] text-[#070a10]'
                            : 'bg-[#070a10] text-gray-400 hover:text-white'
                        }`}
                      >
                        Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeckViewTab('visual')}
                        className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                          deckViewTab === 'visual'
                            ? 'bg-[#00F0FF] text-[#070a10]'
                            : 'bg-[#070a10] text-gray-400 hover:text-white'
                        }`}
                      >
                        Mini Tapete
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVisualDeckModalOpen(true)}
                      disabled={customDeckList.length === 0}
                      className="text-[11px] font-mono text-[#00F0FF] hover:text-[#FCEE0A] flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      title="Abrir en pantalla completa para captura / redes"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Pantalla Completa</span>
                    </button>
                  </div>

                  {/* Contenedor de Cartas (según pestaña seleccionada) */}
                  {deckViewTab === 'visual' && customDeckList.length > 0 ? (
                    (() => {
                      const cat = getCategorizedDeck(customDeckList);
                      return (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-1 border-t border-b border-gray-800 py-3">
                          {/* Leyendas */}
                          {cat.legends.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-[#FCEE0A] uppercase block">
                                👑 LEYENDAS ({cat.counts.legends})
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {cat.legends.map((item, idx) => (
                                  <div
                                    key={`side-leg-${item.id}-${idx}`}
                                    onClick={() => handleOpenLightbox(item, customDeckList)}
                                    className="relative aspect-[3/4.2] bg-[#070a10] border-2 border-[#FCEE0A] p-0.5 cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    <span className="absolute top-0.5 right-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-[9px] px-1">
                                      x{item.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unidades */}
                          {cat.units.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-[#FF003C] uppercase block">
                                🤖 UNIDADES ({cat.counts.units})
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {cat.units.map((item, idx) => (
                                  <div
                                    key={`side-unit-${item.id}-${idx}`}
                                    onClick={() => handleOpenLightbox(item, customDeckList)}
                                    className="relative aspect-[3/4.2] bg-[#070a10] border border-gray-700 hover:border-[#FF003C] p-0.5 cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    <span className="absolute top-0.5 right-0.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-[9px] px-1">
                                      x{item.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Programas */}
                          {cat.programs.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-[#00F0FF] uppercase block">
                                💾 PROGRAMAS ({cat.counts.programs})
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {cat.programs.map((item, idx) => (
                                  <div
                                    key={`side-prog-${item.id}-${idx}`}
                                    onClick={() => handleOpenLightbox(item, customDeckList)}
                                    className="relative aspect-[3/4.2] bg-[#070a10] border border-gray-700 hover:border-[#00F0FF] p-0.5 cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    <span className="absolute top-0.5 right-0.5 bg-[#00F0FF] text-[#070a10] font-mono font-black text-[9px] px-1">
                                      x{item.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Gears */}
                          {cat.gears.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-[#00FF66] uppercase block">
                                ⚙️ GEARS ({cat.counts.gears})
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {cat.gears.map((item, idx) => (
                                  <div
                                    key={`side-gear-${item.id}-${idx}`}
                                    onClick={() => handleOpenLightbox(item, customDeckList)}
                                    className="relative aspect-[3/4.2] bg-[#070a10] border border-gray-700 hover:border-[#00FF66] p-0.5 cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    <span className="absolute top-0.5 right-0.5 bg-[#00FF66] text-[#070a10] font-mono font-black text-[9px] px-1">
                                      x{item.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : null}

                  {/* Selector de Destino para Añadir */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#070a10] border border-gray-800 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setDeckBuilderTarget('main')}
                      className={`py-1.5 font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        deckBuilderTarget === 'main'
                          ? 'bg-[#FCEE0A] text-[#070a10]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Baraja ({totalDeckCards})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckBuilderTarget('sideboard')}
                      className={`py-1.5 font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        deckBuilderTarget === 'sideboard'
                          ? 'bg-[#00F0FF] text-[#070a10]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Banquillo ({totalSideboardCards}/7)</span>
                    </button>
                  </div>

                  {/* Lista de Cartas en el Mazo (Modo Compacto) */}
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1 border-t border-b border-gray-800 py-3">
                    {/* Sección Baraja Principal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#FCEE0A] font-bold uppercase">
                          BARAJA PRINCIPAL ({totalDeckCards} CARTAS)
                        </span>
                        {customDeckList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomDeckList([])}
                            className="text-[10px] text-gray-500 hover:text-[#FF003C]"
                          >
                            Vaciar
                          </button>
                        )}
                      </div>

                      {customDeckList.length === 0 ? (
                        <p className="text-[11px] font-mono text-gray-600 italic py-2">
                          Baraja vacía. Usa [+ BARAJA] en el catálogo.
                        </p>
                      ) : (
                        customDeckList.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 bg-[#070a10] border border-gray-800 p-1.5 text-xs font-mono"
                          >
                            <div
                              onClick={() => handleOpenLightbox(item, customDeckList)}
                              className="flex items-center gap-2 min-w-0 cursor-pointer"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-7 h-10 object-cover border border-gray-800 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-white font-bold truncate text-[11px]">{item.name}</p>
                                <span className="text-[9px] text-gray-400">{item.aspect || item.faction}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDecrementCardInBuilder(item.id, 'main')}
                                className="p-1 bg-[#000000] border border-gray-700 hover:border-[#FF003C] text-white cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-black text-[#FCEE0A]">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleAddCardToBuilder(item, e, 'main')}
                                disabled={getCardTotalCopies(item.id) >= 3}
                                className="p-1 bg-[#000000] border border-gray-700 hover:border-[#00F0FF] text-white cursor-pointer disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Sección Banquillo / Sideboard */}
                    <div className="space-y-2 pt-2 border-t border-gray-900">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#00F0FF] font-bold uppercase">
                          BANQUILLO // SIDEBOARD ({totalSideboardCards} / 7 TECH)
                        </span>
                        {customSideboardList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomSideboardList([])}
                            className="text-[10px] text-gray-500 hover:text-[#FF003C]"
                          >
                            Vaciar
                          </button>
                        )}
                      </div>

                      {customSideboardList.length === 0 ? (
                        <p className="text-[11px] font-mono text-gray-600 italic py-2">
                          Banquillo vacío (máx 7 cartas). Usa [+ BANQ] en el catálogo.
                        </p>
                      ) : (
                        customSideboardList.map((item) => (
                          <div
                            key={`side-${item.id}`}
                            className="flex items-center justify-between gap-2 bg-[#070a10] border border-[#00F0FF]/40 p-1.5 text-xs font-mono"
                          >
                            <div
                              onClick={() => handleOpenLightbox(item, customSideboardList)}
                              className="flex items-center gap-2 min-w-0 cursor-pointer"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-7 h-10 object-cover border border-[#00F0FF]/40 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-white font-bold truncate text-[11px]">{item.name}</p>
                                <span className="text-[9px] text-[#00F0FF]">{item.aspect || item.faction}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDecrementCardInBuilder(item.id, 'sideboard')}
                                className="p-1 bg-[#000000] border border-gray-700 hover:border-[#FF003C] text-white cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-black text-[#00F0FF]">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleAddCardToBuilder(item, e, 'sideboard')}
                                disabled={getCardTotalCopies(item.id) >= 3 || totalSideboardCards >= 7}
                                className="p-1 bg-[#000000] border border-gray-700 hover:border-[#00F0FF] text-white cursor-pointer disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
              CYBERPUNK TCG ESPAÑA // PORTAL NO OFICIAL
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

          </div>
        </div>
      </footer>
    </div>
  );
}
