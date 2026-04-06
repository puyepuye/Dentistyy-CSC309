import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import DentistyyLogo from '../components/DentistyyLogo.jsx';
import { login, mapApiRoleToFrontend, parseJwtPayload } from '../lib/api.js';

export default function AdminLoginPage() {
    const navigate = useNavigate();
    const { loginWithToken } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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

            if (frontendRole !== 'admin') {
                setSubmitError('This sign-in page is for admin accounts only.');
                return;
            }

            loginWithToken(token, expiresAt ?? null, frontendRole);
            navigate('/admin', { replace: true });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Sign-in failed.';
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 401 || msg === 'Unauthorized') {
                setSubmitError('Invalid email or password.');
            } else {
                setSubmitError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-login-shell">
            <div className="admin-login-card">
                <div className="admin-login-card__bar" aria-hidden />
                <div className="admin-login-card__body">
                    <div className="admin-login-card__brand">
                        <DentistyyLogo size={34} />
                    </div>
                    <h1 className="admin-login-card__title">Admin sign in</h1>

                    <form onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label htmlFor="admin-login-email">Email</label>
                            <input
                                id="admin-login-email"
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
                            <label htmlFor="admin-login-password">Password</label>
                            <input
                                id="admin-login-password"
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

                        <button type="submit" className="admin-login-card__submit" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Login'}
                        </button>
                    </form>

                    <p className="admin-login-card__footer">
                        Need the regular sign-in page? <Link to="/login">Login for talent or business</Link>
                    </p>
                    <p className="admin-login-card__note">
                        Seeded admin demo: <strong>admin1@csc309.utoronto.ca</strong>, password{' '}
                        <strong>123123</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
