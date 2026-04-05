// src/middleware/auth.js
'use strict';

const { expressjwt } = require('express-jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const jwtMiddleware = expressjwt({
  secret: JWT_SECRET,
  algorithms: ['HS256'],
  credentialsRequired: false,
});

async function loadAccount(req, res, next) {
  if (!req.auth || !req.auth.id) return next();
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.auth.id },
      include: { regularUser: true, business: true, admin: true },
    });
    req.account = account || null;
  } catch (e) {
    return next(e);
  }
  next();
}

function isAuthenticated(req, res, next) {
  if (!req.account) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.account) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.account.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function jwtErrorHandler(err, req, res, next) {
  if (err.name === 'UnauthorizedError') return res.status(401).json({ error: 'Unauthorized' });
  next(err);
}

module.exports = {
  jwtMiddleware,
  loadAccount,
  isAuthenticated,
  requireRole,
  jwtErrorHandler,
  JWT_SECRET,
};