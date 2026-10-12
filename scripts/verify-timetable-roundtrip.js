import "dotenv/config"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import ExcelJS from "exceljs"

const sourceUrl = process.env.DATABASE_URL
if (!sourceUrl) throw new Error("DATABASE_URL is required")

const schemaName = `uras_roundtrip_${randomUUID().replaceAll("-", "")}`
const verificationUrl = new URL(sourceUrl)
verificationUrl.searchParams.set("schema", schemaName)

function deployMigrations() {
    return new Promise((resolve, reject) => {
        const child = spawn(
            "./node_modules/.bin/prisma",
            ["migrate", "deploy"],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    DATABASE_URL: verificationUrl.toString(),
                    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
                },
                stdio: "inherit",
            }
        )
        child.once("error", reject)
        child.once("exit", (code) =>
            code === 0
                ? resolve()
                : reject(new Error(`Migration deployment exited with ${code}`))
        )
    })
}

function uploadFile(buffer, name) {
    return {
        buffer: Buffer.from(buffer),
        originalname: name,
        size: buffer.length,
        mimetype:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
}

async function changedRoomWorkbook(buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    workbook.worksheets[0].getCell("D2").value = "RT-102"
    return workbook.xlsx.writeBuffer()
}

await deployMigrations()
process.env.DATABASE_URL = verificationUrl.toString()

const [{ PrismaClient }, timetable, adminAccess, bookings, approvals] =
    await Promise.all([
        import("../src/generated/prisma/client.js"),
        import("../src/services/timetable.service.js"),
        import("../src/services/adminAccess.service.js"),
        import("../src/services/bookingRequests.service.js"),
        import("../src/services/approvals.service.js"),
    ])
const db = new PrismaClient()

try {
    const admin = await db.user.create({
        data: {
            name: "Round-trip Admin",
            email: "roundtrip-admin@example.test",
            hashedPassword: "round-trip-test-only",
            role: "ADMIN",
        },
    })
    const term = await db.academicTerm.create({
        data: {
            termCode: "ROUNDTRIP_TERM",
            name: "Round-trip Term",
            startDate: new Date("2026-01-01T00:00:00.000Z"),
            endDate: new Date("2026-12-31T00:00:00.000Z"),
            status: "CURRENT",
        },
    })
    const system = await db.slotSystem.create({
        data: { code: "ROUNDTRIP", name: "Round-trip Slot System" },
    })
    const grid = await db.slotGridVersion.create({
        data: {
            slotSystemId: system.id,
            versionNumber: 1,
            status: "LOCKED",
            dayStartMinute: 480,
            dayEndMinute: 1310,
            createdByUserId: admin.id,
            lockedAt: new Date(),
        },
    })
    const slotA = await db.slot.create({
        data: { slotGridVersionId: grid.id, code: "A", slotKind: "LECTURE" },
    })
    const slotB = await db.slot.create({
        data: { slotGridVersionId: grid.id, code: "B", slotKind: "LECTURE" },
    })
    await db.slotOccurrence.createMany({
        data: [
            {
                slotId: slotA.id,
                dayOfWeek: "MONDAY",
                startMinute: 540,
                endMinute: 590,
            },
            {
                slotId: slotB.id,
                dayOfWeek: "TUESDAY",
                startMinute: 540,
                endMinute: 590,
            },
        ],
    })
    const building = await db.building.create({
        data: { code: "RT", name: "Round-trip Building" },
    })
    const roomType = await db.roomType.create({
        data: { code: "RT_CLASSROOM", name: "Round-trip Classroom" },
    })
    const [room101, room102] = await Promise.all([
        db.room.create({
            data: {
                buildingId: building.id,
                roomTypeId: roomType.id,
                roomNumber: "101",
                fullCode: "RT-101",
                status: "ACTIVE",
            },
        }),
        db.room.create({
            data: {
                buildingId: building.id,
                roomTypeId: roomType.id,
                roomNumber: "102",
                fullCode: "RT-102",
                status: "ACTIVE",
            },
        }),
    ])

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Timetable")
    sheet.addRow([
        "Course Code*",
        "Course Name",
        "Slot*",
        "Classroom*",
        "Instructor",
        "Department",
        "Student Count",
        "Batch",
        "Remarks",
    ])
    sheet.addRow([
        "CSL3050",
        "Database Systems",
        "A",
        room101.fullCode,
        "Instructor A",
        "CSE",
        "42",
        "2026",
        "Core",
    ])
    sheet.addRow([
        "MAL2020",
        "Scientific Computations",
        "B",
        room101.fullCode,
        "Instructor B",
        "Mathematics",
        "49 + 48",
        "2026",
        "Shared",
    ])
    const source = await workbook.xlsx.writeBuffer()
    const fields = {
        academicTermId: term.id,
        slotSystemId: system.id,
        slotGridVersionId: grid.id,
    }

    const first = await timetable.createImport(
        fields,
        uploadFile(source, "revision-1.xlsx"),
        admin.id
    )
    assert.equal(first.batch.errorRows, 0)
    const published1 = await timetable.publishImport(first.batch.id, admin.id)
    assert.equal(published1.revisionNumber, 1)

    const exported1 = await timetable.createPublishedWorkbook(published1.id)
    const unchanged = await timetable.createImport(
        fields,
        uploadFile(exported1.buffer, "revision-1-export.xlsx"),
        admin.id
    )
    assert.equal(unchanged.batch.errorRows, 0)
    assert.equal(unchanged.batch.validRows, 2)
    const published2 = await timetable.publishImport(
        unchanged.batch.id,
        admin.id
    )
    assert.equal(published2.revisionNumber, 2)

    const exported2 = await timetable.createPublishedWorkbook(published2.id)
    const changed = await changedRoomWorkbook(exported2.buffer)
    const replacement = await timetable.createImport(
        fields,
        uploadFile(changed, "revision-2-room-change.xlsx"),
        admin.id
    )
    assert.equal(replacement.batch.errorRows, 0)
    assert.equal(replacement.batch.validRows, 2)
    const published3 = await timetable.publishImport(
        replacement.batch.id,
        admin.id
    )
    assert.equal(published3.revisionNumber, 3)

    const rows = await db.timetableImportRow.findMany({
        where: { batchId: published3.id, publishedAssignmentId: { not: null } },
        orderBy: { rowIndex: "asc" },
        select: { rawCourseCode: true, resolvedRoomId: true },
    })
    assert.deepEqual(rows, [
        { rawCourseCode: "CSL3050", resolvedRoomId: room102.id },
        { rawCourseCode: "MAL2020", resolvedRoomId: room101.id },
    ])
    assert.equal(
        await db.roomSlotOccupancy.count({
            where: { timetableBatchId: published2.id },
        }),
        0
    )
    assert.equal(
        await db.timetableImportBatch.count({ where: { status: "PUBLISHED" } }),
        1
    )
    console.log(
        "Timetable workbook round-trip verified through revisions 1, 2, and 3."
    )

    const requester = await db.user.create({
        data: {
            name: "Requesting Faculty",
            email: "requester@example.test",
            hashedPassword: "round-trip-test-only",
            role: "FACULTY",
            facultyProfile: { create: {} },
        },
    })
    const facultyReviewer = await db.user.create({
        data: {
            name: "Faculty Reviewer",
            email: "faculty-reviewer@example.test",
            hashedPassword: "round-trip-test-only",
            role: "FACULTY",
            facultyProfile: { create: {} },
        },
    })
    const staffReviewer = await db.user.create({
        data: {
            name: "Staff Reviewer",
            email: "staff-reviewer@example.test",
            hashedPassword: "round-trip-test-only",
            role: "STAFF",
            staffProfile: { create: {} },
        },
    })
    const disposableActivity = await adminAccess.createBookingActivityType({
        name: "Disposable test activity",
    })
    await adminAccess.deleteBookingActivityType(disposableActivity.id)
    assert.equal(
        await db.bookingActivityType.findUnique({
            where: { id: disposableActivity.id },
        }),
        null
    )
    const facultyAssignment = await adminAccess.createBookingActivityApprover({
        activityTypeId: "activity_academic",
        userId: facultyReviewer.id,
        reviewerLabel: "Academic reviewer",
    })
    const staffAssignment = await adminAccess.createBookingActivityApprover({
        activityTypeId: "activity_academic",
        userId: staffReviewer.id,
        reviewerLabel: "Administrative reviewer",
    })
    await adminAccess.updateBookingActivityType({
        id: "activity_academic",
        changes: { isActive: true },
    })
    await assert.rejects(
        adminAccess.deleteBookingActivityType("activity_academic"),
        (error) => error.code === "ACTIVITY_TYPE_ACTIVE"
    )
    const booking = await bookings.createBookingRequest(
        {
            clientRequestId: randomUUID(),
            roomId: room101.id,
            bookingDate: "2026-11-04",
            startMinute: 600,
            endMinute: 660,
            title: "Round-trip workflow review",
            purpose: "Verify configurable activity approval routing.",
            activityTypeId: "activity_academic",
            requiredFeatures: [],
            acknowledgePendingCompetition: false,
        },
        requester
    )
    assert.equal(booking.request.status, "PENDING_INSTITUTIONAL")
    assert.equal(booking.request.approvals.length, 2)
    assert.ok(
        booking.request.approvals.every(
            (approval) => approval.reviewerKind === "INSTITUTIONAL"
        )
    )

    await adminAccess.updateBookingActivityApprover({
        activityTypeId: "activity_academic",
        id: facultyAssignment.id,
        changes: { isActive: false },
    })
    await assert.rejects(
        adminAccess.updateBookingActivityApprover({
            activityTypeId: "activity_academic",
            id: staffAssignment.id,
            changes: { isActive: false },
        }),
        (error) => error.code === "ACTIVITY_TYPE_REQUIRES_APPROVER"
    )
    const pendingStaff = await approvals.listMyApprovals(
        { page: 1, pageSize: 20, view: "pending" },
        staffReviewer
    )
    assert.equal(pendingStaff.records.length, 1)
    const facultyTask = booking.request.approvals.find(
        (approval) => approval.reviewerUserId === facultyReviewer.id
    )
    const staffTask = booking.request.approvals.find(
        (approval) => approval.reviewerUserId === staffReviewer.id
    )
    const simultaneous = await Promise.allSettled([
        approvals.decideApproval(
            facultyTask.id,
            { decision: "APPROVE", expectedRequestVersion: 1 },
            facultyReviewer
        ),
        approvals.decideApproval(
            staffTask.id,
            { decision: "APPROVE", expectedRequestVersion: 1 },
            staffReviewer
        ),
    ])
    assert.equal(
        simultaneous.filter((result) => result.status === "fulfilled").length,
        1
    )
    const staleIndex = simultaneous.findIndex(
        (result) =>
            result.status === "rejected" &&
            result.reason?.code === "REQUEST_STATE_CHANGED"
    )
    assert.notEqual(staleIndex, -1)
    const finalTask = staleIndex === 0 ? facultyTask : staffTask
    const finalReviewer = staleIndex === 0 ? facultyReviewer : staffReviewer
    const preview = await approvals.getFinalizationPreview(
        finalTask.id,
        finalReviewer
    )
    assert.equal(preview.requiresFinalizationConfirmation, true)
    const finalized = await approvals.decideApproval(
        finalTask.id,
        {
            decision: "APPROVE",
            expectedRequestVersion: preview.requestVersion,
            expectedCompetitorIds: preview.competitors.map((item) => item.id),
        },
        finalReviewer
    )
    assert.equal(finalized.request.status, "APPROVED")
    await adminAccess.updateBookingActivityType({
        id: "activity_academic",
        changes: { isActive: false },
    })
    await assert.rejects(
        adminAccess.deleteBookingActivityType("activity_academic"),
        (error) => error.code === "ACTIVITY_TYPE_IN_USE"
    )
    console.log("Activity-specific faculty/staff approval routing verified.")
} finally {
    await db.$disconnect()
    const { prisma } = await import("../src/db/index.js")
    await prisma.$disconnect()
    process.env.DATABASE_URL = sourceUrl
    const cleanup = new PrismaClient({ datasourceUrl: sourceUrl })
    await cleanup.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`
    )
    await cleanup.$disconnect()
}
