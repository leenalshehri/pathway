import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-light tracking-tight text-neutral-100">
          Pathway
        </h1>
        <p className="text-xl text-neutral-400 font-light">
          An AI-powered goal planner that turns vague aspirations into clear, actionable realities.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-neutral-200 transition-colors"
        >
          Get Started <ArrowRight size={18} />
        </Link>
      </main>
    </div>
  );
}
