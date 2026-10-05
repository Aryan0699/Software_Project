import { approvedUsers } from "../data/approvedUsers.js"
import { prisma } from "../src/db/index.js"

const allowedRoles = new Set(["STUDENT", "FACULTY", "STAFF", "ADMIN"])

function registrationAccessRows() {
    const emails = new Set()

    return approvedUsers.map(({ email, role }, index) => {
        const normalizedEmail = email.trim().toLowerCase()

        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            throw new Error(`Invalid email at approvedUsers index ${index}`)
        }
        if (!allowedRoles.has(role)) {
            throw new Error(
                `Invalid role "${role}" for ${normalizedEmail} at approvedUsers index ${index}`
            )
        }
        if (emails.has(normalizedEmail)) {
            throw new Error(`Duplicate approved email: ${normalizedEmail}`)
        }

        emails.add(normalizedEmail)
        return { email: normalizedEmail, initialRole: role }
    })
}

async function main() {
    const rows = registrationAccessRows()
    const emails = rows.map(({ email }) => email)
    const existing = await prisma.approvedUser.findMany({
        where: { email: { in: emails } },
        select: { email: true, initialRole: true, isActive: true },
    })
    const existingByEmail = new Map(existing.map((row) => [row.email, row]))
    const rowsByRole = new Map()
    for (const row of rows) {
        const roleRows = rowsByRole.get(row.initialRole) || []
        roleRows.push(row)
        rowsByRole.set(row.initialRole, roleRows)
    }

    await prisma.$transaction([
        prisma.approvedUser.createMany({
            data: rows.map((row) => ({ ...row, isActive: true })),
            skipDuplicates: true,
        }),
        ...[...rowsByRole.entries()].map(([initialRole, roleRows]) =>
            prisma.approvedUser.updateMany({
                where: { email: { in: roleRows.map(({ email }) => email) } },
                data: { initialRole, isActive: true },
            })
        ),
    ])

    const created = rows.filter(
        ({ email }) => !existingByEmail.has(email)
    ).length
    const reactivated = rows.filter(
        ({ email }) => existingByEmail.get(email)?.isActive === false
    ).length
    const roleUpdated = rows.filter(({ email, initialRole }) => {
        const previous = existingByEmail.get(email)
        return previous && previous.initialRole !== initialRole
    }).length

    console.log(
        `Registration access seeded for ${rows.length} identities (${created} created, ${reactivated} reactivated, ${roleUpdated} roles updated).`
    )
}

main()
    .catch((error) => {
        console.error("Registration access seed failed.", error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
