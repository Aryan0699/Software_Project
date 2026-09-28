# URAS Product Feature Specification

## Document Status

This document defines the confirmed product functionality for the greenfield redesign of the Unified Room Allocation System (URAS).

It describes what the product must provide, who it serves, the rules it must enforce, and why each capability is required. It intentionally does not prescribe database tables, API shapes, programming languages, frameworks, or internal implementation techniques.

## 1. Product Objective

URAS will provide one reliable place for the institution to:

- Define academic slot grids and semester boundaries.
- Publish room allocations from the academic timetable.
- Show trustworthy room availability for a requested date and time.
- Allow students and faculty to request rooms for one-off events.
- Complete faculty and three-dean approvals with accountability.
- Give the academic timetable priority without silently deleting displaced events.
- Let administrators resolve timetable and calendar conflicts before applying a change.
- Maintain a complete operational and decision history.

The central product responsibility is room occupancy management. Phase 1 does not attempt to become a complete academic section, enrollment, examination, or student timetable management system.

## 2. Confirmed Product Principles

### 2.1 Academic Timetable Priority

The published academic timetable has priority over event bookings because teaching is the university's primary room use.

An academic timetable publication must not be blocked by a student or faculty event booking. It must also never silently delete, overwrite, or hide the displaced event.

### 2.2 Distinct Occupancy Sources

Recurring academic classes and one-off event bookings are different business concepts and must remain distinguishable to users, administrators, reports, and audit history.

Room availability must combine all applicable occupancy sources into one trustworthy result.

### 2.3 Safe Publication

A currently published timetable remains effective until a complete replacement is successfully published. Draft editing, incomplete uploads, validation failures, and cancelled imports must not leave the institution without a valid timetable.

### 2.4 Current-Term Focus

Phase 1 supports exactly one institution-wide current academic term at a time. Previous terms are retained for accountability, but advanced historical reporting and overlapping active terms are deferred.

### 2.5 Occupancy Rather Than Section Tracking

When the same course and slot appear in multiple timetable rows with different rooms, URAS may treat them as one academic room-use group with multiple rooms.

Phase 1 does not need to determine whether those rows represent one large class or separate academic sections because their room-occupancy effect is the same.

### 2.6 No Pending Room Hold

Pending event requests may overlap. A pending request does not reserve a room.

Availability is enforced when final approval is completed. Users and reviewers receive warnings about competing requests before that point.

## 3. User Roles

### 3.1 Student

A student can inspect room availability, create a one-off room request, select a faculty verifier, monitor approval progress, receive decisions, cancel eligible requests, and receive notifications when an administrative conflict changes their booking.

Why: Students need direct access without bypassing institutional accountability.

### 3.2 Faculty

A faculty member can inspect availability, create a one-off room request, review assigned student requests, approve or reject student requests, and monitor requests they created or verified.

Faculty-created requests bypass faculty verification and move directly to dean approval.

Why: Faculty can both request rooms and establish academic accountability for student requests.

### 3.3 Dean Approvers

The three required dean approvers are DOSA, ADOSA, and DOAA. Each receives an independent approval task for every request that reaches the dean stage.

All three approvals are required. They may decide in any order and in parallel. Any one rejection immediately rejects the complete request.

Why: The digital workflow must preserve the stakeholder-approved three-office authorization process.

### 3.4 LHC or Building Staff

Staff can inspect operational room usage, manage assigned buildings and rooms as authorized, and create room restrictions for their assigned buildings.

Staff are not part of the confirmed Phase 1 approval chain.

Why: Staff own day-to-day room operations within their assigned building scope.

### 3.5 Administrator

An administrator can manage academic terms, slot grids, timetable imports, calendar exceptions, buildings, rooms, users, roles, staff-building responsibility, and conflict decisions required by administrative changes.

Administrators cannot bypass or replace a required dean approval in Phase 1.

Why: Administrative control is needed for configuration and recovery without weakening the approved authorization policy.

## 4. Identity and Access Features

### ID-01 Authenticated Access

Protected functionality will be available only to authenticated, active users.

Ordinary approved users may sign in with either their local password or their verified institutional Google account.

Why: Room schedules, request details, personal information, and administrative controls must not be publicly mutable.

### ID-02 Role-Based Authorization

Every protected action will be authorized according to the user's role and, where applicable, assigned building scope.

Why: Hiding a button is not sufficient security; unauthorized operations must be rejected consistently.

### ID-03 Controlled Role Assignment

Administrators will be able to assign and update recognized institutional roles. Deactivated users will lose operational access without erasing their historical actions.

Why: Historical records must remain understandable after a person leaves or changes responsibility.

### ID-04 Dean Office Assignment

The system will identify the active user responsible for each required dean office: DOSA, ADOSA, and DOAA.

Each office will have one active assignee, and the same person cannot hold more than one of the three offices at the same time.

The system will prevent a request from entering dean approval if any required office has no active approver, and will clearly tell the administrator what is missing.

Why: A request must not become permanently stuck in an incomplete approval workflow.

### ID-05 Building Responsibility

Administrators will be able to assign one or more staff members to buildings. Staff operational views and actions will respect those assignments.

Why: Building responsibility determines who should receive and resolve room-operation issues.

## 5. Academic Term Features

### TERM-01 Term Definition

Administrators will be able to define an academic term with a unique code, display name, start date, and end date.

Why: Recurring timetable occupancy is meaningful only inside a bounded calendar period.

### TERM-02 Term Lifecycle

A term will have a clear lifecycle such as planned, current, and closed.

