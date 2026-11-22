import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bug,
  X,
  Send,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { submitBetaBugReport } from '../utils/firebase.js';
import {
  buildSimulatorDiagnosticSnapshot,
  extractBoardCardsForPicker,
  formatBugReportForFix
} from '../utils/betaDiagnostics.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';
const CYBER_BUTTON =
  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

const CATEGORIES = [
  'Regla / Habilidad de carta',
  'IA del Bot',
  'Bloqueo / No responde',
  'Visual / Interfaz',
  'Otro'
];

export default function CyberBugReportModal({
  isOpen,
  onClose,
  gameState,
  currentUser,
  userProfile,
  playerDeckName = '',
  botDeckName = ''
}) {
  const defaultReporter =
    userProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    '';

  const [reporterName, setReporterName] = useState(defaultReporter);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedCard, setSelectedCard] = useState('');
  const [customCardText, setCustomCardText] = useState('');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text: string, code?: string }

  // Actualizar nombre sugerido al abrir el modal si el usuario se logueó
  useEffect(() => {
    if (isOpen) {
      if (!reporterName && defaultReporter) {
        setReporterName(defaultReporter);
      }
      setFeedback(null);
    }
  }, [isOpen, defaultReporter]);

  const boardCards = useMemo(() => extractBoardCardsForPicker(gameState), [gameState, isOpen]);

  const liveSnapshot = useMemo(() => {
    if (!isOpen) return null;
    return buildSimulatorDiagnosticSnapshot(gameState, { playerDeckName, botDeckName });
  }, [isOpen, gameState, playerDeckName, botDeckName]);

  if (!isOpen) return null;

  const resolvedCardName =
    selectedCard === '__OTHER__'
      ? customCardText.trim()
      : selectedCard || customCardText.trim();

  const buildPayload = () => ({
    category,
    cardName: resolvedCardName,
    description: description.trim(),
    expectedBehavior: expectedBehavior.trim(),
    reporterName: reporterName.trim() || 'Tester Beta',
    reporterEmail: currentUser?.email || '',
    userId: currentUser?.uid || null,
    includeDiagnostics,
    diagnostics: includeDiagnostics ? liveSnapshot : null
  });

  const handleCopyReport = async () => {
    const text = formatBugReportForFix(buildPayload());
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({
        type: 'error',
        text: 'Cuéntanos brevemente qué ha ocurrido antes de enviar el reporte.'
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      const saved = await submitBetaBugReport(buildPayload());
      setFeedback({
        type: 'success',
        code: saved.code,
        text: `¡Reporte ${saved.code} enviado correctamente! Gracias por ayudar a pulir la Beta.`
      });
      setDescription('');
      setExpectedBehavior('');
      setSelectedCard('');
      setCustomCardText('');
    } catch (err) {
      const isPerm =
        String(err?.code || '').includes('permission-denied') ||
        String(err?.message || '').toLowerCase().includes('permission');
      setFeedback({
        type: 'error',
        text: isPerm
          ? 'No se pudo guardar en la nube por permisos de Firestore. Pulsa «COPIAR REPORTE» abajo para enviárselo directamente al admin.'
          : `Error al enviar el reporte (${err?.message || 'sin conexión'}). Puedes pulsar «COPIAR REPORTE» para pasarlo por chat.`
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono select-text"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: CYBER_CLIP }}
        className="relative w-full max-w-2xl max-h-[92vh] bg-[#070a10] border-2 border-[#FF003C] p-4 sm:p-6 shadow-[0_0_50px_rgba(255,0,60,0.35)] flex flex-col text-white overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 border-b border-[#FF003C]/40 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded bg-[#FF003C]/20 border border-[#FF003C] flex items-center justify-center text-[#FF003C] shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base uppercase tracking-wider text-white truncate">
                  // REPORTAR FALLO // <span className="text-[#FF003C]">SIMULADOR BETA</span>
                </h2>
              </div>
              <span className="text-[10px] text-gray-400 block truncate">
                SE ADJUNTA EL ESTADO DE LA MESA Y EL LOG AUTOMÁTICAMENTE PARA FIXEARLO AL INSTANTE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar ventana de reporte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="py-3.5 space-y-3.5 overflow-y-auto cyber-scrollbar flex-1 pr-1">
          {/* Categoría del fallo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#FCEE0A] uppercase block">
              1. TIPO DE FALLO
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1.5 text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FF003C] text-white border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.4)]'
                        : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tester + Carta implicada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#00F0FF] uppercase block">
                TU ALIAS / NOMBRE (OPCIONAL)
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Ej: V_Madrid, Choom99..."
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#00F0FF] uppercase block">
                CARTA IMPLICADA (OPCIONAL)
              </label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="">-- Ninguna / Varias cartas --</option>
                {boardCards.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.label}
                  </option>
                ))}
                <option value="__OTHER__">✍️ Escribir otro nombre de carta...</option>
              </select>
            </div>
          </div>

          {selectedCard === '__OTHER__' && (
            <div className="space-y-1">
              <input
                type="text"
                value={customCardText}
                onChange={(e) => setCustomCardText(e.target.value)}
                placeholder="Escribe el nombre de la carta (ej: Gorilla Arms, Johnny Silverhand...)"
                className="w-full bg-[#000000] border border-[#FCEE0A]/60 focus:border-[#FCEE0A] px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          )}

          {/* ¿Qué pasó? */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#FCEE0A] uppercase block">
              2. ¿QUÉ HA PASADO? *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Jugué Gorilla Arms y al intentar robar un Gig del bot no me dejó elegir el dado..."
              className="w-full bg-[#000000] border border-gray-800 focus:border-[#FCEE0A] p-2.5 text-xs text-white leading-relaxed outline-none resize-y"
            />
          </div>

          {/* ¿Qué esperabas que pasara? */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase block">
              3. ¿QUÉ ESPERABAS QUE PASARA? (OPCIONAL)
            </label>
            <input
              type="text"
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              placeholder="Ej: Debería abrirse el selector de dados rivales para robar 1 Gig."
              className="w-full bg-[#000000] border border-gray-800 focus:border-[#00F0FF] px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          {/* Caja Negra Automática */}
          <div className="bg-[#000000] border border-[#00F0FF]/40 rounded p-3 space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="mt-0.5 accent-[#00F0FF] w-4 h-4 shrink-0 cursor-pointer"
              />
              <div className="text-[11px] leading-snug">
                <span className="text-[#00F0FF] font-black uppercase flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  ADJUNTAR CAJA NEGRA DE LA PARTIDA (RECOMENDADO)
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Incluye turno actual, cartas en mesa/mano/leyendas, los últimos{' '}
                  {liveSnapshot?.actionLog?.length || 0} registros del historial y posibles errores técnicos.
                </span>
              </div>
            </label>

            {includeDiagnostics && liveSnapshot && (
              <div className="flex flex-wrap items-center gap-1.5 pl-6 pt-1 text-[9px]">
                <span className="px-1.5 py-0.5 bg-[#070a10] border border-gray-800 text-[#FCEE0A]">
                  TURNO {liveSnapshot.turnNumber} ({liveSnapshot.activePlayer === 'player' ? 'TU TURNO' : 'BOT'})
                </span>
                <span className="px-1.5 py-0.5 bg-[#070a10] border border-gray-800 text-gray-300">
                  {liveSnapshot.player?.field?.length || 0} vs {liveSnapshot.bot?.field?.length || 0} UNIDADES
                </span>
                <span className="px-1.5 py-0.5 bg-[#070a10] border border-gray-800 text-[#00F0FF]">
                  {liveSnapshot.actionLog?.length || 0} LOGS
                </span>
                {(liveSnapshot.runtimeErrors?.length || 0) > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {liveSnapshot.runtimeErrors.length} ERROR(ES) JS
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mensaje de confirmación / error */}
          {feedback && (
            <div
              className={`p-3 rounded border text-xs font-bold flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]'
                  : 'bg-[#FF003C]/15 border-[#FF003C] text-[#FF003C]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Botonera final */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-2 bg-[#000000] border border-gray-700 hover:border-[#00F0FF] text-gray-300 hover:text-[#00F0FF] font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copia el reporte completo con logs para pegarlo en WhatsApp o Discord"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00F0FF]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡COPIADO PARA CHAT!' : 'COPIAR REPORTE'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-black border border-gray-700 hover:border-white text-gray-300 font-bold text-xs uppercase cursor-pointer"
              >
                {feedback?.type === 'success' ? 'VOLVER A LA PARTIDA' : 'CANCELAR'}
              </button>

              <button
                type="submit"
                disabled={isSending}
                style={{ clipPath: CYBER_BUTTON }}
                className="px-4 py-2 bg-[#FF003C] hover:bg-[#FCEE0A] text-white hover:text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-[0_0_15px_rgba(255,0,60,0.45)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'ENVIANDO...' : 'ENVIAR REPORTE BETA'}</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
