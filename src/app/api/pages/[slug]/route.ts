import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPage, savePage, deletePage } from '@/lib/kv';
import { saveRedirect } from '@/lib/kv';
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
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const deny = await requireAuth(request, env.CMS_KV);
    if (deny) return deny;

    const body = (await request.json()) as Record<string, any>;
    // If slug changed (when editing via admin UI we will send the new slug in body)
    let incomingSlug = (body.slug as string | undefined) ?? undefined;

    // Server-side normalize/sanitize incoming slug to a canonical format so we
    // don't persist malformed or truncated values coming from the client.
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    if (incomingSlug) incomingSlug = normalize(incomingSlug);

    // Determine the target slug we should save under: prefer incoming (new) slug
    // when provided, otherwise use the route param (for creation).
    const targetSlug = incomingSlug && incomingSlug.length > 0 ? incomingSlug : slug;

    const page = { ...body, slug: targetSlug } as any;

    // If the route slug differs from the target slug, record a redirect and
    // move the page key in KV (save new, delete old).
    if (incomingSlug && incomingSlug !== slug) {
      // save the page under the new slug
      await savePage(env.CMS_KV, page);
      // Verify save succeeded (helps surface KV errors instead of silently
      // creating a redirect to a non-existent page).
      const saved = await getPage(env.CMS_KV, targetSlug);
      if (!saved) throw new Error('Failed to persist page under new slug');

      // save redirect from old -> new (ensure stored value is normalized)
      await saveRedirect(env.CMS_KV, slug, incomingSlug);
      // delete the old page key after redirect is in place
      await deletePage(env.CMS_KV, slug);
    } else {
      // No move — just save/update at the target slug
      await savePage(env.CMS_KV, page);
    }
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
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const deny = await requireAuth(request, env.CMS_KV);
    if (deny) return deny;

    await deletePage(env.CMS_KV, slug);
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
