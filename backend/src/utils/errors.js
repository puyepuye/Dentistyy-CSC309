'use strict';

/**
 * Send a JSON error response. Spec format: { "error": "message" } with optional extra fields.
 * @param {object} res - Express response
 * @param {number} statusCode - HTTP status (e.g. 400, 401, 403, 404, 409)
 * @param {string} message - Error message (sent as "error" in JSON)
 * @param {object} [extra] - Optional extra properties to merge into the response body
 * @returns {object} res for optional chaining (e.g. return sendError(...))
 */
function sendError(res, statusCode, message, extra = {}) {
    const body = { error: message, ...extra };
    return res.status(statusCode).json(body);
}

module.exports = { sendError };
