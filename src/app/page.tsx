export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
          Street2Ivy
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
          Connecting Students with Real-World Experience
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-sm font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Platform rebuilding — Next.js 14+
        </div>
      </div>
    </main>
  );
}
