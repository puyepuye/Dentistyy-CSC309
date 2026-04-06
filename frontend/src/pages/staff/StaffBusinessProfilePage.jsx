import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { assetUrl, getBusinessById, getOpenJobs } from '../../lib/api.js';
import { JobCard } from './StaffJobsPage.jsx';

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;
const PAGE_SIZE = 9;

export default function StaffBusinessProfilePage() {
    const { businessId: businessIdParam } = useParams();
    const { token } = useAuth();
    const businessId = Number(businessIdParam);
    const [tab, setTab] = useState('about');

    const [business, setBusiness] = useState(null);
    const [businessError, setBusinessError] = useState(null);
    const [businessLoading, setBusinessLoading] = useState(true);

    const [lat, setLat] = useState(DEFAULT_LAT);
    const [lon, setLon] = useState(DEFAULT_LON);
    const [jobsPage, setJobsPage] = useState(1);
    const [jobsData, setJobsData] = useState({ count: 0, results: [] });
    const [jobsLoading, setJobsLoading] = useState(false);
    const [jobsError, setJobsError] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!Number.isInteger(businessId) || businessId < 1) {
                setBusiness(null);
                setBusinessError('Practice not found.');
                setBusinessLoading(false);
                return;
            }
            setBusinessLoading(true);
            setBusinessError(null);
            try {
                const b = await getBusinessById(businessId);
                if (cancelled) return;
                setBusiness(b);
            } catch (e) {
                if (!cancelled) {
                    setBusinessError(e instanceof Error ? e.message : 'Could not load practice.');
                    setBusiness(null);
                }
            } finally {
                if (!cancelled) setBusinessLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [businessId]);

    const loadJobs = useCallback(async () => {
        if (!token || !Number.isInteger(businessId) || businessId < 1) return;
        setJobsLoading(true);
        setJobsError(null);
        try {
            const data = await getOpenJobs(token, {
                business_id: businessId,
                page: jobsPage,
                limit: PAGE_SIZE,
                lat,
                lon,
                sort: 'distance',
                order: 'asc',
            });
            setJobsData({ count: data.count ?? 0, results: data.results ?? [] });
        } catch (e) {
            setJobsError(e instanceof Error ? e.message : 'Failed to load jobs.');
            setJobsData({ count: 0, results: [] });
        } finally {
            setJobsLoading(false);
        }
    }, [token, businessId, jobsPage, lat, lon]);

    useEffect(() => {
        if (tab !== 'jobs' || !token) return;
        loadJobs();
    }, [tab, token, loadJobs]);

    useEffect(() => {
        setJobsPage(1);
    }, [businessId]);

    const name = business?.business_name ?? 'Practice';
    const address = business?.postal_address ?? '';
    const avatarSrc = business?.avatar ? assetUrl(business.avatar) : null;
    const bio =
        business?.biography?.trim() ||
        'This practice has not added an about description yet.';

    const totalJobPages = Math.max(1, Math.ceil((jobsData.count || 0) / PAGE_SIZE));

    if (businessLoading) {
        return (
            <div className="business-job-postings business-job-postings--browse staff-business-profile">
                <p className="talent-jobs__loading">Loading…</p>
            </div>
        );
    }

    if (businessError || !business) {
        return (
            <div className="business-job-postings business-job-postings--browse staff-business-profile">
                <p className="talent-jobs__error" role="alert">
                    {businessError ?? 'Practice not found.'}
                </p>
                <p>
                    <Link to="/talent/businesses" className="talent-job-detail__back">
                        ← Back to Business search
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="business-job-postings business-job-postings--browse staff-business-profile">
            <header className="business-jobs-browse__hero talent-business-profile__hero">
                <div className="business-jobs-browse__hero-inner talent-business-profile__hero-inner">
                    <div className="talent-business-profile__brand">
                        <div className="talent-business-profile__avatar" aria-hidden>
                            {avatarSrc ? (
                                <img className="talent-business-profile__avatar-img" src={avatarSrc} alt="" />
                            ) : (
                                <div className="talent-business-profile__avatar-placeholder" />
                            )}
                        </div>
                        <div className="talent-business-profile__hero-text">
                            <h1 className="business-jobs-browse__title">{name}</h1>
                            <p className="business-jobs-browse__subtitle">
                                {address || 'Location on file with the practice'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                <div className="business-jobs-browse__tabs" role="tablist" aria-label="Practice profile">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'about'}
                        className={`business-jobs-browse__tab${tab === 'about' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setTab('about')}
                    >
                        About
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'jobs'}
                        className={`business-jobs-browse__tab${tab === 'jobs' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setTab('jobs')}
                    >
                        Jobs
                    </button>
                </div>

                {tab === 'about' ? (
                    <section className="talent-job-detail__card talent-business-profile__about-card">
                        <h2 className="talent-job-detail__card-title">About us</h2>
                        <p className="talent-job-detail__body-text talent-business-profile__bio">{bio}</p>
                    </section>
                ) : null}

                {tab === 'jobs' ? (
                    <div className="talent-business-profile__jobs-panel">
                        {jobsError ? (
                            <p className="talent-jobs__error" role="alert">
                                {jobsError}
                            </p>
                        ) : null}
                        {jobsLoading ? <p className="talent-jobs__loading">Loading jobs…</p> : null}
                        {!jobsLoading && jobsData.results.length === 0 ? (
                            <p className="talent-jobs__empty">No open jobs from this practice right now.</p>
                        ) : null}
                        {!jobsLoading && jobsData.results.length > 0 ? (
                            <>
                                <div className="talent-business-profile__jobs-scroll">
                                    <div className="business-jobs-browse__grid">
                                        {jobsData.results.map((job) => (
                                            <JobCard key={job.id} job={job} />
                                        ))}
                                    </div>
                                </div>
                                {totalJobPages > 1 ? (
                                    <div className="talent-jobs__pagination">
                                        <button
                                            type="button"
                                            disabled={jobsPage <= 1}
                                            onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                                            aria-label="Previous page"
                                        >
                                            ◀
                                        </button>
                                        <span>
                                            Page {jobsPage} of {totalJobPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={jobsPage >= totalJobPages}
                                            onClick={() => setJobsPage((p) => p + 1)}
                                            aria-label="Next page"
                                        >
                                            ▶
                                        </button>
                                    </div>
                                ) : null}
                            </>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
