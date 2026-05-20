'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Edit, Trash2, Eye, Calendar } from 'lucide-react';

interface CmsPage {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) throw new Error(await res.text());
      setPages(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete page "/${slug}"? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      await fetch(`/api/pages/${slug}`, { method: 'DELETE' });
      setPages((prev) => prev.filter((p) => p.slug !== slug));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Pages</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pages.length} published page{pages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/new"
          id="new-page-btn"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          New page
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="page-search"
          type="text"
          placeholder="Search pages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
            Loading pages…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">
              {search ? `No pages matching "${search}"` : 'No pages yet.'}
            </p>
            {!search && (
              <Link
                href="/admin/new"
                className="mt-3 inline-block text-sm font-semibold text-orange-500 hover:underline"
              >
                Create your first page →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600">Title</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Slug</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Published</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((page) => (
                <tr key={page.slug} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {page.title}
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                    /{page.slug}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(page.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="View page"
                      >
                        <Eye size={15} />
                      </a>
                      <Link
                        href={`/admin/edit/${page.slug}`}
                        className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                        title="Edit page"
                      >
                        <Edit size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(page.slug)}
                        disabled={deleting === page.slug}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                        title="Delete page"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
