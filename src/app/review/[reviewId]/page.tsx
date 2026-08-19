import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default async function WeeklyReviewPage(props: { params: Promise<{ reviewId: string }> }) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const review = await prisma.weeklyReview.findUnique({
    where: { id: params.reviewId },
    include: { goal: true }
  });

  if (!review) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-medium mb-2">Review Not Found</h1>
        <p className="text-neutral-500 mb-6">This review doesn't exist or hasn't been generated yet.</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans pb-32">
      <nav className="border-b border-neutral-900 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="font-medium tracking-wide text-white">Weekly AI Review</div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        
        <header className="space-y-4 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <Sparkles className="text-blue-400" size={28} />
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-white">Your Week in Review</h1>
          <p className="text-neutral-400 text-lg">Goal: {review.goal.clarifiedObjective}</p>
        </header>

        <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8 space-y-4">
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            Summary
          </h2>
          <p className="text-neutral-300 leading-relaxed">{review.summary}</p>
        </section>

        <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8 space-y-4">
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            Recommendations
          </h2>
          <div className="text-neutral-300 leading-relaxed space-y-2">
            {review.recommendations.split('\n').map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
