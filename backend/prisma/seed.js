/*
 * CSC309 A3 — seeded demo data (password for all accounts: 123123)
 * Run: npm run seed   (from backend/, after prisma migrate)
 *
 * Interest rows respect the same rules as the API:
 * - USER interest: user must have an approved qualification for the job’s position type.
 * - BUSINESS interest: candidate must have an approved qualification for that job’s position type.
 */
'use strict';

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PASSWORD = '123123';

function daysFromNow(days, hours = 14) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    return d;
}

function daysFromNowEnd(days) {
    const s = daysFromNow(days, 9);
    const e = new Date(s);
    e.setHours(17, 0, 0, 0);
    return e;
}

async function wipe() {
    await prisma.negotiation.deleteMany();
    await prisma.interest.deleteMany();
    await prisma.job.deleteMany();
    await prisma.qualification.deleteMany();
    await prisma.regularUser.deleteMany();
    await prisma.business.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.account.deleteMany();
    await prisma.positionType.deleteMany();
    await prisma.systemSettings.deleteMany();
}

async function main() {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    await wipe();

    // Seconds of inactivity after which GET /users/me reports available: false (handout + jobs discoverability).
    await prisma.systemSettings.create({
        data: { availabilityTimeout: 300 },
    });

    const positionTypeData = [
        ['Dental Assistant (Level 1)', 'Entry-level chairside support.', false],
        ['Dental Assistant (Level 2)', 'Expanded scope dental assisting.', false],
        ['Dental Hygienist', 'Preventive care and cleaning.', false],
        ['Orthodontist', 'Braces and alignment treatment.', true],
        ['General Dentist', 'Comprehensive oral health.', false],
        ['Oral Surgeon', 'Surgical extractions and procedures.', true],
        ['Pediatric Dentist', 'Children and adolescent dentistry.', false],
        ['Endodontist', 'Root canal therapy.', true],
        ['Periodontist', 'Gum disease and implants.', false],
        ['Prosthodontist', 'Crowns, bridges, dentures.', true],
        ['Dental Receptionist', 'Front desk and scheduling.', false],
        ['Sterilization Tech', 'Instrument processing.', false],
    ];

    const positionTypes = [];
    for (const [name, description, hidden] of positionTypeData) {
        positionTypes.push(
            await prisma.positionType.create({
                data: { name, description, hidden },
            })
        );
    }

    /** @type {{ account: import('@prisma/client').Account, regularUser: import('@prisma/client').RegularUser }[]} */
    const regulars = [];

    for (let i = 1; i <= 20; i++) {
        const account = await prisma.account.create({
            data: {
                email: `regular${i}@csc309.utoronto.ca`,
                passwordHash,
                role: 'regular',
                activated: true,
                resetToken: null,
                resetExpiresAt: null,
            },
        });
        const regularUser = await prisma.regularUser.create({
            data: {
                accountId: account.id,
                firstName: `First${i}`,
                lastName: `Last${i}`,
                phoneNumber: `416-555-${String(1000 + i).slice(-4)}`,
                postalAddress: `${10 + i} College St, Toronto, ON M5T 1K${i % 10}`,
                birthday: `199${i % 10}-0${(i % 9) + 1}-15`,
                suspended: i === 19,
                // DB `available` is legacy; discovery uses lastActiveAt + admin availability window.
                available: i === 1 || i % 4 === 0,
                lastActiveAt: new Date(),
                biography:
                    i === 1
                        ? 'Experienced dental assistant with a passion for patient care and clinical excellence. Comfortable chairside in general and orthodontic settings.'
                        : `Professional ${i} — focused on quality care and flexible scheduling.`,
                avatar: null,
                resume: i <= 5 ? `/uploads/users/${account.id}/resume.pdf` : null,
            },
        });
        regulars.push({ account, regularUser });
    }

    /** @type {{ account: import('@prisma/client').Account, business: import('@prisma/client').Business }[]} */
    const businesses = [];

    for (let i = 1; i <= 10; i++) {
        const account = await prisma.account.create({
            data: {
                email: `business${i}@csc309.utoronto.ca`,
                passwordHash,
                role: 'business',
                activated: true,
                resetToken: null,
                resetExpiresAt: null,
            },
        });
        const lat = 43.65 + i * 0.01;
        const lon = -79.38 - i * 0.01;
        const business = await prisma.business.create({
            data: {
                accountId: account.id,
                businessName: `Clinic ${i} — ${['Smile', 'Harbour', 'Campus', 'Queen', 'King'][i % 5]} Dental`,
                ownerName: `Owner ${i}`,
                phoneNumber: `416-978-${String(1000 + i).slice(-4)}`,
                postalAddress: `${40 + i} St George St, Toronto, ON`,
                lat,
                lon,
                verified: i <= 8,
                biography: `Serving downtown since ${2000 + i}. Modern equipment and friendly staff.`,
            },
        });
        businesses.push({ account, business });
    }

    const adminAcc = await prisma.account.create({
        data: {
            email: 'admin1@csc309.utoronto.ca',
            passwordHash,
            role: 'admin',
            activated: true,
            resetToken: null,
            resetExpiresAt: null,
        },
    });
    await prisma.admin.create({
        data: {
            accountId: adminAcc.id,
            utorid: 'admin001',
        },
    });

    /** @type {Map<number, Set<number>>} regularUserId -> set of positionTypeIds with approved qualification */
    const approvedPositionTypesByUser = new Map();
    for (const r of regulars) {
        approvedPositionTypesByUser.set(r.regularUser.id, new Set());
    }

    const statuses = ['created', 'submitted', 'approved', 'rejected', 'revised'];
    for (let u = 0; u < 20; u++) {
        for (let p = 0; p < 3; p++) {
            const ptIndex = (u + p) % positionTypes.length;
            if (u > 15 && p > 0) continue;
            const st = statuses[(u + p) % statuses.length];
            const approved = st === 'approved';
            const ruId = regulars[u].regularUser.id;
            const ptId = positionTypes[ptIndex].id;
            await prisma.qualification.create({
                data: {
                    regularUserId: ruId,
                    positionTypeId: ptId,
                    status: st,
                    approved,
                    note: st === 'created' ? '' : `Qualification note for user ${u + 1} / PT ${ptIndex}`,
                    document:
                        st === 'approved' || st === 'submitted'
                            ? `/uploads/users/${regulars[u].account.id}/position_type/${ptId}/document.pdf`
                            : null,
                },
            });
            if (approved) {
                approvedPositionTypesByUser.get(ruId).add(ptId);
            }
        }
    }

    function userApprovedForJobPosition(regularUserId, positionTypeId) {
        return approvedPositionTypesByUser.get(regularUserId)?.has(positionTypeId) ?? false;
    }

    /** @param {{ positionTypeId: number }} job */
    function firstRegularQualifiedForJob(job) {
        for (const r of regulars) {
            if (userApprovedForJobPosition(r.regularUser.id, job.positionTypeId)) {
                return r.regularUser;
            }
        }
        return null;
    }

    const jobs = [];
    const jobStatuses = ['OPEN', 'OPEN', 'OPEN', 'EXPIRED', 'FILLED', 'CANCELLED', 'COMPLETED', 'OPEN'];
    for (let j = 0; j < 35; j++) {
        const b = businesses[j % businesses.length].business;
        const pt = positionTypes[j % positionTypes.length];
        const status = jobStatuses[j % jobStatuses.length];
        const start = daysFromNow(3 + (j % 10), 10 + (j % 5));
        const end = new Date(start);
        end.setHours(end.getHours() + 8);

        // Only assign workers on FILLED/COMPLETED jobs when someone is qualified for this position type.
        const qualifiedWorker = firstRegularQualifiedForJob({ positionTypeId: pt.id });
        const workerId =
            status === 'FILLED' || status === 'COMPLETED' ? qualifiedWorker?.id ?? null : null;

        const job = await prisma.job.create({
            data: {
                status,
                positionTypeId: pt.id,
                businessId: b.id,
                workerId,
                note: j % 4 === 0 ? 'Weekend coverage preferred.' : 'Weekday shift.',
                salaryMin: 22 + (j % 8),
                salaryMax: 32 + (j % 10),
                startTime: status === 'EXPIRED' ? daysFromNow(-2, 9) : start,
                endTime: status === 'EXPIRED' ? daysFromNow(-2, 17) : end,
            },
        });
        jobs.push(job);
    }

    const openJobs = await prisma.job.findMany({
        where: { status: 'OPEN' },
        take: 24,
        orderBy: { id: 'asc' },
    });

    /** @type {Set<string>} `${jobId}:${userId}:${'USER'|'BUSINESS'}` */
    const interestKeys = new Set();

    function interestKey(jobId, userId, role) {
        return `${jobId}:${userId}:${role}`;
    }

    async function addInterestIfEligible(jobId, userId, initiatedBy) {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { positionTypeId: true },
        });
        if (!job) return false;
        if (!userApprovedForJobPosition(userId, job.positionTypeId)) return false;
        const k = interestKey(jobId, userId, initiatedBy);
        if (interestKeys.has(k)) return false;
        await prisma.interest.create({
            data: { jobId, userId, initiatedBy },
        });
        interestKeys.add(k);
        return true;
    }

    // Matched pairs: USER + BUSINESS for same (job, user), user qualified for job.positionTypeId
    let mutualCount = 0;
    for (let i = 0; i < openJobs.length && mutualCount < 8; i++) {
        const job = openJobs[i];
        const user = firstRegularQualifiedForJob(job);
        if (!user) continue;
        await addInterestIfEligible(job.id, user.id, 'USER');
        await addInterestIfEligible(job.id, user.id, 'BUSINESS');
        mutualCount++;
    }

    // Extra USER-only interests (user qualified for that job’s position type)
    let userOnlyTarget = 22;
    let userOnly = 0;
    for (const job of openJobs) {
        if (userOnly >= userOnlyTarget) break;
        for (const r of regulars) {
            if (userOnly >= userOnlyTarget) break;
            const ok = await addInterestIfEligible(job.id, r.regularUser.id, 'USER');
            if (ok) userOnly++;
        }
    }

    // BUSINESS-only outreach (business expressed to qualified users only)
    let bizOnlyTarget = 12;
    let bizOnly = 0;
    for (const job of openJobs) {
        if (bizOnly >= bizOnlyTarget) break;
        for (const r of regulars) {
            if (bizOnly >= bizOnlyTarget) break;
            const kUser = interestKey(job.id, r.regularUser.id, 'USER');
            if (interestKeys.has(kUser)) continue;
            const ok = await addInterestIfEligible(job.id, r.regularUser.id, 'BUSINESS');
            if (ok) bizOnly++;
        }
    }

    // Three dedicated OPEN jobs for regular1 — Matched / Interest shown / Interested in you
    const r1 = regulars[0].regularUser;
    const demoBiz = businesses[0].business;
    const demoPt = positionTypes[2];
    function demoWindow(dayOffset) {
        const start = daysFromNow(dayOffset, 10);
        const end = new Date(start);
        end.setHours(17, 0, 0, 0);
        return { start, end };
    }
    const w1 = demoWindow(5);
    const jobMatchedDemo = await prisma.job.create({
        data: {
            status: 'OPEN',
            positionTypeId: demoPt.id,
            businessId: demoBiz.id,
            salaryMin: 32,
            salaryMax: 48,
            startTime: w1.start,
            endTime: w1.end,
            note: '[Demo] Matched — mutual interest',
        },
    });
    const w2 = demoWindow(6);
    const jobShownDemo = await prisma.job.create({
        data: {
            status: 'OPEN',
            positionTypeId: demoPt.id,
            businessId: demoBiz.id,
            salaryMin: 28,
            salaryMax: 40,
            startTime: w2.start,
            endTime: w2.end,
            note: '[Demo] Interest shown — you only',
        },
    });
    const w3 = demoWindow(7);
    const jobReachDemo = await prisma.job.create({
        data: {
            status: 'OPEN',
            positionTypeId: demoPt.id,
            businessId: demoBiz.id,
            salaryMin: 35,
            salaryMax: 52,
            startTime: w3.start,
            endTime: w3.end,
            note: '[Demo] Interested in you — practice only',
        },
    });

    if (!userApprovedForJobPosition(r1.id, demoPt.id)) {
        throw new Error('Seed invariant: regular1 must be approved for demo position type (Dental Hygienist).');
    }

    const demoRows = [
        { jobId: jobMatchedDemo.id, userId: r1.id, initiatedBy: 'USER' },
        { jobId: jobMatchedDemo.id, userId: r1.id, initiatedBy: 'BUSINESS' },
        { jobId: jobShownDemo.id, userId: r1.id, initiatedBy: 'USER' },
        { jobId: jobReachDemo.id, userId: r1.id, initiatedBy: 'BUSINESS' },
    ];
    for (const row of demoRows) {
        const k = interestKey(row.jobId, row.userId, row.initiatedBy);
        if (!interestKeys.has(k)) {
            await prisma.interest.create({ data: row });
            interestKeys.add(k);
        }
    }

    const mutualJob = openJobs[0];
    const negUser = firstRegularQualifiedForJob(mutualJob);
    if (negUser) {
        await prisma.negotiation.create({
            data: {
                jobId: mutualJob.id,
                userId: negUser.id,
                status: 'PENDING',
                userAccepted: false,
                businessAccepted: false,
            },
        });
    }

    console.log('Seed complete.');
    console.log('  Password for all accounts:', PASSWORD);
    console.log('  Try talent login: regular1@csc309.utoronto.ca');
    console.log('  Interests only where users have approved qualifications for that job’s position type.');
    console.log('  regular1 has demo interests (Matched / Interest shown / Interested in you) on Manage Job Interests.');
    console.log('  Business: business1@csc309.utoronto.ca');
    console.log('  Admin: admin1@csc309.utoronto.ca');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
