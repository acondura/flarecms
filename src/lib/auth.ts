import { getRootUserEmail } from './kv';

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

export async function requireAuth(request: Request, kv: KVNamespace | undefined): Promise<Response | null> {
  // Helpful error if KV binding is missing
  if (!kv || typeof (kv as any).get !== 'function') {
    return new Response(
      JSON.stringify({ error: 'CMS_KV binding missing. Please bind KV in Cloudflare Pages → Functions → KV namespace bindings.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // First check whether a root user exists; if not, surface needsSetup for UI
  const rootUserEmail = await getRootUserEmail(kv);
  if (!rootUserEmail) {
    return new Response(
      JSON.stringify({ error: 'No root user configured', needsSetup: true }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Then enforce Cloudflare Access (or local dev bypass)
  const { authenticated, email } = getAuth(request);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Cloudflare Access authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (email !== rootUserEmail) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Invalid email' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}
