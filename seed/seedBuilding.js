import { prisma } from "../src/db/index.js";

const buildings = [
  {
    code: "BB",
    name: "Bioscience & Bioengineering",
  },
  {
    code: "CI",
    name: "Civil Engineering",
  },
  {
    code: "CSE",
    name: "Computer Science Engineering",
  },
  {
    code: "CY",
    name: "Chemical Engineering",
  },
  {
    code: "EE",
    name: "Electrical Engineering",
  },
  {
    code: "LHC-1",
    name: "Lecture Hall Complex 1",
  },
  {
    code: "LHC-2",
    name: "Lecture Hall Complex 2",
  },
  {
    code: "ME",
    name: "Mechanical Engineering",
  },
  {
    code: "MT",
    name: "Material Engineering",
  },
  {
    code: "PHY",
    name: "Physics",
  },
  {
    code: "SME",
    name: "SME",
  },
  {
    code: "SOLA",
    name: "SOLA",
  },
];

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

  "LHC-2": ["101", "102", "103"],

  ME: ["108", "109", "114", "115"],

  MT: ["109", "110", "112", "113"],

  PHY: ["101", "102", "104", "105"],

  SME: ["L1", "L2", "L5", "L6"],

  // SOLA building exists,
  // but no confirmed physical room is seeded yet.
};

async function seedBuildings() {
  console.log("Seeding buildings...");

  for (const buildingData of buildings) {
    const building = await prisma.building.upsert({
      where: {
        code: buildingData.code,
      },

      update: {
        name: buildingData.name,
        isActive: true,
      },

      create: {
        code: buildingData.code,
        name: buildingData.name,
        isActive: true,
      },
    });

    console.log(`Seeded building ${building.code}`);
  }
}

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
  console.log("Seeding rooms...");

  const classroomType = await getClassroomType();

  for (const [buildingCode, roomNumbers] of Object.entries(buildingRooms)) {
    const building = await prisma.building.findUnique({
      where: {
        code: buildingCode,
      },
    });

    if (!building) {
      throw new Error(`Building "${buildingCode}" does not exist.`);
    }

    for (const roomNumber of roomNumbers) {
      const fullCode = `${buildingCode}-${roomNumber}`;

      const room = await prisma.room.upsert({
        where: {
          buildingId_roomNumber: {
            buildingId: building.id,
            roomNumber,
          },
        },

        update: {
          fullCode,
          roomTypeId: classroomType.id,
          displayName: roomNumber,
          status: "ACTIVE",
        },

        create: {
          buildingId: building.id,
          roomTypeId: classroomType.id,

          roomNumber,
          fullCode,
          displayName: roomNumber,

          capacity: null,
          isAccessible: true,
          features: [],
          status: "ACTIVE",
          notes: null,
        },
      });

      console.log(`Seeded room ${room.fullCode}`);
    }
  }
}

async function main() {
  console.log("Starting building and room seed...");

  await seedBuildings();
  await seedRooms();

  console.log("Building and room seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });