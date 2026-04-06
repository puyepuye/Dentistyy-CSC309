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
    validateIsoDate,
} = require('../utils/validation');

const prisma = new PrismaClient();
const RESET_EXPIRY_DAYS = 7;

const allowedRegisterKeys = [
    'first_name',
    'last_name',
    'email',
    'password',
    'phone_number',
    'postal_address',
    'birthday',
];

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/users');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.account.id}-${Date.now()}${ext}`);
    },
});

const upload = multer({ storage });

const router = express.Router();

// POST /users - register regular user
router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid, extra } = validateNoExtraKeys(body, allowedRegisterKeys);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            phone_number: phoneNumber = '',
            postal_address: postalAddress = '',
            birthday = '1970-01-01',
        } = body;

        if (
            typeof firstName !== 'string' ||
            !firstName.trim() ||
            typeof lastName !== 'string' ||
            !lastName.trim()
        )
            return sendError(res, 400, 'Invalid payload');
        if (!validateEmail(email)) return sendError(res, 400, 'Invalid payload');
        if (!validatePassword(password)) return sendError(res, 400, 'Invalid payload');
        if (typeof phoneNumber !== 'string') return sendError(res, 400, 'Invalid payload');
        if (typeof postalAddress !== 'string') return sendError(res, 400, 'Invalid payload');
        if (typeof birthday !== 'string' || !validateIsoDate(birthday))
            return sendError(res, 400, 'Invalid payload');

        const existing = await prisma.account.findUnique({ where: { email: email.trim() } });
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
                role: 'regular',
                activated: false,
                resetToken,
                resetExpiresAt,
            },
        });

        await prisma.regularUser.create({
            data: {
                accountId: account.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phoneNumber: String(phoneNumber),
                postalAddress: String(postalAddress),
                birthday: birthday.trim(),
            },
        });

        const out = {
            id: account.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: account.email,
            activated: account.activated,
            role: 'regular',
            phone_number: String(phoneNumber),
            postal_address: String(postalAddress),
            birthday: birthday.trim(),
            createdAt: account.createdAt.toISOString(),
            resetToken,
            expiresAt: resetExpiresAt.toISOString(),
        };
        return res.status(201).json(out);
    } catch (e) {
        next(e);
    }
});

// GET /users (admin list)
router.get(
  '/',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      let { keyword, activated, suspended, page = '1', limit = '10' } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ error: 'Invalid page' });
      }

      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(400).json({ error: 'Invalid limit' });
      }

      const skip = (pageNum - 1) * limitNum;

      const filters = [{ role: 'regular' }];

      if (activated !== undefined) {
        if (activated !== 'true' && activated !== 'false') {
          return res.status(400).json({ error: 'Invalid activated value' });
        }
        filters.push({ activated: activated === 'true' });
      }

      if (suspended !== undefined) {
        if (suspended !== 'true' && suspended !== 'false') {
          return res.status(400).json({ error: 'Invalid suspended value' });
        }
        filters.push({ regularUser: { suspended: suspended === 'true' } });
      }

      if (keyword && keyword.trim()) {
        const k = keyword.trim();
        filters.push({
          OR: [
            { email: { contains: k } },
            { regularUser: { firstName: { contains: k } } },
            { regularUser: { lastName: { contains: k } } },
            { regularUser: { phoneNumber: { contains: k } } },
            { regularUser: { postalAddress: { contains: k } } },
          ],
        });
      }

      const where = { AND: filters };

      const count = await prisma.account.count({ where });

      const users = await prisma.account.findMany({
        where,
        include: { regularUser: true },
        skip,
        take: limitNum,
        orderBy: { id: 'asc' },
      });

      const results = users.map((a) => ({
        id: a.id,
        first_name: a.regularUser.firstName,
        last_name: a.regularUser.lastName,
        email: a.email,
        activated: a.activated,
        suspended: a.regularUser.suspended,
        role: a.role,
        phone_number: a.regularUser.phoneNumber,
        postal_address: a.regularUser.postalAddress,
      }));

      return res.json({ count, results });
    } catch (e) {
      next(e);
    }
  }
);

// GET /users/me/qualifications — approved qualifications for the current user (UI helper)
router.get('/me/qualifications', requireRole('regular'), async (req, res, next) => {
    try {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const quals = await prisma.qualification.findMany({
            where: {
                regularUserId: account.regularUser.id,
                approved: true,
                status: 'approved',
            },
            include: { positionType: true },
            orderBy: { positionType: { name: 'asc' } },
        });

        return res.status(200).json({
            results: quals.map((q) => ({
                id: q.id,
                status: q.status,
                position_type: {
                    id: q.positionType.id,
                    name: q.positionType.name,
                },
            })),
        });
    } catch (e) {
        next(e);
    }
});

