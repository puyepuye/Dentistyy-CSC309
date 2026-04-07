'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { requireRole } = require('../middleware/auth');
const { validateNoExtraKeys } = require('../utils/validation');
const { emitNegotiationStatus } = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();
const {
    getExpiresAt,
    isNegotiationExpired,
    getNegotiationWindowSeconds,
} = require('../utils/negotiationExpiry');

function toDecisionLabel(value) {
    return value ? 'accept' : null;
}

function toNegotiationResponse(negotiation, windowSeconds) {
    const expiresAt = getExpiresAt(negotiation, windowSeconds);
    return {
        id: negotiation.id,
        negotiation_window_seconds: windowSeconds,
        status: negotiation.status === 'PENDING'
            ? 'active'
            : negotiation.status === 'SUCCESSFUL'
                ? 'success'
                : 'failed',
        createdAt: negotiation.createdAt.toISOString(),
        // Schema has no updatedAt, so we mirror createdAt for response shape.
        updatedAt: negotiation.createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        job: {
            id: negotiation.job.id,
            status: negotiation.job.status.toLowerCase(),
            position_type: {
                id: negotiation.job.positionType.id,
                name: negotiation.job.positionType.name,
            },
            business: {
                id: negotiation.job.business.accountId,
                business_name: negotiation.job.business.businessName,
            },
            salary_min: negotiation.job.salaryMin,
            salary_max: negotiation.job.salaryMax,
            start_time: negotiation.job.startTime.toISOString(),
            end_time: negotiation.job.endTime.toISOString(),
            updatedAt: negotiation.job.updatedAt.toISOString(),
        },
        user: {
            id: negotiation.user.accountId,
            first_name: negotiation.user.firstName,
            last_name: negotiation.user.lastName,
        },
        decisions: {
            // false in schema means "no decision yet" for active negotiations.
            candidate: negotiation.status === 'PENDING'
                ? toDecisionLabel(negotiation.userAccepted)
                : toDecisionLabel(negotiation.userAccepted),
            business: negotiation.status === 'PENDING'
                ? toDecisionLabel(negotiation.businessAccepted)
                : toDecisionLabel(negotiation.businessAccepted),
        },
    };
}

async function getActiveNegotiationForAccount(accountId, role) {
    const where = role === 'regular'
        ? { user: { accountId } }
        : { job: { business: { accountId } } };

    return prisma.negotiation.findFirst({
        where: {
            status: 'PENDING',
            ...where,
        },
        include: {
            job: {
                include: {
                    positionType: true,
                    business: true,
                },
            },
            user: true,
        },
        orderBy: { id: 'desc' },
    });
}

/**
 * @returns {Promise<string|null>} Error message if the candidate cannot negotiate, or null if OK.
 */
async function getDiscoverabilityFailureReason(user, account, job) {
    const settings = await prisma.systemSettings.findFirst();
    const availabilityTimeout = settings?.availabilityTimeout ?? 300;
    const cutoff = new Date(Date.now() - availabilityTimeout * 1000);

    if (!account.activated) {
        return 'Your account is not activated.';
    }
    if (user.suspended) {
        return 'Your account is suspended.';
    }
    if (!user.lastActiveAt || user.lastActiveAt < cutoff) {
        return (
            'You must have used the app recently (within the admin availability window) to negotiate. ' +
            'Open jobs or your profile, then try again.'
        );
    }

    const approvedQualification = await prisma.qualification.findFirst({
        where: {
            regularUserId: user.id,
            positionTypeId: job.positionTypeId,
            approved: true,
        },
    });
    if (!approvedQualification) {
        return 'You need an approved qualification for this job’s position type to start a negotiation.';
    }

    const overlappingFilledJob = await prisma.job.findFirst({
        where: {
            workerId: user.id,
            status: 'FILLED',
            startTime: { lt: job.endTime },
            endTime: { gt: job.startTime },
        },
    });
    if (overlappingFilledJob) {
        return 'You have another filled shift that overlaps this job’s time.';
    }

    return null;
}

// GET /negotiations/window — current negotiation timer length (seconds), for UI copy before starting
router.get('/window', requireRole('regular', 'business'), (req, res) => {
    return res.status(200).json({
        negotiation_window_seconds: getNegotiationWindowSeconds(),
    });
});

