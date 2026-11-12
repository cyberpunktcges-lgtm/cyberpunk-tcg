import fs from 'node:fs/promises';
import path from 'node:path';
import { isRequestAuthenticated } from '../../utils/auth.js';

export const prerender = false;

const CMS_FILE = path.resolve(process.cwd(), 'src/data/cms.json');

async function readCmsData() {
  const raw = await fs.readFile(CMS_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeCmsData(data) {
  await fs.writeFile(CMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const data = await readCmsData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error leyendo base de datos CMS', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, section, item, id, heroArticle, altArtCards, forumUrl, articleId, isHero } =
      body;

    // Acción pública: contabilizar visita real a una noticia cuando un lector la abre
    if (action === 'increment_view') {
      const cms = await readCmsData();

      if (isHero || (articleId && cms.heroArticle?.id === articleId)) {
        const current = Number(cms.heroArticle.viewsCount) || 0;
        const next = current + 1;
        cms.heroArticle.viewsCount = next;
        cms.heroArticle.views = `${next} ${next === 1 ? 'VISITA' : 'VISITAS'}`;
      } else if (articleId && Array.isArray(cms.news)) {
        cms.news = cms.news.map((n) => {
          if (n.id === articleId) {
            const current = Number(n.viewsCount) || 0;
            const next = current + 1;
            return {
              ...n,
              viewsCount: next,
              views: `${next} ${next === 1 ? 'VISITA' : 'VISITAS'}`
            };
          }
          return n;
        });
      }

      await writeCmsData(cms);
      return new Response(JSON.stringify({ ok: true, data: cms }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Todas las demás acciones de edición requieren sesión de administrador
    if (!isRequestAuthenticated(request)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Inicia sesión como administrador.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cms = await readCmsData();

    if (action === 'update_hero' && heroArticle) {
      const currentCount = Number(cms.heroArticle?.viewsCount) || 0;
      cms.heroArticle = {
        ...cms.heroArticle,
        ...heroArticle,
        viewsCount: currentCount,
        views: `${currentCount} ${currentCount === 1 ? 'VISITA' : 'VISITAS'}`
      };
    } else if (action === 'update_alt_art' && Array.isArray(altArtCards)) {
      cms.altArtCards = altArtCards.slice(0, 3);
    } else if (action === 'update_forum_url' && typeof forumUrl === 'string') {
      cms.forumUrl = forumUrl.trim();
    } else if (action === 'create' && section) {
      if (!Array.isArray(cms[section])) {
        cms[section] = [];
      }
      const prefix =
        section === 'news'
          ? 'NEWS-'
          : section === 'decks'
            ? 'DECK-'
            : section === 'pastTournaments'
              ? 'HIST-'
              : 'TOUR-';
      const newItem = {
        ...item,
        id: item.id || `${prefix}${Date.now().toString().slice(-4)}`,
        ...(section === 'news' ? { viewsCount: 0, views: '0 VISITAS' } : {})
      };
      cms[section] = [newItem, ...cms[section]];
    } else if (action === 'update' && section && Array.isArray(cms[section])) {
      cms[section] = cms[section].map((existing) =>
        existing.id === item.id ? { ...existing, ...item } : existing
      );
    } else if (action === 'delete' && section && Array.isArray(cms[section]) && id) {
      cms[section] = cms[section].filter((existing) => existing.id !== id);
    } else if (action === 'reorder' && section && Array.isArray(body.items)) {
      cms[section] = body.items;
    } else if (action === 'replace_all' && body.data) {
      await writeCmsData(body.data);
      return new Response(JSON.stringify({ ok: true, data: body.data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Acción o sección inválida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await writeCmsData(cms);

    return new Response(JSON.stringify({ ok: true, data: cms }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error guardando en CMS', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
