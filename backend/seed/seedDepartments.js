import departmentCodeNameMapping from "../src/utils/departmentCodeNameMapping.js";
export async function seedDepartments(prisma) {
  const departmentMap = new Map();
  for (const deptCode in departmentCodeNameMapping) {
    const deptName = departmentCodeNameMapping[deptCode];
    const department = await prisma.department.upsert({
      where: { code: deptCode },
      update: {
        name: deptName,
        isActive: true,
      },
      create: {
        code: deptCode,
        name: deptName,
      },
    });

    departmentMap.set(deptCode, department.id);
  }

  return departmentMap;
}
