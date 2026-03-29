# Codebase Issues & Technical Debt

*Last updated: 2026-03-29*

This file documents known issues, inconsistencies, and technical debt in the backend codebase that have been **flagged but not yet fixed**.

## ✅ Resolved Issues

| Issue | Status | Resolution |
|-------|--------|------------|
| `availabilty.service.js` misspelling | ✅ Fixed | Renamed to `availability.service.js` |
| `auth.route.js` vs `booking.routes.js` naming | ✅ Fixed | Renamed to `auth.routes.js` |
| `test.route.js` naming inconsistency | ✅ Fixed | Renamed to `test.routes.js` + fixed `authorizeRoles` import |
| `reamde.md` naming | ✅ Fixed | Renamed to `README.md` |
| `basicInfo.controller.js` dead code | ✅ Fixed | Deleted; replaced by `info.controller.js` |
| `auth.service.js` logging passwords | ✅ Fixed | Removed password/hash logging |
| `seedAdmin.js` creating own PrismaClient | ✅ Fixed | Now uses shared `prisma` from `db/index.js` |
| `test.route.js` wrong `authorizeRoles` import | ✅ Fixed | Now uses `{ authorizeRoles }` destructured import |
| `booking.service.js` argument order bug | ✅ Fixed | `resolveStaffReviewerForRoom` args corrected |
| `booking.service.js` undefined `toSafeBooking` | ✅ Fixed | Replaced with existing `properBookingFormat` |
| `prefinaldata/` not in `.gitignore` | ✅ Fixed | Added to `.gitignore` |

---

## 📋 Remaining Issues (Not Yet Fixed)

### 1. Dead/Unused Files
- **`data/categorizedCourses.js`** (~130KB) — not imported anywhere in seed or application code. If it is truly unused, it should be removed to reduce repo size.
- **`data/recurring/unmatchedCourses.js`** — not imported by any seeder or application module. Should be removed or documented if kept for future reference.

### 2. Faculty Name Collision
- `data/faculty.js` contains two entries for **"Jitendra Kumar"** with different emails (`jitendrak@iitj.ac.in` and `jkumar@iitj.ac.in`). The updated seed logic keeps the **first match** and warns on duplicates, but ideally each entry should have a unique identifier (e.g., faculty ID or employee ID).

### 3. Booking Service — Prisma Select Nesting
- In `booking.service.js` line ~186–202 (FACULTY branch), the Prisma `select` for `staffUser` was incorrectly structured (missing `select:` wrapper). This has been fixed in the current commit.

### 4. Response Pattern Inconsistency
- Most controllers use `res.status(200).json(new ApiResponse(...))`, but some use `return res.status(...)` while others just use `res.status(...)`. Both work but the pattern should be standardized.

### 5. Course Data — Extra Fields
- `matchedCourses.js` contains fields like `"Student Registered*"`, `"label"`, and `"Classroom"` that use non-standard naming conventions. These should ideally be cleaned up to use camelCase consistently.

### 6. Duplicate Timetable Calls in Booking Creation
- `createBookingRequest` in `booking.service.js` calls `ensureRoomIsAvailable` **twice** (lines ~115 and ~154). The first call includes suggestions; the second is a re-check. This redundancy could be reduced.

---

## 📐 Architecture Notes

1. **Code → ID Mapping**: The system uses `code` as the human-readable unique key for external data exchange, and CUID `id` for internal relations. This is intentional and should be maintained.

2. **Time Representation**: All times are stored as **minutes from midnight** (0–1439). Conversion helpers exist in `utils/dateTime.js`.

3. **Building ↔ Department Overlap**: Some buildings share codes with departments (e.g., `CSE`, `BB`, `EE`). This is intentional — a building and a department are separate entities that may share a code.

4. **Slot System Architecture**: Slot → SlotOccurrence (time/day) → RoomSlotOccupancy (room allocation). SlotAliases map variant codes to canonical slots.

5. **Approval Flow**: USER → PENDING_FACULTY → (faculty approve) → PENDING_STAFF → (staff approve) → APPROVED. FACULTY → PENDING_STAFF → APPROVED. A single staff reviewer is assigned per building.
