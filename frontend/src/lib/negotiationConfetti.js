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
 * When the active negotiation disappears (GET /negotiations/me → 404) because the other party
 * finished the match, there is no PATCH with status "success" on this client. If the job is now
 * filled, treat it as success and celebrate (same as talent flow when they click Accept second).
 * @param {string} token
 * @param {*} priorNegotiation last known negotiation from this client (must include job.id)
 */
export async function celebrateNegotiationSuccessIfJobFilled(token, priorNegotiation) {
    if (!token || !priorNegotiation?.job?.id) return;
    if (priorNegotiation.status !== 'active') return;
    try {
        const job = await getJobById(token, priorNegotiation.job.id);
        const s = String(job?.status ?? '').toLowerCase();
        if (s === 'filled') {
            celebrateNegotiationSuccess();
        }
    } catch {
        /* ignore */
    }
}