Why: Administrators must be able to prepare upcoming data without affecting current room availability.

### TERM-03 One Current Term

Phase 1 will allow only one institution-wide current term at a time.

Why: This matches the confirmed operating model and avoids unnecessary overlapping-term behavior.

### TERM-04 Date Applicability

Academic timetable occupancy will apply only when the requested date falls within the term's start and end dates.

Why: A Monday class from one semester must not block the same room in another semester.

### TERM-05 Term Closure

Closing a term will stop its timetable from affecting current availability while preserving its configuration, imports, publications, decisions, and audit history.

Why: Operational data should expire without destroying institutional records.

## 6. Building and Room Features

### ROOM-01 Building Directory

Authorized users will be able to browse active buildings and the rooms within each building.

Administrators will be able to create, update, deactivate, and reactivate buildings.

Phase 1 will allow building deactivation only when every room in the building satisfies the room-deactivation rule. Otherwise, the interface will show the blocking rooms and schedules and reject the change.

Why: A reliable room inventory is the foundation for allocation and availability.

### ROOM-02 Room Directory

Each room will expose a stable room code, display name, building, capacity, room type, features, accessibility information, operational status, and optional notes.

Why: Users and staff need enough information to choose a suitable room, not merely an available room.

### ROOM-03 Room Administration

Administrators will be able to create and update room master data. Building staff will manage operational restrictions only for rooms in their assigned buildings.

Why: Room inventory changes throughout the year and should not require code or seed-file changes.

### ROOM-04 Room Deactivation

A room may be deactivated for maintenance, safety, renovation, or retirement. An inactive room will not be offered for new allocations or event requests.

Phase 1 will allow deactivation only when the room has no applicable published academic occupancy, future approved event booking, or current or future active room restriction. Otherwise, the interface will show what must be cleared and will reject the deactivation.

Existing historical references will remain visible.

Why: Removing a room operationally must not erase the past.

### ROOM-05 Room Suitability

Availability searches and administrative conflict-resolution suggestions will support capacity, building, room type, accessibility, and required room features where those values are available.

Why: A free room is not useful if it cannot accommodate the activity.

### ROOM-06 Temporary Room Restrictions

Building staff may create and cancel temporary room restrictions only for assigned buildings. Administrators may do so globally.

Phase 1 will accept a restriction only when its date and time do not overlap published academic occupancy or an approved event. Otherwise, the system will show the blocking schedule and reject the restriction.

Why: This provides scoped operational control without introducing another displacement or emergency-override workflow.

## 7. Slot Grid Features

### SLOT-01 Multiple Slot Systems

URAS will initially provide the two confirmed slot systems:

- First year.
- Second year onward.

These are defaults, not a hard-coded limit. An administrator will be able to create, name, activate, and deactivate additional slot systems when institutional needs change.

The same slot code may exist in multiple systems and may represent different days or times.

Why: Slot identity is meaningful only within its slot system.

### SLOT-02 Admin Slot Creation

Administrators will be able to create and maintain slot systems and their slot grids through the dashboard, including when no grid exists.

Why: Initial configuration must not depend solely on developer-run seed scripts.

### SLOT-03 Weekly Slot Occurrences

A slot may contain multiple weekly occurrences. Each occurrence identifies a weekday, start time, and end time.

Why: A single academic slot commonly meets on several days and can meet at different times on different days.

### SLOT-04 Slot Validation

The system will reject invalid time ranges, duplicate occurrences, missing slot codes, and structurally invalid slot definitions.

Potential overlaps inside a grid will be shown clearly to the administrator before publication.

Why: Invalid slot definitions would make every downstream availability result unreliable.

### SLOT-05 Stable Alias Resolution

Phase 1 will normalize the confirmed stable timetable aliases and slot-code variants during import.

Unknown aliases will be presented for administrator resolution instead of being guessed silently.

Why: Stable normalization reduces repetitive work while preserving safety for unfamiliar input.

### SLOT-06 Published Grid Protection

The slot grid used by the current published timetable will not be edited destructively in place.

Why: An incomplete slot edit must not alter live room availability.

### SLOT-07 Draft Revision

An administrator will be able to create a draft revision of the current slot grid, modify it, and upload a replacement timetable against it.

The current grid remains active until the replacement timetable is successfully published.

Why: This provides safe slot updates without a complex timetable diff workflow or operational downtime.

### SLOT-08 Replacement Requirement

When a published slot grid is revised, the interface will clearly state that a replacement timetable must be uploaded before the revision can become active.

Why: Changing slot times changes every academic room occupancy associated with those slots.

## 8. Timetable Import Features

### IMPORT-01 Supported Upload

An authorized administrator will be able to upload the semester timetable as an `.xlsx` workbook and download a blank Phase 1 template from the import screen.

The administrator will select the academic term and slot system in the interface before upload; those values do not need to be repeated in every spreadsheet row. CSV support may be included if it preserves the same required information.

Why: Semester allocation must be operable by administrative users without developer assistance.

### IMPORT-02 Required Data Detection

The Phase 1 workbook will use one header row followed by one row per course-slot-room allocation. Its required logical columns are:

- `Course Code`.
- `Slot`.
- `Classroom`.

One row identifies one physical room. When the same course and slot use multiple rooms simultaneously, the administrator will repeat the course and slot on separate rows with a different classroom value.

The importer will locate and normalize these required values using the confirmed stable header and value aliases. Exact duplicate rows will be flagged, while repeated course-slot values with different rooms will remain valid.

