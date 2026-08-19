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
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Decorative Path Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/50 to-transparent -translate-x-1/2 opacity-30"></div>

      <main className="max-w-3xl text-center space-y-10 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          AI-Powered Goal Mapping
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white mb-6">
          Your journey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">structured.</span>
        </h1>
        
        <p className="text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed">
          Pathway is an intelligent planner that turns your vague aspirations into clear, actionable realities with tailored milestones and daily tasks.
        </p>
        
        <div className="pt-8">
          <Link
            href="/sign-in"
            className="group relative inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-neutral-100 transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(59,130,246,0.3)]"
          >
            Start Your Journey 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
