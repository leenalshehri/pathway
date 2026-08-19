import { PrismaClient } from "./src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const objectives = await prisma.weeklyObjective.findMany({
    include: { tasks: { orderBy: { id: "asc" } } }
  });

  for (const obj of objectives) {
    for (let i = 0; i < obj.tasks.length; i++) {
      await prisma.task.update({
        where: { id: obj.tasks[i].id },
        data: { order: i }
      });
    }
  }

  console.log("Updated task orders");
}

main().catch(console.error).finally(() => prisma.$disconnect());
