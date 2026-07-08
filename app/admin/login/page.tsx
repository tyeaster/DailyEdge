import type { Metadata } from "next";

import { loginAdmin } from "@/src/auth/actions";

export const metadata: Metadata = {
  description: "Sign in to access TrueLine admin dashboards.",
  title: "Admin Sign In | TrueLine",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? "/admin/backtesting";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030812] px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/80">
          TrueLine Admin
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Sign in</h1>
        <form action={loginAdmin} className="mt-6 space-y-4">
          <input name="from" type="hidden" value={from} />
          <div>
            <label className="text-sm text-slate-400" htmlFor="password">
              Admin password
            </label>
            <input
              autoFocus
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-blue-300/40"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          {params.error ? (
            <p className="text-sm text-red-300">Incorrect password.</p>
          ) : null}
          <button
            className="w-full rounded-xl border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
