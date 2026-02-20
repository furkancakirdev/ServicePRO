'use client';

import Link from 'next/link';
import { LockKeyhole, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_45%),linear-gradient(180deg,#08111d_0%,#0f172a_100%)] px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-rose-900/60 bg-slate-950/80 p-6 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Bu sayfaya erisim izniniz yok</h1>
        <p className="mt-2 text-sm text-slate-300">
          Rolunuz bu ekrani acmaya uygun degil. Ana ekrana donerek calismaya devam edebilirsiniz.
        </p>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/65 px-3 py-2 text-xs text-slate-300">
          Ne yapmaliyim? Yoneticinizden gerekli yetkiyi isteyin veya uygun menuye geri donun.
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/">
            <Button>Ana ekrana don</Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <Undo2 className="mr-1 h-4 w-4" />
            Geri git
          </Button>
        </div>
      </div>
    </div>
  );
}
