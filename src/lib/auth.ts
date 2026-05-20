/**
 * Cloudflare Access injects `cf-access-authenticated-user-email` on every
 * request that passes through an Access policy. No manual setup needed —
 * just protect the /admin route in your Cloudflare Access dashboard and
 * this header will always be present for authenticated users.
 *
 * In local dev (localhost) we bypass the check so you can work without a tunnel.
 */
export interface AuthResult {
  authenticated: boolean;
  email: string | null;
  isLocal: boolean;
}

export function getAuth(request: Request): AuthResult {
  const url = new URL(request.url);
  const isLocal =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  const email = request.headers.get('cf-access-authenticated-user-email');

  return {
    authenticated: !!(email || isLocal),
    email: email ?? (isLocal ? 'local-dev@flarecms.local' : null),
    isLocal,
  };
}

export function requireAuth(request: Request): Response | null {
  const { authenticated } = getAuth(request);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Cloudflare Access authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}
