"use client";

import { useTransition, useOptimistic } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { toggleTaskComplete } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";

interface TaskActionCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    durationMins: number;
  };
  goalTitle: string;
  phaseTitle?: string;
  milestoneTitle?: string;
  objectiveTitle?: string;
}

export function TaskActionCard({ task, goalTitle, phaseTitle, milestoneTitle, objectiveTitle }: TaskActionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status);
  const router = useRouter();

  const handleToggle = () => {
    const isCompleted = optimisticStatus === "COMPLETED";
    const nextStatus = isCompleted ? "PENDING" : "COMPLETED";
    
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      try {
        await toggleTaskComplete(task.id, !isCompleted);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const isCompleted = optimisticStatus === "COMPLETED";

  return (
    <div 
      onClick={handleToggle}
      className={`group relative bg-card border border-card-border rounded-xl p-5 transition-all cursor-pointer overflow-hidden ${
        isCompleted 
          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 hover:border-green-300" 
          : "hover:border-blue-500/50 hover:shadow-md"
      } ${isPending ? "opacity-50 pointer-events-none" : "shadow-sm"}`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}></div>
      
      <div className="flex flex-col h-full justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase mb-2 line-clamp-1">
            {goalTitle}
          </div>
          <h3 className={`text-lg font-semibold transition-colors line-clamp-2 ${
            isCompleted ? "text-muted-foreground line-through" : "text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400"
          }`}>
            {task.title}
          </h3>

          {/* Resources section */}
          {(task as any).resources && Array.isArray((task as any).resources) && (task as any).resources.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {(task as any).resources.map((res: any, idx: number) => (
                <a 
                  key={idx} 
                  href={res.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} 
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                >
                  <span className="shrink-0">🔗</span> {res.title}
                </a>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-end justify-between mt-auto">
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Clock size={14} /> {task.durationMins} mins
          </div>
          
          <button 
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isCompleted 
                ? "bg-green-500 text-white" 
                : "bg-muted text-muted-foreground group-hover:bg-blue-500 group-hover:text-white"
            }`}
          >
            {isCompleted ? <CheckCircle2 size={20} /> : (isPending ? <Circle size={20} className="animate-spin" /> : <CheckCircle2 size={20} />)}
          </button>
        </div>
      </div>
    </div>
  );
}
