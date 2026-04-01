# Frontend API Reference — LHC Room Allocation System

> **Base URL:** `http://localhost:8000/api/v1`

> **Authentication:** JWT token sent via `Authorization: Bearer <token>` header or `accessToken` cookie. Login returns both.

> **⚠️ CORS & Cookie Setup (CRITICAL):**
> - The backend uses `CORS_ORIGIN` env var. Set it to your frontend URL (e.g., `http://localhost:5173`).
> - All fetch/axios calls must include `credentials: 'include'` for cookies to work cross-origin.
> - The `accessToken` cookie is `httpOnly` (not accessible via JS). Use `Authorization: Bearer` header instead if you prefer storing the token in memory/localStorage (Avoid using local storage).
> - Example axios setup:
> ```javascript
> const api = axios.create({
>   baseURL: 'http://localhost:8000/api/v1',
>   withCredentials: true,  // sends cookies
>   headers: { 'Content-Type': 'application/json' }
> });
> // After login, store token and add to all requests:
> api.interceptors.request.use(config => {
>   const token = localStorage.getItem('accessToken');
>   if (token) config.headers.Authorization = `Bearer ${token}`;
>   return config;
> });
> ```

> **Response Format:** Every response follows this structure:
> ```json
> {
>   "success": true,
>   "statusCode": 200,
>   "message": "Description",
>   "data": { ... }
> }
> ```

> **Error Format:**
> ```json
> {
>   "success": false,
>   "message": "Error description",
>   "errors": [ ... ],
>   "data": null  // may contain suggestedAlternatives on 409 conflicts
> }
> ```

> **Pagination:** Paginated responses include:
> ```json
> {
>   "data": [ ... ],
>   "pagination": {
>     "page": 1,
>     "limit": 20,
>     "total": 42,
>     "totalPages": 3
>   }
> }
> ```

---

## Roles in the System

| Role | Description |
|------|-------------|
| `USER` | Student — can create booking requests, update student profile |
| `FACULTY` | Faculty — can create bookings (direct to staff), approve/reject student bookings, update faculty profile |
| `STAFF` | Staff — approves/rejects bookings for assigned buildings, update staff profile |
| `ADMIN` | System admin — full control over master data, staff assignments, booking monitoring |

---

## 1. AUTHENTICATION

### POST `/auth/signup`
**Auth:** None  
**Body:**
```json
{
  "name": "John Doe",          // required, 2-100 chars
  "email": "john@example.com", // required, valid email
  "password": "securepass"     // required, 8-100 chars
}
```
**Response (201):**
```json
{
  "id": "cuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER"  // auto-detected from ApprovedUser table (USER/FACULTY/STAFF/ADMIN)
}
```
**Notes:** Role is assigned based on the `ApprovedUser` table. If the email exists there, the user gets that role. Otherwise defaults to `USER`.

---

