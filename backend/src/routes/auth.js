'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { validateEmail, validatePassword, validateNoExtraKeys } = require('../utils/validation');
const {
    isResetAllowed,
    recordResetRequest,
} = require('../config/runtimeSystem');
const { JWT_SECRET } = require('../middleware/auth');

const prisma = new PrismaClient();
const JWT_EXPIRY_DAYS = 7;
const RESET_EXPIRY_DAYS = 7;

const router = express.Router();

function getClientIp(req) {
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

// POST /auth/resets - request password reset token
router.post('/resets', async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['email']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { email } = body;
        if (!validateEmail(email)) return sendError(res, 400, 'Invalid payload');

        const ip = getClientIp(req);
        if (!isResetAllowed(ip)) return sendError(res, 429, 'Too Many Requests');

        const account = await prisma.account.findUnique({ where: { email: email.trim() } });
        if (!account) return sendError(res, 404, 'Not Found');

        const now = new Date();
        const resetExpiresAt = new Date(now);
        resetExpiresAt.setDate(resetExpiresAt.getDate() + RESET_EXPIRY_DAYS);
        const resetToken = uuidv4();

        await prisma.account.update({
            where: { id: account.id },
            data: { resetToken, resetExpiresAt },
        });

        recordResetRequest(ip);

        return res.status(202).json({
            expiresAt: resetExpiresAt.toISOString(),
            resetToken,
        });
    } catch (e) {
        next(e);
    }
});

// POST /auth/resets/:resetToken - activate account or reset password
router.post('/resets/:resetToken', async (req, res, next) => {
    try {
        const { resetToken } = req.params;
        const body = req.body || {};
        const allowed = ['email', 'password'];
        const { valid } = validateNoExtraKeys(body, allowed);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { email, password } = body;
        if (email === undefined) return sendError(res, 400, 'Invalid payload');
        if (!validateEmail(email)) return sendError(res, 401, 'Unauthorized');
        if (password !== undefined && !validatePassword(password))
            return sendError(res, 400, 'Invalid payload');

        const account = await prisma.account.findFirst({
            where: { resetToken },
        });
        if (!account) return sendError(res, 401, 'Unauthorized');

        const now = new Date();
        if (account.resetExpiresAt && account.resetExpiresAt < now)
            return sendError(res, 410, 'Gone');

        if (account.email !== email.trim()) return sendError(res, 401, 'Unauthorized');

        const updates = {
            resetToken: null,
            resetExpiresAt: null,
            activated: true,
        };
        if (password !== undefined && password !== '') {
            updates.passwordHash = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.account.update({
            where: { id: account.id },
            data: updates,
        });

        return res.status(200).json({
            id: updated.id,
            email: updated.email,
            role: updated.role,
            activated: updated.activated,
        });
    } catch (e) {
        next(e);
    }
});

// POST /auth/tokens - login
router.post('/tokens', async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['email', 'password']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { email, password } = body;
        if (!validateEmail(email)) return sendError(res, 400, 'Invalid payload');
        if (typeof password !== 'string') return sendError(res, 400, 'Invalid payload');

        const account = await prisma.account.findUnique({
            where: { email: email.trim() },
        });
        if (!account) return sendError(res, 401, 'Unauthorized');

        const match = await bcrypt.compare(password, account.passwordHash);
        if (!match) return sendError(res, 401, 'Unauthorized');

        if (!account.activated) return sendError(res, 403, 'Forbidden');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + JWT_EXPIRY_DAYS);
        const token = jwt.sign(
            { id: account.id, role: account.role },
            JWT_SECRET,
            { algorithm: 'HS256', expiresIn: `${JWT_EXPIRY_DAYS}d` }
        );

        return res.status(200).json({
            token,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
