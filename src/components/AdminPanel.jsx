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
  Sparkles
} from 'lucide-react';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))';

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

export default function AdminPanel({ initialCms, initialCards }) {
  const [cms, setCms] = useState(initialCms);
  const [cards, setCards] = useState(initialCards || []);
  const [activeTab, setActiveTab] = useState('news');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Estado formulario Noticias
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    category: 'NOTICIA OFICIAL',
    faction: 'NETRUNNER',
    excerpt: '',
    author: 'Admin_ES',
    date: 'HOY',
    readTime: '5 MIN',
    views: '1.0K',
    image: '/images/wallpapers/Japantown.png'
  });

  // Estado formulario Hero
  const [heroForm, setHeroForm] = useState(initialCms.heroArticle);

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
  const [deckForm, setDeckForm] = useState({
    rank: '#01',
    name: '',
    archetype: 'NETRUNNER // CONTROL',
    tier: 'TIER S',
    winrate: '60.0%',
    pilot: 'CyberPlayer',
    bannerWallpaper: '/images/wallpapers/Night_City_3840x2160.png',
    description: '',
    cards: []
  });

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
        faction: 'NETRUNNER',
        excerpt: '',
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
    const ok = await apiCall({ action: 'update_hero', heroArticle: heroForm });
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

  // Guardar Mazo
  const handleSaveDeck = async (e) => {
    e.preventDefault();
    if (!deckForm.name.trim()) return;
    const action = editingDeckId ? 'update' : 'create';
    const item = editingDeckId ? { ...deckForm, id: editingDeckId } : deckForm;
    const ok = await apiCall({ action, section: 'decks', item });
    if (ok) {
      showToast(editingDeckId ? 'Mazo actualizado en el Meta' : 'Nuevo mazo añadido al Meta');
      setEditingDeckId(null);
      setDeckForm({
        rank: `#0${(cms.decks?.length || 0) + 1}`,
        name: '',
        archetype: 'NETRUNNER // CONTROL',
        tier: 'TIER S',
        winrate: '60.0%',
        pilot: 'CyberPlayer',
        bannerWallpaper: '/images/wallpapers/Night_City_3840x2160.png',
        description: '',
        cards: []
      });
    }
  };

  const handleAddCardToDeck = (ghCard) => {
    if (deckForm.cards.length >= 6) {
      showToast('Máximo 6 cartas destacadas por mazo en portada');
      return;
    }
    const newCardObj = {
      id: ghCard.id,
      name: ghCard.name,
      type: `${ghCard.faction} // CARTA OFICIAL`,
      cost: '4 EDDIES',
      power: '6 FUERZA',
      rarity: 'ÉPICA',
      image: ghCard.image,
      ability: `Carta oficial del archivo Cyberpunk TCG (${ghCard.fileName}).`
    };
    setDeckForm({ ...deckForm, cards: [...deckForm.cards, newCardObj] });
  };

  const handleRemoveCardFromDeck = (idx) => {
    setDeckForm({
      ...deckForm,
      cards: deckForm.cards.filter((_, i) => i !== idx)
    });
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

  const filteredDeckPickerCards = cards
    .filter(
      (c) =>
        c.name.toLowerCase().includes(cardSearchDeck.toLowerCase()) ||
        c.slug.toLowerCase().includes(cardSearchDeck.toLowerCase())
    )
    .slice(0, 12);

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
            { id: 'decks', label: `MAZOS (${cms.decks?.length || 0})`, icon: Layers },
            { id: 'tournaments', label: `TORNEOS (${cms.tournaments?.length || 0})`, icon: Trophy },
            { id: 'cards', label: `CARTAS GITHUB (${cards.length})`, icon: Database }
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
                    <label className="block text-gray-400 mb-1">FACCIÓN</label>
                    <select
                      value={newsForm.faction}
                      onChange={(e) => setNewsForm({ ...newsForm, faction: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="NETRUNNER">NETRUNNER</option>
                      <option value="CORPO">CORPO</option>
                      <option value="BANDAS">BANDAS</option>
                      <option value="MERCENARIO">MERCENARIO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">EXTRACTO / RESUMEN *</label>
                  <textarea
                    rows="3"
                    required
                    value={newsForm.excerpt}
                    onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                    placeholder="Resumen de la noticia que se verá en la tarjeta..."
                    className="w-full bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                    <label className="block text-gray-400 mb-1">FECHA</label>
                    <input
                      type="text"
                      value={newsForm.date}
                      onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">LECTURA</label>
                    <input
                      type="text"
                      value={newsForm.readTime}
                      onChange={(e) => setNewsForm({ ...newsForm, readTime: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">IMAGEN (WALLPAPER LOCAL O URL)</label>
                  <select
                    value={newsForm.image}
                    onChange={(e) => setNewsForm({ ...newsForm, image: e.target.value })}
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white mb-2"
                  >
                    {LOCAL_WALLPAPERS.map((wp) => (
                      <option key={wp} value={wp}>
                        {wp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newsForm.image}
                    onChange={(e) => setNewsForm({ ...newsForm, image: e.target.value })}
                    placeholder="O pega cualquier URL de imagen..."
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                  />
                </div>
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
                          <span className="text-[#00F0FF]">{item.faction}</span>
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
                <label className="block text-gray-400 mb-1">FACCIÓN / ENFRENTAMIENTO</label>
                <input
                  type="text"
                  value={heroForm.faction}
                  onChange={(e) => setHeroForm({ ...heroForm, faction: e.target.value })}
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

              <div>
                <label className="block text-gray-400 mb-1">DESCRIPCIÓN / ENTRADILLA *</label>
                <textarea
                  rows="3"
                  required
                  value={heroForm.excerpt}
                  onChange={(e) => setHeroForm({ ...heroForm, excerpt: e.target.value })}
                  className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">WALLPAPER DE FONDO</label>
                  <select
                    value={heroForm.wallpaper}
                    onChange={(e) => setHeroForm({ ...heroForm, wallpaper: e.target.value })}
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                  >
                    {LOCAL_WALLPAPERS.map((wp) => (
                      <option key={wp} value={wp}>
                        {wp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">URL CARTA MVP DERECHA</label>
                  <input
                    type="text"
                    value={heroForm.featuredCardImg}
                    onChange={(e) => setHeroForm({ ...heroForm, featuredCardImg: e.target.value })}
                    className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                  />
                </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSaveDeck}
              style={{ clipPath: CYBER_CLIP }}
              className="lg:col-span-6 bg-[#000000] border border-gray-800 p-6 space-y-4 rounded-none"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="text-base font-black uppercase text-[#FCEE0A] font-mono">
                  {editingDeckId ? `EDITANDO MAZO // ${editingDeckId}` : 'CREAR NUEVO MAZO META'}
                </h2>
                {editingDeckId && (
                  <button
                    type="button"
                    onClick={() => setEditingDeckId(null)}
                    className="text-xs font-mono text-[#FF003C] underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">RANGO</label>
                    <input
                      type="text"
                      value={deckForm.rank}
                      onChange={(e) => setDeckForm({ ...deckForm, rank: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">TIER</label>
                    <select
                      value={deckForm.tier}
                      onChange={(e) => setDeckForm({ ...deckForm, tier: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    >
                      <option value="TIER S">TIER S</option>
                      <option value="TIER A">TIER A</option>
                      <option value="TIER B">TIER B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">WINRATE</label>
                    <input
                      type="text"
                      value={deckForm.winrate}
                      onChange={(e) => setDeckForm({ ...deckForm, winrate: e.target.value })}
                      className="w-full bg-[#070a10] border border-gray-800 px-3 py-2 text-white"
                    />
                  </div>
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

                {/* Buscador para añadir cartas reales del repositorio GitHub al Mazo */}
                <div className="border-t border-gray-800 pt-3 space-y-2">
                  <label className="block text-[#00F0FF] font-bold">
                    AÑADIR CARTAS DEL GITHUB ({deckForm.cards.length} seleccionadas)
                  </label>

                  {/* Cartas actualmente en el mazo */}
                  {deckForm.cards.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {deckForm.cards.map((c, idx) => (
                        <span
                          key={`${c.id}-${idx}`}
                          className="px-2.5 py-1 bg-[#070a10] border border-[#FCEE0A] text-white flex items-center gap-2"
                        >
                          <span>{c.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCardFromDeck(idx)}
                            className="text-[#FF003C] font-black cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-4 h-4 text-[#FCEE0A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cardSearchDeck}
                      onChange={(e) => setCardSearchDeck(e.target.value)}
                      placeholder="Buscar carta de tu GitHub para añadir al mazo..."
                      className="w-full pl-9 pr-3 py-2 bg-[#070a10] border border-gray-800 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-[#070a10] border border-gray-800">
                    {filteredDeckPickerCards.map((ghCard) => (
                      <button
                        key={ghCard.id}
                        type="button"
                        onClick={() => handleAddCardToDeck(ghCard)}
                        className="group text-left bg-[#000000] border border-gray-800 hover:border-[#FCEE0A] p-1.5 transition-all cursor-pointer"
                      >
                        <img
                          src={ghCard.image}
                          alt={ghCard.name}
                          className="w-full h-20 object-cover object-top"
                        />
                        <p className="text-[10px] text-white font-bold truncate mt-1">
                          {ghCard.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                style={{ clipPath: CYBER_CLIP }}
                className="w-full py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingDeckId ? 'ACTUALIZAR MAZO' : 'GUARDAR NUEVO MAZO'}</span>
              </button>
            </form>

            {/* Lista de Mazos */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-[#00F0FF]">
                MAZOS ACTIVOS EN PORTADA ({cms.decks?.length || 0})
              </h3>
              <div className="space-y-3">
                {cms.decks?.map((deck) => (
                  <div
                    key={deck.id}
                    style={{ clipPath: CYBER_CLIP }}
                    className="bg-[#000000] border border-gray-800 p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 bg-[#FCEE0A] text-[#070a10] font-black">
                          {deck.rank} // {deck.tier}
                        </span>
                        <span className="text-[#00F0FF]">{deck.winrate} WR</span>
                        <span className="text-gray-400">@{deck.pilot}</span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase mt-1">
                        {deck.name}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">
                        {deck.cards?.length || 0} cartas asociadas
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeckId(deck.id);
                          setDeckForm({ ...deck });
                        }}
                        className="p-2 bg-[#070a10] border border-gray-800 hover:border-[#00F0FF] text-[#00F0FF] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('decks', deck.id, 'Mazo')}
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
      </main>
    </div>
  );
}
