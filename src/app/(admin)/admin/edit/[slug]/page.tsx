import { notFound } from 'next/navigation';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPage } from '@/lib/kv';
import PageEditor from '@/components/PageEditor';

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `Edit: ${slug}` };
}

export default async function EditPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let page;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    page = await getPage(env.CMS_KV, slug);
  } catch {
    // local dev — editor still works, save will hit the API
  }

  if (page === null) notFound();

  return <PageEditor initialPage={page ?? undefined} />;
}
