import 'dotenv/config';
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "./src/lib/prisma";
import { getAIModel } from "./src/lib/ai-provider";

// Schemas
const ClarificationSchema = z.object({
  is_clear: z.boolean(),
  feasibility_score: z.number().min(0).max(100),
  questions: z.array(z.string()),
  clarified_goal: z.string().optional(),
  feedback: z.string(),
});

const TaskSchema = z.object({
  title: z.string(),
  durationMins: z.number(),
});
const WeeklyObjectiveSchema = z.object({
  title: z.string(),
  tasks: z.array(TaskSchema),
});
const MilestoneSchema = z.object({
  title: z.string(),
  weeklyObjectives: z.array(WeeklyObjectiveSchema),
});
const PhaseSchema = z.object({
  title: z.string(),
  milestones: z.array(MilestoneSchema),
});
const RoadmapSchema = z.object({
  phases: z.array(PhaseSchema),
  projected_finish_date: z.string(),
});
const ValidatorSchema = z.object({
  is_valid: z.boolean(),
  feedback: z.string(),
  corrected_roadmap: RoadmapSchema.optional(),
});

async function runTest() {
  console.log("=== STARTING AI PIPELINE E2E TEST ===\n");

  // 1. Create a mock user
  const user = await prisma.user.upsert({
    where: { clerkId: "mock_user_123" },
    update: {},
    create: {
      clerkId: "mock_user_123",
      email: "test@example.com",
      name: "Test User",
    }
  });
  console.log("Mock User created:", user.id);

  const goalsToTest = [
    { input: "I want to learn Python", constraints: "1 hour a day", dailyMinutes: 60 },
    { input: "I want to prepare for a marathon in 6 months", constraints: "Beginner runner", dailyMinutes: 45 }
  ];

  for (const test of goalsToTest) {
    console.log(`\n\n--- TESTING GOAL: "${test.input}" ---`);
    
    // Create initial goal
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        originalInput: test.input,
        dailyMinutes: test.dailyMinutes,
        constraints: test.constraints,
      }
    });

    // CLARIFY
    console.log("\n[1] Running Clarify...");
    const { object: clarifyResult } = await generateObject({
      model: getAIModel(),
      schema: ClarificationSchema,
      prompt: `You are an expert goal planner. Analyze this goal: "${test.input}". Constraint: ${test.constraints}. Determine if it's actionable enough to generate a realistic roadmap without further questions.`,
    });
    
    console.log("Clarification Result:", JSON.stringify(clarifyResult, null, 2));

    // GENERATE (assuming it's clear enough or we mock the clarification)
    let finalObjective = clarifyResult.clarified_goal || `${test.input} (with constraints: ${test.constraints})`;
    console.log(`\n[2] Running Generate for Objective: "${finalObjective}"...`);
    
    let { object: roadmap } = await generateObject({
      model: getAIModel(),
      schema: RoadmapSchema,
      prompt: `Generate a realistic roadmap for: "${finalObjective}". Time limit: ${test.dailyMinutes} mins/day. Constraint: ${test.constraints}. Structure into Phases, Milestones, Weekly Objectives, and Daily Tasks.`,
    });

    console.log(`Generated ${roadmap.phases.length} Phases. Running Validator...`);

    // VALIDATOR
    const { object: validationResult } = await generateObject({
      model: getAIModel(),
      schema: ValidatorSchema,
      prompt: `Review this roadmap for goal: "${finalObjective}". Is it highly realistic without duplicate tasks? \nRoadmap: ${JSON.stringify(roadmap)}`,
    });

    if (!validationResult.is_valid && validationResult.corrected_roadmap) {
      console.log("Validator found issues. Correcting roadmap...", validationResult.feedback);
      roadmap = validationResult.corrected_roadmap;
    } else {
      console.log("Validator approved roadmap:", validationResult.feedback);
    }

    const parsedDate = new Date(roadmap.projected_finish_date);
    const targetDate = isNaN(parsedDate.getTime()) ? null : parsedDate;

    // PERSIST TO DB
    console.log("\n[3] Saving to Supabase...");
    const savedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        clarifiedObjective: finalObjective,
        status: "IN_PROGRESS",
        targetDate: targetDate,
        phases: {
          create: roadmap.phases.map((phase, pIdx) => ({
            title: phase.title,
            order: pIdx,
            milestones: {
              create: phase.milestones.map((milestone, mIdx) => ({
                title: milestone.title,
                order: mIdx,
                weeklyObjectives: {
                  create: milestone.weeklyObjectives.map((wo, wIdx) => ({
                    title: wo.title,
                    order: wIdx,
                    tasks: {
                      create: wo.tasks.map((task) => ({
                        title: task.title,
                        durationMins: task.durationMins,
                      })),
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
      include: { phases: { include: { milestones: true } } }
    });

    console.log("✅ Successfully saved to Supabase! Phases count:", savedGoal.phases.length);
  }
}

runTest().catch(console.error).finally(() => process.exit(0));
