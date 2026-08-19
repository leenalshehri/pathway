"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EntityStatus, GoalStatus } from "@/generated/prisma/client";

export async function toggleTaskComplete(taskId: string, isCompleted: boolean) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!dbUser) throw new Error("Unauthorized");

  // Fetch the task to ensure it belongs to the user and get its hierarchy
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      weeklyObjective: {
        include: {
          milestone: {
            include: {
              phase: {
                include: {
                  goal: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!task) throw new Error("Task not found");
  if (task.weeklyObjective.milestone.phase.goal.userId !== dbUser.id) {
    throw new Error("Unauthorized");
  }

  const newStatus = isCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;
  const goalId = task.weeklyObjective.milestone.phase.goal.id;
  const objectiveId = task.weeklyObjectiveId;
  const milestoneId = task.weeklyObjective.milestoneId;
  const phaseId = task.weeklyObjective.milestone.phaseId;

  // We will perform updates in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update the task
    await tx.task.update({
      where: { id: taskId },
      data: { status: newStatus }
    });

    // 2. Evaluate WeeklyObjective
    const allTasks = await tx.task.findMany({ where: { weeklyObjectiveId: objectiveId } });
    const allTasksCompleted = allTasks.length > 0 && allTasks.every(t => t.status === "COMPLETED");
    const newObjectiveStatus = allTasksCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;
    
    await tx.weeklyObjective.update({
      where: { id: objectiveId },
      data: { status: newObjectiveStatus }
    });

    // 3. Evaluate Milestone
    const allObjectives = await tx.weeklyObjective.findMany({ where: { milestoneId } });
    const allObjectivesCompleted = allObjectives.length > 0 && allObjectives.every(o => o.status === "COMPLETED");
    const newMilestoneStatus = allObjectivesCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;

    await tx.milestone.update({
      where: { id: milestoneId },
      data: { status: newMilestoneStatus }
    });

    // 4. Evaluate Phase
    const allMilestones = await tx.milestone.findMany({ where: { phaseId } });
    const allMilestonesCompleted = allMilestones.length > 0 && allMilestones.every(m => m.status === "COMPLETED");
    const newPhaseStatus = allMilestonesCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;

    await tx.phase.update({
      where: { id: phaseId },
      data: { status: newPhaseStatus }
    });

    // 5. Evaluate Goal
    const allPhases = await tx.phase.findMany({ where: { goalId } });
    const allPhasesCompleted = allPhases.length > 0 && allPhases.every(p => p.status === "COMPLETED");
    const newGoalStatus = allPhasesCompleted ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;

    await tx.goal.update({
      where: { id: goalId },
      data: { status: newGoalStatus }
    });
  });

  // Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath(`/roadmap/${goalId}`);
}
