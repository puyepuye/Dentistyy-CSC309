'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendError } = require('../utils/errors');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const { validateNoExtraKeys } = require('../utils/validation');


const prisma = new PrismaClient();
const { isPendingNegotiationActive } = require('../utils/negotiationExpiry');

/** Talent browsing counts as “using the app” for activity-based discovery. */
async function bumpTalentLastActive(req) {
    if (req.account?.role !== 'regular') return;
    if (req.account.regularUser?.suspended) return;
    await prisma.regularUser.update({
        where: { accountId: req.account.id },
        data: { lastActiveAt: new Date() },
    });
}

// Ensure non-numeric path segments are treated as non-existent routes (404)
// before auth guards run on parameterized endpoints.
router.param('jobId', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 404, 'Not Found');
  }
  req.jobId = id;
  return next();
});

router.param('userId', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 404, 'Not Found');
  }
  req.userId = id;
  return next();
});
// distance function haversine
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  // eta fucntion 
  function etaMinutes(km) {
    return Math.round((km / 30) * 60); //mins
  }

// GET /jobs (regular list)
router.get('/', requireRole('regular'), async (req, res, next) => {
  try {
    await bumpTalentLastActive(req);

    const { valid } = validateNoExtraKeys(req.query || {}, [
      'lat',
      'lon',
      'position_type_id',
      'business_id',
      'sort',
      'order',
      'page',
      'limit',
      'q',
      'date_from',
      'date_to',
    ]);
    if (!valid) return sendError(res, 400, 'Invalid query');

    const {
      lat,
      lon,
      position_type_id,
      business_id,
      sort = 'start_time',
      order = 'asc',
      page = '1',
      limit = '10',
      q: qRaw,
      date_from: dateFromRaw,
      date_to: dateToRaw,
    } = req.query;

    /** @param {string | undefined} s */
    function parseDateOnlyUtcStart(s) {
      if (s === undefined || typeof s !== 'string') return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      if (!m) return null;
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
      if (Number.isNaN(dt.getTime())) return null;
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
      return dt;
    }

    /** @param {string | undefined} s */
    function parseDateOnlyUtcEnd(s) {
      if (s === undefined || typeof s !== 'string') return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      if (!m) return null;
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      const dt = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
      if (Number.isNaN(dt.getTime())) return null;
      return dt;
    }

    let dateFromDt = null;
    let dateToDt = null;
    if (dateFromRaw !== undefined) {
      if (typeof dateFromRaw !== 'string' || !dateFromRaw.trim()) {
        return sendError(res, 400, 'Invalid query');
      }
      dateFromDt = parseDateOnlyUtcStart(dateFromRaw);
      if (!dateFromDt) return sendError(res, 400, 'Invalid query');
    }
    if (dateToRaw !== undefined) {
      if (typeof dateToRaw !== 'string' || !dateToRaw.trim()) {
        return sendError(res, 400, 'Invalid query');
      }
      dateToDt = parseDateOnlyUtcEnd(dateToRaw);
      if (!dateToDt) return sendError(res, 400, 'Invalid query');
    }
    if (dateFromDt && dateToDt && dateFromDt.getTime() > dateToDt.getTime()) {
      return sendError(res, 400, 'Invalid query');
    }

    let qTrim = '';
    if (qRaw !== undefined) {
      if (typeof qRaw !== 'string') {
        return sendError(res, 400, 'Invalid query');
      }
      qTrim = qRaw.trim().slice(0, 200);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return sendError(res, 400, 'Invalid query');
    }
    if (!Number.isInteger(limitNum) || limitNum < 1) {
      return sendError(res, 400, 'Invalid query');
    }

    const validSortFields = ['updatedAt', 'start_time', 'salary_min', 'salary_max', 'distance', 'eta'];
    const validOrders = ['asc', 'desc'];

    if (!validSortFields.includes(sort)) {
      return sendError(res, 400, 'Invalid query');
    }
    if (!validOrders.includes(order)) {
      return sendError(res, 400, 'Invalid query');
    }

    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;
    const hasCoords = hasLat && hasLon;

    if (hasLat !== hasLon) {
      return sendError(res, 400, 'Invalid query');
    }

    if ((sort === 'distance' || sort === 'eta') && !hasCoords) {
      return sendError(res, 400, 'Invalid query');
    }

    let userLat;
    let userLon;
    if (hasCoords) {
      userLat = Number(lat);
      userLon = Number(lon);
      if (Number.isNaN(userLat) || Number.isNaN(userLon)) {
        return sendError(res, 400, 'Invalid query');
      }
    }

    let positionTypeIdNum;
    if (position_type_id !== undefined) {
      positionTypeIdNum = Number(position_type_id);
      if (!Number.isInteger(positionTypeIdNum) || positionTypeIdNum < 1) {
        return sendError(res, 400, 'Invalid query');
      }
    }

    let businessIdNum;
    if (business_id !== undefined) {
      businessIdNum = Number(business_id);
      if (!Number.isInteger(businessIdNum) || businessIdNum < 1) {
        return sendError(res, 400, 'Invalid query');
      }
    }

    const regularUserId = req.account.regularUser.id;
    const distanceSort = sort === 'distance' || sort === 'eta';

    /** Shift start falls within optional inclusive calendar range (UTC date boundaries). */
    let startTimeWhere = {};
    if (dateFromDt && dateToDt) {
      startTimeWhere = { gte: dateFromDt, lte: dateToDt };
    } else if (dateFromDt) {
      startTimeWhere = { gte: dateFromDt };
    } else if (dateToDt) {
      startTimeWhere = { lte: dateToDt };
    }

    const where = {
      status: 'OPEN',
      positionType: {
        qualifications: {
          some: { regularUserId, approved: true },
        },
      },
      ...(positionTypeIdNum !== undefined && { positionTypeId: positionTypeIdNum }),
      ...(businessIdNum !== undefined && { business: { accountId: businessIdNum } }),
      ...(Object.keys(startTimeWhere).length > 0 && { startTime: startTimeWhere }),
      ...(qTrim.length > 0 && {
        OR: [
          { positionType: { name: { contains: qTrim, mode: 'insensitive' } } },
          { business: { businessName: { contains: qTrim, mode: 'insensitive' } } },
        ],
      }),
    };

    const prismaFieldMap = {
      updatedAt: 'updatedAt',
      start_time: 'startTime',
      salary_min: 'salaryMin',
      salary_max: 'salaryMax',
    };

    const jobs = await prisma.job.findMany({
      where,
      include: {
        positionType: { select: { id: true, name: true, description: true } },
        business: { select: { id: true, accountId: true, businessName: true, lat: true, lon: true } },
      },
      ...(!distanceSort && {
        orderBy: { [prismaFieldMap[sort]]: order },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    });

    let results = jobs.map((job) => {
      const entry = {
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

      if (hasCoords) {
        const distKm = haversineKm(userLat, userLon, job.business.lat, job.business.lon);
        entry.distance = distKm;
        entry.eta = etaMinutes(distKm);
      }

      return entry;
    });

    let count;
    if (distanceSort) {
      results.sort((a, b) =>
        order === 'asc' ? a[sort] - b[sort] : b[sort] - a[sort]
      );
      count = results.length;
      results = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    } else {
      count = await prisma.job.count({ where });
    }

    return res.status(200).json({ count, results });
  } catch (e) {
    next(e);
  }
});

// GET /jobs/:jobId
router.get('/:jobId', requireRole('regular', 'business'), async (req, res, next) => {
  try {
    if (req.account.role === 'regular') {
      await bumpTalentLastActive(req);
    }

    const jobId = Number(req.params.jobId);
    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const { valid } = validateNoExtraKeys(req.query || {}, ['lat', 'lon']);
    if (!valid) return sendError(res, 400, 'Invalid query');

    const { lat, lon } = req.query;
    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;

    if (hasLat !== hasLon) {
      return sendError(res, 400, 'Invalid query');
    }

    const { role } = req.account;
    let regularUserId = req.account.regularUser?.id ?? null;
    const businessId = req.account.business?.id;

    // Ensure we have the RegularUser id (some requests may not hydrate regularUser on req.account).
    if (role === 'regular' && regularUserId == null) {
      const ru = await prisma.regularUser.findUnique({
        where: { accountId: req.account.id },
        select: { id: true },
      });
      regularUserId = ru?.id ?? null;
    }

    if (role === 'business' && (hasLat || hasLon)) {
      return sendError(res, 400, 'Invalid query');
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        positionType: true,
        business: true,
        worker: {
          select: {
            accountId: true,
            firstName: true,
            lastName: true,
          },
        },
        negotiations: {
          where: { status: 'SUCCESSFUL' },
          orderBy: { id: 'asc' },
          include: {
            user: {
              select: { id: true, accountId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!job) {
      return sendError(res, 404, 'Not Found');
    }

    if (role === 'regular' && regularUserId == null) {
      return sendError(res, 403, 'Forbidden');
    }

    if (role === 'business') {
      if (job.businessId !== businessId) {
        return sendError(res, 404, 'Not Found');
      }
    }

    if (role === 'regular') {
      const winningNeg = job.negotiations[0] ?? null;
      const workerRegularUserId = winningNeg?.user?.id ?? job.workerId ?? null;
      const isWorker = workerRegularUserId != null && workerRegularUserId === regularUserId;
      const allowedStatus = ['OPEN', 'FILLED', 'CANCELLED', 'COMPLETED', 'EXPIRED'];

      if (!allowedStatus.includes(job.status)) {
        return sendError(res, 404, 'Not Found');
      }

      if (job.status !== 'OPEN' && !isWorker) {
        return sendError(res, 404, 'Not Found');
      }

      if (job.status === 'OPEN') {
        const qualification = await prisma.qualification.findFirst({
          where: {
            regularUserId,
            positionTypeId: job.positionTypeId,
            approved: true,
          },
        });

        if (!qualification) {
          // Allow pipeline jobs (e.g. business expressed interest first) where the user
          // may not yet pass the discovery qualification gate but already has an Interest row.
          const pipelineInterest = await prisma.interest.findFirst({
            where: { jobId: job.id, userId: regularUserId },
            select: { id: true },
          });
          if (!pipelineInterest) {
            return sendError(res, 403, 'Forbidden');
          }
        }
      }
    }

    const winningNeg = job.negotiations[0] ?? null;
    const workerFromNegotiation = winningNeg
      ? {
          id: winningNeg.user.accountId,
          first_name: winningNeg.user.firstName,
          last_name: winningNeg.user.lastName,
        }
      : null;
    const workerFromJobRow = job.worker
      ? {
          id: job.worker.accountId,
          first_name: job.worker.firstName,
          last_name: job.worker.lastName,
        }
      : null;
    const worker = workerFromNegotiation ?? workerFromJobRow;

    const response = {
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
        postal_address: job.business.postalAddress ?? '',
      },
      worker,
      note: job.note ?? '',
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      start_time: job.startTime.toISOString(),
      end_time: job.endTime.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };

    if (role === 'regular' && regularUserId) {
      const interestRows = await prisma.interest.findMany({
        where: { jobId: job.id, userId: regularUserId },
        select: { id: true, initiatedBy: true },
      });
      const userRow = interestRows.find((r) => String(r.initiatedBy) === 'USER');
      const busRow = interestRows.find((r) => String(r.initiatedBy) === 'BUSINESS');
      response.interest = {
        mutual: !!(userRow && busRow),
        user_interest_id: userRow?.id ?? null,
        business_interest_id: busRow?.id ?? null,
        user_expressed: !!userRow,
        business_expressed: !!busRow,
      };
      const pendingNeg = await prisma.negotiation.findFirst({
        where: { jobId: job.id, userId: regularUserId, status: 'PENDING' },
        select: { id: true, status: true, createdAt: true },
      });
      response.negotiation_pending_id =
        pendingNeg && isPendingNegotiationActive(pendingNeg) ? pendingNeg.id : null;
    }

    if (role === 'regular' && hasLat && hasLon) {
      const userLat = Number(lat);
      const userLon = Number(lon);

      if (Number.isNaN(userLat) || Number.isNaN(userLon)) {
        return sendError(res, 400, 'Invalid query');
      }

      const distKm = haversineKm(userLat, userLon, job.business.lat, job.business.lon);
      response.distance = distKm;
      response.eta = etaMinutes(distKm);
    }

    if (role === 'business') {
      const pendingNeg = await prisma.negotiation.findFirst({
        where: { jobId: job.id, status: 'PENDING' },
        select: { id: true, status: true, createdAt: true },
      });
      response.has_pending_negotiation = pendingNeg != null && isPendingNegotiationActive(pendingNeg);
    }

    return res.status(200).json(response);
  } catch (e) {
    next(e);
  }
});

// PATCH /jobs/:jobId/no-show (business)
router.patch('/:jobId/no-show', requireRole('business'), async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const businessId = req.account.business.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        negotiations: {
          where: { status: 'SUCCESSFUL' },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!job) {
      return sendError(res, 404, 'Not Found');
    }
    if (job.businessId !== businessId) {
      return sendError(res, 403, 'Forbidden');
    }

    const now = new Date();

    if (job.status !== 'FILLED') {
      return sendError(
        res,
        409,
        'No-show can only be recorded while the job is in filled status.',
      );
    }
    if (now < job.startTime) {
      return sendError(res, 409, 'No-show can only be recorded after the shift has started.');
    }
    if (now >= job.endTime) {
      return sendError(res, 409, 'No-show cannot be recorded after the shift has ended.');
    }

    const winningNeg = job.negotiations[0] ?? null;
    const workerRegularUserId = winningNeg?.userId ?? job.workerId;
    if (workerRegularUserId == null) {
      return sendError(res, 409, 'This job has no assigned worker to mark as no-show.');
    }

    const updatedJob = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' },
      });

      await tx.regularUser.update({
        where: { id: workerRegularUserId },
        data: { suspended: true },
      });

      return updated;
    });

    return res.status(200).json({
      id: updatedJob.id,
      status: updatedJob.status.toLowerCase(),
      updatedAt: updatedJob.updatedAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});
  
// PATCH /jobs/:jobId/interested (regular)
router.patch(
    '/:jobId/interested',
    requireRole('regular'),
    async (req, res, next) => {
      try {
        const jobId = Number(req.params.jobId);
        if (!Number.isInteger(jobId) || jobId < 1) {
          return sendError(res, 404, 'Not Found');
        }
  
        let regularUserId = req.account.regularUser?.id ?? null;
        if (regularUserId == null) {
          const ru = await prisma.regularUser.findUnique({
            where: { accountId: req.account.id },
            select: { id: true },
          });
          regularUserId = ru?.id ?? null;
        }
        if (!regularUserId) {
          return sendError(res, 403, 'Forbidden');
        }

        const body = req.body || {};
        const { valid } = validateNoExtraKeys(body, ['interested']);
        if (!valid) return sendError(res, 400, 'Invalid payload');

        const { interested } = body;
        if (typeof interested !== 'boolean') {
            return sendError(res, 400, 'Invalid payload');
        }
  
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          include: {
            business: true,
            interests: {
              where: { userId: regularUserId },
            },
            negotiations: {
              where: { userId: regularUserId, status: 'PENDING' },
            },
          },
        });
  
        if (!job) {
          return sendError(res, 404, 'Job not found.' );
        }

        const now = new Date();
        // Align with PATCH /businesses/me/jobs/:jobId: not "open" once started, even if status row is still OPEN.
        if (job.status !== 'OPEN' || now >= job.startTime) {
          return sendError(res, 409, 'Job is no longer available.');
        }
  
        if (job.negotiations.some((n) => isPendingNegotiationActive(n))) {
          return sendError(res, 409, 'You are currently in a negotiation for this job.' );
        }
  
        const qualification = await prisma.qualification.findFirst({
          where: { regularUserId, positionTypeId: job.positionTypeId, approved: true },
        });

        const existingInterest = job.interests.find((i) => String(i.initiatedBy) === 'USER');

        if (interested === true && !qualification) {
          const hasUserInterest = job.interests.some((i) => String(i.initiatedBy) === 'USER');
          const hasBusinessInterest = job.interests.some((i) => String(i.initiatedBy) === 'BUSINESS');
          const acceptingBusinessOutreach = hasBusinessInterest && !hasUserInterest;
          if (!hasUserInterest && !acceptingBusinessOutreach) {
            return sendError(res, 403, 'You are not qualified for this position type.');
          }
        }
  
        if (interested === false && !existingInterest) {
          return sendError(res, 400, 'You have not expressed interest in this job.' );
        }
  
        let interest;
  
        if (interested === false) {
          await prisma.interest.delete({ where: { id: existingInterest.id } });
          interest = null;
        } else {
          interest = await prisma.interest.upsert({
            where: {
              jobId_userId_initiatedBy: {
                jobId,
                userId: regularUserId,
                initiatedBy: 'USER',
              },
            },
            create: { jobId, userId: regularUserId, initiatedBy: 'USER' },
            update: {},
          });
  
          await prisma.regularUser.update({
            where: { id: regularUserId },
            data: { lastActiveAt: new Date() },
          });
        }
  
        const businessInterest = job.interests.find((i) => String(i.initiatedBy) === 'BUSINESS');
  
        return res.status(200).json({
          id: interest?.id ?? null,
          job_id: jobId,
          candidate: {
            id: regularUserId,
            interested,
          },
          business: {
            id: job.business.accountId,
            interested: businessInterest ? true : null,
          },
        });
      } catch (e) {
        next(e);
      }
    }
  );
  
// GET /jobs/:jobId/candidates
router.get('/:jobId/candidates', requireRole('business'), async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const { valid } = validateNoExtraKeys(req.query || {}, [
      'page',
      'limit',
      'exclude_invited',
      'search',
      'expressed_interest_only',
    ]);
    if (!valid) return sendError(res, 400, 'Invalid query');

    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const searchRaw = req.query.search;
    const searchTerm =
      typeof searchRaw === 'string' && searchRaw.trim().length > 0
        ? searchRaw.trim().slice(0, 120).toLowerCase()
        : '';

    const excludeInvitedRaw = req.query.exclude_invited;
    const excludeInvited = excludeInvitedRaw === 'true' || excludeInvitedRaw === '1';

    const expressedOnlyRaw = req.query.expressed_interest_only;
    const expressedInterestOnly = expressedOnlyRaw === 'true' || expressedOnlyRaw === '1';

    if (!Number.isInteger(page) || page < 1) {
      return sendError(res, 400, 'Invalid query');
    }
    if (!Number.isInteger(limit) || limit < 1) {
      return sendError(res, 400, 'Invalid query');
    }
    if (
      excludeInvitedRaw !== undefined &&
      excludeInvitedRaw !== 'true' &&
      excludeInvitedRaw !== '1' &&
      excludeInvitedRaw !== 'false' &&
      excludeInvitedRaw !== '0'
    ) {
      return sendError(res, 400, 'Invalid query');
    }
    if (
      expressedOnlyRaw !== undefined &&
      expressedOnlyRaw !== 'true' &&
      expressedOnlyRaw !== '1' &&
      expressedOnlyRaw !== 'false' &&
      expressedOnlyRaw !== '0'
    ) {
      return sendError(res, 400, 'Invalid query');
    }
    if (expressedInterestOnly && excludeInvited) {
      return sendError(res, 400, 'Invalid query');
    }

    const businessId = req.account.business?.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        interests: {
          select: { userId: true, initiatedBy: true },
        },
      },
    });

    if (!job || job.businessId !== businessId) {
      return sendError(res, 404, 'Not Found');
    }

    const settings = await prisma.systemSettings.findFirst();
    const availabilityTimeout = settings?.availabilityTimeout ?? 300;
    const cutoff = new Date(Date.now() - availabilityTimeout * 1000);

    const qualifiedUsers = await prisma.regularUser.findMany({
      where: {
        account: {
          activated: true,
        },
        suspended: false,
        lastActiveAt: {
          gte: cutoff,
        },
        qualifications: {
          some: {
            positionTypeId: job.positionTypeId,
            approved: true,
          },
        },
      },
      include: {
        account: true,
        qualifications: {
          where: {
            positionTypeId: job.positionTypeId,
            approved: true,
          },
          select: { note: true },
          take: 1,
        },
        filledJobs: {
          where: {
            status: 'FILLED',
            startTime: { lt: job.endTime },
            endTime: { gt: job.startTime },
          },
          select: { id: true },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    const invitedUserIds = new Set(
      job.interests.filter((i) => i.initiatedBy === 'BUSINESS').map((i) => i.userId)
    );
    const expressedInterestUserIds = new Set(
      job.interests.filter((i) => i.initiatedBy === 'USER').map((i) => i.userId)
    );

    let discoverable = qualifiedUsers.filter((user) => {
      if (user.filledJobs.length > 0) return false;
      if (expressedInterestUserIds.has(user.id)) return false;
      if (excludeInvited && invitedUserIds.has(user.id)) return false;
      return true;
    });

    if (expressedInterestOnly) {
      discoverable = qualifiedUsers.filter(
        (user) => user.filledJobs.length === 0 && expressedInterestUserIds.has(user.id)
      );
    }

    if (searchTerm) {
      discoverable = discoverable.filter((user) => {
        const fn = (user.firstName || '').toLowerCase();
        const ln = (user.lastName || '').toLowerCase();
        const full = `${fn} ${ln}`.trim();
        const qNote = (user.qualifications[0]?.note || '').toLowerCase();
        return (
          full.includes(searchTerm) ||
          qNote.includes(searchTerm) ||
          String(user.accountId).includes(searchTerm)
        );
      });
    }

    const count = discoverable.length;
    const paginated = discoverable.slice((page - 1) * limit, page * limit);

    const results = paginated.map((user) => {
      const qNote = user.qualifications[0]?.note?.trim() || '';
      return {
        id: user.accountId,
        first_name: user.firstName,
        last_name: user.lastName,
        invited: invitedUserIds.has(user.id),
        qualification_summary: qNote.length > 220 ? `${qNote.slice(0, 220)}…` : qNote,
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

// GET /jobs/:jobId/candidates/:userId
router.get('/:jobId/candidates/:userId', requireRole('business'), async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const userId = Number(req.params.userId);

    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }
    if (!Number.isInteger(userId) || userId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const businessId = req.account.business?.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        positionType: true,
        business: true,
        negotiations: {
          where: { status: 'SUCCESSFUL' },
          include: {
            user: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    if (!job || job.businessId !== businessId) {
      return sendError(res, 404, 'Not Found');
    }

    const candidateAccount = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        regularUser: {
          include: {
            qualifications: {
              where: {
                positionTypeId: job.positionTypeId,
                approved: true,
              },
            },
            filledJobs: {
              where: {
                status: 'FILLED',
                startTime: { lt: job.endTime },
                endTime: { gt: job.startTime },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!candidateAccount || !candidateAccount.regularUser) {
      return sendError(res, 404, 'Not Found');
    }

    const candidate = candidateAccount.regularUser;
    const qualification = candidate.qualifications[0] || null;
    const winningNeg = job.negotiations[0] || null;
    const filledByCandidate = winningNeg && winningNeg.userId === candidate.id;
    const assignedWorkerOnJob =
      job.workerId != null &&
      job.workerId === candidate.id &&
      ['FILLED', 'COMPLETED'].includes(job.status);

    const settings = await prisma.systemSettings.findFirst();
    const availabilityTimeout = settings?.availabilityTimeout ?? 300;
    const cutoff = new Date(Date.now() - availabilityTimeout * 1000);

    const discoverable =
      candidateAccount.activated &&
      !candidate.suspended &&
      candidate.lastActiveAt &&
      candidate.lastActiveAt >= cutoff &&
      !!qualification &&
      candidate.filledJobs.length === 0;

    const interestsForPair = await prisma.interest.findMany({
      where: { jobId, userId: candidate.id },
    });
    const businessInterestRow = interestsForPair.find((i) => i.initiatedBy === 'BUSINESS');

    const exceptionVisible =
      (filledByCandidate && ['FILLED', 'COMPLETED'].includes(job.status)) ||
      assignedWorkerOnJob ||
      interestsForPair.length > 0;

    if (!discoverable && !exceptionVisible) {
      return sendError(res, 403, 'Forbidden');
    }

    const response = {
      business_expressed_interest: !!businessInterestRow,
      user: {
        id: candidateAccount.id,
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        avatar: candidate.avatar,
        resume: candidate.resume,
        biography: candidate.biography,
        qualification: qualification
          ? {
              id: qualification.id,
              position_type_id: qualification.positionTypeId,
              document: qualification.document,
              note: qualification.note,
              updatedAt: qualification.updatedAt.toISOString(),
            }
          : null,
      },
      job: {
        id: job.id,
        status: job.status.toLowerCase(),
        position_type: {
          id: job.positionType.id,
          name: job.positionType.name,
          description: job.positionType.description,
        },
        start_time: job.startTime.toISOString(),
        end_time: job.endTime.toISOString(),
      },
    };

    if (filledByCandidate || assignedWorkerOnJob) {
      response.user.email = candidateAccount.email;
      response.user.phone_number = candidate.phoneNumber;
    }

    return res.status(200).json(response);
  } catch (e) {
    next(e);
  }
});

// PATCH /jobs/:jobId/candidates/:userId/interested (business)
router.patch('/:jobId/candidates/:userId/interested', requireRole('business'), async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const userId = Number(req.params.userId);

    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }
    if (!Number.isInteger(userId) || userId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const body = req.body || {};
    const { valid } = validateNoExtraKeys(body, ['interested']);
    if (!valid) return sendError(res, 400, 'Invalid payload');

    const { interested } = body;
    if (typeof interested !== 'boolean') {
      return sendError(res, 400, 'Invalid payload');
    }

    const businessId = req.account.business?.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        business: true,
      },
    });

    if (!job || job.businessId !== businessId) {
      return sendError(res, 404, 'Not Found');
    }

    const nowInterested = new Date();
    if (job.status !== 'OPEN' || nowInterested >= job.startTime) {
      return sendError(res, 409, 'Conflict');
    }

    const candidateAccount = await prisma.account.findUnique({
      where: { id: userId },
      include: {
        regularUser: {
          include: {
            qualifications: {
              where: {
                positionTypeId: job.positionTypeId,
                approved: true,
              },
            },
            filledJobs: {
              where: {
                status: 'FILLED',
                startTime: { lt: job.endTime },
                endTime: { gt: job.startTime },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!candidateAccount || !candidateAccount.regularUser) {
      return sendError(res, 404, 'Not Found');
    }

    const candidate = candidateAccount.regularUser;
    const qualification = candidate.qualifications[0] || null;

    const settings = await prisma.systemSettings.findFirst();
    const availabilityTimeout = settings?.availabilityTimeout ?? 300;
    const cutoff = new Date(Date.now() - availabilityTimeout * 1000);

    const discoverable =
      candidateAccount.activated &&
      !candidate.suspended &&
      candidate.lastActiveAt &&
      candidate.lastActiveAt >= cutoff &&
      !!qualification &&
      candidate.filledJobs.length === 0;

    const userInitiatedInterest = await prisma.interest.findFirst({
      where: {
        jobId,
        userId: candidate.id,
        initiatedBy: 'USER',
      },
    });

    // Allow reciprocating when the talent already tapped this job, even if they are no longer discoverable.
    if (!discoverable && !userInitiatedInterest) {
      return sendError(res, 403, 'Forbidden');
    }

    const existingInterest = await prisma.interest.findFirst({
      where: {
        jobId,
        userId: candidate.id,
        initiatedBy: 'BUSINESS',
      },
    });

    if (interested === false && !existingInterest) {
      return sendError(res, 400, 'Bad Request');
    }

    let interest = existingInterest;

    if (interested === false) {
      await prisma.interest.delete({
        where: { id: existingInterest.id },
      });
      interest = null;
    } else {
      interest = await prisma.interest.upsert({
        where: {
          jobId_userId_initiatedBy: {
            jobId,
            userId: candidate.id,
            initiatedBy: 'BUSINESS',
          },
        },
        create: {
          jobId,
          userId: candidate.id,
          initiatedBy: 'BUSINESS',
        },
        update: {},
      });
    }

    const userInterest = await prisma.interest.findFirst({
      where: {
        jobId,
        userId: candidate.id,
        initiatedBy: 'USER',
      },
    });

    return res.status(200).json({
      id: interest?.id ?? null,
      job_id: job.id,
      candidate: {
        id: candidateAccount.id,
        interested: !!userInterest,
      },
      business: {
        id: job.business.accountId,
        interested: interest !== null,
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /jobs/:jobId/interests (business)
router.get('/:jobId/interests', requireRole('business'), async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isInteger(jobId) || jobId < 1) {
      return sendError(res, 404, 'Not Found');
    }

    const { valid } = validateNoExtraKeys(req.query || {}, ['page', 'limit', 'initiated_by', 'search']);
    if (!valid) return sendError(res, 400, 'Invalid query');

    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const initiatedByRaw =
      req.query.initiated_by === undefined
        ? 'user'
        : Array.isArray(req.query.initiated_by)
        ? req.query.initiated_by[0]
        : req.query.initiated_by;
    const initiatedBy = String(initiatedByRaw).trim().toLowerCase();
    const searchRaw =
      req.query.search === undefined
        ? ''
        : Array.isArray(req.query.search)
        ? req.query.search[0]
        : req.query.search;
    const searchTerm = String(searchRaw || '').trim().toLowerCase().slice(0, 120);

    if (!Number.isInteger(page) || page < 1) {
      return sendError(res, 400, 'Invalid query');
    }
    if (!Number.isInteger(limit) || limit < 1) {
      return sendError(res, 400, 'Invalid query');
    }
    if (!['user', 'business'].includes(initiatedBy)) {
      return sendError(res, 400, 'Invalid query');
    }

    const businessId = req.account.business?.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        business: true,
      },
    });

    if (!job || job.businessId !== businessId) {
      return sendError(res, 404, 'Not Found');
    }

    const userInterests = await prisma.interest.findMany({
      where: {
        jobId,
        initiatedBy: 'USER',
      },
      include: {
        user: {
          include: {
            account: true,
            qualifications: {
              where: {
                positionTypeId: job.positionTypeId,
                approved: true,
              },
              select: {
                note: true,
              },
              take: 1,
            },
            filledJobs: {
              where: {
                status: 'FILLED',
                startTime: { lt: job.endTime },
                endTime: { gt: job.startTime },
              },
              select: { id: true },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    const businessInterests = await prisma.interest.findMany({
      where: {
        jobId,
        initiatedBy: 'BUSINESS',
      },
      include: {
        user: {
          include: {
            account: true,
            qualifications: {
              where: {
                positionTypeId: job.positionTypeId,
                approved: true,
              },
              select: {
                note: true,
              },
              take: 1,
            },
            filledJobs: {
              where: {
                status: 'FILLED',
                startTime: { lt: job.endTime },
                endTime: { gt: job.startTime },
              },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const businessInterestUserIds = new Set(businessInterests.map((i) => i.userId));
    const userInterestUserIds = new Set(userInterests.map((i) => i.userId));
    const settings = await prisma.systemSettings.findFirst();
    const availabilityTimeout = settings?.availabilityTimeout ?? 300;
    const cutoff = new Date(Date.now() - availabilityTimeout * 1000);

    const source = initiatedBy === 'user' ? userInterests : businessInterests;
    const searched = searchTerm
      ? source.filter((interest) => {
          const u = interest.user;
          const full = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
          const note = (u.qualifications[0]?.note || '').toLowerCase();
          return full.includes(searchTerm) || note.includes(searchTerm) || String(u.accountId).includes(searchTerm);
        })
      : source;
    const count = searched.length;
    const paginated = searched.slice((page - 1) * limit, page * limit);

    const results = paginated.map((interest) => {
      const user = interest.user;
      const mutual = businessInterestUserIds.has(interest.userId) && userInterestUserIds.has(interest.userId);
      const hasQual = !!user.qualifications[0];
      const hasOverlap = user.filledJobs.length > 0;
      const isDiscoverable =
        !!user.account.activated &&
        !user.suspended &&
        !!user.available &&
        !!user.lastActiveAt &&
        user.lastActiveAt >= cutoff &&
        hasQual &&
        !hasOverlap;

      let blockReason = null;
      if (!mutual) {
        blockReason = 'Mutual interest not reached yet.';
      } else if (job.status !== 'OPEN') {
        blockReason = `Job is ${job.status.toLowerCase()}.`;
      } else if (!user.account.activated) {
        blockReason = 'Candidate account is not activated.';
      } else if (user.suspended) {
        blockReason = 'Candidate is suspended.';
      } else if (!user.available) {
        blockReason = 'Candidate is unavailable.';
      } else if (!user.lastActiveAt || user.lastActiveAt < cutoff) {
        blockReason = 'Candidate is not recently active.';
      } else if (!hasQual) {
        blockReason = 'Candidate no longer has an approved qualification for this role.';
      } else if (hasOverlap) {
        blockReason = 'Candidate has an overlapping filled shift.';
      }

      return {
        interest_id: interest.id,
        mutual,
        initiated_by: interest.initiatedBy.toLowerCase(),
        negotiation_allowed: mutual && job.status === 'OPEN' && isDiscoverable,
        negotiation_block_reason: blockReason,
        user: {
          id: user.accountId,
          first_name: user.firstName,
          last_name: user.lastName,
          available: !!user.available,
          avatar_url: user.avatar || null,
          qualification_summary: (user.qualifications[0]?.note || '').trim(),
        },
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

// Unsupported methods on /jobs/:jobId — 405
router.all('/:jobId', (req, res) => {
    return res.status(405).json({ error: 'Method Not Allowed' });
});

// Non-GET on GET /jobs only — same idea as negotiations router (router.all('/', 405))
router.all('/', (req, res) => {
    return res.status(405).json({ error: 'Method Not Allowed' });
});

module.exports = router;