### POST `/auth/login`
**Auth:** None  
**Body:**
```json
{
  "email": "john@example.com",
  "password": "securepass"
}
```
**Response (200):** Sets `accessToken` cookie + returns:
```json
{
  "accessToken": "jwt.token.here",
  "user": {
    "id": "cuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

---

### GET `/auth/getCurrentUser`
**Auth:** JWT required  
**Response (200):**
```json
{
  "id": "cuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z"
}
```

---

## 2. PROFILE MANAGEMENT

### GET `/profile/me`
**Auth:** JWT required (any role)  
**Response (200):**
```json
{
  "id": "cuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "...",
  "profile": {
    // Role-specific profile (null if not yet created):
    // For USER: { id, rollNumber, batchYear, department: { id, code, name } }
    // For FACULTY: { id, designation, department: { id, code, name } }
    // For STAFF: { id, designation }
  },
  "profileComplete": true  // false if profile hasn't been created yet
}
```

---

### PATCH `/profile/student`
**Auth:** JWT required  
**Role:** `USER` only  
**Body:**
```json
{
  "rollNumber": "B22CS001",     // optional, 1-30 chars, must be unique
  "batchYear": 2022,            // optional, 2000-2100
  "departmentId": "cuid"        // optional, valid department CUID (null to clear)
}
```
**Response (200):** Updated student profile with department details.

---

### PATCH `/profile/faculty`
**Auth:** JWT required  
**Role:** `FACULTY` only  
**Body:**
```json
{
  "designation": "Associate Professor",  // optional, 1-100 chars
  "departmentId": "cuid"                 // optional
}
```

---

### PATCH `/profile/staff`
**Auth:** JWT required  
**Role:** `STAFF` only  
**Body:**
```json
{
  "designation": "Lab Technician"  // optional, 1-100 chars
}
```

---

## 3. BOOKINGS & AVAILABILITY

### POST `/bookings/check-availability`
**Auth:** JWT required  
**Body:**
```json
{
  "roomId": "cuid",           // required
  "bookingDate": "2026-04-01", // required, YYYY-MM-DD
  "startMinute": 480,          // required, 0-1439 (480 = 8:00 AM)
  "endMinute": 540             // required, 0-1439, must be > startMinute
}
```
**Response (200):**
```json
{
  "available": true,      // or false
  "reason": null,         // "TimeTable Conflict" or "Booking Conflict"
  "details": null         // conflict details if not available
}
```

---

### GET `/bookings/available-rooms`
**Auth:** JWT required  
**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingDate` | string | ✅ | YYYY-MM-DD |
| `startMinute` | number | ✅ | 0-1439 |
| `endMinute` | number | ✅ | 0-1439, > startMinute |
| `buildingId` | cuid | ❌ | Filter by building |
| `roomTypeId` | cuid | ❌ | Filter by room type |
| `minCapacity` | number | ❌ | Minimum capacity |

**Response (200):** Array of available rooms:
```json
[
  {
    "id": "cuid",
    "roomNumber": "101",
    "fullCode": "LHC 101",
    "displayName": "Lecture Hall 1",
    "capacity": 120,
    "buildingId": "cuid",
    "building": { "id": "cuid", "name": "LHC", "code": "LHC" },
    "roomType": { "id": "cuid", "code": "LH", "name": "Lecture Hall" },
    "features": [
      { "feature": { "id": "cuid", "code": "PROJ", "name": "Projector" }, "value": "Epson" }
    ]
  }
]
```

---

