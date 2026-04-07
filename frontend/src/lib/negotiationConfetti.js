import confetti from 'canvas-confetti';
import { getJobById } from './api.js';

/** Avoid double bursts when PATCH returns success and the next poll also detects completion. */
let lastNegotiationCelebrationMs = 0;
const CELEBRATION_DEBOUNCE_MS = 1600;

/** Short Outlook-style burst when a negotiation is successfully completed. */
export function celebrateNegotiationSuccess() {
    const now = Date.now();
    if (now - lastNegotiationCelebrationMs < CELEBRATION_DEBOUNCE_MS) return;
    lastNegotiationCelebrationMs = now;

    const base = { zIndex: 1200, disableForReducedMotion: true };

    confetti({
        ...base,
        particleCount: 110,
        spread: 72,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.58 },
        colors: ['#59a897', '#3d7068', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#34d399'],
    });

    setTimeout(() => {
        confetti({
            ...base,
            particleCount: 55,
            angle: 60,
            spread: 50,
            origin: { x: 0.12, y: 0.68 },
            colors: ['#59a897', '#fbbf24', '#60a5fa'],
        });
    }, 180);

    setTimeout(() => {
        confetti({
            ...base,
            particleCount: 55,
            angle: 120,
            spread: 50,
            origin: { x: 0.88, y: 0.68 },
            colors: ['#3d7068', '#f472b6', '#a78bfa'],
        });
    }, 320);
}

/**
 * When the active negotiation disappears (GET /negotiations/me → 404), inspect the job to infer
 * whether it ended as a confirmed match or simply closed without success.
 * @param {string} token
 * @param {*} priorNegotiation last known negotiation from this client (must include job.id)
 */
export async function getClosedNegotiationNotice(token, priorNegotiation) {
    if (!token || !priorNegotiation?.job?.id) return null;
    if (priorNegotiation.status !== 'active') return null;
    const expiredByTime =
        priorNegotiation.expiresAt &&
        Date.now() >= new Date(priorNegotiation.expiresAt).getTime();
    try {
        const job = await getJobById(token, priorNegotiation.job.id);
        const s = String(job?.status ?? '').toLowerCase();
        if (s === 'filled') {
            return {
                tone: 'success',
                title: 'Match confirmed',
                body: 'The other side accepted. This shift has been confirmed successfully and it has been added to Scheduled.',
            };
        }
        if (expiredByTime) {
            return {
                tone: 'danger',
                title: 'Negotiation expired',
                body: 'The negotiation window ended before both sides agreed. You can edit the posting again or start a new negotiation when there is mutual interest.',
            };
        }
        return {
            tone: 'danger',
            title: 'Negotiation ended',
            body: 'This negotiation was declined or cancelled. The posting is open again for edits and new interest.',
        };
    } catch {
        return null;
    }
}
