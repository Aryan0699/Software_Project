export function pagination(page, pageSize, total) {
    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    }
}

export function pageOffset(page, pageSize) {
    return (page - 1) * pageSize
}
