/** Shared copy + workspace header (mint band) for /talent/negotiations and /businesses/negotiations */

export const TALENT_NEGOTIATION_INTRO =
    'After a match, either side can start a timed negotiation: accept before it ends to confirm the shift. Chat with the practice below.';

export const BUSINESS_NEGOTIATION_INTRO =
    'After a match, either side can start a timed negotiation: accept before it ends to confirm the shift. Chat with the candidate below.';

/**
 * @param {*} negotiation
 * @param {boolean} negotiationLoading
 */
export function talentNegotiationWorkspaceHeader(negotiation, negotiationLoading) {
    if (negotiationLoading || !negotiation) {
        return { greeting: 'Negotiation', statusLine: TALENT_NEGOTIATION_INTRO };
    }
    const practice = negotiation.job?.business?.business_name?.trim() || 'Practice';
    return { greeting: 'Negotiation', statusLine: `Negotiation with ${practice}` };
}

/**
 * @param {*} negotiation
 * @param {boolean} negotiationLoading
 */
export function businessNegotiationWorkspaceHeader(negotiation, negotiationLoading) {
    if (negotiationLoading || !negotiation) {
        return { greeting: 'Negotiation', statusLine: BUSINESS_NEGOTIATION_INTRO };
    }
    const label = `${negotiation.user?.first_name ?? ''} ${negotiation.user?.last_name ?? ''}`.trim() || 'Candidate';
    return { greeting: 'Negotiation', statusLine: `Negotiation with ${label}` };
}
