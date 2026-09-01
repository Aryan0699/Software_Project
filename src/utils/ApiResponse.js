class ApiResponse {
    constructor(
        statusCode,
        message = "Success",
        data = null,
        meta = undefined
    ) {
        this.success = statusCode >= 200 && statusCode < 300
        this.message = message
        this.data = data
        if (meta !== undefined) this.meta = meta
    }
}

export default ApiResponse
