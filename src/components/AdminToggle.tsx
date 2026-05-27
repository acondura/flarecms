"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminToggle() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) setAuthed(true);
        else setAuthed(false);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthed(false);
      });
    return () => { mounted = false; };
  }, []);

  // null = loading, false = not authed, true = authed
  if (!authed) return null;

  return (
    <Link
      href="/admin"
      className="inline-block text-sm bg-slate-900 text-white px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
    >
      Admin
    </Link>
  );
}
