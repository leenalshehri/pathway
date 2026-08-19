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

export async function toggleObjectiveComplete(objectiveId: string, isCompleted: boolean) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!dbUser) throw new Error("Unauthorized");

  const objective = await prisma.weeklyObjective.findUnique({
    where: { id: objectiveId },
    include: { milestone: { include: { phase: { include: { goal: true } } } } }
  });

  if (!objective) throw new Error("Objective not found");
  if (objective.milestone.phase.goal.userId !== dbUser.id) throw new Error("Unauthorized");

  const newStatus = isCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;
  const goalId = objective.milestone.phase.goal.id;
  const milestoneId = objective.milestoneId;
  const phaseId = objective.milestone.phaseId;

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { weeklyObjectiveId: objectiveId },
      data: { status: newStatus }
    });

    await tx.weeklyObjective.update({
      where: { id: objectiveId },
      data: { status: newStatus }
    });

    const allObjectives = await tx.weeklyObjective.findMany({ where: { milestoneId } });
    const allObjectivesCompleted = allObjectives.length > 0 && allObjectives.every(o => o.status === "COMPLETED");
    const newMilestoneStatus = allObjectivesCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;

    await tx.milestone.update({
      where: { id: milestoneId },
      data: { status: newMilestoneStatus }
    });

    const allMilestones = await tx.milestone.findMany({ where: { phaseId } });
    const allMilestonesCompleted = allMilestones.length > 0 && allMilestones.every(m => m.status === "COMPLETED");
    const newPhaseStatus = allMilestonesCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;

    await tx.phase.update({
      where: { id: phaseId },
      data: { status: newPhaseStatus }
    });

    const allPhases = await tx.phase.findMany({ where: { goalId } });
    const allPhasesCompleted = allPhases.length > 0 && allPhases.every(p => p.status === "COMPLETED");
    const newGoalStatus = allPhasesCompleted ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;

    await tx.goal.update({
      where: { id: goalId },
      data: { status: newGoalStatus }
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/roadmap/${goalId}`);
}

export async function togglePhaseComplete(phaseId: string, isCompleted: boolean) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!dbUser) throw new Error("Unauthorized");

  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: { goal: true }
  });

  if (!phase) throw new Error("Phase not found");
  if (phase.goal.userId !== dbUser.id) throw new Error("Unauthorized");

  const newStatus = isCompleted ? EntityStatus.COMPLETED : EntityStatus.PENDING;
  const goalId = phase.goal.id;

  await prisma.$transaction(async (tx) => {
    const milestones = await tx.milestone.findMany({ where: { phaseId } });
    const milestoneIds = milestones.map(m => m.id);
    
    const objectives = await tx.weeklyObjective.findMany({ where: { milestoneId: { in: milestoneIds } } });
    const objectiveIds = objectives.map(o => o.id);

    // Update tasks
    await tx.task.updateMany({
      where: { weeklyObjectiveId: { in: objectiveIds } },
      data: { status: newStatus }
    });

    // Update objectives
    await tx.weeklyObjective.updateMany({
      where: { milestoneId: { in: milestoneIds } },
      data: { status: newStatus }
    });

    // Update milestones
    await tx.milestone.updateMany({
      where: { phaseId },
      data: { status: newStatus }
    });

    // Update phase
    await tx.phase.update({
      where: { id: phaseId },
      data: { status: newStatus }
    });

    // Evaluate Goal
    const allPhases = await tx.phase.findMany({ where: { goalId } });
    const allPhasesCompleted = allPhases.length > 0 && allPhases.every(p => p.status === "COMPLETED");
    const newGoalStatus = allPhasesCompleted ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;

    await tx.goal.update({
      where: { id: goalId },
      data: { status: newGoalStatus }
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/roadmap/${goalId}`);
}
