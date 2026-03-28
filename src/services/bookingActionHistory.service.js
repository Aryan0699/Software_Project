import prisma from "../db/index.js"
import logger from "../utils/logger.js";


const logAction = async ({ bookingRequestId, actionType, performedByUserId = null, note = null, tx = null }) => {
    logger.info(`Logging action for booking request ID: ${bookingRequestId} with action type: ${actionType} performed by user ID: ${performedByUserId}`);
    const client = tx || prisma;
    const action = await client.bookingActionHistory.create({
        data: {
            bookingRequestId,
            actionType,
            performedByUserId,
            note
        }
    });
    return action;
}

export { logAction };