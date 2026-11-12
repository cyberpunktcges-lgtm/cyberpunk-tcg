/**
 * Utilidad cliente para interactuar con la API oficial de GitHub como CMS en la nube.
 * Permite guardar noticias, contenido, torneos, cartas e imágenes directamente en el repositorio.
 * Cloudflare detecta automáticamente el commit y despliega en producción en ~25 segundos.
 */

const REPO_OWNER = 'cyberpunktcges-lgtm';
const REPO_NAME = 'cyberpunk-tcg';
const GITHUB_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

// El token se almacena en el navegador del administrador (localStorage) y nunca en el código git
export function getStoredToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cp_tcg_github_token') || '';
}

export function saveStoredToken(token) {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('cp_tcg_github_token', token.trim());
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cp_tcg_github_token');
  }
}

/**
 * Codifica una cadena de texto UTF-8 (con acentos, eñes y emojis) a Base64 estándar
 */
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodifica Base64 a cadena UTF-8
 */
export function base64ToUtf8(b64) {
  const cleanB64 = b64.replace(/\n|\r/g, '');
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Obtiene el archivo más reciente y su SHA desde el repositorio de GitHub
 */
export async function getFileFromGithub(path, token = getStoredToken()) {
  const url = `${GITHUB_API_BASE}/${path}?ref=main&_nocache=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status} al leer ${path} de GitHub`);
  }

  const json = await res.json();
  const text = base64ToUtf8(json.content);
  return {
    content: text,
    parsed: JSON.parse(text),
    sha: json.sha
  };
}

/**
 * Guarda o actualiza un archivo de texto/JSON en el repositorio haciendo un commit
 */
export async function commitFileToGithub(path, contentStr, commitMessage, token = getStoredToken()) {
  // 1. Obtener el SHA actual para poder sobrescribir sin conflicto
  let sha = null;
  try {
    const existing = await getFileFromGithub(path, token);
    sha = existing.sha;
  } catch (err) {
    // El archivo puede no existir si es nuevo
  }

  const base64Content = utf8ToBase64(contentStr);

  const payload = {
    message: commitMessage || `[CMS] Actualizar ${path}`,
    content: base64Content,
    branch: 'main'
  };
  if (sha) payload.sha = sha;

  const res = await fetch(`${GITHUB_API_BASE}/${path}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || `Error ${res.status} al guardar en GitHub`);
  }

  return await res.json();
}

/**
 * Sube una imagen (archivo binario) directamente a public/images/uploads/ en GitHub
 */
export async function uploadImageToGithub(file, token = getStoredToken()) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo en el navegador'));
    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const base64Content = dataUrl.split(',')[1];
        const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `public/images/uploads/${cleanName}`;

        const payload = {
          message: `[CMS] Subir imagen ${cleanName}`,
          content: base64Content,
          branch: 'main'
        };

        const res = await fetch(`${GITHUB_API_BASE}/${path}`, {
          method: 'PUT',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Error al subir imagen a GitHub (${res.status})`);
        }

        const publicUrl = `/images/uploads/${cleanName}`;
        resolve({
          ok: true,
          url: publicUrl,
          fileName: cleanName,
          previewUrl: dataUrl
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}
