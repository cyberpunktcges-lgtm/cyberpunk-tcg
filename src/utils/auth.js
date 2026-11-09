import crypto from 'node:crypto';

export const COOKIE_NAME = 'cp_tcg_admin_session';

function getCredentials() {
  const user = import.meta.env?.ADMIN_USER || process.env.ADMIN_USER || 'admin';
  const pass = import.meta.env?.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'cyberpunk2077';
  const secret =
    import.meta.env?.ADMIN_SECRET ||
    process.env.ADMIN_SECRET ||
    'cyberpunk-tcg-espana-netwatch-secret-key-2077';
  return { user, pass, secret };
}

export function createSessionToken(username) {
  const { secret } = getCredentials();
  const payload = `${username}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const { user, secret } = getCredentials();
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;
    const [tokenUser, timestampStr, signature] = parts;
    if (tokenUser !== user) return false;

    const payload = `${tokenUser}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

    // Expiración de sesión: 7 días
    const ageMs = Date.now() - Number(timestampStr);
    if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function validateLogin(inputUser, inputPass) {
  const { user, pass } = getCredentials();
  return inputUser === user && inputPass === pass;
}

export function parseCookieHeader(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      cookies[k] = decodeURIComponent(v);
    }
  });
  return cookies;
}

export function isRequestAuthenticated(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[COOKIE_NAME];
  return verifySessionToken(token);
}
