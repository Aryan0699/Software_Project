import { Router } from "express"
import {
    activateInitialGridVersion,
    createGridVersion,
    createSlot,
    createSlotSystem,
    deleteSlot,
    discardGridVersion,
    getGridVersion,
    listSlotSystems,
    updateSlot,
    updateSlotSystem,
} from "../controllers/slotSystems.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    createGridVersionSchema,
    createSlotSystemSchema,
    listSlotSystemsQuerySchema,
    recordIdParamsSchema,
    slotInputSchema,
    systemAndGridParamsSchema,
    systemGridAndSlotParamsSchema,
    updateSlotSystemSchema,
} from "../schemas/slotSystems.schema.js"

const slotSystemsRouter = Router()

slotSystemsRouter.use(requireAuth)
slotSystemsRouter.get(
    "/",
    validateQuery(listSlotSystemsQuerySchema),
    listSlotSystems
)
slotSystemsRouter.get(
    "/:systemId/grid-versions/:gridId",
    validateParams(systemAndGridParamsSchema),
    getGridVersion
)

slotSystemsRouter.use(requireRole("ADMIN"), requireTrustedOrigin)
slotSystemsRouter.post(
    "/",
    validateBody(createSlotSystemSchema),
    createSlotSystem
)
slotSystemsRouter.patch(
    "/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateSlotSystemSchema),
    updateSlotSystem
)
slotSystemsRouter.post(
    "/:id/grid-versions",
    validateParams(recordIdParamsSchema),
    validateBody(createGridVersionSchema),
    createGridVersion
)
slotSystemsRouter.post(
    "/:systemId/grid-versions/:gridId/activate",
    validateParams(systemAndGridParamsSchema),
    activateInitialGridVersion
)
slotSystemsRouter.post(
    "/:systemId/grid-versions/:gridId/discard",
    validateParams(systemAndGridParamsSchema),
    discardGridVersion
)
slotSystemsRouter.post(
    "/:systemId/grid-versions/:gridId/slots",
    validateParams(systemAndGridParamsSchema),
    validateBody(slotInputSchema),
    createSlot
)
slotSystemsRouter.put(
    "/:systemId/grid-versions/:gridId/slots/:slotId",
    validateParams(systemGridAndSlotParamsSchema),
    validateBody(slotInputSchema),
    updateSlot
)
slotSystemsRouter.delete(
    "/:systemId/grid-versions/:gridId/slots/:slotId",
    validateParams(systemGridAndSlotParamsSchema),
    deleteSlot
)

export default slotSystemsRouter
