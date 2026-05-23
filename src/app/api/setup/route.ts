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

    // Parse email from multiple fallbacks (body JSON, query, header)
    let bodyEmail: string | undefined;
    try {
      const text = await request.text();
      if (text) {
        try {
          const body = JSON.parse(text) as { email?: string };
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
        { error: 'No authenticated email found' },
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

    return Response.json({
      success: true,
      rootUserEmail: emailToSet,
      accessConfigured,
      accessError,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
