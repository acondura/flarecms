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
  const [needsSetup, setNeedsSetup] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [settingUp, setSettingUp] = useState(false);

  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch('/api/setup');
      if (res.ok) {
        const data = await res.json() as { needsSetup: boolean; currentEmail: string | null };
        setNeedsSetup(data.needsSetup);
        setCurrentEmail(data.currentEmail || '');
        setSetupEmail(data.currentEmail || '');
      }
    } catch (e: any) {
      console.error('Setup check failed:', e);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) {
        const errorData = await res.json() as { needsSetup?: boolean; error?: string };
        if (errorData.needsSetup) {
          setNeedsSetup(true);
          return;
        }
        throw new Error(errorData.error || await res.text());
      }
      setPages(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    checkSetup();
    loadPages(); 
  }, [checkSetup, loadPages]);

  const handleSetup = async () => {
    if (!setupEmail) return;
    setSettingUp(true);
    try {
      // Include x-admin-email header as a fallback for environments where
      // the cf-access header is not present during bootstrap.
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': setupEmail },
        body: JSON.stringify({ email: setupEmail }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Setup failed');
      }
      setNeedsSetup(false);
      loadPages();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSettingUp(false);
    }
  };

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

  if (needsSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 font-outfit mb-2">
            Welcome to FlareCMS
          </h1>
          <p className="text-slate-600 mb-6">
            Let's set up your admin account. Enter the email address that should have access to this CMS.
          </p>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="setup-email" className="block text-sm font-semibold text-slate-700 mb-2">
                Admin Email Address
              </label>
              <input
                id="setup-email"
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
              />
              {currentEmail && (
                <p className="mt-2 text-xs text-slate-500">
                  Currently authenticated as: <span className="font-mono">{currentEmail}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleSetup}
              disabled={settingUp || !setupEmail}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm"
            >
              {settingUp ? 'Setting up…' : 'Complete Setup'}
            </button>
          </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> If you deploy on Cloudflare and add the <code className="bg-blue-100 px-1 rounded">CF_ACC_ID</code> and
          <code className="bg-blue-100 px-1 rounded">CF_TOKEN</code> environment variables, FlareCMS will attempt to automatically
          configure Cloudflare Access to protect the <code className="bg-blue-100 px-1 rounded">/admin</code> path for this email.
          Otherwise you can configure Access manually in the Cloudflare dashboard.
        </p>
      </div>
        </div>
      </div>
    );
  }

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
