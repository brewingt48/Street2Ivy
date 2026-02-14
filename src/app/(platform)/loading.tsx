/**
 * Platform loading state — shown during page transitions
 */

export default function PlatformLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700" />
          <div className="w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin absolute inset-0" />
        </div>
        <p className="text-sm text-slate-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