// POST /negotiations, GET /negotiations/me, PATCH /negotiations/me/decision
router.post('/', requireRole('regular', 'business'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['interest_id']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { interest_id } = body;
        if (!Number.isInteger(interest_id) || interest_id < 1) {
            return sendError(res, 400, 'Invalid payload');
        }

        const interest = await prisma.interest.findUnique({
            where: { id: interest_id },
            include: {
                user: { include: { account: true } },
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
            },
        });
        if (!interest) return sendError(res, 404, 'Not Found');

        const isCandidate = req.account.role === 'regular' && interest.user.accountId === req.account.id;
        const isBusiness = req.account.role === 'business' && interest.job.business.accountId === req.account.id;
        if (!isCandidate && !isBusiness) return sendError(res, 404, 'Not Found');

        const mutualInterest = await prisma.interest.findMany({
            where: {
                jobId: interest.jobId,
                userId: interest.userId,
                initiatedBy: { in: ['USER', 'BUSINESS'] },
            },
        });
        const hasUser = mutualInterest.some((i) => i.initiatedBy === 'USER');
        const hasBusiness = mutualInterest.some((i) => i.initiatedBy === 'BUSINESS');
        if (!hasUser || !hasBusiness) {
            return sendError(
                res,
                403,
                'Mutual interest from both you and the practice is required before starting a negotiation.'
            );
        }

        // Candidate clicking “start negotiation” counts as app activity for the activity window.
        if (req.account.role === 'regular' && isCandidate && !req.account.regularUser?.suspended) {
            await prisma.regularUser.update({
                where: { accountId: req.account.id },
                data: { lastActiveAt: new Date() },
            });
            interest.user = await prisma.regularUser.findUnique({
                where: { id: interest.userId },
                include: { account: true },
            });
        }

        const discoverFail = await getDiscoverabilityFailureReason(
            interest.user,
            interest.user.account,
            interest.job
        );
        if (discoverFail) {
            return sendError(res, 403, discoverFail);
        }

        if (interest.job.status !== 'OPEN') {
            return sendError(res, 409, 'Conflict');
        }

        const windowSeconds = getNegotiationWindowSeconds();
        const existingForInterest = await prisma.negotiation.findFirst({
            where: {
                jobId: interest.jobId,
                userId: interest.userId,
                status: 'PENDING',
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
                user: true,
            },
            orderBy: { id: 'desc' },
        });

        if (existingForInterest && !isNegotiationExpired(existingForInterest, windowSeconds)) {
            return res.status(200).json(toNegotiationResponse(existingForInterest, windowSeconds));
        }

        const activeForUser = await prisma.negotiation.findFirst({
            where: {
                status: 'PENDING',
                userId: interest.userId,
            },
        });
        if (activeForUser && !isNegotiationExpired(activeForUser, windowSeconds)) {
            return sendError(res, 409, 'You already have an ongoing negotiation.');
        }

        const activeForBusiness = await prisma.negotiation.findFirst({
            where: {
                status: 'PENDING',
                job: { businessId: interest.job.businessId },
            },
            include: { job: true },
        });
        if (activeForBusiness && !isNegotiationExpired(activeForBusiness, windowSeconds)) {
            const busyMsg =
                req.account.role === 'business'
                    ? 'Your practice already has an ongoing negotiation.'
                    : 'This practice already has an ongoing negotiation.';
            return sendError(res, 409, busyMsg);
        }

        const created = await prisma.negotiation.create({
            data: {
                status: 'PENDING',
                userAccepted: false,
                businessAccepted: false,
                userId: interest.userId,
                jobId: interest.jobId,
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
                user: true,
            },
        });

        return res.status(201).json(toNegotiationResponse(created, windowSeconds));
    } catch (e) {
        next(e);
    }
});

router.get('/me', requireRole('regular', 'business'), async (req, res, next) => {
    try {
        if (req.account.role === 'regular' && !req.account.regularUser?.suspended) {
            await prisma.regularUser.update({
                where: { accountId: req.account.id },
                data: { lastActiveAt: new Date() },
            });
        }

        const negotiation = await getActiveNegotiationForAccount(req.account.id, req.account.role);
        if (!negotiation) return sendError(res, 404, 'Not Found');

        const windowSeconds = getNegotiationWindowSeconds();
        if (isNegotiationExpired(negotiation, windowSeconds)) {
            await prisma.$transaction(async (tx) => {
                await tx.negotiation.update({
                    where: { id: negotiation.id },
                    data: { status: 'REJECTED' },
                });
                await tx.interest.deleteMany({
                    where: { jobId: negotiation.jobId, userId: negotiation.userId },
                });
            });
            return sendError(res, 404, 'Not Found');
        }

        return res.status(200).json(toNegotiationResponse(negotiation, windowSeconds));
    } catch (e) {
        next(e);
    }
});

