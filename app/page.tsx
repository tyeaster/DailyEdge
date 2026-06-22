export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">

      <h1 className="text-6xl font-bold text-blue-400">
        ⚾ Daily Edge
      </h1>

      <p className="mt-4 text-xl text-gray-300">
        Find Your Edge Every Day
      </p>

      <div className="mt-12 bg-slate-900 border border-slate-700 rounded-xl p-8 w-full max-w-2xl">

        <h2 className="text-3xl font-semibold">
          Today's MLB Dashboard
        </h2>

        <p className="mt-4 text-gray-400">
          🚧 Coming Soon...
        </p>

        <ul className="mt-8 space-y-3 text-lg">
          <li>🏆 Best Bets</li>
          <li>⚾ Player Props</li>
          <li>🔥 Home Run Model</li>
          <li>🎯 Pitcher Props</li>
          <li>📈 Moneyline Model</li>
          <li>💰 Game Totals</li>
        </ul>

      </div>

    </main>
  );
}