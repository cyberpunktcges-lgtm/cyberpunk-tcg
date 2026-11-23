import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Save,
  X,
  ExternalLink,
  Check,
  Sparkles,
  MapPin,
  Flame,
  Award,
  Link as LinkIcon
} from 'lucide-react';
import { saveUserProfile, getUserProfile } from '../utils/firebase.js';
import { AVATARS } from '../data/avatars.js';
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('v-chica');
  const [meleeUsername, setMeleeUsername] = useState('');
  const [city, setCity] = useState('');
  const [favoriteFaction, setFavoriteFaction] = useState('Afterlife');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);

  // Cargar perfil al abrir modal
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    setLoading(true);
    setSaveSuccess(false);

    // Valores por defecto: NO copiar nombre y apellidos reales de Google como Nick público
    const googleName = String(currentUser.displayName || '').trim();
    const defaultNick =
      googleName && !googleName.includes(' ')
        ? googleName
        : `Netrunner_${String(currentUser.uid || '0000').slice(-4).toUpperCase()}`;
    setDisplayName(defaultNick);

    getUserProfile(currentUser.uid)
      .then((data) => {
        if (data) {
          if (data.firstName) setFirstName(data.firstName);
          if (data.lastName) setLastName(data.lastName);
          if (data.nickname || data.displayName) setDisplayName(data.nickname || data.displayName);
          if (data.avatarId) setSelectedAvatarId(data.avatarId);
          if (data.meleeUsername) setMeleeUsername(data.meleeUsername);
          if (data.city) setCity(data.city);
          if (data.favoriteFaction) setFavoriteFaction(data.favoriteFaction);
          if (data.bio) setBio(data.bio);
        }
      })
      .catch((err) => console.warn('Error al cargar perfil:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const currentAvatar =
    AVATARS.find((a) => a.id === selectedAvatarId) || AVATARS[0];

  // Helper para generar URL de Melee.gg
  const getMeleeUrl = (input) => {
    if (!input) return null;
    const clean = input.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    // Si introdujo solo el username o ID
    return `https://melee.gg/Profile/Index/${encodeURIComponent(clean)}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const safeNick =
        displayName.trim() ||
        `Netrunner_${String(currentUser.uid || '0000').slice(-4).toUpperCase()}`;
      const updated = await saveUserProfile(currentUser.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: safeNick,
        displayName: safeNick,
        avatarId: selectedAvatarId,
        avatarImage: currentAvatar.image,
        meleeUsername: meleeUsername.trim(),
        city: city.trim(),
        favoriteFaction,
        bio: bio.trim()
      });

      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      alert('Error guardando perfil: ' + err.message);
    } finally {
      setSaving(false);
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
        className="relative w-full max-w-2xl max-h-[92vh] bg-[#070a10] border-2 border-[#00F0FF] p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.35)] flex flex-col justify-between text-white overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#00F0FF]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#00F0FF]/20 border border-[#00F0FF] flex items-center justify-center text-[#00F0FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-white">
                // NETRUNNER ID // <span className="text-[#00F0FF]">PERFIL DE USUARIO</span>
              </h2>
              <span className="text-[10px] text-gray-400 block font-mono">
                CONFIGURA TUS DATOS PERSONALES, TU AVATAR Y VINCULA TU CUENTA DE MELEE.GG
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con scroll si pantalla pequeña */}
        <form onSubmit={handleSave} className="py-4 space-y-4 overflow-y-auto cyber-scrollbar flex-1 pr-1">
          
          {/* Ficha de Avatar Actual + Selector */}
          <div className="p-3 bg-[#000000] border border-[#00F0FF]/50 rounded space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-black border-2 border-[#00F0FF] shrink-0 overflow-hidden shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                <AvatarDisplay avatar={currentAvatar} fallbackType="player" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider truncate">
                    AVATAR: {currentAvatar.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                    className="px-2.5 py-1 bg-[#00F0FF]/20 hover:bg-[#00F0FF] text-[#00F0FF] hover:text-black border border-[#00F0FF]/60 text-[10px] font-bold uppercase transition-all cursor-pointer rounded"
                  >
                    {isChangingAvatar ? 'CERRAR GALERÍA' : 'CAMBIAR AVATAR'}
                  </button>
                </div>
                <span className="text-[10px] text-[#FCEE0A] block truncate font-mono mt-0.5">
                  {currentAvatar.title}
                </span>
                <span className="text-[9px] text-gray-400 italic block truncate mt-0.5">
                  "{currentAvatar.quote}"
                </span>
              </div>
            </div>

            {/* Galería desplegable de 29 avatares */}
            {isChangingAvatar && (
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">
                  Elige entre los 29 personajes oficiales de Night City y Edgerunners:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto cyber-scrollbar pr-1">
                  {AVATARS.map((av) => {
                    const isSelected = selectedAvatarId === av.id;
                    return (
                      <div
                        key={`profile-av-${av.id}`}
                        onClick={() => {
                          setSelectedAvatarId(av.id);
                          setIsChangingAvatar(false);
                        }}
                        className={`p-1.5 rounded border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'border-[#00F0FF] bg-[#00F0FF]/20 shadow-[0_0_8px_#00F0FF]'
                            : 'border-gray-800 bg-black hover:border-gray-600'
                        }`}
                      >
                        <div className="w-7 h-7 bg-black border border-gray-700 shrink-0 overflow-hidden">
                          <AvatarDisplay avatar={av} fallbackType="player" />
                        </div>
                        <span className="text-[9px] font-bold text-white truncate uppercase">
                          {av.name.split('//')[0].trim()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Datos Personales: Nombre, Apellidos, Alias */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">
                NOMBRE (PRIVADO)
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Solo visible para ti"
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">
                APELLIDOS (PRIVADO)
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Solo visible para ti"
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#FCEE0A] uppercase font-bold mb-1">
                NICK PÚBLICO (RANKING) *
              </label>
              <input
                type="text"
                maxLength={28}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Choombatta_99"
                className="w-full bg-[#000000] border border-[#FCEE0A]/70 focus:border-[#00F0FF] px-3 py-2 text-white text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* VINCULACIÓN CON MELEE.GG (OFICIAL PARA TORNEOS DE TCG) */}
          <div className="p-3 bg-[#070a10] border border-[#FCEE0A]/50 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#FCEE0A] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#FCEE0A]" />
                <span>VINCULAR CUENTA DE MELEE.GG (TORNEOS OFICIALES)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black text-[#FCEE0A] border border-[#FCEE0A]/40 text-[8px] font-bold">
                COMPETITIVO
              </span>
            </div>

            <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
              <strong>Melee.gg</strong> es la plataforma estándar internacional utilizada para emparejamientos, clasificaciones y gestión de torneos de Cyberpunk TCG. Introduce tu usuario o el enlace de tu perfil de Melee para conectarlo con tu cuenta.
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={meleeUsername}
                  onChange={(e) => setMeleeUsername(e.target.value)}
                  placeholder="Ej: tu_usuario o https://melee.gg/Profile/Index/12345"
                  className="w-full bg-[#000000] border border-gray-800 focus:border-[#FCEE0A] px-3 py-2 text-white text-xs outline-none"
                />
              </div>

              {meleeUsername.trim() && (
                <a
                  href={getMeleeUrl(meleeUsername)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-[#FCEE0A] text-black font-black text-xs uppercase flex items-center gap-1 hover:bg-white transition-colors shrink-0"
                  title="Abrir perfil de Melee.gg en nueva pestaña"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">VER EN MELEE</span>
                </a>
              )}
            </div>
          </div>

          {/* Ubicación y Facción Favorita */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#00F0FF]" />
                <span>CIUDAD / DISTRITO</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Heywood, Madrid, Watson..."
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#00F0FF]" />
                <span>FACCIÓN FAVORITA</span>
              </label>
              <select
                value={favoriteFaction}
                onChange={(e) => setFavoriteFaction(e.target.value)}
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-xs outline-none cursor-pointer"
              >
                <option value="Afterlife">Afterlife / Mercenarios</option>
                <option value="Arasaka">Arasaka</option>
                <option value="Aldecaldos">Aldecaldos</option>
                <option value="Maelstrom">Maelstrom</option>
                <option value="Mox">The Mox</option>
                <option value="Valentinos">Valentinos</option>
                <option value="Edgerunners">Edgerunners</option>
                <option value="Tyger Claws">Tyger Claws</option>
                <option value="Voodoo Boys">Voodoo Boys</option>
                <option value="NCPD">NCPD</option>
              </select>
            </div>
          </div>

          {/* Lema / Biografía */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">
              LEMA / BIO PERSONAL DE NETRUNNER
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Escribe tu frase célebre o descripción para tu perfil..."
              className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-white text-xs outline-none resize-none"
            />
          </div>

          {/* Banner de Éxito */}
          {saveSuccess && (
            <div className="p-2.5 bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] text-center text-xs font-black uppercase flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>¡Perfil de Netrunner actualizado con éxito en la nube!</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#00F0FF]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
            >
              CANCELAR
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{ clipPath: CYBER_BUTTON }}
              className="px-6 py-2.5 bg-[#00F0FF] hover:bg-[#FCEE0A] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
