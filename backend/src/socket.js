'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('./middleware/auth');
const runtimeSystem = require('./config/runtimeSystem');

const prisma = new PrismaClient();

/** @type {Map<number, object[]>} */
const chatHistoryByNegotiation = new Map();
const MAX_MESSAGES_PER_ROOM = 80;
const MAX_MESSAGE_LEN = 2000;

function getWindowSeconds() {
    return runtimeSystem.getNegotiationWindowSeconds();
}

function getExpiresAt(negotiation) {
    return new Date(negotiation.createdAt.getTime() + getWindowSeconds() * 1000);
}

function isExpired(negotiation) {
    return Date.now() >= getExpiresAt(negotiation).getTime();
}

function appendMessage(negotiationId, msg) {
    const list = chatHistoryByNegotiation.get(negotiationId) || [];
    list.push(msg);
    while (list.length > MAX_MESSAGES_PER_ROOM) list.shift();
    chatHistoryByNegotiation.set(negotiationId, list);
}

async function loadNegotiationForSocket(negotiationId) {
    return prisma.negotiation.findUnique({
        where: { id: negotiationId },
        include: {
            job: { include: { business: true } },
            user: true,
        },
    });
}

function canAccessNegotiation(accountId, role, neg) {
    if (!neg || neg.status !== 'PENDING') return false;
    if (isExpired(neg)) return false;
    if (role === 'regular') {
        return neg.user.accountId === accountId;
    }
    if (role === 'business') {
        return neg.job.business.accountId === accountId;
    }
    return false;
}

function attach_sockets(server) {
    const io = new Server(server, { cors: { origin: '*' } });

    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token || typeof token !== 'string') {
            return next(new Error('Unauthorized'));
        }
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (!payload || !payload.id) return next(new Error('Unauthorized'));
            socket.accountId = payload.id;
            next();
        } catch {
            return next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('join_negotiation', async (negotiationId, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};
            const id = Number(negotiationId);
            if (!Number.isInteger(id) || id < 1) {
                return reply({ ok: false, error: 'Invalid negotiation' });
            }

            try {
                const account = await prisma.account.findUnique({
                    where: { id: socket.accountId },
                    include: { regularUser: true, business: true },
                });
                if (!account) return reply({ ok: false, error: 'Unauthorized' });

                const neg = await loadNegotiationForSocket(id);
                const role = account.role;
                if (!canAccessNegotiation(account.id, role, neg)) {
                    return reply({ ok: false, error: 'Forbidden' });
                }

                const room = `negotiation:${id}`;
                await socket.join(room);
                socket.negotiationRoom = room;
                socket.negotiationRole = role === 'regular' ? 'talent' : 'business';

                const history = chatHistoryByNegotiation.get(id) || [];
                reply({ ok: true, history });
            } catch (e) {
                reply({ ok: false, error: 'Server error' });
            }
        });

        socket.on('negotiation_message', async (payload, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};
            const negotiationId = payload && Number(payload.negotiation_id);
            const text = payload && typeof payload.text === 'string' ? payload.text.trim() : '';

            if (!Number.isInteger(negotiationId) || negotiationId < 1) {
                return reply({ ok: false, error: 'Invalid negotiation' });
            }
            if (!text || text.length > MAX_MESSAGE_LEN) {
                return reply({ ok: false, error: 'Invalid message' });
            }

            try {
                const account = await prisma.account.findUnique({
                    where: { id: socket.accountId },
                    include: { regularUser: true, business: true },
                });
                if (!account) return reply({ ok: false, error: 'Unauthorized' });

                const neg = await loadNegotiationForSocket(negotiationId);
                if (!canAccessNegotiation(account.id, account.role, neg)) {
                    return reply({ ok: false, error: 'Forbidden' });
                }

                const from = account.role === 'regular' ? 'talent' : 'business';
                const senderName =
                    account.role === 'regular'
                        ? `${neg.user.firstName} ${neg.user.lastName}`.trim()
                        : neg.job.business.businessName;

                const msg = {
                    id: `${negotiationId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    negotiation_id: negotiationId,
                    from,
                    sender_name: senderName,
                    text,
                    created_at: new Date().toISOString(),
                };
                appendMessage(negotiationId, msg);
                io.to(`negotiation:${negotiationId}`).emit('negotiation_message', msg);
                reply({ ok: true, message: msg });
            } catch {
                reply({ ok: false, error: 'Server error' });
            }
        });

        socket.on('disconnect', () => {});
    });

    return io;
}

module.exports = { attach_sockets };
