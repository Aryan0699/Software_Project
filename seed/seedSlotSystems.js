import { slotTimingData } from "../data/slotTimeMapping.js";
import logger from "../src/utils/logger.js";
import { DAY_MAP, SLOT_SYSTEMS } from "./constants.js";
import { buildAliasPairs, getBaseSlotCode, inferSlotKind } from "./slotHelpers.js";

export async function seedSlotSystemsSlotsOccurrencesAndAliases(prisma) {
  const slotSystemIdByKey = new Map();
  const slotIdBySystemAndCode = new Map();

  for (const system of SLOT_SYSTEMS) {
    const createdSystem = await prisma.slotSystem.upsert({
      where: { code: system.code },
      update: {
        name: system.name,
        applicableFor: system.applicableFor,
        isActive: true,
      },
      create: {
        code: system.code,
        name: system.name,
        applicableFor: system.applicableFor,
      },
    });

    slotSystemIdByKey.set(system.key, createdSystem.id);

    const timingMap = slotTimingData[system.key] || {};

    // Seed only effective/base slots
    const baseCodes = new Set(Object.keys(timingMap).map((raw) => getBaseSlotCode(raw)));

    for (const baseCode of baseCodes) {
      const createdSlot = await prisma.slot.upsert({
        where: {
          slotSystemId_code: {
            slotSystemId: createdSystem.id,
            code: baseCode,
          },
        },
        update: {
          slotKind: inferSlotKind(baseCode),
          isActive: true,
        },
        create: {
          slotSystemId: createdSystem.id,
          code: baseCode,
          slotKind: inferSlotKind(baseCode),
        },
      });

      slotIdBySystemAndCode.set(`${system.key}:${baseCode}`, createdSlot.id);
    }

    // Replace occurrences fresh for idempotent seeding
    for (const baseCode of baseCodes) {
      const slotId = slotIdBySystemAndCode.get(`${system.key}:${baseCode}`);
      const canonicalBlocks = timingMap[baseCode];

      if (!canonicalBlocks || canonicalBlocks.length === 0) continue;

      await prisma.slotOccurrence.deleteMany({ where: { slotId } });

      await prisma.slotOccurrence.createMany({
        data: canonicalBlocks.map((block) => ({
          slotId,
          dayOfWeek: DAY_MAP[block.dayIndex],
          startMinute: block.startMinutes,
          endMinute: block.endMinutes,
        })),
      });
    }

    // Aliases
    const aliasPairs = buildAliasPairs(system.key, timingMap);

    for (const alias of aliasPairs) {
      const effectiveSlotId = slotIdBySystemAndCode.get(
        `${system.key}:${alias.effectiveCode}`
      );

      if (!effectiveSlotId) {
        logger.warn(
          `Skipping alias ${alias.rawCode}: effective slot ${alias.effectiveCode} not found in ${system.key}`
        );
        continue;
      }

      await prisma.slotAlias.upsert({
        where: { rawCode: `${system.code}:${alias.rawCode}` },
        update: {
          effectiveSlotId,
          isActive: true,
        },
        create: {
          rawCode: `${system.code}:${alias.rawCode}`,
          effectiveSlotId,
          note: `Alias for ${alias.effectiveCode} in ${system.code}`,
        },
      });
    }
  }

  return { slotSystemIdByKey, slotIdBySystemAndCode };
}
