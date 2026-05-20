'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [title, setTitle]     = useState(initialPage?.title ?? '');
  const [excerpt, setExcerpt] = useState(initialPage?.excerpt ?? '');
  const [content, setContent] = useState(initialPage?.content ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Parse markdown client-side for live preview
  useEffect(() => {
    if (!showPreview) return;
    let active = true;
    const parse = async () => {
      try {
        const html = await marked(content || '');
        if (active) setPreviewHtml(html);
      } catch (err) {
        console.error(err);
      }
    };
    parse();
    return () => {
      active = false;
    };
  }, [content, showPreview]);

  // Auto-generate slug from title for new pages
  useEffect(() => {
    if (!isNew) return;
    setSlug(
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }, [title, isNew]);

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
      const res = await fetch(`/api/pages/${slug}`, {
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
          <h1 className="text-2xl font-black text-slate-900 font-outfit">
            {isNew ? 'New page' : `Edit: ${initialPage.title}`}
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
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
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
        {/* Sidebar */}
        <aside className="col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <label htmlFor="page-title" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="page-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome page"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label htmlFor="page-slug" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Slug <span className="text-red-400">*</span>
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
                  disabled={!isNew}
                  placeholder="my-awesome-page"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                />
              </div>
              {!isNew && (
                <p className="mt-1 text-xs text-slate-400">Slug cannot be changed after creation.</p>
              )}
            </div>
            <div>
              <label htmlFor="page-excerpt" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Excerpt
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
          </div>

          {!isNew && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Info</p>
              <p className="text-xs text-slate-500">
                Published: {new Date(initialPage.publishedAt).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Updated: {new Date(initialPage.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </aside>

        {/* Editor + Preview */}
        <div className={`col-span-9 ${showPreview ? 'grid grid-cols-2 gap-4' : ''}`}>
          <div className="flex flex-col">
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

          {showPreview && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
              <div
                className="min-h-[600px] px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto prose prose-slate prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: previewHtml || '<em class="text-slate-400">Nothing to preview yet…</em>',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
