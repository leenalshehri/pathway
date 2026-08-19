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
    <div className={`group px-5 py-4 flex flex-col cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between"
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
      
      {/* Resources section */}
      {(task as any).resources && Array.isArray((task as any).resources) && (task as any).resources.length > 0 && (
        <div className="pl-8 mt-2 flex flex-col gap-1.5">
          {(task as any).resources.map((res: any, idx: number) => (
            <a 
              key={idx} 
              href={res.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Prevent toggling the task when clicking the link
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1"
            >
              <span className="shrink-0">🔗</span> {res.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
