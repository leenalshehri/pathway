import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Target, Sparkles, Plus, CalendarDays, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { TaskActionCard } from "@/components/dashboard/TaskActionCard";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isSameDay } from "date-fns";
import { calculateGoalProgress } from "@/lib/progress";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ 
    where: { clerkId },
    include: {
      goals: {
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              milestones: {
                orderBy: { order: "asc" },
                include: {
                  weeklyObjectives: {
                    orderBy: { order: "asc" },
                    include: {
                      tasks: {
                        orderBy: { order: "asc" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!dbUser) redirect("/sign-in");

  const goals = dbUser.goals;

  if (goals.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 transition-colors">
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <ThemeToggle />
          <UserButton />
        </div>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-card-border shadow-sm">
            <Target size={28} className="text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-medium tracking-tight">Welcome to Pathway</h1>
          <p className="text-muted-foreground font-light text-lg">
            You don't have any goals yet. Let's create your first roadmap.
          </p>
          <Link
            href="/goal/setup"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-colors mt-4 shadow-md"
          >
            <Plus size={18} /> Create New Goal
          </Link>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === "IN_PROGRESS" || g.status === "PLANNING");
  const todaysFocusItems = [];
  const today = new Date();
  
  let totalTasksThisWeek = 0;
  let totalCompletedThisWeek = 0;
  let totalTasksOverall = 0;
  let totalCompletedOverall = 0;

  for (const goal of activeGoals) {
    let focusTask = null;
    let focusObjective = null;
    let focusMilestone = null;
    let focusPhase = null;

    let fallbackTask = null;
    let fallbackObjective = null;
    let fallbackMilestone = null;
    let fallbackPhase = null;

    for (const phase of goal.phases) {
      for (const milestone of phase.milestones) {
        for (const objective of milestone.weeklyObjectives) {
          
          let hasPendingInObjective = false;
          
          for (const task of objective.tasks) {
            totalTasksOverall++;
            if (task.status === "COMPLETED") totalCompletedOverall++;
            
            // Just a rough estimate for "Tasks This Week" using the current active objective
            if (objective.status !== "COMPLETED") {
              totalTasksThisWeek++;
              if (task.status === "COMPLETED") totalCompletedThisWeek++;
            }

            if (task.status !== "COMPLETED") {
              hasPendingInObjective = true;
              if (!fallbackTask) {
                fallbackTask = task;
                fallbackObjective = objective;
                fallbackMilestone = milestone;
                fallbackPhase = phase;
              }
              if (task.scheduledDate && isSameDay(new Date(task.scheduledDate), today)) {
                focusTask = task;
                focusObjective = objective;
                focusMilestone = milestone;
                focusPhase = phase;
                break; // Found today's task
              }
            }
          }
          if (focusTask) break;
        }
        if (focusTask) break;
      }
      if (focusTask) break;
    }

    const actualTask = focusTask || fallbackTask;
    // Limit today's focus to max 3 items
    if (actualTask && todaysFocusItems.length < 3) {
      todaysFocusItems.push({
        goal,
        task: actualTask,
        objectiveTitle: (focusObjective || fallbackObjective)?.title,
        milestoneTitle: (focusMilestone || fallbackMilestone)?.title,
        phaseTitle: (focusPhase || fallbackPhase)?.title,
      });
    }
  }

  const overallProgress = totalTasksOverall === 0 ? 0 : Math.round((totalCompletedOverall / totalTasksOverall) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 transition-colors">
      
      {/* Top Nav */}
      <nav className="border-b border-card-border bg-background/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-medium tracking-wide flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">P</div>
            Pathway
          </div>
          <div className="flex items-center gap-4">
            <Link href="/goal/setup" className="text-sm bg-card border border-card-border hover:bg-card-hover text-foreground px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
              <Plus size={14} /> New Goal
            </Link>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        
        {/* Compact Top Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Target size={24} />
            </div>
            <div>
              <div className="text-2xl font-semibold">{activeGoals.length}</div>
              <div className="text-sm text-muted-foreground font-medium">Active Goals</div>
            </div>
          </div>
          
          <div className="bg-card border border-card-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalTasksThisWeek - totalCompletedThisWeek}</div>
              <div className="text-sm text-muted-foreground font-medium">Pending Tasks This Week</div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <div className="text-2xl font-semibold">{overallProgress}%</div>
              </div>
              <div className="text-sm text-muted-foreground font-medium">Overall Progress</div>
            </div>
          </div>
        </section>

        {/* Compact Today's Focus */}
        <section>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-500" /> Today's Focus
          </h2>
          
          {todaysFocusItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {todaysFocusItems.map((item) => (
                <TaskActionCard 
                  key={item.task.id}
                  task={item.task}
                  goalTitle={item.goal.originalInput}
                  phaseTitle={item.phaseTitle}
                  milestoneTitle={item.milestoneTitle}
                  objectiveTitle={item.objectiveTitle}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-2xl p-6 text-center space-y-3 shadow-sm flex flex-col items-center">
              <CheckCircle2 size={32} className="text-green-500" />
              <h3 className="font-medium">All caught up for today!</h3>
            </div>
          )}
        </section>

        {/* My Goals List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target size={20} className="text-muted-foreground" /> My Goals
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