### GET `/bookings/suggest-alternatives`
**Auth:** JWT required  
**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingDate` | string | ✅ | YYYY-MM-DD |
| `startMinute` | number | ✅ | 0-1439 |
| `endMinute` | number | ✅ | 0-1439 |
| `roomId` | cuid | ❌ | Original room (to exclude + prioritize same building) |
| `buildingId` | cuid | ❌ | Preferred building |
| `minCapacity` | number | ❌ | Minimum capacity |
| `roomTypeId` | cuid | ❌ | Preferred room type |

**Response (200):** Array of max 15 rooms, same-building first, sorted by capacity.

---

### GET `/bookings/building-room-map`
**Auth:** JWT required  
**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | cuid | ✅ | Building to map |
| `bookingDate` | string | ✅ | YYYY-MM-DD |
| `startMinute` | number | ✅ | 0-1439 |
| `endMinute` | number | ✅ | 0-1439 |

**Response (200):**
```json
{
  "building": { "id": "cuid", "code": "LHC", "name": "Lecture Hall Complex", "location": "..." },
  "date": "2026-04-01",
  "timeRange": { "startMinute": 480, "endMinute": 540 },
  "summary": {
    "total": 20,
    "available": 14,
    "blocked": 6
  },
  "rooms": [
    {
      "id": "cuid",
      "roomNumber": "101",
      "fullCode": "LHC 101",
      "displayName": "Lecture Hall 1",
      "capacity": 120,
      "notes": null,
      "roomType": { "id": "cuid", "code": "LH", "name": "Lecture Hall" },
      "features": [ ... ],
      "status": "AVAILABLE",           // "AVAILABLE" | "TIMETABLE_BLOCKED" | "BOOKING_BLOCKED"
      "isAvailable": true,
      "blockedBy": null
      // If blocked:
      // "blockedBy": { "type": "TIMETABLE", "slots": ["A1", "B1"] }
      // "blockedBy": { "type": "BOOKING", "bookings": [{ "title": "...", "startMinute": 480, "endMinute": 540 }] }
    }
  ]
}
```
**Frontend Use:** Render as a visual floor map / grid showing room status with color coding (green=available, red=blocked).

---

### POST `/bookings/`
**Auth:** JWT required  
**Role:** `USER`, `FACULTY`  
**Body:**
```json
{
  "roomId": "cuid",                     // required
  "bookingDate": "2026-04-01",          // required, YYYY-MM-DD
  "startMinute": 480,                   // required
  "endMinute": 540,                     // required
  "title": "Study Group Session",       // required, 1-200 chars
  "purpose": "CS course revision",      // optional, max 1000 chars
  "minCapacityRequired": 30,            // optional, positive int
  "facultyReviewerUserId": "cuid"       // optional (USER must provide, FACULTY can skip)
}
```
**Success Response (201):** Created booking request object.  
**Error Response (409) — Room unavailable:**
```json
{
  "success": false,
  "message": "Room is not available for the requested time",
  "errors": ["TimeTable Conflict"],
  "data": {
    "conflict": {
      "available": false,
      "reason": "TimeTable Conflict",
      "details": { "slotId": "...", "slotCode": "A1" }
    },
    "suggestedAlternatives": [
      { "id": "...", "fullCode": "LHC 102", "capacity": 120, ... }
    ]
  }
}
```
**Booking Workflow:**
- `USER` → status: `PENDING_FACULTY` → faculty approves → `PENDING_STAFF` → staff approves → `APPROVED`
- `FACULTY` → status: `PENDING_STAFF` → staff approves → `APPROVED`
- Any reviewer can reject → `REJECTED`
- Requester can cancel → `CANCELLED`

---

### GET `/bookings/my-requests`
**Auth:** JWT required  
**Response (200):** Array of user's own booking requests with room and reviewer details.

---

### GET `/bookings/:bookingId`
**Auth:** JWT required  
**Response (200):** Full booking request with room, requester, reviewers, and action history.

---

### PATCH `/bookings/:bookingId/cancel`
**Auth:** JWT required  
**Response (200):** Cancelled booking object.

---

### GET `/bookings/faculty/pending`
**Auth:** JWT required  
**Role:** `FACULTY`  
**Response (200):** Array of bookings pending this faculty member's review.

---

### PATCH `/bookings/faculty/:bookingId/approve`
**Auth:** JWT required  
**Role:** `FACULTY`  
**Response (200):** Updated booking (status → `PENDING_STAFF`).

---

### PATCH `/bookings/faculty/:bookingId/reject`
**Auth:** JWT required  
**Role:** `FACULTY`  
**Body:**
```json
{
  "rejectionReason": "Room too large for group size"  // required, 1-500 chars
}
```
**Response (200):** Updated booking (status → `REJECTED`).

---

### GET `/bookings/staff/pending`
**Auth:** JWT required  
**Role:** `STAFF`, `ADMIN`  
**Response (200):** Array of bookings pending this staff member's review (filtered by assigned buildings).

---

### PATCH `/bookings/staff/:bookingId/approve`
**Auth:** JWT required  
**Role:** `STAFF`, `ADMIN`  
**Response (200):** Updated booking (status → `APPROVED`).

---

### PATCH `/bookings/staff/:bookingId/reject`
**Auth:** JWT required  
**Role:** `STAFF`, `ADMIN`  
**Body:**
```json
{
  "rejectionReason": "Maintenance scheduled"  // required
}
```
**Response (200):** Updated booking (status → `REJECTED`).

---

## 4. ADMIN — STAFF-BUILDING ASSIGNMENTS

> All admin routes require `ADMIN` role.

### POST `/admin/staff-assignments`
**Body:**
```json
{
  "staffUserId": "cuid",   // must be a user with STAFF role
  "buildingId": "cuid"
}
```
**Response (201):** Assignment with building and staff details.

---

### DELETE `/admin/staff-assignments/:buildingId/:staffUserId`
**Response (200):** `{ "message": "Assignment removed successfully" }`

---

### PATCH `/admin/staff-assignments/:buildingId/:staffUserId`
**Body:**
```json
{
  "newStaffUserId": "cuid",   // optional (swap staff)
  "newBuildingId": "cuid"     // optional (swap building)
  // At least one required
}
```
**Response (200):** Updated assignment.

---

### GET `/admin/staff-assignments`
**Query params:** `page`, `limit`, `buildingId`, `staffUserId`  
**Response (200):** Paginated list of assignments with building + staff details.

---

### GET `/admin/staff-assignments/by-staff/:staffUserId`
**Response (200):** Array of buildings assigned to this staff member.

---

### GET `/admin/staff-assignments/by-building/:buildingId`
**Response (200):** `{ building: {...}, staff: [...] }`

---

## 5. ADMIN — BOOKING MONITORING

### GET `/admin/booking-history`
**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingRequestId` | cuid | ❌ | Filter by booking |
| `performedByUserId` | cuid | ❌ | Filter by actor |
| `actionType` | enum | ❌ | `CREATED`, `FACULTY_APPROVED`, `FACULTY_REJECTED`, `STAFF_APPROVED`, `STAFF_REJECTED`, `CANCELLED` |
| `fromDate` | string | ❌ | YYYY-MM-DD |
| `toDate` | string | ❌ | YYYY-MM-DD |
| `page` | number | ❌ | Default: 1 |
| `limit` | number | ❌ | Default: 50, max: 100 |

