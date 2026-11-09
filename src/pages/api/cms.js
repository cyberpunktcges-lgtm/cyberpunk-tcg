import fs from 'node:fs/promises';
import path from 'node:path';

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
    const cms = await readCmsData();

    const { action, section, item, id, heroArticle } = body;

    if (action === 'update_hero' && heroArticle) {
      cms.heroArticle = { ...cms.heroArticle, ...heroArticle };
    } else if (action === 'create' && section && Array.isArray(cms[section])) {
      const prefix =
        section === 'news' ? 'NEWS-' : section === 'decks' ? 'DECK-' : 'TOUR-';
      const newItem = {
        ...item,
        id: item.id || `${prefix}${Date.now().toString().slice(-4)}`
      };
      cms[section] = [newItem, ...cms[section]];
    } else if (action === 'update' && section && Array.isArray(cms[section])) {
      cms[section] = cms[section].map((existing) =>
        existing.id === item.id ? { ...existing, ...item } : existing
      );
    } else if (action === 'delete' && section && Array.isArray(cms[section]) && id) {
      cms[section] = cms[section].filter((existing) => existing.id !== id);
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
