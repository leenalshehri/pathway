import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Target, CalendarDays, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { RoadmapTaskItem } from "@/components/roadmap/RoadmapTaskItem";
import { RoadmapPhaseHeader } from "@/components/roadmap/RoadmapPhaseHeader";
import { RoadmapObjectiveHeader } from "@/components/roadmap/RoadmapObjectiveHeader";
import { calculateGoalProgress, GoalWithTasks } from "@/lib/progress";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function RoadmapPage(props: { params: Promise<{ goalId: string }> }) {
  const params = await props.params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!dbUser) redirect("/sign-in");

  const goal = await prisma.goal.findUnique({
    where: { id: params.goalId, userId: dbUser.id },
    include: {
      phases: {
        orderBy: { order: 'asc' },
        include: {
          milestones: {
            orderBy: { order: 'asc' },
            include: {
              weeklyObjectives: {
                orderBy: { order: 'asc' },
                include: {
                  tasks: {
                    orderBy: { order: 'asc' }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!goal) notFound();

  const progressPercentage = calculateGoalProgress(goal as unknown as GoalWithTasks);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-black dark:text-white font-sans pb-32 transition-colors">
      
      {/* Top Nav */}
      <nav className="border-b border-neutral-200 dark:border-neutral-900 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="font-medium tracking-wide flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">P</div>
              Pathway
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Header Section */}
        <header className="space-y-6 border-b border-neutral-200 dark:border-neutral-900 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium border border-blue-500/20 shadow-sm">
            <Target size={16} /> Roadmap Generated
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-black dark:text-white leading-tight">
            {goal.clarifiedObjective || "Untitled Goal"}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-500 dark:text-neutral-500">
            <span className="flex items-center gap-1.5"><CalendarDays size={16} /> Target: {goal.targetDate ? goal.targetDate.toLocaleDateString() : 'TBD'}</span>
            <span className="flex items-center gap-1.5"><Target size={16} /> {goal.phases.length} Phases</span>
          </div>

          <div className="space-y-2 max-w-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Overall Progress</span>
              <span className="text-black dark:text-white font-bold">{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
          </div>
        </header>

        {/* Timeline */}
        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-800 before:to-transparent">
          
          {goal.phases.map((phase, pIdx) => {
            const isPhaseCompleted = phase.status === "COMPLETED";
            
            return (
            <div key={phase.id} className={`relative z-10 space-y-6 ${isPhaseCompleted ? 'opacity-80' : ''}`}>
              
              {/* Phase Header */}
              <RoadmapPhaseHeader phase={phase} index={pIdx} />

              {/* Milestones inside Phase */}
              <div className="space-y-8 mt-8">
                {phase.milestones.map((milestone) => {
                  const isMilestoneCompleted = milestone.status === "COMPLETED";

                  return (
                  <div key={milestone.id} className="relative">
                    
                    <div className="flex md:justify-center mb-6 pl-10 md:pl-0">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                        <div className="absolute -left-10 md:hidden w-6 h-0.5 bg-neutral-200 dark:bg-neutral-800"></div>
                        <Target size={16} className={isMilestoneCompleted ? "text-green-500" : "text-neutral-400"} />
                        <h3 className="font-medium text-black dark:text-white">{milestone.title}</h3>
                      </div>
                    </div>

                    <div className="space-y-4 pl-12 md:pl-0 md:max-w-2xl md:mx-auto">
                      {milestone.weeklyObjectives.map((objective) => {
                        const isObjectiveCompleted = objective.status === "COMPLETED";

                        return (
                        <div key={objective.id} className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all shadow-sm">
                          
                          <RoadmapObjectiveHeader objective={objective} />

                          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                            {objective.tasks.map((task) => (
                              <RoadmapTaskItem key={task.id} task={task} />
                            ))}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )})}
        </div>
      </main>
    </div>
  );
}
