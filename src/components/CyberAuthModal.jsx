import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Mail,
  Shield,
  Zap,
  X,
  AlertTriangle,
  CheckCircle,
  LogIn,
  UserPlus,
  Sparkles
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle
} from '../utils/firebase.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

export default function CyberAuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onSuccess = null
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Por favor, introduce tu alias de Netrunner.');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        const user = await registerWithEmail(email, password, displayName);
        setSuccessMsg(`¡Bienvenido a Night City, ${displayName || user.email}! Tu cuenta está lista.`);
        if (onSuccess) onSuccess(user);
        setTimeout(() => onClose(), 1200);
      } else {
        const user = await loginWithEmail(email, password);
        setSuccessMsg(`¡Conexión establecida! Bienvenido de nuevo.`);
        if (onSuccess) onSuccess(user);
        setTimeout(() => onClose(), 1000);
      }
    } catch (err) {
      let msg = err.message || 'Error en la conexión con la red.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Credenciales no válidas. Comprueba tu correo y contraseña.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo electrónico ya está registrado. Inicia sesión en su lugar.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const user = await loginWithGoogle();
      setSuccessMsg(`¡Autenticado con Google! Bienvenido, ${user.displayName || user.email}.`);
      if (onSuccess) onSuccess(user);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Error al conectar con Google: ' + (err.message || 'Inténtalo de nuevo.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono select-none"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-md bg-[#070a10] border-2 border-[#0dfceb] p-5 sm:p-6 shadow-[0_0_35px_rgba(13,252,235,0.35)] flex flex-col gap-4 text-white overflow-hidden"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-[#0dfceb]/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#0dfceb]/20 border border-[#0dfceb] flex items-center justify-center text-[#0dfceb]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-white">
                // NETRUNNER <span className="text-[#FCEE0A]">ID</span> //
              </h3>
              <span className="text-[10px] text-gray-400 block font-mono">
                RED DE AUTENTICACIÓN NIGHT CITY
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1.5 rounded transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de modo: Iniciar Sesión / Registro */}
        <div className="grid grid-cols-2 gap-2 bg-[#000000] p-1 border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#0dfceb] text-black shadow-[0_0_12px_rgba(13,252,235,0.6)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>INICIAR SESIÓN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#FCEE0A] text-black shadow-[0_0_12px_rgba(252,238,10,0.6)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>CREAR CUENTA</span>
          </button>
        </div>

        {/* Botón rápido con Google */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          style={{ clipPath: CYBER_BUTTON }}
          className="w-full py-2.5 bg-[#ffffff] hover:bg-gray-100 text-[#070a10] font-black font-mono text-xs uppercase flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] disabled:opacity-50"
        >
          {/* Logo oficial de Google en SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>CONTINUAR CON GOOGLE</span>
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">O CON TU CORREO</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Mensajes de error y éxito */}
        {errorMsg && (
          <div className="p-2.5 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] text-xs font-mono rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-[#0dfceb]/20 border border-[#0dfceb] text-[#0dfceb] text-xs font-mono rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulario de Email y Contraseña */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="text-[10px] text-gray-400 font-mono uppercase block mb-1">
                ALIAS EN NIGHT CITY (NOMBRE DE USUARIO):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: DavidMartinez, V_Netrunner..."
                  className="w-full bg-[#000000] border border-gray-700 focus:border-[#FCEE0A] p-2 pl-8 text-xs font-mono text-white focus:outline-none"
                />
                <User className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] text-gray-400 font-mono uppercase block mb-1">
              CORREO ELECTRÓNICO:
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@nightcity.com"
                className="w-full bg-[#000000] border border-gray-700 focus:border-[#0dfceb] p-2 pl-8 text-xs font-mono text-white focus:outline-none"
              />
              <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-mono uppercase block mb-1">
              CONTRASEÑA:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#000000] border border-gray-700 focus:border-[#0dfceb] p-2 pl-8 text-xs font-mono text-white focus:outline-none"
              />
              <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ clipPath: CYBER_BUTTON }}
            className={`w-full py-2.5 font-mono font-black text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-2 mt-2 shadow-lg disabled:opacity-50 ${
              mode === 'register'
                ? 'bg-[#FCEE0A] hover:bg-[#0dfceb] text-black shadow-[0_0_15px_rgba(252,238,10,0.4)]'
                : 'bg-[#0dfceb] hover:bg-white text-black shadow-[0_0_15px_rgba(13,252,235,0.4)]'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">CONECTANDO A LA RED...</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>REGISTRAR CUENTA GRATIS</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>INICIAR SESIÓN</span>
              </>
            )}
          </button>
        </form>

        {/* Separador e información sobre Modo Invitado */}
        <div className="border-t border-gray-800/80 pt-3 flex flex-col gap-2">
          <div className="flex items-start gap-2 bg-[#000000]/70 border border-gray-800 p-2 text-[10px] text-gray-400 leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-[#FCEE0A] shrink-0 mt-0.5" />
            <span>
              <strong>¿Por qué registrarte?</strong> Podrás guardar todos tus mazos en la nube,
              editarlos y elegirlos en el simulador desde cualquier ordenador o teléfono.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-[11px] font-mono text-gray-400 hover:text-white hover:underline text-center cursor-pointer"
          >
            ➔ Continuar jugando como Invitado (sin guardar en la nube)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
