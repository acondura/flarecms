export const runtime = 'edge';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-7xl font-black text-slate-100 select-none">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you're looking for doesn't exist.</p>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm font-medium">← Back home</a>
    </div>
  );
}
