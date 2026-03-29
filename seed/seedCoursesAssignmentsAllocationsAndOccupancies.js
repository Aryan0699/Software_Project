import { courses } from "../data/recurring/matchedCourses.js";
import { faculty } from "../data/faculty.js";
import logger from "../src/utils/logger.js";
import {
  detectVariantLabel,
  extractBuildingAndRoom,
  getCanonicalCourseName,
  normalizeCode,
  normalizeDepartmentName,
  normalizeEmail,
  parseCredits,
  parseRegisteredCount,
} from "./normalizers.js";
import { getBaseSlotCode } from "./slotHelpers.js";

/**
 * Build a faculty name→email lookup map as a fallback.
 * Warns about duplicate names.
 */
function buildFacultyNameLookup() {
  const map = new Map();
  for (const item of faculty) {
    const nameKey = normalizeCode(item.name).toLowerCase();
    if (map.has(nameKey)) {
      logger.warn(`Duplicate faculty name: "${item.name}" → existing: ${map.get(nameKey)}, skipping: ${item.email}`);
      continue; // keep first match
    }
    map.set(nameKey, normalizeEmail(item.email));
  }
  return map;
}

export async function seedCoursesAssignmentsAllocationsAndOccupancies(
  prisma,
  { departmentMap, roomMap, slotSystemIdByKey, slotIdBySystemAndCode }
) {
  const facultyNameFallback = buildFacultyNameLookup();
  const courseMap = new Map();
  const assignmentMap = new Map();
  const occupancyKeys = new Set();

  const grouped = [
    { systemKey: "firstyear", courses: courses.firstyear || [] },
    { systemKey: "secondyearonward", courses: courses.secondyearonward || [] },
  ];

  for (const group of grouped) {
    const systemId = slotSystemIdByKey.get(group.systemKey);
    const systemCode =
      group.systemKey === "firstyear" ? "FIRST_YEAR" : "SECOND_YEAR_ONWARD";

    for (const row of group.courses) {
      const courseCode = normalizeCode(row.code).toUpperCase();
      const canonicalName = getCanonicalCourseName(row.name);
      const departmentCode = normalizeDepartmentName(row.Department);
      const departmentId = departmentMap.get(departmentCode) || null;
      const credits = parseCredits(row.credits);
      const rawSlotCode = normalizeCode(row.slot).toUpperCase();
      const effectiveSlotCode = getBaseSlotCode(rawSlotCode);
      const slotId = slotIdBySystemAndCode.get(`${group.systemKey}:${effectiveSlotCode}`);

      if (!slotId) {
        logger.warn(`Skipping ${courseCode}: slot not found for ${rawSlotCode} -> ${effectiveSlotCode}`);
        continue;
      }

      const course = await prisma.course.upsert({
        where: { code: courseCode },
        update: {
          name: canonicalName,
          ltp: row.LTP?.trim() || null,
          credits: credits ? credits : undefined,
          departmentId,
          isActive: true,
        },
        create: {
          code: courseCode,
          name: canonicalName,
          ltp: row.LTP?.trim() || null,
          credits: credits || null,
          departmentId,
          courseType: row.courseType || null,
        },
      });

      courseMap.set(courseCode, course.id);

      let facultyUserId = null;

      // Prefer instructorEmail (direct mapping), fallback to name-based lookup
      let facultyEmail = null;
      if (row.instructorEmail) {
        facultyEmail = normalizeEmail(row.instructorEmail);
      } else if (row.Instructor) {
        const facultyNameKey = normalizeCode(row.Instructor).toLowerCase();
        facultyEmail = facultyNameFallback.get(facultyNameKey) || null;
        if (!facultyEmail) {
          logger.warn(`No email found for instructor "${row.Instructor}" in course ${courseCode}`);
        }
      }

      if (facultyEmail) {
        const facultyUser = await prisma.user.findUnique({
          where: { email: facultyEmail },
          select: { id: true },
        });
        facultyUserId = facultyUser?.id || null;
      }

      const assignmentKey = `${course.id}:${slotId}:${facultyUserId || "NULL"}:${row.name || ""}`;

      let assignmentId = assignmentMap.get(assignmentKey);

      if (!assignmentId) {
        const assignment = await prisma.courseSlotAssignment.create({
          data: {
            courseId: course.id,
            slotId,
            facultyUserId,
            rawSlotCode,
            variantLabel: detectVariantLabel(row.name, row.label),
            registeredCount: parseRegisteredCount(row["Student Registered*"]),
            sourceType: "seed_json",
          },
          select: { id: true },
        });

        assignmentId = assignment.id;
        assignmentMap.set(assignmentKey, assignmentId);
      }

      const { buildingCode, roomNumber, fullCode } = extractBuildingAndRoom(row.Classroom);
      if (!buildingCode || !roomNumber) {
        logger.warn(`Skipping room allocation for ${courseCode}: invalid classroom "${row.Classroom}"`);
        continue;
      }

      const roomId = roomMap.get(fullCode);

      if (!roomId) {
        logger.warn(`Skipping room allocation for ${courseCode}: room not found "${fullCode}"`);
        continue;
      }

      await prisma.courseRoomAllocation.upsert({
        where: {
          courseSlotAssignmentId_roomId: {
            courseSlotAssignmentId: assignmentId,
            roomId,
          },
        },
        update: {
          isActive: true,
        },
        create: {
          courseSlotAssignmentId: assignmentId,
          roomId,
        },
      });

      const occKey = `${roomId}:${slotId}`;
      if (!occupancyKeys.has(occKey)) {
        occupancyKeys.add(occKey);

        await prisma.roomSlotOccupancy.upsert({
          where: {
            roomId_slotId: {
              roomId,
              slotId,
            },
          },
          update: {
            isActive: true,
            sourceType: "seed_json",
          },
          create: {
            roomId,
            slotId,
            sourceType: "seed_json",
          },
        });
      }
    }
  }
}