It will preserve additional columns such as faculty, student count, department, credits, LTP, component, and remarks when present.

The spreadsheet does not need to contain meeting dates or times because the selected slot system supplies the weekly schedule and the selected academic term supplies the date boundary.

Why: Required occupancy data must be reliable, while useful source information must not be silently discarded.

### IMPORT-03 Source Preservation

The system will preserve the source file identity, file name, file fingerprint, raw row content, row number, and unrecognized auxiliary values.

Why: Administrators must be able to understand and reproduce how published data was interpreted.

### IMPORT-04 Duplicate File Warning

When the same file content has already been uploaded for the same term and slot system, the administrator will receive a clear warning and a link to the earlier import.

The warning will not globally prohibit legitimate reprocessing after cancellation or for another term.

Why: Duplicate detection should prevent accidents without blocking valid recovery workflows.

### IMPORT-05 Row Classification

Every imported row will retain its initial primary classification. Phase 1 classifications include:

- Valid.
- Unresolved slot.
- Unresolved room.
- Conflicting mapping.
- Duplicate row.
- Missing required field.

Additional explanatory issues and warnings may coexist with the primary classification.

Why: Administrators need understandable categories without losing the original reason a row required attention.

### IMPORT-06 Duplicate Row Meaning

An exact repeated course-slot-room allocation may be classified as a duplicate.

The same course and slot with a different room is valid multi-room occupancy and will not be classified as a duplicate solely for that reason.

Why: Multiple rooms are a confirmed requirement.

### IMPORT-07 Preview

Before publication, the administrator will see total rows, valid rows, unresolved rows, skipped rows, warnings, and each row's normalized interpretation.

Why: Publication should never be a blind file upload.

### IMPORT-08 Row Resolution

For a problematic row, an administrator may:

- Accept a valid interpretation.
- Select an existing slot.
- Select one existing room.
- Correct the interpreted mapping.
- Skip the row with a reason.

One import row always represents one physical room. An administrator who needs simultaneous multi-room occupancy will resolve or provide one row per room.

Why: Real institutional spreadsheets contain naming inconsistencies that require controlled human decisions.

### IMPORT-09 Resolution Accountability

The system will record who resolved or skipped a row, when the decision occurred, the selected values, and an optional note.

The initial classification remains unchanged after resolution.

Why: The institution must be able to explain manual corrections later.

### IMPORT-10 Publication Readiness

Publication will be disabled while any required row remains unresolved and unskipped.

Skipped rows will be summarized prominently before final confirmation.

Why: Administrators must make an explicit decision for every unusable allocation.

### IMPORT-11 Import Lifecycle

An import will visibly progress through previewed, published, cancelled, or failed outcomes. Failures will retain an understandable reason and will not alter the current timetable.

Why: Administrators need recoverable, observable outcomes rather than uncertain partial processing.

### IMPORT-12 Multi-Room Grouping

Rows with the same normalized course and slot may contribute multiple simultaneous room allocations to the same academic room-use group.

Any faculty names found across those rows will be preserved and associated with that group where they can be resolved.

### IMPORT-13 Replace Upload

From a preview with many unresolved rows, an administrator may upload a corrected workbook as a replacement instead of resolving every row manually.

The replacement is parsed and previewed before the earlier staging batch is cancelled. A failed replacement upload leaves the earlier preview available. The interface will show the new issue totals beside the earlier totals so the administrator can confirm that the corrected workbook reduced the work.

Why: Correcting a systematic source-file problem once is safer and faster than repeating the same manual decision across many rows.

Why: Phase 1 manages occupancy and does not require academic section reconstruction.

## 9. Timetable Publication Features

### PUB-01 Published Timetable Scope

Within the current term, each slot system may have one published timetable and at most one replacement draft.

Why: First-year and senior-year slot systems both need current allocations without allowing multiple competing live versions.

### PUB-02 All-or-Nothing Publication

A timetable becomes active only after all selected rows, course assignments, room allocations, and recurring occupancies are successfully published together.

If publication fails, the previous timetable remains active.

Why: Partial timetable replacement would create incorrect availability.

### PUB-03 Replacement Publication

Publishing a replacement timetable will make the previous publication superseded and activate the replacement as one operation.

Why: Users should see one coherent current timetable.

### PUB-04 Historical Preservation

Superseded publications, import decisions, and previous academic allocations will remain available to authorized administrators for accountability.

Why: Replacing operational data must not erase institutional history.

### PUB-05 Multi-Room Occupancy

An academic room-use group may occupy more than one room during every occurrence of its slot.

Why: One course-slot allocation may legitimately require multiple rooms.

### PUB-06 Phase 1 Day Consistency

All rooms assigned to an academic room-use group apply to every weekly occurrence of that group's slot.

Different rooms for different weekdays within the same slot are deferred to Phase 3.

Why: This covers confirmed data while avoiding unneeded occurrence-specific allocation complexity.

### PUB-07 Conflict Preview

Before final confirmation, the administrator will see approved event bookings that the new timetable will displace.

The preview will show the affected event, room, date, time, requester, and suitable alternative rooms or dates where available.

For every conflict, the administrator must choose to relocate the event, reschedule it, or cancel it with a reason before publication can continue.

Why: Timetable priority does not remove the need for human awareness and operational preparation.

### PUB-08 Timetable Priority

Approved event conflicts will not permanently block publication of an otherwise valid academic timetable. Publication waits only for the administrator to provide a complete valid decision for each affected event.

Why: Academic teaching allocation has confirmed institutional priority.

### PUB-09 Rebuildable Availability Projection

The system will maintain a synchronized, rebuildable representation of recurring room occupancy for fast availability searches.

Authorized administrators will have a way to verify and rebuild it if an integrity check fails.

Why: Fast reads are valuable, but cached or derived occupancy must never become irrecoverable source data.

## 10. Academic Calendar Exception Features

### CAL-01 No-Class Period

An administrator will be able to define a named date or date range during which normal academic timetable classes are suspended.

Rooms normally occupied only by those classes will be released for event availability.

Why: Holidays and institutional closures change recurring academic occupancy.

### CAL-02 Follow-Day Override

An administrator will be able to define that one calendar date follows another weekday's timetable pattern, such as Wednesday following Friday's schedule.

Why: Makeup teaching days must use the intended academic timetable instead of the date's normal weekday.

### CAL-03 Exception Validation

A follow-day override will apply to exactly one date and require a target weekday. A no-class exception may span a date range.

Conflicting exceptions for the same term and date will be rejected.

Why: Contradictory calendar rules would produce ambiguous availability.

### CAL-04 Current-Term Scope

Phase 1 calendar exceptions will apply institution-wide within the selected academic term.

Why: This covers confirmed requirements without premature building- or program-specific calendars.

### CAL-05 Event Independence

A no-class exception will release academic timetable occupancy but will not automatically cancel separately approved events.

Why: An institute holiday and an approved special event can have different operational rules.

### CAL-06 Change Impact

Before adding, changing, or removing an exception, the administrator will see every approved event booking that would clash with the resulting timetable.

The change cannot be confirmed until the administrator chooses a valid relocation, reschedule, or cancellation for each affected booking.

Why: Calendar corrections must not create silent operational conflicts.

## 11. Room Availability Features

### AVAIL-01 Exact Availability

An authenticated user will be able to check whether a room is available for one date and one continuous time range.

Why: Exact availability is required before a user can make a meaningful request.

### AVAIL-02 Combined Conflict Evaluation

Availability will consider:

- The current term's published academic timetable.
- Calendar exceptions and makeup-day behavior.
- Approved event bookings.
- Rooms deactivated or closed for operations.
- Any other confirmed room-blocking administrative restriction.

Pending booking requests will be shown as warnings but will not mark the room occupied. The warning will make clear that another request is awaiting approval and that submission does not guarantee the room.

Ordinary requesters will not receive another requester's private details. Authorized reviewers may inspect the competing requests needed to decide priority.

Why: A room is available only when every applicable source agrees.

### AVAIL-03 Date Boundary

Outside the current term's date range, its academic timetable will not block availability.

Why: Recurring slot occupancy must be term-bound.

### AVAIL-04 Search Available Rooms

Users will first discover suitable rooms for a selected date and filter by building, capacity, room type, accessibility, features, and room or building text. Choosing an exact time is deferred until the user opens a room.

Ordinary discovery results will exclude inactive rooms and rooms in inactive buildings.

Why: Users should not have to test every room individually.

### AVAIL-05 Room Timeline

Users will be able to inspect a selected room's daily timeline with free and occupied periods. The time selector appears only inside the expanded room so room discovery and time selection remain separate.

The primary selector will show one continuous, proportional daily timeline. Academic classes, approved events, restrictions, pending requests, and free windows will occupy their actual start and end positions rather than being rounded into display cells. The visible operating window is deployment configuration, with an initial default of 08:00–22:00. A custom-time option will accept explicit start and end times.

Users may drag across a free period to choose an exact continuous interval or click a free window to select the configured default duration. Confirmed occupancy and restrictions cannot be selected. Pending requests remain warnings and are selectable.

Bookings must be at least 30 minutes long. A shorter free gap remains visible on the timeline but cannot be selected. The expanded room provides an explicit Timeline / Custom time toggle. Free time uses a neutral treatment, while selected, occupied, and pending states remain visibly labelled. Hover and keyboard focus expose the exact interval and relevant privacy-safe details. Once a valid interval is selected, the interface shows exact availability feedback and exposes the booking-request action.

Both timeline and custom-time selections must remain inside the configured operating window. The server will enforce the same boundary when validating an exact availability interval.

The server will return merged free windows that meet the minimum duration. These windows ignore pending requests because pending requests do not hold the room. The interface will expose them as keyboard- and touch-friendly selection chips. Pending intervals remain amber overlays on the continuous free timeline instead of dividing a free window into separate selectable segments. On narrow screens, touch gestures pan the timeline horizontally rather than starting a drag selection.

Why: A timeline helps users choose a nearby feasible time without repeated searches.

### AVAIL-06 Room Comparison

Users will be able to compare multiple rooms for the same date and time window.

Why: Side-by-side comparison reduces booking effort and helps administrators resolve conflicts efficiently.

### AVAIL-07 Occupancy Explanation

When a room is unavailable, the interface will clearly distinguish academic timetable occupancy, approved event occupancy, room closure, and other restrictions.

Why: Users need actionable explanations rather than a generic unavailable message.

### AVAIL-08 Privacy-Aware Details

All authenticated users may see that a room is occupied. Full event details will be visible only to the requester, involved reviewers, authorized staff, and administrators.

Why: Availability must remain useful without exposing unnecessary personal or event information.

### AVAIL-09 Alternative Suggestions

When the requested room is unavailable, the system will suggest suitable available rooms and, where practical, nearby available time bands.

Why: The product should help users finish their task rather than merely reject it.

### AVAIL-10 Local-Time Consistency

Dates, weekdays, and times will be interpreted and displayed consistently in the institution's configured timezone.

Why: A timezone mismatch can create real room conflicts even when stored data appears valid.

## 12. Event Booking Request Features

### BOOK-01 Phase 1 Request Scope

Each Phase 1 request covers one room, one calendar date, and one continuous start-to-end time range.

Recurring, multi-date, and batch event requests are deferred to Phase 3.

Why: This covers the confirmed workflow with a clear and reliable approval unit.

### BOOK-02 Eligible Requesters

Students and faculty will be able to create event booking requests.

Why: Both groups have confirmed institutional use cases.

### BOOK-03 Request Information

A request will capture the room, date, start time, end time, title, purpose, event type, expected participants, and relevant special requirements.

Why: Reviewers need enough context to judge legitimacy and room suitability.

### BOOK-04 Student Faculty Selection

A student must select an active faculty verifier before submission.

Why: Student requests require faculty accountability before dean review.

### BOOK-05 Faculty Request Routing

A faculty-created request will move directly to three-dean approval.

Why: Faculty requesters do not need a separate faculty verification of their own request.

### BOOK-06 Optimistic Conflict Warning

At submission, the system will validate timetable occupancy, approved events, room status, capacity, and known restrictions.

Competing pending requests will generate a warning but will not prevent submission.

Why: Early feedback improves user choices while preserving the confirmed non-holding pending workflow.

### BOOK-07 Request Progress

The requester will be able to see the current stage, completed decisions, pending reviewers, rejection reason, administrative conflict changes, and chronological history.

Why: Users should not need to contact staff to learn what is happening.

### BOOK-08 Rejection Reason

Faculty and dean rejections will require a reason visible to the requester and retained in history.

Why: Transparent decisions reduce confusion and support accountability.

### BOOK-09 Eligible Cancellation

A requester will be able to cancel their own pending future request or future approved event without repeating the approval workflow. A cancellation reason will be required.

Cancellation of an approved event will immediately release the room, preserve the event and its prior approvals in history, and notify the requester, assigned faculty where applicable, all three dean offices, and responsible building staff.

An event that has started or ended cannot be cancelled through the ordinary future-event cancellation flow.

Why: Users need a safe way to release rooms they no longer require.

### BOOK-10 No Silent Mutation

Changes to an approved request's room, date, or time will not silently overwrite the original decision history.

General booking modification requests are deferred to Phase 2. Administrator-applied room or schedule changes required to resolve a timetable or calendar conflict are the only Phase 1 exception.

Why: Approved details form part of the authorization decision.

## 13. Approval Workflow Features

### APPROVAL-01 Student Faculty Review

A student request will first be assigned to the selected faculty verifier.

Faculty approval forwards the request to the three required dean offices. Faculty rejection ends the request.

Why: This implements the confirmed student accountability chain.

### APPROVAL-02 Three Required Dean Reviews

Every request entering dean review will create independent pending tasks for DOSA, ADOSA, and DOAA.

Why: The system must know both completed decisions and reviewers who have not yet acted.

### APPROVAL-03 Parallel Decisions

The three deans may approve in any order and in parallel.

Why: The workflow should not impose an unnecessary sequential delay.

### APPROVAL-04 Unanimous Approval

A request will reach final approval only after all three required deans approve.

Why: This is the confirmed stakeholder rule.

### APPROVAL-05 Immediate Rejection

Any dean rejection immediately rejects the complete request, records the reason, closes remaining pending dean tasks, and notifies the requester and involved faculty.

Why: Continuing to collect approvals after a decisive rejection wastes time and creates ambiguity.

### APPROVAL-06 Final Availability Check

The final approval transition will recheck all room constraints as one protected operation before reserving the room.

Why: Availability may have changed while the request was being reviewed.

### APPROVAL-07 Competing Pending Requests

Reviewers will be able to see overlapping pending requests and their submission times when deciding priority.

Once one request is finally approved, other pending requests that overlap the same room and time will be automatically rejected with a conflict reason and notifications.

Every automatically rejected requester will receive a clear system-generated message identifying that the room was allocated to another request. The final approver may add one shared note for all requests rejected by that approval. The interface will preview how many requesters will receive the shared note, and the note must not include another requester's private details.

Why: Pending requests may overlap, but only one can become an approved occupancy.

### APPROVAL-08 No Phase 1 Bypass

Administrators cannot substitute for a required dean, reduce the required approval count, or force approval in Phase 1.

Why: Emergency bypass behavior has been explicitly deferred.

### APPROVAL-09 Decision Integrity

Each required reviewer can hold only one current decision task per request. Repeated clicks or concurrent submissions must not create duplicate approvals.

Why: Approval progress must remain correct under retries and concurrent use.

## 14. Administrative Conflict Resolution Features

### CONFLICT-01 Impact Detection

Timetable publication and calendar-exception changes will identify every approved event that would conflict with the resulting academic schedule.

Why: Academic priority must be visible before an administrator changes confirmed event usage.

### CONFLICT-02 Resolution Before Confirmation

The administrator must resolve every detected conflict before confirming the timetable publication or calendar change. Phase 1 will not create a later relocation queue.

Why: Resolving conflicts in the same workflow is simpler and prevents unresolved operational work from accumulating.

### CONFLICT-03 Relocate to Another Room

The administrator may keep the event's date and time and select another suitable available room.

Why: A room-only change is the least disruptive resolution when a suitable alternative exists.

### CONFLICT-04 Reschedule

The administrator may choose another date, time, and room. The replacement must pass the same availability and suitability checks as a new request.

