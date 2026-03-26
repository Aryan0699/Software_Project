import ApiError from "./apiError";
import logger from "./logger";

// Expected date format: "YYYY-MM-DD"
export function parseBookingDate(dateStr) {

    if(!dateStr || typeof dateStr !== "string") {
        logger.error("Invalid date format. Expected a non-empty string in YYYY-MM-DD format.");
        throw new ApiError(400, "Invalid date format. Expected a non-empty string in YYYY-MM-DD format.");
    }

    const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        logger.error("Invalid date format. Expected YYYY-MM-DD.");
        throw new ApiError(400, "Invalid date format. Expected YYYY-MM-DD.");
    }

    const [,year,month,day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed in JS Date

    if(date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        logger.error("Invalid date components. Please check the year, month, and day values."); 
        throw new ApiError(400, "Invalid date components. Please check the year, month, and day values.");
    }

    return date; // 2026-03-25T00:00:00.000Z -- format returned
}

export function getDayOfWeek(date) {
    const day = date.getUTCDay(); // 0 (Sun) to 6 (Sat)

    const map = {
        0: "SUNDAY",
        1: "MONDAY",
        2: "TUESDAY",   
        3: "WEDNESDAY",
        4: "THURSDAY",
        5: "FRIDAY",
        6: "SATURDAY"
        
    }

    return map[day];
}


export function validateMinuteRange(startMinute, endMinute) {
    if (typeof startMinute !== "number" || typeof endMinute !== "number") {
        logger.error("Start minute and end minute must be numbers.");
        throw new ApiError(400, "Start minute and end minute must be numbers.");
    }

    if (startMinute < 0 || startMinute >= 1440) {
        logger.error("Start minute must be between 0 and 1439.");
        throw new ApiError(400, "Start minute must be between 0 and 1439.");
    }
    if(endMinute < 0 || endMinute >= 1440) {
        logger.error("End minute must be between 0 and 1439.");
        throw new ApiError(400, "End minute must be between 0 and 1439.");
    }

    if(startMinute >= endMinute) {
        logger.error("Start minute must be less than end minute.");
        throw new ApiError(400, "Start minute must be less than end minute.");
    }

}

export function rangeOverlap(startA,endA,startB,endB)
{
    return startA < endB && startB < endA;
}


