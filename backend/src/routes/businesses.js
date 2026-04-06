'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { requireRole } = require('../middleware/auth');
const {
    validateEmail,
    validatePassword,
    validateNoExtraKeys,
} = require('../utils/validation');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const runtimeSystem = require('../config/runtimeSystem');
const RESET_EXPIRY_DAYS = 7;

const allowedRegisterKeys = [
    'business_name',
    'owner_name',
    'email',
    'password',
    'phone_number',
    'postal_address',
    'location',
];

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads/businesses');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${req.account.id}-avatar${ext}`);
    },
});

const upload = multer({ storage });

// POST /businesses - register business
router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};
        const allowedBusinessRegisterKeys = [
            'business_name',
            'owner_name',
            'email',
            'password',
            'phone_number',
            'postal_address',
            'location',
        ];

        const { valid } = validateNoExtraKeys(body, allowedBusinessRegisterKeys);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const {
            business_name: businessName,
            owner_name: ownerName,
            email,
            password,
            phone_number: phoneNumber,
            postal_address: postalAddress,
            location,
        } = body;

        if (typeof businessName !== 'string' || !businessName.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof ownerName !== 'string' || !ownerName.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof email !== 'string' || !validateEmail(email.trim())) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof password !== 'string' || !validatePassword(password)) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (typeof postalAddress !== 'string' || !postalAddress.trim()) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (
            !location ||
            typeof location !== 'object' ||
            Array.isArray(location) ||
            typeof location.lon !== 'number' ||
            Number.isNaN(location.lon) ||
            typeof location.lat !== 'number' ||
            Number.isNaN(location.lat) ||
            location.lon < -180 ||
            location.lon > 180 ||
            location.lat < -90 ||
            location.lat > 90
        ) {
            return sendError(res, 400, 'Invalid payload');
        }

        const existing = await prisma.account.findUnique({
            where: { email: email.trim() },
        });
        if (existing) return sendError(res, 409, 'Conflict');

        const passwordHash = await bcrypt.hash(password, 10);
        const now = new Date();
        const resetExpiresAt = new Date(now);
        resetExpiresAt.setDate(resetExpiresAt.getDate() + RESET_EXPIRY_DAYS);
        const resetToken = uuidv4();

        const account = await prisma.account.create({
            data: {
                email: email.trim(),
                passwordHash,
                role: 'business',
                activated: false,
                resetToken,
                resetExpiresAt,
            },
        });

        await prisma.business.create({
            data: {
                accountId: account.id,
                businessName: businessName.trim(),
                ownerName: ownerName.trim(),
                phoneNumber: phoneNumber.trim(),
                postalAddress: postalAddress.trim(),
                lon: location.lon,
                lat: location.lat,
            },
        });

        return res.status(201).json({
            id: account.id,
            business_name: businessName.trim(),
            owner_name: ownerName.trim(),
            email: account.email,
            activated: account.activated,
            verified: false,
            role: 'business',
            phone_number: phoneNumber.trim(),
            postal_address: postalAddress.trim(),
            location: {
                lon: location.lon,
                lat: location.lat,
            },
            createdAt: account.createdAt.toISOString(),
            resetToken,
            expiresAt: resetExpiresAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// GET /businesses
router.get('/', async (req, res, next) => {
    try {
        const allowed = [
            'keyword',
            'activated',
            'verified',
            'sort',
            'order',
            'page',
            'limit',
        ];

        const { valid } = validateNoExtraKeys(req.query || {}, allowed);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const isAdmin = req.account && req.account.role === 'admin';

        const {
            keyword,
            activated,
            verified,
            sort,
            order = 'asc',
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

        if (order !== 'asc' && order !== 'desc') {
            return sendError(res, 400, 'Invalid query');
        }

        // admin-only query fields
        if (!isAdmin) {
            if (activated !== undefined || verified !== undefined) {
                return sendError(res, 400, 'Invalid query');
            }
            if (sort === 'owner_name') {
                return sendError(res, 400, 'Invalid query');
            }
        }

        const andFilters = [
            { role: 'business' },
        ];

        if (activated !== undefined) {
            if (activated !== 'true' && activated !== 'false') {
                return sendError(res, 400, 'Invalid query');
            }
            andFilters.push({ activated: activated === 'true' });
        }

        if (verified !== undefined) {
            if (verified !== 'true' && verified !== 'false') {
                return sendError(res, 400, 'Invalid query');
            }
            andFilters.push({
                business: {
                    verified: verified === 'true',
                },
            });
        }

        if (keyword && keyword.trim()) {
            const k = keyword.trim();
            const keywordOr = [
                { email: { contains: k } },
                { business: { businessName: { contains: k } } },
                { business: { phoneNumber: { contains: k } } },
                { business: { postalAddress: { contains: k } } },
            ];

            if (isAdmin) {
                keywordOr.push({
                    business: { ownerName: { contains: k } },
                });
            }

            andFilters.push({ OR: keywordOr });
        }

        const where = { AND: andFilters };

        let orderBy;
        if (sort !== undefined) {
            if (!['business_name', 'email', 'owner_name'].includes(sort)) {
                return sendError(res, 400, 'Invalid query');
            }

            if (sort === 'business_name') {
                orderBy = { business: { businessName: order } };
            } else if (sort === 'email') {
                orderBy = { email: order };
            } else if (sort === 'owner_name') {
                if (!isAdmin) return sendError(res, 400, 'Invalid query');
                orderBy = { business: { ownerName: order } };
            }
        }

        const count = await prisma.account.count({ where });

        const businesses = await prisma.account.findMany({
            where,
            include: { business: true },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            ...(orderBy ? { orderBy } : {}),
        });

        const results = businesses.map((account) => {
            const out = {
                id: account.id,
                business_name: account.business.businessName,
                email: account.email,
                role: account.role,
                phone_number: account.business.phoneNumber,
                postal_address: account.business.postalAddress,
            };

            if (isAdmin) {
                out.owner_name = account.business.ownerName;
                out.verified = account.business.verified;
                out.activated = account.activated;
            }

            return out;
        });

        return res.status(200).json({
            count,
            results,
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /businesses/:businessId/verified (admin)
router.patch('/:businessId/verified', requireRole('admin'), async (req, res, next) => {
    try {
        const businessId = Number(req.params.businessId);

        if (!Number.isInteger(businessId) || businessId < 1) {
            return sendError(res, 400, 'Invalid business id');
        }

        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['verified']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { verified } = body;
        if (typeof verified !== 'boolean') {
            return sendError(res, 400, 'Invalid payload');
        }

        const account = await prisma.account.findUnique({
            where: { id: businessId },
            include: { business: true },
        });

        if (!account || account.role !== 'business' || !account.business) {
            return sendError(res, 404, 'Not Found');
        }

        await prisma.business.update({
            where: { accountId: businessId },
            data: { verified },
        });

        const updated = await prisma.account.findUnique({
            where: { id: businessId },
            include: { business: true },
        });

        return res.status(200).json({
            id: updated.id,
            business_name: updated.business.businessName,
            owner_name: updated.business.ownerName,
            email: updated.email,
            activated: updated.activated,
            verified: updated.business.verified,
            role: updated.role,
            phone_number: updated.business.phoneNumber,
            postal_address: updated.business.postalAddress,
        });
    } catch (e) {
        next(e);
    }
});

// GET /businesses/me
router.get('/me', requireRole('business'), async (req, res, next) => {
    try {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { business: true },
        });

        if (!account || !account.business) {
            return sendError(res, 404, 'Not Found');
        }

        return res.status(200).json({
            id: account.id,
            business_name: account.business.businessName,
            owner_name: account.business.ownerName,
            email: account.email,
            role: account.role,
            phone_number: account.business.phoneNumber,
            postal_address: account.business.postalAddress,
            location: {
                lon: account.business.lon,
                lat: account.business.lat,
            },
            avatar: account.business.avatar,
            biography: account.business.biography,
            activated: account.activated,
            verified: account.business.verified,
            createdAt: account.createdAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /businesses/me
router.patch('/me', requireRole('business'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const allowed = [
            'business_name',
            'owner_name',
            'phone_number',
            'postal_address',
            'location',
            'avatar',
            'biography',
        ];

        const { valid } = validateNoExtraKeys(body, allowed);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const updates = {};
        const response = {
            id: req.account.id,
        };

        if (Object.prototype.hasOwnProperty.call(body, 'business_name')) {
            if (typeof body.business_name !== 'string' || !body.business_name.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.businessName = body.business_name.trim();
            response.business_name = body.business_name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'owner_name')) {
            if (typeof body.owner_name !== 'string' || !body.owner_name.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.ownerName = body.owner_name.trim();
            response.owner_name = body.owner_name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'phone_number')) {
            if (typeof body.phone_number !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.phoneNumber = body.phone_number;
            response.phone_number = body.phone_number;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'postal_address')) {
            if (typeof body.postal_address !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.postalAddress = body.postal_address;
            response.postal_address = body.postal_address;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'location')) {
            const location = body.location;
            if (
                !location ||
                typeof location !== 'object' ||
                Array.isArray(location) ||
                typeof location.lon !== 'number' ||
                Number.isNaN(location.lon) ||
                typeof location.lat !== 'number' ||
                Number.isNaN(location.lat) ||
                location.lon < -180 ||
                location.lon > 180 ||
                location.lat < -90 ||
                location.lat > 90 //adding more conditions for location to pass
            ) {
                return sendError(res, 400, 'Invalid payload');
            }

            updates.lon = location.lon;
            updates.lat = location.lat;
            response.location = {
                lon: location.lon,
                lat: location.lat,
            };
        }

        if (Object.prototype.hasOwnProperty.call(body, 'avatar')) {
            if (body.avatar !== null && typeof body.avatar !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.avatar = body.avatar;
            response.avatar = body.avatar;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'biography')) {
            if (typeof body.biography !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.biography = body.biography;
            response.biography = body.biography;
        }

        if (Object.keys(updates).length === 0) {
            return sendError(res, 400, 'Invalid payload');
        }

        await prisma.business.update({
            where: { accountId: req.account.id },
            data: updates,
        });

        return res.status(200).json(response);
    } catch (e) {
        next(e);
    }
});

// PUT /businesses/me/avatar (business)
router.put(
    '/me/avatar',
    requireRole('business'),
    upload.single('file'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return sendError(res, 400, 'Bad Request');
            }

            if (!['image/png', 'image/jpeg'].includes(req.file.mimetype)) {
                return sendError(res, 400, 'Bad Request');
            }

            const ext = path.extname(req.file.filename).toLowerCase();
            const filePath = `/uploads/businesses/${req.account.id}-avatar${ext}`;

            await prisma.business.update({
                where: { accountId: req.account.id },
                data: { avatar: filePath },
            });

            return res.status(200).json({
                avatar: filePath,
            });
        } catch (e) {
            next(e);
        }
    }
);

// POST /businesses/me/jobs
router.post('/me/jobs', requireRole('business'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, [
            'position_type_id',
            'salary_min',
            'salary_max',
            'start_time',
            'end_time',
            'note',
        ]);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const {
            position_type_id,
            salary_min,
            salary_max,
            start_time,
            end_time,
            note = '',
        } = body;

        const positionTypeIdNum = Number(position_type_id);
        if (!Number.isInteger(positionTypeIdNum) || positionTypeIdNum < 1) {
            return sendError(res, 400, 'Invalid payload');
        }
        const salaryMinNum = Number(salary_min);
        const salaryMaxNum = Number(salary_max);
        if (Number.isNaN(salaryMinNum) || salaryMinNum < 0) {
            return sendError(res, 400, 'Invalid payload');
        }
        if (Number.isNaN(salaryMaxNum) || salaryMaxNum < salaryMinNum) {
            return sendError(res, 400, 'Invalid payload');
        }
        if (typeof start_time !== 'string' || typeof end_time !== 'string') {
            return sendError(res, 400, 'Invalid payload');
        }
        if (typeof note !== 'string') {
            return sendError(res, 400, 'Invalid payload');
        }

        const startTime = new Date(start_time);
        const endTime = new Date(end_time);

        if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            return sendError(res, 400, 'Invalid payload');
        }

        const now = new Date();

        if (startTime <= now || endTime <= now || endTime <= startTime) {
            return sendError(res, 400, 'Invalid payload');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { business: true },
        });

        if (!account || !account.business) {
            return sendError(res, 404, 'Not Found');
        }

        if (!account.business.verified) {
            return sendError(res, 403, 'Forbidden');
        }

        const positionType = await prisma.positionType.findUnique({
            where: { id: positionTypeIdNum },
        });

        if (!positionType) {
            return sendError(res, 404, 'Not Found');
        }

        const jobStartWindowHours = runtimeSystem.getJobStartWindowHours();
        const negotiationWindowSeconds = runtimeSystem.getNegotiationWindowSeconds();

        const maxStart = new Date(now.getTime() + jobStartWindowHours * 60 * 60 * 1000);
        if (startTime > maxStart) {
            return sendError(res, 400, 'Invalid payload');
        }

        const latestNegotiationStart = new Date(startTime.getTime() - negotiationWindowSeconds * 1000);
        if (now >= latestNegotiationStart) {
            return sendError(res, 400, 'Invalid payload');
        }

        const created = await prisma.job.create({
            data: {
                status: 'OPEN',
                positionTypeId: positionTypeIdNum,
                businessId: account.business.id,
                note,
                salaryMin: salaryMinNum,
                salaryMax: salaryMaxNum,
                startTime,
                endTime,
            },
            include: {
                positionType: true,
                business: true,
            },
        });

        return res.status(201).json({
            id: created.id,
            status: created.status.toLowerCase(),
            position_type: {
                id: created.positionType.id,
                name: created.positionType.name,
            },
            business: {
                id: created.business.accountId,
                business_name: created.business.businessName,
            },
            worker: null,
            note: created.note ?? '',
            salary_min: created.salaryMin,
            salary_max: created.salaryMax,
            start_time: created.startTime.toISOString(),
            end_time: created.endTime.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// GET /businesses/me/jobs
router.get('/me/jobs', requireRole('business'), async (req, res, next) => {
    try {
        const { valid } = validateNoExtraKeys(req.query || {}, [
            'position_type_id',
            'salary_min',
            'salary_max',
            'start_time',
            'end_time',
            'status',
            'page',
            'limit',
            'order_by',
            'order',
        ]);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const {
            position_type_id,
            salary_min,
            salary_max,
            start_time,
            end_time,
            status,
            page = '1',
            limit = '10',
            order_by,
            order: orderParam,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return sendError(res, 400, 'Invalid query');
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        let positionTypeIdNum;
        if (position_type_id !== undefined) {
            positionTypeIdNum = Number(position_type_id);
            if (!Number.isInteger(positionTypeIdNum) || positionTypeIdNum < 1) {
                return sendError(res, 400, 'Invalid query');
            }
        }

        let salaryMinNum;
        if (salary_min !== undefined) {
            salaryMinNum = Number(salary_min);
            if (Number.isNaN(salaryMinNum)) {
                return sendError(res, 400, 'Invalid query');
            }
        }

        let salaryMaxNum;
        if (salary_max !== undefined) {
            salaryMaxNum = Number(salary_max);
            if (Number.isNaN(salaryMaxNum)) {
                return sendError(res, 400, 'Invalid query');
            }
        }

        let startTime;
        if (start_time !== undefined) {
            if (typeof start_time !== 'string') {
                return sendError(res, 400, 'Invalid query');
            }
            startTime = new Date(start_time);
            if (Number.isNaN(startTime.getTime())) {
                return sendError(res, 400, 'Invalid query');
            }
        }

        let endTime;
        if (end_time !== undefined) {
            if (typeof end_time !== 'string') {
                return sendError(res, 400, 'Invalid query');
            }
            endTime = new Date(end_time);
            if (Number.isNaN(endTime.getTime())) {
                return sendError(res, 400, 'Invalid query');
            }
        }

        let statuses = ['OPEN', 'FILLED'];
        if (status !== undefined) {
            // Express: ?status=OPEN -> string; ?status=OPEN&status=FILLED -> string[]
            const statusList = Array.isArray(status) ? status : [status];

            const allowedStatuses = ['OPEN', 'EXPIRED', 'FILLED', 'CANCELLED', 'COMPLETED'];
            statuses = [];

            for (const s of statusList) {
                if (typeof s !== 'string') {
                    return sendError(res, 400, 'Invalid query');
                }

                const pieces = s.includes(',')
                    ? s.split(',').map((t) => t.trim()).filter(Boolean)
                    : [s.trim()].filter(Boolean);

                for (const piece of pieces) {
                    const normalized = piece.toUpperCase();
                    if (!allowedStatuses.includes(normalized)) {
                        return sendError(res, 400, 'Invalid query');
                    }
                    statuses.push(normalized);
                }
            }
        }

        const business = await prisma.business.findUnique({
            where: { accountId: req.account.id },
        });

        if (!business) {
            return sendError(res, 404, 'Not Found');
        }

        const where = {
            businessId: business.id,
            status: { in: statuses },
            ...(positionTypeIdNum !== undefined && { positionTypeId: positionTypeIdNum }),
            ...(salaryMinNum !== undefined && { salaryMin: { gte: salaryMinNum } }),
            ...(salaryMaxNum !== undefined && { salaryMax: { gte: salaryMaxNum } }),
            ...(startTime !== undefined && { startTime: { gte: startTime } }),
            ...(endTime !== undefined && { endTime: { lte: endTime } }),
        };

        const count = await prisma.job.count({ where });

        const orderByFieldMap = {
            updated_at: 'updatedAt',
            start_time: 'startTime',
            end_time: 'endTime',
            salary_min: 'salaryMin',
            salary_max: 'salaryMax',
            status: 'status',
        };
        const orderByRaw =
            order_by === undefined ? 'updated_at' : Array.isArray(order_by) ? order_by[0] : order_by;
        const ob =
            order_by === undefined ? 'updated_at' : String(orderByRaw).trim();
        if (!Object.prototype.hasOwnProperty.call(orderByFieldMap, ob)) {
            return sendError(res, 400, 'Invalid query');
        }
        const orderRaw =
            orderParam === undefined ? 'desc' : Array.isArray(orderParam) ? orderParam[0] : orderParam;
        const dir =
            orderParam === undefined ? 'desc' : String(orderRaw).trim().toLowerCase();
        if (dir !== 'asc' && dir !== 'desc') {
            return sendError(res, 400, 'Invalid query');
        }
        const prismaOrderField = orderByFieldMap[ob];

        const jobs = await prisma.job.findMany({
            where,
            include: {
                positionType: true,
                business: true,
                negotiations: {
                    where: { status: 'SUCCESSFUL' },
                    include: {
                        user: true,
                    },
                },
            },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: {
                [prismaOrderField]: dir,
            },
        });

        const results = jobs.map((job) => {
            const winningNeg = job.negotiations[0] ?? null;

            return {
                id: job.id,
                status: job.status.toLowerCase(),
                position_type: {
                    id: job.positionType.id,
                    name: job.positionType.name,
                },
                business_id: job.business.accountId,
                worker: winningNeg
                    ? {
                          id: winningNeg.user.accountId,
                          first_name: winningNeg.user.firstName,
                          last_name: winningNeg.user.lastName,
                      }
                    : null,
                salary_min: job.salaryMin,
                salary_max: job.salaryMax,
                start_time: job.startTime.toISOString(),
                end_time: job.endTime.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
            };
        });

        return res.status(200).json({
            count,
            results,
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /businesses/me/jobs/:jobId
router.patch('/me/jobs/:jobId', requireRole('business'), async (req, res, next) => {
    try {
        const jobId = Number(req.params.jobId);
        if (!Number.isInteger(jobId) || jobId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, [
            'salary_min',
            'salary_max',
            'start_time',
            'end_time',
            'note',
        ]);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const business = await prisma.business.findUnique({
            where: { accountId: req.account.id },
        });

        if (!business) {
            return sendError(res, 404, 'Not Found');
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job || job.businessId !== business.id) {
            return sendError(res, 404, 'Not Found');
        }

        const now = new Date();

        if (job.status !== 'OPEN' || now >= job.startTime) {
            return sendError(res, 409, 'Conflict');
        }

        const updates = { };
        const response = { id: jobId };

        let nextSalaryMin = job.salaryMin;
        let nextSalaryMax = job.salaryMax;
        let nextStartTime = job.startTime;
        let nextEndTime = job.endTime;

        if (Object.prototype.hasOwnProperty.call(body, 'salary_min')) {
            if (typeof body.salary_min !== 'number' || Number.isNaN(body.salary_min) || body.salary_min < 0) {
                return sendError(res, 400, 'Invalid payload');
            }
            nextSalaryMin = body.salary_min;
            updates.salaryMin = body.salary_min;
            response.salary_min = body.salary_min;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'salary_max')) {
            if (typeof body.salary_max !== 'number' || Number.isNaN(body.salary_max)) {
                return sendError(res, 400, 'Invalid payload');
            }
            nextSalaryMax = body.salary_max;
            updates.salaryMax = body.salary_max;
            response.salary_max = body.salary_max;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'start_time')) {
            if (typeof body.start_time !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            const parsed = new Date(body.start_time);
            if (Number.isNaN(parsed.getTime())) {
                return sendError(res, 400, 'Invalid payload');
            }
            nextStartTime = parsed;
            updates.startTime = parsed;
            response.start_time = parsed.toISOString();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'end_time')) {
            if (typeof body.end_time !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            const parsed = new Date(body.end_time);
            if (Number.isNaN(parsed.getTime())) {
                return sendError(res, 400, 'Invalid payload');
            }
            nextEndTime = parsed;
            updates.endTime = parsed;
            response.end_time = parsed.toISOString();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'note')) {
            if (typeof body.note !== 'string') {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.note = body.note;
            response.note = body.note;
        }

        if (Object.keys(updates).length === 0) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (nextSalaryMin < 0 || nextSalaryMax < nextSalaryMin) {
            return sendError(res, 400, 'Invalid payload');
        }

        if (nextStartTime <= now || nextEndTime <= now || nextEndTime <= nextStartTime) {
            return sendError(res, 400, 'Invalid payload');
        }

        const jobStartWindowHours = runtimeSystem.getJobStartWindowHours();
        const negotiationWindowSeconds = runtimeSystem.getNegotiationWindowSeconds();

        const maxStart = new Date(now.getTime() + jobStartWindowHours * 60 * 60 * 1000);
        if (nextStartTime > maxStart) {
            return sendError(res, 400, 'Invalid payload');
        }

        const latestNegotiationStart = new Date(nextStartTime.getTime() - negotiationWindowSeconds * 1000);
        if (now >= latestNegotiationStart) {
            return sendError(res, 400, 'Invalid payload');
        }

        const updated = await prisma.job.update({
            where: { id: jobId },
            data: updates,
        });

        return res.status(200).json({
            ...response,
            updatedAt: updated.updatedAt.toISOString(),
        });
    } catch (e) {
        next(e);
    }
});

// DELETE /businesses/me/jobs/:jobId (business)
router.delete('/me/jobs/:jobId', requireRole('business'), async (req, res, next) => {
    try {
        const jobId = Number(req.params.jobId);
        if (!Number.isInteger(jobId) || jobId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const business = await prisma.business.findUnique({
            where: { accountId: req.account.id },
        });

        if (!business) {
            return sendError(res, 404, 'Not Found');
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                negotiations: true,
                interests: true,
            },
        });

        if (!job || job.businessId !== business.id) {
            return sendError(res, 404, 'Not Found');
        }

        const activeNegotiation = job.negotiations.some((n) => n.status === 'PENDING');

        const deletableStatuses = ['OPEN', 'EXPIRED'];
        if (!deletableStatuses.includes(job.status) || activeNegotiation) {
            return sendError(res, 409, 'Conflict');
        }

        await prisma.$transaction([
            prisma.interest.deleteMany({
                where: { jobId },
            }),
            prisma.negotiation.deleteMany({
                where: { jobId },
            }),
            prisma.job.delete({
                where: { id: jobId },
            }),
        ]);

        return res.status(204).send();
    } catch (e) {
        next(e);
    }
});

// GET /businesses/:businessId
router.get('/:businessId', async (req, res, next) => {
    try {
        const businessId = Number(req.params.businessId);

        if (!Number.isInteger(businessId) || businessId < 1) {
            return sendError(res, 404, 'Not Found');
        }

        const isAdmin = req.account && req.account.role === 'admin';

        const account = await prisma.account.findUnique({
            where: { id: businessId },
            include: { business: true },
        });

        if (!account || account.role !== 'business' || !account.business) {
            return sendError(res, 404, 'Not Found');
        }

        const out = {
            id: account.id,
            business_name: account.business.businessName,
            email: account.email,
            role: account.role,
            phone_number: account.business.phoneNumber,
            postal_address: account.business.postalAddress,
            location: {
                lon: account.business.lon,
                lat: account.business.lat,
            },
            avatar: account.business.avatar,
            biography: account.business.biography,
        };

        if (isAdmin) {
            out.owner_name = account.business.ownerName;
            out.activated = account.activated;
            out.verified = account.business.verified;
            out.createdAt = account.createdAt.toISOString();
        }

        return res.status(200).json(out);
    } catch (e) {
        next(e);
    }
});

// TODO: add handlers

module.exports = router;
