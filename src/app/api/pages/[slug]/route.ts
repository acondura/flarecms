import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPage, savePage, deletePage } from '@/lib/kv';
import { requireAuth } from '@/lib/auth';

export const runtime = 'edge';

/** GET /api/pages/[slug] — fetch a single page (public) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const page = await getPage(env.CMS_KV, slug);
    if (!page) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(page);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/pages/[slug] — create or update a page (admin only) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const deny = requireAuth(request);
  if (deny) return deny;

  const { slug } = await params;
  try {
    const body = (await request.json()) as Record<string, any>;
    // Ensure slug matches route
    const page = { ...body, slug } as any;
    const { env } = getRequestContext() as { env: CloudflareEnv };
    await savePage(env.CMS_KV, page);
    return Response.json({ success: true, page });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/pages/[slug] — delete a page (admin only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const deny = requireAuth(request);
  if (deny) return deny;

  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    await deletePage(env.CMS_KV, slug);
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
