import { getRequestContext } from '@cloudflare/next-on-pages';
import { listPages } from '@/lib/kv';
import { requireAuth } from '@/lib/auth';

export const runtime = 'edge';

/** GET /api/pages — list all pages (admin only) */
export async function GET(request: Request) {
  const deny = requireAuth(request);
  if (deny) return deny;

  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const pages = await listPages(env.CMS_KV);
    return Response.json(pages);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
