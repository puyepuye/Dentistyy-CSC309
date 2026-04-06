'use strict';

const express = require('express');
const { sendError } = require('../utils/errors');
const { requireRole } = require('../middleware/auth');
const { validateNoExtraKeys } = require('../utils/validation');
const runtimeSystem = require('../config/runtimeSystem');

const router = express.Router();

// GET /system (admin) — current in-memory configuration
router.get('/', requireRole('admin'), async (req, res, next) => {
    try {
        return res.status(200).json({
            reset_cooldown: runtimeSystem.getResetCooldownSeconds(),
            negotiation_window: runtimeSystem.getNegotiationWindowSeconds(),
            job_start_window: runtimeSystem.getJobStartWindowHours(),
            availability_timeout: runtimeSystem.getAvailabilityTimeoutSeconds(),
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /system/reset-cooldown
router.patch('/reset-cooldown', requireRole('admin'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['reset_cooldown']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { reset_cooldown } = body;

        if (typeof reset_cooldown !== 'number' || Number.isNaN(reset_cooldown) || reset_cooldown < 0) {
            return sendError(res, 400, 'Invalid payload');
        }

        runtimeSystem.setResetCooldownSeconds(reset_cooldown);

        return res.status(200).json({
            reset_cooldown: runtimeSystem.getResetCooldownSeconds(),
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /system/negotiation-window
router.patch('/negotiation-window', requireRole('admin'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['negotiation_window']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { negotiation_window } = body;

        if (
            typeof negotiation_window !== 'number' ||
            Number.isNaN(negotiation_window) ||
            negotiation_window <= 0
        ) {
            return sendError(res, 400, 'Invalid payload');
        }

        runtimeSystem.setNegotiationWindowSeconds(negotiation_window);

        return res.status(200).json({
            negotiation_window: runtimeSystem.getNegotiationWindowSeconds(),
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /system/job-start-window
router.patch('/job-start-window', requireRole('admin'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['job_start_window']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { job_start_window } = body;

        if (
            typeof job_start_window !== 'number' ||
            Number.isNaN(job_start_window) ||
            job_start_window <= 0
        ) {
            return sendError(res, 400, 'Invalid payload');
        }

        runtimeSystem.setJobStartWindowHours(job_start_window);

        return res.status(200).json({
            job_start_window: runtimeSystem.getJobStartWindowHours(),
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /system/availability-timeout (admin)
router.patch('/availability-timeout', requireRole('admin'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['availability_timeout']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { availability_timeout } = body;

        if (
            typeof availability_timeout !== 'number' ||
            Number.isNaN(availability_timeout) ||
            availability_timeout <= 0
        ) {
            return sendError(res, 400, 'Invalid payload');
        }

        runtimeSystem.setAvailabilityTimeoutSeconds(availability_timeout);

        return res.status(200).json({
            availability_timeout: runtimeSystem.getAvailabilityTimeoutSeconds(),
        });
    } catch (e) {
        next(e);
    }
});

// TODO: add handlers
module.exports = router;
