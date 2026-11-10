// Utilidad para autocompletar metadatos de cartas de Cyberpunk TCG
// a partir del slug, nombre de archivo o URL de GitHub (blob o raw).
//
// IMPORTANTE: aquí SOLO se guardan datos verificados en fuentes públicas
// (cyberpunktcg.com, cyberpunktcg.gg, nightcity.es, TCGplayer).
// Si un dato no está verificado se deja vacío para que el administrador lo complete
// en /admin. Las correcciones guardadas desde /admin se almacenan en src/data/cards.json
// y tienen prioridad sobre esta tabla.

export const DEFAULT_COLLECTION = 'Welcome to Night City (Set 01)';

// Formato:
//   cardType -> TIPO // SUBTIPOS impresos (ej: PROGRAM // BRAINDANCE)
//   cardId   -> número de coleccionista oficial
//   edition  -> rareza
export const VERIFIED_CARD_METADATA = {
  '6th-street-recruits': { cardType: 'UNIT // 6TH STREET • GANGER', artist: 'Daniel Valaisis', cardId: '#006', edition: 'Common' },
  'adam-smasher-metal-over-meat': { cardType: 'UNIT', cardId: '#041' },
  'adrenaline-converter': { cardType: 'GEAR // CYBERWARE • MEDTECH', artist: 'ADIA', cardId: '#059', edition: 'Common' },
  'afterparty-at-lizzie-s': { cardType: 'PROGRAM // BRAINDANCE • MOX', artist: 'Alicja Użarowska', cardId: '#065', edition: 'Common' },
  'all-is-lost': { cardType: 'PROGRAM // ZETATECH', artist: 'Fabrizio De Tommaso', cardId: '#027', edition: 'Common' },
  'alt-cunningham-mother-of-daemons': { cardType: 'UNIT // NETRUNNER • AI', artist: 'Łukasz Poller' },
  'alt-cunningham-soulkiller-architect': { cardType: 'LEGEND // NETRUNNER', artist: 'Pandart Studio' },
  'animals-wrecker': { cardType: 'UNIT // ANIMAL • GANGER', cardId: '#007', edition: 'Common' },
  'appetite-for-destruction': { cardType: 'PROGRAM // GANGER', cardId: '#028', edition: 'Uncommon' },
  'arasaka-emergency-radioport': { cardType: 'GEAR', artist: 'ADIA', cardId: '#023', edition: 'Common' },
  'augmented-negotiators': { cardType: 'UNIT // ARASAKA • CORPO', artist: 'Bernard Kowalczuk', cardId: '#043', edition: 'Common' },
  'bonnie-and-clyde': { cardType: 'PROGRAM // BRAINDANCE', artist: 'Rion Chow', cardId: '#029', edition: 'Uncommon' },
  'bootleg-black-sapphire-show': { cardType: 'PROGRAM // BRAINDANCE', artist: 'ADIA', cardId: '#066', edition: 'Uncommon' },
  'caliber-totentanz-s-top-dog': { cardType: 'UNIT', artist: "André Lima Araújo & Chris O'Halloran", cardId: '#044', edition: 'Rare' },
  'carnage-at-the-colosseum': { cardType: 'PROGRAM // BRAINDANCE', artist: 'Matías Bergara', cardId: '#030' },
  'chrome-fang': { cardType: 'UNIT', artist: 'Bernard Kowalczuk', cardId: '#008', edition: 'Common' },
  'chrome-reverie': { cardType: 'PROGRAM // BRAINDANCE', cardId: '#131' },
  'corpo-security': { cardType: 'UNIT // CORPO', cardId: '#076', edition: 'Common' },
  'corporate-surveillance': { cardType: 'PROGRAM // CORPO', artist: 'John Liew', cardId: '#097', edition: 'Uncommon' },
  'cyberpsychosis': { cardType: 'PROGRAM', artist: 'Michal Ivan', cardId: '#067', edition: 'Uncommon' },
  'deadman-transmitter': { cardType: 'GEAR', artist: 'ADIA', cardId: '#024', edition: 'Uncommon' },
  'delamain-cab': { cardType: 'UNIT // VEHICLE', cardId: '#112', edition: 'Common' },
  'delamain-rideshare-ai': { cardType: 'UNIT // AI', artist: 'Łukasz Wiktorzak', cardId: '#111', edition: 'Uncommon' },
  'detonate': { cardType: 'PROGRAM', artist: 'Michal Ivan', cardId: '#031' },
  'dexter-deshawn-off-the-grid': { cardType: 'LEGEND // FIXER', edition: 'Rare' },
  'dexter-deshawn-one-last-chance': { cardType: 'UNIT // FIXER', artist: 'Mooncolony', edition: 'Uncommon (Starter The Heist)' },
  'dont-fear-the-reaper': { cardType: 'PROGRAM', artist: 'Alex Eckman-Lawn', cardId: '#098' },
  'dum-dum-maelstrom-triggerman': { cardType: 'LEGEND', artist: 'Łukasz Poller', cardId: '#036', edition: 'Rare' },
  'dying-night-v-s-pistol': { cardType: 'GEAR', artist: 'Ivan Shavrin', cardId: '#128', edition: 'Rare' },
  'el-sombrero-n-la-venganza-lenta': { name: 'El Sombrerón // La Venganza Lenta', cardType: 'UNIT // GANGER • VALENTINO', artist: 'Rafael de Latorre & Clonerh', cardId: '#009', edition: 'Rare' },
  'emergency-atlus': { cardType: 'UNIT // TRAUMA TEAM • VEHICLE • ZETATECH', artist: 'Robert Sammelin', cardId: '#077', edition: 'Common' },
  'evelyn-parker-beautiful-enigma': { cardType: 'LEGEND // DOLL', artist: 'Daniel Valaisis', cardId: 'B107', edition: 'Rare' },
  'evelyn-parker-scheming-siren': { cardType: 'UNIT // DOLL', artist: 'Olgierd Ciszak', edition: 'Uncommon' },
  'field-operator': { cardType: 'UNIT // ARASAKA • CORPO • TECHIE', artist: 'Michal Ivan', cardId: '#078', edition: 'Common' },
  'floor-it': { cardType: 'PROGRAM', artist: 'Dofresh', cardId: '#132', edition: 'Common' },
  'fool-on-the-hill': { cardType: 'PROGRAM // MERC', artist: 'Dofresh', cardId: '#099', edition: 'Rare' },
  'gilded-mato-n': { cardType: 'UNIT // GANGER • VALENTINO', artist: 'Josan Gonzalez', cardId: '#045', edition: 'Common' },
  'gorilla-arms': { cardType: 'GEAR // CYBERWARE', artist: 'TOPDOG Entertainment', cardId: '#060', edition: 'Common' },
  'goro-takemura-hands-unclean': { cardType: 'LEGEND', artist: 'Bad Moon Art Studio' },
  'towerfall': { cardType: 'PROGRAM // BRAINDANCE', artist: 'Dardo Studios', cardId: '#138', edition: 'Epic Rare' }
};

