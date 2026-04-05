'use strict';

/**
 * In-memory system knobs (also updated by PATCH /system/* routes).
 * Job creation and updates must use these so tests that change windows stay consistent.
 */
let negotiationWindowSeconds = 900;
let jobStartWindowHours = 24 * 7;
let resetCooldownSeconds = 60;
let availabilityTimeoutSeconds = 300;

function getNegotiationWindowSeconds() {
    return negotiationWindowSeconds;
}

function setNegotiationWindowSeconds(seconds) {
    negotiationWindowSeconds = seconds;
}

function getJobStartWindowHours() {
    return jobStartWindowHours;
}

function setJobStartWindowHours(hours) {
    jobStartWindowHours = hours;
}

function getResetCooldownSeconds() {
    return resetCooldownSeconds;
}

function setResetCooldownSeconds(seconds) {
    resetCooldownSeconds = seconds;
}

/** POST /auth/resets rate limit by client IP (uses reset_cooldown from PATCH /system/reset-cooldown). */
const lastResetByIp = new Map();

function isResetAllowed(ip) {
    const cooldown = resetCooldownSeconds;
    if (cooldown <= 0) {
        return true;
    }
    const last = lastResetByIp.get(ip);
    if (last == null) {
        return true;
    }
    const elapsed = (Date.now() - last) / 1000;
    return elapsed >= cooldown;
}

function recordResetRequest(ip) {
    if (resetCooldownSeconds <= 0) {
        return;
    }
    lastResetByIp.set(ip, Date.now());
}

function getAvailabilityTimeoutSeconds() {
    return availabilityTimeoutSeconds;
}

function setAvailabilityTimeoutSeconds(seconds) {
    availabilityTimeoutSeconds = seconds;
}

module.exports = {
    getNegotiationWindowSeconds,
    setNegotiationWindowSeconds,
    getJobStartWindowHours,
    setJobStartWindowHours,
    getResetCooldownSeconds,
    setResetCooldownSeconds,
    isResetAllowed,
    recordResetRequest,
    getAvailabilityTimeoutSeconds,
    setAvailabilityTimeoutSeconds,
};
