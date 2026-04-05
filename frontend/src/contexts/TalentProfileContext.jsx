import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getMyApprovedQualifications, getRegularMe } from '../lib/api.js';

const TalentProfileContext = createContext(null);

export function TalentProfileProvider({ children }) {
    const { token, role } = useAuth();
    const [profile, setProfile] = useState(null);
    const [qualifications, setQualifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async (opts = {}) => {
        const silent = Boolean(opts.silent);
        if (!token || role !== 'user') {
            setProfile(null);
            setQualifications([]);
            setLoading(false);
            setError(null);
            return;
        }
        if (!silent) setLoading(true);
        setError(null);
        try {
            const me = await getRegularMe(token);
            setProfile(me);
            try {
                const quals = await getMyApprovedQualifications(token);
                setQualifications(quals?.results ?? []);
            } catch {
                setQualifications([]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load profile');
            if (!silent) {
                setProfile(null);
                setQualifications([]);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [token, role]);

    useEffect(() => {
        load();
    }, [load]);

    const refetch = useCallback(() => load({ silent: true }), [load]);

    const value = useMemo(
        () => ({
            profile,
            qualifications,
            loading,
            error,
            refetch,
        }),
        [profile, qualifications, loading, error, refetch]
    );

    return <TalentProfileContext.Provider value={value}>{children}</TalentProfileContext.Provider>;
}

export function useTalentProfile() {
    const ctx = useContext(TalentProfileContext);
    if (!ctx) {
        throw new Error('useTalentProfile must be used within TalentProfileProvider');
    }
    return ctx;
}
