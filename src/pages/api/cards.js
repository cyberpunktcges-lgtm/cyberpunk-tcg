import fs from 'node:fs/promises';
import path from 'node:path';
import { isRequestAuthenticated } from '../../utils/auth.js';

export const prerender = false;

const CARDS_FILE = path.resolve(process.cwd(), 'src/data/cards.json');
const GITHUB_API_URL =
  'https://api.github.com/repos/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/contents';

function toTitle(fileName) {
  return fileName
    .replace(/\.(webp|png|jpg|jpeg)$/i, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function detectFaction(slug) {
  const s = slug.toLowerCase();
  if (
    s.includes('arasaka') ||
    s.includes('yorinobu') ||
    s.includes('takemura') ||
    s.includes('smasher') ||
    s.includes('militech') ||
    s.includes('zetatech') ||
    s.includes('kang-tao') ||
    s.includes('trauma') ||
    s.includes('netwatch') ||
    s.includes('maxtac')
  ) {
    return 'CORPO';
  }
  if (
    s.includes('alt-cunningham') ||
    s.includes('lucy') ||
    s.includes('kiwi') ||
    s.includes('t-bug') ||
    s.includes('songbird') ||
    s.includes('daemon') ||
    s.includes('netrunner') ||
    s.includes('ice') ||
    s.includes('cyberdeck') ||
    s.includes('voodoo') ||
    s.includes('bartmoss')
  ) {
    return 'NETRUNNER';
  }
  if (
    s.includes('maelstrom') ||
    s.includes('royce') ||
    s.includes('dum-dum') ||
    s.includes('brick') ||
    s.includes('totentanz') ||
    s.includes('animals') ||
    s.includes('tyger') ||
    s.includes('valentinos') ||
    s.includes('6th-street') ||
    s.includes('wraith') ||
    s.includes('aldecados') ||
    s.includes('mox')
  ) {
    return 'BANDAS';
  }
  return 'MERCENARIO';
}

export async function GET({ url }) {
  try {
    const raw = await fs.readFile(CARDS_FILE, 'utf-8');
    let cards = JSON.parse(raw);

    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const faction = (url.searchParams.get('faction') || 'TODOS').toUpperCase();

    if (faction && faction !== 'TODOS') {
      cards = cards.filter((c) => c.faction === faction);
    }

    if (q) {
      cards = cards.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.faction.toLowerCase().includes(q)
      );
    }

    return new Response(
      JSON.stringify({
        total: cards.length,
        repository: 'https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas',
        cards
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error cargando cartas', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST({ request }) {
  if (!isRequestAuthenticated(request)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No autorizado. Inicia sesión como administrador.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Cyberpunk-TCG-Portal'
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded with ${res.status}`);
    }

    const items = await res.json();
    const cards = items
      .filter((item) => /\.(webp|png|jpg|jpeg)$/i.test(item.name))
      .map((item, idx) => {
        const slug = item.name.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        return {
          id: `CP-${String(idx + 1).padStart(3, '0')}`,
          slug,
          name: toTitle(item.name),
          fileName: item.name,
          faction: detectFaction(slug),
          image: item.download_url,
          githubUrl: item.html_url,
          size: item.size
        };
      });

    await fs.writeFile(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');

    return new Response(
      JSON.stringify({
        ok: true,
        total: cards.length,
        cards
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Error sincronizando con GitHub',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
