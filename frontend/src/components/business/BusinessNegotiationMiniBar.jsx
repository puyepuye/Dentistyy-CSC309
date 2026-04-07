import { Link, useLocation } from 'react-router-dom';
import { useBusinessNegotiation } from '../../contexts/BusinessNegotiationContext.jsx';

function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BusinessNegotiationMiniBar() {
    const { pathname } = useLocation();
    const { negotiation, secondsRemaining } = useBusinessNegotiation();

    if (!negotiation || negotiation.status !== 'active') return null;
    if (pathname === '/businesses/negotiations') return null;
    if (secondsRemaining <= 0) return null;

    const candidate =
        `${negotiation.user?.first_name ?? ''} ${negotiation.user?.last_name ?? ''}`.trim() || 'candidate';

    return (
        <aside className="talent-neg-mini" role="status" aria-live="polite">
            <span className="talent-neg-mini__timer">{formatClock(secondsRemaining)}</span>
            <p className="talent-neg-mini__text">Ongoing negotiation with {candidate}.</p>
            <Link to="/businesses/negotiations" className="talent-neg-mini__btn">
                Manage negotiation
            </Link>
        </aside>
    );
}
