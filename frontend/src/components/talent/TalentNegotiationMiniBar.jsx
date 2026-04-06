import { Link, useLocation } from 'react-router-dom';
import { useTalentNegotiation } from '../../contexts/TalentNegotiationContext.jsx';

function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TalentNegotiationMiniBar() {
    const { pathname } = useLocation();
    const { negotiation, secondsRemaining } = useTalentNegotiation();

    if (!negotiation || negotiation.status !== 'active') return null;
    if (pathname === '/talent/negotiations') return null;
    if (secondsRemaining <= 0) return null;

    return (
        <aside className="talent-neg-mini" role="status" aria-live="polite">
            <span className="talent-neg-mini__timer">{formatClock(secondsRemaining)}</span>
            <p className="talent-neg-mini__text">
                Ongoing negotiation{negotiation.job?.business?.business_name ? ` with ${negotiation.job.business.business_name}` : ''}.
            </p>
            <Link to="/talent/negotiations" className="talent-neg-mini__btn">
                Manage negotiation
            </Link>
        </aside>
    );
}
