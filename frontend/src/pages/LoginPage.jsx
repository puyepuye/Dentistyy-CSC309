import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import DentistyyLogo from '../components/DentistyyLogo.jsx';
import { login, mapApiRoleToFrontend, parseJwtPayload } from '../lib/api.js';

function redirectPathForRole(frontendRole) {
    if (frontendRole === 'user') return '/talent/jobs';
    if (frontendRole === 'business') return '/businesses';
    if (frontendRole === 'admin') return '/admin';
    return '/';
}

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { loginWithToken } = useAuth();

    const initialTab = useMemo(() => {
        return searchParams.get('tab') === 'business' ? 'business' : 'talent';
    }, [searchParams]);

    const [tab, setTab] = useState(initialTab);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const activationNotice = location.state?.postActivationMessage;

    useEffect(() => {
        setTab(searchParams.get('tab') === 'business' ? 'business' : 'talent');
    }, [searchParams]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitError(null);
        setSubmitting(true);
        try {
            const trimmed = email.trim();
            const { token, expiresAt } = await login({
                email: trimmed,
                password,
            });
            const payload = parseJwtPayload(token);
            const frontendRole = payload?.role != null ? mapApiRoleToFrontend(payload.role) : null;
            if (!frontendRole) {
                setSubmitError('Could not read account role from session.');
                return;
            }
            loginWithToken(token, expiresAt ?? null, frontendRole);
            navigate(redirectPathForRole(frontendRole), { replace: true });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Sign-in failed.';
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 403 || msg === 'Forbidden') {
                setSubmitError(
                    'This account is not activated yet. After signing up, open Activate account and enter your email and activation token, then try logging in again.'
                );
            } else {
                setSubmitError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-split">
            <div className="login-split__visual" aria-hidden>
                <div className="login-split__visual-inner">
                    <p className="login-split__visual-tag">Dentistyy</p>
                    <p className="login-split__visual-copy">
                        Connect with practices or pick up shifts — sign in with your seeded account email.
                    </p>
                </div>
            </div>

            <div className="login-split__form-wrap">
                <div className="login-card">
                    <div className="login-card__tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'talent'}
                            className={
                                tab === 'talent' ? 'login-card__tab login-card__tab--active' : 'login-card__tab'
                            }
                            onClick={() => setTab('talent')}
                        >
                            Login for Talent
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'business'}
                            className={
                                tab === 'business'
                                    ? 'login-card__tab login-card__tab--active'
                                    : 'login-card__tab login-card__tab--inactive'
                            }
                            onClick={() => setTab('business')}
                        >
                            Login for Business
                        </button>
                    </div>

                    <form className="login-card__body" onSubmit={handleSubmit}>
                        <div className="login-card__brand">
                            <DentistyyLogo size={32} />
                        </div>
                        <h1 className="login-card__title">Log in</h1>

                        {activationNotice ? (
                            <p className="login-card__success" role="status">
                                {activationNotice}
                            </p>
                        ) : null}

                        <div className="login-field">
                            <label htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=" "
                                required
                            />
                        </div>

                        <div className="login-field login-field--password">
                            <label htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <button
                                type="button"
                                className="login-field__toggle"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden />
                            </button>
                        </div>

                        {submitError ? (
                            <p className="login-card__error" role="alert">
                                {submitError}
                            </p>
                        ) : null}

                        <button type="submit" className="login-card__submit" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Login'}
                        </button>

                        <p className="login-card__footer">
                            No account yet?{' '}
                            <Link to="/signup">Talent signup</Link>
                            {' · '}
                            <Link to="/signup/business">Practice signup</Link>
                            {' · '}
                            <Link to="/activate">Activate account</Link>
                        </p>
                        <p className="login-card__placeholder-note">
                            Seeded demo: e.g. regular1@csc309.utoronto.ca, business1@csc309.utoronto.ca, or
                            admin1@csc309.utoronto.ca — password <strong>123123</strong>.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
