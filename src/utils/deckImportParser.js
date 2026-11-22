/**
 * deckImportParser.js
 * Parser universal de listas de mazos para Cyberpunk TCG (Set 01 - Welcome to Night City).
 * Soporta texto plano (.txt, .dec, .csv, .md) y JSON (.json), incluyendo:
 * - Exportaciones propias de cyberpunktcg.es (`// MAZO: ...`, `3x Nombre (#ID) [Aspect]`)
 * - Formatos estándar de comunidad (`3x Nombre`, `3 Nombre`, `Nombre x3`, `1x CP-054`, `Nombre,3`, etc.)
 * - Separación automática de secciones: Baraja Principal (incl. Leyendas) y Banquillo / Sideboard.
 * - Predicción inteligente y sugerencias de autocompletado ante nombres incompletos o erratas
 *   (ej: "Adam Smasher" -> "Adam Smasher // Ender of Legends" o "Adam Smasher // Metal Over Meat").
 */

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\/\/|[:–—-]/g, ' ')
    .replace(/['"`´’‘]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCardTypeKey(card) {
  const official = String(card?.officialType || '').toUpperCase();
  if (official) return official;
  const ct = String(card?.cardType || '').toUpperCase();
  if (ct.includes('LEGEND')) return 'LEGEND';
  if (ct.includes('UNIT')) return 'UNIT';
  if (ct.includes('PROGRAM')) return 'PROGRAM';
  if (ct.includes('GEAR')) return 'GEAR';
  return '';
}

function isLegendCard(card) {
  return getCardTypeKey(card) === 'LEGEND';
}

/**
 * Distancia de Levenshtein rápida para detectar erratas tipográficas.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

/**
 * Coeficiente de similitud de bigramas (Dice) para comparar cadenas con letras transpuestas o sin espacios.
 */
function bigramSimilarity(a, b) {
  const s1 = a.replace(/\s+/g, '');
  const s2 = b.replace(/\s+/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const map = new Map();
  for (let i = 0; i < s1.length - 1; i++) {
    const bg = s1.slice(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bg = s2.slice(i, i + 2);
    const count = map.get(bg) || 0;
    if (count > 0) {
      overlap++;
      map.set(bg, count - 1);
    }
  }
  return (2 * overlap) / (s1.length - 1 + s2.length - 1);
}

/**
 * Construye índices rápidos de búsqueda sobre el catálogo oficial de cartas.
 */
function buildCardLookup(allCards = []) {
  const byId = new Map();
  const byCardId = new Map();
  const byExactNormName = new Map();
  const bySlug = new Map();
  const normalizedList = [];

  for (const card of allCards) {
    if (!card) continue;
    const idKey = String(card.id || '').trim().toUpperCase();
    if (idKey) byId.set(idKey, card);

    const cIdKey = String(card.cardId || '').trim().toUpperCase();
    if (cIdKey) {
      byCardId.set(cIdKey, card);
      byCardId.set(cIdKey.replace(/^#/, ''), card);
    }

    const normName = normalizeText(card.name);
    if (normName && !byExactNormName.has(normName)) {
      byExactNormName.set(normName, card);
    }

    const slugKey = normalizeText(card.slug);
    if (slugKey && !bySlug.has(slugKey)) {
      bySlug.set(slugKey, card);
    }

    const tokens = normName ? normName.split(' ').filter(Boolean) : [];
    const baseName = normalizeText(String(card.name || '').split('//')[0]);

    normalizedList.push({
      card,
      normName,
      baseName,
      slugKey,
      tokens,
      typeKey: getCardTypeKey(card)
    });
  }

  return { byId, byCardId, byExactNormName, bySlug, normalizedList };
}

function cleanQueryForMatching(rawQuery) {
  return String(rawQuery || '')
    .trim()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .trim();
}

/**
 * Resuelve un texto (nombre, ID tipo CP-001, o cardId tipo #006 / β062) contra el catálogo oficial.
 * Si se pasa sectionHint (ej: 'LEGEND'), desambigua automáticamente si solo 1 carta de ese tipo coincide.
 */
function resolveCardFromToken(rawQuery, lookup, sectionHint = null) {
  if (!rawQuery) return null;
  const q = String(rawQuery).trim();

  // 1. Extraer posible ID explícito entre paréntesis o corchetes: ej "(CP-008)" o "(#006)" o "(β062)"
  const cpMatch = q.match(/\b(CP-\d{3})\b/i);
  if (cpMatch) {
    const found = lookup.byId.get(cpMatch[1].toUpperCase());
    if (found) return found;
  }

  const parenMatch = q.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].trim().toUpperCase();
    if (lookup.byId.has(inner)) return lookup.byId.get(inner);
    if (lookup.byCardId.has(inner)) return lookup.byCardId.get(inner);
  }

  // 2. Limpiar sufijos entre paréntesis/corchetes tipo "(#006) [Red]" o "[CORPO]"
  const cleaned = cleanQueryForMatching(q);
  const upperClean = cleaned.toUpperCase();
  if (lookup.byId.has(upperClean)) return lookup.byId.get(upperClean);
  if (lookup.byCardId.has(upperClean)) return lookup.byCardId.get(upperClean);

  const norm = normalizeText(cleaned);
  if (!norm) return null;

  // 3. Coincidencia exacta por nombre normalizado o slug
  if (lookup.byExactNormName.has(norm)) return lookup.byExactNormName.get(norm);
  if (lookup.bySlug.has(norm)) return lookup.bySlug.get(norm);

  // 4. Coincidencia por prefijo o subcadena inequívoca (ej: "Pepe Najarro" o "Mandibular Upgrade")
  const prefixMatches = lookup.normalizedList.filter((item) => item.normName.startsWith(norm));
  if (prefixMatches.length === 1) return prefixMatches[0].card;
  if (prefixMatches.length > 1 && sectionHint) {
    const hinted = prefixMatches.filter((item) => item.typeKey === sectionHint);
    if (hinted.length === 1) return hinted[0].card;
  }

  const containsMatches = lookup.normalizedList.filter((item) => item.normName.includes(norm));
  if (containsMatches.length === 1) return containsMatches[0].card;
  if (containsMatches.length > 1 && sectionHint) {
    const hinted = containsMatches.filter((item) => item.typeKey === sectionHint);
    if (hinted.length === 1) return hinted[0].card;
  }

  // 5. Coincidencia inversa: el texto introducido contiene el nombre completo de una carta
  const reverseMatches = lookup.normalizedList
    .filter((item) => item.normName.length >= 4 && norm.includes(item.normName))
    .sort((a, b) => b.normName.length - a.normName.length);
  if (reverseMatches.length > 0) return reverseMatches[0].card;

  return null;
}

/**
 * Predice las cartas más probables cuando el nombre está incompleto, es ambiguo
 * (ej: "Adam Smasher") o contiene erratas tipográficas (ej: "Sketcy Ripper").
 */
export function suggestCardsForQuery(rawQuery, lookupOrCards, options = {}) {
  const { qty = 1, sectionHint = null, limit = 4 } = options;
  const lookup = Array.isArray(lookupOrCards) ? buildCardLookup(lookupOrCards) : lookupOrCards;
  const cleaned = cleanQueryForMatching(rawQuery);
  const norm = normalizeText(cleaned);
  if (!norm || norm.length < 2) {
    return { reason: 'not_found', suggestions: [] };
  }

  const qTokens = norm.split(' ').filter(Boolean);
  const qCompact = norm.replace(/\s+/g, '');
  let directHits = 0;

  const scored = [];

  for (const item of lookup.normalizedList) {
    const { card, normName, baseName, tokens, typeKey } = item;
    if (!normName) continue;

    let score = 0;
    let isDirectMatch = false;

    // A) Coincidencia directa por nombre base (antes de "//"), prefijo o subcadena
    if (baseName && baseName === norm) {
      score = 0.96;
      isDirectMatch = true;
    } else if (normName.startsWith(norm)) {
      score = 0.93;
      isDirectMatch = true;
    } else if (normName.includes(norm)) {
      score = 0.88;
      isDirectMatch = true;
    } else {
      // B) Coincidencia por tokens con tolerancia a erratas (Levenshtein por palabra)
      let matchedTokensWeight = 0;
      for (const qt of qTokens) {
        let bestTokScore = 0;
        for (const ct of tokens) {
          if (ct === qt) {
            bestTokScore = 1;
            break;
          }
          if (qt.length >= 3 && (ct.startsWith(qt) || qt.startsWith(ct))) {
            bestTokScore = Math.max(bestTokScore, 0.88);
          } else if (qt.length >= 3 && ct.length >= 3) {
            const dist = levenshtein(qt, ct);
            const maxLen = Math.max(qt.length, ct.length);
            const sim = 1 - dist / maxLen;
            if (dist <= 2 && sim >= 0.6) {
              bestTokScore = Math.max(bestTokScore, sim * 0.92);
            }
          }
        }
        matchedTokensWeight += bestTokScore;
      }

      const tokenScore = qTokens.length > 0 ? matchedTokensWeight / qTokens.length : 0;

      // C) Similitud global de cadena (bigramas + Levenshtein) contra nombre completo y nombre base
      const bgFull = bigramSimilarity(norm, normName);
      const bgBase = baseName ? bigramSimilarity(norm, baseName) : 0;
      const bestBg = Math.max(bgFull, bgBase);

      const nameCompact = normName.replace(/\s+/g, '');
      const baseCompact = baseName ? baseName.replace(/\s+/g, '') : '';
      const levFull =
        1 - levenshtein(qCompact, nameCompact) / Math.max(qCompact.length, nameCompact.length, 1);
      const levBase = baseCompact
        ? 1 - levenshtein(qCompact, baseCompact) / Math.max(qCompact.length, baseCompact.length, 1)
        : 0;
      const bestLev = Math.max(levFull, levBase);

      score = Math.max(tokenScore * 0.9, bestBg * 0.85, bestLev * 0.88);
      if (tokenScore >= 0.7 && bestBg >= 0.45) {
        score = Math.min(0.92, score + 0.06);
      }
    }

    if (isDirectMatch) directHits++;

    // D) Bonificaciones suaves por contexto (sección y cantidad) para ordenar mejor las opciones
    let rankScore = score;
    if (score >= 0.45) {
      if (sectionHint && typeKey === sectionHint) rankScore += 0.06;
      if (qty >= 2 && typeKey !== 'LEGEND') rankScore += 0.04;
      if (qty === 1 && typeKey === 'LEGEND') rankScore += 0.02;
      scored.push({ card, score: Math.min(1, Number(score.toFixed(3))), rankScore });
    }
  }

  scored.sort((a, b) => b.rankScore - a.rankScore || a.card.name.localeCompare(b.card.name));

  // Filtrar sugerencias débiles si ya hay muy buenas coincidencias
  const topScore = scored[0]?.score || 0;
  const threshold = topScore >= 0.85 ? 0.6 : 0.46;
  const suggestions = scored
    .filter((s) => s.score >= threshold)
    .slice(0, limit)
    .map(({ card, score }) => ({ card, score }));

  const reason = directHits > 1 ? 'ambiguous' : 'not_found';
  return { reason, suggestions };
}

/**
 * Reemplaza una línea concreta del texto pegado por la carta oficial elegida por el usuario,
 * conservando cantidad y prefijo SB: si lo tenía.
 */
export function replaceDeckImportLine(rawText, unmatchedItem, chosenCard) {
  if (!chosenCard || !unmatchedItem?.lineNumber) return rawText;
  const text = String(rawText || '');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const idx = unmatchedItem.lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return rawText;

  const prefix = unmatchedItem.hasSbPrefix ? 'SB: ' : '';
  const qty = Math.max(1, parseInt(unmatchedItem.qty, 10) || 1);
  lines[idx] = `${prefix}${qty}x ${chosenCard.name}`;
  return lines.join(eol);
}

function addCardToMap(targetMap, card, qty) {
  const safeQty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
  const existing = targetMap.get(card.id);
  if (existing) {
    existing.qty += safeQty;
  } else {
    targetMap.set(card.id, { ...card, qty: safeQty });
  }
}

function detectSectionHint(headerLine) {
  if (/\b(LEGENDS?|LEYENDAS?)\b/i.test(headerLine)) return 'LEGEND';
  if (/\b(UNITS?|UNIDADES?)\b/i.test(headerLine)) return 'UNIT';
  if (/\b(PROGRAMS?|PROGRAMAS?)\b/i.test(headerLine)) return 'PROGRAM';
  if (/\b(GEARS?|EQUIPO)\b/i.test(headerLine)) return 'GEAR';
  return null;
}

/**
 * Parsea un mazo desde texto plano o JSON y lo resuelve contra el catálogo oficial de cartas.
 * @returns {{
 *   detectedName: string,
 *   detectedFaction: string,
 *   cards: Array,
 *   sideboard: Array,
 *   legendsCount: number,
 *   mainCount: number,
 *   sideboardCount: number,
 *   unmatchedLines: Array<{
 *     lineNumber: number,
 *     text: string,
 *     query: string,
 *     qty: number,
 *     hasSbPrefix: boolean,
 *     reason: 'ambiguous' | 'not_found',
 *     suggestions: Array<{ card: object, score: number }>
 *   }>
 * }}
 */
export function parseImportedDeck(rawInput, allCards = []) {
  const lookup = buildCardLookup(allCards);
  const mainMap = new Map();
  const sideMap = new Map();
  const unmatchedLines = [];
  let detectedName = '';
  let detectedFaction = '';

  const text = String(rawInput || '').trim();
  if (!text) {
    return {
      detectedName: '',
      detectedFaction: '',
      cards: [],
      sideboard: [],
      legendsCount: 0,
      mainCount: 0,
      sideboardCount: 0,
      unmatchedLines: []
    };
  }

  // 1. Intento de parseo JSON si empieza por { o [
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      const pushJsonEntry = (entry, idx, targetMap, sectionHint = null) => {
        const token = typeof entry === 'string' ? entry : (entry?.id || entry?.name || entry?.slug);
        const qty = typeof entry === 'object' ? (entry?.qty || entry?.quantity || entry?.count || 1) : 1;
        const card = resolveCardFromToken(token, lookup, sectionHint);
        if (card) {
          addCardToMap(targetMap, card, qty);
        } else {
          const { reason, suggestions } = suggestCardsForQuery(token, lookup, { qty, sectionHint });
          unmatchedLines.push({
            lineNumber: null,
            text: String(token || JSON.stringify(entry)),
            query: String(token || ''),
            qty,
            hasSbPrefix: targetMap === sideMap,
            reason,
            suggestions
          });
        }
      };

      if (Array.isArray(parsed)) {
        parsed.forEach((entry, idx) => pushJsonEntry(entry, idx, mainMap));
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.name) detectedName = String(parsed.name).trim();
        if (parsed.faction) detectedFaction = String(parsed.faction).trim();

        if (Array.isArray(parsed.legends)) {
          parsed.legends.forEach((entry, idx) => pushJsonEntry(entry, idx, mainMap, 'LEGEND'));
        }
        const mainSources = [
          ...(Array.isArray(parsed.cards) ? parsed.cards : []),
          ...(Array.isArray(parsed.deckList) ? parsed.deckList : []),
          ...(Array.isArray(parsed.main) ? parsed.main : [])
        ];
        mainSources.forEach((entry, idx) => pushJsonEntry(entry, idx, mainMap));

        const sideSources = Array.isArray(parsed.sideboard) ? parsed.sideboard : [];
        sideSources.forEach((entry, idx) => pushJsonEntry(entry, idx, sideMap));
      }

      return finalizeDeckResult(detectedName, detectedFaction, mainMap, sideMap, unmatchedLines);
    } catch {
      // Si no era JSON válido, continuar como texto plano
    }
  }

  // 2. Parseo línea por línea (TXT / DEC / CSV / formato exportado de cyberpunktcg.es)
  // Usamos rawInput sin trim inicial para que lineNumber coincida 1:1 con las líneas del textarea
  const lines = String(rawInput || '').split(/\r?\n/);
  let currentSection = 'MAIN'; // 'MAIN' | 'SIDEBOARD'
  let currentSectionHint = null; // 'LEGEND' | 'UNIT' | 'PROGRAM' | 'GEAR' | null

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    // Detectar metadatos de cabecera (nombre / facción, incluso en la misma línea separados por |)
    const factionMatch = trimmed.match(/(?:FACCI[ÓO]N|FACTION)\s*:\s*([^|]+)/i);
    if (factionMatch && !detectedFaction) {
      detectedFaction = factionMatch[1].trim();
    }

    const nameMatch = trimmed.match(/^(?:\/\/|#)?\s*(?:MAZO|DECK|NOMBRE|NAME)\s*:\s*(.+)$/i);
    if (nameMatch) {
      const candidate = nameMatch[1].replace(/\|.*$/, '').trim();
      if (candidate && !detectedName) detectedName = candidate;
      return;
    }

    if (/^(?:\/\/|#)?\s*(?:FACCI[ÓO]N|FACTION)\s*:/i.test(trimmed)) {
      return;
    }

    // Detectar cambios de sección (Banquillo / Sideboard vs Baraja Principal / Leyendas)
    const isCommentLine =
      trimmed.startsWith('//') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('#');
    const isStandaloneSideboard =
      /^(?:(?:\/\/|#|=+|-+|\*+)\s*)?(?:SIDEBOARD|BANQUILLO)(?:\s*\/\s*(?:SIDEBOARD|BANQUILLO))?(?:\s*\(\d+\)|\s*:\s*\d*|\s*[-=*]*)$/i.test(
        trimmed
      );
    const isStandaloneMainHeader =
      /^(?:(?:\/\/|#|=+|-+|\*+)\s*)?(?:MAIN\s*DECK|BARAJA\s*PRINCIPAL|MAZO\s*PRINCIPAL|LEGENDS?|LEYENDAS?|UNITS?|UNIDADES?|PROGRAMS?|PROGRAMAS?|GEARS?|EQUIPO)(?:\s*\/\s*[A-ZÁÉÍÓÚÑ\s]+)?(?:\s*\(\d+\)|\s*:\s*\d*|\s*[-=*]*)$/i.test(
        trimmed
      );

    if (isStandaloneSideboard || (isCommentLine && /\b(SIDEBOARD|BANQUILLO)\b/i.test(trimmed))) {
      currentSection = 'SIDEBOARD';
      currentSectionHint = null;
      return;
    }
    if (
      isStandaloneMainHeader ||
      (isCommentLine &&
        /\b(MAIN\s*DECK|BARAJA\s*PRINCIPAL|MAZO\s*PRINCIPAL|LEGENDS?|LEYENDAS?|UNITS?|UNIDADES?|PROGRAMS?|PROGRAMAS?|GEARS?|EQUIPO)\b/i.test(
          trimmed
        ))
    ) {
      currentSection = 'MAIN';
      currentSectionHint = detectSectionHint(trimmed);
      return;
    }

    // Ignorar comentarios, separadores o cabeceras CSV
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      /^[-=_\s*]+$/.test(trimmed) ||
      /^(?:qty|cantidad|count)\s*[,;\t]/i.test(trimmed) ||
      /^(?:card|carta|name|nombre)\s*[,;\t]/i.test(trimmed)
    ) {
      return;
    }

    // Quitar viñetas iniciales (-, *, •) y prefijo opcional "SB:"
    let line = trimmed.replace(/^[-*•]+\s*/, '').trim();
    let targetSection = currentSection;
    let hasSbPrefix = false;
    if (/^SB\s*:\s*/i.test(line)) {
      targetSection = 'SIDEBOARD';
      hasSbPrefix = true;
      line = line.replace(/^SB\s*:\s*/i, '').trim();
    }

    let qty = 1;
    let cardQuery = line;
    let parsedAsCsv = false;

    // Formato CSV: "3,Sketchy Ripper" o "Sketchy Ripper,3" (solo si una columna es puramente numérica)
    if (line.includes(',') || line.includes(';') || line.includes('\t')) {
      const parts = line
        .split(/[,;\t]/)
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      if (parts.length >= 2) {
        if (/^\d+$/.test(parts[0])) {
          qty = parseInt(parts[0], 10);
          cardQuery = parts[1];
          parsedAsCsv = true;
        } else if (/^\d+$/.test(parts[1])) {
          cardQuery = parts[0];
          qty = parseInt(parts[1], 10);
          parsedAsCsv = true;
        }
      }
    }

    if (!parsedAsCsv) {
      // Formatos estándar:
      // "3x Card Name", "3 x Card Name", "3 Card Name"
      const leadQty = line.match(/^(\d+)\s*[xX×]?\s+(.+)$/);
      // "Card Name x3", "Card Name 3x", "Card Name (3)"
      const trailQty = line.match(/^(.+?)\s+(?:[xX×]\s*(\d+)|(\d+)\s*[xX×]|\((\d+)\))$/);

      if (leadQty) {
        qty = parseInt(leadQty[1], 10);
        cardQuery = leadQty[2].trim();
      } else if (trailQty) {
        cardQuery = trailQty[1].trim();
        qty = parseInt(trailQty[2] || trailQty[3] || trailQty[4], 10);
      }
    }

    const activeHint = targetSection === 'SIDEBOARD' ? null : currentSectionHint;
    const card = resolveCardFromToken(cardQuery, lookup, activeHint);
    if (card) {
      addCardToMap(targetSection === 'SIDEBOARD' ? sideMap : mainMap, card, qty);
    } else {
      const { reason, suggestions } = suggestCardsForQuery(cardQuery, lookup, {
        qty,
        sectionHint: activeHint,
        limit: 4
      });
      unmatchedLines.push({
        lineNumber: lineNum,
        text: trimmed,
        query: cardQuery,
        qty,
        hasSbPrefix,
        reason,
        suggestions
      });
    }
  });

  return finalizeDeckResult(detectedName, detectedFaction, mainMap, sideMap, unmatchedLines);
}

function finalizeDeckResult(detectedName, detectedFaction, mainMap, sideMap, unmatchedLines) {
  const allMain = Array.from(mainMap.values());
  const legends = allMain.filter(isLegendCard);
  const nonLegends = allMain.filter((c) => !isLegendCard(c));
  const orderedCards = [...legends, ...nonLegends];
  const sideboard = Array.from(sideMap.values());

  const legendsCount = legends.reduce((sum, c) => sum + (c.qty || 1), 0);
  const mainCount = nonLegends.reduce((sum, c) => sum + (c.qty || 1), 0);
  const sideboardCount = sideboard.reduce((sum, c) => sum + (c.qty || 1), 0);

  return {
    detectedName,
    detectedFaction,
    cards: orderedCards,
    sideboard,
    legendsCount,
    mainCount,
    sideboardCount,
    unmatchedLines
  };
}
