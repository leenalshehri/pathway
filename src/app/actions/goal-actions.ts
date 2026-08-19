"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteGoal(goalId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!dbUser) throw new Error("Unauthorized");

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");
  if (goal.userId !== dbUser.id) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    const phases = await tx.phase.findMany({ where: { goalId } });
    const phaseIds = phases.map(p => p.id);
    
    const milestones = await tx.milestone.findMany({ where: { phaseId: { in: phaseIds } } });
    const milestoneIds = milestones.map(m => m.id);
    
    const objectives = await tx.weeklyObjective.findMany({ where: { milestoneId: { in: milestoneIds } } });
    const objectiveIds = objectives.map(o => o.id);

    // Delete from bottom up in bulk
    await tx.task.deleteMany({ where: { weeklyObjectiveId: { in: objectiveIds } } });
    await tx.weeklyObjective.deleteMany({ where: { milestoneId: { in: milestoneIds } } });
    await tx.milestone.deleteMany({ where: { phaseId: { in: phaseIds } } });
    await tx.phase.deleteMany({ where: { goalId } });
    await tx.weeklyReview.deleteMany({ where: { goalId } });
    
    await tx.goal.delete({ where: { id: goalId } });
  });

  revalidatePath("/dashboard");
}
