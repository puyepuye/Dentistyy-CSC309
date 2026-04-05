'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { requireRole, isAuthenticated } = require('../middleware/auth');
const { validateNoExtraKeys } = require('../utils/validation');

const prisma = new PrismaClient();
const router = express.Router();

// GET /position-types (authenticated; admin-only query params)
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const allowed = [
            'keyword',
            'name',
            'hidden',
            'num_qualified',
            'page',
            'limit',
        ];

        const { valid } = validateNoExtraKeys(req.query || {}, allowed);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const isAdmin = req.account && req.account.role === 'admin';

        const {
            keyword,
            name,
            hidden,
            num_qualified,
            page = '1',
            limit = '10',
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        const where = {};

        if (keyword && keyword.trim()) {
            const k = keyword.trim();
            where.OR = [
                { name: { contains: k } },
                { description: { contains: k } },
            ];
        }

        if (hidden !== undefined) {
            if (!isAdmin) return sendError(res, 400, 'Invalid query');
            if (hidden !== 'true' && hidden !== 'false') {
                return sendError(res, 400, 'Invalid query');
            }
            where.hidden = hidden === 'true';
        } else if (!isAdmin) {
            where.hidden = false;
        }

        if (name !== undefined && name !== 'asc' && name !== 'desc') {
            return sendError(res, 400, 'Invalid query');
        }

        if (num_qualified !== undefined) {
            if (!isAdmin) return sendError(res, 400, 'Invalid query');
            if (num_qualified !== 'asc' && num_qualified !== 'desc') {
                return sendError(res, 400, 'Invalid query');
            }
        }

        const positionTypes = await prisma.positionType.findMany({
            where,
            include: {
                qualifications: {
                    where: {
                        approved: true,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });

        let results = positionTypes.map((pt) => {
            const out = {
                id: pt.id,
                name: pt.name,
                description: pt.description,
            };

            if (isAdmin) {
                out.hidden = pt.hidden;
                out.num_qualified = pt.qualifications.length;
            }

            return out;
        });

        if (num_qualified) {
            results.sort((a, b) => {
                if (a.num_qualified !== b.num_qualified) {
                    return num_qualified === 'asc'
                        ? a.num_qualified - b.num_qualified
                        : b.num_qualified - a.num_qualified;
                }
                return a.id - b.id;
            });
        } else if (name) {
            results.sort((a, b) => {
                const cmp = a.name.localeCompare(b.name);
                if (cmp !== 0) return name === 'asc' ? cmp : -cmp;
                return a.id - b.id;
            });
        } else {
            results.sort((a, b) => a.id - b.id);
        }

        const count = results.length;
        const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        return res.status(200).json({
            count,
            results: paginated,
        });
    } catch (e) {
        next(e);
    }
});

// POST /position-types (admin)
router.post('/', requireRole('admin'), async (req, res, next) => {
    try {
        const body = req.body || {};

        const { valid } = validateNoExtraKeys(body, ['name', 'description', 'hidden']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { name, description, hidden = true } = body;

        if (typeof name !== 'string' || !name.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof description !== 'string' || !description.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof hidden !== 'boolean') {
            return sendError(res, 400, 'Invalid payload');
        }

        const created = await prisma.positionType.create({
            data: {
                name: name.trim(),
                description: description.trim(),
                hidden
            }
        });

        return res.status(201).json({
            id: created.id,
            name: created.name,
            description: created.description,
            hidden: created.hidden,
            num_qualified: 0
        });

    } catch (e) {
        next(e);
    }
});

// PATCH /position-types/:positionTypeId
router.patch('/:positionTypeId', requireRole('admin'), async (req, res, next) => {
    try {
        const positionTypeId = Number(req.params.positionTypeId);

        if (!Number.isInteger(positionTypeId) || positionTypeId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['name', 'description', 'hidden']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const updates = {};
        const response = { id: positionTypeId };

        if (Object.prototype.hasOwnProperty.call(body, 'name')) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.name = body.name.trim();
            response.name = body.name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'description')) {
            if (typeof body.description !== 'string' || !body.description.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.description = body.description.trim();
            response.description = body.description.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'hidden')) {
            if (typeof body.hidden !== 'boolean') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.hidden = body.hidden;
            response.hidden = body.hidden;
        }

        const existing = await prisma.positionType.findUnique({
            where: { id: positionTypeId },
        });

        if (!existing) {
            return sendError(res, 404, 'Not Found');
        }

        await prisma.positionType.update({
            where: { id: positionTypeId },
            data: updates,
        });

        return res.status(200).json(response);
    } catch (e) {
        next(e);
    }
});

// DELETE /position-types/:positionTypeId (admin)
router.delete('/:positionTypeId', requireRole('admin'), async (req, res, next) => {
    try {
        const positionTypeId = Number(req.params.positionTypeId);

        if (!Number.isInteger(positionTypeId) || positionTypeId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const positionType = await prisma.positionType.findUnique({
            where: { id: positionTypeId },
            include: {
                _count: {
                    select: { qualifications: true }
                }
            }
        });

        if (!positionType) {
            return sendError(res, 404, 'Not Found');
        }

        // If users are qualified, cannot delete
        if (positionType._count.qualifications > 0) {
            return sendError(res, 409, 'Conflict');
        }

        await prisma.positionType.delete({
            where: { id: positionTypeId }
        });

        return res.status(204).send();

    } catch (e) {
        next(e);
    }
});

// TODO: add handlers
router.route('/:positionTypeId')
    .get((req, res) => res.sendStatus(405))
    .post((req, res) => res.sendStatus(405))
    .put((req, res) => res.sendStatus(405));

module.exports = router;
