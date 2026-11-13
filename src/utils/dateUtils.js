/**
 * Utilidades para parsear fechas de torneos en formatos libres (español, inglés, ISO)
 * y clasificar automáticamente los torneos entre "Próximos" (ordenados de más cercano a más lejano)
 * e "Histórico" (torneos cuya fecha ya ha pasado o cuyo estado es FINALIZADO).
 */

const MONTHS = {
  ene: 0, enero: 0, jan: 0, january: 0,
  feb: 1, febrero: 1, february: 1,
  mar: 2, marzo: 2, march: 2,
  abr: 3, abril: 3, apr: 3, april: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5, june: 5,
  jul: 6, julio: 6, july: 6,
  ago: 7, agosto: 7, aug: 7, august: 7,
  sep: 8, sept: 8, septiembre: 8, septe: 8, september: 8,
  oct: 9, octubre: 9, october: 9,
  nov: 10, noviembre: 10, november: 10,
  dic: 11, diciembre: 11, dec: 11, december: 11
};

/**
 * Convierte un texto de fecha (ej: '06 DIC', '2026-12-06', '30 NOV • 18:00', '15/11/2026')
 * en un objeto Date con la hora fijada al final del día (23:59:59).
 */
export function parseTournamentDate(dateStr, dateIso) {
  if (dateIso && typeof dateIso === 'string') {
    const d = new Date(`${dateIso.trim()}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }

  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().toLowerCase();

  // 1. Formato ISO: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10),
      23, 59, 59
    );
  }

  // 2. Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return new Date(
      parseInt(dmyMatch[3], 10),
      parseInt(dmyMatch[2], 10) - 1,
      parseInt(dmyMatch[1], 10),
      23, 59, 59
    );
  }

  // 3. Formato textual en español/inglés: '06 DIC', '30 NOV 2026', '15 de Diciembre'
  const words = clean.split(/[^a-z0-9]+/);
  let day = null;
  let month = null;
  let year = null;

  for (const w of words) {
    if (!w) continue;
    if (day === null && /^\d{1,2}$/.test(w)) {
      day = parseInt(w, 10);
    } else if (/^\d{4}$/.test(w)) {
      year = parseInt(w, 10);
    } else if (month === null) {
      if (MONTHS[w] !== undefined) {
        month = MONTHS[w];
      } else if (w.length >= 3 && MONTHS[w.slice(0, 3)] !== undefined) {
        month = MONTHS[w.slice(0, 3)];
      }
    }
  }

  if (day !== null && month !== null) {
    const now = new Date();
    if (year === null) {
      year = now.getFullYear();
      // Si el mes especificado ya pasó hace más de 2 meses respecto a la fecha actual, asumimos el año siguiente
      if (month < now.getMonth() - 2) {
        year += 1;
      }
    }
    return new Date(year, month, day, 23, 59, 59);
  }

  // 4. Fallback con Date.parse estándar
  const fallback = Date.parse(dateStr);
  return isNaN(fallback) ? null : new Date(fallback);
}

/**
 * Determina si un torneo ya ha finalizado por fecha o por estado explícito.
 */
export function isTournamentPast(tour) {
  if (!tour) return false;
  if (String(tour.status || '').toUpperCase() === 'FINALIZADO') {
    return true;
  }

  const parsed = parseTournamentDate(tour.date, tour.dateIso);
  if (!parsed) return false;

  const now = new Date();
  // Compara contra las 00:00:00 del día actual (si el torneo es hoy, sigue activo)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return parsed.getTime() < todayStart.getTime();
}

/**
 * Separa los torneos entre próximos e históricos, y los ordena automáticamente:
 * - Próximos: ascendente por fecha (el más cercano a hoy primero).
 * - Histórico: descendente por fecha (el más recientemente finalizado primero).
 */
export function splitAndSortTournaments(allTournaments = [], rawPastTournaments = []) {
  const upcoming = [];
  const autoPast = [];

  const nowTime = new Date().getTime();

  for (const t of allTournaments) {
    if (isTournamentPast(t)) {
      autoPast.push({
        ...t,
        status: 'FINALIZADO',
        isAutoPast: true
      });
    } else {
      upcoming.push(t);
    }
  }

  // 1. Ordenar Próximos Torneos: Los más cercanos a la fecha actual primero (ascendente)
  upcoming.sort((a, b) => {
    const da = parseTournamentDate(a.date, a.dateIso);
    const db = parseTournamentDate(b.date, b.dateIso);
    const ta = da ? da.getTime() : Infinity;
    const tb = db ? db.getTime() : Infinity;
    return ta - tb;
  });

  // 2. Unir Histórico (los de pastTournaments explícitos + los auto-finalizados por fecha)
  // Evitar duplicados por id
  const existingIds = new Set();
  const combinedPast = [];

  for (const p of [...autoPast, ...rawPastTournaments]) {
    const key = p.id || `${p.name}-${p.date}`;
    if (!existingIds.has(key)) {
      existingIds.add(key);
      combinedPast.push(p);
    }
  }

  // 3. Ordenar Histórico: Los más recientes primero (descendente)
  combinedPast.sort((a, b) => {
    const da = parseTournamentDate(a.date, a.dateIso);
    const db = parseTournamentDate(b.date, b.dateIso);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return tb - ta;
  });

  return {
    upcomingTournaments: upcoming,
    pastTournaments: combinedPast
  };
}
