'use strict';

require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require('path');
const {
    jwtMiddleware,
    loadAccount,
    jwtErrorHandler,
} = require("./middleware/auth");
const { methodWhitelistMiddleware, mountApiRouters } = require("./routes");

function create_app() {
    const app = express();
    const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
    app.use(
        cors({
            origin: corsOrigins && corsOrigins.length ? corsOrigins : true,
            credentials: true,
        })
    );
    app.use(express.json());
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // 405 for wrong method on known top-level paths — before auth so tests get 405, not 401/404
    app.use(methodWhitelistMiddleware);

    // Auth: verify JWT if present, load account into req.account
    app.use(jwtMiddleware);
    app.use(loadAccount);

    mountApiRouters(app);

    // Express-jwt errors (invalid/expired token)
    app.use(jwtErrorHandler);

    return app;
}

module.exports = { create_app };