# **Software Requirements Specification (SRS)**

## **Unified Room Allocation and Lecture Hall Complex Management System**

**Version:** 2.4  
**Prepared by:** Team - Aryan, Anshika, Suparn, Rewant  
**Organization:** Indian Institute of Technology Jodhpur

**Master Spreadsheet:** [Sheet Link](https://docs.google.com/spreadsheets/d/1pls1qMf2QVG5v0QIctMZH86ueKxn_WTK8KFc5aQJyDQ/edit?gid=41013316#gid=41013316)  
**Source Code Repository:** [Github Link](https://github.com/dkstlzk/Software-engineering-project)**Date:** 28 Jan 2026

## **Revision History**

| **Revision**     | **Date**    | **Reason for Change**                                                                                                                                                                                                                                                     | **Proposed By**        | **Worked On By** | **Version** |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------- | ----------- |
| Eight Revision   | 14 Feb      | Modified the following UML diagrams: Class, activity, use case. Created the following new diagrams: timing, component, organized the documents in a new master spreadsheet that contains links to UMLs, SRS, progress tracker, sprint plans, implementation details, etc. | Team                   | Team             | 2.4         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Seventh Revision | 4 Feb       | Updated UML class diagrams to include more detailed description of attributes; UML use case diagram to have more emphasis on user/actor interaction; added more details in other diagrams                                                                                 | Team                   | Team             | 2.3         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Sixth Revision   | 4 Feb       | Revised booking conflict handling to replace peer negotiation with admin-driven resolution and system notifications; added section 4.3.6 containing REQ-4.3.14                                                                                                            | Team                   | Team             | 2.2         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Fifth revision   | 4 Feb 2026  | Updated the RTM to reflect changes made in fourth revision                                                                                                                                                                                                                | Team                   | Team             | 2.1         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Fourth Revision  | 30 Jan 2026 | Revised user access model to allow student-initiated room booking requests with mandatory faculty verification prior to LHC staff approval. (In 4.1.2 and REQ-4.1.5)                                                                                                      | Team                   | Team             | 2.0         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Third Revision   | 28 Jan 2026 | Added requirement priorities, formal NFR template, explicit traceability matrix                                                                                                                                                                                           | Team/Reviewer Feedback | Team             | 1.3         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Second Revision  | 21 Jan 2026 | Added functional requirements regarding slot and class venue change (Section 4.3)                                                                                                                                                                                         | Team                   | Team             | 1.2         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| First Revision   | 20 Jan 2026 | Added functional requirements (REQ‑4.1.4 to REQ‑4.1.9)                                                                                                                                                                                                                    | Team                   | Team             | 1.1         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |
| Initial Version  | 19 Jan 2026 | Initial SRS document                                                                                                                                                                                                                                                      | Team                   | Team             | 1.0         |
| ---              | ---         | ---                                                                                                                                                                                                                                                                       | ---                    | ---              | ---         |

## **1\. Introduction**

### **1.1 Purpose**

This Software Requirements Specification (SRS) document defines the functional and non‑functional requirements for the Unified Room Allocation and Lecture Hall Complex (LHC) Management System. The system aims to automate room booking, timetable‑based classroom allocation, slot management, and examination seating arrangements in a college environment. This document serves as a reference for developers, testers, project managers, and stakeholders.

### **1.2 Document Conventions**

- Functional requirements are labeled as REQ‑x.y.z (Priority).
- Non-functional requirements are labeled as NFR‑x.y.z (Priority).
- "Shall" indicates a mandatory requirement.
- "Should" indicates a desirable but non‑mandatory feature.
- Priority levels: High / Mid / Low.
- TBD denotes requirements to be finalized later.

### **1.3 Intended Audience and Reading Suggestions**

Developers, testers, administrators, faculty representatives, and student representatives. Readers new to the project should begin with Sections 1 and 2, followed by Sections 4 and 5.

### **1.4 Product Scope**

The product is a web‑based portal providing a unified gateway for managing lecture halls, department rooms, events, and examination schedules. It eliminates manual spreadsheet‑based booking, prevents clashes, improves transparency, and enables intelligent scheduling and recommendations.

### **1.5 References**

- IEEE Software Requirements Specification Template (Karl E. Wiegers)
- Project Description Document (SE Documentation)

### **1.6 Alpha Managers**

| **Name**         | **Alpha Managers**                                     |
| ---------------- | ------------------------------------------------------ |
| Aryan Ashok Jain | Requirements<br><br>Software System                    |
| ---              | ---                                                    |
| Suparn Agrawal   | Requirements<br><br>Work<br><br>Opportunity            |
| ---              | ---                                                    |
| Rewant Rai       | Requirements<br><br>StakeHolders<br><br>Way of Working |
| ---              | ---                                                    |
| Anshika Jha      | Requirements<br><br>Team                               |
| ---              | ---                                                    |

## **2\. Overall Description**

### **2.1 Product Perspective**

The system is a new, centralized web application replacing the current manual email-and-spreadsheet-based LHC booking process. It integrates timetable data, room inventories, user roles, and scheduling algorithms into a single platform. It may later integrate with existing academic databases (student/course information).

### **2.2 Product Functions**

At a high level, the system will:

- Maintain real-time room availability status.
- Pre-book classrooms based on released slot-based timetables.
- Allow users to request; and LHC staff to approve, or reject room bookings.
- Handle slot changes and room change requests.
- Generate examination timetables and seating plans.
- Provide dashboards tailored to different user roles.
- Send notifications and reminders.

### **2.3 User Classes and Characteristics**

**Admin  
**Uploads finalized timetables, academic calendars, institute holidays, examination schedules, and global system constraints.

**LHC Staff**

- High system privileges.
- Manages rooms, departments, and allocation policies.
- Responsible for final approval or rejection of all room booking requests.

**Faculty**

- Moderate technical proficiency.
- Can initiate room booking requests for course-related and miscellaneous activities.
- Acts as a verifier for student-initiated room booking requests.
- Can approve or reject student booking requests before forwarding them to LHC staff.

**Students (General Access)**

- All enrolled students are permitted to initiate room booking requests.
- Must specify the purpose of booking (event type, student body/society, or reason).
- Must select a faculty member (preferably the faculty advisor of the concerned activity) for verification.
- Student booking requests are forwarded to the selected faculty for verification before being sent to LHC staff.

**Rationale:  
**This model ensures inclusive access while enforcing accountability and legitimacy through faculty verification.

### **2.4 Operating Environment**

- Web-based application.
- Runs on modern browsers (Chrome, Firefox, Edge).
- Server-side: Linux/Windows server.
- Database: Relational DBMS (e.g., MySQL/PostgreSQL).

### **2.5 Design and Implementation Constraints**

- Must support multiple slot systems (e.g., First Year vs Senior Years).
- Must avoid scheduling clashes for students enrolled in multiple courses.
- Role-based access control is mandatory.
- Algorithms must consider room capacity and constraints.

### **2.6 User Documentation**

- Online user manual.
- Admin guide.
- Context-sensitive help within the portal.

### **2.7 Assumptions and Dependencies**

- Timetables are released digitally in a structured format.
- Student-course enrollment data is accurate.
- Users have reliable internet access.

## **3\. External Interface Requirements**

### **3.1 User Interfaces**

- Web-based GUI with dashboards per user role.
- Visual room and seat maps (highlighted seating during exams).
- Forms for booking requests with optional messages (e.g., mic/projector).

### **3.2 Hardware Interfaces**

- No direct hardware interfaces required.

### **3.3 Software Interfaces**

- Database system for persistent storage.
- Optional integration with academic ERP systems.

### **3.4 Communications Interfaces**

- Uses HTTP/HTTPS.
- Email and in-app notifications.

## **4\. System Features**

### **4.1 Room Booking and Allocation**

#### **4.1.1 Description and Priority**

Allows authorized users to view availability and request rooms. **Priority: High**.

#### **4.1.2 Stimulus/Response Sequences**

- User (Faculty or Student) selects date, slot, and room.
- User specifies booking purpose and required event parameters.
- **If the requester is a Student:**
  - System requires selection of a faculty verifier.
  - Request is forwarded to the selected faculty for verification.
  - Faculty approves or rejects the request.
  - Approved requests are forwarded to LHC staff.
- **If the requester is a Faculty member:**
  - Request is directly forwarded to LHC staff.
- The system validates availability and constraints.
- LHC staff reviews and approves or rejects the request.
- **Conflict handling:** If multiple booking requests conflict for the same room and slot, the system escalates the conflict to the Admin for resolution and notifies all affected users of the final decision.

#### **4.1.3 Functional Requirements**

- **REQ-4.1.1 (High):** System _shall_ display real-time room availability.
- **REQ-4.1.2 (High):** System _shall_ prevent double booking.
- **REQ-4.1.3 (High):** System _shall_ notify staff of new requests.
- **REQ-4.1.4 (High):** System _shall_ provide an option for authorized staff to upload the complete semester timetable at once in the form of an Excel sheet at the start of the semester, parse the uploaded data, and automatically reflect all class-slot-room allocations in the system database.
- **REQ-4.1.5 (High):** System shall allow faculty and students to initiate room booking requests for specific events or purposes.
- **REQ-4.1.6 (Mid):** The system _should_ have options for various kinds of event types for room booking (e.g., quiz, speaker session, seminar, meeting).
- **REQ-4.1.7 (Mid):** System shall require users to provide event-specific parameters based on the selected event type, such as number of participants, seating constraints, invited guest details, and special requirements.
- **REQ-4.1.8 (High):** System shall validate a booking request against potential clashes, including but not limited to:
  - room unavailability &lt;High&gt;,
  - insufficient room capacity &lt;High&gt;,
  - conflicting bookings &lt;High&gt;, and
  - invited guests' existing commitments &lt;Mid&gt;.
- **REQ-4.1.9 (High):** If any clash is detected, the system shall prevent the request from being raised and
  - _should_ suggest alternative rooms, slots, or configurations that satisfy the given constraints &lt;Mid&gt;.
- **REQ-4.1.10 (Low):** In case of conflicting booking requests for the same room and slot, the system shall forward reconsideration requests to the Admin, who shall decide which request is approved. Both users shall be notified of the decision.

### **4.2 Timetable-Based Preallocation**

#### **Description and Priority**

Automatically allocates classrooms based on slot timetables.

- **REQ-4.2.1 (High):** System shall ingest timetable data.
- **REQ-4.2.2 (Mid):** System shall map courses to rooms based on capacity.

### **4.3 Slot and Class Venue Exchange Facilitation and Some other Extensional Features (Optional Extension - Phase 2)**

#### **4.3.1 Description and Priority**

This feature enables faculty to request changes to the allocated time slot of a course and facilitates intelligent evaluation of feasibility. The system validates constraints related to students, room availability, and room capacity before allowing a slot change request to proceed.

#### **4.3.2 Stimulus/Response Sequences (Slot Change)**

- Course instructor selects an existing course offering.
- Instructor requests to move the course from Slot A to Slot B.
- System evaluates feasibility by checking:
  - Availability of Slot B.
  - Availability of an appropriate classroom during Slot B.
  - Potential clashes for students enrolled in the course (other classes or commitments).
- If no limiting constraints exist:
  - System allows the instructor to proceed with the slot change request.
  - LHC staff are notified for review and final approval.
- If constraints exist:
  - System blocks the slot change request.
  - System displays the reasons for rejection.
  - System should recommend alternative feasible slots and/or rooms.

#### **4.3.3 Functional Requirements (Slot Change)**

- **REQ-4.3.1 (Mid):** System shall allow a course instructor to request a change of the course time slot from an existing slot to a desired target slot.
- **REQ-4.3.2 (Mid):** System shall validate the requested target slot against student enrollment data to detect any student-level schedule conflicts.
- **REQ-4.3.3 (Mid):** System shall validate the availability of at least one classroom of appropriate capacity during the requested target slot.
- **REQ-4.3.4 (Mid):** If no limiting constraints are detected, the system shall allow the slot change request to be raised and shall notify the LHC staff for approval.
- **REQ-4.3.5 (Mid):** If one or more limiting constraints are detected, the system shall prevent the slot change request from being raised.
- **REQ-4.3.6 (Mid):** When a slot change request is blocked, the system shall present clear reasons for the infeasibility.
- **REQ-4.3.7 (Low):** In case of infeasibility, the system shall recommend alternative slots that satisfy student availability and classroom capacity constraints.

#### **4.3.4 Class Venue Change Facilitation**

**Description and Priority  
**This feature allows a course instructor to request a change in the physical classroom (venue) for an already scheduled course. The system evaluates room availability across different slots and assists in identifying feasible alternatives.

**Stimulus/Response Sequences (Venue Change)**

- Course instructor selects an existing course and its currently allocated classroom (e.g., Room 101).
- Instructor requests to conduct the course in a different classroom (e.g., Room 201).
- System checks the availability of the requested room across relevant slots.
- System identifies and displays slots in which the requested room is free.
- Instructor selects a suitable slot from the suggested options.
- System raises a venue change request and notifies the LHC staff for approval.

**Functional Requirements (Venue Change)**

- **REQ-4.3.8 (Mid):** System shall allow a course instructor to request a change of classroom for an already allocated course.
- **REQ-4.3.9 (Mid):** System shall evaluate the availability of the requested classroom across different slots.
- **REQ-4.3.10 (Mid):** System shall suggest feasible slots in which the requested classroom is available.
- **REQ-4.3.11 (Mid):** Upon instructor confirmation, the system shall raise a venue change request and notify the LHC staff for approval.

#### **4.3.5 Metadata-Based Venue Recommendation**

In Phase II, the system may maintain detailed room metadata such as availability of projectors, seating type, accessibility features, and room category.

- **REQ-4.3.12 (Optional/Mid):** System should allow instructors to specify required room features instead of a specific room.
- **REQ-4.3.13 (Optional/Mid):** Based on the specified features, the system should recommend suitable rooms along with feasible slots.

#### **4.3.6 Dependency on Student-Enrollment Data**

Student enrollment data for clash detection is expected to be provided by the Admin; however, the system shall remain operational in its absence.

- **REQ-4.3.14 (Mid):** System shall perform student-level clash validation for slot and venue change requests only if student enrollment data is available. In the absence of such data, the system shall bypass student availability checks, continue evaluating other applicable constraints (such as room availability and capacity), and clearly inform the user that student-level validation was not performed. This is in accordance with NFR5.4.1

### **4.4 Examination Scheduling and Seating**

- **REQ-4.4.1 (Low):** System shall generate exam timetables based on constraints.
- **REQ-4.4.2 (Low):** System shall assign seats to students without clashes.
- **REQ-4.4.3 (Low):** System shall visually display seating arrangements.

### **4.5 Notifications and Messaging**

- **REQ-4.5.1 (Mid):  
   **System shall send reminders and status updates for booking requests.
- **REQ-4.5.2 (Mid):  
   **System shall notify faculty members of pending student booking verification requests.
- **REQ-4.5.3 (Mid):  
   **System shall notify students when their booking requests are approved, rejected, or forwarded to LHC staff.

## **5\. Non‑Functional Requirements**

### **5.0 Non‑Functional Requirement Template**

Each non‑functional requirement is specified using the following structure:

- **Description** - What quality aspect is being addressed.
- **Measurable Criterion** - Quantitative or verifiable condition.
- **Method of Verification** - How the requirement will be tested or validated.
- **Priority** - High / Mid / Low.
- **Affected Modules** - Primary system components involved.

### **5.1 Performance Requirements**

**NFR‑5.1.1 (High)**

- Description: System responsiveness for room availability queries.
- Measurable Criterion: 95% of room availability queries shall respond within 2 seconds.
- Method of Verification: Load and performance testing.
- Affected Modules: Booking module, Database, Availability service.

### **5.2 Safety Requirements**

**NFR‑5.2.1 (High)**

- Description: Protection against accidental data loss.
- Measurable Criterion: Critical administrative data shall not be permanently deleted without multi‑step confirmation and backup logging.
- Method of Verification: Fault‑injection testing, audit review.
- Affected Modules: Admin console, Database layer.

### **5.3 Security Requirements**

**NFR‑5.3.1 (High)**

- Description: Role‑based system security.
- Measurable Criterion: All protected operations must require authenticated and authorized access based on role definitions.
- Method of Verification: Penetration testing, access‑control testing.
- Affected Modules: Authentication service, Authorization middleware.

**NFR‑5.3.2 (High)**

- Description: Secure handling of academic and personal data.
- Measurable Criterion: All sensitive data must be encrypted in transit and at rest.
- Method of Verification: Security audit, encryption validation.
- Affected Modules: Database, Communication layer.

### **5.4 Software Quality Attributes - Robustness**

**NFR‑5.4.1 (Mid)**

- Description: Graceful handling of missing administrative data.
- Measurable Criterion: System continues operation with partial validation where data is unavailable.
- Method of Verification: Negative testing.
- Affected Modules: Validation engine, Booking workflow.

**NFR‑5.4.2 (Mid)**

- Description: Selective bypass of unavailable validations.
- Measurable Criterion: Missing datasets do not cause full process failure.
- Method of Verification: Integration testing.
- Affected Modules: Slot change, Clash detection.

**NFR‑5.4.3 (Mid)**

- Description: User awareness of skipped validations.
- Measurable Criterion: System displays clear notices when checks are bypassed.
- Method of Verification: UI and functional testing.
- Affected Modules: UI layer, Notification service.

**NFR‑5.4.4 (High)**

- Description: Operational stability.
- Measurable Criterion: No crashes or inconsistent system states due to missing data.
- Method of Verification: Stress testing, fault injection.
- Affected Modules: Core services, Database layer.

## **6\. Other Requirements**

- Configurable holidays.
- Support for adding/removing departments and rooms.

## **Appendix A: Glossary**

- **LHC:** Lecture Hall Complex.
- **Slot:** Predefined time block.
- **Staff**: Personnel for handling management of particular building
- **Admin:** Stands for relevant administrative institute authority
- **POR:** Position of Responsibility

## **Appendix B: Analysis Models**

- Use case diagrams
- Activity diagrams
- Class diagrams
- Sequence diagrams

## **Appendix C: To Be Determined List**

- A Final exam scheduling algorithm.
- ERP integration details.

## **Appendix D: Requirements Traceability Matrix (RTM)**

| **Requirement ID** | **Source / System Goal**            | **Related Use Case**  | **Planned Module**     | **Related UML Artifact**                                                                                                                                                                                  | **Verification Artifact** |
| ------------------ | ----------------------------------- | --------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| REQ‑4.1.1          | Real‑time availability              | UC‑RoomBooking        | Availability Service   | Usecase: View Room Availability<br><br>Activity: Availability check decision<br><br>Sequence: BookingService -> RoomService<br><br>Class: Room, Slot, Booking                                             | TC‑B01                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ-4.1.5          | Inclusive booking with verification | UC-StudentRoomBooking | Booking workflow       | Use Case: Request Booking, Verify Student Request<br><br>Activity: Student -> Faculty -> Staff flow<br><br>Timing: Pending_Faculty -> Pending_Staff<br><br>Class: BookingRequest, Student, Faculty, Staff | TC-SB01                   |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ‑4.1.8          | Clash prevention                    | UC‑RoomBooking        | Clash Detection Engine | Use Case: Validate Slot, Check Availability<br><br>Activity: Validation & alternative loop<br><br>Sequence: Pre-creation validation flow<br><br>Class: Slot, Room, Enrollment, BookingRequest             | TC‑B05                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ‑4.2.1          | Automated allocation                | UC‑Preallocation      | Timetable Ingestor     | Use Case: Upload Semester Timetable<br><br>Sequence: Timetable ingestion<br><br>Class: TimetableEntry, Course, Room                                                                                       | TC‑T02                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ‑4.3.2          | Slot change safety                  | UC‑SlotChange         | Slot Manager           | Use Case: Request Slot Change<br><br>Activity: Slot validation branch<br><br>Sequence: Slot validation logic<br><br>Class: SlotChangeRequest, Slot, Enrollment                                            | TC‑S03                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ‑4.3.8          | Venue change                        | UC‑VenueChange        | Room Manager           | Use Case: Request Venue Change<br><br>Activity: Venue validation flow<br><br>Class: VenueChangeRequest, Room, Booking                                                                                     | TC‑V01                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ‑4.5.1          | Communication                       | UC‑Notifications      | Notification Service   | Use Case: Send Notification<br><br>Activity: Approval/Rejection notification<br><br>Sequence: NotificationService interaction<br><br>Class: Notification, User                                            | TC‑N01                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| NFR‑5.1.1          | Performance                         | All major flows       | API Gateway            | Sequence: Layered service interaction<br><br>Composite: BookingService, RoomService<br><br>Deployment: App Server, DB Server                                                                              | Load‑Test‑01              |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| NFR‑5.3.1          | Security                            | All secured cases     | Auth Service           | Use Case: Role-based access<br><br>Class: User inheritance (Admin, Staff, Faculty, Student)<br><br>Deployment: HTTPS+Auth layer                                                                           | Sec‑Audit‑01              |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ-4.3.14         | Conditional validation              | UC-SlotChange         | Validation Engine      | Activity: Conditional validation branch<br><br>Sequence: Optional enrollment check<br><br>Class: Enrollment                                                                                               | TC-S04                    |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |
| REQ-4.1.10         | Conflict resolution                 | UC-ConflictResolution | Admin Conflict Manager | Use Case: ConflictResolution<br><br>Activity: Escalation branch<br><br>Class: BookingRequest, Admin                                                                                                       | TC-CR01                   |
| ---                | ---                                 | ---                   | ---                    | ---                                                                                                                                                                                                       | ---                       |

## **Appendix E: Use Case Specifications**

This appendix formally defines the use cases referenced throughout the SRS and the Requirements Traceability Matrix (RTM). Each use case represents a high-level user-system interaction that realizes one or more functional requirements.

### **UC-RoomBooking**

**Primary Actors:** Faculty, Students

**Supporting Actors:** Faculty (as verifier for student requests), LHC Staff, Admin

**Goal:  
**To request and allocate a room for a specified time slot and purpose.

**Preconditions:**

- User is authenticated and authorized.
- Room inventory and slot information are available.

**Main Flow:**

- User selects date, slot, room, and booking purpose.
- User provides required event-specific parameters.
- If the requester is a student, the system forwards the request to the selected faculty verifier.
- Faculty verifies and approves the request.
- System forwards the request to LHC staff.
- LHC staff reviews and approves or rejects the request.
- System updates room allocation and notifies relevant users.

**Alternate Flows:**

- If clashes are detected, the request is blocked or escalated for reconsideration.
- If student enrollment data is unavailable, student-level clash checks are bypassed with user notification.

**Postconditions:**

- Room is allocated, rejected, or escalated for administrative resolution.

### **UC-Preallocation**

**Primary Actor:** Admin

**Supporting Actors:** System

**Goal:  
**To automatically allocate classrooms based on released slot-based timetables.

**Preconditions:**

- Admin has uploaded a valid timetable file.
- Room inventory data is available.

**Main Flow:**

- Admin uploads timetable data.
- System parses timetable information.
- System maps courses to rooms based on capacity and constraints.
- Allocations are stored and made visible to users.

**Postconditions:**

- Class-slot-room mappings are established in the system.

### **UC-SlotChange**

**Primary Actor:**Faculty

**Supporting Actors:**LHC Staff, System

**Goal:  
**To request a change in the scheduled time slot of a course.

**Preconditions:**

- Course is already scheduled.
- Faculty is authorized for the course.

**Main Flow:**

- Faculty selects an existing course offering.
- Faculty requests a change from the current slot to a target slot.
- System evaluates feasibility (room availability, capacity, student clashes).
- If feasible, request is forwarded to LHC staff for approval.
- LHC staff approves or rejects the request.

**Alternate Flows:**

- If student enrollment data is unavailable, student-level clash checks are bypassed with notification.
- If constraints fail, the system provides reasons and possible alternatives.

**Postconditions:**

- Course slot is updated or remains unchanged.

### **UC-VenueChange**

**Primary Actor:**Faculty

**Supporting Actors:**LHC Staff, System

**Goal:  
**To change the physical classroom assigned to a scheduled course.

**Preconditions:**

- Course is already scheduled in a room.

**Main Flow:**

- Faculty selects a course and its current venue.
- Faculty requests a different room.
- System checks room availability across slots.
- System suggests feasible slots or confirms availability.
- Faculty confirms the selection.
- Request is forwarded to LHC staff for approval.

**Postconditions:**

- Course venue is updated or request is rejected.

### **UC-Notifications**

**Primary Actor:**System

**Supporting Actors:**Faculty, Students, LHC Staff, Admin

**Goal:  
**To notify users of booking requests, approvals, rejections, and required actions.

**Preconditions:**

- A relevant system event has occurred.

**Main Flow:**

- System detects a state change (request submission, approval, rejection, escalation).
- System sends notifications to affected users via configured channels.

**Postconditions:**

- Users are informed of the current status of relevant requests.

### **UC-ConflictResolution _(Implicit / Administrative)_**

**Primary Actor:**Admin

**Supporting Actors:**System

**Goal:**To resolve conflicting booking requests for the same room and slot.

**Preconditions:**

- Multiple booking requests conflict.

**Main Flow:**

- System escalates the conflict to the Admin.
- Admin selects one request for approval.
- System rejects the other request(s).
- All affected users are notified of the decision.

**Postconditions:**

- Conflict is resolved and allocation finalized.

**End Of Document**