Why: Some events can be preserved only by moving them to a different time.

### CONFLICT-05 Cancel

If no acceptable alternative is available, the administrator may cancel the event with a required reason.

Why: Cancellation must be explicit and explainable rather than an accidental consequence of publication.

### CONFLICT-06 Revalidation

On final confirmation, the system will recompute the impact and revalidate every selected replacement. All replacements will also be checked together so that two administrative decisions cannot move separate events into conflict with each other. If occupancy changed after preview, confirmation will stop and show the refreshed conflicts.

Why: Preview information may become stale while the administrator is deciding.

### CONFLICT-07 Atomic Application

The timetable or calendar change and all selected booking relocations, reschedules, or cancellations will be applied together. If any decision fails, none of the changes will take effect.

Why: The academic schedule and affected events must never disagree after partial success.

### CONFLICT-08 Preserve Decisions

The original room, date, time, approvals, administrator, chosen outcome, reason, replacement details, and timestamp will remain in booking history.

Why: An administrative conflict resolution changes an approved institutional decision and must be auditable.

### CONFLICT-09 Requester Notification

After successful confirmation, each affected requester will receive an in-app notification explaining whether the event was relocated, rescheduled, or cancelled and why.

Why: The requester should receive the final actionable outcome, not an unresolved conflict alert.

### CONFLICT-10 Inline Editing Controls

Each impacted event will show its current room, date, time, conflict source, and three explicit resolution choices:

- Relocate: keep the date and time and choose from suitable rooms that are available in the resulting schedule.
- Reschedule: edit the date, start time, end time, and room, then validate the complete replacement.
- Cancel: enter a required reason.

The administrator can revise any choice before final confirmation. A summary will show unresolved conflicts and the selected outcomes, and confirmation remains disabled until every event has one valid decision.

Why: Conflict resolution should happen in context without making administrators translate an error into a separate room or booking workflow.

## 15. Notification Features

### NOTIFY-01 In-App Notifications

Phase 1 will provide persistent in-app notifications for actionable and important lifecycle events.

Why: Users need a reliable record that is not dependent on an external email service.

### NOTIFY-02 Required Notification Events

Notifications will cover at least:

- New faculty verification task.
- Faculty approval or rejection.
- New dean approval task.
- Dean approval progress.
- Final approval or rejection.
- Automatic conflict rejection.
- Request cancellation.
- Administrator-applied relocation, reschedule, or conflict cancellation.
- Administrative assignment requiring action.

Why: Each role must know when work or a decision requires attention.

### NOTIFY-03 Read State

Users will be able to view unread notifications, mark one as read, and mark all as read.

Why: Notification state supports manageable daily workflows.

### NOTIFY-04 Action Links

Actionable notifications will open the relevant request, approval task, import row, or administrative conflict preview.

Why: A notification should lead directly to the work it describes.

### NOTIFY-05 Delivery Extension

Phase 1 guarantees in-app notifications only. Guaranteed email, SMS, or other external delivery is deferred to Phase 3. If an optional external channel is enabled earlier, its failure must not remove the in-app notification.

Why: Core workflow reliability should not depend on optional infrastructure.

## 16. Audit and Accountability Features

### AUDIT-01 Booking Lifecycle History

Every booking creation, submission, forwarding, approval, rejection, automatic rejection, cancellation, administrative relocation, reschedule, and system transition will be recorded chronologically.

Why: Booking decisions affect shared institutional resources and must be explainable.

### AUDIT-02 Structured State Changes

History will preserve the action, actor or system origin, previous state, new state, timestamp, note, and relevant structured details.

Why: Free-text notes alone are insufficient for reliable reporting and investigation.

### AUDIT-03 Approval Accountability

Each faculty and dean decision will preserve the assigned reviewer, decision, decision note, and decision time.

Why: Current approval progress and historical accountability are both required.

### AUDIT-04 Import Accountability

Uploads, row interpretations, resolutions, skips, publication attempts, failures, cancellations, and successful publications will identify the responsible user and time.

Why: Timetable publication changes many room occupancies at once.

### AUDIT-05 Administrative Change History (Phase 2)

Raw before-and-after history for changes to terms, slot systems and grids, calendar exceptions, rooms, room status, role assignments, staff-building assignments, timetable imports, and timetable publications is deferred to Phase 2.

Phase 1 retains native timestamps and explicit actor fields such as creator, resolver, assigner, and publisher where applicable, but does not claim these provide a complete administrative change log.

Why: Configuration changes can materially alter availability and permissions.

### AUDIT-06 Append-Only History

Ordinary users and administrators will not edit or delete booking-history events through normal product workflows. The same rule will apply to general administrative events when that capability is implemented in Phase 2.

Why: An editable audit trail cannot provide accountability.

### AUDIT-07 Booking History Access

Booking history visibility will follow role and operational scope:

- Administrators can view all booking history.
- DOSA, ADOSA, and DOAA can view all booking requests, decisions, cancellations, timetable conflicts, relocations, and reschedules, but not unrelated sensitive security or configuration records.
- Staff can view full booking history for rooms in their assigned buildings.
- Faculty can view their own requests and student requests assigned to them.
- Students can view only their own requests.

Why: Decision-makers and room operators need sufficient context without exposing institution-wide personal data to every user.

### AUDIT-08 History Filters and Download

The booking history interface will provide quick date filters for the last 7 days and last 30 days, a custom date range, and filters for status, room, building, actor, and action type where permitted.

Authorized users will be able to download the filtered result as CSV. The download will enforce the same role and building scope as the on-screen results.

