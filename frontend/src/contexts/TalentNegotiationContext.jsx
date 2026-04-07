import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getMyNegotiation } from '../lib/api.js';
import { celebrateNegotiationSuccess, getClosedNegotiationNotice } from '../lib/negotiationConfetti.js';

const TalentNegotiationContext = createContext(null);

function secondsRemaining(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export function TalentNegotiationProvider({ children }) {
    const { token } = useAuth();
    const [negotiation, setNegotiation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clock, setClock] = useState(0);
    const [lastResolution, setLastResolution] = useState(null);
    const negotiationRef = useRef(null);
    useEffect(() => {
        negotiationRef.current = negotiation;
    }, [negotiation]);

    const refresh = useCallback(async () => {
        if (!token) {
            setNegotiation(null);
            setLastResolution(null);
            setLoading(false);
            return;
        }
        const priorNeg = negotiationRef.current;
        try {
            const n = await getMyNegotiation(token);
            setNegotiation(n);
            if (n) setLastResolution(null);
        } catch (e) {
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 404) {
                const notice = await getClosedNegotiationNotice(token, priorNeg);
                if (notice?.tone === 'success') {
                    celebrateNegotiationSuccess();
                }
                setLastResolution(notice);
                setNegotiation(null);
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    /** Apply payload from POST /negotiations so UI updates before the next poll (e.g. right after “Start negotiation”). */
    const applyNegotiationPayload = useCallback((payload) => {
        if (payload && typeof payload === 'object' && payload.id != null) {
            setNegotiation(payload);
            setLastResolution(null);
            setLoading(false);
        }
    }, []);

    const clearLastResolution = useCallback(() => {
        setLastResolution(null);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!token) return undefined;
        const id = setInterval(refresh, 8000);
        return () => clearInterval(id);
    }, [token, refresh]);

    useEffect(() => {
        if (!negotiation) return undefined;
        const id = setInterval(() => setClock((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [negotiation]);

    const leftSec = useMemo(() => secondsRemaining(negotiation?.expiresAt), [negotiation?.expiresAt, clock]);

    const value = useMemo(
        () => ({
            negotiation,
            loading,
            refresh,
            applyNegotiationPayload,
            lastResolution,
            clearLastResolution,
            secondsRemaining: leftSec,
        }),
        [negotiation, loading, refresh, applyNegotiationPayload, lastResolution, clearLastResolution, leftSec]
    );

    return <TalentNegotiationContext.Provider value={value}>{children}</TalentNegotiationContext.Provider>;
}

export function useTalentNegotiation() {
    const ctx = useContext(TalentNegotiationContext);
    if (!ctx) {
        throw new Error('useTalentNegotiation must be used within TalentNegotiationProvider');
    }
    return ctx;
}
