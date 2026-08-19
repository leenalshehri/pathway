import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAIModel } from "@/lib/ai-provider";

const TaskSchema = z.object({
  title: z.string().describe("Specific, actionable task title."),
  durationMins: z.number().describe("Estimated time to complete in minutes. Ideally around 20 minutes."),
});

const WeeklyObjectiveSchema = z.object({
  title: z.string().describe("The objective for this specific week."),
  tasks: z.array(TaskSchema).describe("List of daily tasks to achieve this weekly objective."),
});

const MilestoneSchema = z.object({
  title: z.string().describe("A major milestone reached after completing its weekly objectives."),
  weeklyObjectives: z.array(WeeklyObjectiveSchema),
});

const PhaseSchema = z.object({
  title: z.string().describe("A broad phase of the goal (e.g., 'Fundamentals', 'Practice')."),
  milestones: z.array(MilestoneSchema),
});

const RoadmapSchema = z.object({
  phases: z.array(PhaseSchema),
  projected_finish_date: z.string().describe("ISO date string representing the realistic completion date."),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { goalId, clarifiedObjective, constraints, dailyMinutes } = body;

    if (!goalId || !clarifiedObjective) {
      return new NextResponse("Goal ID and Clarified Objective are required", { status: 400 });
    }

    const prompt = `
      You are Pathway, an expert AI goal planner. Your task is to generate a comprehensive, realistic, and structured roadmap for the user's goal.
      
      Goal: "${clarifiedObjective}"
      Time Commitment: ${dailyMinutes ? `${dailyMinutes} minutes per day` : "User hasn't specified, assume a reasonable pace"}
      Additional Constraints: ${constraints || "None provided"}
      
      Break down the goal into:
      1. Phases (broad stages of progress)
      2. Milestones (significant achievements within a phase)
      3. Weekly Objectives (focus for a specific week)
      4. Tasks (specific, daily actionable items, ideally ~20 minutes each, DO NOT exceed the daily time commitment in total across tasks meant for one day)
      
      Be extremely realistic. Do not generate generic templates; tailor every task specifically to this exact goal.
    `;

    let { object: roadmap } = await generateObject({
      model: getAIModel(),
      schema: RoadmapSchema,
      prompt: prompt,
      temperature: 0.5,
    });

    // AI Validator Step
    const ValidatorSchema = z.object({
      is_valid: z.boolean(),
      feedback: z.string().describe("If invalid, explain why (e.g. duplicate tasks, unrealistic timeframe)."),
      corrected_roadmap: RoadmapSchema.optional().describe("If invalid, provide the corrected roadmap."),
    });

    const { object: validationResult } = await generateObject({
      model: getAIModel(),
      schema: ValidatorSchema,
      prompt: `
        Review the following AI-generated roadmap for a user whose goal is: "${clarifiedObjective}".
        Constraints: ${dailyMinutes ? `${dailyMinutes} mins/day` : "None"}.
        
        Roadmap: ${JSON.stringify(roadmap, null, 2)}
        
        Is this roadmap highly realistic? Are there any duplicate tasks? Do the daily tasks fit within the daily time limits? Does it logically lead to the goal?
        If it's good, set is_valid to true. If it has flaws, set is_valid to false and provide the entirely corrected roadmap in corrected_roadmap.
      `,
    });

    if (!validationResult.is_valid && validationResult.corrected_roadmap) {
      console.log("[AI_VALIDATOR] Roadmap was corrected:", validationResult.feedback);
      roadmap = validationResult.corrected_roadmap;
    }

    const parsedDate = new Date(roadmap.projected_finish_date);
    const targetDate = isNaN(parsedDate.getTime()) ? null : parsedDate;

    // Save the structured data to the database
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
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
    });

    return NextResponse.json(updatedGoal);
  } catch (error: any) {
    console.error("[GENERATE_ERROR]", error);

    const isQuotaError = 
      error?.statusCode === 429 || 
      error?.message?.includes("quota") || 
      error?.message?.includes("429");
      
    if (isQuotaError) {
      return new NextResponse("AI request limit reached, please try again shortly.", { status: 429 });
    }

    return new NextResponse("Internal Error", { status: 500 });
  }
}
