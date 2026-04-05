'use strict';

const express = require('express');
const usersRouter = require('./users');
const businessesRouter = require('./businesses');
const authRouter = require('./auth');
const systemRouter = require('./system');
const positionTypesRouter = require('./positionTypes');
const qualificationsRouter = require('./qualifications');
const jobsRouter = require('./jobs');
const negotiationsRouter = require('./negotiations');

/**
 * Known top-level paths where unsupported HTTP methods must return 405 (not 404).
 * Registered early in app.js — before JWT — so method checks are independent of auth.
 */
const allowedMethodsByPath = {
    '/auth/tokens': ['POST'],
    '/users/me': ['GET', 'PATCH'],
    '/businesses': ['GET', 'POST'],
    '/position-types': ['GET', 'POST'],
    '/qualifications': ['GET', 'POST'],
    '/jobs': ['GET'],
    '/interests': [],
    '/negotiations': ['POST'],
};

function normalizePathSegment(p) {
    if (!p || p === '/') return p || '/';
    const s = p.split('?')[0];
    return s.length > 1 && s.endsWith('/') ? s.slice(0, -1) : s;
}

function methodWhitelistMiddleware(req, res, next) {
    const pathKey = normalizePathSegment(req.path || '/');
    const fullKey = normalizePathSegment(
        (req.originalUrl || req.url || '').split('?')[0] || '/'
    );
    const keysToTry = pathKey === fullKey ? [pathKey] : [pathKey, fullKey];

    let matchedKey = null;
    for (const k of keysToTry) {
        if (Object.prototype.hasOwnProperty.call(allowedMethodsByPath, k)) {
            matchedKey = k;
            break;
        }
    }
    if (!matchedKey) {
        return next();
    }

    const allowed = allowedMethodsByPath[matchedKey];
    if (!allowed.includes(req.method)) {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    return next();
}

/**
 * Mount API routers + final 404. Call after auth middleware in app.js.
 */
function mountApiRouters(app) {
    // No resource routes under /interests — must answer 405, not 404
    const interestsRouter = express.Router();
    interestsRouter.use((req, res) => {
        res.status(405).json({ error: 'Method Not Allowed' });
    });
    app.use('/interests', interestsRouter);

    app.use('/users', usersRouter);
    app.use('/businesses', businessesRouter);
    app.use('/auth', authRouter);
    app.use('/system', systemRouter);
    app.use('/position-types', positionTypesRouter);
    app.use('/qualifications', qualificationsRouter);
    app.use('/jobs', jobsRouter);
    app.use('/negotiations', negotiationsRouter);

    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });
}

/** Full route registration (whitelist + routers). Use app.js split order for correct 405/auth ordering. */
function allRoutes(app) {
    app.use(methodWhitelistMiddleware);
    mountApiRouters(app);
}

module.exports = {
    methodWhitelistMiddleware,
    mountApiRouters,
    allRoutes,
};