**Response (200):** Paginated action history entries with booking and user details.

---

### GET `/admin/bookings`
**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum | ❌ | `PENDING_FACULTY`, `PENDING_STAFF`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `fromDate` | string | ❌ | YYYY-MM-DD |
| `toDate` | string | ❌ | YYYY-MM-DD |
| `requesterId` | cuid | ❌ | Filter by requester |
| `roomId` | cuid | ❌ | Filter by room |
| `buildingId` | cuid | ❌ | Filter by building |
| `page` | number | ❌ | Default: 1 |
| `limit` | number | ❌ | Default: 20 |

**Response (200):** Paginated bookings with requester, room, building, and reviewer details.

---

### GET `/admin/stats`
**Response (200):**
```json
{
  "users": {
    "total": 150,
    "active": 142,
    "byRole": { "USER": 120, "FACULTY": 15, "STAFF": 5, "ADMIN": 2 }
  },
  "buildings": { "total": 5, "withStaffAssignments": 8 },
  "rooms": { "active": 45 },
  "bookings": {
    "total": 320,
    "pending": 12,
    "byStatus": { "APPROVED": 250, "REJECTED": 30, "PENDING_FACULTY": 5, "PENDING_STAFF": 7, "CANCELLED": 28 }
  }
}
```

---

## 6. ADMIN — MASTER DATA CRUD

> Pattern: `POST` = create, `GET` = list/getById, `PATCH /:id` = update, `PATCH /:id/deactivate` = soft delete, `DELETE /:id` = hard delete.

### Buildings (`/admin/master/buildings`)

| Method | Path | Body/Query |
|--------|------|-----------|
| POST | `/admin/master/buildings` | `{ code: "LHC", name: "Lecture Hall Complex", location: "North Campus" }` |
| GET | `/admin/master/buildings` | Query: `isActive`, `page`, `limit` |
| GET | `/admin/master/buildings/:id` | — |
| PATCH | `/admin/master/buildings/:id` | `{ code?, name?, location?, isActive? }` |
| PATCH | `/admin/master/buildings/:id/deactivate` | — (soft delete) |
| DELETE | `/admin/master/buildings/:id` | — (hard delete, fails if rooms exist) |

---

### Rooms (`/admin/master/rooms`)

| Method | Path | Body/Query |
|--------|------|-----------|
| POST | `/admin/master/rooms` | `{ buildingId, roomNumber, roomTypeId?, displayName?, capacity?, notes? }` |
| GET | `/admin/master/rooms` | Query: `buildingId`, `roomTypeId`, `isActive`, `page`, `limit` |
| GET | `/admin/master/rooms/:id` | — |
| PATCH | `/admin/master/rooms/:id` | `{ roomNumber?, roomTypeId?, displayName?, capacity?, notes?, isActive? }` |
| PATCH | `/admin/master/rooms/:id/deactivate` | — |
| DELETE | `/admin/master/rooms/:id` | — (fails if bookings exist) |
| POST | `/admin/master/rooms/:roomId/features` | `{ featureId, value? }` |
| DELETE | `/admin/master/rooms/:roomId/features/:featureId` | — |