Why: Staff, deans, and administrators need practical reporting without bypassing access controls.

### AUDIT-09 Administrative Audit View (Phase 2)

Phase 2 may provide administrators with a dedicated append-only audit view with filters for date, actor, category, action, and affected record.

Why: Configuration investigations should not be mixed into ordinary booking history or reconstructed from application logs.

## 17. Dashboards and Operational Views

### DASH-01 Student Dashboard

Students will see their upcoming approved events, pending requests, requests needing action, recent decisions, and unread notifications.

Why: The dashboard should prioritize the student's actual workflow.

### DASH-02 Faculty Dashboard

Faculty will see their room requests, student requests awaiting verification, upcoming approved events, recent decisions, and unread notifications.

Why: Faculty are both requesters and reviewers.

### DASH-03 Dean Dashboard

Each dean will see their pending approval tasks, competing requests, urgent items, recent decisions, and unread notifications.

Why: Approval work must be quickly scannable and actionable.

### DASH-04 Staff Dashboard

Staff will see room operations for assigned buildings, upcoming events, room closures and restrictions, and urgent notifications.

Why: Staff need an operational view rather than an approval-oriented view.

### DASH-05 Administrator Dashboard

Administrators will see the current term, publication status for each slot system, unresolved import rows, failed imports, timetable and calendar conflict impact, room status, and user configuration issues.

Why: Administrators need early visibility into conditions that can make availability unreliable.

### DASH-06 Quick Actions

Each dashboard will expose the most common role-appropriate actions, such as checking availability, creating a request, reviewing approvals, resolving import rows, or completing administrative conflict decisions.

Why: Frequent tasks should not require unnecessary navigation.

## 18. Search, Lists, and Records

### LIST-01 Filterable Lists

Bookings, requests, approvals, rooms, imports, notifications, conflicts, and audit records will be filterable by the dimensions relevant to each role.

Why: Operational users must locate records without scanning unbounded lists.

### LIST-02 Pagination

Large result sets will be paginated with clear total and navigation information.

Why: Product responsiveness and usability should not degrade as institutional history grows.

### LIST-03 Stable Sorting

Lists will use predictable default ordering, such as urgency and age for action queues and date for scheduled occupancy.

Why: Stable ordering makes repeated workflows easier to scan.

### LIST-04 Exportable Records

Authorized users will be able to export the records visible within their role and operational scope. Administrators may additionally export timetable import reports and conflict-resolution outcomes. Administrative audit export is deferred to Phase 2.

Why: Institutional operations often require offline review and reporting.

## 19. Product-Grade Quality Requirements

### QUALITY-01 Concurrency Safety

Concurrent final approvals, administrative conflict resolutions, timetable publications, calendar changes, or room changes must not produce overlapping approved occupancy for the same room and time.

Why: A conflict-free interface is insufficient if concurrent server requests can bypass it.

### QUALITY-02 Transactional Consistency

Business state, occupancy state, approval state, required notifications, and booking-history events will not be left partially updated after a failed operation.

Why: Partial success creates records that users cannot trust.

### QUALITY-03 Performance

Under expected institutional load, at least 95 percent of ordinary room availability requests should complete within two seconds.

Publication and import processing may take longer but must expose clear progress and outcomes without blocking unrelated reads.

Why: Availability is a frequent interactive workflow.

### QUALITY-04 Availability Correctness

The Phase 1 build may prioritize completing the functional workflows before broad automated test hardening. It must not be described or deployed as production-ready until automated integration tests cover term boundaries, slot-system differences, overlap boundaries, holidays, follow-day overrides, multi-room classes, final approval races, timetable conflict decisions, calendar-change conflicts, and stale-preview races.

Why: These are the highest-risk rules in the product.

### QUALITY-05 Security

The product will enforce authenticated access, role authorization, building scope, safe input validation, protected credentials, rate controls for sensitive actions, and secure transport in production.

Why: The system contains personal data and controls institutional facilities.

### QUALITY-06 Privacy

Users will see only the booking and personal details needed for their role and task.

Why: Occupancy transparency does not justify unrestricted disclosure.

### QUALITY-07 Accessible and Responsive UI

Primary workflows will support keyboard use, meaningful labels, readable status indicators, error feedback, and common desktop and mobile viewport sizes.

Why: Administrative and student users access the system from varied devices and abilities.

### QUALITY-08 Recoverability

The institution will be able to back up and restore critical configuration, published timetable batches, booking decisions, and booking history.

Why: Accidental loss of current allocation data would disrupt teaching and events.

### QUALITY-09 Observability

Operational failures such as publication failure, notification failure, repeated conflict, and occupancy integrity failure will be visible to administrators without exposing sensitive diagnostic information to ordinary users.

Why: Production issues must be discoverable before they become prolonged operational problems.

## 20. Explicit Phase 1 Boundaries

The following constraints are intentional Phase 1 decisions:

- Exactly one institution-wide current academic term.
- One published timetable per slot system in that term.
- At most one replacement draft per slot system.
- First-year and second-year-onward slot systems are provided as defaults, and administrators can add further slot systems.
- Multiple simultaneous rooms per course-slot group are supported.
- Different rooms on different weekdays within one course-slot group are not supported.
- Academic section identity is not reconstructed or managed.
- Student-level timetable clash checking is not performed.
- Pending event requests do not hold rooms.
- Every event request covers one date and one continuous time range.
- Three dean approvals are mandatory and parallel.
- Any one dean rejection rejects the request.
- No administrator bypasses a required dean.
- Timetable publication has priority, but every affected event must be relocated, rescheduled, or explicitly cancelled by the administrator before confirmation.
- In-app notifications are required; guaranteed external delivery is deferred to Phase 3.
- General raw before-and-after administrative audit logging and its audit view are deferred to Phase 2.

