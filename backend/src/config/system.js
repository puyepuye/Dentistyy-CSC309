'use strict';

/**
 * Legacy facade: reset cooldown + rate limit live in runtimeSystem (PATCH /system/*).
 */
const runtimeSystem = require('./runtimeSystem');

function getResetCooldown() {
    return runtimeSystem.getResetCooldownSeconds();
}

function setResetCooldown(seconds) {
    runtimeSystem.setResetCooldownSeconds(seconds);
}

function isResetAllowed(ip) {
    return runtimeSystem.isResetAllowed(ip);
}

function recordResetRequest(ip) {
    runtimeSystem.recordResetRequest(ip);
}

module.exports = {
    getResetCooldown,
    setResetCooldown,
    isResetAllowed,
    recordResetRequest,
};
