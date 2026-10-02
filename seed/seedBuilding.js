import { prisma } from "../src/db/index.js";

export const buildingRooms = {
  BB: ["101", "102", "104", "105"],
  CI: ["110"],
  CS: ["101"],
  CY: ["107", "108"],
  EE: ["108", "109", "114", "115"],
  LHB: ["308"],
  LHC: [
    "105",
    "106",
    "110",
    "204",
    "205",
    "206",
    "207",
    "304",
    "305",
    "306",
    "307",
    "308",
  ],
  "LHC-2": ["101", "102", "103"],
  ME: ["108", "109", "114", "115"],
  MT: ["109", "110", "112", "113"],
  PH: ["101", "102", "104", "105"],
  SME: ["L1", "L2", "L5", "L6"],
  SOLA: [],
};

async function seedBuildingsAndRooms() {
  for (const [buildingCode, roomNumbers] of Object.entries(buildingRooms)) {
    const building = await prisma.building.upsert({
      where: {
        code: buildingCode,
      },
      update: {
        isActive: true,
      },
      create: {
        code: buildingCode,
        name: buildingCode,
        isActive: true,
      },
    });

    for (const roomNumber of roomNumbers) {
      const fullCode =
        buildingCode === "LHC-2"
          ? `LHC 2 ${roomNumber}`
          : `${buildingCode} ${roomNumber}`;

      await prisma.room.upsert({
        where: {
          fullCode,
        },
        update: {
          buildingId: building.id,
          roomNumber,
          status: "ACTIVE",
        },
        create: {
          buildingId: building.id,
          roomNumber,
          fullCode,
          displayName: fullCode,
          status: "ACTIVE",
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding buildings and rooms...");

  await seedBuildingsAndRooms();

  console.log("Buildings and rooms seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
});