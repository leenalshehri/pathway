import { Target, Clock, TrendingUp, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 transition-colors">
      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-medium tracking-wide flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>
            <div className="w-20 h-5 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10 animate-pulse">
        {/* Top Summary Skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>
              <div className="space-y-2">
                <div className="w-12 h-6 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
              </div>
            </div>
          ))}
        </section>

        {/* Today's Focus Skeleton */}
        <section>
          <div className="w-40 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 h-36"></div>
            ))}
          </div>
        </section>

        {/* Goals Skeleton */}
        <section>
          <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-6"></div>
          <div className="space-y-5">
            {[1, 2].map(i => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 h-48"></div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
