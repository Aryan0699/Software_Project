import { PrismaClient } from "../src/generated/prisma/client.js";
import logger from "../src/utils/logger.js";
import { upsertApprovedUsers } from "./seedApprovedUsers.js";
import { seedSlotSystemsSlotsOccurrencesAndAliases } from "./seedSlotSystems.js";
import { seedDepartments } from "./seedDepartments.js";
import { seedBuildingsAndRooms } from "./seedBuildingsAndRooms.js";
import { seedCoursesAssignmentsAllocationsAndOccupancies } from "./seedCoursesAssignmentsAllocationsAndOccupancies.js";
import seedAdmin from "./seedAdmin.js";
const prisma = new PrismaClient();

async function seed() {
  logger.info("Starting seed...");

  await seedAdmin();

  logger.info("Admin user seeded successfully.");

  await upsertApprovedUsers(prisma);
  
  logger.info("Approved users seeded successfully.");
  
  const { slotSystemIdByKey, slotIdBySystemAndCode } =
    await seedSlotSystemsSlotsOccurrencesAndAliases(prisma);
  
  logger.info("Slot systems, slots, occurrences, and aliases seeded successfully.");
  
  const departmentMap = await seedDepartments(prisma);
  const { roomMap } = await seedBuildingsAndRooms(prisma);
  
  logger.info("Departments, buildings, and rooms seeded successfully.");
  
  await seedCoursesAssignmentsAllocationsAndOccupancies(prisma, {
    departmentMap,
    roomMap,
    slotSystemIdByKey,
    slotIdBySystemAndCode,
  });
  logger.info("Courses, assignments, allocations, and occupancies seeded successfully.");
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
