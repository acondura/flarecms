'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useEffect as useClientEffect } from 'react';
import { marked } from 'marked';

interface CmsPage {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  updatedAt: string;
}

interface PageEditorProps {
  /** Pass existing page to edit; omit for new page creation */
  initialPage?: CmsPage;
}

export default function PageEditor({ initialPage }: PageEditorProps) {
  const router = useRouter();
  const isNew = !initialPage;

  const [slug, setSlug]       = useState(initialPage?.slug ?? '');
  const [originalSlug] = useState(initialPage?.slug ?? '');
  const [title, setTitle]     = useState(initialPage?.title ?? '');
  const [excerpt, setExcerpt] = useState(initialPage?.excerpt ?? '');
  const [content, setContent] = useState(initialPage?.content ?? '');

  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect list state
  const [redirects, setRedirects] = useState<string[]>([]);

  useClientEffect(() => {
    let mounted = true;
    async function loadRedirects() {
      if (!initialPage) return;
      try {
        const res = await fetch(`/api/pages/${initialPage.slug}/redirects`, { credentials: 'same-origin' });
        if (!res.ok) return;
        const json = (await res.json()) as { redirects?: string[] };
        if (mounted) setRedirects(json.redirects || []);
      } catch {}
    }
    loadRedirects();
    return () => { mounted = false; };
  }, [initialPage]);



  // Auto-generate slug from title for new pages. For existing pages, if the
  // slug hasn't been edited (it still equals originalSlug) we'll also update
  // the slug when the title changes — this enables renaming a page's URL when
  // updating the title. If the user manually edits the slug, we stop auto-updating.
  useEffect(() => {
    const shouldAuto = isNew || slug === originalSlug;
    if (!shouldAuto) return;
    setSlug(
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }, [title, isNew, originalSlug, slug]);

  const handleSave = useCallback(async () => {
    if (!slug || !title || !content) {
      setErrorMsg('Slug, title and content are required.');
      setStatus('error');
      return;
    }
    setSaving(true);
    setStatus('idle');

    const now = new Date().toISOString();
    const payload: CmsPage = {
      slug,
      title,
      excerpt,
      content,
      publishedAt: initialPage?.publishedAt ?? now,
      updatedAt: now,
    };

    try {
      // When saving, send the page to the API using the originalSlug in the route
      // (so server can detect moves) but include the new slug in the body.
      const res = await fetch(`/api/pages/${originalSlug || slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      setStatus('success');
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 1000);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Save failed');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [slug, title, excerpt, content, initialPage?.publishedAt, router]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-2xl font-black text-slate-900 font-outfit break-words">
            {/* Title should be clickable and above content */}
            <a href={`/${slug}`} className="hover:underline">{title}</a>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
              <CheckCircle2 size={15} /> Saved!
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 text-red-500 text-sm">
              <AlertCircle size={15} /> {errorMsg}
            </span>
          )}

          <button
            id="save-page-btn"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Editor */}
        <div className="col-span-9">
          <div className="flex flex-col">
            {/* Title input above Content */}
            <div className="mb-4">
              <label htmlFor="page-title" className="block text-sm font-bold text-slate-500 mb-2">Title <span className="text-red-400">*</span></label>
              <input
                id="page-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome page"
                className="w-full px-4 py-3 text-lg border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
              />
            </div>

            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Content <span className="text-red-400">*</span>{' '}
              <span className="normal-case font-normal text-slate-400">(Markdown supported)</span>
            </label>
            <textarea
              id="page-content"
              className="flex-1 min-h-[600px] px-5 py-4 font-mono text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Hello World&#10;&#10;Write your page content here in **Markdown**…"
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="col-span-3 space-y-5">
          {/* Info (top) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Info</p>
            <p className="text-xs text-slate-500">
              Published: {new Date(initialPage?.publishedAt ?? Date.now()).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Updated: {new Date(initialPage?.updatedAt ?? Date.now()).toLocaleString()}
            </p>
          </div>

          {/* URL (slug) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <label htmlFor="page-slug" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              URL (slug) <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-sm">/</span>
              <input
                id="page-slug"
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="my-awesome-page"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Summary (excerpt) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <label htmlFor="page-excerpt" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Summary
            </label>
            <textarea
              id="page-excerpt"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short description shown on the home page…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all resize-none"
            />
          </div>

          {/* Redirects list */}
          {!isNew && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Redirects</p>
              {redirects.length === 0 ? (
                <p className="text-xs text-slate-500">No redirects</p>
              ) : (
                <ul className="text-xs text-slate-700 list-none space-y-2">
                  {redirects.map((r) => (
                    <li key={r} className="flex items-center justify-between">
                      <span className="text-slate-700">/{r}</span>
                      <button
                        onClick={async () => {
                          if (!initialPage) return;
                          if (!confirm(`Remove redirect from /${r} → /${initialPage.slug}?`)) return;
                          try {
                            const res = await fetch(`/api/pages/${initialPage.slug}/redirects?from=${encodeURIComponent(r)}`, {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                            });
                            if (!res.ok) throw new Error(await res.text());
                            setRedirects((prev) => prev.filter((x) => x !== r));
                          } catch (e: any) {
                            alert('Failed to remove redirect: ' + (e.message || e));
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title={`Remove redirect from /${r}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
