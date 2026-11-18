import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Layers,
  Swords,
  Edit3,
  LogOut,
  ExternalLink,
  ChevronDown,
  Award,
  Sparkles,
  Shield,
  MapPin
} from 'lucide-react';
import { logoutUser } from '../utils/firebase.js';
import { AVATARS } from '../data/avatars.js';
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberUserDropdown({
  currentUser,
  userProfile = null,
  userDecksCount = 0,
  onOpenAuthModal,
  onOpenMyDecks,
  onOpenProfile,
  themeColor = '#00F0FF' // '#00F0FF' o '#0dfceb' o '#FCEE0A'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!currentUser) {
    return (
      <button
        type="button"
        onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
        style={{ clipPath: CYBER_CLIP }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#000000] border border-[#FCEE0A]/60 hover:border-[#00F0FF] text-[#FCEE0A] hover:text-[#00F0FF] font-mono text-xs font-bold uppercase transition-all shadow-[0_0_10px_rgba(252,238,10,0.25)] cursor-pointer"
        title="Inicia sesión o regístrate gratis para sincronizar tus mazos en la nube"
      >
        <User className="w-3.5 h-3.5 text-[#FCEE0A]" />
        <span>ENTRAR</span>
      </button>
    );
  }

  // Avatar actual del usuario (desde perfil o fallback)
  const userAvatar =
    AVATARS.find((a) => a.id === userProfile?.avatarId) ||
    (userProfile?.avatarImage
      ? { image: userProfile.avatarImage, name: currentUser.displayName || 'V' }
      : AVATARS[0]);

  const displayName =
    userProfile?.displayName ||
    currentUser.displayName ||
    currentUser.email?.split('@')[0] ||
    'Netrunner';

  const handleLogout = async () => {
    setIsOpen(false);
    if (window.confirm(`¿Seguro que deseas cerrar la sesión de ${currentUser.email}?`)) {
      try {
        await logoutUser();
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
    }
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* Botón Trigger en la barra de navegación */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ clipPath: CYBER_CLIP }}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[#000000] border border-[#00F0FF]/60 hover:border-[#FCEE0A] text-[#00F0FF] hover:text-white text-xs font-bold uppercase transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] cursor-pointer"
        title="Menú de Netrunner // Opciones de tu cuenta"
      >
        {/* Foto de perfil miniatura */}
        <div className="w-5 h-5 bg-black border border-[#00F0FF] shrink-0 overflow-hidden">
          <AvatarDisplay avatar={userAvatar} fallbackType="player" />
        </div>

        <span className="truncate max-w-[95px] sm:max-w-[120px] font-bold text-white">
          {displayName}
        </span>

        {/* Contador de mazos */}
        <span className="px-1.5 py-0.2 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[9px] font-bold">
          {userDecksCount}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#00F0FF] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menú Desplegable Flotante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{ clipPath: CYBER_CLIP }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#070a10] border-2 border-[#00F0FF] shadow-[0_0_35px_rgba(0,240,255,0.4)] p-3 z-50 text-white space-y-2.5"
          >
            {/* Tarjeta de Identidad del Usuario */}
            <div className="p-2.5 bg-[#000000] border border-[#00F0FF]/40 rounded space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-black border-2 border-[#00F0FF] shrink-0 overflow-hidden shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  <AvatarDisplay avatar={userAvatar} fallbackType="player" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black text-white uppercase tracking-wider block truncate">
                    {displayName}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono block truncate">
                    {currentUser.email}
                  </span>
                  {userProfile?.city && (
                    <span className="text-[9px] text-[#FCEE0A] flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{userProfile.city}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Badge de Melee.gg si está vinculado */}
              {userProfile?.meleeUsername ? (
                <div className="pt-1.5 border-t border-gray-900 flex items-center justify-between text-[9px]">
                  <span className="text-gray-400 flex items-center gap-1 font-bold">
                    <Award className="w-3 h-3 text-[#FCEE0A]" />
                    <span>MELEE.GG:</span>
                  </span>
                  <a
                    href={
                      userProfile.meleeUsername.startsWith('http')
                        ? userProfile.meleeUsername
                        : `https://melee.gg/Profile/Index/${encodeURIComponent(userProfile.meleeUsername)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00F0FF] hover:text-[#FCEE0A] font-bold flex items-center gap-1 underline truncate max-w-[150px]"
                  >
                    <span>{userProfile.meleeUsername.replace('https://melee.gg/Profile/Index/', '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              ) : (
                <div className="pt-1 border-t border-gray-900 text-[9px] text-gray-500 italic">
                  Melee.gg no vinculado (vincúlalo en tu perfil)
                </div>
              )}
            </div>

            {/* Opciones del Menú */}
            <div className="space-y-1 text-xs">
              {/* 1. MIS MAZOS */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenMyDecks) onOpenMyDecks();
                }}
                className="w-full text-left p-2 rounded bg-black/60 hover:bg-[#FCEE0A] text-gray-200 hover:text-black border border-gray-800 hover:border-[#FCEE0A] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FCEE0A] group-hover:text-black" />
                  <div>
                    <span className="font-black uppercase block">MIS MAZOS</span>
                    <span className="text-[9px] text-gray-400 group-hover:text-gray-900 block font-sans">
                      Ver, editar y probar tus barajas
                    </span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#FCEE0A] text-black group-hover:bg-black group-hover:text-[#FCEE0A] text-[10px] font-black">
                  {userDecksCount}
                </span>
              </button>

              {/* 2. MI PERFIL NETRUNNER */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full text-left p-2 rounded bg-black/60 hover:bg-[#00F0FF] text-gray-200 hover:text-black border border-gray-800 hover:border-[#00F0FF] transition-all flex items-center gap-2 cursor-pointer group"
              >
                <User className="w-4 h-4 text-[#00F0FF] group-hover:text-black" />
                <div>
                  <span className="font-black uppercase block">MI PERFIL</span>
                  <span className="text-[9px] text-gray-400 group-hover:text-gray-900 block font-sans">
                    Nombre, avatar oficial y Melee.gg
                  </span>
                </div>
              </button>

              {/* 3. CONSTRUCTOR DE MAZOS */}
              <a
                href="/cartas"
                onClick={() => setIsOpen(false)}
                className="w-full text-left p-2 rounded bg-black/60 hover:bg-white text-gray-200 hover:text-black border border-gray-800 hover:border-white transition-all flex items-center gap-2 cursor-pointer group"
              >
                <Edit3 className="w-4 h-4 text-[#00F0FF] group-hover:text-black" />
                <div>
                  <span className="font-black uppercase block">DECKBUILDER</span>
                  <span className="text-[9px] text-gray-400 group-hover:text-gray-900 block font-sans">
                    Armar nuevo mazo desde la base de cartas
                  </span>
                </div>
              </a>

              {/* 4. SIMULADOR DE COMBATE */}
              <a
                href="/simulador"
                onClick={() => setIsOpen(false)}
                className="w-full text-left p-2 rounded bg-black/60 hover:bg-[#FF003C] text-gray-200 hover:text-white border border-gray-800 hover:border-[#FF003C] transition-all flex items-center gap-2 cursor-pointer group"
              >
                <Swords className="w-4 h-4 text-[#FF003C] group-hover:text-white" />
                <div>
                  <span className="font-black uppercase block">SIMULADOR DE COMBATE</span>
                  <span className="text-[9px] text-gray-400 group-hover:text-gray-200 block font-sans">
                    Duelos tácticos contra el bot
                  </span>
                </div>
              </a>
            </div>

            {/* Separador y Cerrar Sesión */}
            <div className="pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-1.5 px-2 bg-black hover:bg-[#FF003C] text-[#FF003C] hover:text-white border border-[#FF003C]/40 text-[11px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>CERRAR SESIÓN</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
