import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getBusinessMe } from '../lib/api.js';

const BusinessProfileContext = createContext(null);

export function BusinessProfileProvider({ children }) {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!token) {
            setProfile(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const me = await getBusinessMe(token);
            setProfile(me);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load practice profile');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const value = useMemo(
        () => ({
            profile,
            loading,
            error,
            refetch,
        }),
        [profile, loading, error, refetch]
    );

    return <BusinessProfileContext.Provider value={value}>{children}</BusinessProfileContext.Provider>;
}

export function useBusinessProfile() {
    const ctx = useContext(BusinessProfileContext);
    if (!ctx) {
        throw new Error('useBusinessProfile must be used within BusinessProfileProvider');
    }
    return ctx;
}
