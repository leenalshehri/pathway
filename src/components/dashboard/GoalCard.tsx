"use client";

import { useTransition } from "react";
import { calculateGoalProgress } from "@/lib/progress";
import Link from "next/link";
import { CalendarDays, Trash2, ArrowRight } from "lucide-react";
import { deleteGoal } from "@/app/actions/goal-actions";
import { useRouter } from "next/navigation";

export function GoalCard({ goal }: { goal: any }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const progress = calculateGoalProgress(goal);
  const isCompleted = goal.status === "COMPLETED";

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
      startTransition(async () => {
        await deleteGoal(goal.id);
        router.refresh();
      });
    }
  };

  // Find current milestone/task for the preview
  let currentMilestone = null;
  let nextTask = null;
  
  if (!isCompleted) {
    for (const phase of goal.phases) {
      for (const milestone of phase.milestones) {
        if (milestone.status !== "COMPLETED") {
          currentMilestone = milestone.title;
          for (const obj of milestone.weeklyObjectives) {
            for (const task of obj.tasks) {
              if (task.status !== "COMPLETED") {
                nextTask = task.title;
                break;
              }
            }
            if (nextTask) break;
          }
          break;
        }
      }
      if (currentMilestone) break;
    }
  }

  return (
    <Link href={`/roadmap/${goal.id}`} className={`group block bg-card border border-card-border rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        
        {/* Left Side: Info */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-xs font-semibold px-2 py-1 rounded-md ${isCompleted ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                {goal.status.replace("_", " ")}
              </div>
              {goal.targetDate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <CalendarDays size={14} /> {new Date(goal.targetDate).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleDelete}
              className="md:hidden p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 capitalize">
              {goal.originalInput || "Untitled Goal"}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {goal.clarifiedObjective}
            </p>
          </div>

          {!isCompleted && currentMilestone && (
            <div className="pt-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground shrink-0">Current:</span>
                <span className="text-muted-foreground line-clamp-1">{currentMilestone}</span>
              </div>
              {nextTask && (
                <div className="flex items-start gap-2 mt-1">
                  <span className="font-medium text-foreground shrink-0">Up Next:</span>
                  <span className="text-muted-foreground line-clamp-1">{nextTask}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Right Side: Progress & Actions */}
        <div className="flex flex-col items-end gap-6 shrink-0 w-full md:w-56">
          <div className="w-full">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="text-foreground font-bold">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 w-full justify-end">
            <button 
              onClick={handleDelete}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              title="Delete Goal"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
              View Roadmap <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
