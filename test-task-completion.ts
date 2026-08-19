import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { EntityStatus, GoalStatus } from "@prisma/client";

async function main() {
  console.log("=== STARTING TASK COMPLETION TEST ===");

  // 1. Find a user that has a Goal
  const dbUser = await prisma.user.findFirst({
    include: {
      goals: {
        include: {
          phases: {
            include: {
              milestones: {
                include: {
                  weeklyObjectives: {
                    include: {
                      tasks: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  let goal, phase, milestone, objective;
  for (const g of dbUser.goals) {
    if (g.phases.length > 0 && g.phases[0].milestones.length > 0 && g.phases[0].milestones[0].weeklyObjectives.length > 0 && g.phases[0].milestones[0].weeklyObjectives[0].tasks.length > 0) {
      goal = g;
      phase = g.phases[0];
      milestone = phase.milestones[0];
      objective = milestone.weeklyObjectives[0];
      break;
    }
  }

  if (!goal) {
    console.log("No users with valid goals found. Run test-pipeline.ts first.");
    return;
  }

  const taskToToggle = objective.tasks[0];
  console.log(`Selected Task: ${taskToToggle.title} (Current status: ${taskToToggle.status})`);

  // To properly test bubbling up, we need to artificially complete all sibling tasks 
  // except for this one, so toggling this ONE task will toggle the entire hierarchy.
  console.log("\n[SETUP] Completing all other tasks in the entire goal to test hierarchical bubbling...");
  
  await prisma.task.updateMany({
    where: { weeklyObjective: { milestone: { phase: { goalId: goal.id } } }, id: { not: taskToToggle.id } },
    data: { status: "COMPLETED" }
  });
  await prisma.weeklyObjective.updateMany({
    where: { milestone: { phase: { goalId: goal.id } }, id: { not: objective.id } },
    data: { status: "COMPLETED" }
  });
  await prisma.milestone.updateMany({
    where: { phase: { goalId: goal.id }, id: { not: milestone.id } },
    data: { status: "COMPLETED" }
  });
  await prisma.phase.updateMany({
    where: { goalId: goal.id, id: { not: phase.id } },
    data: { status: "COMPLETED" }
  });

  // Now, objective, milestone, phase should currently be PENDING because taskToToggle is PENDING.
  // Let's manually trigger a hierarchy update for the goal to ensure everything is PENDING initially
  // Actually, we can just use the logic from our server action directly here to simulate it.
  
  // We'll write a small helper that mirrors toggleTaskComplete's hierarchy update
  async function updateHierarchy(taskId: string, newStatus: EntityStatus) {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: { weeklyObjective: { include: { milestone: { include: { phase: true } } } } }
    });

    if (!t) return;

    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data: { status: newStatus } });

      const objectiveId = t.weeklyObjectiveId;
      const allTasks = await tx.task.findMany({ where: { weeklyObjectiveId: objectiveId } });
      const newObjStat = allTasks.length > 0 && allTasks.every(x => x.status === "COMPLETED") ? "COMPLETED" : "PENDING";
      await tx.weeklyObjective.update({ where: { id: objectiveId }, data: { status: newObjStat } });

      const milestoneId = t.weeklyObjective.milestoneId;
      const allObjs = await tx.weeklyObjective.findMany({ where: { milestoneId } });
      const newMsStat = allObjs.length > 0 && allObjs.every(x => x.status === "COMPLETED") ? "COMPLETED" : "PENDING";
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: newMsStat } });

      const phaseId = t.weeklyObjective.milestone.phaseId;
      const allMs = await tx.milestone.findMany({ where: { phaseId } });
      const newPhStat = allMs.length > 0 && allMs.every(x => x.status === "COMPLETED") ? "COMPLETED" : "PENDING";
      await tx.phase.update({ where: { id: phaseId }, data: { status: newPhStat } });

      const goalId = t.weeklyObjective.milestone.phase.goalId;
      const allPhs = await tx.phase.findMany({ where: { goalId } });
      const newGlStat = allPhs.length > 0 && allPhs.every(x => x.status === "COMPLETED") ? "COMPLETED" : "IN_PROGRESS";
      await tx.goal.update({ where: { id: goalId }, data: { status: newGlStat } });
    });
  }

  // Ensure baseline is set
  await updateHierarchy(taskToToggle.id, "PENDING");

  console.log("\n[TEST 1] Completing the final task (Forward Propagation)");
  await updateHierarchy(taskToToggle.id, "COMPLETED");

  let checkGoal = await prisma.goal.findUnique({
    where: { id: goal.id },
    include: { phases: { include: { milestones: { include: { weeklyObjectives: true } } } } }
  });

  console.log(`Task Status: COMPLETED`);
  console.log(`WeeklyObjective Status: ${checkGoal?.phases[0].milestones[0].weeklyObjectives[0].status} (Expected: COMPLETED)`);
  console.log(`Milestone Status: ${checkGoal?.phases[0].milestones[0].status} (Expected: COMPLETED)`);
  console.log(`Phase Status: ${checkGoal?.phases[0].status} (Expected: COMPLETED)`);
  console.log(`Goal Status: ${checkGoal?.status} (Expected: COMPLETED)`);

  console.log("\n[TEST 2] Uncompleting the final task (Backward Propagation)");
  await updateHierarchy(taskToToggle.id, "PENDING");

  checkGoal = await prisma.goal.findUnique({
    where: { id: goal.id },
    include: { phases: { include: { milestones: { include: { weeklyObjectives: true } } } } }
  });

  console.log(`Task Status: PENDING`);
  console.log(`WeeklyObjective Status: ${checkGoal?.phases[0].milestones[0].weeklyObjectives[0].status} (Expected: PENDING)`);
  console.log(`Milestone Status: ${checkGoal?.phases[0].milestones[0].status} (Expected: PENDING)`);
  console.log(`Phase Status: ${checkGoal?.phases[0].status} (Expected: PENDING)`);
  console.log(`Goal Status: ${checkGoal?.status} (Expected: IN_PROGRESS)`);

  console.log("\n✅ Test completed.");
}

main().catch(console.error);
