import React, { useState, useEffect } from 'react';
import {
  Bug,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import {
  getBetaBugReports,
  updateBetaBugReport,
  deleteBetaBugReport
} from '../utils/firebase.js';
import { formatBugReportForFix } from '../utils/betaDiagnostics.js';

const CYBER_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';

const STATUS_META = {
  open: {
    label: 'PENDIENTE',
    className: 'bg-[#FF003C]/20 text-[#FF003C] border-[#FF003C]'
  },
  in_progress: {
    label: 'EN REVISIÓN',
    className: 'bg-[#FCEE0A]/20 text-[#FCEE0A] border-[#FCEE0A]'
  },
  resolved: {
    label: 'RESUELTO',
    className: 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]'
  },
  wontfix: {
    label: 'DESCARTADO',
    className: 'bg-gray-800 text-gray-400 border-gray-600'
  }
};

function formatDate(report) {
  const ms = report?.createdAt?.toMillis ? report.createdAt.toMillis() : report?.createdAtMs;
  if (!ms) return 'Fecha desconocida';
  try {
    return new Date(ms).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export default function AdminBetaBugsTab({ onOpenCountChange, onNotify }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'open' | 'in_progress' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});

  const loadReports = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await getBetaBugReports();
      setReports(list);
      const openCount = list.filter((r) => (r.status || 'open') === 'open').length;
      if (onOpenCountChange) onOpenCountChange(openCount);
    } catch (err) {
      setLoadError(err?.message || 'Error cargando reportes de Firebase Firestore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleStatusChange = async (report, nextStatus) => {
    setUpdatingId(report.id);
    try {
      await updateBetaBugReport(report.id, { status: nextStatus });
      const updated = reports.map((r) => (r.id === report.id ? { ...r, status: nextStatus } : r));
      setReports(updated);
      if (onOpenCountChange) {
        onOpenCountChange(updated.filter((r) => (r.status || 'open') === 'open').length);
      }
      if (onNotify) onNotify(`Estado de ${report.code || report.id} actualizado a ${STATUS_META[nextStatus]?.label || nextStatus}`);
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (report) => {
    const text = notesDraft[report.id] ?? report.adminNotes ?? '';
    setUpdatingId(report.id);
    try {
      await updateBetaBugReport(report.id, { adminNotes: text });
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, adminNotes: text } : r)));
      if (onNotify) onNotify(`Nota interna guardada en ${report.code || report.id}`);
    } catch (err) {
      alert('Error guardando nota: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`¿Eliminar definitivamente el reporte ${report.code || report.id}?`)) return;
    setUpdatingId(report.id);
    try {
      await deleteBetaBugReport(report.id);
      const updated = reports.filter((r) => r.id !== report.id);
      setReports(updated);
      if (onOpenCountChange) {
        onOpenCountChange(updated.filter((r) => (r.status || 'open') === 'open').length);
      }
      if (onNotify) onNotify(`Reporte ${report.code || report.id} eliminado`);
    } catch (err) {
      alert('Error eliminando reporte: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyForFix = async (report) => {
    const formatted = formatBugReportForFix(report);
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formatted;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(report.id);
    if (onNotify) onNotify(`Diagnóstico de ${report.code || 'bug'} copiado — listo para pegar y fixear`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const counts = {
    ALL: reports.length,
    open: reports.filter((r) => (r.status || 'open') === 'open').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length
  };

  const filtered = reports.filter((r) => {
    const st = r.status || 'open';
    const matchStatus = statusFilter === 'ALL' || st === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchQ =
      !q ||
      (r.code || '').toLowerCase().includes(q) ||
      (r.cardName || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.reporterName || '').toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  return (
    <section className="space-y-6 font-mono">
      {/* Cabecera */}
      <div
        style={{ clipPath: CYBER_CLIP }}
        className="bg-[#000000] border border-[#FF003C]/60 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#FF003C]">
            <Bug className="w-5 h-5" />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              BANDEJA DE REPORTES BETA DEL SIMULADOR
            </h2>
          </div>
          <p className="text-xs text-gray-400">
            Cada reporte incluye la caja negra de la partida (mesa, leyendas, logs y errores JS). Pulsa{' '}
            <strong className="text-[#FCEE0A]">«COPIAR DIAGNÓSTICO PARA FIX»</strong> en cualquier bug para pegarlo y solucionarlo al instante.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          style={{ clipPath: CYBER_CLIP }}
          className="px-4 py-2.5 bg-[#00F0FF] hover:bg-[#FCEE0A] text-[#070a10] font-black text-xs uppercase flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'CARGANDO...' : 'ACTUALIZAR BANDEJA'}</span>
        </button>
      </div>

      {/* Aviso si faltan permisos en Firestore */}
      {loadError && (
        <div className="bg-[#FF003C]/10 border border-[#FF003C] p-4 rounded space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#FF003C] font-black uppercase">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Error al leer `beta_bug_reports` desde Firebase Firestore</span>
          </div>
          <p className="text-gray-300">{loadError}</p>
          <p className="text-[11px] text-gray-400">
            Asegúrate de tener esta regla habilitada en Firebase Console → Firestore Database → Reglas:
          </p>
          <pre className="bg-black border border-gray-800 p-2.5 text-[11px] text-[#00F0FF] overflow-x-auto">
{`match /beta_bug_reports/{reportId} {
  allow create: if true;
  allow read, update, delete: if true; // o request.auth != null
}`}
          </pre>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `TODOS (${counts.ALL})` },
            { id: 'open', label: `PENDIENTES (${counts.open})` },
            { id: 'in_progress', label: `EN REVISIÓN (${counts.in_progress})` },
            { id: 'resolved', label: `RESUELTOS (${counts.resolved})` }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-black uppercase border cursor-pointer transition-colors ${
                statusFilter === f.id
                  ? 'bg-[#FCEE0A] text-[#070a10] border-[#FCEE0A]'
                  : 'bg-[#000000] text-gray-300 border-gray-800 hover:border-[#00F0FF]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por carta, código BUG-, tester..."
            className="w-full bg-[#000000] border border-gray-800 focus:border-[#FCEE0A] pl-9 pr-3 py-2 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Lista de Reportes */}
      {loading ? (
        <div className="text-center py-14 text-xs text-gray-400">
          Cargando reportes de la Beta desde Firestore...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#000000] border border-dashed border-gray-800 p-10 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#00F0FF] mx-auto opacity-70" />
          <p className="text-sm font-black uppercase text-white">
            {reports.length === 0
              ? 'AÚN NO HAY REPORTES DE BUGS EN LA BETA'
              : 'NO HAY REPORTES QUE COINCIDAN CON EL FILTRO'}
          </p>
          <p className="text-xs text-gray-400">
            Cuando tus testers pulsen el botón «🐛 BUG» dentro del simulador, sus reportes aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => {
            const st = report.status || 'open';
            const meta = STATUS_META[st] || STATUS_META.open;
            const isExpanded = Boolean(expandedIds[report.id]);
            const d = report.diagnostics;
            const noteVal = notesDraft[report.id] ?? report.adminNotes ?? '';

            return (
              <article
                key={report.id}
                className="bg-[#000000] border border-gray-800 hover:border-[#FCEE0A]/50 p-4 sm:p-5 space-y-3.5 transition-colors"
              >
                {/* Fila superior: metadatos + acciones rápidas */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 border-b border-gray-900 pb-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#070a10] border border-gray-700 text-white font-black text-xs">
                        {report.code || report.id.slice(0, 10)}
                      </span>
                      <span className={`px-2 py-0.5 border text-[10px] font-black uppercase ${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className="px-2 py-0.5 bg-[#070a10] border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-bold uppercase">
                        {report.category || 'General'}
                      </span>
                      {report.cardName && (
                        <span className="px-2 py-0.5 bg-[#FCEE0A]/15 border border-[#FCEE0A]/50 text-[#FCEE0A] text-[10px] font-black">
                          🃏 {report.cardName}
                        </span>
                      )}
                      {d?.runtimeErrors?.length > 0 && (
                        <span className="px-2 py-0.5 bg-[#FF003C]/20 border border-[#FF003C] text-[#FF003C] text-[10px] font-black flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          {d.runtimeErrors.length} ERROR JS
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                      <span>
                        Tester: <strong className="text-white">{report.reporterName || 'Invitado'}</strong>
                        {report.reporterEmail && ` (${report.reporterEmail})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(report)}
                      </span>
                      {d && (
                        <span className="text-[#00F0FF]">
                          Turno {d.turnNumber} • {d.playerDeckName || '?'} vs {d.botDeckName || '?'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyForFix(report)}
                      style={{ clipPath: CYBER_CLIP }}
                      className="px-3 py-1.5 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-[11px] uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Copia todo el reporte y la caja negra formateados en Markdown para pegármelo y fixearlo rápido"
                    >
                      {copiedId === report.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === report.id ? '¡COPIADO!' : 'COPIAR DIAGNÓSTICO PARA FIX'}</span>
                    </button>

                    <select
                      value={st}
                      disabled={updatingId === report.id}
                      onChange={(e) => handleStatusChange(report, e.target.value)}
                      className="bg-[#070a10] border border-gray-700 text-white text-[11px] font-bold uppercase px-2.5 py-1.5 cursor-pointer outline-none focus:border-[#00F0FF]"
                    >
                      <option value="open">🔴 Pendiente</option>
                      <option value="in_progress">🟡 En revisión</option>
                      <option value="resolved">🟢 Resuelto</option>
                      <option value="wontfix">⚪ Descartado</option>
                    </select>

                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() => handleDelete(report)}
                      className="p-1.5 bg-[#070a10] border border-gray-800 hover:border-[#FF003C] text-gray-400 hover:text-[#FF003C] cursor-pointer"
                      title="Eliminar reporte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Descripción del tester */}
                <div className="space-y-1.5 text-xs">
                  <p className="text-white leading-relaxed whitespace-pre-wrap">{report.description}</p>
                  {report.expectedBehavior && (
                    <p className="text-gray-400 text-[11px]">
                      <strong className="text-[#00F0FF]">Esperado:</strong> {report.expectedBehavior}
                    </p>
                  )}
                </div>

                {/* Nota interna de seguimiento */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={noteVal}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    placeholder="Nota interna (ej: Corregido en commit abc123, pendiente re-test)..."
                    className="flex-1 bg-[#070a10] border border-gray-800 focus:border-[#00F0FF] px-3 py-1.5 text-[11px] text-gray-200 outline-none"
                  />
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => handleSaveNotes(report)}
                    className="px-3 py-1.5 bg-[#070a10] border border-gray-700 hover:border-[#FCEE0A] text-[#FCEE0A] font-bold text-[10px] uppercase cursor-pointer"
                  >
                    GUARDAR NOTA
                  </button>
                </div>

                {/* Desplegable de Caja Negra (Estado de mesa + ActionLog + Errores JS) */}
                {d && (
                  <div className="border-t border-gray-900 pt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({ ...prev, [report.id]: !prev[report.id] }))
                      }
                      className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#00F0FF] hover:text-[#FCEE0A] cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>
                        {isExpanded
                          ? 'OCULTAR CAJA NEGRA DE LA PARTIDA'
                          : `VER CAJA NEGRA (${d.actionLog?.length || 0} LOGS • MESA COMPLETA)`}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 bg-[#070a10] border border-gray-800 p-3 text-[11px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-black border border-gray-800 p-2.5 space-y-1">
                            <span className="text-[#00F0FF] font-black uppercase block">
                              JUGADOR ({d.playerDeckName || '?'})
                            </span>
                            <div className="text-gray-300">
                              Gigs ({d.player?.gigsCount ?? 0}): {(d.player?.gigs || []).join(', ') || 'ninguno'}
                            </div>
                            <div className="text-gray-300">
                              Eddies: {d.player?.eddiesReady ?? 0}/{d.player?.eddiesTotal ?? 0} (float:{' '}
                              {d.player?.floatingEddies ?? 0})
                            </div>
                            <div className="text-gray-400">
                              Leyendas:{' '}
                              {(d.player?.legends || [])
                                .map((l) => `#${l.slot} ${l.name} [${l.isFaceUp ? 'UP' : 'DOWN'}${l.isSpent ? ',SPENT' : ''}]`)
                                .join(' | ') || '—'}
                            </div>
                            <div className="text-gray-400">
                              Campo:{' '}
                              {(d.player?.field || [])
                                .map((u) => `${u.name} (⚡${u.power}${u.isSpent ? ',SPENT' : ''}${u.isLagging ? ',LAG' : ''})`)
                                .join(' | ') || 'vacío'}
                            </div>
                            <div className="text-gray-500">
                              Mano ({d.player?.handCount ?? 0}): {(d.player?.hand || []).join(', ') || 'vacía'}
                            </div>
                          </div>

                          <div className="bg-black border border-gray-800 p-2.5 space-y-1">
                            <span className="text-[#FF003C] font-black uppercase block">
                              BOT ({d.botDeckName || '?'})
                            </span>
                            <div className="text-gray-300">
                              Gigs ({d.bot?.gigsCount ?? 0}): {(d.bot?.gigs || []).join(', ') || 'ninguno'}
                            </div>
                            <div className="text-gray-300">
                              Eddies: {d.bot?.eddiesReady ?? 0}/{d.bot?.eddiesTotal ?? 0}
                            </div>
                            <div className="text-gray-400">
                              Leyendas:{' '}
                              {(d.bot?.legends || [])
                                .map((l) => `#${l.slot} ${l.name} [${l.isFaceUp ? 'UP' : 'DOWN'}${l.isSpent ? ',SPENT' : ''}]`)
                                .join(' | ') || '—'}
                            </div>
                            <div className="text-gray-400">
                              Campo:{' '}
                              {(d.bot?.field || [])
                                .map((u) => `${u.name} (⚡${u.power}${u.isSpent ? ',SPENT' : ''}${u.isLagging ? ',LAG' : ''})`)
                                .join(' | ') || 'vacío'}
                            </div>
                            <div className="text-gray-500">
                              Mano ({d.bot?.handCount ?? 0}): {(d.bot?.hand || []).join(', ') || 'vacía'}
                            </div>
                          </div>
                        </div>

                        {d.runtimeErrors?.length > 0 && (
                          <div className="bg-[#FF003C]/10 border border-[#FF003C]/50 p-2.5 space-y-1">
                            <span className="text-[#FF003C] font-black uppercase block">
                              ERRORES JS CAPTURADOS ({d.runtimeErrors.length})
                            </span>
                            {d.runtimeErrors.map((err, i) => (
                              <div key={i} className="text-[10px] text-gray-200 font-mono">
                                [{err.kind}] {err.message}
                              </div>
                            ))}
                          </div>
                        )}

                        {d.actionLog?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[#FCEE0A] font-black uppercase block">
                              HISTORIAL DE ACCIONES (MÁS RECIENTE ARRIBA)
                            </span>
                            <pre className="bg-black border border-gray-800 p-2.5 text-[10px] text-gray-300 max-h-56 overflow-y-auto cyber-scrollbar whitespace-pre-wrap">
                              {d.actionLog.join('\n')}
                            </pre>
                          </div>
                        )}

                        {d.environment && (
                          <div className="text-[10px] text-gray-500">
                            Pantalla: {d.environment.viewport} • Capturado: {d.environment.capturedAt}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
