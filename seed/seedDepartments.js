import { categorised_courses } from "../data/categorizedCourses.js";
import { deriveDepartmentCode, normalizeDepartmentName } from "./normalizers.js";

export async function seedDepartments(prisma) {
  const departmentMap = new Map();

  const allCourses = [
    ...(categorised_courses.firstyear || []),
    ...(categorised_courses.secondyearonward || []),
  ];

  const uniqueDepartments = new Set(
    allCourses.map((c) => normalizeDepartmentName(c.Department)).filter(Boolean)
  );

  for (const deptName of uniqueDepartments) {
    const code = deriveDepartmentCode(deptName);

    const department = await prisma.department.upsert({
      where: { code },
      update: {
        name: deptName,
        isActive: true,
      },
      create: {
        code,
        name: deptName,
      },
    });

    departmentMap.set(deptName, department.id);
  }

  return departmentMap;
}