**Note:** `fullCode` is auto-generated as `{buildingCode} {roomNumber}`.

---

### Room Types (`/admin/master/room-types`)

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/master/room-types` | `{ code: "LH", name: "Lecture Hall" }` |
| GET | `/admin/master/room-types` | Query: `page`, `limit` |
| PATCH | `/admin/master/room-types/:id` | `{ code?, name?, isActive? }` |
| PATCH | `/admin/master/room-types/:id/deactivate` | — |
| DELETE | `/admin/master/room-types/:id` | — |

---

### Room Features (`/admin/master/room-features`)

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/master/room-features` | `{ code: "PROJ", name: "Projector" }` |
| GET | `/admin/master/room-features` | Query: `page`, `limit` |
| PATCH | `/admin/master/room-features/:id` | `{ code?, name?, isActive? }` |
| PATCH | `/admin/master/room-features/:id/deactivate` | — |
| DELETE | `/admin/master/room-features/:id` | — |

---

### Departments (`/admin/master/departments`)

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/master/departments` | `{ code: "CSE", name: "Computer Science and Engineering" }` |
| GET | `/admin/master/departments` | Query: `isActive`, `page`, `limit` |
| PATCH | `/admin/master/departments/:id` | `{ code?, name?, isActive? }` |
| PATCH | `/admin/master/departments/:id/deactivate` | — |
| DELETE | `/admin/master/departments/:id` | — |

---

### Slot Systems (`/admin/master/slot-systems`)

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/master/slot-systems` | `{ code: "IIT_2025", name: "IIT Slot System 2025", description?, applicableFor? }` |
| GET | `/admin/master/slot-systems` | Query: `page`, `limit` |
| GET | `/admin/master/slot-systems/:id` | Returns with all slots + occurrences + aliases |
| PATCH | `/admin/master/slot-systems/:id` | `{ code?, name?, description?, applicableFor?, isActive? }` |
| PATCH | `/admin/master/slot-systems/:id/deactivate` | — |
| DELETE | `/admin/master/slot-systems/:id` | — |

---

### Slot Aliases (`/admin/master/slot-aliases`)

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/master/slot-aliases` | `{ slotSystemId, effectiveSlotId, rawCode: "A", note? }` |
| GET | `/admin/master/slot-aliases` | Query: `slotSystemId`, `effectiveSlotId`, `page`, `limit` |
| DELETE | `/admin/master/slot-aliases/:id` | — |

---

## 7. MINUTE-TO-TIME CONVERSION HELPER

The system stores times as **minutes from midnight** (0-1439). Here's how to convert:

```javascript
// minuteToTime(480) → "08:00 AM"
function minuteToTime(minute) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

