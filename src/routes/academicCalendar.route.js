import { Router } from "express"
import {
    closeTerm,
    createException,
    createTerm,
    deactivateException,
    listExceptions,
    listTerms,
    previewExceptionImpact,
    setCurrentTerm,
    updateException,
    updateTerm,
} from "../controllers/academicCalendar.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    createExceptionSchema,
    createTermSchema,
    listExceptionsQuerySchema,
    listTermsQuerySchema,
    previewExceptionImpactSchema,
    recordIdParamsSchema,
    updateExceptionSchema,
    updateTermSchema,
} from "../schemas/academicCalendar.schema.js"

const academicCalendarRouter = Router()

academicCalendarRouter.use(requireAuth, requireTrustedOrigin)

academicCalendarRouter.get(
    "/terms",
    validateQuery(listTermsQuerySchema),
    listTerms
)
academicCalendarRouter.get(
    "/exceptions",
    validateQuery(listExceptionsQuerySchema),
    listExceptions
)

academicCalendarRouter.use(requireRole("ADMIN"))

academicCalendarRouter.post(
    "/terms",
    validateBody(createTermSchema),
    createTerm
)
academicCalendarRouter.patch(
    "/terms/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateTermSchema),
    updateTerm
)
academicCalendarRouter.post(
    "/terms/:id/set-current",
    validateParams(recordIdParamsSchema),
    setCurrentTerm
)
academicCalendarRouter.post(
    "/terms/:id/close",
    validateParams(recordIdParamsSchema),
    closeTerm
)

academicCalendarRouter.post(
    "/exceptions/impact",
    validateBody(previewExceptionImpactSchema),
    previewExceptionImpact
)
academicCalendarRouter.post(
    "/exceptions",
    validateBody(createExceptionSchema),
    createException
)
academicCalendarRouter.patch(
    "/exceptions/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateExceptionSchema),
    updateException
)
academicCalendarRouter.patch(
    "/exceptions/:id/deactivate",
    validateParams(recordIdParamsSchema),
    deactivateException
)

export default academicCalendarRouter
