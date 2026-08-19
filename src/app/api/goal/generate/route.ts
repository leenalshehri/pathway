import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAIModel } from "@/lib/ai-provider";

const TaskResourceSchema = z.object({
  title: z.string().describe("Title of the resource (e.g., 'Search YouTube: Python Variables' or 'Google Search: React Hooks docs')"),
  url: z.string().describe("MUST BE A GOOGLE SEARCH URL (https://www.google.com/search?q=...) OR A YOUTUBE SEARCH URL (https://www.youtube.com/results?search_query=...). NO OTHER URLS ARE ALLOWED."),
});

const TaskSchema = z.object({
  title: z.string().describe("Specific, actionable task title. MUST start with 'Day X: ' (e.g., 'Day 1: Setup Environment')."),
  durationMins: z.number().describe("Estimated time to complete in minutes. Ideally around 20 minutes."),
  resources: z.array(TaskResourceSchema).length(1).describe("Provide EXACTLY 1 search link (Google or YouTube) for this daily task."),
});

const WeeklyObjectiveSchema = z.object({
  title: z.string().describe("The objective for this specific week. MUST start with 'Week X: ' (e.g., 'Week 1: Fundamentals')."),
  tasks: z.array(TaskSchema).min(5).max(7).describe("MUST contain 5 to 7 daily tasks, explicitly named Day 1 to Day 7."),
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
      
      CRITICAL TIMEFRAME RULE: Look closely at the Additional Constraints. If the user explicitly asks for a timeframe (e.g., "in 2 weeks", "in 1 month"), you MUST mathematically ensure that the TOTAL number of Weekly Objectives generated across all phases EXACTLY matches the requested timeframe (e.g. 2 weeks = exactly 2 Weekly Objectives total). DO NOT generate more weeks than requested!
      
      CRITICAL NAMING RULE: Every Weekly Objective title MUST start with "Week X: " (e.g., "Week 1: ...", "Week 2: ..."). Every Task title MUST start with "Day X: " (e.g., "Day 1: ...", "Day 2: ..."). Do not skip this!
      
      CRITICAL DAILY TASKS RULE: The user wants DAILY tasks explicitly numbered. Every single Weekly Objective MUST contain EXACTLY 5 to 7 tasks. 
      
      CRITICAL RESOURCES RULE (NO DEAD LINKS, SPECIFIC QUERIES ONLY):
      You MUST provide exactly 1 resource per task. 
      Because AI models hallucinate direct URLs, you are STRICTLY FORBIDDEN from generating any direct article or video URL.
      EVERY single URL you generate MUST be either:
      1. A YouTube Search Link: https://www.youtube.com/results?search_query=your+precise+search+terms
      2. A Google Search Link: https://www.google.com/search?q=your+precise+search+terms
      
      SEARCH QUERY QUALITY RULE - THIS IS CRITICAL:
      The search query MUST be highly specific to the exact task. Generic queries like "learn python", "react tutorial", or "javascript basics" are FORBIDDEN.
      The query must reflect: (1) the exact topic of that specific day, (2) the user's skill level/context, and (3) the learning objective.
      BAD example: "learn python" → GOOD example: "python list comprehension for beginners step by step tutorial"
      BAD example: "react tutorial" → GOOD example: "react useEffect hook data fetching side effects explained"
      BAD example: "javascript basics" → GOOD example: "javascript async await promises error handling practical example"
      Build the search query from the task title itself — encode spaces as + signs in the URL.
      
      Break down the goal into:
      1. Phases (broad stages of progress)
      2. Milestones (significant achievements within a phase)
      3. Weekly Objectives (focus for a specific week, starting with "Week X: ")
      4. Tasks (5-7 daily actionable items per week, each starting with "Day X: ")
      
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
      feedback: z.string().describe("If invalid, explain why (e.g. timeframe not respected, less than 5 tasks per week, missing resources)."),
      corrected_roadmap: RoadmapSchema.optional().describe("If invalid, provide the completely corrected roadmap."),
    });

    const { object: validationResult } = await generateObject({
      model: getAIModel(),
      schema: ValidatorSchema,
      prompt: `
        Review the following AI-generated roadmap for a user whose goal is: "${clarifiedObjective}".
        Constraints: ${constraints || "None provided"} (PAY CLOSE ATTENTION TO REQUESTED TIMEFRAME).
        
        Roadmap: ${JSON.stringify(roadmap, null, 2)}
        
        VALIDATION RULES:
        1. TIMEFRAME: If the constraints asked for "2 weeks", are there exactly 2 Weekly Objectives in total? If no, it's invalid.
        2. DAILY TASKS: Does EVERY Weekly Objective have 5 to 7 tasks? If any week has fewer than 5 tasks, it's invalid.
        3. RESOURCES: Does EVERY single task have at least 1 resource (YouTube video, link) attached to it? If any task lacks resources, it's invalid.
        
        If it's good, set is_valid to true. If it violates ANY rule, set is_valid to false and provide the entirely corrected roadmap fixing the weeks, adding daily tasks, and adding resources.
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
                      create: wo.tasks.map((task, tIdx) => ({
                        title: task.title,
                        order: tIdx,
                        durationMins: task.durationMins,
                        resources: task.resources || [],
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
