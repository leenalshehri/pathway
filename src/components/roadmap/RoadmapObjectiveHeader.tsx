"use client";

import { useTransition, useOptimistic } from "react";
import { CheckCircle2 } from "lucide-react";
import { toggleObjectiveComplete } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";

interface RoadmapObjectiveHeaderProps {
  objective: {
    id: string;
    title: string;
    status: string;
  };
}

export function RoadmapObjectiveHeader({ objective }: RoadmapObjectiveHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(objective.status);
  const router = useRouter();

  const isCompleted = optimisticStatus === "COMPLETED";

  const handleToggle = () => {
    const nextStatus = isCompleted ? "PENDING" : "COMPLETED";
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      try {
        await toggleObjectiveComplete(objective.id, !isCompleted);
        router.refresh();
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <div 
      onClick={handleToggle}
      className={`px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between transition-all cursor-pointer group ${
        isCompleted 
          ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20' 
          : 'bg-neutral-50 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600 shrink-0 group-hover:border-blue-400 transition-colors"></div>
        )}
        <h4 className={`font-medium transition-colors ${
          isCompleted 
            ? 'text-neutral-500 line-through' 
            : 'text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
        }`}>
          {objective.title}
        </h4>
      </div>
      
      <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
        {isCompleted ? 'Mark uncompleted' : 'Complete all'}
      </div>
    </div>
  );
}
