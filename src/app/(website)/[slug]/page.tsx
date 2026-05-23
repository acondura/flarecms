import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPage } from '@/lib/kv';
import { marked } from 'marked';
import { Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const page = await getPage(env.CMS_KV, slug);
    if (page) return { title: page.title, description: page.excerpt };
  } catch {}
  return { title: 'Page' };
}

export default async function PageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let html = '';
  let title = '';
  let excerpt = '';
  let publishedAt = '';

    try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const page = await getPage(env.CMS_KV, slug);
    // If page not found, check redirects and 301 if present
    if (!page) {
      const { getRedirect } = await import('@/lib/kv');
      const to = await getRedirect(env.CMS_KV, slug);
      if (to) {
        // perform a permanent redirect to the new slug
        return new Response(null, { status: 301, headers: { Location: `/${to}` } }) as any;
      }
      notFound();
    }
    title = page.title;
    excerpt = page.excerpt;
    publishedAt = page.publishedAt;
    html = await marked(page.content ?? '');
  } catch {
    notFound();
  }

  return (
    <article className="animate-fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-10 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        All pages
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Calendar size={12} />
          <time dateTime={publishedAt}>
            {new Date(publishedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </time>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 font-outfit leading-tight">
          {title}
        </h1>
        {excerpt && (
          <p className="mt-4 text-lg text-slate-500 leading-relaxed border-l-4 border-slate-100 pl-4 italic">
            {excerpt}
          </p>
        )}
      </header>

      <div
        className="prose prose-slate prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
