class ApiError extends Error {
    constructor(
        statusCode,
        message,
        { code = "REQUEST_FAILED", details = null, cause } = {}
    ) {
        super(message, cause ? { cause } : undefined)
        this.name = "ApiError"
        this.statusCode = statusCode
        this.code = code
        this.details = details
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export default ApiError
