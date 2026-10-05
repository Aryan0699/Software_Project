import { prisma } from "../src/db/index.js";

const buildingRooms = {
  BB: ["101", "102", "104", "105"],
  CI: ["110"],

  CSE: ["101", "102"],

  CY: ["107", "108"],

  EE: ["108", "109", "114", "115"],

  "LHC-1": [
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

  "LHC-2": [
    "101",
    "102",
    "103",
  ],

  ME: [
    "108",
    "109",
    "114",
    "115",
  ],

  MT: [
    "109",
    "110",
    "112",
    "113",
  ],

  PHY: [
    "101",
    "102",
    "104",
    "105",
  ],

  SME: [
    "L1",
    "L2",
    "L5",
    "L6",
  ],

  // No confirmed physical room number yet.
  // SOLA intentionally omitted.
};

async function getClassroomType() {
  return prisma.roomType.upsert({
    where: {
      code: "CLASSROOM",
    },

    update: {
      name: "Classroom",
      isActive: true,
    },

    create: {
      code: "CLASSROOM",
      name: "Classroom",
      isActive: true,
    },
  });
}

async function seedRooms() {
  const classroomType = await getClassroomType();

  for (const [buildingCode, roomNumbers] of Object.entries(buildingRooms)) {
    const building = await prisma.building.findUnique({
      where: {
        code: buildingCode,
      },
    });

    if (!building) {
      throw new Error(
        `Building "${buildingCode}" does not exist. Create the building before seeding its rooms.`,
      );
    }

    for (const roomNumber of roomNumbers) {
      const fullCode = `${buildingCode}-${roomNumber}`;

      await prisma.room.upsert({
        where: {
          fullCode,
        },

        update: {
          buildingId: building.id,
          roomTypeId: classroomType.id,

          roomNumber,
          displayName: roomNumber,

          status: "ACTIVE",
        },

        create: {
          buildingId: building.id,
          roomTypeId: classroomType.id,

          roomNumber,
          fullCode,

          displayName: roomNumber,

          // Unknown for now — do not invent capacities.
          capacity: null,

          // Matches your current room form/default.
          isAccessible: true,

          features: [],

          status: "ACTIVE",

          notes: null,
        },
      });

      console.log(`Seeded ${fullCode}`);
    }
  }
}

async function main() {
  console.log("Seeding rooms...");

  await seedRooms();

  console.log("Room seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
