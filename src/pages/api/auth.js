import {
  COOKIE_NAME,
  createSessionToken,
  isRequestAuthenticated,
  validateLogin
} from '../../utils/auth.js';

export const prerender = false;

export async function GET({ request }) {
  const authenticated = isRequestAuthenticated(request);
  return new Response(JSON.stringify({ authenticated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (action === 'logout') {
      return new Response(JSON.stringify({ ok: true, authenticated: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
        }
      });
    }

    if (action === 'login') {
      if (!validateLogin(username, password)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'CREDENCIALES INVÁLIDAS // ACCESO DENEGADO POR NETWATCH'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const token = createSessionToken(username);
      const maxAge = 7 * 24 * 60 * 60; // 7 días

      return new Response(JSON.stringify({ ok: true, authenticated: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Acción inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error en autenticación', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
