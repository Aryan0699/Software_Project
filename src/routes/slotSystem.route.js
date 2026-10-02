import { Router } from "express"
import {
    createDraft,
    createSlot,
    createSlotSystem,
    deleteSlot,
    discardGrid,
    getGrid,
    listSlotSystems,
    lockGrid,
    toggleGridCell,
    updateGridRange,
    updateSlot,
    updateSlotSystem,
} from "../controllers/slotSystem.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
} from "../middlewares/validate.middleware.js"
import {
    createDraftSchema,
    createSlotSchema,
    createSlotSystemSchema,
    idParamsSchema,
    slotParamsSchema,
    toggleCellSchema,
    updateGridRangeSchema,
    updateSlotSchema,
    updateSlotSystemSchema,
} from "../schemas/slotSystem.schema.js"

const slotSystemRouter = Router()

slotSystemRouter.use(requireAuth, requireTrustedOrigin, requireRole("ADMIN"))

slotSystemRouter.get("/", listSlotSystems)
slotSystemRouter.post(
    "/",
    validateBody(createSlotSystemSchema),
    createSlotSystem
)
slotSystemRouter.patch(
    "/:id",
    validateParams(idParamsSchema),
    validateBody(updateSlotSystemSchema),
    updateSlotSystem
)
slotSystemRouter.post(
    "/:id/drafts",
    validateParams(idParamsSchema),
    validateBody(createDraftSchema),
    createDraft
)

slotSystemRouter.get(
    "/grid-versions/:id",
    validateParams(idParamsSchema),
    getGrid
)
slotSystemRouter.patch(
    "/grid-versions/:id/range",
    validateParams(idParamsSchema),
    validateBody(updateGridRangeSchema),
    updateGridRange
)
slotSystemRouter.post(
    "/grid-versions/:id/slots",
    validateParams(idParamsSchema),
    validateBody(createSlotSchema),
    createSlot
)
slotSystemRouter.patch(
    "/grid-versions/:id/slots/:slotId",
    validateParams(slotParamsSchema),
    validateBody(updateSlotSchema),
    updateSlot
)
slotSystemRouter.delete(
    "/grid-versions/:id/slots/:slotId",
    validateParams(slotParamsSchema),
    deleteSlot
)
slotSystemRouter.post(
    "/grid-versions/:id/cells/toggle",
    validateParams(idParamsSchema),
    validateBody(toggleCellSchema),
    toggleGridCell
)
slotSystemRouter.post(
    "/grid-versions/:id/lock",
    validateParams(idParamsSchema),
    lockGrid
)
slotSystemRouter.post(
    "/grid-versions/:id/discard",
    validateParams(idParamsSchema),
    discardGrid
)

export default slotSystemRouter
