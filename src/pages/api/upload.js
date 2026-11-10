import fs from 'node:fs/promises';
import path from 'node:path';
import { isRequestAuthenticated } from '../../utils/auth.js';

export const prerender = false;

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/images/uploads');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function listUploadedFiles() {
  await ensureUploadDir();
  const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => `/images/uploads/${entry.name}`)
    .reverse();
}

export async function GET() {
  try {
    const files = await listUploadedFiles();
    return new Response(JSON.stringify({ ok: true, files }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, files: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  try {
    if (!isRequestAuthenticated(request)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Inicia sesión en /admin.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se ha seleccionado ningún archivo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const originalName = file.name || 'imagen.png';
    const ext = path.extname(originalName).toLowerCase() || '.png';

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Formato no permitido (${ext}). Usa JPG, PNG, WEBP, GIF, AVIF o SVG.`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const baseName = path
      .basename(originalName, ext)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'cyberpunk-img';

    const uniqueName = `${Date.now()}-${baseName}${ext}`;
    await ensureUploadDir();

    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const publicUrl = `/images/uploads/${uniqueName}`;
    const files = await listUploadedFiles();

    return new Response(
      JSON.stringify({
        ok: true,
        url: publicUrl,
        fileName: uniqueName,
        files
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
