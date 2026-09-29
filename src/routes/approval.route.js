import { Router } from "express"
import {
    decideApproval,
    getFinalizationPreview,
    listMyApprovals,
} from "../controllers/booking.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    approvalDecisionSchema,
    approvalParamsSchema,
    listApprovalsQuerySchema,
} from "../schemas/booking.schema.js"

const approvalRouter = Router()

approvalRouter.use(requireAuth, requireRole("FACULTY"), requireTrustedOrigin)
approvalRouter.get(
    "/me",
    validateQuery(listApprovalsQuerySchema),
    listMyApprovals
)
approvalRouter.get(
    "/:approvalId/finalization-preview",
    validateParams(approvalParamsSchema),
    getFinalizationPreview
)
approvalRouter.post(
    "/:approvalId/decision",
    validateParams(approvalParamsSchema),
    validateBody(approvalDecisionSchema),
    decideApproval
)

export default approvalRouter
