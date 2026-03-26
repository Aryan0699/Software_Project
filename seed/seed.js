import { PrismaClient } from "../src/generated/prisma/client.js";
import logger from "../src/utils/logger.js";
import { upsertApprovedUsers } from "./seedApprovedUsers.js";
import { seedSlotSystemsSlotsOccurrencesAndAliases } from "./seedSlotSystems.js";
import { seedDepartments } from "./seedDepartments.js";
import { seedBuildingsAndRooms } from "./seedBuildingsAndRooms.js";
import { seedCoursesAssignmentsAllocationsAndOccupancies } from "./seedCoursesAssignmentsAllocationsAndOccupancies.js";

const prisma = new PrismaClient();

async function seed() {
  logger.info("Starting seed...");

  await upsertApprovedUsers(prisma);

  const { slotSystemIdByKey, slotIdBySystemAndCode } =
    await seedSlotSystemsSlotsOccurrencesAndAliases(prisma);

  const departmentMap = await seedDepartments(prisma);
  const { roomMap } = await seedBuildingsAndRooms(prisma);

  await seedCoursesAssignmentsAllocationsAndOccupancies(prisma, {
    departmentMap,
    roomMap,
    slotSystemIdByKey,
    slotIdBySystemAndCode,
  });

  logger.info("Seed completed successfully");
}

seed()
  .catch((error) => {
    logger.error(`Error seeding the database: ${error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
