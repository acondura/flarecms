import { getRequestContext } from '@cloudflare/next-on-pages';
import { listRedirectsTo, deleteRedirect } from '@/lib/kv';
import { requireAuth } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const deny = await requireAuth(_request, env.CMS_KV);
    if (deny) return deny;

    const redirects = await listRedirectsTo(env.CMS_KV, slug);
    return Response.json({ redirects });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const deny = await requireAuth(request, env.CMS_KV);
    if (deny) return deny;

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    if (!from) return Response.json({ error: 'missing from param' }, { status: 400 });
    await deleteRedirect(env.CMS_KV, from);
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
