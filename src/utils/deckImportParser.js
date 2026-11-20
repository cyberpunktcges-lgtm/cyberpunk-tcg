/**
 * deckImportParser.js
 * Parser universal de listas de mazos para Cyberpunk TCG (Set 01 - Welcome to Night City).
 * Soporta texto plano (.txt, .dec, .csv, .md) y JSON (.json), incluyendo:
 * - Exportaciones propias de cyberpunktcg.es (`// MAZO: ...`, `3x Nombre (#ID) [Aspect]`)
 * - Formatos estándar de comunidad (`3x Nombre`, `3 Nombre`, `Nombre x3`, `1x CP-054`, `Nombre,3`, etc.)
 * - Separación automática de secciones: Baraja Principal (incl. Leyendas) y Banquillo / Sideboard.
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

function isLegendCard(card) {
  return (
    String(card?.officialType || '').toUpperCase() === 'LEGEND' ||
    String(card?.cardType || '').toUpperCase().includes('LEGEND')
  );
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

    normalizedList.push({ card, normName, slugKey });
  }

  return { byId, byCardId, byExactNormName, bySlug, normalizedList };
}

/**
 * Resuelve un texto (nombre, ID tipo CP-001, o cardId tipo #006 / β062) contra el catálogo oficial.
 */
function resolveCardFromToken(rawQuery, lookup) {
  if (!rawQuery) return null;
  let q = String(rawQuery).trim();

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
  const cleaned = q
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .trim();

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

  const containsMatches = lookup.normalizedList.filter((item) => item.normName.includes(norm));
  if (containsMatches.length === 1) return containsMatches[0].card;

  // 5. Coincidencia inversa: el texto introducido contiene el nombre completo de una carta
  const reverseMatches = lookup.normalizedList
    .filter((item) => item.normName.length >= 4 && norm.includes(item.normName))
    .sort((a, b) => b.normName.length - a.normName.length);
  if (reverseMatches.length > 0) return reverseMatches[0].card;

  return null;
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
 *   unmatchedLines: Array<{ lineNumber: number, text: string }>
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
      if (Array.isArray(parsed)) {
        parsed.forEach((entry, idx) => {
          const token = typeof entry === 'string' ? entry : (entry?.id || entry?.name || entry?.slug);
          const qty = typeof entry === 'object' ? (entry?.qty || entry?.quantity || entry?.count || 1) : 1;
          const card = resolveCardFromToken(token, lookup);
          if (card) addCardToMap(mainMap, card, qty);
          else unmatchedLines.push({ lineNumber: idx + 1, text: JSON.stringify(entry) });
        });
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.name) detectedName = String(parsed.name).trim();
        if (parsed.faction) detectedFaction = String(parsed.faction).trim();

        const mainSources = [
          ...(Array.isArray(parsed.legends) ? parsed.legends : []),
          ...(Array.isArray(parsed.cards) ? parsed.cards : []),
          ...(Array.isArray(parsed.deckList) ? parsed.deckList : []),
          ...(Array.isArray(parsed.main) ? parsed.main : [])
        ];
        mainSources.forEach((entry, idx) => {
          const token = typeof entry === 'string' ? entry : (entry?.id || entry?.name || entry?.slug);
          const qty = typeof entry === 'object' ? (entry?.qty || entry?.quantity || entry?.count || 1) : 1;
          const card = resolveCardFromToken(token, lookup);
          if (card) addCardToMap(mainMap, card, qty);
          else unmatchedLines.push({ lineNumber: idx + 1, text: String(token || '') });
        });

        const sideSources = Array.isArray(parsed.sideboard) ? parsed.sideboard : [];
        sideSources.forEach((entry, idx) => {
          const token = typeof entry === 'string' ? entry : (entry?.id || entry?.name || entry?.slug);
          const qty = typeof entry === 'object' ? (entry?.qty || entry?.quantity || entry?.count || 1) : 1;
          const card = resolveCardFromToken(token, lookup);
          if (card) addCardToMap(sideMap, card, qty);
          else unmatchedLines.push({ lineNumber: idx + 1, text: String(token || '') });
        });
      }

      return finalizeDeckResult(detectedName, detectedFaction, mainMap, sideMap, unmatchedLines);
    } catch {
      // Si no era JSON válido, continuar como texto plano
    }
  }

  // 2. Parseo línea por línea (TXT / DEC / CSV / formato exportado de cyberpunktcg.es)
  const lines = text.split(/\r?\n/);
  let currentSection = 'MAIN'; // 'MAIN' | 'SIDEBOARD'

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
    if (/^SB\s*:\s*/i.test(line)) {
      targetSection = 'SIDEBOARD';
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

    const card = resolveCardFromToken(cardQuery, lookup);
    if (card) {
      addCardToMap(targetSection === 'SIDEBOARD' ? sideMap : mainMap, card, qty);
    } else {
      unmatchedLines.push({ lineNumber: lineNum, text: trimmed });
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
