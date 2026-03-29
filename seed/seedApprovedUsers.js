import { Role } from "../src/generated/prisma/client.js";
import { approvedUsers } from "../data/oneTimeSeed/approvedUsers.js";
import { normalizeEmail } from "./normalizers.js";
import logger from "../src/utils/logger.js";

export async function upsertApprovedUsers(prisma) {
  for (const item of approvedUsers) {
    const email = normalizeEmail(item.email);
    const role = Role[String(item.role).trim().toUpperCase()];

    if (!role) {
      logger.warn(`Skipping approved user with invalid role: ${item.role} (${email})`);
      continue;
    }

    await prisma.approvedUser.upsert({
      where: { email },
      update: { role },
      create: { email, role },
    });
  }
}
