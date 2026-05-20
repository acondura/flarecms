import Link from 'next/link';
import { LayoutDashboard, FileText, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top bar */}
      <header className="bg-slate-900 text-white h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-6 w-full">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-white font-outfit">
            <LayoutDashboard size={18} className="text-orange-400" />
            FlareCMS
            <span className="text-xs font-normal text-slate-400 ml-1">Admin</span>
          </Link>
          <nav className="flex items-center gap-1 ml-4">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <FileText size={14} />
              Pages
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              View site ↗
            </Link>
          </div>
        </div>
      </header>

      {/* Full-width content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
