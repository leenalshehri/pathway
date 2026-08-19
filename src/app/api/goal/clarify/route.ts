import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIModel } from "@/lib/ai-provider";

const ClarificationSchema = z.object({
  is_clear: z.boolean().describe("True if the goal is clear, measurable, and has enough context to build a realistic timeline. False if it is vague or missing key constraints."),
  feasibility_score: z.number().min(0).max(100).describe("A score from 0 to 100 evaluating if the goal is realistic. Vague goals should have lower scores until clarified."),
  questions: z.array(z.string()).describe("If is_clear is false, provide 2 to 4 specific, dynamic questions to extract missing context (e.g., target dates, current skill level, daily available time). Must be empty if is_clear is true."),
  clarified_goal: z.string().optional().describe("If is_clear is true, provide a professionally rewritten SMART version of the goal. Null/omitted if is_clear is false."),
  feedback: z.string().describe("A short, encouraging message to the user explaining why we need this information or confirming their goal is great."),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { goalInput, previousAnswers } = body;

    if (!goalInput) {
      return new NextResponse("Goal input is required", { status: 400 });
    }

    let prompt = `You are Pathway, an expert AI goal planner. Analyze the following goal from the user: "${goalInput}".`;
    
    if (previousAnswers && previousAnswers.length > 0) {
      prompt += `\n\nThe user has also provided these answers to previous clarification questions:\n`;
      previousAnswers.forEach((ans: { question: string; answer: string }) => {
        prompt += `Q: ${ans.question}\nA: ${ans.answer}\n`;
      });
      prompt += `\nDetermine if you now have enough information to create a structured, realistic roadmap.`;
    } else {
      prompt += `\n\nDetermine if this goal is specific and actionable enough to generate a realistic roadmap, or if you need to ask clarification questions first.`;
    }

    const { object } = await generateObject({
      model: getAIModel(),
      schema: ClarificationSchema,
      prompt: prompt,
      temperature: 0.4,
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("[CLARIFY_ERROR]", error);
    
    // Check if it's a quota/rate-limit error from the AI provider
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
