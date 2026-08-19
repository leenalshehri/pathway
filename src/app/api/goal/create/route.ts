import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress || `${user.id}@example.com`;

    const dbUser = await prisma.user.upsert({
      where: { clerkId: user.id },
      update: {},
      create: {
        clerkId: user.id,
        email: email,
        name: user.firstName ? `${user.firstName} ${user.lastName}` : "User",
      }
    });

    const body = await req.json();
    const { originalInput, constraints, clarifiedObjective } = body;

    const goal = await prisma.goal.create({
      data: {
        userId: dbUser.id,
        originalInput,
        constraints,
        clarifiedObjective,
        status: "PLANNING",
      },
    });

    return NextResponse.json({ id: goal.id });
  } catch (error) {
    console.error("[GOAL_CREATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
