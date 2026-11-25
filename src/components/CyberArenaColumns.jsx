import React from 'react';
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';
import { CyberDieShape } from './CyberDiceSvg.jsx';

const FIXER_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

function MiniDeckStack({ count = 0, accent = '#FCEE0A', label = 'DECK', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      title={`${label}: ${count} cartas`}
    >
      <div
        className="w-11 h-15 rounded border bg-black relative overflow-hidden shadow-md transition-transform group-hover:scale-105"
        style={{ borderColor: `${accent}aa` }}
      >
        <img
          src="/images/back_normal.png"
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: `inset 0 0 12px ${accent}33` }}
        />
      </div>
      <span className="px-1.5 py-0.2 bg-black/90 border border-white/15 rounded text-[9px] font-mono font-black text-white leading-tight">
        {count}
      </span>
    </button>
  );
}

function MiniTrashStack({ trash = [], accent = '#FF003C', onViewTrash, onHoverCard }) {
  const lastCard = trash.length > 0 ? trash[trash.length - 1] : null;
  return (
    <button
      type="button"
      onClick={onViewTrash}
      onMouseEnter={() => lastCard && onHoverCard && onHoverCard(lastCard)}
      onMouseLeave={() => onHoverCard && onHoverCard(null)}
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      title={`Trash (${trash.length} cartas) — Clic para ver`}
    >
      <div
        className="w-11 h-15 rounded border border-dashed bg-[#060910] relative overflow-hidden flex items-center justify-center transition-all group-hover:border-white"
        style={{ borderColor: lastCard ? `${accent}aa` : 'rgba(255,255,255,0.16)' }}
      >
        {lastCard?.image ? (
          <img
            src={lastCard.image}
            alt={lastCard.name}
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100"
          />
        ) : (
          <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">
            TRASH
          </span>
        )}
      </div>
      <span className="px-1.5 py-0.2 bg-black/90 border border-white/15 rounded text-[9px] font-mono font-black text-gray-300 leading-tight">
        {trash.length}
      </span>
    </button>
  );
}

