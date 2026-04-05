import { createContext, useContext, useMemo, useState } from 'react';
import { mapApiRoleToFrontend, parseJwtPayload } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'temping_auth_token';
const EXPIRY_KEY = 'temping_auth_expiry';
const ROLE_KEY = 'temping_auth_role';

function readInitialRole() {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored === 'user' || stored === 'business' || stored === 'admin') {
        return stored;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        const payload = parseJwtPayload(token);
        const mapped = payload?.role != null ? mapApiRoleToFrontend(payload.role) : null;
        if (mapped) return mapped;
    }
    return null;
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [expiresAt, setExpiresAt] = useState(() => localStorage.getItem(EXPIRY_KEY));
    const [role, setRole] = useState(() => readInitialRole());

    /**
     * @param {string} nextToken
     * @param {string | null} [nextExpiresAt]
     * @param {'user' | 'business' | 'admin'} [nextRole] defaults to staff (regular user)
     */
    const loginWithToken = (nextToken, nextExpiresAt, nextRole = 'user') => {
        localStorage.setItem(TOKEN_KEY, nextToken);
        if (nextExpiresAt != null) {
            localStorage.setItem(EXPIRY_KEY, nextExpiresAt);
        } else {
            localStorage.removeItem(EXPIRY_KEY);
        }
        localStorage.setItem(ROLE_KEY, nextRole);
        setToken(nextToken);
        setExpiresAt(nextExpiresAt ?? null);
        setRole(nextRole);
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        localStorage.removeItem(ROLE_KEY);
        setToken(null);
        setExpiresAt(null);
        setRole(null);
    };

    const value = useMemo(
        () => ({
            token,
            expiresAt,
            role,
            isLoggedIn: Boolean(token),
            loginWithToken,
            logout,
        }),
        [token, expiresAt, role]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