// GET /users/me/qualification-requests — all qualifications for profile UI (not in course PDF)
router.get('/me/qualification-requests', requireRole('regular'), async (req, res, next) => {
    try {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const quals = await prisma.qualification.findMany({
            where: { regularUserId: account.regularUser.id },
            include: { positionType: true },
            orderBy: { updatedAt: 'desc' },
        });

        return res.status(200).json({
            results: quals.map((q) => ({
                id: q.id,
                status: q.status,
                document: q.document,
                position_type: {
                    id: q.positionType.id,
                    name: q.positionType.name,
                },
                updatedAt: q.updatedAt.toISOString(),
            })),
        });
    } catch (e) {
        next(e);
    }
});

// GET /users/me
router.get('/me', requireRole('regular'), async (req, res, next) => {
    try {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const settings = await prisma.systemSettings.findFirst();
        const timeoutSeconds = settings?.availabilityTimeout ?? 300;
        const timeoutMs = timeoutSeconds > 0 ? timeoutSeconds * 1000 : 0;

        const ru = account.regularUser;

        // Reported availability = activity-based only (no manual toggle): within admin window of lastActiveAt.
        let reportedAvailable = false;
        if (!ru.suspended && ru.lastActiveAt) {
            if (timeoutMs <= 0) {
                reportedAvailable = true;
            } else {
                const inactiveMs = Date.now() - new Date(ru.lastActiveAt).getTime();
                reportedAvailable = inactiveMs <= timeoutMs;
            }
        }

        // Using the app (this request) counts as activity for the next discovery / header refresh.
        if (!ru.suspended) {
            await prisma.regularUser.update({
                where: { accountId: req.account.id },
                data: { lastActiveAt: new Date() },
            });
        }

        return res.status(200).json({
            id: account.id,
            first_name: ru.firstName,
            last_name: ru.lastName,
            email: account.email,
            activated: account.activated,
            suspended: ru.suspended,
            available: reportedAvailable,
            availability_timeout_seconds: timeoutSeconds,
            role: account.role,
            phone_number: ru.phoneNumber,
            postal_address: ru.postalAddress,
            birthday: ru.birthday,
            createdAt: account.createdAt.toISOString(),
            avatar: ru.avatar,
            resume: ru.resume,
            biography: ru.biography,
        });
    } catch (e) {
        next(e);
    }
});

