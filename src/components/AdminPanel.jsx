import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Newspaper,
  Layers,
  Trophy,
  Database,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Search,
  Sparkles,
  Lock,
  LogOut,
  ShieldAlert,
  User,
  KeyRound,
  Upload,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { resolveCardFromGithubUrl, enrichCardObject } from '../utils/cardMetadata.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

// Tiers numéricos 1-5 (convierte los antiguos S/A/B a su equivalente)
const LEGACY_TIERS = { 'TIER S': 'TIER 1', 'TIER A': 'TIER 2', 'TIER B': 'TIER 3' };
const formatTier = (tier) => LEGACY_TIERS[tier] || tier || 'TIER 1';

const LOCAL_WALLPAPERS = [
  '/images/wallpapers/cyberpunk-hero.jpg',
  '/images/wallpapers/Night_City_3840x2160.png',
  '/images/wallpapers/Corporate Plaza.png',
  '/images/wallpapers/Dogtown.png',
  '/images/wallpapers/Japantown.png',
  '/images/wallpapers/Kabuki.png',
  '/images/wallpapers/Pacifica.png',
  '/images/wallpapers/Downtown.png'
];

function ImageUploadField({
  label = 'IMAGEN',
  value = '',
  onChange,
  uploadedFiles = [],
  onUploadSuccess,
  showToast,
  compact = false
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (res.ok && json.ok && json.url) {
        onChange(json.url);
        if (onUploadSuccess && json.files) {
          onUploadSuccess(json.files);
        }
        if (showToast) {
          showToast(`Imagen subida: ${json.fileName}`);
        }
      } else if (showToast) {
        showToast(json.error || 'Error al subir la imagen');
      }
    } catch (err) {
      if (showToast) {
        showToast('Error de red al subir el archivo');
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const allOptions = Array.from(new Set([...(uploadedFiles || []), ...LOCAL_WALLPAPERS]));

  return (
    <div className="space-y-2 text-xs font-mono">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-gray-400 uppercase">{label}</label>
        <label
          style={{ clipPath: CYBER_CLIP }}
          className={`px-3 py-1.5 font-mono font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            isUploading
              ? 'bg-gray-800 text-gray-400'
              : 'bg-[#00F0FF] text-[#070a10] hover:bg-[#FCEE0A]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isUploading ? 'SUBIENDO...' : 'EXAMINAR ARCHIVO...'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {!compact && (
        <select
          value={allOptions.includes(value) ? value : ''}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white"
        >
          <option value="">-- Elegir imagen de la biblioteca o subida --</option>
          {uploadedFiles.length > 0 && (
            <optgroup label="ARCHIVOS SUBIDOS POR TI">
              {uploadedFiles.map((upUrl) => (
                <option key={upUrl} value={upUrl}>
                  {upUrl.replace('/images/uploads/', '📁 ')}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="WALLPAPERS POR DEFECTO">
            {LOCAL_WALLPAPERS.map((wp) => (
              <option key={wp} value={wp}>
                {wp.replace('/images/wallpapers/', '🌆 ')}
              </option>
            ))}
          </optgroup>
        </select>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ruta del archivo subido o URL externa..."
          className="flex-1 bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-[11px]"
        />
        {value && (
          <img
            src={value}
            alt="Previsualización"
            className="w-12 h-9 object-cover border border-[#FCEE0A]/60 bg-[#000000] shrink-0"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Calcula automáticamente el tiempo de lectura estimado dividiendo el total de palabras
 * (sin etiquetas HTML) entre 200 palabras por minuto (velocidad media de lectura).
 */
function calculateReadingTime(excerptText = '', contentText = '', suffix = 'MIN') {
  const combined = `${excerptText || ''} ${contentText || ''}`
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!combined) return `1 ${suffix}`;
  const words = combined.split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} ${suffix}`;
}

/**
 * Editor de Noticias enriquecido con barra de herramientas HTML (estilo WordPress / Elementor),
 * separación de Entradilla corta (2-3 líneas antes del Read More) + Cuerpo HTML completo
 * y pestaña de Vista Previa en Vivo.
 */
function HtmlArticleEditor({
  excerpt = '',
  content = '',
  onChangeExcerpt,
  onChangeContent,
  onUploadSuccess,
  showToast
}) {
  const [previewMode, setPreviewMode] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const textareaRef = React.useRef(null);

  const insertHtmlSnippet = (before, after = '', placeholder = '') => {
    const el = textareaRef.current;
    const current = content || '';
    if (!el) {
      onChangeContent(`${current}\n${before}${placeholder}${after}`);
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || placeholder;
    const nextText =
      current.slice(0, start) + before + selected + after + current.slice(end);

    onChangeContent(nextText);

    setTimeout(() => {
      el.focus();
      const cursorPos = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursorPos, cursorPos);
    }, 10);
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInline(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (res.ok && json.ok && json.url) {
        insertHtmlSnippet(`\n<img src="${json.url}" alt="${file.name}" />\n`, '', '');
        if (onUploadSuccess && json.files) onUploadSuccess(json.files);
        if (showToast) showToast('Imagen insertada en el cuerpo de la noticia');
      }
    } catch {
      if (showToast) showToast('Error al subir imagen para el artículo');
    } finally {
      setIsUploadingInline(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 text-xs font-mono border-t border-b border-gray-800 py-4">
      {/* 1. Entradilla corta (2-3 líneas antes del botón Read More) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[#FCEE0A] font-bold uppercase">
            1. ENTRADILLA CORTA (2-3 LÍNEAS ANTES DEL &quot;LEER MÁS&quot;) *
          </label>
          <span className="text-[10px] text-gray-500">
            {(excerpt || '').length} caracteres
          </span>
        </div>
        <textarea
          rows="2"
          required
          value={excerpt || ''}
          onChange={(e) => onChangeExcerpt(e.target.value)}
          placeholder="Escribe aquí las 2 o 3 líneas de resumen que se verán en la tarjeta antes de que el usuario pulse 'Leer Más'..."
          className="w-full bg-[#070a10] border border-gray-800 focus:border-[#FCEE0A] px-3 py-2 text-white focus:outline-none"
        />
      </div>

      {/* 2. Cuerpo completo de la noticia con barra de herramientas HTML estilo WordPress/Elementor */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[#00F0FF] font-bold uppercase">
            2. CUERPO COMPLETO DE LA NOTICIA (ETIQUETAS HTML / LISTAS / FORMATO)
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase border cursor-pointer ${
                !previewMode
                  ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                  : 'bg-[#070a10] text-gray-400 border-gray-800'
              }`}
            >
              EDITOR HTML
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase border cursor-pointer ${
                previewMode
                  ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                  : 'bg-[#070a10] text-gray-400 border-gray-800'
              }`}
            >
              VISTA PREVIA
            </button>
          </div>
        </div>

        {/* Barra de botones rápidos HTML estilo WordPress */}
        {!previewMode && (
          <div className="flex flex-wrap items-center gap-1.5 bg-[#070a10] border border-gray-800 p-2">
            <button
              type="button"
              onClick={() => insertHtmlSnippet('<strong>', '</strong>', 'texto en negrita')}
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-white font-black cursor-pointer"
              title="Negrita (<strong>)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertHtmlSnippet('<em>', '</em>', 'texto en cursiva')}
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-[#00F0FF] italic cursor-pointer"
              title="Cursiva (<em>)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertHtmlSnippet('\n<h2>', '</h2>\n', 'TÍTULO DE SECCIÓN')}
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold cursor-pointer"
              title="Subtítulo grande (<h2>)"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertHtmlSnippet('\n<h3>', '</h3>\n', 'Subtítulo secundario')}
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-[#00F0FF] font-bold cursor-pointer"
              title="Subtítulo mediano (<h3>)"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => insertHtmlSnippet('\n<p>', '</p>\n', 'Nuevo párrafo de texto...')}
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-gray-200 cursor-pointer"
              title="Párrafo (<p>)"
            >
              Párrafo
            </button>
            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet(
                  '\n<ul>\n  <li><strong>Punto 1:</strong> ',
                  '</li>\n  <li><strong>Punto 2:</strong> Detalle...</li>\n</ul>\n',
                  'Detalle...'
                )
              }
              className="px-2.5 py-1 bg-[#000000] border border-[#FCEE0A]/60 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold cursor-pointer"
              title="Lista con viñetas (<ul><li>)"
            >
              • Lista (ul)
            </button>
            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet(
                  '\n<ol>\n  <li><strong>1:</strong> ',
                  '</li>\n  <li><strong>2:</strong> Segundo punto...</li>\n</ol>\n',
                  'Primer punto...'
                )
              }
              className="px-2.5 py-1 bg-[#000000] border border-[#00F0FF]/60 hover:border-[#00F0FF] text-[#00F0FF] font-bold cursor-pointer"
              title="Lista numerada (<ol><li>)"
            >
              1. Lista Num. (ol)
            </button>
            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet('  <li><strong>Título:</strong> ', '</li>\n', 'Texto del punto...')
              }
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FCEE0A] text-white cursor-pointer"
              title="Añadir elemento de lista (<li>)"
            >
              + &lt;li&gt;
            </button>
            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet('\n<blockquote>«', '»</blockquote>\n', 'Cita destacada...')
              }
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#FF003C] text-[#FF003C] cursor-pointer"
              title="Cita (<blockquote>)"
            >
              ❝ Cita
            </button>
            <button
              type="button"
              onClick={() =>
                insertHtmlSnippet('<a href="https://" target="_blank">', '</a>', 'Texto del enlace')
              }
              className="px-2 py-1 bg-[#000000] border border-gray-700 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
              title="Enlace (<a>)"
            >
              🔗 Enlace
            </button>
            <label
              className="px-2.5 py-1 bg-[#00F0FF] text-[#070a10] hover:bg-[#FCEE0A] font-black cursor-pointer flex items-center gap-1"
              title="Subir imagen desde tu equipo e insertarla en la noticia"
            >
              <Upload className="w-3 h-3" />
              <span>{isUploadingInline ? 'Subiendo...' : 'Insertar Imagen'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleInlineImageUpload}
                disabled={isUploadingInline}
                className="hidden"
              />
            </label>
          </div>
        )}

        {!previewMode ? (
          <textarea
            ref={textareaRef}
            rows="9"
            value={content || ''}
            onChange={(e) => onChangeContent(e.target.value)}
            placeholder="Escribe el artículo completo aquí. Puedes usar los botones de arriba o etiquetas HTML (<p>, <h2>, <ul>, <ol>, <li>, <strong>, <blockquote>, <img>)..."
            className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2.5 text-white font-mono text-xs leading-relaxed focus:outline-none"
          />
        ) : (
          <div className="bg-[#070a10] border border-[#00F0FF] p-5 max-h-96 overflow-y-auto space-y-3">
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase block border-b border-gray-800 pb-1">
              VISTA PREVIA DE LA NOTICIA COMPLETA (AL PULSAR &quot;LEER MÁS&quot;):
            </span>
            <div
              className="cyber-article-content"
              dangerouslySetInnerHTML={{
                __html: content || `<p>${excerpt || 'Sin contenido todavía...'}</p>`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel({ initialAuth = false, initialCms = {}, initialCards = [] }) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [cms, setCms] = useState(initialCms);
  const [cards, setCards] = useState(initialCards || []);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('news');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/upload')
        .then((res) => res.json())
        .then((json) => {
          if (json?.files) setUploadedFiles(json.files);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Estado formulario Noticias
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    category: 'NOTICIA OFICIAL',
    source: '',
excerpt: '',
    content: '',
    author: 'Admin_ES',
    date: 'HOY',
    readTime: '5 MIN',
    views: '1.0K',
    image: '/images/wallpapers/Japantown.png'
  });

  // Estado formulario Hero
  const [heroForm, setHeroForm] = useState(initialCms?.heroArticle || {});

  // Estado formulario Torneos
  const [editingTourId, setEditingTourId] = useState(null);
  const [tourForm, setTourForm] = useState({
    name: '',
    date: '',
    location: 'Discord Oficial // Online',
    format: 'Constructed Estándar (BO3)',
    prizePool: '',
    players: '0 / 32 Inscritos',
    status: 'INSCRIPCIONES ABIERTAS',
    image: '/images/wallpapers/Night_City_3840x2160.png'
  });

    // Estado formulario Mazos
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [cardSearchDeck, setCardSearchDeck] = useState('');
  const [deckPickerTarget, setDeckPickerTarget] = useState('main'); // 'main' | 'sideboard' | 'legends' | 'featured'
  const [deckPickerColorFilter, setDeckPickerColorFilter] = useState('ALL'); // 'ALL' | 'Red' | 'Green' | 'Yellow' | 'Blue'
  const [deckPickerTypeFilter, setDeckPickerTypeFilter] = useState('ALL'); // 'ALL' | 'UNIDADES' | 'PROGRAMAS' | 'EQUIPO' | 'LEYENDAS'
  const [deckForm, setDeckForm] = useState({
    name: '',
    archetype: 'NETRUNNER // CONTROL',
    tier: 'TIER 1',
    featuredCardId: null,
    featuredCard: null,
    pilot: 'CyberPlayer',
    bannerWallpaper: '/images/wallpapers/Night_City_3840x2160.png',
    description: '',
    legends: [],
    cards: [],
    deckList: [],
    sideboard: []
  });

  // Estado 3 Cartas Más Vendidas Cardmarket (Inicio)
  const [altArtForm, setAltArtForm] = useState(
    initialCms?.altArtCards?.length === 3
      ? initialCms.altArtCards.map((c, idx) => ({
          ...enrichCardObject(c, idx),
          badge: c.badge || `TOP #0${idx + 1} BEST SELLER // CARDMARKET`
        }))
      : [
          {
            slot: 1,
            id: 'CP-055',
            cardId: '',
            name: 'Johnny Silverhand // Rocking Renegade',
            cardType: '',
            faction: 'MERCENARIO',
            edition: '',
            artist: '',
            collection: 'Welcome to Night City (Set 01)',
            badge: 'TOP #01 BEST SELLER // CARDMARKET',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/johnny-silverhand-rocking-renegade.webp',
            githubUrl:
              'https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/blob/main/johnny-silverhand-rocking-renegade.webp'
          },
          {
            slot: 2,
            id: 'CP-003',
            cardId: '',
            name: 'Adam Smasher // Metal Over Meat',
            cardType: 'UNIT',
            faction: 'CORPO',
            edition: '',
            artist: '',
            collection: 'Welcome to Night City (Set 01)',
            badge: 'TOP #02 BEST SELLER // CARDMARKET',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/adam-smasher-metal-over-meat.webp',
            githubUrl:
              'https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/blob/main/adam-smasher-metal-over-meat.webp'
          },
          {
            slot: 3,
            id: 'CP-007',
            cardId: '',
            name: 'Alt Cunningham // Mother of Daemons',
            cardType: '',
            source: '',
edition: '',
            artist: '',
            collection: 'Welcome to Night City (Set 01)',
            badge: 'TOP #03 BEST SELLER // CARDMARKET',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/alt-cunningham-mother-of-daemons.webp',
            githubUrl:
              'https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/blob/main/alt-cunningham-mother-of-daemons.webp'
          }
        ]
  );
  const [activeAltSlot, setActiveAltSlot] = useState(0);
  const [cardSearchAlt, setCardSearchAlt] = useState('');
  const [githubUrlInputs, setGithubUrlInputs] = useState(['', '', '']);

  // Estado Histórico de Torneos (Resultados y Mazos Ganadores)
  const [editingHistId, setEditingHistId] = useState(null);
  const [cardSearchHist, setCardSearchHist] = useState('');
  const [histForm, setHistForm] = useState({
    name: '',
    date: '',
    location: 'Discord Oficial // Online',
    playersCount: '32 Edgerunners',
    winner: '',
    winningDeck: '',
    source: '',
score: '6 - 0',
    runnerUp: '',
    thirdPlace: '',
    featuredCardImg:
      'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/alt-cunningham.png',
    summary: ''
  });

  // Estado URL Foro Discourse
  const [forumUrlInput, setForumUrlInput] = useState(
    initialCms?.forumUrl || 'https://foro.cyberpunktcg.es'
  );

  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const apiCall = async (payload) => {
    const res = await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setCms(json.data);
      return true;
    }
    return false;
  };

  // Guardar Noticia (Crear o Editar)
  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title.trim()) return;
    const action = editingNewsId ? 'update' : 'create';
    const item = editingNewsId ? { ...newsForm, id: editingNewsId } : newsForm;
    const ok = await apiCall({ action, section: 'news', item });
    if (ok) {
      showToast(editingNewsId ? 'Noticia actualizada correctamente' : 'Noticia publicada en la web');
      setEditingNewsId(null);
      setNewsForm({
        title: '',
        category: 'NOTICIA OFICIAL',
        source: '',
excerpt: '',
        content: '',
        author: 'Admin_ES',
        date: 'HOY',
        readTime: '5 MIN',
        views: '1.0K',
        image: '/images/wallpapers/Japantown.png'
      });
    }
  };

  const handleEditNews = (article) => {
    setEditingNewsId(article.id);
    setNewsForm({ ...article });
  };

  const handleDelete = async (section, id, label) => {
    const ok = await apiCall({ action: 'delete', section, id });
    if (ok) {
      showToast(`${label} eliminado correctamente`);
    }
  };

  // Guardar Hero
  const handleSaveHero = async (e) => {
    e.preventDefault();
    const updatedHero = {
      ...heroForm,
      stats: [
        {
          label: 'CATEGORÍA',
          value: heroForm.category || 'NOTICIA OFICIAL',
          color: 'text-[#00F0FF]'
        },
        {
          label: 'PALABRAS CLAVE',
          value: heroForm.keywords || '#CyberpunkTCG #NightCity',
          color: 'text-[#FCEE0A]'
        },
        {
          label: heroForm.extraLabel || 'FORMATO / SET',
          value: heroForm.extraValue || 'SET 01 // NIGHT CITY',
          color: 'text-[#FF003C]'
        }
      ]
    };
    setHeroForm(updatedHero);
    const ok = await apiCall({ action: 'update_hero', heroArticle: updatedHero });
    if (ok) {
      showToast('Portada Destacada (Hero) actualizada');
    }
  };

  // Guardar Torneo
  const handleSaveTournament = async (e) => {
    e.preventDefault();
    if (!tourForm.name.trim()) return;
    const action = editingTourId ? 'update' : 'create';
    const item = editingTourId ? { ...tourForm, id: editingTourId } : tourForm;
    const ok = await apiCall({ action, section: 'tournaments', item });
    if (ok) {
      showToast(editingTourId ? 'Torneo actualizado' : 'Nuevo torneo publicado');
      setEditingTourId(null);
      setTourForm({
        name: '',
        date: '',
        location: 'Discord Oficial // Online',
        format: 'Constructed Estándar (BO3)',
        prizePool: '',
        players: '0 / 32 Inscritos',
        status: 'INSCRIPCIONES ABIERTAS',
        image: '/images/wallpapers/Night_City_3840x2160.png'
      });
    }
  };

  // Helper para resetear formulario de mazos
  const resetDeckForm = () => {
    setEditingDeckId(null);
    setDeckPickerTarget('legends');
    setDeckForm({
      name: '',
      archetype: 'NETRUNNER // CONTROL',
      tier: 'TIER 1',
      featuredCardId: null,
      featuredCard: null,
      pilot: 'CyberPlayer',
      bannerWallpaper: '/images/wallpapers/Night_City_3840x2160.png',
      description: '',
      legends: [],
      cards: [],
      deckList: [],
      sideboard: []
    });
  };

  // Cargar mazo para edición separando las 3 Leyendas y la Carta Destacada
  const handleStartEditDeck = (deck) => {
    setEditingDeckId(deck.id);
    const existingLegendsCount = (Array.isArray(deck.legends) && deck.legends.length) || (Array.isArray(deck.cards) && deck.cards.length) || 0;
    setDeckPickerTarget(existingLegendsCount >= 3 ? 'main' : 'legends');

    let legends = [];
    let featuredCard = deck.featuredCard || null;
    let featuredCardId = deck.featuredCardId || null;

    if (Array.isArray(deck.legends) && deck.legends.length > 0) {
      legends = [...deck.legends];
    } else if (Array.isArray(deck.cards)) {
      if (deck.cards.length <= 3) {
        legends = [...deck.cards];
      } else {
        if (featuredCardId) {
          featuredCard = deck.cards.find((c) => c.id === featuredCardId) || deck.cards[3];
          legends = deck.cards.filter((c) => c.id !== featuredCard.id).slice(0, 3);
        } else {
          legends = deck.cards.slice(0, 3);
          featuredCard = deck.cards[3];
          featuredCardId = featuredCard.id;
        }
      }
    }

    if (!featuredCard && featuredCardId) {
      featuredCard = legends.find((c) => c.id === featuredCardId) || null;
    }
    if (!featuredCardId && legends[0]) {
      featuredCardId = legends[0].id;
      featuredCard = legends[0];
    }

    setDeckForm({
      ...deck,
      tier: formatTier(deck.tier),
      legends,
      cards: legends,
      featuredCard,
      featuredCardId: featuredCardId || legends[0]?.id || null,
      deckList: Array.isArray(deck.deckList) ? [...deck.deckList] : [],
      sideboard: Array.isArray(deck.sideboard) ? [...deck.sideboard] : []
    });
  };

  // Guardar Mazo
  const handleSaveDeck = async (e) => {
    e.preventDefault();
    if (!deckForm.name.trim()) return;
    const action = editingDeckId ? 'update' : 'create';
    const legends = deckForm.legends || deckForm.cards || [];
    const featuredCard =
      deckForm.featuredCard ||
      legends.find((c) => c.id === deckForm.featuredCardId) ||
      legends[0] ||
      null;
    const featuredCardId = deckForm.featuredCardId || featuredCard?.id || null;

    const item = {
      ...deckForm,
      id: editingDeckId || deckForm.id,
      legends,
      cards: legends,
      featuredCard,
      featuredCardId,
      deckList: deckForm.deckList || [],
      sideboard: deckForm.sideboard || []
    };

    const ok = await apiCall({ action, section: 'decks', item });
    if (ok) {
      showToast(editingDeckId ? 'Mazo actualizado en el Meta' : 'Nuevo mazo añadido al Meta');
      resetDeckForm();
    }
  };


  // Mover mazo arriba o abajo en el orden del ranking
  const handleMoveDeck = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const decks = [...(cms.decks || [])];
    if (targetIndex < 0 || targetIndex >= decks.length) return;

    const temp = decks[index];
    decks[index] = decks[targetIndex];
    decks[targetIndex] = temp;

    // Actualización inmediata en UI
    setCms((prev) => ({ ...prev, decks }));

    const ok = await apiCall({ action: 'reorder', section: 'decks', items: decks });
    if (ok) {
      showToast(
        targetIndex < 3
          ? `Mazo movido a la posición #${targetIndex + 1} (Visible en el Top 3 de Portada)`
          : `Mazo movido a la posición #${targetIndex + 1}`
      );
    }
  };


  const handleIncrementDeckCard = (cardId) => {
    setDeckForm((prev) => {
      const mainCard = (prev.deckList || []).find((c) => c.id === cardId);
      const mainQty = mainCard ? mainCard.qty || 1 : 0;
      const sideCard = (prev.sideboard || []).find((c) => c.id === cardId);
      const sideQty = sideCard ? sideCard.qty || 1 : 0;

      if (mainQty + sideQty >= 3) {
        showToast('Máximo 3 copias permitidas en total (Baraja + Banquillo)');
        return prev;
      }



      const list = (prev.deckList || []).map((c) => {
        if (c.id === cardId) {
          return { ...c, qty: (c.qty || 1) + 1 };
        }
        return c;
      });
      return { ...prev, deckList: list };
    });
  };

  const handleDecrementDeckCard = (cardId) => {
    setDeckForm((prev) => {
      const list = (prev.deckList || [])
        .map((c) => {
          if (c.id === cardId) {
            return { ...c, qty: (c.qty || 1) - 1 };
          }
          return c;
        })
        .filter((c) => (c.qty || 0) > 0);
      return { ...prev, deckList: list };
    });
  };

  const handleIncrementSideboardCard = (cardId) => {
    setDeckForm((prev) => {
      const mainCard = (prev.deckList || []).find((c) => c.id === cardId);
      const mainQty = mainCard ? mainCard.qty || 1 : 0;
      const sideCard = (prev.sideboard || []).find((c) => c.id === cardId);
      const sideQty = sideCard ? sideCard.qty || 1 : 0;

      if (mainQty + sideQty >= 3) {
        showToast('Máximo 3 copias permitidas en total (Baraja + Banquillo)');
        return prev;
      }

      const totalSide = (prev.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0);
      if (totalSide >= 7) {
        showToast('El banquillo ya tiene el máximo reglamentario de 7 cartas');
        return prev;
      }

      const list = (prev.sideboard || []).map((c) => {
        if (c.id === cardId) {
          return { ...c, qty: (c.qty || 1) + 1 };
        }
        return c;
      });
      return { ...prev, sideboard: list };
    });
  };

  const handleDecrementSideboardCard = (cardId) => {
    setDeckForm((prev) => {
      const list = (prev.sideboard || [])
        .map((c) => {
          if (c.id === cardId) {
            return { ...c, qty: (c.qty || 1) - 1 };
          }
          return c;
        })
        .filter((c) => (c.qty || 0) > 0);
      return { ...prev, sideboard: list };
    });
  };

  const handleAddCardToDeck = (ghCard) => {
    const newCardObj = {
      id: ghCard.id,
      name: ghCard.name,
      type: ghCard.cardType || `${ghCard.faction} // CARTA OFICIAL`,
      cardType: ghCard.cardType || '',
      faction: ghCard.faction || '',
      cost: '4 EDDIES',
      power: '6 FUERZA',
      rarity: ghCard.edition || 'ÉPICA',
      image: ghCard.image,
      ability: ''
    };

    if (deckPickerTarget === 'featured') {
      setDeckForm((prev) => ({
        ...prev,
        featuredCard: newCardObj,
        featuredCardId: newCardObj.id
      }));
      showToast(`Carta destacada asignada: ${ghCard.name}`);
      return;
    }

    if (deckPickerTarget === 'legends') {
      const currentLegends = deckForm.legends || deckForm.cards || [];
      if (currentLegends.length >= 3) {
        showToast('Un mazo solo puede tener 3 Leyendas. Quita una para cambiarla.');
        return;
      }
      const updatedLegends = [...currentLegends, newCardObj];
      setDeckForm((prev) => {
        const hasFeatured = prev.featuredCardId && (prev.featuredCard || updatedLegends.some((l) => l.id === prev.featuredCardId));
        return {
          ...prev,
          legends: updatedLegends,
          cards: updatedLegends,
          featuredCardId: hasFeatured ? prev.featuredCardId : newCardObj.id,
          featuredCard: hasFeatured ? prev.featuredCard : newCardObj
        };
      });
      showToast(`Leyenda #${updatedLegends.length} añadida: ${ghCard.name}`);
      if (updatedLegends.length >= 3) {
        setDeckPickerTarget('main');
        showToast('¡3 Leyendas completadas! Posicionado automáticamente en: + AÑADIR A BARAJA');
      }
      return;
    }

    if (deckPickerTarget === 'main') {
      setDeckForm((prev) => {
        const mainList = Array.isArray(prev.deckList) ? [...prev.deckList] : [];
        const sideList = Array.isArray(prev.sideboard) ? [...prev.sideboard] : [];

        const mainItem = mainList.find((c) => c.id === ghCard.id);
        const mainQty = mainItem ? mainItem.qty || 1 : 0;
        const sideItem = sideList.find((c) => c.id === ghCard.id);
        const sideQty = sideItem ? sideItem.qty || 1 : 0;

        if (mainQty + sideQty >= 3) {
          showToast(`Máximo 3 copias permitidas de ${ghCard.name} en total (Baraja + Banquillo)`);
          return prev;
        }



        const existingIdx = mainList.findIndex((c) => c.id === ghCard.id);
        if (existingIdx !== -1) {
          mainList[existingIdx] = {
            ...mainList[existingIdx],
            qty: (mainList[existingIdx].qty || 1) + 1
          };
        } else {
          mainList.push({ ...newCardObj, qty: 1 });
        }
        return { ...prev, deckList: mainList };
      });
      showToast(`Añadida a la Baraja Principal: ${ghCard.name}`);
      return;
    }

    if (deckPickerTarget === 'sideboard') {
      setDeckForm((prev) => {
        const mainList = Array.isArray(prev.deckList) ? [...prev.deckList] : [];
        const sideList = Array.isArray(prev.sideboard) ? [...prev.sideboard] : [];

        const mainItem = mainList.find((c) => c.id === ghCard.id);
        const mainQty = mainItem ? mainItem.qty || 1 : 0;
        const sideItem = sideList.find((c) => c.id === ghCard.id);
        const sideQty = sideItem ? sideItem.qty || 1 : 0;

        if (mainQty + sideQty >= 3) {
          showToast(`Máximo 3 copias permitidas de ${ghCard.name} en total (Baraja + Banquillo)`);
          return prev;
        }

        const totalSide = sideList.reduce((acc, c) => acc + (c.qty || 1), 0);
        if (totalSide >= 7) {
          showToast('El banquillo ya tiene el máximo reglamentario de 7 cartas');
          return prev;
        }

        const existingIdx = sideList.findIndex((c) => c.id === ghCard.id);
        if (existingIdx !== -1) {
          sideList[existingIdx] = {
            ...sideList[existingIdx],
            qty: (sideList[existingIdx].qty || 1) + 1
          };
        } else {
          sideList.push({ ...newCardObj, qty: 1 });
        }
        return { ...prev, sideboard: sideList };
      });
      showToast(`Añadida al Banquillo (Sideboard): ${ghCard.name}`);
      return;
    }
  };

  const handleRemoveLegend = (idx) => {
    const currentLegends = deckForm.legends || deckForm.cards || [];
    const removedCard = currentLegends[idx];
    const updatedLegends = currentLegends.filter((_, i) => i !== idx);

    let nextFeaturedId = deckForm.featuredCardId;
    let nextFeatured = deckForm.featuredCard;

    if (removedCard && deckForm.featuredCardId === removedCard.id) {
      if (deckForm.featuredCard?.id === removedCard.id) {
        nextFeatured = updatedLegends[0] || null;
        nextFeaturedId = nextFeatured?.id || null;
      }
    }

    setDeckForm((prev) => ({
      ...prev,
      legends: updatedLegends,
      cards: updatedLegends,
      featuredCard: nextFeatured,
      featuredCardId: nextFeaturedId
    }));
  };

  // Guardar las 3 Cartas Más Vendidas (Cardmarket Best Sellers) de Inicio
  const handleSaveAltArt = async (e) => {
    e.preventDefault();
    const ok = await apiCall({ action: 'update_alt_art', altArtCards: altArtForm });

    // Guardar también las correcciones en el catálogo de cartas para futuros autorrellenos
    let savedCount = 0;
    for (const slot of altArtForm) {
      if (!slot.slug) continue;
      try {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_card',
            slug: slot.slug,
            fields: {
              name: slot.name || '',
              cardId: slot.cardId || '',
              cardType: slot.cardType || '',
              edition: slot.edition || '',
              artist: slot.artist || '',
              collection: slot.collection || ''
            }
          })
        });
        const json = await res.json();
        if (json?.ok && json.card) {
          savedCount++;
          setCards((prev) => prev.map((c) => (c.slug === json.card.slug ? { ...c, ...json.card } : c)));
        }
      } catch {}
    }

    if (ok) {
      showToast(
        `Top 3 publicado en portada${savedCount ? ` y ${savedCount} cartas actualizadas en el catálogo` : ''}`
      );
    }
  };

  // Autocompletar todos los datos de la carta pegando la URL de GitHub
  const handleAutofillFromGithubUrl = (slotIdx, rawUrl, showNotification = true) => {
    setGithubUrlInputs((prev) => prev.map((v, i) => (i === slotIdx ? rawUrl : v)));
    if (!rawUrl || !rawUrl.trim()) return;

    const resolved = resolveCardFromGithubUrl(rawUrl, cards);
    if (!resolved) return;

    setAltArtForm((prev) =>
      prev.map((item, idx) =>
        idx === slotIdx
          ? {
              ...item,
              id: resolved.id,
              cardId: resolved.cardId,
              slug: resolved.slug,
              name: resolved.name,
              cardType: resolved.cardType,
              faction: resolved.faction,
              edition: resolved.edition,
              artist: resolved.artist,
              collection: resolved.collection,
              badge: item.badge || `TOP #0${slotIdx + 1} BEST SELLER // CARDMARKET`,
              image: resolved.image,
              githubUrl: resolved.githubUrl
            }
          : item
      )
    );

    if (showNotification) {
      const missing = ['cardType', 'artist', 'edition', 'cardId'].filter((k) => !resolved[k]);
      showToast(
        missing.length
          ? `${resolved.name}: datos rellenados. Faltan por verificar: ${missing
              .map((k) => ({ cardType: 'tipo', artist: 'artista', edition: 'rareza', cardId: 'nº' })[k])
              .join(', ')} — complétalos y pulsa Publicar para guardarlos`
          : `¡Datos autocompletados! ${resolved.name} (${resolved.cardType} • ${resolved.artist})`
      );
    }
  };

  const handleSelectCardForAltSlot = (ghCard) => {
    const enriched = enrichCardObject(ghCard);
    setAltArtForm((prev) =>
      prev.map((item, idx) =>
        idx === activeAltSlot
          ? {
              ...item,
              id: enriched.id,
              cardId: enriched.cardId,
              slug: enriched.slug,
              name: enriched.name,
              cardType: enriched.cardType,
              faction: enriched.faction,
              edition: enriched.edition,
              artist: enriched.artist,
              collection: enriched.collection,
              badge: item.badge || `TOP #0${activeAltSlot + 1} BEST SELLER // CARDMARKET`,
              image: enriched.image,
              githubUrl: enriched.githubUrl
            }
          : item
      )
    );
    setGithubUrlInputs((prev) =>
      prev.map((v, i) => (i === activeAltSlot ? enriched.githubUrl || enriched.image : v))
    );
    showToast(
      `Carta "${enriched.name}" (${enriched.cardType}) autocompletada en el Slot #0${activeAltSlot + 1}`
    );
  };

  // Guardar Histórico de Torneo (Resultado + Mazo Ganador)
  const handleSaveHistTournament = async (e) => {
    e.preventDefault();
    if (!histForm.name.trim() || !histForm.winner.trim()) return;
    const action = editingHistId ? 'update' : 'create';
    const item = editingHistId ? { ...histForm, id: editingHistId } : histForm;
    const ok = await apiCall({ action, section: 'pastTournaments', item });
    if (ok) {
      showToast(
        editingHistId
          ? 'Registro histórico de torneo actualizado'
          : 'Resultado de torneo añadido al Histórico'
      );
      setEditingHistId(null);
      setHistForm({
        name: '',
        date: '',
        location: 'Discord Oficial // Online',
        playersCount: '32 Edgerunners',
        winner: '',
        winningDeck: '',
        source: '',
score: '6 - 0',
        runnerUp: '',
        thirdPlace: '',
        featuredCardImg:
          'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/alt-cunningham.png',
        summary: ''
      });
    }
  };

  // Guardar URL del Foro Discourse
  const handleSaveForumUrl = async (e) => {
    e.preventDefault();
    if (!forumUrlInput.trim()) return;
    const ok = await apiCall({ action: 'update_forum_url', forumUrl: forumUrlInput.trim() });
    if (ok) {
      showToast('URL del Foro Discourse actualizada correctamente');
    }
  };

  // Sincronizar Cartas desde GitHub
  const handleSyncGithubCards = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cards', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        setCards(json.cards);
        showToast(`¡Sincronizadas ${json.total} cartas desde tu GitHub cyberpunk-tcg-cartas!`);
      }
    } catch (e) {
      showToast('Error al sincronizar con GitHub');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: loginUser.trim(),
          password: loginPass
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setLoginError(json.error || 'Credenciales incorrectas');
        setIsLoggingIn(false);
        return;
      }

      // Cargar datos del CMS y Cartas una vez autenticado
      const [cmsRes, cardsRes] = await Promise.all([
        fetch('/api/cms'),
        fetch('/api/cards')
      ]);
      const cmsJson = await cmsRes.json();
      const cardsJson = await cardsRes.json();

      setCms(cmsJson);
      setHeroForm(cmsJson?.heroArticle || {});
      if (cmsJson?.altArtCards?.length === 3) {
        setAltArtForm(
          cmsJson.altArtCards.map((c, idx) => ({
            ...enrichCardObject(c, idx),
            badge: c.badge || `TOP #0${idx + 1} BEST SELLER // CARDMARKET`
          }))
        );
      }
      if (cmsJson?.forumUrl) {
        setForumUrlInput(cmsJson.forumUrl);
      }
      setCards(cardsJson?.cards || []);
      setIsAuthenticated(true);
      setLoginPass('');
    } catch (err) {
      setLoginError('Error de conexión con el servidor de autenticación');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    setIsAuthenticated(false);
    setLoginUser('');
    setLoginPass('');
  };

  const filteredDeckPickerCards = cards.filter((c) => {
    const q = (cardSearchDeck || '').toLowerCase().trim();
    const typeStr = `${c.cardType || ''} ${c.type || ''} ${c.faction || ''} ${c.name || ''}`.toUpperCase();

    // Filtro por Color / Aspect
    if (deckPickerColorFilter !== 'ALL' && c.aspect !== deckPickerColorFilter && c.color !== deckPickerColorFilter) {
      return false;
    }

    // Filtro por Tipo de carta (100% verificado)
    if (deckPickerTypeFilter === 'LEYENDAS') {
      if (c.officialType !== 'LEGEND' && !typeStr.includes('LEGEND') && !typeStr.includes('LEYENDA')) return false;
    } else if (deckPickerTypeFilter === 'PROGRAMAS') {
      if (c.officialType !== 'PROGRAM' && !typeStr.includes('PROGRAM') && !typeStr.includes('PROGRAMA')) return false;
    } else if (deckPickerTypeFilter === 'EQUIPO') {
      if (c.officialType !== 'GEAR' && !typeStr.includes('GEAR') && !typeStr.includes('EQUIPO') && !typeStr.includes('CYBERWARE')) return false;
    } else if (deckPickerTypeFilter === 'UNIDADES') {
      if (c.officialType !== 'UNIT' && !typeStr.includes('UNIT') && !typeStr.includes('UNIDAD')) return false;
    }

    if (!q) return true;

    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.slug || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      (c.cardId || '').toLowerCase().includes(q) ||
      (c.faction || '').toLowerCase().includes(q) ||
      (c.cardType || '').toLowerCase().includes(q) ||
      (c.type || '').toLowerCase().includes(q) ||
      (c.artist || '').toLowerCase().includes(q)
    );
  });

  const filteredAltPickerCards = cards
    .filter((c) => {
      const q = cardSearchAlt.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.cardType || '').toLowerCase().includes(q) ||
        (c.artist || '').toLowerCase().includes(q) ||
        (c.cardId || c.id || '').toLowerCase().includes(q) ||
        (c.githubUrl || '').toLowerCase().includes(q) ||
        (c.image || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 18);

  const filteredHistPickerCards = cards
    .filter(
      (c) =>
        c.name.toLowerCase().includes(cardSearchHist.toLowerCase()) ||
        c.slug.toLowerCase().includes(cardSearchHist.toLowerCase())
    )
    .slice(0, 12);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070a10] text-white font-sans flex flex-col justify-between relative overflow-hidden rounded-none">
        {/* Rejilla Técnica Cyberpulse */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 240, 255, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(252, 238, 10, 0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        {/* Barra superior */}
        <header className="relative z-10 border-b border-gray-800 bg-[#000000]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <a
              href="/"
              style={{ clipPath: CYBER_CLIP }}
              className="flex items-center shrink-0 bg-[#FCEE0A] border border-[#FCEE0A] overflow-hidden rounded-none"
            >
              <img
                src="/images/logo-cyberpunk-tcg-españa.jpg"
                alt="Cyberpunk TCG España"
                className="h-12 w-auto object-contain block"
              />
            </a>
            <a
              href="/"
              style={{ clipPath: CYBER_CLIP }}
              className="px-4 py-2.5 bg-[#070a10] border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#070a10] font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all rounded-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>VOLVER AL PORTAL PÚBLICO</span>
            </a>
          </div>
        </header>

        {/* Formulario de Acceso Restringido NetWatch */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="w-full max-w-md bg-[#000000] border-2 border-[#FCEE0A] shadow-[0_0_40px_rgba(252,238,10,0.2)] p-7 space-y-6 rounded-none"
          >
            <div className="border-b border-gray-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FCEE0A] text-[#070a10]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-widest block">
                    NETWATCH SECURITY // NIVEL 5
                  </span>
                  <h1 className="text-lg font-black uppercase tracking-wider text-white">
                    ACCESO AL <span className="text-[#FCEE0A]">BACKEND CMS</span>
                  </h1>
                </div>
              </div>
            </div>

            {loginError && (
              <div
                style={{ clipPath: CYBER_CLIP }}
                className="bg-[#FF003C]/15 border border-[#FF003C] p-3 flex items-center gap-2.5 text-xs font-mono text-[#FF003C]"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5">
                  USUARIO ADMINISTRADOR
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Introduce tu usuario..."
                    className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] pl-10 pr-3 py-2.5 text-sm font-mono text-white focus:outline-none rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5">
                  CLAVE DE ACCESO (PASSWORD)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] pl-10 pr-3 py-2.5 text-sm font-mono text-white focus:outline-none rounded-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{ clipPath: CYBER_CLIP }}
                className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] hover:bg-[#00F0FF] font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-none mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? 'VERIFICANDO CREDENCIALES...' : 'AUTENTICAR Y ENTRAR AL CMS'}</span>
              </button>
            </form>
          </div>
        </main>

        <footer className="relative z-10 border-t border-gray-800 bg-[#000000] py-4 text-center text-[11px] font-mono text-gray-500">
          SISTEMA PROTEGIDO // CYBERPUNK TCG ESPAÑA
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans rounded-none">
      {/* Header del Panel Admin */}
      <header className="border-b border-gray-800 bg-[#000000] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a
              href="/"
              style={{ clipPath: CYBER_CLIP }}
              className="flex items-center shrink-0 bg-[#FCEE0A] border border-[#FCEE0A] overflow-hidden rounded-none"
            >
              <img
                src="/images/logo-cyberpunk-tcg-españa.jpg"
                alt="Cyberpunk TCG España"
                className="h-12 w-auto object-contain block"
              />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00F0FF]" />
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  BACKEND CMS // <span className="text-[#FCEE0A]">PANEL DE CONTROL</span>
                </h1>
              </div>
              <p className="text-xs font-mono text-gray-400">
                GESTIÓN EN TIEMPO REAL DE NOTICIAS, MAZOS, TORNEOS Y CARTAS GITHUB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              style={{ clipPath: CYBER_CLIP }}
              className="px-4 py-2.5 bg-[#070a10] border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#070a10] font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all rounded-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">VOLVER AL PORTAL</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              style={{ clipPath: CYBER_CLIP }}
              className="px-4 py-2.5 bg-[#FF003C] text-white hover:bg-[#FCEE0A] hover:text-[#070a10] font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all rounded-none"
            >
              <LogOut className="w-4 h-4" />
              <span>CERRAR SESIÓN</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notificación flotante */}
      {statusMessage && (
        <div
          style={{ clipPath: CYBER_CLIP }}
          className="fixed bottom-6 right-6 z-50 bg-[#FCEE0A] text-[#070a10] px-5 py-3.5 font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(252,238,10,0.65)] flex items-center gap-2 rounded-none"
        >
          <CheckCircle2 className="w-4 h-4 text-[#070a10]" />
          <span>{statusMessage}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Pestañas de Navegación del Backend */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-5">
          {[
            { id: 'news', label: `NOTICIAS (${cms.news?.length || 0})`, icon: Newspaper },
            { id: 'hero', label: 'NOTICIA DESTACADA (HERO)', icon: Sparkles },
            { id: 'altArt', label: 'MÁS VENDIDAS CARDMARKET (3)', icon: Sparkles },
            { id: 'decks', label: `MAZOS (${cms.decks?.length || 0})`, icon: Layers },
            { id: 'tournaments', label: `TORNEOS (${cms.tournaments?.length || 0})`, icon: Trophy },
            {
              id: 'history',
              label: `HISTÓRICO TORNEOS (${cms.pastTournaments?.length || 0})`,
              icon: Trophy
            },
            { id: 'cards', label: `CARTAS GITHUB (${cards.length})`, icon: Database },
            { id: 'settings', label: 'FORO DISCOURSE', icon: Terminal }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{ clipPath: CYBER_CLIP }}
                className={`px-5 py-3 font-mono text-xs font-black uppercase tracking-wider border flex items-center gap-2 cursor-pointer transition-all rounded-none ${
                  active
                    ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.45)]'
                    : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ===============================================================
            TAB 1: GESTIÓN DE NOTICIAS
           =============================================================== */}
        {activeTab === 'news' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulario Crear/Editar Noticia */}
            <form
              onSubmit={handleSaveNews}
              style={{ clipPath: CYBER_CLIP }}
              className="lg:col-span-5 bg-[#000000] border border-gray-800 p-6 space-y-4 rounded-none"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono">
                  {editingNewsId ? `EDITANDO NOTICIA // ${editingNewsId}` : 'PUBLICAR NUEVA NOTICIA'}
                </h2>
                {editingNewsId && (
                  <button
                    type="button"
                    onClick={() => setEditingNewsId(null)}
                    className="text-xs font-mono text-[#FF003C] underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-gray-400 mb-1">TÍTULO DE LA NOTICIA *</label>
                  <input
                    type="text"
                    required
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    placeholder="Ej: Anunciado el nuevo set de expansión..."
                    className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2.5 text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">CATEGORÍA</label>
                    <input
                      type="text"
                      value={newsForm.category}
                      onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">FUENTE DE LA NOTICIA (OPCIONAL)</label>
                    <input
                      type="text"
                      value={newsForm.source || ''}
                      onChange={(e) => setNewsForm({ ...newsForm, source: e.target.value })}
                      placeholder="Ej: IGN, Cyberpunk TCG Oficial, Twitter..."
                      className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <HtmlArticleEditor
                  excerpt={newsForm.excerpt}
                  content={newsForm.content}
                  onChangeExcerpt={(val) =>
                    setNewsForm((prev) => ({
                      ...prev,
                      excerpt: val,
                      readTime: calculateReadingTime(val, prev.content, 'MIN')
                    }))
                  }
                  onChangeContent={(val) =>
                    setNewsForm((prev) => ({
                      ...prev,
                      content: val,
                      readTime: calculateReadingTime(prev.excerpt, val, 'MIN')
                    }))
                  }
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">AUTOR</label>
                    <input
                      type="text"
                      value={newsForm.author}
                      onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">FECHA PUBLICACIÓN</label>
                    <input
                      type="text"
                      value={newsForm.date}
                      onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                      placeholder="10 NOV 2026"
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#FCEE0A] mb-1">LECTURA (AUTO)</label>
                    <input
                      type="text"
                      value={newsForm.readTime}
                      onChange={(e) => setNewsForm({ ...newsForm, readTime: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-[#FCEE0A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#00F0FF] mb-1">VISITAS REALES (AUTO)</label>
                    <div className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#00F0FF] font-bold">
                      {Number(newsForm.viewsCount) || 0}{' '}
                      {(Number(newsForm.viewsCount) || 0) === 1 ? 'VISITA' : 'VISITAS'}
                    </div>
                  </div>
                </div>

                <ImageUploadField
                  label="IMAGEN DESTACADA DE LA NOTICIA (SUBIR ARCHIVO, WALLPAPER O URL)"
                  value={newsForm.image}
                  onChange={(url) => setNewsForm({ ...newsForm, image: url })}
                  uploadedFiles={uploadedFiles}
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                />
              </div>

              <button
                type="submit"
                style={{ clipPath: CYBER_CLIP }}
                className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(252,238,10,0.6)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingNewsId ? 'GUARDAR CAMBIOS' : 'PUBLICAR NOTICIA'}</span>
              </button>
            </form>

            {/* Listado de Noticias Actuales */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                NOTICIAS PUBLICADAS ACTUALMENTE ({cms.news?.length || 0})
              </h3>
              <div className="space-y-3">
                {cms.news?.map((item) => (
                  <div
                    key={item.id}
                    style={{ clipPath: CYBER_CLIP }}
                    className="bg-[#000000] border border-gray-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-16 object-cover border border-gray-800 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                            {item.category}
                          </span>
                          {item.source && <span className="text-gray-400">Fuente: {item.source}</span>}
                          <span className="text-gray-500">• {item.date}</span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase mt-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {item.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditNews(item)}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('news', item.id, 'Noticia')}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-[#FF003C] cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            TAB 2: EDITAR NOTICIA DESTACADA (HERO BANNER)
           =============================================================== */}
        {activeTab === 'hero' && (
          <form
            onSubmit={handleSaveHero}
            style={{ clipPath: CYBER_CLIP }}
            className="max-w-3xl bg-[#000000] border border-gray-800 p-6 sm:p-8 space-y-4 rounded-none"
          >
            <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono border-b border-gray-800 pb-3">
              CONFIGURAR NOTICIA DESTACADA EN PORTADA (HERO SECTION)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 mb-1">ETIQUETA SUPERIOR</label>
                <input
                  type="text"
                  value={heroForm.tag}
                  onChange={(e) => setHeroForm({ ...heroForm, tag: e.target.value })}
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">FUENTE DE LA NOTICIA (OPCIONAL)</label>
                <input
                  type="text"
                  value={heroForm.source || ''}
                  onChange={(e) => setHeroForm({ ...heroForm, source: e.target.value })}
                  placeholder="Ej: IGN, Cyberpunk TCG Oficial, Twitter..."
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="text-xs font-mono space-y-3">
              <div>
                <label className="block text-gray-400 mb-1">TITULAR PRINCIPAL *</label>
                <input
                  type="text"
                  required
                  value={heroForm.title}
                  onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2.5 text-white"
                />
              </div>

              <HtmlArticleEditor
                excerpt={heroForm.excerpt}
                content={heroForm.content}
                onChangeExcerpt={(val) =>
                  setHeroForm((prev) => ({
                    ...prev,
                    excerpt: val,
                    readTime: calculateReadingTime(val, prev.content, 'MIN LECTURA')
                  }))
                }
                onChangeContent={(val) =>
                  setHeroForm((prev) => ({
                    ...prev,
                    content: val,
                    readTime: calculateReadingTime(prev.excerpt, val, 'MIN LECTURA')
                  }))
                }
                onUploadSuccess={setUploadedFiles}
                showToast={showToast}
              />

              {/* Las 3 Cajas Destacadas (Categoría, Palabras Clave y 3º Dato Personalizable) */}
              <div className="bg-[#070a10] border border-gray-800 p-4 space-y-3">
                <span className="text-[11px] font-mono font-bold text-[#FCEE0A] uppercase block">
                  LAS 3 CAJAS DESTACADAS DEL HERO (CATEGORÍA, PALABRAS CLAVE Y DATO EXTRA)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#00F0FF] mb-1">
                      CAJA 1: CATEGORÍA
                    </label>
                    <input
                      type="text"
                      value={heroForm.category ?? heroForm.stats?.[0]?.value ?? 'REGLAMENTO OFICIAL'}
                      onChange={(e) => setHeroForm({ ...heroForm, category: e.target.value })}
                      placeholder="Ej: REGLAMENTO OFICIAL"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#00F0FF] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[#FCEE0A] mb-1">
                      CAJA 2: PALABRAS CLAVE (TAGS)
                    </label>
                    <input
                      type="text"
                      value={heroForm.keywords ?? heroForm.stats?.[1]?.value ?? '#Torneos #Jueces'}
                      onChange={(e) => setHeroForm({ ...heroForm, keywords: e.target.value })}
                      placeholder="Ej: #Torneos #Jueces #Banquillo"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#FCEE0A] font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={heroForm.extraLabel ?? heroForm.stats?.[2]?.label ?? 'FORMATO / SET'}
                      onChange={(e) => setHeroForm({ ...heroForm, extraLabel: e.target.value })}
                      placeholder="Título Caja 3 (ej: FORMATO / SET)"
                      className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1 text-[10px] text-gray-300 uppercase"
                    />
                    <input
                      type="text"
                      value={heroForm.extraValue ?? heroForm.stats?.[2]?.value ?? 'SET 01 // NIGHT CITY'}
                      onChange={(e) => setHeroForm({ ...heroForm, extraValue: e.target.value })}
                      placeholder="Valor Caja 3 (ej: SET 01 // NIGHT CITY)"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#FF003C] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Autor, Rol, Fecha de Publicación, Minutos de Lectura (Auto) y Vistas */}
              <div className="bg-[#070a10] border border-gray-800 p-4 space-y-3">
                <span className="text-[11px] font-mono font-bold text-[#00F0FF] uppercase block">
                  AUTOR, FECHA DE PUBLICACIÓN, TIEMPO DE LECTURA Y VISTAS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">AUTOR DE LA NOTICIA</label>
                    <input
                      type="text"
                      value={heroForm.author || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, author: e.target.value })}
                      placeholder="Ej: ZeroCool_2077"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">CARGO / ROL DEL AUTOR</label>
                    <input
                      type="text"
                      value={heroForm.role || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, role: e.target.value })}
                      placeholder="Ej: Analista Jefe // Cyberpulse eSports"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">FECHA DE PUBLICACIÓN</label>
                    <input
                      type="text"
                      value={heroForm.date || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, date: e.target.value })}
                      placeholder="Ej: 10 NOV 2026"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#FCEE0A] mb-1">
                      TIEMPO DE LECTURA (AUTO: 200 PAL/MIN)
                    </label>
                    <input
                      type="text"
                      value={heroForm.readTime || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, readTime: e.target.value })}
                      placeholder="Ej: 3 MIN LECTURA"
                      className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#FCEE0A] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[#00F0FF] mb-1">
                      VISITAS REALES (CONTADOR AUTOMÁTICO)
                    </label>
                    <div className="w-full bg-[#000000] border border-gray-800 px-3 py-2 text-[#00F0FF] font-bold">
                      {Number(heroForm.viewsCount) || 0}{' '}
                      {(Number(heroForm.viewsCount) || 0) === 1 ? 'VISITA' : 'VISITAS'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadField
                  label="IMAGEN DESTACADA DE FONDO (ESTILO WORDPRESS)"
                  value={heroForm.wallpaper}
                  onChange={(url) => setHeroForm({ ...heroForm, wallpaper: url, image: url })}
                  uploadedFiles={uploadedFiles}
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                />
                <ImageUploadField
                  label="CARTA MVP DERECHA"
                  value={heroForm.featuredCardImg}
                  onChange={(url) => setHeroForm({ ...heroForm, featuredCardImg: url })}
                  uploadedFiles={uploadedFiles}
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{ clipPath: CYBER_CLIP }}
              className="px-6 py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ACTUALIZAR PORTADA HERO</span>
            </button>
          </form>
        )}

        {/* ===============================================================
            TAB 3: GESTIÓN DE MAZOS (CON SELECTOR DE CARTAS DE GITHUB)
           =============================================================== */}
        {activeTab === 'decks' && (
          <div className="space-y-8">
            {/* FILA SUPERIOR: Formulario de Configuración del Mazo (Izq) + Lista de Mazos (Der) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Formulario del Mazo Actual */}
              <form
                onSubmit={handleSaveDeck}
                style={{ clipPath: CYBER_CLIP }}
                className="lg:col-span-7 bg-[#000000] border border-gray-800 p-6 space-y-4 rounded-none"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#00F0FF] uppercase block">
                      CONFIGURACIÓN COMPETITIVA // BARAJA PRINCIPAL (MÍN. 40) + 7 BANQUILLO + 3 LEYENDAS
                    </span>
                    <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono">
                      {editingDeckId ? `EDITANDO MAZO // ${editingDeckId}` : 'CREAR NUEVO MAZO META'}
                    </h2>
                  </div>
                  {editingDeckId && (
                    <button
                      type="button"
                      onClick={() => resetDeckForm()}
                      className="text-xs font-mono text-[#FF003C] hover:underline cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="block text-gray-400 mb-1">TIER DEL MAZO</label>
                    <select
                      value={formatTier(deckForm.tier)}
                      onChange={(e) => setDeckForm({ ...deckForm, tier: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    >
                      <option value="TIER 1">TIER 1 (Nivel Máximo Competitivo)</option>
                      <option value="TIER 2">TIER 2 (Muy Fuerte)</option>
                      <option value="TIER 3">TIER 3 (Competitivo Viable)</option>
                      <option value="TIER 4">TIER 4 (Rogue / Estrategia Experimental)</option>
                      <option value="TIER 5">TIER 5 (Casual / En Desarrollo)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">NOMBRE DEL MAZO *</label>
                      <input
                        type="text"
                        required
                        value={deckForm.name}
                        onChange={(e) => setDeckForm({ ...deckForm, name: e.target.value })}
                        placeholder="Ej: Arasaka Control Protocol"
                        className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">PILOTO / AUTOR</label>
                      <input
                        type="text"
                        value={deckForm.pilot}
                        onChange={(e) => setDeckForm({ ...deckForm, pilot: e.target.value })}
                        className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">ARQUETIPO</label>
                    <input
                      type="text"
                      value={deckForm.archetype}
                      onChange={(e) => setDeckForm({ ...deckForm, archetype: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">DESCRIPCIÓN TÁCTICA *</label>
                    <textarea
                      rows="2"
                      required
                      value={deckForm.description}
                      onChange={(e) => setDeckForm({ ...deckForm, description: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>

                  <ImageUploadField
                    label="IMAGEN BANNER DEL MAZO (SUBIR ARCHIVO O WALLPAPER)"
                    value={deckForm.bannerWallpaper}
                    onChange={(url) => setDeckForm({ ...deckForm, bannerWallpaper: url })}
                    uploadedFiles={uploadedFiles}
                    onUploadSuccess={setUploadedFiles}
                    showToast={showToast}
                  />

                  {/* 1. LAS 3 LEYENDAS */}
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[#00F0FF] font-bold text-xs uppercase tracking-wider">
                        1. LAS 3 LEYENDAS DEL MAZO ({(deckForm.legends || deckForm.cards || []).length} / 3)
                      </label>
                      <span className="text-[10px] text-gray-400">Pulsa ★ para marcarla como destacada</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[0, 1, 2].map((slotIdx) => {
                        const currentLegends = deckForm.legends || deckForm.cards || [];
                        const legend = currentLegends[slotIdx];
                        const isFeatured = legend && (deckForm.featuredCardId === legend.id);
                        if (legend) {
                          return (
                            <div
                              key={legend.id}
                              className={`p-2 bg-[#070a10] border flex items-center gap-2 ${
                                isFeatured ? 'border-[#FCEE0A] shadow-[0_0_12px_rgba(252,238,10,0.35)]' : 'border-gray-800'
                              }`}
                            >
                              <img
                                src={legend.image}
                                alt={legend.name}
                                className="w-10 h-14 object-cover object-top shrink-0 border border-gray-800"
                              />
                              <div className="min-w-0 flex-1 text-[11px] font-mono">
                                <span className="text-[9px] text-[#FCEE0A] font-bold block">LEYENDA #{slotIdx + 1}</span>
                                <p className="text-white font-bold truncate">{legend.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeckForm((prev) => ({
                                        ...prev,
                                        featuredCardId: legend.id,
                                        featuredCard: legend
                                      }))
                                    }
                                    className={`text-[10px] font-mono cursor-pointer flex items-center gap-0.5 ${
                                      isFeatured ? 'text-[#FCEE0A] font-bold' : 'text-gray-500 hover:text-[#FCEE0A]'
                                    }`}
                                  >
                                    <span>★</span>
                                    <span>{isFeatured ? 'Destacada' : 'Hacer destacada'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLegend(slotIdx)}
                                    className="text-[#FF003C] hover:underline text-[10px] cursor-pointer ml-auto"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={slotIdx}
                            className="p-3 bg-[#070a10] border border-dashed border-gray-800 flex flex-col items-center justify-center text-center text-gray-500 text-[11px] font-mono min-h-[70px]"
                          >
                            <span>[ Leyenda #{slotIdx + 1} Vacía ]</span>
                            <span className="text-[9px] text-gray-600">Añade desde el catálogo</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. CARTA DESTACADA EN PORTADA */}
                  <div className="p-3 bg-[#070a10] border border-[#00F0FF]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#00F0FF] font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FCEE0A]" />
                        2. CARTA DESTACADA EN PORTADA
                      </span>
                      {deckForm.featuredCard && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-bold">
                          {(deckForm.legends || deckForm.cards || []).some((l) => l.id === deckForm.featuredCardId)
                            ? 'UNA DE LAS LEYENDAS'
                            : 'OTRA CARTA DEL MAZO'}
                        </span>
                      )}
                    </div>

                    {deckForm.featuredCard ? (
                      <div className="flex items-center gap-3 bg-[#000000] p-2 border border-gray-800">
                        <img
                          src={deckForm.featuredCard.image}
                          alt={deckForm.featuredCard.name}
                          className="w-12 h-16 object-cover object-top border border-gray-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1 text-xs font-mono">
                          <p className="text-white font-bold truncate">{deckForm.featuredCard.name}</p>
                          <span className="text-[10px] text-gray-400 block">
                            {deckForm.featuredCard.type || 'CARTA OFICIAL'}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono block">
                            {deckForm.featuredCard.id}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-mono">
                        No hay carta destacada seleccionada (se usará la Leyenda 1 por defecto).
                      </p>
                    )}
                  </div>

                  {/* 3. BARAJA PRINCIPAL (40 CARTAS) */}
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-mono text-[#FCEE0A] font-bold uppercase block">
                          3. BARAJA PRINCIPAL // {(deckForm.deckList || []).reduce((acc, c) => acc + (c.qty || 1), 0)} CARTAS (MÍNIMO 40)
                        </label>
                        <span className="text-[10px] font-mono text-gray-400">
                          Mínimo 40 cartas en baraja principal (sin límite superior, admite 40, 41, 42, 43 o más). Máx 3 copias por carta en total.
                        </span>
                      </div>

                      {(deckForm.deckList || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeckForm((prev) => ({ ...prev, deckList: [] }))}
                          className="text-[10px] font-mono text-[#FF003C] hover:underline cursor-pointer"
                        >
                          Vaciar baraja
                        </button>
                      )}
                    </div>

                    {(deckForm.deckList || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-[#070a10] border border-gray-800">
                        {(deckForm.deckList || []).map((card) => {
                          const totalCopies = (card.qty || 1) + ((deckForm.sideboard || []).find((s) => s.id === card.id)?.qty || 0);
                          const totalMain = (deckForm.deckList || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                          const canIncrement = totalCopies < 3;

                          return (
                            <div
                              key={card.id}
                              className="bg-[#000000] border border-gray-800 p-2 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-7 h-10 object-contain shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate">
                                    {card.name}
                                  </p>
                                  <span className="text-[9px] font-mono text-gray-400">
                                    {card.id}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementDeckCard(card.id)}
                                  className="w-5 h-5 bg-[#070a10] border border-gray-700 hover:border-[#FF003C] text-white text-[10px] flex items-center justify-center cursor-pointer"
                                  title="Reducir copia"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-xs font-black text-[#FCEE0A]">
                                  {card.qty || 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canIncrement}
                                  onClick={() => handleIncrementDeckCard(card.id)}
                                  title={!canIncrement ? 'Límite alcanzado' : 'Añadir copia'}
                                  className={`w-5 h-5 bg-[#070a10] border text-[10px] flex items-center justify-center ${
                                    !canIncrement
                                      ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-40'
                                      : 'border-gray-700 hover:border-[#00F0FF] text-white cursor-pointer'
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-mono p-3 bg-[#070a10] border border-gray-800">
                        No hay cartas en la baraja principal. Selecciona el modo "+ AÑADIR A BARAJA" en el catálogo inferior.
                      </p>
                    )}
                  </div>

                  {/* 4. BANQUILLO // SIDEBOARD (7 CARTAS) */}
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-mono text-[#00F0FF] font-bold uppercase block">
                          4. BANQUILLO // SIDEBOARD // {(deckForm.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0)} / 7 CARTAS
                        </label>
                        <span className="text-[10px] font-mono text-gray-400">
                          Exactamente 7 cartas en el banquillo. Máx 3 copias por carta en total (Baraja + Banquillo).
                        </span>
                      </div>

                      {(deckForm.sideboard || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeckForm((prev) => ({ ...prev, sideboard: [] }))}
                          className="text-[10px] font-mono text-[#FF003C] hover:underline cursor-pointer"
                        >
                          Vaciar banquillo
                        </button>
                      )}
                    </div>

                    {(deckForm.sideboard || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-[#070a10] border border-gray-800">
                        {(deckForm.sideboard || []).map((card) => {
                          const totalCopies = (card.qty || 1) + ((deckForm.deckList || []).find((m) => m.id === card.id)?.qty || 0);
                          const totalSide = (deckForm.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                          const canIncrement = totalCopies < 3 && totalSide < 7;

                          return (
                            <div
                              key={card.id}
                              className="bg-[#000000] border border-[#00F0FF]/30 p-2 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={card.image}
                                  alt={card.name}
                                  className="w-7 h-10 object-contain shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate">
                                    {card.name}
                                  </p>
                                  <span className="text-[9px] font-mono text-gray-400">
                                    {card.id}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementSideboardCard(card.id)}
                                  className="w-5 h-5 bg-[#070a10] border border-gray-700 hover:border-[#FF003C] text-white text-[10px] flex items-center justify-center cursor-pointer"
                                  title="Reducir copia"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-xs font-black text-[#00F0FF]">
                                  {card.qty || 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canIncrement}
                                  onClick={() => handleIncrementSideboardCard(card.id)}
                                  title={!canIncrement ? 'Límite alcanzado' : 'Añadir copia'}
                                  className={`w-5 h-5 bg-[#070a10] border text-[10px] flex items-center justify-center ${
                                    !canIncrement
                                      ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-40'
                                      : 'border-gray-700 hover:border-[#00F0FF] text-white cursor-pointer'
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 font-mono p-3 bg-[#070a10] border border-gray-800">
                        No hay cartas en el banquillo. Selecciona el modo "+ AÑADIR A BANQUILLO" en el catálogo inferior.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ clipPath: CYBER_CLIP }}
                  className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(252,238,10,0.4)]"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingDeckId ? 'ACTUALIZAR MAZO' : 'GUARDAR NUEVO MAZO'}</span>
                </button>
              </form>

              {/* Lista de Mazos con Reordenación */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                      ORDEN DE MAZOS ({cms.decks?.length || 0})
                    </h3>
                    <p className="text-[11px] font-mono text-gray-400">
                      Los 3 primeros se muestran en el <strong className="text-[#FCEE0A]">TOP 3 de Portada</strong>. Usa las flechas ▲ / ▼ para ordenarlos.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(cms.decks || []).map((deck, idx) => {
                    const isInTop3 = idx < 3;
                    const mainCardsCount = (deck.deckList || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                    const sideCardsCount = (deck.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                    const isCurrentlyEditing = editingDeckId === deck.id;

                    return (
                      <div
                        key={deck.id || idx}
                        className={`bg-[#000000] border p-4 flex items-center gap-4 transition-all ${
                          isCurrentlyEditing
                            ? 'border-[#FCEE0A] shadow-[0_0_20px_rgba(252,238,10,0.3)]'
                            : isInTop3
                            ? 'border-[#00F0FF]/60 hover:border-[#00F0FF]'
                            : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {/* Controles de Reordenación ▲ / ▼ */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveDeck(idx, -1)}
                            className={`w-7 h-7 flex items-center justify-center border transition-all ${
                              idx === 0
                                ? 'border-gray-800 text-gray-700 cursor-not-allowed opacity-30'
                                : 'border-gray-700 hover:border-[#00F0FF] text-gray-300 hover:text-[#00F0FF] bg-[#070a10] cursor-pointer'
                            }`}
                            title="Mover hacia arriba"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (cms.decks || []).length - 1}
                            onClick={() => handleMoveDeck(idx, 1)}
                            className={`w-7 h-7 flex items-center justify-center border transition-all ${
                              idx === (cms.decks || []).length - 1
                                ? 'border-gray-800 text-gray-700 cursor-not-allowed opacity-30'
                                : 'border-gray-700 hover:border-[#00F0FF] text-gray-300 hover:text-[#00F0FF] bg-[#070a10] cursor-pointer'
                            }`}
                            title="Mover hacia abajo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Ficha resumen del mazo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-[#FCEE0A]">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-mono text-gray-400">
                              [{formatTier(deck.tier)}]
                            </span>

                            {isInTop3 ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-bold">
                                ★ EN TOP 3 PORTADA
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-500">
                                (Página /mazos)
                              </span>
                            )}

                            <span className="text-gray-400 text-[11px]">@{deck.pilot}</span>
                          </div>

                          <h4 className="text-base font-black text-white uppercase mt-1 truncate">
                            {deck.name}
                          </h4>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            3 Leyendas • {mainCardsCount}/40 Baraja • {sideCardsCount}/7 Banquillo
                          </p>
                        </div>

                        {/* Botones de Edición y Borrado */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditDeck(deck)}
                            className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer transition-colors"
                            title="Editar mazo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete('decks', deck.id, 'Mazo')}
                            className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-[#FF003C] cursor-pointer transition-colors"
                            title="Eliminar mazo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FILA INFERIOR: CATÁLOGO Y BUSCADOR COMPLETO A TODO EL ANCHO (w-full) */}
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="w-full bg-[#000000] border-2 border-gray-800 p-6 space-y-5 rounded-none shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            >
              {/* Encabezado y Selector de Modo de Asignación */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-wider">
                    <Database className="w-4 h-4 text-[#FCEE0A]" />
                    <span>CATÁLOGO COMPLETO DE CARTAS // 151 CARTAS OFICIALES GITHUB</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white mt-0.5">
                    BUSCADOR Y ASIGNADOR DE CARTAS A MAZO
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    Selecciona a qué sección quieres añadir cartas y haz clic en cualquiera de las cartas del catálogo.
                  </p>
                </div>

                {/* Botones de Modo de Clic */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeckPickerTarget('main')}
                    className={`px-3.5 py-2 border font-mono text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      deckPickerTarget === 'main'
                        ? 'bg-[#FF003C] text-white border-[#FF003C] shadow-[0_0_15px_rgba(255,0,60,0.6)]'
                        : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ AÑADIR A BARAJA</span>
                    <span className="px-1.5 py-0.5 bg-black/50 text-[11px] font-mono ml-1 text-white">
                      {(deckForm.deckList || []).reduce((acc, c) => acc + (c.qty || 1), 0)} CARTAS
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeckPickerTarget('sideboard')}
                    className={`px-3.5 py-2 border font-mono text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      deckPickerTarget === 'sideboard'
                        ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.6)]'
                        : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ AÑADIR A BANQUILLO (7)</span>
                    <span className="px-1.5 py-0.5 bg-black/50 text-[11px] font-mono ml-1 text-white">
                      {(deckForm.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0)}/7
                    </span>
                  </button>

                  {(() => {
                    const currentLegendsCount = (deckForm.legends || deckForm.cards || []).length;
                    const isLegendsLocked = currentLegendsCount >= 3;
                    return (
                      <button
                        type="button"
                        disabled={isLegendsLocked}
                        onClick={() => {
                          if (!isLegendsLocked) setDeckPickerTarget('legends');
                        }}
                        title={
                          isLegendsLocked
                            ? 'Límite de 3 leyendas alcanzado. Elimina una de las leyendas para desbloquear.'
                            : 'Añadir Leyendas al mazo (máximo 3)'
                        }
                        className={`px-3.5 py-2 border font-mono text-xs font-black transition-all flex items-center gap-2 ${
                          isLegendsLocked
                            ? 'bg-[#070a10] text-gray-500 border-gray-900 cursor-not-allowed opacity-50'
                            : deckPickerTarget === 'legends'
                            ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A] shadow-[0_0_15px_rgba(252,238,10,0.6)] cursor-pointer'
                            : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700 cursor-pointer'
                        }`}
                      >
                        {isLegendsLocked ? (
                          <Lock className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>
                          {isLegendsLocked ? '3 LEYENDAS (BLOQUEADO)' : '+ LEYENDAS (MÁX 3)'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[11px] font-mono ml-1 ${
                            isLegendsLocked ? 'bg-gray-900 text-gray-500' : 'bg-black/50 text-white'
                          }`}
                        >
                          {currentLegendsCount}/3
                        </span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setDeckPickerTarget('featured')}
                    className={`px-3.5 py-2 border font-mono text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      deckPickerTarget === 'featured'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                        : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>★ CARTA DESTACADA</span>
                  </button>
                </div>
              </div>

              {/* Barra de Búsqueda Grande */}
              <div className="relative">
                <Search className="w-5 h-5 text-[#FCEE0A] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cardSearchDeck}
                  onChange={(e) => setCardSearchDeck(e.target.value)}
                  placeholder="Buscar por nombre, código CP-XXX, facción o tipo (ej: Smasher, Saburo, Johnny, CP-001)..."
                  className="w-full pl-12 pr-28 py-3.5 bg-[#070a10] border-2 border-gray-800 focus:border-[#00F0FF] text-white text-sm font-mono placeholder-gray-500 transition-all focus:outline-none"
                />
                {cardSearchDeck && (
                  <button
                    type="button"
                    onClick={() => setCardSearchDeck('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-mono flex items-center gap-1.5 bg-[#000000] px-2.5 py-1.5 border border-gray-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>

              {/* Píldoras de Filtro (Facción y Tipo) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-gray-400 font-bold uppercase mr-1">Color:</span>
                  {[
                    { id: 'ALL', label: `TODOS (${cards.length})` },
                    { id: 'Red', label: 'ROJAS (38)', color: '#FF003C' },
                    { id: 'Green', label: 'VERDES (38)', color: '#00FF66' },
                    { id: 'Yellow', label: 'AMARILLAS (37)', color: '#FCEE0A' },
                    { id: 'Blue', label: 'AZULES (38)', color: '#00F0FF' }
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setDeckPickerColorFilter(col.id)}
                      className={`px-3 py-1 border font-bold transition-all cursor-pointer ${
                        deckPickerColorFilter === col.id
                          ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                          : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}

                  <span className="text-gray-500 ml-auto">{filteredDeckPickerCards.length} cartas encontradas</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-gray-400 font-bold uppercase mr-1">Tipo:</span>
                  {[
                    { id: 'ALL', label: 'TODOS LOS TIPOS (151)' },
                    { id: 'UNIDADES', label: 'UNIDADES (74)' },
                    { id: 'PROGRAMAS', label: 'PROGRAMAS (34)' },
                    { id: 'EQUIPO', label: 'EQUIPO / GEAR (16)' },
                    { id: 'LEYENDAS', label: 'LEYENDAS (27)' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDeckPickerTypeFilter(t.id)}
                      className={`px-3 py-1 border font-bold transition-all cursor-pointer ${
                        deckPickerTypeFilter === t.id
                          ? 'bg-[#00F0FF] text-[#070a10] border-[#00F0FF]'
                          : 'bg-[#070a10] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <span className="text-[10px] text-gray-500 italic">
                    ✓ Base de datos oficial sincronizada (151 cartas clasificadas)
                  </span>
                </div>
              </div>

              {/* Rejilla a Todo el Ancho (6 Columnas en Pantalla Grande) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 bg-[#070a10] border border-gray-800 max-h-[720px] overflow-y-auto">
                {filteredDeckPickerCards.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-gray-500 font-mono text-sm">
                    No se encontraron cartas que coincidan con la búsqueda o filtros.
                  </div>
                ) : (
                  filteredDeckPickerCards.map((ghCard) => {
                    const inMainItem = (deckForm.deckList || []).find((c) => c.id === ghCard.id);
                    const mainQty = inMainItem ? inMainItem.qty || 1 : 0;
                    const inSideItem = (deckForm.sideboard || []).find((c) => c.id === ghCard.id);
                    const sideQty = inSideItem ? inSideItem.qty || 1 : 0;
                    const totalCopies = mainQty + sideQty;
                    const isAtMaxCopies = totalCopies >= 3;

                    const isLegend = (deckForm.legends || deckForm.cards || []).some((l) => l.id === ghCard.id);
                    const isFeatured = deckForm.featuredCardId === ghCard.id;

                    const totalMain = (deckForm.deckList || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                    const totalSide = (deckForm.sideboard || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                    
                    const isSideFull = totalSide >= 7;

                    let disableAdd = false;
                    let actionLabel = '';

                    if (deckPickerTarget === 'main') {
                      if (isAtMaxCopies) {
                        disableAdd = true;
                        actionLabel = 'MÁX 3 COPIAS';
                      } else {
                        actionLabel = mainQty > 0 ? `+ BARAJA (${mainQty}/3)` : '+ AÑADIR A BARAJA';
                      }
                    } else if (deckPickerTarget === 'sideboard') {
                      if (isAtMaxCopies) {
                        disableAdd = true;
                        actionLabel = 'MÁX 3 COPIAS';
                      } else if (isSideFull) {
                        disableAdd = true;
                        actionLabel = 'BANQUILLO LLENO (7/7)';
                      } else {
                        actionLabel = sideQty > 0 ? `+ BANQUILLO (${sideQty}/3)` : '+ AÑADIR A BANQUILLO';
                      }
                    } else if (deckPickerTarget === 'legends') {
                      const curLegendsCount = (deckForm.legends || deckForm.cards || []).length;
                      if (curLegendsCount >= 3 && !isLegend) {
                        disableAdd = true;
                        actionLabel = '3/3 LEYENDAS (BLOQUEADO)';
                      } else {
                        actionLabel = isLegend ? 'LEYENDA ASIGNADA' : '+ ASIGNAR LEYENDA';
                      }
                    } else if (deckPickerTarget === 'featured') {
                      actionLabel = isFeatured ? '★ DESTACADA ACTUAL' : '★ HACER DESTACADA';
                    }

                    return (
                      <div
                        key={ghCard.id}
                        onClick={() => handleAddCardToDeck(ghCard)}
                        className={`group text-left bg-[#000000] border p-2.5 transition-all cursor-pointer flex flex-col justify-between relative hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] ${
                          isAtMaxCopies
                            ? 'border-[#FF003C]/80 bg-[#FF003C]/5'
                            : mainQty > 0
                            ? 'border-[#FCEE0A] bg-[#FCEE0A]/5'
                            : sideQty > 0
                            ? 'border-[#00F0FF] bg-[#00F0FF]/5'
                            : isLegend
                            ? 'border-[#00F0FF] bg-[#00F0FF]/5'
                            : 'border-gray-800 hover:border-[#00F0FF]'
                        }`}
                      >
                        {/* Badges superiores de estado */}
                        <div className="flex items-center justify-between gap-1 mb-1.5 text-[9px] font-mono">
                          <span className="text-gray-400 font-bold">{ghCard.id}</span>
                          {isAtMaxCopies ? (
                            <span className="px-1.5 py-0.5 bg-[#FF003C] text-white font-black uppercase">
                              3/3 MÁX
                            </span>
                          ) : mainQty > 0 ? (
                            <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black uppercase">
                              {mainQty}/3 BARAJA
                            </span>
                          ) : sideQty > 0 ? (
                            <span className="px-1.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black uppercase">
                              {sideQty}/3 BANQUILLO
                            </span>
                          ) : isLegend ? (
                            <span className="px-1.5 py-0.5 bg-[#00F0FF] text-[#070a10] font-black uppercase">
                              LEYENDA
                            </span>
                          ) : isFeatured ? (
                            <span className="px-1.5 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black uppercase">
                              ★ DESTACADA
                            </span>
                          ) : (
                            <span className="text-gray-500 truncate max-w-[80px]">
                              {ghCard.aspect ? `[${ghCard.aspect.toUpperCase()}]` : (ghCard.faction || ghCard.cardType || '')}
                            </span>
                          )}
                        </div>

                        {/* Imagen Grande de la Carta */}
                        <div className="relative h-52 w-full overflow-hidden bg-black/60 p-1.5 flex items-center justify-center border border-gray-900 group-hover:border-gray-700 transition-colors">
                          <img
                            src={ghCard.image}
                            alt={ghCard.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]"
                          />

                          {/* Overlay al pasar ratón */}
                          <div className="absolute inset-0 bg-[#070a10]/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                            <span className="text-[10px] font-mono font-black uppercase px-2 py-1 bg-[#FCEE0A] text-[#070a10] shadow-[0_0_10px_rgba(252,238,10,0.8)]">
                              {actionLabel}
                            </span>
                          </div>
                        </div>

                        {/* Información y botón inferior */}
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs font-black text-white group-hover:text-[#FCEE0A] transition-colors leading-tight line-clamp-1">
                            {ghCard.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span className="truncate max-w-[110px]">{ghCard.type || ghCard.faction || 'OFICIAL'}</span>
                            {ghCard.cost && <span className="text-[#FCEE0A] font-bold">{ghCard.cost}</span>}
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              disabled={disableAdd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddCardToDeck(ghCard);
                              }}
                              className={`w-full py-1.5 text-[10px] font-mono font-black uppercase transition-all flex items-center justify-center gap-1 ${
                                disableAdd
                                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                  : deckPickerTarget === 'main'
                                  ? 'bg-[#FF003C] hover:bg-[#FF003C]/80 text-white cursor-pointer shadow-[0_0_10px_rgba(255,0,60,0.4)]'
                                  : deckPickerTarget === 'sideboard'
                                  ? 'bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#070a10] cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                  : deckPickerTarget === 'legends'
                                  ? 'bg-[#FCEE0A] hover:bg-[#FCEE0A]/80 text-[#070a10] cursor-pointer shadow-[0_0_10px_rgba(252,238,10,0.4)]'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{actionLabel}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            TAB 4: GESTIÓN DE TORNEOS
           =============================================================== */}
        {activeTab === 'tournaments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSaveTournament}
              style={{ clipPath: CYBER_CLIP }}
              className="lg:col-span-5 bg-[#000000] border border-gray-800 p-6 space-y-4 rounded-none"
            >
              <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono border-b border-gray-800 pb-3">
                {editingTourId ? `EDITANDO TORNEO // ${editingTourId}` : 'CREAR NUEVO TORNEO'}
              </h2>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-gray-400 mb-1">NOMBRE DEL TORNEO *</label>
                  <input
                    type="text"
                    required
                    value={tourForm.name}
                    onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                    placeholder="Ej: Open Nacional Cyberpunk TCG..."
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">FECHA Y HORA *</label>
                    <input
                      type="text"
                      required
                      value={tourForm.date}
                      onChange={(e) => setTourForm({ ...tourForm, date: e.target.value })}
                      placeholder="Ej: 30 NOV • 18:00 CET"
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">ESTADO</label>
                    <select
                      value={tourForm.status}
                      onChange={(e) => setTourForm({ ...tourForm, status: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    >
                      <option value="INSCRIPCIONES ABIERTAS">INSCRIPCIONES ABIERTAS</option>
                      <option value="ÚLTIMAS PLAZAS">ÚLTIMAS PLAZAS</option>
                      <option value="EN CURSO // LIVE">EN CURSO // LIVE</option>
                      <option value="FINALIZADO">FINALIZADO</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">UBICACIÓN / PLATAFORMA</label>
                    <input
                      type="text"
                      value={tourForm.location}
                      onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">INSCRITOS</label>
                    <input
                      type="text"
                      value={tourForm.players}
                      onChange={(e) => setTourForm({ ...tourForm, players: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">FORMATO</label>
                    <input
                      type="text"
                      value={tourForm.format}
                      onChange={(e) => setTourForm({ ...tourForm, format: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">PREMIOS (PRIZE POOL)</label>
                    <input
                      type="text"
                      value={tourForm.prizePool}
                      onChange={(e) => setTourForm({ ...tourForm, prizePool: e.target.value })}
                      placeholder="Ej: 300€ + Promos"
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <ImageUploadField
                  label="CARTEL / IMAGEN DEL TORNEO (SUBIR ARCHIVO O WALLPAPER)"
                  value={tourForm.image}
                  onChange={(url) => setTourForm({ ...tourForm, image: url })}
                  uploadedFiles={uploadedFiles}
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                />
              </div>

              <button
                type="submit"
                style={{ clipPath: CYBER_CLIP }}
                className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingTourId ? 'ACTUALIZAR TORNEO' : 'PUBLICAR TORNEO'}</span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                TORNEOS ACTIVOS ({cms.tournaments?.length || 0})
              </h3>
              <div className="space-y-3">
                {cms.tournaments?.map((tour) => (
                  <div
                    key={tour.id}
                    style={{ clipPath: CYBER_CLIP }}
                    className="bg-[#000000] border border-gray-800 p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-[#FF003C] text-white font-black">
                          {tour.status}
                        </span>
                        <span className="text-[#FCEE0A]">{tour.date}</span>
                        <span className="text-gray-400">• {tour.location}</span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase mt-1">
                        {tour.name}
                      </h4>
                      <p className="text-xs font-mono text-[#00F0FF]">
                        Premios: {tour.prizePool} | {tour.players}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTourId(tour.id);
                          setTourForm({ ...tour });
                        }}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('tournaments', tour.id, 'Torneo')}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-[#FF003C] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            TAB 5: SINCRONIZACIÓN DE BASE DE CARTAS CON GITHUB
           =============================================================== */}
        {activeTab === 'cards' && (
          <div
            style={{ clipPath: CYBER_CLIP }}
            className="bg-[#000000] border border-gray-800 p-6 sm:p-8 space-y-6 rounded-none"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div>
                <h2 className="text-xl font-black uppercase text-white">
                  CONEXIÓN GITHUB // <span className="text-[#FCEE0A]">CYBERPUNK-TCG-CARTAS</span>
                </h2>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Repositorio origen: https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas (
                  {cards.length} cartas indexadas)
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncGithubCards}
                disabled={isSyncing}
                style={{ clipPath: CYBER_CLIP }}
                className="px-6 py-3.5 bg-[#00F0FF] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR CON GITHUB AHORA'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  style={{ clipPath: CYBER_CLIP }}
                  className="bg-[#070a10] border border-gray-800 p-2 space-y-1.5"
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                    className="w-full h-36 object-cover object-top"
                  />
                  <div className="text-[10px] font-mono">
                    <span className="text-[#FCEE0A] font-bold block">{card.id}</span>
                    <p className="text-white font-bold truncate">{card.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===============================================================
            TAB 6: TOP 3 CARTAS MÁS VENDIDAS (CARDMARKET BEST SELLERS - SINGLES)
           =============================================================== */}
        {activeTab === 'altArt' && (
          <form onSubmit={handleSaveAltArt} className="space-y-8">
            <div
              style={{ clipPath: CYBER_CLIP }}
              className="bg-[#000000] border border-gray-800 p-6 sm:p-8 space-y-6 rounded-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-widest block">
                    MERCADO SECUNDARIO EUROPEO // CARDMARKET BEST SELLERS (SOLO SINGLES)
                  </span>
                  <h2 className="text-xl font-black uppercase text-white">
                    GESTIÓN DEL <span className="text-[#FCEE0A]">TOP 3 CARTAS MÁS VENDIDAS</span>
                  </h2>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    Pega directamente la URL de GitHub de cualquier carta (o selecciónala abajo) y se rellenarán solos: Nombre, Tipo (Merc, Corpo, Rocker...), Edición, Artista, Colección e ID.
                  </p>
                </div>

                <button
                  type="submit"
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-6 py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest hover:bg-[#00F0FF] flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>PUBLICAR TOP 3 EN PORTADA</span>
                </button>
              </div>

              {/* Los 3 Slots de Cartas Más Vendidas (Cardmarket Singles) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {altArtForm.map((slotItem, idx) => {
                  const isSelected = activeAltSlot === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveAltSlot(idx)}
                      style={{ clipPath: CYBER_CLIP }}
                      className={`p-5 border transition-all cursor-pointer space-y-4 ${
                        isSelected
                          ? 'bg-[#070a10] border-2 border-[#FCEE0A] shadow-[0_0_25px_rgba(252,238,10,0.2)]'
                          : 'bg-[#070a10]/60 border-gray-800 hover:border-[#00F0FF]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                        <span className="text-xs font-mono font-black uppercase text-[#FCEE0A]">
                          BEST SELLER #0{idx + 1} // CARDMARKET
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                            isSelected
                              ? 'bg-[#FCEE0A] text-[#070a10]'
                              : 'bg-gray-900 text-gray-400'
                          }`}
                        >
                          {isSelected ? 'ACTIVO PARA ELEGIR' : 'PULSA PARA EDITAR'}
                        </span>
                      </div>

                      {/* Campo Autocompletar por URL de GitHub */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#000000] border border-[#00F0FF]/60 p-3 space-y-2"
                      >
                        <label className="block text-[10px] font-mono font-black text-[#00F0FF] uppercase">
                          ⚡ PEGAR URL DE GITHUB DE LA CARTA (AUTORRELLENO AUTOMÁTICO)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={githubUrlInputs[idx] || ''}
                            onChange={(e) => handleAutofillFromGithubUrl(idx, e.target.value, false)}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              if (pasted) {
                                e.preventDefault();
                                handleAutofillFromGithubUrl(idx, pasted, true);
                              }
                            }}
                            placeholder="https://github.com/.../carta.webp"
                            className="w-full bg-[#070a10] border border-gray-800 focus:border-[#FCEE0A] px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleAutofillFromGithubUrl(
                                idx,
                                githubUrlInputs[idx] || slotItem.image,
                                true
                              )
                            }
                            className="px-2.5 py-1.5 bg-[#00F0FF] text-[#070a10] hover:bg-[#FCEE0A] font-mono font-black text-[10px] uppercase shrink-0 cursor-pointer"
                          >
                            AUTO
                          </button>
                        </div>
                        <p className="text-[9px] font-mono text-gray-400">
                          Acepta enlaces de GitHub (blob o raw) o el nombre del archivo .webp
                        </p>
                      </div>

                      <div className="h-56 bg-[#000000] border border-gray-800 flex items-center justify-center p-2">
                        <img
                          src={slotItem.image}
                          alt={slotItem.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              ID DE LA CARTA
                            </label>
                            <input
                              type="text"
                              value={slotItem.cardId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, cardId: val } : it))
                                );
                              }}
                              placeholder="Ej: #138"
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-[#FCEE0A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              TIPO (MERC, CORPO, ROCKER...)
                            </label>
                            <input
                              type="text"
                              value={slotItem.cardType || slotItem.faction || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, cardType: val } : it))
                                );
                              }}
                              placeholder="Ej: PROGRAM // BRAINDANCE"
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-[#00F0FF]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                            NOMBRE DE LA CARTA
                          </label>
                          <input
                            type="text"
                            value={slotItem.name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAltArtForm((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, name: val } : it))
                              );
                            }}
                            className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-bold text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              EDICIÓN
                            </label>
                            <input
                              type="text"
                              value={slotItem.edition || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, edition: val } : it))
                                );
                              }}
                              placeholder="Ej: Epic Rare"
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              ARTISTA
                            </label>
                            <input
                              type="text"
                              value={slotItem.artist || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, artist: val } : it))
                                );
                              }}
                              placeholder="Ej: Dardo Studios"
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-gray-200"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              COLECCIÓN (SET)
                            </label>
                            <input
                              type="text"
                              value={slotItem.collection || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, collection: val } : it))
                                );
                              }}
                              placeholder="Welcome to Night City (Set 01)"
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-[#FCEE0A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              ETIQUETA RANKING
                            </label>
                            <input
                              type="text"
                              value={slotItem.badge || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, badge: val } : it))
                                );
                              }}
                              placeholder={`TOP #0${idx + 1} BEST SELLER`}
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <ImageUploadField
                            label="SUBIR IMAGEN O URL DE LA CARTA"
                            value={slotItem.image || ''}
                            onChange={(val) => {
                              if (
                                val.includes('github.com') ||
                                val.includes('githubusercontent.com') ||
                                val.endsWith('.webp')
                              ) {
                                handleAutofillFromGithubUrl(idx, val, true);
                              } else {
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, image: val } : it))
                                );
                              }
                            }}
                            uploadedFiles={uploadedFiles}
                            onUploadSuccess={setUploadedFiles}
                            showToast={showToast}
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selector Visual Rápido desde el Repositorio GitHub */}
              <div className="border-t border-gray-800 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                      CATÁLOGO DE CARTAS EN GITHUB PARA EL SLOT #0{activeAltSlot + 1}
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      También puedes hacer clic sobre cualquier carta de abajo para rellenar automáticamente todos sus datos en el Slot #0
                      {activeAltSlot + 1}.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-[#00F0FF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cardSearchAlt}
                      onChange={(e) => setCardSearchAlt(e.target.value)}
                      placeholder="Buscar por nombre, tipo o artista..."
                      className="w-full bg-[#070a10] border border-gray-800 pl-9 pr-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-2 bg-[#070a10] border border-gray-800">
                  {filteredAltPickerCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCardForAltSlot(c)}
                      className="bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] p-2 text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        className="w-full h-28 object-cover object-top mb-1.5"
                      />
                      <span className="text-[9px] font-mono text-[#FCEE0A] block">
                        {c.cardId || c.id}
                      </span>
                      <p className="text-[10px] font-bold text-white truncate group-hover:text-[#00F0FF]">
                        {c.name}
                      </p>
                      <span className="text-[9px] font-mono text-gray-400 truncate block">
                        {c.cardType || c.faction}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ===============================================================
            TAB 7: HISTÓRICO DE TORNEOS (RESULTADOS Y MAZOS GANADORES)
           =============================================================== */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSaveHistTournament}
              style={{ clipPath: CYBER_CLIP }}
              className="lg:col-span-5 bg-[#000000] border border-gray-800 p-6 space-y-4 rounded-none"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono">
                  {editingHistId
                    ? `EDITANDO HISTÓRICO // ${editingHistId}`
                    : 'AÑADIR TORNEO FINALIZADO AL HISTÓRICO'}
                </h2>
                {editingHistId && (
                  <button
                    type="button"
                    onClick={() => setEditingHistId(null)}
                    className="text-xs font-mono text-[#FF003C] underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                  Nombre del Torneo Finalizado *
                </label>
                <input
                  type="text"
                  required
                  value={histForm.name}
                  onChange={(e) => setHistForm({ ...histForm, name: e.target.value })}
                  placeholder="Ej: Night City Open #02 - Madrid"
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Fecha
                  </label>
                  <input
                    type="text"
                    value={histForm.date}
                    onChange={(e) => setHistForm({ ...histForm, date: e.target.value })}
                    placeholder="14 ENE 2026"
                    className="w-full bg-[#070a10] border border-gray-800 px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Sede / Ubicación
                  </label>
                  <input
                    type="text"
                    value={histForm.location}
                    onChange={(e) => setHistForm({ ...histForm, location: e.target.value })}
                    className="w-full bg-[#070a10] border border-gray-800 px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Participantes
                  </label>
                  <input
                    type="text"
                    value={histForm.playersCount}
                    onChange={(e) => setHistForm({ ...histForm, playersCount: e.target.value })}
                    placeholder="64 Edgerunners"
                    className="w-full bg-[#070a10] border border-gray-800 px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#FCEE0A] uppercase mb-1">
                    Campeón (1º Puesto) *
                  </label>
                  <input
                    type="text"
                    required
                    value={histForm.winner}
                    onChange={(e) => setHistForm({ ...histForm, winner: e.target.value })}
                    placeholder="Nick del Ganador"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#00F0FF] uppercase mb-1">
                    Mazo Ganador *
                  </label>
                  <input
                    type="text"
                    required
                    value={histForm.winningDeck}
                    onChange={(e) => setHistForm({ ...histForm, winningDeck: e.target.value })}
                    placeholder="Ej: Blackwall Lockdown v4"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Facción Ganadora
                  </label>
                  <input
                    type="text"
                    value={histForm.faction}
                    onChange={(e) => setHistForm({ ...histForm, faction: e.target.value })}
                    placeholder="NETRUNNER / SOLO / ROCKERBOY"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Récord / Resultado
                  </label>
                  <input
                    type="text"
                    value={histForm.score}
                    onChange={(e) => setHistForm({ ...histForm, score: e.target.value })}
                    placeholder="7 - 0 (Invicto)"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Finalista (2º Puesto)
                  </label>
                  <input
                    type="text"
                    value={histForm.runnerUp}
                    onChange={(e) => setHistForm({ ...histForm, runnerUp: e.target.value })}
                    placeholder="Jugador (Mazo)"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Semifinalista (3º Puesto)
                  </label>
                  <input
                    type="text"
                    value={histForm.thirdPlace}
                    onChange={(e) => setHistForm({ ...histForm, thirdPlace: e.target.value })}
                    placeholder="Jugador (Mazo)"
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                  Crónica / Resumen del Torneo y Mazo Ganador
                </label>
                <textarea
                  rows={3}
                  value={histForm.summary}
                  onChange={(e) => setHistForm({ ...histForm, summary: e.target.value })}
                  placeholder="Resumen de la final, cartas clave del mazo ganador..."
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Carta Insignia del Mazo Ganador */}
              <div className="border-t border-gray-800 pt-3 space-y-3">
                <ImageUploadField
                  label="IMAGEN CARTA INSIGNIA / FOTO GANADOR"
                  value={histForm.featuredCardImg}
                  onChange={(url) => setHistForm({ ...histForm, featuredCardImg: url })}
                  uploadedFiles={uploadedFiles}
                  onUploadSuccess={setUploadedFiles}
                  showToast={showToast}
                  compact={true}
                />

                <label className="block text-xs font-mono text-[#00F0FF] uppercase">
                  O elegir carta insignia de GitHub:
                </label>
                <input
                  type="text"
                  value={cardSearchHist}
                  onChange={(e) => setCardSearchHist(e.target.value)}
                  placeholder="Buscar carta insignia en GitHub..."
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-1.5 text-xs font-mono text-white"
                />
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1.5 bg-[#070a10] border border-gray-800">
                  {filteredHistPickerCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setHistForm({ ...histForm, featuredCardImg: c.image })}
                      className={`p-1 border text-left cursor-pointer ${
                        histForm.featuredCardImg === c.image
                          ? 'border-[#FCEE0A] bg-[#FCEE0A]/10'
                          : 'border-gray-800 bg-[#000000]'
                      }`}
                    >
                      <img
                        src={c.image}
                        alt={c.name}
                        className="w-full h-16 object-cover object-top"
                      />
                      <p className="text-[9px] font-mono text-white truncate mt-1">{c.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{ clipPath: CYBER_CLIP }}
                className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {editingHistId
                    ? 'ACTUALIZAR HISTÓRICO DE TORNEO'
                    : 'GUARDAR RESULTADO EN HISTÓRICO'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                HISTÓRICO DE TORNEOS REGISTRADOS ({cms.pastTournaments?.length || 0})
              </h3>
              <div className="space-y-3">
                {(cms.pastTournaments || []).map((pt) => (
                  <div
                    key={pt.id}
                    style={{ clipPath: CYBER_CLIP }}
                    className="bg-[#000000] border border-gray-800 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {pt.featuredCardImg && (
                        <img
                          src={pt.featuredCardImg}
                          alt={pt.winningDeck}
                          className="w-14 h-20 object-contain bg-[#070a10] border border-gray-800 p-1 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                          <span className="px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                            CAMPEÓN: {pt.winner}
                          </span>
                          <span className="text-[#00F0FF] font-bold">{pt.winningDeck}</span>
                          <span className="text-gray-400">
                            • {pt.date} ({pt.location})
                          </span>
                        </div>
                        <h4 className="text-base font-black text-white uppercase mt-1 truncate">
                          {pt.name}
                        </h4>
                        <p className="text-xs font-mono text-gray-400 truncate">
                          Récord: {pt.score} | 2º: {pt.runnerUp} | 3º: {pt.thirdPlace}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHistId(pt.id);
                          setHistForm({ ...pt });
                        }}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete('pastTournaments', pt.id, 'Registro histórico')
                        }
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-[#FF003C] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            TAB 8: CONFIGURACIÓN DEL ENLACE AL FORO DISCOURSE
           =============================================================== */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveForumUrl}
            style={{ clipPath: CYBER_CLIP }}
            className="bg-[#000000] border border-gray-800 p-6 sm:p-8 max-w-2xl space-y-5 rounded-none"
          >
            <div className="border-b border-gray-800 pb-4">
              <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-widest block">
                ENLACE EXTERNO EN BARRA DE NAVEGACIÓN
              </span>
              <h2 className="text-xl font-black uppercase text-white">
                CONFIGURACIÓN DEL <span className="text-[#FCEE0A]">FORO DISCOURSE</span>
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-1">
                El botón &quot;FORO&quot; del menú superior abrirá directamente esta dirección en una pestaña nueva.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5">
                URL DEL FORO DISCOURSE
              </label>
              <input
                type="url"
                required
                value={forumUrlInput}
                onChange={(e) => setForumUrlInput(e.target.value)}
                placeholder="https://tu-foro-discourse.com"
                className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-4 py-3 text-sm font-mono text-white"
              />
            </div>

            <button
              type="submit"
              style={{ clipPath: CYBER_CLIP }}
              className="px-6 py-3.5 bg-[#FCEE0A] text-[#070a10] hover:bg-[#00F0FF] font-mono font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>GUARDAR URL DEL FORO</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