router.patch('/me/decision', requireRole('regular', 'business'), async (req, res, next) => {
    try {
        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['decision', 'negotiation_id']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { decision, negotiation_id } = body;
        if (!['accept', 'decline'].includes(decision)) return sendError(res, 400, 'Invalid payload');
        if (!Number.isInteger(negotiation_id) || negotiation_id < 1) {
            return sendError(res, 400, 'Invalid payload');
        }

        const negotiation = await prisma.negotiation.findUnique({
            where: { id: negotiation_id },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
                user: true,
            },
        });
        if (!negotiation) return sendError(res, 404, 'Not Found');

        const involved = req.account.role === 'regular'
            ? negotiation.user.accountId === req.account.id
            : negotiation.job.business.accountId === req.account.id;
        if (!involved) return sendError(res, 404, 'Not Found');

        const activeNegotiation = await getActiveNegotiationForAccount(req.account.id, req.account.role);
        if (!activeNegotiation) return sendError(res, 404, 'Not Found');
        if (activeNegotiation.id !== negotiation_id) return sendError(res, 409, 'Conflict');
        if (negotiation.status !== 'PENDING') return sendError(res, 409, 'Conflict');

        const windowSeconds = getNegotiationWindowSeconds();
        if (isNegotiationExpired(negotiation, windowSeconds)) {
            return sendError(res, 409, 'Conflict');
        }

        // If job changed after negotiation started, reset decisions first.
        if (
            negotiation.job.updatedAt.getTime() > negotiation.createdAt.getTime() &&
            (negotiation.userAccepted || negotiation.businessAccepted)
        ) {
            await prisma.negotiation.update({
                where: { id: negotiation.id },
                data: {
                    userAccepted: false,
                    businessAccepted: false,
                },
            });
            negotiation.userAccepted = false;
            negotiation.businessAccepted = false;
        }

        const isRegular = req.account.role === 'regular';
        const nextUserAccepted = isRegular
            ? decision === 'accept'
            : negotiation.userAccepted;
        const nextBusinessAccepted = isRegular
            ? negotiation.businessAccepted
            : decision === 'accept';

        let nextStatus = 'PENDING';
        if (decision === 'decline') {
            nextStatus = 'REJECTED';
        } else if (nextUserAccepted && nextBusinessAccepted) {
            nextStatus = 'SUCCESSFUL';
        }

        await prisma.$transaction(async (tx) => {
            await tx.negotiation.update({
                where: { id: negotiation.id },
                data: {
                    userAccepted: nextUserAccepted,
                    businessAccepted: nextBusinessAccepted,
                    status: nextStatus,
                },
            });

            if (nextStatus === 'SUCCESSFUL') {
                await tx.job.update({
                    where: { id: negotiation.jobId },
                    data: {
                        status: 'FILLED',
                        workerId: negotiation.userId,
                    },
                });
            } else if (nextStatus === 'REJECTED') {
                await tx.interest.deleteMany({
                    where: {
                        jobId: negotiation.jobId,
                        userId: negotiation.userId,
                    },
                });
            }

            await tx.regularUser.update({
                where: { id: negotiation.userId },
                data: {
                    lastActiveAt: new Date(),
                },
            });
        });

        const fresh = await prisma.negotiation.findUnique({
            where: { id: negotiation.id },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true,
                    },
                },
                user: true,
            },
        });

        const response = toNegotiationResponse(fresh, windowSeconds);

        if (decision === 'decline') {
            if (isRegular) {
                response.decisions.candidate = 'decline';
            } else {
                response.decisions.business = 'decline';
            }
        }

        emitNegotiationStatus(negotiation.id, response);

        return res.status(200).json(response);
    } catch (e) {
        next(e);
    }
});

router.all('/', (req, res) => res.sendStatus(405));
router.all('/window', (req, res) => res.sendStatus(405));
router.all('/me', (req, res) => res.sendStatus(405));
router.all('/me/decision', (req, res) => res.sendStatus(405));

module.exports = router;
