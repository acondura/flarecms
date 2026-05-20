import type { Metadata } from 'next';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { listPages } from '@/lib/kv';
import { CmsPage } from '@/lib/kv';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome — browse published pages.',
};

export default async function HomePage() {
  let pages: CmsPage[] = [];

  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    pages = await listPages(env.CMS_KV);
  } catch {
    // Running locally without KV — show empty state
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 font-outfit">
          Pages
        </h1>
        <p className="mt-3 text-slate-500 text-lg leading-relaxed">
          Published content, served at the edge.
        </p>
      </header>

      {pages.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-slate-100">
          <p className="text-slate-400 text-sm">No pages published yet.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-semibold text-orange-500 hover:underline"
          >
            Go to Admin →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pages.map((page) => (
            <article key={page.slug} className="py-8 group">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Calendar size={12} />
                <time dateTime={page.publishedAt}>
                  {new Date(page.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-orange-500 transition-colors font-outfit">
                <Link href={`/${page.slug}`}>{page.title}</Link>
              </h2>
              {page.excerpt && (
                <p className="mt-2 text-slate-500 text-sm leading-relaxed line-clamp-2">
                  {page.excerpt}
                </p>
              )}
              <Link
                href={`/${page.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-500 hover:gap-2 transition-all"
              >
                Read more <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
