import React from 'react';
import { AvatarDisplay } from './CyberDeckSelectorModal.jsx';
import { CyberDieShape } from './CyberDiceSvg.jsx';

const FIXER_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

function MiniDeckStack({ count = 0, label = 'DECK', onClick, anchorId = null }) {
  return (
    <button
      type="button"
      data-arrow-anchor={anchorId || undefined}
      onClick={onClick}
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      title={`${label}: ${count} cartas`}
    >
      <div className="w-13 h-19 xl:w-15 xl:h-21 rounded border border-[#FCEE0A]/80 bg-black relative overflow-hidden shadow-lg transition-transform group-hover:scale-105">
        <img
          src="/images/back_normal.png"
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <span className="px-2 py-0.5 bg-[#0b101b] border border-white/15 rounded text-[10px] font-mono font-black text-white leading-none">
        {count}
      </span>
    </button>
  );
}

function MiniTrashStack({ trash = [], accent = '#FF003C', onViewTrash, onHoverCard, anchorId = null }) {
  const lastCard = trash.length > 0 ? trash[trash.length - 1] : null;
  return (
    <button
      type="button"
      data-arrow-anchor={anchorId || undefined}
      onClick={onViewTrash}
      onMouseEnter={() => lastCard && onHoverCard && onHoverCard(lastCard)}
      onMouseLeave={() => onHoverCard && onHoverCard(null)}
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      title={`Trash (${trash.length} cartas) — Clic para ver`}
    >
      <div
        className="w-13 h-19 xl:w-15 xl:h-21 rounded border bg-[#070b14] relative overflow-hidden flex items-center justify-center transition-all group-hover:border-white"
        style={{ borderColor: lastCard ? `${accent}aa` : 'rgba(255,255,255,0.12)' }}
      >
        {lastCard?.image ? (
          <img
            src={lastCard.image}
            alt={lastCard.name}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
          />
        ) : (
          <span className="text-[8px] font-mono font-bold text-gray-600 uppercase tracking-widest">
            TRASH
          </span>
        )}
      </div>
      <span className="px-2 py-0.5 bg-[#0b101b] border border-white/15 rounded text-[10px] font-mono font-black text-gray-300 leading-none">
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
    <div className="hidden lg:flex w-48 xl:w-56 flex-col justify-between py-3 px-3 bg-transparent font-mono shrink-0 select-none">
      {/* ARRIBA: MAZO + TRASH + €$ DEL RIVAL EN HORIZONTAL (EXACTO A LAS CAPTURAS) */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-start gap-2">
          <MiniDeckStack count={bot?.deck?.length || 0} label="Mazo Rival" anchorId="bot-deck" />
          <MiniTrashStack
            trash={bot?.trash || []}
            accent="#FF003C"
            anchorId="bot-trash"
            onViewTrash={onViewBotTrash}
            onHoverCard={onHoverCard}
          />
        </div>
        <div className="flex items-baseline gap-1 text-sm font-black whitespace-nowrap">
          <span className="text-[#FCEE0A] text-xs">€$</span>
          <span className="text-white text-base">{botAvailableEddies}</span>
          <span className="text-gray-500 text-xs">/{botMaxEddies}</span>
        </div>
      </div>

      {/* CENTRO: PILL RIVAL + TURNO + TU PILL */}
      <div className="space-y-4 my-auto pr-2">
        {/* Pill Rival */}
        <div
          data-arrow-anchor="bot-pill"
          className={`p-2.5 rounded-md border bg-[#090d16]/90 flex items-center gap-2.5 transition-all ${
            !isMyTurn
              ? 'border-[#FF003C] shadow-[0_0_20px_rgba(255,0,60,0.3)]'
              : 'border-[#FF003C]/35'
          }`}
        >
          <div className="w-9 h-9 rounded bg-black border border-[#FF003C]/80 overflow-hidden shrink-0">
            <AvatarDisplay avatar={botAvatar} fallbackType="bot" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-black text-white truncate block">
              {botAvatar?.name || 'Rival IA'}
            </span>
            <span className="text-[9px] text-[#FF003C] font-bold uppercase tracking-wider flex items-center justify-between mt-0.5">
              <span>RIVAL</span>
              <span className="text-gray-400">🃏 {bot?.hand?.length || 0}</span>
            </span>
          </div>
        </div>

        {/* Bloque de Turno */}
        <div className="px-1 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">TURN</span>
            <span className="text-xl font-black text-white leading-none">{turnNumber}</span>
            {modePill && (
              <span className="px-1.5 py-0.5 rounded bg-[#FCEE0A]/15 border border-[#FCEE0A]/40 text-[9px] font-black uppercase text-[#FCEE0A] truncate">
                {modePill}
              </span>
            )}
          </div>
        </div>

        {/* Tu Pill */}
        <div
          data-arrow-anchor="player-pill"
          className={`p-2.5 rounded-md border bg-[#090d16]/90 flex items-center gap-2.5 transition-all ${
            isMyTurn
              ? 'border-[#0dfceb] shadow-[0_0_20px_rgba(13,252,235,0.3)]'
              : 'border-[#0dfceb]/35'
          }`}
        >
          <div className="w-9 h-9 rounded bg-black border border-[#0dfceb]/80 overflow-hidden shrink-0">
            <AvatarDisplay avatar={playerAvatar} fallbackType="player" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-black text-white truncate block">
              {playerNick}
            </span>
            <span className="text-[9px] text-[#0dfceb] font-bold uppercase tracking-wider flex items-center justify-between mt-0.5">
              <span>YOU</span>
              <span className="text-gray-400">🃏 {player?.hand?.length || 0}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ABAJO: TU MAZO + TRASH + €$ EN HORIZONTAL (EXACTO A LAS CAPTURAS) */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-start gap-2">
          <MiniDeckStack count={player?.deck?.length || 0} label="Tu Mazo" anchorId="player-deck" />
          <MiniTrashStack
            trash={player?.trash || []}
            accent="#0dfceb"
            anchorId="player-trash"
            onViewTrash={onViewPlayerTrash}
            onHoverCard={onHoverCard}
          />
        </div>
        <div className="flex items-baseline gap-1 text-sm font-black whitespace-nowrap">
          <span className="text-[#FCEE0A] text-xs">€$</span>
          <span className="text-[#FCEE0A] text-base">{playerAvailableEddies}</span>
          <span className="text-gray-500 text-xs">/{playerMaxEddies}</span>
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
  isResolving = false,
  hasPendingReaction = false,
  hasBlockerAssigned = false,
  onPrimaryAction,
  canUndo = false,
  onUndo,
  targetGigInfo = null, // { isBotGigEligible: (gig, idx)=>bool, isPlayerGigEligible: (gig, idx)=>bool, selectedGig: { owner, gigIndex }|null, onSelectGig: (owner, gig, idx)=>void }
  recentHighlightBotGigs = false,
  recentHighlightPlayerGigs = false
}) {
  const botFixerSet = new Set((botFixerDice || []).map((d) => String(d).toLowerCase()));
  const playerFixerSet = new Set((playerFixerDice || []).map((d) => String(d).toLowerCase()));
  const eligibleSet = new Set((eligiblePlayerDice || []).map((d) => String(d).toLowerCase()));

  const renderProgressSegments = (count, color) => (
    <div className="grid grid-cols-7 gap-1 mt-auto pt-2">
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
    <div className="hidden lg:flex w-52 xl:w-60 flex-col justify-between py-3 px-2.5 gap-2.5 bg-transparent font-mono shrink-0 select-none">
      {/* 1. FIXER DEL RIVAL */}
      <div className="bg-[#090d16]/70 border border-white/10 rounded-md px-2.5 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-500">
          <span>FIXER</span>
          <span>{botFixerSet.size === 0 ? 'EMPTY' : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FIXER_ORDER.map((d) => {
            const avail = botFixerSet.has(d);
            return (
              <CyberDieShape
                key={`bf-${d}`}
                dieType={d}
                size={27}
                color="#FF003C"
                dimmed={!avail}
              />
            );
          })}
        </div>
      </div>

      {/* 2. CAJA DE GIGS DEL RIVAL */}
      {(() => {
        const hasEligibleBotGigs = botGigs.some((gig, idx) => Boolean(targetGigInfo?.isBotGigEligible?.(gig, idx)));
        return (
          <div
            data-arrow-anchor="bot-gigs"
            className={`flex-1 rounded-lg border p-3 flex flex-col justify-between relative transition-all min-h-[145px] ${
              hasEligibleBotGigs
                ? 'bg-[#081a24]/92 border-[#0dfceb] shadow-[0_0_28px_rgba(13,252,235,0.45)]'
                : canAttackGigs
                ? 'bg-[#210914]/90 border-[#FF003C] shadow-[0_0_28px_rgba(255,0,60,0.4)]'
                : 'bg-[#120710]/75 border-[#FF003C]/35'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-black uppercase gap-1">
              <span className="text-gray-400">
                GIGS <span className="text-white text-sm">{botGigs.length}</span>
                <span className="text-gray-500">/7</span>
              </span>
              {hasEligibleBotGigs && (
                <span className="px-1.5 py-0.5 bg-[#0dfceb]/20 border border-[#0dfceb] text-[#0dfceb] text-[8px] font-black tracking-wider rounded-sm animate-pulse">
                  🎯 ELIGE GIG
                </span>
              )}
              <span className="text-[#FCEE0A] text-sm">★ {botStreetCred}</span>
            </div>

            {/* Botón ATTACK GIGS amarillo eléctrico centrado sobre la caja (EXACTO A CAPTURA 2) */}
            {canAttackGigs && !hasEligibleBotGigs && (
              <button
                type="button"
                onClick={onAttackGigs}
                className="my-1 w-full py-2 bg-[#FCEE0A] hover:bg-white text-[#070a10] font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_22px_rgba(252,238,10,0.9)] transition-colors rounded-sm"
              >
                ATTACK GIGS {gigsToSteal > 0 ? `(${gigsToSteal})` : ''}
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 my-auto py-1">
              {botGigs.length === 0 ? (
                <span className="text-[10px] text-gray-600 italic">—</span>
              ) : (
                botGigs.map((gig, idx) => {
                  const isTargetEligible = Boolean(targetGigInfo?.isBotGigEligible?.(gig, idx));
                  const isTargetSelected =
                    targetGigInfo?.selectedGig?.owner === 'bot' &&
                    targetGigInfo?.selectedGig?.gigIndex === idx;
                  const isInteractive = Boolean(canAttackGigs || isTargetEligible);
                  return (
                    <button
                      key={`bg-${idx}`}
                      data-arrow-anchor={`bot-gig-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTargetEligible && targetGigInfo?.onSelectGig) {
                          targetGigInfo.onSelectGig('bot', gig, idx);
                        } else if (canAttackGigs && onStealSpecificDie) {
                          onStealSpecificDie(gig.die.toLowerCase());
                        }
                      }}
                      className={
                        isInteractive
                          ? `cursor-pointer hover:scale-115 transition-transform rounded p-0.5 ${
                              isTargetSelected
                                ? 'ring-2 ring-[#FCEE0A] bg-[#FCEE0A]/15 scale-110'
                                : isTargetEligible
                                ? 'ring-2 ring-[#0dfceb] bg-[#0dfceb]/15 animate-pulse'
                                : ''
                            }`
                          : 'cursor-default'
                      }
                      title={
                        isTargetEligible
                          ? `Clic para seleccionar Gig Rival ${gig.die.toUpperCase()} (Valor ${gig.value})`
                          : `Gig Rival ${gig.die.toUpperCase()} (Valor ${gig.value})`
                      }
                    >
                      <CyberDieShape
                        dieType={gig.die}
                        value={gig.value}
                        size={40}
                        color={
                          isTargetSelected
                            ? '#FCEE0A'
                            : isTargetEligible
                            ? '#0dfceb'
                            : gig.stolenFrom
                            ? '#0dfceb'
                            : '#FF003C'
                        }
                        selected={canAttackGigs || isTargetEligible || isTargetSelected}
                        showProgressBar
                      />
                    </button>
                  );
                })
              )}
            </div>

            {renderProgressSegments(botGigs.length, '#FF003C')}
          </div>
        );
      })()}

      {/* 3. BOTÓN PROTAGONISTA CENTRAL: FINALIZAR TURNO / PASS / RESOLVING... + BOTÓN DESHACER (UNDO) */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={isResolving || (!hasPendingReaction && (!isMyTurn || isBotThinking))}
          onClick={onPrimaryAction}
          className={`w-full py-3.5 px-3 rounded-sm font-black text-xs xl:text-sm uppercase tracking-[0.12em] transition-all shadow-lg ${
            isResolving
              ? 'bg-[#0c111c] border border-white/15 text-gray-400 cursor-not-allowed'
              : hasPendingReaction
              ? 'bg-[#0dfceb] hover:bg-white text-[#070a10] cursor-pointer shadow-[0_0_26px_rgba(13,252,235,0.8)]'
              : isMyTurn && !isBotThinking
              ? 'bg-[#FCEE0A] hover:bg-white text-[#070a10] cursor-pointer shadow-[0_0_24px_rgba(252,238,10,0.55)]'
              : 'bg-[#0c111c] border border-white/10 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isResolving
            ? 'RESOLVING •••'
            : hasPendingReaction
            ? 'PASS'
            : isBotThinking || !isMyTurn
            ? 'RESOLVING •••'
            : 'FINALIZAR TURNO'}
        </button>

        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className={`w-full py-1.5 px-2.5 rounded-sm border font-black text-[10px] uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-all ${
            canUndo
              ? 'bg-[#081520] hover:bg-[#0dfceb] border-[#0dfceb]/70 text-[#0dfceb] hover:text-[#070a10] cursor-pointer shadow-[0_0_14px_rgba(13,252,235,0.28)]'
              : 'bg-[#090d16]/60 border-white/10 text-gray-600 opacity-45 cursor-not-allowed'
          }`}
          title="Deshacer el último movimiento"
        >
          <span>↩</span>
          <span>DESHACER (UNDO)</span>
        </button>
      </div>

      {/* 4. TU CAJA DE GIGS */}
      {(() => {
        const hasEligiblePlayerGigs = playerGigs.some((gig, idx) => Boolean(targetGigInfo?.isPlayerGigEligible?.(gig, idx)));
        return (
          <div
            data-arrow-anchor="player-gigs"
            className={`flex-1 rounded-lg border p-3 flex flex-col justify-between relative transition-all min-h-[145px] ${
              hasEligiblePlayerGigs
                ? 'bg-[#081a24]/92 border-[#0dfceb] shadow-[0_0_28px_rgba(13,252,235,0.45)]'
                : hasPendingReaction && !hasBlockerAssigned
                ? 'bg-[#210914]/85 border-[#FF003C] shadow-[0_0_28px_rgba(255,0,60,0.55)]'
                : 'bg-[#061218]/75 border-[#0dfceb]/35'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-black uppercase gap-1">
              <span className="text-gray-400">
                GIGS <span className="text-white text-sm">{playerGigs.length}</span>
                <span className="text-gray-500">/7</span>
              </span>
              {hasEligiblePlayerGigs && (
                <span className="px-1.5 py-0.5 bg-[#0dfceb]/20 border border-[#0dfceb] text-[#0dfceb] text-[8px] font-black tracking-wider rounded-sm animate-pulse">
                  🎯 ELIGE GIG
                </span>
              )}
              <span className="text-[#FCEE0A] text-sm">★ {playerStreetCred}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 my-auto py-1">
              {playerGigs.length === 0 ? (
                <span className="text-[10px] text-gray-600 italic">—</span>
              ) : (
                playerGigs.map((gig, idx) => {
                  const isTargetEligible = Boolean(targetGigInfo?.isPlayerGigEligible?.(gig, idx));
                  const isTargetSelected =
                    targetGigInfo?.selectedGig?.owner === 'player' &&
                    targetGigInfo?.selectedGig?.gigIndex === idx;
                  return (
                    <button
                      key={`pg-${idx}`}
                      data-arrow-anchor={`player-gig-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTargetEligible && targetGigInfo?.onSelectGig) {
                          targetGigInfo.onSelectGig('player', gig, idx);
                        }
                      }}
                      className={
                        isTargetEligible
                          ? `cursor-pointer hover:scale-115 transition-transform rounded p-0.5 ${
                              isTargetSelected
                                ? 'ring-2 ring-[#FCEE0A] bg-[#FCEE0A]/15 scale-110'
                                : 'ring-2 ring-[#0dfceb] bg-[#0dfceb]/15 animate-pulse'
                            }`
                          : 'cursor-default'
                      }
                      title={
                        isTargetEligible
                          ? `Clic para seleccionar tu Gig ${gig.die.toUpperCase()} (Valor ${gig.value})`
                          : `Tu Gig ${gig.die.toUpperCase()} (Valor ${gig.value})`
                      }
                    >
                      <CyberDieShape
                        dieType={gig.die}
                        value={gig.value}
                        size={40}
                        color={
                          isTargetSelected
                            ? '#FCEE0A'
                            : isTargetEligible
                            ? '#0dfceb'
                            : gig.stolenFrom
                            ? '#FF003C'
                            : '#0dfceb'
                        }
                        selected={isTargetEligible || isTargetSelected}
                        showProgressBar
                      />
                    </button>
                  );
                })
              )}
            </div>

            {renderProgressSegments(playerGigs.length, '#0dfceb')}
          </div>
        );
      })()}

      {/* 5. TU FIXER (CLICABLE PARA TIRAR DADO AL INICIO DEL TURNO) */}
      <div
        className={`bg-[#090d16]/70 border rounded-md px-2.5 py-2 space-y-1.5 transition-all ${
          canRollFixerNow
            ? 'border-[#0dfceb] bg-[#0dfceb]/10 shadow-[0_0_20px_rgba(13,252,235,0.35)]'
            : 'border-white/10'
        }`}
      >
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
          <span className={canRollFixerNow ? 'text-[#0dfceb] animate-pulse' : 'text-gray-500'}>
            {canRollFixerNow ? '⚡ ELIGE DADO' : 'FIXER'}
          </span>
          <span className="text-gray-600">{playerFixerSet.size === 0 ? 'EMPTY' : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
                    ? 'cursor-pointer hover:scale-115 transition-transform'
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
                  size={27}
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
