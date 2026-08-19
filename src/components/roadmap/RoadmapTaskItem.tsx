"use client";

import { useTransition, useOptimistic } from "react";
import { Check, Clock } from "lucide-react";
import { toggleTaskComplete } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";

interface RoadmapTaskItemProps {
  task: {
    id: string;
    title: string;
    status: string;
    durationMins: number;
  };
}

export function RoadmapTaskItem({ task }: RoadmapTaskItemProps) {
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
      className={`group px-5 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors border ${
          isCompleted 
            ? "bg-green-500 border-green-500 text-white" 
            : "border-neutral-300 dark:border-neutral-600 group-hover:border-blue-400 dark:group-hover:border-blue-500"
        }`}>
          {isCompleted && <Check size={14} strokeWidth={3} />}
        </div>
        <span className={`text-sm transition-colors ${
          isCompleted ? "text-neutral-400 dark:text-neutral-500 line-through" : "text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white"
        }`}>
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
        <Clock size={12} />
        {task.durationMins}m
      </div>
    </div>
  );
}
