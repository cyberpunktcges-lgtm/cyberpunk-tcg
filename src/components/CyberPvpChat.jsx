import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { sendPvpChatMessage } from '../utils/pvpService.js';

const QUICK_PHRASES = ['GLHF ⚡', '¡Buena jugada!', 'Un segundo ⏳', 'GG 🤝'];

export default function CyberPvpChat({
  roomCode,
  messages = [],
  currentUser,
  mySeat = 'p1',
  allowSpectatorChat = true,
  compact = false
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const canSend =
    Boolean(roomCode && currentUser?.uid) &&
    (mySeat !== 'spectator' || Boolean(allowSpectatorChat));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async (customText = null) => {
    if (!canSend || sending) return;
    const text = String(customText !== null ? customText : draft).trim();
    if (!text) return;
    setSending(true);
    try {
      await sendPvpChatMessage(roomCode, {
        uid: currentUser.uid,
        senderName:
          currentUser.displayName || currentUser.email?.split('@')[0] || 'Netrunner',
        role: mySeat,
        text
      });
      if (customText === null) setDraft('');
    } catch (err) {
      console.warn('Error enviando mensaje de chat PvP:', err);
    } finally {
      setSending(false);
    }
  };

  const roleStyle = (role) => {
    if (role === 'p1') return { label: 'P1', color: 'text-[#0dfceb]', badge: 'bg-[#0dfceb]/15 border-[#0dfceb]/40 text-[#0dfceb]' };
    if (role === 'p2') return { label: 'P2', color: 'text-[#FF003C]', badge: 'bg-[#FF003C]/15 border-[#FF003C]/40 text-[#FF003C]' };
    return { label: '👁️', color: 'text-[#FCEE0A]', badge: 'bg-[#FCEE0A]/15 border-[#FCEE0A]/40 text-[#FCEE0A]' };
  };

  return (
    <div className="flex flex-col h-full min-h-0 font-mono">
      {/* Cabecera opcional cuando no es compacto */}
      {!compact && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#070b14]">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#0dfceb]">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CHAT DE SALA</span>
          </div>
          <span className="text-[9px] text-gray-500 uppercase">
            {messages.length} msg
          </span>
        </div>
      )}

      {/* Lista de mensajes */}
      <div className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar p-2.5 space-y-2 bg-[#050811]/70">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-gray-500">
            <MessageSquare className="w-6 h-6 opacity-35 mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider">Sin mensajes aún</p>
            <p className="text-[10px] font-sans text-gray-600 mt-0.5">
              Saluda o coordina la partida desde aquí.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = currentUser?.uid && m.uid === currentUser.uid;
            const rs = roleStyle(m.role);
            const timeStr = m.createdAtMs
              ? new Date(m.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            return (
              <div
                key={m.id}
                className={`rounded-md px-2.5 py-1.5 border text-left ${
                  isMine
                    ? 'bg-[#0b1824]/85 border-[#0dfceb]/35'
                    : 'bg-[#0b0f1a]/85 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-1 py-0.2 rounded text-[8px] font-black border ${rs.badge}`}>
                      {rs.label}
                    </span>
                    <span className={`text-[10px] font-black truncate ${rs.color}`}>
                      {m.senderName || 'Netrunner'}
                    </span>
                  </div>
                  {timeStr && <span className="text-[8.5px] text-gray-500 shrink-0">{timeStr}</span>}
                </div>
                <p className="text-[11px] font-sans text-gray-200 leading-snug break-words whitespace-pre-wrap">
                  {m.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Respuestas rápidas */}
      {canSend && (
        <div className="px-2 pt-1.5 pb-1 border-t border-white/10 bg-[#070b14] flex flex-wrap gap-1">
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              disabled={sending}
              onClick={() => handleSend(phrase)}
              className="px-2 py-0.5 text-[9px] font-bold bg-[#101829] hover:bg-[#0dfceb]/20 border border-white/10 hover:border-[#0dfceb]/60 text-gray-300 hover:text-[#0dfceb] rounded cursor-pointer transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-2 border-t border-white/10 bg-[#070b14] flex items-center gap-1.5"
        >
          <input
            type="text"
            value={draft}
            maxLength={280}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 min-w-0 bg-[#0c1220] border border-white/15 focus:border-[#0dfceb] rounded px-2.5 py-1.5 text-[11px] font-sans text-white placeholder-gray-500 outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="px-2.5 py-1.5 bg-[#0dfceb] hover:bg-white disabled:bg-gray-800 disabled:text-gray-500 text-[#070a10] rounded font-black text-[11px] flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Enviar mensaje"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="px-3 py-2 border-t border-white/10 bg-[#070b14] text-[10px] text-gray-500 text-center">
          {mySeat === 'spectator'
            ? '👁️ El chat de espectadores está desactivado en esta sala.'
            : 'Inicia sesión para usar el chat.'}
        </div>
      )}
    </div>
  );
}