export function CyberLeftTelemetryRail({
  turnNumber = 1,
  isMyTurn = true,
  bot,
  player,
  botAvatar,
  playerAvatar,
  playerNick = 'TÚ',
  botAvailableEddies = 0,
  botMaxEddies = 0,
  playerAvailableEddies = 0,
  playerMaxEddies = 0,
  modePill = null,
  onViewBotTrash,
  onViewPlayerTrash,
  onHoverCard
}) {
  return (
    <div className="hidden lg:flex w-36 xl:w-44 flex-col justify-between py-2.5 px-2.5 border-r border-white/5 bg-[#05080f]/60 font-mono shrink-0 select-none">
      {/* ARRIBA: MAZO + TRASH + EDDIES DEL RIVAL */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MiniDeckStack count={bot?.deck?.length || 0} accent="#FCEE0A" label="Mazo Rival" />
          <MiniTrashStack
            trash={bot?.trash || []}
            accent="#FF003C"
            onViewTrash={onViewBotTrash}
            onHoverCard={onHoverCard}
          />
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[11px] font-black">
          <span className="text-[#FCEE0A]">€$</span>
          <span className="text-white">{botAvailableEddies}</span>
          <span className="text-gray-500">/{botMaxEddies}</span>
        </div>
      </div>

      {/* CENTRO: PILL RIVAL + TURNO + TU PILL */}
      <div className="space-y-2.5 my-auto">
        {/* Pill Rival */}
        <div
          className={`p-2 rounded border bg-black/75 flex items-center gap-2 transition-all ${
            !isMyTurn
              ? 'border-[#FF003C] shadow-[0_0_16px_rgba(255,0,60,0.3)]'
              : 'border-[#FF003C]/35'
          }`}
        >
          <div className="w-8 h-8 rounded bg-black border border-[#FF003C]/80 overflow-hidden shrink-0">
            <AvatarDisplay avatar={botAvatar} fallbackType="bot" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-white uppercase truncate block">
              {botAvatar?.name || 'Rival IA'}
            </span>
            <span className="text-[8px] text-[#FF003C] font-bold uppercase flex items-center justify-between">
              <span>RIVAL</span>
              <span className="text-gray-400">🖐️ {bot?.hand?.length || 0}</span>
            </span>
          </div>
        </div>

        {/* Bloque de Turno */}
        <div className="px-2 py-1.5 rounded bg-black/50 border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-500 uppercase">TURN</span>
            <span className="text-sm font-black text-white">{turnNumber}</span>
          </div>
          {modePill && (
            <div className="text-[8px] font-black uppercase tracking-wider truncate text-[#FCEE0A]">
              {modePill}
            </div>
          )}
        </div>

        {/* Tu Pill */}
        <div
          className={`p-2 rounded border bg-black/75 flex items-center gap-2 transition-all ${
            isMyTurn
              ? 'border-[#0dfceb] shadow-[0_0_16px_rgba(13,252,235,0.3)]'
              : 'border-[#0dfceb]/35'
          }`}
        >
          <div className="w-8 h-8 rounded bg-black border border-[#0dfceb]/80 overflow-hidden shrink-0">
            <AvatarDisplay avatar={playerAvatar} fallbackType="player" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-white uppercase truncate block">
              {playerNick}
            </span>
            <span className="text-[8px] text-[#0dfceb] font-bold uppercase flex items-center justify-between">
              <span>YOU</span>
              <span className="text-gray-400">🖐️ {player?.hand?.length || 0}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ABAJO: TU MAZO + TRASH + EDDIES */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 border border-[#0dfceb]/25 text-[11px] font-black">
          <span className="text-[#FCEE0A]">€$</span>
          <span className="text-[#0dfceb]">{playerAvailableEddies}</span>
          <span className="text-gray-500">/{playerMaxEddies}</span>
        </div>
        <div className="flex items-start gap-2">
          <MiniDeckStack count={player?.deck?.length || 0} accent="#FCEE0A" label="Tu Mazo" />
          <MiniTrashStack
            trash={player?.trash || []}
            accent="#0dfceb"
            onViewTrash={onViewPlayerTrash}
            onHoverCard={onHoverCard}
          />
        </div>
      </div>
    </div>
  );
}

export function CyberRightGigsRail({
  botGigs = [],
  botStreetCred = 0,
  botFixerDice = [],
  playerGigs = [],
  playerStreetCred = 0,
  playerFixerDice = [],
  eligiblePlayerDice = [],
  canRollFixerNow = false,
  onRollFixerDie,
  canAttackGigs = false,
  gigsToSteal = 0,
  onAttackGigs,
  onStealSpecificDie,
  isMyTurn = true,
  isBotThinking = false,
  hasPendingReaction = false,
  hasBlockerAssigned = false,
  onPrimaryAction // END TURN or PASS/RESOLVE
}) {
  const botFixerSet = new Set((botFixerDice || []).map((d) => String(d).toLowerCase()));
  const playerFixerSet = new Set((playerFixerDice || []).map((d) => String(d).toLowerCase()));
  const eligibleSet = new Set((eligiblePlayerDice || []).map((d) => String(d).toLowerCase()));

  const renderProgressSegments = (count, color) => (
    <div className="grid grid-cols-7 gap-1 mt-auto pt-1.5">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div
          key={idx}
          className="h-1 rounded-full transition-all"
          style={{
            backgroundColor: idx < count ? color : 'rgba(255,255,255,0.08)',
            boxShadow: idx < count ? `0 0 6px ${color}` : 'none'
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="hidden lg:flex w-48 xl:w-56 flex-col justify-between py-2.5 px-2.5 gap-2 border-l border-white/5 bg-[#05080f]/60 font-mono shrink-0 select-none">
      {/* 1. FIXER DEL RIVAL */}
      <div className="bg-black/60 border border-white/10 rounded p-2 space-y-1">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
          <span>FIXER</span>
          <span>{botFixerSet.size === 0 ? 'EMPTY' : `${botFixerSet.size} LEFT`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FIXER_ORDER.map((d) => {
            const avail = botFixerSet.has(d);
            return (
              <CyberDieShape
                key={`bf-${d}`}
                dieType={d}
                size={24}
                color="#FF003C"
                dimmed={!avail}
              />
            );
          })}
        </div>
      </div>

      {/* 2. CAJA DE GIGS DEL RIVAL */}
      <div
        data-arrow-anchor="bot-gigs"
        className={`flex-1 rounded-lg border p-2.5 flex flex-col justify-between relative transition-all min-h-[120px] ${
          canAttackGigs
            ? 'bg-[#FF003C]/14 border-[#FCEE0A] shadow-[0_0_28px_rgba(252,238,10,0.4)]'
            : 'bg-[#120710]/80 border-[#FF003C]/40'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-black uppercase">
          <span className="text-[#FF003C]">
            GIGS <span className="text-white">{botGigs.length}</span>/7
          </span>
          <span className="text-[#FCEE0A]">★ {botStreetCred}</span>
        </div>

        {/* Botón ATTACK GIGS amarillo eléctrico sobre la caja cuando atacas */}
        {canAttackGigs && (
          <button
            type="button"
            onClick={onAttackGigs}
            className="my-1 w-full py-1.5 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-[11px] uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(252,238,10,0.9)] animate-pulse transition-colors"
          >
            ATTACK GIGS {gigsToSteal > 0 ? `(${gigsToSteal})` : ''}
          </button>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1.5 my-auto py-1">
          {botGigs.length === 0 ? (
            <span className="text-[9px] text-gray-600 italic">Sin Gigs</span>
          ) : (
            botGigs.map((gig, idx) => (
              <button
                key={`bg-${idx}`}
                type="button"
                onClick={() => canAttackGigs && onStealSpecificDie && onStealSpecificDie(gig.die.toLowerCase())}
                className={canAttackGigs ? 'cursor-pointer hover:scale-115 transition-transform' : 'cursor-default'}
                title={`Gig Rival ${gig.die.toUpperCase()} (Valor ${gig.value})`}
              >
                <CyberDieShape
                  dieType={gig.die}
                  value={gig.value}
                  size={34}
                  color={gig.stolenFrom ? '#0dfceb' : '#FF003C'}
                  selected={canAttackGigs}
                  showProgressBar
                />
              </button>
            ))
          )}
        </div>

        {renderProgressSegments(botGigs.length, '#FF003C')}
      </div>

      {/* 3. BOTÓN PROTAGONISTA CENTRAL: END TURN / PASS / RESOLVING */}
      <button
        type="button"
        disabled={!hasPendingReaction && (!isMyTurn || isBotThinking)}
        onClick={onPrimaryAction}
        className={`w-full py-3 px-3 rounded font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
          hasPendingReaction
            ? 'bg-[#0dfceb] hover:bg-white text-[#070a10] cursor-pointer shadow-[0_0_24px_rgba(13,252,235,0.75)] animate-pulse'
            : isMyTurn && !isBotThinking
            ? 'bg-[#FCEE0A] hover:bg-white text-[#070a10] cursor-pointer shadow-[0_0_22px_rgba(252,238,10,0.55)]'
            : 'bg-black/70 border border-white/15 text-gray-500 cursor-not-allowed'
        }`}
      >
        {hasPendingReaction
          ? hasBlockerAssigned
            ? 'RESOLVER BLOQUEO'
            : 'PASS'
          : isBotThinking || !isMyTurn
          ? 'RESOLVING...'
          : 'END TURN'}
      </button>

      {/* 4. TU CAJA DE GIGS */}
      <div
        data-arrow-anchor="player-gigs"
        className={`flex-1 rounded-lg border p-2.5 flex flex-col justify-between relative transition-all min-h-[120px] ${
          hasPendingReaction && !hasBlockerAssigned
            ? 'bg-[#FF003C]/12 border-[#FF003C] shadow-[0_0_26px_rgba(255,0,60,0.5)]'
            : 'bg-[#061218]/80 border-[#0dfceb]/40'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-black uppercase">
          <span className="text-[#0dfceb]">
            GIGS <span className="text-white">{playerGigs.length}</span>/7
          </span>
          <span className="text-[#FCEE0A]">★ {playerStreetCred}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 my-auto py-1">
          {playerGigs.length === 0 ? (
            <span className="text-[9px] text-gray-600 italic">Sin Gigs</span>
          ) : (
            playerGigs.map((gig, idx) => (
              <div
                key={`pg-${idx}`}
                title={`Tu Gig ${gig.die.toUpperCase()} (Valor ${gig.value})`}
              >
                <CyberDieShape
                  dieType={gig.die}
                  value={gig.value}
                  size={34}
                  color={gig.stolenFrom ? '#FF003C' : '#0dfceb'}
                  showProgressBar
                />
              </div>
            ))
          )}
        </div>

        {renderProgressSegments(playerGigs.length, '#0dfceb')}
      </div>

      {/* 5. TU FIXER (CLICABLE PARA TIRAR DADO AL INICIO DEL TURNO) */}
      <div
        className={`bg-black/60 border rounded p-2 space-y-1 transition-all ${
          canRollFixerNow
            ? 'border-[#0dfceb] bg-[#0dfceb]/10 shadow-[0_0_18px_rgba(13,252,235,0.35)]'
            : 'border-white/10'
        }`}
      >
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
          <span className={canRollFixerNow ? 'text-[#0dfceb] animate-pulse' : 'text-gray-500'}>
            {canRollFixerNow ? '⚡ ELIGE DADO FIXER' : 'FIXER'}
          </span>
          <span className="text-gray-500">{playerFixerSet.size} LEFT</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FIXER_ORDER.map((d) => {
            const avail = playerFixerSet.has(d);
            const isEligible = canRollFixerNow && eligibleSet.has(d);
            return (
              <button
                key={`pf-${d}`}
                type="button"
                disabled={!isEligible}
                onClick={() => isEligible && onRollFixerDie && onRollFixerDie(d)}
                className={
                  isEligible
                    ? 'cursor-pointer hover:scale-120 transition-transform'
                    : 'cursor-default'
                }
                title={
                  isEligible
                    ? `Clic para tirar ${d.toUpperCase()} y ganar un nuevo Gig`
                    : avail
                    ? `Dado ${d.toUpperCase()} disponible en tu Fixer`
                    : `Dado ${d.toUpperCase()} ya usado`
                }
              >
                <CyberDieShape
                  dieType={d}
                  size={24}
                  color="#0dfceb"
                  selected={isEligible}
                  dimmed={!avail}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
