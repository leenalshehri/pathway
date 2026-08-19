import { Prisma } from "@/generated/prisma/client";

// Define a type that includes the necessary nested relations to calculate progress
export type GoalWithTasks = Prisma.GoalGetPayload<{
  include: {
    phases: {
      include: {
        milestones: {
          include: {
            weeklyObjectives: {
              include: {
                tasks: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export function calculateGoalProgress(goal: GoalWithTasks): number {
  let totalTasks = 0;
  let completedTasks = 0;

  for (const phase of goal.phases) {
    for (const milestone of phase.milestones) {
      for (const objective of milestone.weeklyObjectives) {
        for (const task of objective.tasks) {
          totalTasks++;
          if (task.status === "COMPLETED") {
            completedTasks++;
          }
        }
      }
    }
  }

  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}
