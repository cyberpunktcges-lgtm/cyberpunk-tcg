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
  KeyRound
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

export default function AdminPanel({ initialAuth = false, initialCms = {}, initialCards = [] }) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Estado 3 Cartas de Arte Alternativo (Inicio)
  const [altArtForm, setAltArtForm] = useState(
    initialCms?.altArtCards?.length === 3
      ? initialCms.altArtCards
      : [
          {
            slot: 1,
            cardId: 'CP-018',
            name: 'ALT CUNNINGHAM',
            faction: 'NETRUNNER',
            badge: 'ARTE ALTERNATIVO // EDICIÓN COLECCIONISTA',
            artist: 'ARCHIVO OFICIAL NIGHT CITY',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/alt-cunningham.png'
          },
          {
            slot: 2,
            cardId: 'CP-003',
            name: 'ADAM SMASHER',
            faction: 'SOLO',
            badge: 'ARTE ALTERNATIVO // FULL ART FOIL',
            artist: 'ARASAKA SECURITY ARCHIVE',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/adam-smasher.png'
          },
          {
            slot: 3,
            cardId: 'CP-070',
            name: 'JOHNNY SILVERHAND',
            faction: 'ROCKERBOY',
            badge: 'ARTE ALTERNATIVO // LEYENDA DE AFTERLIFE',
            artist: 'SAMURAI TOUR 2023',
            image:
              'https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/johnny-silverhand.png'
          }
        ]
  );
  const [activeAltSlot, setActiveAltSlot] = useState(0);
  const [cardSearchAlt, setCardSearchAlt] = useState('');

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
    faction: 'NETRUNNER',
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

  // Guardar las 3 Cartas de Arte Alternativo de Inicio
  const handleSaveAltArt = async (e) => {
    e.preventDefault();
    const ok = await apiCall({ action: 'update_alt_art', altArtCards: altArtForm });
    if (ok) {
      showToast('Las 3 Cartas de Arte Alternativo de Inicio han sido actualizadas');
    }
  };

  const handleSelectCardForAltSlot = (ghCard) => {
    setAltArtForm((prev) =>
      prev.map((item, idx) =>
        idx === activeAltSlot
          ? {
              ...item,
              cardId: ghCard.id,
              name: ghCard.name,
              faction: ghCard.faction,
              image: ghCard.image
            }
          : item
      )
    );
    showToast(`Carta "${ghCard.name}" asignada al Slot #${activeAltSlot + 1}`);
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
        faction: 'NETRUNNER',
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
        setAltArtForm(cmsJson.altArtCards);
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

  const filteredDeckPickerCards = cards
    .filter(
      (c) =>
        c.name.toLowerCase().includes(cardSearchDeck.toLowerCase()) ||
        c.slug.toLowerCase().includes(cardSearchDeck.toLowerCase())
    )
    .slice(0, 12);

  const filteredAltPickerCards = cards
    .filter(
      (c) =>
        c.name.toLowerCase().includes(cardSearchAlt.toLowerCase()) ||
        c.slug.toLowerCase().includes(cardSearchAlt.toLowerCase())
    )
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
            { id: 'altArt', label: 'ARTE ALTERNATIVO (3)', icon: Sparkles },
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

        {/* ===============================================================
            TAB 6: 3 CARTAS DE ARTE ALTERNATIVO EN PORTADA (INICIO)
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
                    VITRINA DE COLECCIONISTA // PORTADA INICIO
                  </span>
                  <h2 className="text-xl font-black uppercase text-white">
                    GESTIÓN DE LAS <span className="text-[#FCEE0A]">3 CARTAS DE ARTE ALTERNATIVO</span>
                  </h2>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    Selecciona cada uno de los 3 slots y haz clic en cualquier carta del catálogo GitHub inferior o introduce una URL de imagen personalizada.
                  </p>
                </div>

                <button
                  type="submit"
                  style={{ clipPath: CYBER_CLIP }}
                  className="px-6 py-3.5 bg-[#FCEE0A] text-[#070a10] font-mono font-black text-xs uppercase tracking-widest hover:bg-[#00F0FF] flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>PUBLICAR LAS 3 CARTAS EN PORTADA</span>
                </button>
              </div>

              {/* Los 3 Slots de Arte Alternativo */}
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
                          SLOT ARTE ALTERNATIVO #0{idx + 1}
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

                      <div className="h-56 bg-[#000000] border border-gray-800 flex items-center justify-center p-2">
                        <img
                          src={slotItem.image}
                          alt={slotItem.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              ID CARTA
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
                              className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-[#FCEE0A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                              FACCIÓN
                            </label>
                            <input
                              type="text"
                              value={slotItem.faction || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAltArtForm((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, faction: val } : it))
                                );
                              }}
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

                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                            ETIQUETA DE EDICIÓN ESPECIAL
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
                            className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                            ARTISTA / COLECCIÓN
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
                            className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-xs font-mono text-gray-300"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                            URL DE LA IMAGEN (GITHUB O LOCAL)
                          </label>
                          <input
                            type="text"
                            value={slotItem.image || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAltArtForm((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, image: val } : it))
                              );
                            }}
                            className="w-full bg-[#000000] border border-gray-800 px-2.5 py-1.5 text-[11px] font-mono text-gray-400"
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
                      SELECTOR RÁPIDO DE CARTAS PARA EL SLOT #0{activeAltSlot + 1}
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      Haz clic sobre una carta para asignarla automáticamente al Slot #0
                      {activeAltSlot + 1} seleccionado arriba.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-[#00F0FF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cardSearchAlt}
                      onChange={(e) => setCardSearchAlt(e.target.value)}
                      placeholder="Buscar carta por nombre..."
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
                      <span className="text-[9px] font-mono text-[#FCEE0A] block">{c.id}</span>
                      <p className="text-[10px] font-bold text-white truncate group-hover:text-[#00F0FF]">
                        {c.name}
                      </p>
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
              <div className="border-t border-gray-800 pt-3 space-y-2">
                <label className="block text-xs font-mono text-[#00F0FF] uppercase">
                  Carta Insignia del Mazo Ganador
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
