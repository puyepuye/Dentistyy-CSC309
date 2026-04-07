'use strict';

const runtimeSystem = require('../config/runtimeSystem');

function getNegotiationWindowSeconds() {
    return runtimeSystem.getNegotiationWindowSeconds();
}

function getExpiresAt(negotiation, windowSeconds) {
    return new Date(negotiation.createdAt.getTime() + windowSeconds * 1000);
}

function isNegotiationExpired(negotiation, windowSeconds) {
    return Date.now() >= getExpiresAt(negotiation, windowSeconds).getTime();
}

/** True when the row is PENDING and the negotiation window has not elapsed. */
function isPendingNegotiationActive(negotiation) {
    if (!negotiation || negotiation.status !== 'PENDING') return false;
    return !isNegotiationExpired(negotiation, getNegotiationWindowSeconds());
}

module.exports = {
    getExpiresAt,
    isNegotiationExpired,
    isPendingNegotiationActive,
    getNegotiationWindowSeconds,
};