// PATCH /users/me (regular)
router.patch('/me', requireRole('regular'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const allowed = [
            'first_name',
            'last_name',
            'phone_number',
            'postal_address',
            'birthday',
            'avatar',
            'biography',
        ];

        const { valid } = validateNoExtraKeys(body, allowed);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const updates = {};
        const response = {
            id: req.account.id,
        };

        if (Object.prototype.hasOwnProperty.call(body, 'first_name')) {
            if (typeof body.first_name !== 'string' || !body.first_name.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.firstName = body.first_name.trim();
            response.first_name = body.first_name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'last_name')) {
            if (typeof body.last_name !== 'string' || !body.last_name.trim()) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.lastName = body.last_name.trim();
            response.last_name = body.last_name.trim();
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

        if (Object.prototype.hasOwnProperty.call(body, 'birthday')) {
            if (typeof body.birthday !== 'string' || !validateIsoDate(body.birthday)) {
                return sendError(res, 400, 'Invalid payload');
            }
            updates.birthday = body.birthday.trim();
            response.birthday = body.birthday.trim();
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

        await prisma.regularUser.update({
            where: { accountId: req.account.id },
            data: updates,
        });

        return res.status(200).json(response);
    } catch (e) {
        next(e);
    }
});

// PATCH /users/me/available
router.patch('/me/available', requireRole('regular'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['available']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { available } = body;
        if (typeof available !== 'boolean') {
            return sendError(res, 400, 'Invalid payload');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        if (available === true) {
            if (account.regularUser.suspended) {
                return sendError(res, 400, 'Bad Request');
            }

            const approvedQualificationCount = await prisma.qualification.count({
                where: {
                    regularUserId: account.regularUser.id,
                    approved: true,
                },
            });

            if (approvedQualificationCount === 0) {
                return sendError(res, 400, 'Bad Request');
            }
        }

        const updated = await prisma.regularUser.update({
            where: { accountId: req.account.id },
            data: {
                available,
                ...(available ? { lastActiveAt: new Date() } : {}),
            },
        });

        return res.status(200).json({
            available: updated.available,
        });
    } catch (e) {
        next(e);
    }
});

// PUT /users/me/avatar
router.put(
  '/me/avatar',
  requireRole('regular'),
  upload.single('file'),
  async (req, res, next) => {
    try {
        if (!req.file) {
            return sendError(res, 400, 'Bad Request');
        }

        if (!['image/png', 'image/jpeg'].includes(req.file.mimetype)) {
            return sendError(res, 400, 'Bad Request');
        }

        const filePath = `/uploads/users/${req.file.filename}`;

        await prisma.regularUser.update({
            where: { accountId: req.account.id },
            data: { avatar: filePath },
        });

        return res.status(200).json({
            avatar: filePath,
        });

    } catch (e) {
        next(e);
    }
});

// PUT /users/me/resume (regular)
router.put(
  '/me/resume',
  requireRole('regular'),
  upload.single('file'),
  async (req, res, next) => {
    try {
        if (!req.file) {
            return sendError(res, 400, 'Bad Request');
        }

        if (req.file.mimetype !== 'application/pdf') {
            return sendError(res, 400, 'Bad Request');
        }

        const filePath = `/uploads/users/${req.file.filename}`;

        await prisma.regularUser.update({
            where: { accountId: req.account.id },
            data: { resume: filePath },
        });

        return res.status(200).json({
            resume: filePath,
        });

    } catch (e) {
        next(e);
    }
});

// GET /users/me/invitations
router.get('/me/invitations', requireRole('regular'), async (req, res, next) => {
    try {
        const { valid } = validateNoExtraKeys(req.query || {}, ['page', 'limit']);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const page = req.query.page === undefined ? 1 : Number(req.query.page);
        const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

        if (!Number.isInteger(page) || page < 1) {
            return sendError(res, 400, 'Invalid query');
        }
        if (!Number.isInteger(limit) || limit < 1) {
            return sendError(res, 400, 'Invalid query');
        }

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const regularUserId = account.regularUser.id;

        // Business invited this user to an open job
        const businessInvites = await prisma.interest.findMany({
            where: {
                userId: regularUserId,
                initiatedBy: 'BUSINESS',
                job: {
                    status: 'OPEN',
                },
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
            },
            orderBy: {
                job: {
                    updatedAt: 'desc',
                },
            },
        });

        // If the same user has already expressed interest in that same job,
        // it is no longer an invitation that should appear here.
        const userInterests = await prisma.interest.findMany({
            where: {
                userId: regularUserId,
                initiatedBy: 'USER',
            },
            select: {
                jobId: true,
            },
        });

        const userInterestJobIds = new Set(userInterests.map((i) => i.jobId));

        const filtered = businessInvites.filter(
            (invite) => !userInterestJobIds.has(invite.jobId)
        );

        const count = filtered.length;
        const paginated = filtered.slice((page - 1) * limit, page * limit);

        const results = paginated.map((interest) => ({
            id: interest.job.id,
            status: interest.job.status.toLowerCase(),
            position_type: {
                id: interest.job.positionType.id,
                name: interest.job.positionType.name,
            },
            business: {
                id: interest.job.business.accountId,
                business_name: interest.job.business.businessName,
            },
            salary_min: interest.job.salaryMin,
            salary_max: interest.job.salaryMax,
            start_time: interest.job.startTime.toISOString(),
            end_time: interest.job.endTime.toISOString(),
            updatedAt: interest.job.updatedAt.toISOString(),
        }));

        return res.status(200).json({
            count,
            results,
        });
    } catch (e) {
        next(e);
    }
});

function formatInterestJobPayload(job) {
    return {
        id: job.id,
        status: job.status.toLowerCase(),
        position_type: {
            id: job.positionType.id,
            name: job.positionType.name,
            description: job.positionType.description ?? '',
        },
        business: {
            id: job.business.accountId,
            business_name: job.business.businessName,
        },
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        start_time: job.startTime.toISOString(),
        end_time: job.endTime.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
    };
}

// GET /users/me/interests (regular) — matched, interest shown, and interested-in-you carousels
router.get('/me/interests', requireRole('regular'), async (req, res, next) => {
    try {
        const { valid } = validateNoExtraKeys(req.query || {}, ['page', 'limit']);
        if (!valid) return sendError(res, 400, 'Invalid query');

        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            include: { regularUser: true },
        });

        if (!account || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        const regularUserId = account.regularUser.id;

        const userInterests = await prisma.interest.findMany({
            where: {
                userId: regularUserId,
                initiatedBy: 'USER',
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
            },
            orderBy: {
                job: {
                    updatedAt: 'desc',
                },
            },
        });

        const userJobIds = userInterests.map((i) => i.jobId);

        const businessInterestsOnUserJobs =
            userJobIds.length === 0
                ? []
                : await prisma.interest.findMany({
                      where: {
                          userId: regularUserId,
                          initiatedBy: 'BUSINESS',
                          jobId: { in: userJobIds },
                      },
                      select: { jobId: true },
                  });

        const mutualJobIds = new Set(businessInterestsOnUserJobs.map((i) => i.jobId));

        const businessOnlyInterests = await prisma.interest.findMany({
            where: {
                userId: regularUserId,
                initiatedBy: 'BUSINESS',
                ...(userJobIds.length > 0 ? { jobId: { notIn: userJobIds } } : {}),
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
            },
            orderBy: {
                job: {
                    updatedAt: 'desc',
                },
            },
        });

        const mapUserInterest = (interest, mutual) => ({
            interest_id: interest.id,
            mutual,
            job: formatInterestJobPayload(interest.job),
        });

        const matched = userInterests
            .filter((i) => mutualJobIds.has(i.jobId))
            .map((i) => mapUserInterest(i, true));

        const interest_shown = userInterests
            .filter((i) => !mutualJobIds.has(i.jobId))
            .map((i) => mapUserInterest(i, false));

        const interested_in_you = businessOnlyInterests.map((interest) => ({
            interest_id: interest.id,
            mutual: false,
            job: formatInterestJobPayload(interest.job),
        }));

        const totalCount = matched.length + interest_shown.length + interested_in_you.length;

        return res.status(200).json({
            count: totalCount,
            matched: { count: matched.length, results: matched },
            interest_shown: { count: interest_shown.length, results: interest_shown },
            interested_in_you: { count: interested_in_you.length, results: interested_in_you },
        });
    } catch (e) {
        next(e);
    }
});

