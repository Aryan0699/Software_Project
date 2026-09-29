export const DEAN_APPROVAL_ROLES = Object.freeze(["DOSA", "ADOSA", "DOAA"])

export const BOOKING_WORKFLOWS = Object.freeze({
    STUDENT: Object.freeze([
        Object.freeze({
            key: "FACULTY_REVIEW",
            label: "Faculty verification",
            reviewers: Object.freeze(["SELECTED_FACULTY"]),
        }),
        Object.freeze({
            key: "INSTITUTIONAL_REVIEW",
            label: "Institutional approval",
            reviewers: DEAN_APPROVAL_ROLES,
        }),
    ]),
    FACULTY: Object.freeze([
        Object.freeze({
            key: "INSTITUTIONAL_REVIEW",
            label: "Institutional approval",
            reviewers: DEAN_APPROVAL_ROLES,
        }),
    ]),
})

export const approvalRoleLabels = Object.freeze({
    FACULTY: "Faculty verifier",
    DOSA: "DOSA",
    ADOSA: "ADOSA",
    DOAA: "DOAA",
})