// timeToMinute("08:00") → 480
function timeToMinute(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
```

---

## 8. FRONTEND PAGE SUGGESTIONS

| Page | Routes Used | Role |
|------|-------------|------|
| **Login/Signup** | `POST /auth/signup`, `POST /auth/login` | Public |
| **Dashboard** | `GET /auth/getCurrentUser`, `GET /profile/me` | All |
| **Profile Setup** | `PATCH /profile/student|faculty|staff` | Role-specific |
| **Book a Room** | `GET /bookings/available-rooms`, `POST /bookings/`, `GET /info/*` | USER, FACULTY |
| **My Bookings** | `GET /bookings/my-requests`, `PATCH /bookings/:id/cancel` | All |
| **Faculty Review** | `GET /bookings/faculty/pending`, `PATCH .../approve`, `PATCH .../reject` | FACULTY |
| **Staff Review** | `GET /bookings/staff/pending`, `PATCH .../approve`, `PATCH .../reject` | STAFF |
| **Building Room View** | `GET /bookings/building-room-map`, `GET /bookings/building-room-status`, `GET /info/buildings` | All |
| **Admin Dashboard** | `GET /admin/stats` | ADMIN |
| **Admin: Staff Assign** | `POST/GET/PATCH/DELETE /admin/staff-assignments/...`, `GET /info/staff`, `GET /info/buildings` | ADMIN |
| **Admin: All Bookings** | `GET /admin/bookings`, `GET /admin/booking-history` | ADMIN |
| **Admin: Master Data** | All `/admin/master/*` routes | ADMIN |
| **Admin: Courses** | All `/admin/master/courses*` routes, `GET /info/departments` | ADMIN |
| **Admin: Users** | All `/admin/approved-users` routes | ADMIN |

---

## 9. IMPORTANT DATA TYPES

| Type | Format | Example |
|------|--------|---------|
| ID | CUID string | `"clm1234567890abcdef"` |
| Date | `YYYY-MM-DD` string | `"2026-04-01"` |
| Time | Minutes from midnight (0-1439) | `480` = 8:00 AM, `810` = 1:30 PM |
| Role | Enum | `"USER"`, `"FACULTY"`, `"STAFF"`, `"ADMIN"` |
| BookingStatus | Enum | `"PENDING_FACULTY"`, `"PENDING_STAFF"`, `"APPROVED"`, `"REJECTED"`, `"CANCELLED"` |
| Day | Enum | `"MONDAY"`, `"TUESDAY"`, ... `"SUNDAY"` |
| SlotKind | Enum | `"LECTURE"`, `"LAB"`, `"TUTORIAL"`, `"SPECIAL"` |

---

## 10. Info / Dropdown Routes

> **Purpose:** Provide lightweight data for frontend dropdowns and selection UIs. All return active records only.

> **Auth:** JWT required. All endpoints accessible by any authenticated user except `/info/staff` (ADMIN only).

### `GET /info/buildings`
Returns all active buildings.
```json
{ "data": [{ "id": "cuid", "code": "LHC", "name": "Lecture Hall Complex", "location": "..." }] }
```

### `GET /info/departments`
Returns all active departments.
```json
{ "data": [{ "id": "cuid", "code": "CSE", "name": "Computer Science & Engineering" }] }
```

### `GET /info/room-types`
Returns all active room types.
```json
{ "data": [{ "id": "cuid", "code": "LH", "name": "Lecture Hall" }] }
```

### `GET /info/room-features`
Returns all active room features.
```json
{ "data": [{ "id": "cuid", "code": "PROJECTOR", "name": "Projector" }] }
```

### `GET /info/rooms?buildingId=<optional>`
Returns active rooms, optionally filtered by building.
```json
{
  "data": [{
    "id": "cuid", "roomNumber": "101", "fullCode": "LHC 101",
    "displayName": null, "capacity": 120,
    "building": { "id": "cuid", "code": "LHC", "name": "Lecture Hall Complex" },
    "roomType": { "id": "cuid", "code": "LH", "name": "Lecture Hall" }
  }]
}
```

### `GET /info/faculty`
Returns all active faculty users — for student booking dropdown.
```json
{
  "data": [{
    "id": "cuid", "name": "Dr. Anil Kumar", "email": "anil@iitj.ac.in",
    "facultyProfile": {
      "designation": "Associate Professor",
      "department": { "id": "cuid", "code": "CSE", "name": "Computer Science & Engineering" }
    }
  }]
}
```

### `GET /info/staff` *(ADMIN only)*
Returns all active staff users — for admin staff-building assignment dropdown.
```json
{
  "data": [{
    "id": "cuid", "name": "Staff User", "email": "staff@iitj.ac.in",
    "staffProfile": { "designation": "Lab In-charge" }
  }]
}
```

### `GET /info/courses?departmentId=<optional>`
Returns active courses, optionally filtered by department.
```json
{
  "data": [{
    "id": "cuid", "code": "CSL3060", "name": "Machine Learning", "credits": 4,
    "department": { "id": "cuid", "code": "CSE", "name": "Computer Science & Engineering" }
  }]
}
```

### `GET /info/slot-systems`
Returns all active slot systems.
```json
{ "data": [{ "id": "cuid", "code": "FIRSTYEAR", "name": "First Year Slot System", "description": "..." }] }
```

---

## 11. Admin: Approved Users

> **Purpose:** Manage which emails can register with elevated roles. When a user signs up, the system checks the approved users list to assign their role.

> **Auth:** JWT + ADMIN role required.

### `POST /admin/approved-users`
Create a new approved user entry.
```json
// Request
{ "email": "faculty@iitj.ac.in", "role": "FACULTY" }
// Response
{ "id": "cuid", "email": "faculty@iitj.ac.in", "role": "FACULTY" }
```

### `GET /admin/approved-users?role=<optional>&page=1&limit=20`
List approved users with optional role filter.

### `PATCH /admin/approved-users/:id`
Update approved user's role. **Also updates the already-registered user's role** if they exist.
```json
{ "role": "STAFF" }
```

### `DELETE /admin/approved-users/:id`
Remove an approved user entry (does not delete the registered user).

---

## 12. Admin: Course CRUD

> **Auth:** JWT + ADMIN role required.

### `POST /admin/master/courses`
```json
{ "code": "CSL3060", "name": "Machine Learning", "departmentId": "cuid", "ltp": "3-0-2", "credits": 4 }
```

### `GET /admin/master/courses?departmentId=<optional>&isActive=<optional>&page=1&limit=20`
List courses with filters.

### `GET /admin/master/courses/:id`
Get course with assignments and room allocations.

### `PATCH /admin/master/courses/:id`
Update course metadata.

### `PATCH /admin/master/courses/:id/deactivate`
Soft delete (deactivate) a course.

### `DELETE /admin/master/courses/:id`
Hard delete — only if no assignments reference it.

### `POST /admin/master/courses/:courseId/rooms`
Allocate a room to a course.
```json
{ "roomId": "cuid" }
```

### `DELETE /admin/master/courses/room-allocations/:allocationId`
Remove a room allocation from a course.

---

## 13. Building Room Status (Full-Day View)

> **Purpose:** Show the complete daily schedule for all rooms in a building — timetable classes + approved bookings.

> **Auth:** JWT required (any role).

### `GET /bookings/building-room-status?buildingId=<optional>&date=<optional>`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `buildingId` | CUID | LHC building | Building to view |
| `date` | YYYY-MM-DD | Today | Date to view |

**Response:**
```json
{
  "building": { "id": "cuid", "code": "LHC", "name": "Lecture Hall Complex" },
  "date": "2026-04-01",
  "dayOfWeek": "WEDNESDAY",
  "summary": { "totalRooms": 12, "roomsWithSchedule": 8, "freeRooms": 4 },
  "rooms": [
    {
      "id": "cuid",
      "roomNumber": "101",
      "fullCode": "LHC 101",
      "capacity": 120,
      "roomType": { "code": "LH", "name": "Lecture Hall" },
      "schedule": [
        {
          "sourceType": "TIMETABLE",
          "slotCode": "A",
          "startMinute": 480,
          "endMinute": 540,
          "course": { "code": "MEL2020", "name": "Thermodynamics", "instructor": "B. Ravindra" }
        },
        {
          "sourceType": "BOOKING",
          "startMinute": 600,
          "endMinute": 660,
          "title": "Study Group Session",
          "requester": "John Doe"
        }
      ],
      "occupiedSlots": 3,
      "approvedBookings": 1
    }
  ]
}
```

> **Frontend Usage:** Use this to build a room-status dashboard:
> 1. Load `/info/buildings` to populate the building dropdown (default: first item or LHC)
> 2. Call this endpoint with selected `buildingId` and `date`
> 3. Render a grid/table showing each room and its schedule blocks

---

## Frontend Implementation Notes

### Dropdown Data Flow
1. On app init, fetch `/info/buildings` and `/info/departments` to cache dropdown data
2. For booking form: fetch `/info/rooms?buildingId=X` and `/info/faculty`
3. For admin views: also fetch `/info/staff` and `/info/courses`
4. **Always send `id` (CUID) in API calls**, display `name` in UI

### Time Helper
```javascript
const minutesToTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const timeToMinutes = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
```
