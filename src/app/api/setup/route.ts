import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRootUserEmail, setRootUserEmail } from '@/lib/kv';
import { getAuth } from '@/lib/auth';
import { setupCloudflareAccess } from '@/lib/cloudflare-access';

export const runtime = 'edge';

/** GET /api/setup — check if root user is configured */
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const rootUserEmail = await getRootUserEmail(env.CMS_KV);
    const { email } = getAuth(request);
    
    return Response.json({ 
      needsSetup: !rootUserEmail,
      currentEmail: email,
      rootUserEmail: rootUserEmail 
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/setup — set root user email (only if not already set) */
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const rootUserEmail = await getRootUserEmail(env.CMS_KV);
    
    // Only allow setup if no root user exists
    if (rootUserEmail) {
      return Response.json(
        { error: 'Root user already configured' },
        { status: 403 }
      );
    }

    const { email: headerEmail } = getAuth(request);

    // Capture headers for debugging and fallback checks
    const headersObj: Record<string, string> = {};
    for (const [k, v] of request.headers) headersObj[k] = v ?? '';

    // Parse email from multiple fallbacks (body JSON, query, header)
    let bodyEmail: string | undefined;
    let bodyText = '';
    try {
      bodyText = await request.text();
      if (bodyText) {
        try {
          const body = JSON.parse(bodyText) as { email?: string };
          bodyEmail = body?.email;
        } catch (e) {
          // not JSON — ignore
        }
      }
    } catch (e) {
      // ignore read errors
    }

    const urlEmail = new URL(request.url).searchParams.get('email') || undefined;
    const headerFallback = request.headers.get('x-admin-email') || undefined;
    const emailToSet = bodyEmail || urlEmail || headerFallback || headerEmail;

    if (!emailToSet) {
      return Response.json(
        { error: 'No authenticated email found', headers: headersObj, bodyText },
        { status: 401 }
      );
    }

    // Validate email format
    if (!emailToSet || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSet)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await setRootUserEmail(env.CMS_KV, emailToSet);

    // Set a short-lived cookie via response so the browser session can
    // continue to make authenticated requests during bootstrap before
    // Cloudflare Access is active. Cookie is not HttpOnly so client JS
    // can remove it later; expires in 30 minutes.
    const cookie = `flarecms_admin_email=${encodeURIComponent(emailToSet)}; Path=/; Max-Age=${60 * 30}`;

    // Automatically configure Cloudflare Access for the /admin path if
    // API credentials are available. This will create (or update) a
    // self-hosted application scoped to `${origin}/admin` and a policy
    // that only allows the configured root user email.
    let accessConfigured = false;
    let accessError: string | null = null;

    try {
      if ((env as any).CF_ACC_ID && (env as any).CF_TOKEN) {
        const origin = new URL(request.url).origin;
        const result = await setupCloudflareAccess(
          (env as any).CF_ACC_ID,
          (env as any).CF_TOKEN,
          origin,
          emailToSet
        );

        accessConfigured = result.success;
        accessError = result.error ?? null;
      } else {
        accessError = 'CF_ACC_ID or CF_TOKEN not configured; Cloudflare Access not set up automatically.';
      }
    } catch (err: any) {
      accessError = err?.message ?? 'Unknown Cloudflare Access configuration error';
    }

    const origin = new URL(request.url).origin;
    const loginUrl = `${origin}/cdn-cgi/access/login?redirect=${encodeURIComponent(origin + '/admin')}`;

    const bodyObj: any = {
      success: true,
      rootUserEmail: emailToSet,
      accessConfigured,
      accessError,
    };
    if (accessConfigured) bodyObj.loginUrl = loginUrl;

    const body = JSON.stringify(bodyObj);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
