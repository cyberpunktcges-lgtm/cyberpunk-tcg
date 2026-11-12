import fs from 'node:fs/promises';
import path from 'node:path';
import { isRequestAuthenticated } from '../../utils/auth.js';
import { enrichCardObject } from '../../utils/cardMetadata.js';

export const prerender = false;

const CARDS_FILE = path.resolve(process.cwd(), 'src/data/cards.json');
const GITHUB_API_URL =
  'https://api.github.com/repos/cyberpunktcges-lgtm/cyberpunk-tcg-cartas/contents';

export async function GET({ url }) {
  try {
    const raw = await fs.readFile(CARDS_FILE, 'utf-8');
    let cards = JSON.parse(raw).map((c, idx) => enrichCardObject(c, idx));

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
          (c.cardId || '').toLowerCase().includes(q) ||
          (c.cardType || '').toLowerCase().includes(q) ||
          (c.artist || '').toLowerCase().includes(q) ||
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

  // Guardar correcciones manuales de una carta (desde /admin) en el catálogo
  let body = null;
  try {
    body = await request.json();
  } catch {}

  if (body?.action === 'update_card' && body.slug) {
    try {
      const raw = await fs.readFile(CARDS_FILE, 'utf-8');
      const cards = JSON.parse(raw);
      const idx = cards.findIndex((c) => c.slug === body.slug);
      if (idx === -1) {
        return new Response(JSON.stringify({ ok: false, error: 'Carta no encontrada' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const allowed = ['name', 'cardId', 'cardType', 'edition', 'artist', 'collection'];
      for (const key of allowed) {
        if (typeof body.fields?.[key] === 'string') {
          cards[idx][key] = body.fields[key].trim();
        }
      }
      await fs.writeFile(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');
      return new Response(JSON.stringify({ ok: true, card: cards[idx] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Error guardando la carta', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    // Conservar las correcciones existentes al re-sincronizar
    let existingBySlug = {};
    try {
      const prev = JSON.parse(await fs.readFile(CARDS_FILE, 'utf-8'));
      existingBySlug = Object.fromEntries(prev.map((c) => [c.slug, c]));
    } catch {}

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
        const prev = existingBySlug[slug] || {};
        return enrichCardObject(
          {
            name: prev.name,
            cardId: prev.cardId,
            cardType: prev.cardType,
            edition: prev.edition,
            artist: prev.artist,
            collection: prev.collection,
            id: `CP-${String(idx + 1).padStart(3, '0')}`,
            slug,
            fileName: item.name,
            image: item.download_url,
            githubUrl: item.html_url,
            size: item.size
          },
          idx
        );
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
