/**
 * Auth Layout
 *
 * Centered card layout for all authentication pages.
 * Clean, minimal design with brand identity.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Street2Ivy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connecting Students with Real-World Experience
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
