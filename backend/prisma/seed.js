/*
 * CSC309 A3 — seeded demo data (password for all accounts: 123123)
 * Run: npm run seed   (from backend/, after prisma migrate)
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
                // Spec: reported availability requires stored available=true; inactivity then clears it on GET.
                // regular1 is the primary demo login — mark available with fresh lastActiveAt so /users/me shows Available.
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

    const statuses = ['created', 'submitted', 'approved', 'rejected', 'revised'];
    for (let u = 0; u < 20; u++) {
        for (let p = 0; p < 3; p++) {
            const ptIndex = (u + p) % positionTypes.length;
            if (u > 15 && p > 0) continue;
            const st = statuses[(u + p) % statuses.length];
            const approved = st === 'approved';
            await prisma.qualification.create({
                data: {
                    regularUserId: regulars[u].regularUser.id,
                    positionTypeId: positionTypes[ptIndex].id,
                    status: st,
                    approved,
                    note: st === 'created' ? '' : `Qualification note for user ${u + 1} / PT ${ptIndex}`,
                    document:
                        st === 'approved' || st === 'submitted'
                            ? `/uploads/users/${regulars[u].account.id}/position_type/${positionTypes[ptIndex].id}/document.pdf`
                            : null,
                },
            });
        }
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

        const workerId =
            status === 'FILLED' || status === 'COMPLETED' ? regulars[j % regulars.length].regularUser.id : null;

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
        take: 20,
    });

    for (let i = 0; i < 8; i++) {
        const job = openJobs[i].id;
        const uid = regulars[i].regularUser.id;
        await prisma.interest.create({ data: { jobId: job, userId: uid, initiatedBy: 'USER' } });
        await prisma.interest.create({ data: { jobId: job, userId: uid, initiatedBy: 'BUSINESS' } });
    }

    for (let i = 0; i < 22; i++) {
        await prisma.interest.create({
            data: {
                jobId: openJobs[i % openJobs.length].id,
                userId: regulars[(i + 11) % 20].regularUser.id,
                initiatedBy: 'USER',
            },
        });
    }

    for (let i = 0; i < 12; i++) {
        await prisma.interest.create({
            data: {
                jobId: openJobs[(i + 3) % openJobs.length].id,
                userId: regulars[(i + 2) % 20].regularUser.id,
                initiatedBy: 'BUSINESS',
            },
        });
    }

    const mutualJob = openJobs[0];
    const mutualUser = regulars[0].regularUser;
    await prisma.negotiation.create({
        data: {
            jobId: mutualJob.id,
            userId: mutualUser.id,
            status: 'PENDING',
            userAccepted: false,
            businessAccepted: false,
        },
    });

    console.log('Seed complete.');
    console.log('  Password for all accounts:', PASSWORD);
    console.log('  Try talent login: regular1@csc309.utoronto.ca');
    console.log('  Business: business1@csc309.utoronto.ca');
    console.log('  Admin: admin1@csc309.utoronto.ca');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