## 21. Phased Roadmap

The following capabilities are deferred unless stakeholders reprioritize them.

### Phase 2

- General modifications to approved event bookings.
- Faculty-initiated course slot-change and venue-change request workflows.
- Program-, department-, building-, or slot-system-specific calendar exceptions.
- Emergency room closure or deactivation that displaces confirmed occupancy.
- General `AdministrativeAuditEvent` recording, filtering, and export where institutional compliance requires it.
- Broad automated integration and end-to-end test hardening after the functionality-first Phase 1 build.

### Phase 3

- Guaranteed email, SMS, or other external messaging delivery.
- Different rooms for different occurrences of one course-slot group.
- Recurring, multi-date, and batch event requests.

### Phase 4

- Student enrollment import and student-level timetable clash detection.
- Academic section and cohort tracking.
- Multiple concurrently active academic terms.
- Administrator substitution or emergency bypass for an unavailable dean.
- Configurable approval policies for different event types.
- Examination timetable generation and seating plans.
- Advanced historical analytics and utilization forecasting.
- Configurable alias rules if the current stable normalization rules change.

## 22. Core Acceptance Scenarios

### Scenario A: Same Slot Code, Different Systems

First-year Slot F and senior Slot F have different weekly times. Publishing both timetables blocks rooms according to the correct system without treating the slots as identical.

### Scenario B: Multi-Room Academic Allocation

The spreadsheet contains the same course and slot on two rows with two different rooms. The import accepts both rows and the published timetable marks both rooms occupied for every occurrence of that slot.

### Scenario C: Student Request Approval

A student selects a room and faculty verifier. Faculty approves. DOSA, ADOSA, and DOAA receive independent tasks and approve in any order. The last required approval rechecks availability and approves the request.

### Scenario D: Dean Rejection

Two deans approve and the third rejects with a reason. The complete request becomes rejected immediately, remaining tasks close, and the student and faculty receive the decision.

### Scenario E: Competing Pending Requests

Two pending requests overlap the same room and time. Both display warnings. The request that intentionally completes final approval first reserves the room. The other request is automatically rejected with a conflict reason and an in-app message. If the approver supplied a shared note, every request rejected by that approval receives the same note without seeing private details from the winning request.

### Scenario E2: Replace a Noisy Import

An uploaded workbook has many unresolved room values caused by a source-file naming problem. The administrator corrects the workbook and chooses Replace upload. The corrected workbook is previewed with lower issue counts, the earlier preview is retained as cancelled import history, and no row from either preview changes the published timetable until explicit publication.

### Scenario F: Timetable Conflict Resolved During Publication

A replacement timetable requires a room already assigned to an approved student event. The administrator sees the impact, selects a suitable alternative room, and confirms publication. The timetable and room change commit together, the event remains approved in its new room, its original details remain in history, and the requester is notified.

### Scenario G: Holiday

A date is configured as no-classes. The regular timetable does not block rooms on that date, but existing approved special events remain scheduled.

### Scenario H: Makeup Day

A Wednesday is configured to follow Friday's timetable. Availability on that Wednesday applies Friday's slot occurrences instead of normal Wednesday occurrences.

### Scenario I: Failed Replacement

An administrator revises a slot grid and uploads a replacement timetable, but publication fails validation. The existing grid and timetable remain active and room availability remains unchanged.

### Scenario J: Concurrent Final Approval

Two requests for the same room reach their final dean approval at nearly the same time. Exactly one becomes approved. The other receives a conflict rejection, and no overlapping approved occupancy is created.

### Scenario K: Approved Event Cancellation

A requester cancels a future approved event and supplies a reason. The room becomes available immediately, prior approvals remain visible, a cancellation event is appended, and all affected workflow and operational users are notified.

### Scenario L: Scoped History Download

A staff member filters booking history to the last 30 days and downloads a CSV. The result contains only rooms in the staff member's assigned buildings. A dean can perform the same action across all booking requests, while a student can access only their own records.

### Scenario M: Makeup-Day Conflict Resolution

An administrator changes a Wednesday to follow Friday's timetable and the resulting Friday schedule clashes with an approved event. The system previews the event and will not confirm the exception until the administrator relocates, reschedules, or cancels it. The calendar change and selected outcome commit together, and the requester receives the reason and new details.

## 23. Definition of Phase 1 Functional Completion

Phase 1 is functionally complete when:

- Administrators can configure the current term, slot systems, buildings, and rooms without developer intervention.
- Administrators can preview, resolve, and safely publish the current timetable for each configured slot system.
- Current room availability correctly combines timetable, exceptions, approved events, and room status.
- Students and faculty can create one-off requests through the confirmed workflow.
- Faculty and all three deans can complete their assigned decisions.
- Concurrent final approvals cannot double-book a room.
- Administrators can resolve every timetable or calendar conflict during confirmation without deleting an event silently or leaving a separate queue.
- Every booking decision and state transition is retained in booking history; timetable imports retain their creator, row-resolution, and publisher metadata.
- Each role has a usable dashboard and receives actionable in-app notifications.
- Booking history is searchable and downloadable according to role and building scope.
- Core workflows are functionally verified end to end.

Production deployment additionally requires the critical automated coverage defined by QUALITY-04, even if broader test hardening continues in Phase 2.
