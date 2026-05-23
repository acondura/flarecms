import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRootUserEmail, setRootUserEmail } from '@/lib/kv';
import { setupCloudflareAccess } from '@/lib/cloudflare-access';

export const runtime = 'edge';

/**
 * POST /api/setup/provision — force-provision root user & Cloudflare Access
 * This endpoint intentionally does not require Cloudflare Access auth because
 * it's part of the initial bootstrap flow. The client must provide the email
 * in the POST body. If CF_ACC_ID/CF_TOKEN bindings are present, the Cloudflare
 * Access app and policy will be created/updated automatically.
 */
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };

    const rootUserEmail = await getRootUserEmail(env.CMS_KV);
    if (rootUserEmail) {
      return Response.json({ error: 'Root user already configured' }, { status: 403 });
    }

    let bodyText = '';
    try { bodyText = await request.text(); } catch (e) {}
    let bodyEmail: string | undefined;
    try {
      if (bodyText) {
        const parsed = JSON.parse(bodyText) as { email?: string };
        bodyEmail = parsed?.email;
      }
    } catch (e) {
      // ignore
    }

    const emailToSet = bodyEmail || new URL(request.url).searchParams.get('email') || undefined;
    if (!emailToSet) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSet)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await setRootUserEmail(env.CMS_KV, emailToSet);

    // Set cookie so browser session can continue until Access is enforced
    const cookie = `flarecms_admin_email=${encodeURIComponent(emailToSet)}; Path=/; Max-Age=${60 * 30}`;

    let accessConfigured = false;
    let accessError: string | null = null;
    try {
      if ((env as any).CF_ACC_ID && (env as any).CF_TOKEN) {
        const origin = new URL(request.url).origin;
        const result = await setupCloudflareAccess((env as any).CF_ACC_ID, (env as any).CF_TOKEN, origin, emailToSet);
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

    const body = JSON.stringify({ success: true, rootUserEmail: emailToSet, accessConfigured, accessError, loginUrl: accessConfigured ? loginUrl : null });

    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
