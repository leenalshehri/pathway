"use client";

import { useTransition, useOptimistic } from "react";
import { CheckCircle2 } from "lucide-react";
import { togglePhaseComplete } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";

interface RoadmapPhaseHeaderProps {
  phase: {
    id: string;
    title: string;
    status: string;
  };
  index: number;
}

export function RoadmapPhaseHeader({ phase, index }: RoadmapPhaseHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(phase.status);
  const router = useRouter();

  const isCompleted = optimisticStatus === "COMPLETED";

  const handleToggle = () => {
    const nextStatus = isCompleted ? "PENDING" : "COMPLETED";
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      try {
        await togglePhaseComplete(phase.id, !isCompleted);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <div className="flex items-center gap-6 group">
      <div className="hidden md:flex flex-1 justify-end">
        <div className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest">Phase {index + 1}</div>
      </div>
      
      <button 
        onClick={handleToggle}
        disabled={isPending}
        className={`shrink-0 w-8 h-8 rounded-full border-4 flex items-center justify-center z-10 transition-all shadow-sm ${
          isCompleted 
            ? 'bg-blue-500 border-blue-500 text-white hover:bg-neutral-400 hover:border-neutral-400' 
            : 'bg-white dark:bg-[#050505] border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
        } ${isPending ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        title={isCompleted ? "Mark Phase as Uncompleted" : "Complete Entire Phase"}
      >
        {isCompleted && <CheckCircle2 size={16} className="text-white" />}
      </button>
      
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-black dark:text-white flex items-center gap-3">
          {phase.title}
          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {isCompleted ? '(Click checkmark to undo)' : '(Click circle to complete phase)'}
          </span>
        </h2>
        <div className="md:hidden text-xs font-medium text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-widest">Phase {index + 1}</div>
      </div>
    </div>
  );
}
