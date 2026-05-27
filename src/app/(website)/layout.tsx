import Link from 'next/link';
import AdminToggle from '@/components/AdminToggle';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-slate-900 hover:opacity-75 transition-opacity font-outfit"
            >
              Flare<span className="text-orange-500">CMS</span>
            </Link>
            <AdminToggle />
          </div>
        </div>
      </header>

      {/* Page content — centered */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-24 pb-16">
        {children}
      </main>

      <footer className="border-t border-slate-100 py-6">
        <p className="text-center text-xs text-slate-400">
          Powered by{' '}
          <a href="https://pages.cloudflare.com" className="hover:text-slate-600 transition-colors" target="_blank" rel="noreferrer">
            Cloudflare Pages
          </a>
        </p>
      </footer>
    </div>
  );
}