export function cleanTitleFromSlug(slug) {
  if (VERIFIED_CARD_METADATA[slug]?.name) return VERIFIED_CARD_METADATA[slug].name;
  return slug
    .replace(/\.(webp|png|jpg|jpeg)$/i, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// La facción solo se usa para los filtros internos del portal (no se muestra como dato oficial)
export function inferFactionFromSlug(slug) {
  const s = slug.toLowerCase();
  if (/arasaka|yorinobu|takemura|smasher|militech|zetatech|kang-tao|trauma|netwatch|maxtac/.test(s)) return 'CORPO';
  if (/alt-cunningham|lucy|kiwi|t-bug|songbird|daemon|netrunner|cyberdeck|voodoo|bartmoss/.test(s)) return 'NETRUNNER';
  if (/maelstrom|royce|dum-dum|brick|totentanz|animals|tyger|valentino|6th-street|wraith|aldecaldos|mox/.test(s)) return 'BANDAS';
  return 'MERCENARIO';
}

/**
 * Prioridad de cada campo:
 *   1) dato guardado en cards.json (correcciones hechas desde /admin)
 *   2) dato verificado de VERIFIED_CARD_METADATA
 *   3) vacío ('') -> pendiente de completar
 */
export function enrichCardObject(card, indexZeroBased = 0) {
  const fileName = card.fileName || (card.image ? card.image.split('/').pop() : '');
  const slug = (card.slug || fileName.replace(/\.(webp|png|jpg|jpeg)$/i, '')).toLowerCase();
  const meta = VERIFIED_CARD_METADATA[slug] || {};
  const id = card.id || `CP-${String(indexZeroBased + 1).padStart(3, '0')}`;

  return {
    ...card,
    id,
    slug,
    name: card.name || meta.name || cleanTitleFromSlug(slug),
    cardId: card.cardId || meta.cardId || '',
    cardType: card.cardType || meta.cardType || '',
    faction: card.faction || inferFactionFromSlug(slug),
    edition: card.edition || meta.edition || '',
    artist: card.artist || meta.artist || '',
    collection: card.collection || DEFAULT_COLLECTION
  };
}

/**
 * Convierte cualquier URL de GitHub (blob o raw) o nombre de archivo en los metadatos de la carta
 */
export function resolveCardFromGithubUrl(rawInput, cardsCatalog = []) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let normalizedImageUrl = trimmed;
  let normalizedGithubUrl = trimmed;

  const ghBlobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  const ghRawMatch = trimmed.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);

  if (ghBlobMatch) {
    const [, owner, repo, branch, filePath] = ghBlobMatch;
    normalizedImageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  } else if (ghRawMatch) {
    const [, owner, repo, branch, filePath] = ghRawMatch;
    normalizedGithubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
  }

  const cleanUrl = normalizedImageUrl.split('?')[0].split('#')[0];
  const fileName = decodeURIComponent(cleanUrl.split('/').pop() || '');
  const slug = fileName.replace(/\.(webp|png|jpg|jpeg)$/i, '').toLowerCase();
  if (!slug) return null;

  const existingIndex = cardsCatalog.findIndex(
    (c) => c.slug?.toLowerCase() === slug || c.fileName?.toLowerCase() === fileName.toLowerCase()
  );

  if (existingIndex !== -1) {
    const found = enrichCardObject(cardsCatalog[existingIndex], existingIndex);
    return {
      ...found,
      image: found.image || normalizedImageUrl,
      githubUrl: found.githubUrl || normalizedGithubUrl
    };
  }

  const isUrl = trimmed.startsWith('http') || trimmed.startsWith('/');
  return enrichCardObject(
    {
      id: 'CP-NEW',
      slug,
      fileName: `${slug}.webp`,
      image: isUrl
        ? normalizedImageUrl
        : `https://raw.githubusercontent.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/main/${slug}.webp`,
      githubUrl: isUrl
        ? normalizedGithubUrl
        : `https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/blob/main/${slug}.webp`
    },
    0
  );
}
