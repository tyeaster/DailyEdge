export default function Loading() {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1680px] items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/65 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/80">
            DailyEdge
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Loading today&apos;s MLB slate
          </h1>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full w-1/3 rounded-full bg-blue-300" />
          </div>
        </div>
      </div>
    </main>
  );
}
