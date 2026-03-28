# Implementation Plan: Admin CRUD, Profiles, Room Suggestions & Bug Fixes

## Background

After a thorough analysis of the codebase against the SRS, the project has a solid foundation — Prisma schema, auth flow, booking lifecycle (User→Faculty→Staff), Zod validators, RBAC middleware, and action history logging are all in good shape. However, several **critical bugs** exist in existing code, and major feature modules lack controllers/routes to be usable.

---

## Critical Bugs Found (Must Fix First)

> [!CAUTION]
> These bugs will cause runtime crashes. They must be fixed before any new feature work.

| # | File | Bug | Impact |
|---|------|-----|--------|
| 1 | [admin.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/admin.service.js#L1) | `import prisma from "../db/db.config.js"` — file doesn't exist; actual path is `"../db/index.js"` with named export `{prisma}` | **All admin features crash** |
| 2 | [admin.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/admin.service.js#L82-L99) | `removeStaffFromBuilding` / `updateStaffBuildingAssignment` use `findUnique({ where: { id: assignmentId } })` but `BuildingStaffAssignment` has a **composite key** `@@id([buildingId, staffUserId])`, not a single `id` field | **Delete/update staff assignments crash** |
| 3 | [admin.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/admin.service.js#L75) | References `assignment.id`, `a.assignedAt` — neither exist; should be composite key access and `createdAt` | Crashes or returns `undefined` |
| 4 | [admin.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/admin.service.js#L338-L365) | `getBookingActionHistory` uses `performedAt` and `performedBy` — schema has `createdAt` and `performedByUser` | **Query/sort crashes** |
| 5 | [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js#L7) | `isRoomAvailable(roomId, bookingDate, startMinute, endMinute)` takes positional args, but **all callers** pass a destructured object `isRoomAvailable({ roomId, ... })` | **Every availability check fails** — roomId receives the entire object |
| 6 | [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js#L96) | `findAvailableRooms` same positional-vs-object mismatch | **Available rooms query fails** |
| 7 | [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js#L31-L36) | Timetable conflict query uses `occurrences: { dayOfWeek, ... }` — should be `occurrences: { some: { dayOfWeek, ... } }` (it's a `has-many` relation) | **Timetable conflicts never detected** |
| 8 | [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js#L130-L133) | Uses `order: [...]` — Prisma uses `orderBy` | Query crash |
| 9 | [masterData.validator.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/validators/masterData.validator.js#L44-L53) | `createRoomTypeSchema` has `description` field; Prisma `RoomType` model has no `description` column. Same for `RoomFeature`. | Validation passes but insert fails |

---

## Proposed Changes

### Phase 0: Bug Fixes

#### [MODIFY] [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js)
- Fix `isRoomAvailable` signature → accept destructured object `({ roomId, bookingDate, startMinute, endMinute })`
- Fix `findAvailableRooms` signature → accept destructured object `({ buildingId, bookingDate, startMinute, endMinute, roomTypeId, minCapacity })`
- Fix `occurrences` query → add `some: { ... }` wrapper for the has-many filter
- Fix `order` → `orderBy`

#### [MODIFY] [admin.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/admin.service.js)
- Fix import: `import {prisma} from "../db/index.js"`
- Fix all composite key operations: `removeStaffFromBuilding` and `updateStaffBuildingAssignment` → use `buildingId_staffUserId` composite where clause
- Fix `assignedAt` → `createdAt` everywhere
- Fix `performedAt` → `createdAt`, `performedBy` → `performedByUser` in history queries

#### [MODIFY] [masterData.validator.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/validators/masterData.validator.js)
- Fix `createRoomTypeSchema`: add `code` field, remove `description` (align with Prisma `RoomType` model)
- Fix `createRoomFeatureSchema`: add `code` field, remove `description` (align with Prisma `RoomFeature` model)
- Fix update schemas accordingly

---

### Phase 1: Admin — Staff-Building Assignments & Monitoring

The admin.service.js already has logic (with bugs fixed above). We need a controller and routes.

#### [NEW] [admin.controller.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/controllers/admin.controller.js)
- `assignStaff` — POST assign staff to building
- `removeStaff` — DELETE remove staff from building
- `updateAssignment` — PATCH update staff-building assignment (swap staff or building)
- `getAssignments` — GET list all assignments with filters (buildingId, staffUserId, pagination)
- `getBuildingsByStaff` — GET all buildings for a staff member
- `getStaffByBuilding` — GET all staff for a building
- `getBookingHistory` — GET booking action history with filters
- `getAllBookings` — GET all booking requests (admin view)
- `getStats` — GET system dashboard statistics

#### [NEW] [admin.routes.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/routes/admin.routes.js)
All routes behind `verifyJWTToken` + `authorizeRoles("ADMIN")`:
```
POST   /api/v1/admin/staff-assignments
DELETE /api/v1/admin/staff-assignments/:buildingId/:staffUserId
PATCH  /api/v1/admin/staff-assignments/:buildingId/:staffUserId
GET    /api/v1/admin/staff-assignments
GET    /api/v1/admin/staff-assignments/by-staff/:staffUserId
GET    /api/v1/admin/staff-assignments/by-building/:buildingId
GET    /api/v1/admin/booking-history
GET    /api/v1/admin/bookings
GET    /api/v1/admin/stats
```

---

### Phase 2: Admin — Master Data CRUD

#### [NEW] [masterData.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/masterData.service.js)
Full CRUD services for:
- **Buildings** — create, getById, list (with pagination/filters), update, soft-delete (toggle `isActive`)
- **Rooms** — create (auto-generate `fullCode` from building code + room number), getById, list (filter by building, type, active), update, soft-delete
- **RoomTypes** — create, list, update, soft-delete
- **RoomFeatures** — create, list, update, soft-delete, assign feature to room, remove feature from room
- **Departments** — create, list, update, soft-delete
- **SlotSystems** — create, list, getById (with slots), update, soft-delete
- **SlotAliases** — create, list (filter by system/slot), delete

#### [NEW] [masterData.controller.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/controllers/masterData.controller.js)
Controller wrappers for all master data service methods.

#### [NEW] [masterData.routes.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/routes/masterData.routes.js)
All routes behind `verifyJWTToken` + `authorizeRoles("ADMIN")`:
```
# Buildings
POST   /api/v1/admin/master/buildings
GET    /api/v1/admin/master/buildings
GET    /api/v1/admin/master/buildings/:id
PATCH  /api/v1/admin/master/buildings/:id

# Rooms
POST   /api/v1/admin/master/rooms
GET    /api/v1/admin/master/rooms
GET    /api/v1/admin/master/rooms/:id
PATCH  /api/v1/admin/master/rooms/:id

# Room Types
POST   /api/v1/admin/master/room-types
GET    /api/v1/admin/master/room-types
PATCH  /api/v1/admin/master/room-types/:id

# Room Features
POST   /api/v1/admin/master/room-features
GET    /api/v1/admin/master/room-features
PATCH  /api/v1/admin/master/room-features/:id
POST   /api/v1/admin/master/rooms/:roomId/features      (assign feature)
DELETE /api/v1/admin/master/rooms/:roomId/features/:featureId

# Departments
POST   /api/v1/admin/master/departments
GET    /api/v1/admin/master/departments
PATCH  /api/v1/admin/master/departments/:id

# Slot Systems
POST   /api/v1/admin/master/slot-systems
GET    /api/v1/admin/master/slot-systems
GET    /api/v1/admin/master/slot-systems/:id
PATCH  /api/v1/admin/master/slot-systems/:id

# Slot Aliases
POST   /api/v1/admin/master/slot-aliases
GET    /api/v1/admin/master/slot-aliases
DELETE /api/v1/admin/master/slot-aliases/:id
```

---

### Phase 3: Faculty Mapping & Correction Flow

#### Schema Update — [MODIFY] [schema.prisma](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/prisma/schema.prisma)
Add a new model for unresolved faculty references:
```prisma
model UnresolvedFacultyRef {
  id            String   @id @default(cuid())
  rawName       String
  rawEmail      String?
  sourceType    String?   // e.g., "TIMETABLE", "CSV"
  resolvedUserId String?
  resolvedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  resolvedUser  User?    @relation("ResolvedFacultyLinks", fields: [resolvedUserId], references: [id], onDelete: SetNull)

  @@index([rawEmail])
  @@index([rawName])
  @@index([resolvedUserId])
}
```
Add reverse relation on `User`:
```prisma
resolvedFacultyLinks  UnresolvedFacultyRef[] @relation("ResolvedFacultyLinks")
```

#### [NEW] [facultyMapping.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/facultyMapping.service.js)
- `resolveFacultyByNameOrEmail({ rawName, rawEmail })` — tries exact email match → fuzzy name match → creates `UnresolvedFacultyRef` if no match
- `getUnresolvedRefs({ page, limit })` — list all unresolved references for admin
- `resolveRef({ refId, userId })` — admin manually links a ref to a user
- `dismissRef({ refId })` — admin dismisses an unmatchable ref

#### [NEW] [facultyMapping.validator.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/validators/facultyMapping.validator.js)
Zod schemas for resolve/dismiss operations.

#### Routes — added to admin routes:
```
GET    /api/v1/admin/faculty-refs/unresolved
PATCH  /api/v1/admin/faculty-refs/:refId/resolve
PATCH  /api/v1/admin/faculty-refs/:refId/dismiss
```

---

### Phase 4: User Profile Management

#### [NEW] [profile.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/profile.service.js)
- `getMyProfile(userId)` — returns user + appropriate profile (student/faculty/staff)
- `updateStudentProfile(userId, { rollNumber, batchYear, departmentId })` — upsert student profile
- `updateFacultyProfile(userId, { designation, departmentId })` — upsert faculty profile
- `updateStaffProfile(userId, { designation })` — upsert staff profile

#### [NEW] [profile.controller.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/controllers/profile.controller.js)
Controller wrappers for all profile service methods.

#### [NEW] [profile.validator.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/validators/profile.validator.js)
Zod schemas:
- `updateStudentProfileSchema` — rollNumber (optional string), batchYear (optional int), departmentId (optional cuid)
- `updateFacultyProfileSchema` — designation (optional string), departmentId (optional cuid)
- `updateStaffProfileSchema` — designation (optional string)

#### [NEW] [profile.routes.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/routes/profile.routes.js)
```
GET    /api/v1/profile/me              (any authenticated user)
PATCH  /api/v1/profile/student         (USER role)
PATCH  /api/v1/profile/faculty         (FACULTY role)
PATCH  /api/v1/profile/staff           (STAFF role)
```

---

### Phase 5: Room Suggestion When Unavailable

#### [MODIFY] [availabilty.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/availabilty.service.js)
Add new function `suggestAlternativeRooms({ roomId, bookingDate, startMinute, endMinute, buildingId, minCapacity, roomTypeId, featureIds })`:
- Gets the original room's building if `buildingId` not specified (same-building preference)
- Calls fixed `findAvailableRooms` with filters
- Optionally filters by required features
- Returns alternatives sorted by: same-building first → capacity closest to requested → feature match count

#### [MODIFY] [booking.controller.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/controllers/booking.controller.js)
Add `suggestAlternativeRooms` controller handler.

#### [MODIFY] [booking.routes.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/routes/booking.routes.js)
```
GET /api/v1/bookings/suggest-alternatives   (authenticated, uses suggestRoomsSchema)
```

#### [MODIFY] [booking.service.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/services/booking.service.js)
When `createBookingRequest` fails with "room unavailable", include `suggestedAlternatives` in the error response.

---

### Phase 6: Wire Everything in App Entry

#### [MODIFY] [app.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/app.js)
- Import and mount admin routes: `app.use("/api/v1/admin", adminRouter)`
- Import and mount profile routes: `app.use("/api/v1/profile", profileRouter)`
- Import and mount master data routes: `app.use("/api/v1/admin/master", masterDataRouter)`

#### [MODIFY] [validators/index.js](file:///c:/Users/Ashok%20Jain/Desktop/software_project_own/src/validators/index.js)
- Export new profile and faculty mapping validators

---

## What's Left for Future Implementation

| Feature | SRS Ref | Notes |
|---------|---------|-------|
| CSV upload/parsing for timetable ingestion | REQ-4.1.4, REQ-4.2.1 | User explicitly deferred |
| Frontend (React/Next.js) | All | User explicitly deferred |
| Slot change requests | REQ-4.3.1–4.3.7 | Phase 2 feature per SRS |
| Venue change requests | REQ-4.3.8–4.3.11 | Phase 2 feature per SRS |
| Metadata-based venue recommendation | REQ-4.3.12–4.3.13 | Phase 2 optional |
| Examination scheduling & seating | REQ-4.4.1–4.4.3 | Low priority per SRS |
| Email/in-app notifications | REQ-4.5.1–4.5.3 | Notification service |
| Booking conflict escalation to admin | REQ-4.1.10 | Admin conflict resolution flow |
| Student enrollment-based clash detection | REQ-4.3.14 | Depends on enrollment data availability |
| ERP integration | Appendix C | TBD |

---

## Verification Plan

### Automated Tests
1. After bug fixes, start the dev server (`npm run dev`) and verify no crash
2. Run `npx prisma migrate dev` for schema changes (UnresolvedFacultyRef)
3. Test all new admin endpoints via browser subagent / curl
4. Test profile endpoints for each role (USER, FACULTY, STAFF)
5. Test room suggestion endpoint with various filter combinations

### Manual Verification
- Verify composite key operations work for staff-building assignments
- Verify availability checking correctly detects timetable and booking conflicts
- Verify room suggestions return meaningful alternatives with correct sorting

---

## Open Questions

> [!IMPORTANT]
> 1. **Faculty mapping fuzzy match**: Should the system use simple case-insensitive substring matching for faculty name resolution, or do you want something more sophisticated (e.g., Levenshtein distance)?
> 2. **Room suggestion limit**: When suggesting alternatives, should we cap the results (e.g., max 10 suggestions)?
> 3. **Soft delete vs hard delete for master data**: The schema uses `isActive` flags. Should admin "delete" operations toggle `isActive = false` (soft delete) or physically remove the record? I'm assuming soft-delete to preserve referential integrity.
