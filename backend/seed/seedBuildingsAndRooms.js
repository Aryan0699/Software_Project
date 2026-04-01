import { buildingRooms } from "../data/oneTimeSeed/buildingRoomMapping.js";
import { normalizeCode } from "./normalizers.js";
import buildingCodeNameMapping from "../src/utils/buildingCodeNameMapping.js";

export async function seedBuildingsAndRooms(prisma) {
  const buildingMap = new Map();
  const roomMap = new Map();

  for (const [rawBuildingCode, rooms] of Object.entries(buildingRooms)) {
    const buildingCode = normalizeCode(rawBuildingCode).toUpperCase();

    const building = await prisma.building.upsert({
      where: { code: buildingCode },
      update: {
        name: buildingCodeNameMapping[buildingCode] || buildingCode,
        isActive: true,
      },
      create: {
        code: buildingCode,
        name: buildingCodeNameMapping[buildingCode] || buildingCode,
      },
    });

    buildingMap.set(buildingCode, building.id);

    for (const roomNumberRaw of rooms) {
      const roomNumber = normalizeCode(roomNumberRaw);
      const fullCode = `${buildingCode} ${roomNumber}`;

      const room = await prisma.room.upsert({
        where: { fullCode },
        update: {
          buildingId: building.id,
          roomNumber,
          isActive: true,
        },
        create: {
          buildingId: building.id,
          roomNumber,
          fullCode,
        },
      });

      roomMap.set(fullCode, room.id);
    }
  }

  return { buildingMap, roomMap };
}
