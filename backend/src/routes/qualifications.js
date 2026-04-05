'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { requireRole } = require('../middleware/auth');
const { validateNoExtraKeys } = require('../utils/validation');

const prisma = new PrismaClient();
const router = express.Router();

function drainRequestBody(req) {
    return new Promise((resolve) => {
        if (req.readableEnded || req.complete) {
            resolve();
            return;
        }
        const done = () => {
            req.removeListener('end', done);
            req.removeListener('error', done);
            resolve();
        };
        req.on('end', done);
        req.on('error', done);
        req.resume();
    });
}

const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const qualificationsUploadRoot = path.join(__dirname, '../../uploads/users');

const qualificationStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const qualification = req.qualificationRecord;
            if (!qualification) {
                return cb(new Error('Qualification missing'));
            }

            const dir = path.join(
                qualificationsUploadRoot,
                String(qualification.regularUser.accountId),
                'position_type',
                String(qualification.positionTypeId)
            );

            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (e) {
            cb(e);
        }
    },
    filename: (req, file, cb) => {
        cb(null, 'document.pdf');
    },
});

const qualificationUpload = multer({
    storage: qualificationStorage,
});

// GET /qualifications
router.get('/', requireRole('admin'), async (req, res, next) => {
    try {
        const { valid } = validateNoExtraKeys(req.query || {}, ['keyword', 'page', 'limit']);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
        const page = req.query.page === undefined ? 1 : Number(req.query.page);
        const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

        if (!Number.isInteger(page) || page < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        // Admin listing
        const where = {};

        if (keyword) {
            where.OR = [
                { regularUser: { firstName: { contains: keyword } } },
                { regularUser: { lastName: { contains: keyword } } },
                { regularUser: { phoneNumber: { contains: keyword } } },
                { regularUser: { account: { email: { contains: keyword } } } },
                { positionType: { name: { contains: keyword } } },
            ];
        }

        const count = await prisma.qualification.count({ where });

        const qualifications = await prisma.qualification.findMany({
            where,
            include: {
                regularUser: {
                    include: {
                        account: true,
                    },
                },
                positionType: true,
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                updatedAt: 'desc',
            },
        });

        const results = qualifications.map((q) => ({
            id: q.id,
            status: q.status,
            user: {
                id: q.regularUser.accountId,
                first_name: q.regularUser.firstName,
                last_name: q.regularUser.lastName,
            },
            position_type: {
                id: q.positionType.id,
                name: q.positionType.name,
            },
            updatedAt: q.updatedAt.toISOString(),
        }));

        return res.status(200).json({
            count,
            results,
        });
    } catch (e) {
        next(e);
    }
});

// POST /qualifications (regular)
router.post('/', requireRole('regular'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['position_type_id', 'note']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { position_type_id, note = '' } = body;

        if (!Number.isInteger(position_type_id) || position_type_id < 1) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof note !== 'string') {
            return sendError(res, 400, 'Invalid payload');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const positionType = await prisma.positionType.findUnique({
            where: { id: position_type_id },
        });

        if (!positionType) {
            return sendError(res, 404, 'Not Found');
        }

        const existing = await prisma.qualification.findUnique({
            where: {
                regularUserId_positionTypeId: {
                    regularUserId: account.regularUser.id,
                    positionTypeId: position_type_id,
                },
            },
            include: {
                regularUser: true,
                positionType: true,
            },
        });

        if (existing) {
            return sendError(res, 409, 'Conflict');
        }

        const created = await prisma.qualification.create({
            data: {
                regularUserId: account.regularUser.id,
                positionTypeId: position_type_id,
                status: 'created',
                approved: false,
                note,
                document: null,
            },
            include: {
                regularUser: true,
                positionType: true,
            },
        });

        return res.status(201).json({
            id: created.id,
            status: created.status,
            note: created.note,
            document: created.document,
            user: {
                id: created.regularUser.accountId,
                first_name: created.regularUser.firstName,
                last_name: created.regularUser.lastName,
            },
            position_type: {
                id: created.positionType.id,
                name: created.positionType.name,
            },
            updatedAt: created.updatedAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// GET /qualifications/:qualificationId
router.get('/:qualificationId', requireRole('admin', 'regular', 'business'), async (req, res, next) => {
    try {
        const qualificationId = Number(req.params.qualificationId);

        if (!Number.isInteger(qualificationId) || qualificationId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const qualification = await prisma.qualification.findUnique({
            where: { id: qualificationId },
            include: {
                regularUser: {
                    include: {
                        account: true,
                    },
                },
                positionType: true,
            },
        });

        if (!qualification) {
            return sendError(res, 404, 'Not Found');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: {
                regularUser: true,
                business: true,
                admin: true,
            },
        });

        if (!account) {
            return sendError(res, 404, 'Not Found');
        }

        // Admin can see everything
        if (account.role === 'admin') {
            return res.status(200).json({
                id: qualification.id,
                document: qualification.document,
                note: qualification.note,
                position_type: {
                    id: qualification.positionType.id,
                    name: qualification.positionType.name,
                    description: qualification.positionType.description,
                },
                updatedAt: qualification.updatedAt.toISOString(),
                user: {
                    id: qualification.regularUser.accountId,
                    first_name: qualification.regularUser.firstName,
                    last_name: qualification.regularUser.lastName,
                    role: 'regular',
                    avatar: qualification.regularUser.avatar,
                    resume: qualification.regularUser.resume,
                    biography: qualification.regularUser.biography,
                    email: qualification.regularUser.account.email,
                    phone_number: qualification.regularUser.phoneNumber,
                    postal_address: qualification.regularUser.postalAddress,
                    birthday: qualification.regularUser.birthday,
                    activated: qualification.regularUser.account.activated,
                    suspended: qualification.regularUser.suspended,
                    createdAt: qualification.regularUser.account.createdAt.toISOString(),
                },
                status: qualification.status,
            });
        }

        // Regular can only see their own; otherwise 404
        if (account.role === 'regular') {
            if (!account.regularUser || qualification.regularUserId !== account.regularUser.id) {
                return sendError(res, 404, 'Not Found');
            }

            return res.status(200).json({
                id: qualification.id,
                document: qualification.document,
                note: qualification.note,
                position_type: {
                    id: qualification.positionType.id,
                    name: qualification.positionType.name,
                    description: qualification.positionType.description,
                },
                updatedAt: qualification.updatedAt.toISOString(),
                user: {
                    id: qualification.regularUser.accountId,
                    first_name: qualification.regularUser.firstName,
                    last_name: qualification.regularUser.lastName,
                    role: 'regular',
                    avatar: qualification.regularUser.avatar,
                    resume: qualification.regularUser.resume,
                    biography: qualification.regularUser.biography,
                    email: qualification.regularUser.account.email,
                    phone_number: qualification.regularUser.phoneNumber,
                    postal_address: qualification.regularUser.postalAddress,
                    birthday: qualification.regularUser.birthday,
                    activated: qualification.regularUser.account.activated,
                    suspended: qualification.regularUser.suspended,
                    createdAt: qualification.regularUser.account.createdAt.toISOString(),
                },
                status: qualification.status,
            });
        }

        // Business access rules
        if (account.role === 'business') {
            if (!account.business) {
                return sendError(res, 404, 'Not Found');
            }

            // businesses can only see approved qualifications
            if (qualification.status !== 'approved') {
                return sendError(res, 403, 'Forbidden');
            }

            // Must have at least one active/open job of this business
            // that the regular user expressed interest in,
            // and that job must require this qualification's position type.
            const matchingInterest = await prisma.interest.findFirst({
                where: {
                    userId: qualification.regularUserId,
                    initiatedBy: 'USER',
                    job: {
                        businessId: account.business.id,
                        status: 'OPEN',
                        positionTypeId: qualification.positionTypeId,
                    },
                },
            });

            if (!matchingInterest) {
                return sendError(res, 403, 'Forbidden');
            }

            return res.status(200).json({
                id: qualification.id,
                document: qualification.document,
                note: qualification.note,
                position_type: {
                    id: qualification.positionType.id,
                    name: qualification.positionType.name,
                    description: qualification.positionType.description,
                },
                updatedAt: qualification.updatedAt.toISOString(),
                user: {
                    id: qualification.regularUser.accountId,
                    first_name: qualification.regularUser.firstName,
                    last_name: qualification.regularUser.lastName,
                    role: 'regular',
                    avatar: qualification.regularUser.avatar,
                    resume: qualification.regularUser.resume,
                    biography: qualification.regularUser.biography,
                },
            });
        }

        return sendError(res, 403, 'Forbidden');
    } catch (e) {
        next(e);
    }
});

// PATCH /qualifications/:qualificationId
router.patch('/:qualificationId', requireRole('admin', 'regular'), async (req, res, next) => {
    try {
        const qualificationId = Number(req.params.qualificationId);
        if (!Number.isInteger(qualificationId) || qualificationId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['status', 'note']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { status, note } = body;

        if (status !== undefined && typeof status !== 'string') {
            return sendError(res, 400, 'Invalid payload');
        }

        if (note !== undefined && typeof note !== 'string') {
            return sendError(res, 400, 'Invalid payload');
        }

        const qualification = await prisma.qualification.findUnique({
            where: { id: qualificationId },
            include: {
                regularUser: {
                    include: {
                        account: true,
                    },
                },
                positionType: true,
            },
        });

        if (!qualification) {
            return sendError(res, 404, 'Not Found');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: {
                regularUser: true,
                admin: true,
            },
        });

        if (!account) {
            return sendError(res, 404, 'Not Found');
        }

        const data = {};

        if (note !== undefined) {
            data.note = note;
        }

        if (status !== undefined) {
            if (account.role === 'admin') {
                const allowed =
                    (qualification.status === 'submitted' || qualification.status === 'revised') &&
                    (status === 'approved' || status === 'rejected');

                if (!allowed) {
                    return sendError(res, 403, 'Forbidden');
                }

                data.status = status;
                data.approved = status === 'approved';
            } else if (account.role === 'regular') {
                if (!account.regularUser || qualification.regularUserId !== account.regularUser.id) {
                    return sendError(res, 403, 'Forbidden');
                }

                const allowed =
                    (qualification.status === 'created' && status === 'submitted') ||
                    ((qualification.status === 'approved' || qualification.status === 'rejected') &&
                        status === 'revised');

                if (!allowed) {
                    return sendError(res, 403, 'Forbidden');
                }

                data.status = status;

                if (status === 'submitted' || status === 'revised') {
                    data.approved = false;
                }
            } else {
                return sendError(res, 403, 'Forbidden');
            }
        } else if (account.role === 'regular') {
            if (!account.regularUser || qualification.regularUserId !== account.regularUser.id) {
                return sendError(res, 403, 'Forbidden');
            }
        }

        const updated = await prisma.qualification.update({
            where: { id: qualificationId },
            data,
            include: {
                regularUser: true,
                positionType: true,
            },
        });

        return res.status(200).json({
            id: updated.id,
            status: updated.status,
            document: updated.document,
            note: updated.note,
            user: {
                id: updated.regularUser.accountId,
                first_name: updated.regularUser.firstName,
                last_name: updated.regularUser.lastName,
            },
            position_type: {
                id: updated.positionType.id,
                name: updated.positionType.name,
            },
            updatedAt: updated.updatedAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// PUT /qualifications/:qualificationId/document
router.put(
    '/:qualificationId/document',
    requireRole('regular'),
    async (req, res, next) => {
        try {
            const qualificationId = Number(req.params.qualificationId);
            if (!Number.isInteger(qualificationId) || qualificationId < 1) {
                await drainRequestBody(req);
                return sendError(res, 404, 'Not Found');
            }

            const qualification = await prisma.qualification.findUnique({
                where: { id: qualificationId },
                include: { regularUser: true, positionType: true },
            });
            if (!qualification) {
                await drainRequestBody(req);
                return sendError(res, 404, 'Not Found');
            }

            const account = await prisma.account.findUnique({
                where: { id: req.account.id },
                include: { regularUser: true },
            });
            if (!account || !account.regularUser) {
                await drainRequestBody(req);
                return sendError(res, 404, 'Not Found');
            }
            if (qualification.regularUserId !== account.regularUser.id) {
                await drainRequestBody(req);
                return sendError(res, 403, 'Forbidden');
            }

            req.qualificationRecord = qualification;
            return next();
        } catch (e) {
            return next(e);
        }
    },
    qualificationUpload.single('file'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return sendError(res, 400, 'Bad Request');
            }

            if (req.file.mimetype !== 'application/pdf') {
                return sendError(res, 400, 'Bad Request');
            }

            const qualification = req.qualificationRecord;
            const filePath = `/uploads/users/${qualification.regularUser.accountId}/position_type/${qualification.positionTypeId}/document.pdf`;

            const updated = await prisma.qualification.update({
                where: { id: qualification.id },
                data: {
                    document: filePath,
                },
            });

            return res.status(200).json({
                document: updated.document,
            });
        } catch (e) {
            next(e);
        }
    }
);

// TODO: add handlers

module.exports = router;
