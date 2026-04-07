import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import BusinessJobSubnav from '../components/business/BusinessJobSubnav.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getJobById } from '../lib/api.js';

export default function BusinessJobSectionLayout() {
    const { jobId } = useParams();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [jobTitle, setJobTitle] = useState(null);
    const [businessName, setBusinessName] = useState(null);

    useEffect(() => {
        const id = Number(jobId);
        if (!token || !Number.isInteger(id) || id < 1) {
            setJobTitle(null);
            setBusinessName(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const job = await getJobById(token, id);
                if (cancelled) return;
                setJobTitle(job?.position_type?.name || null);
                setBusinessName(job?.business?.business_name || null);
            } catch {
                if (cancelled) return;
                setJobTitle(null);
                setBusinessName(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [jobId, token]);

    const subtitle = pathname.includes('/candidates') ? 'People' : businessName || 'Job overview';

    return (
        <div className="business-job-postings business-job-postings--browse talent-job-detail">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text talent-job-detail__hero-text">
                        <button type="button" className="talent-job-detail__back" onClick={() => navigate(-1)}>
                            ← Back
                        </button>
                        <h1 className="business-jobs-browse__title">{jobTitle || 'Job posting'}</h1>
                        <p className="business-jobs-browse__subtitle">{subtitle}</p>
                    </div>
                </div>
            </header>
            <div className="business-jobs-browse__content">
                <BusinessJobSubnav />
                <div className="talent-profile">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