// Non-GET on GET /users/me/interests (POST) — 405
router.all('/me/interests', (req, res) => {
    return res.status(405).json({ error: 'Method Not Allowed' });
});

// GET /users/:userId/suspended, PATCH /users/:userId/suspended (admin)
router.get('/:userId/suspended', requireRole('admin'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const id = parseInt(userId, 10);

        if (!Number.isInteger(id) || id < 1) {
            return sendError(res, 400, 'Invalid user id');
        }

        const account = await prisma.account.findUnique({
            where: { id },
            include: { regularUser: true },
        });

        if (!account || account.role !== 'regular' || !account.regularUser) {
            return sendError(res, 404, 'Not Found');
        }

        return res.status(200).json({
            suspended: account.regularUser.suspended,
        });
    } catch (e) {
        next(e);
    }
});

router.patch('/:userId/suspended', requireRole('admin'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      return sendError(res, 400, 'Invalid user id');
    }

    const body = req.body || {};
    const { valid } = validateNoExtraKeys(body, ['suspended']);
    if (!valid) return sendError(res, 400, 'Invalid payload');

    const { suspended } = body;

    if (typeof suspended !== 'boolean') {
      return sendError(res, 400, 'Invalid payload');
    }

    const account = await prisma.account.findUnique({
      where: { id: userId },
      include: { regularUser: true },
    });

    if (!account || account.role !== 'regular' || !account.regularUser) {
      return sendError(res, 404, 'Not Found');
    }

    await prisma.regularUser.update({
      where: { accountId: userId },
      data: { suspended },
    });

    const updated = await prisma.account.findUnique({
      where: { id: userId },
      include: { regularUser: true },
    });

    return res.status(200).json({
      id: updated.id,
      first_name: updated.regularUser.firstName,
      last_name: updated.regularUser.lastName,
      email: updated.email,
      activated: updated.activated,
      suspended: updated.regularUser.suspended,
      role: updated.role,
      phone_number: updated.regularUser.phoneNumber,
      postal_address: updated.regularUser.postalAddress,
    });

  } catch (e) {
    next(e);
  }
});

// TODO: add handlers

module.exports = router;
