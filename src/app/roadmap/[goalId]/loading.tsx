import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 transition-colors">
      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-400 px-4 py-2 rounded-lg flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Dashboard
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Skeleton Header */}
        <div className="mb-12 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
          </div>
          <div className="h-10 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4"></div>
          <div className="h-6 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-8"></div>
          
          {/* Skeleton Progress */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
              <div className="h-4 w-10 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            </div>
            <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
          </div>
        </div>

        {/* Skeleton Phases */}
        <div className="space-y-12 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="flex items-center gap-6 mb-8">
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>
                <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
              </div>
              <div className="ml-4 pl-8 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-6">
                <div className="h-32 bg-neutral-100 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800"></div>
                <div className="h-32 bg-neutral-100 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
