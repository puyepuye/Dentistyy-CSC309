import confetti from 'canvas-confetti';

/** Short Outlook-style burst when a negotiation is successfully completed. */
export function celebrateNegotiationSuccess() {
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
