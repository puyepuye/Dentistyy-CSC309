const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** @param {string | null | undefined} path */
export function assetUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${p}`;
}

/**
 * Decode JWT payload (no signature verification; role routing only).
 * @param {string | null | undefined} token
 */
export function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/** Map API account.role to frontend AuthContext role. */
export function mapApiRoleToFrontend(apiRole) {
    if (apiRole === 'regular') return 'user';
    if (apiRole === 'business') return 'business';
    if (apiRole === 'admin') return 'admin';
    return null;
}

async function request(path, options = {}) {
    const { headers: optionHeaders, ...restOptions } = options;
    const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...restOptions,
        headers: {
            'Content-Type': 'application/json',
            ...(optionHeaders || {}),
        },
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    return payload;
}

export function signupRegularUser(formData) {
    return request('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
    });
}

export function signupBusiness(formData) {
    return request('/businesses', {
        method: 'POST',
        body: JSON.stringify(formData),
    });
}

export function login(formData) {
    return request('/auth/tokens', {
        method: 'POST',
        body: JSON.stringify(formData),
    });
}

/**
 * Activate a new account (or complete password reset) using the reset token from registration.
 * @param {string} resetToken - UUID from signup response
 * @param {{ email: string, password?: string }} body - password optional; omit to keep the password you signed up with
 */
export function activateWithResetToken(resetToken, body) {
    const token = encodeURIComponent(resetToken);
    return request(`/auth/resets/${token}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
/**
 * password reset
 * @param {string} email 
 */

export function requestPasswordReset(email) {
    return request('/auth/resets', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

/**
 * @param {string} path
 * @param {string} token JWT
 * @param {RequestInit} [options]
 */
export function authRequest(path, token, options = {}) {
    return request(path, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
}

export function getRegularMe(token) {
    return authRequest('/users/me', token, { method: 'GET' });
}

/**
 * Approved qualifications (custom helper on backend). If the server is an older build
 * without this route, 404 is treated as an empty list so the profile page still loads.
 */
export async function getMyApprovedQualifications(token) {
    try {
        return await authRequest('/users/me/qualifications', token, { method: 'GET' });
    } catch (e) {
        if (e && typeof e === 'object' && e.status === 404) {
            return { results: [] };
        }
        throw e;
    }
}

export function getBusinessMe(token) {
    return authRequest('/businesses/me', token, { method: 'GET' });
}

export function patchRegularMe(token, body) {
    return authRequest('/users/me', token, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

/** Legacy endpoint; discovery uses activity only. Prefer using the app (GET /users/me, jobs, etc.). */
export function patchRegularAvailability(token, available) {
    return authRequest('/users/me/available', token, {
        method: 'PATCH',
        body: JSON.stringify({ available }),
    });
}

/** Visible position types for dropdowns (paginated). */
export function getPositionTypes(token, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '100',
        ...params,
    });
    return authRequest(`/position-types?${q}`, token, { method: 'GET' });
}

export function getMyQualificationRequests(token) {
    return authRequest('/users/me/qualification-requests', token, { method: 'GET' });
}

export function createQualification(token, payload) {
    return authRequest('/qualifications', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function patchQualification(token, id, payload) {
    return authRequest(`/qualifications/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export async function uploadQualificationDocument(token, qualificationId, file) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/qualifications/${qualificationId}/document`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }
    if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return payload;
}

export async function uploadUserResume(token, file) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/users/me/resume`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }
    if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return payload;
}

/** Open job postings (regular). Query: lat, lon, position_type_id, business_id, sort, order, page, limit */
export function getOpenJobs(token, params = {}) {
    const q = new URLSearchParams();
    if (params.lat != null && params.lon != null) {
        q.set('lat', String(params.lat));
        q.set('lon', String(params.lon));
    }
    if (params.position_type_id != null && params.position_type_id !== '') {
        q.set('position_type_id', String(params.position_type_id));
    }
    if (params.business_id != null && params.business_id !== '') {
        q.set('business_id', String(params.business_id));
    }
    if (params.sort) q.set('sort', params.sort);
    if (params.order) q.set('order', params.order);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 9));
    return authRequest(`/jobs?${q.toString()}`, token, { method: 'GET' });
}

/** Talent pipeline: matched, interest shown, and interested-in-you (see GET /users/me/interests). */
export function getMyJobInterests(token) {
    return authRequest('/users/me/interests', token, { method: 'GET' });
}

/** Business directory for filters (GET /businesses, public). */
export function getBusinessesList(params = {}) {
    const merged = { page: '1', limit: '50', ...params };
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
        // URLSearchParams(undefined) becomes the literal "undefined" in the query string,
        // which breaks keyword search on the server.
        if (value === undefined || value === null || value === '') continue;
        q.set(key, String(value));
    }
    return request(`/businesses?${q}`, { method: 'GET' });
}

/** Public business profile (GET /businesses/:businessAccountId). */
export function getBusinessById(businessAccountId) {
    return request(`/businesses/${businessAccountId}`, { method: 'GET' });
}

export function patchBusinessMe(token, body) {
    return authRequest('/businesses/me', token, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export async function uploadBusinessAvatar(token, file) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/businesses/me/avatar`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }
    if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return payload;
}

export function getBusinessMyJobs(token, params = {}) {
    const q = new URLSearchParams();
    const merged = { page: '1', limit: '10', ...params };
    for (const [k, v] of Object.entries(merged)) {
        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v)) {
            for (const item of v) {
                if (item !== undefined && item !== null && item !== '') q.append(k, String(item));
            }
        } else {
            q.set(k, String(v));
        }
    }
    return authRequest(`/businesses/me/jobs?${q}`, token, { method: 'GET' });
}

export function createBusinessJob(token, body) {
    return authRequest('/businesses/me/jobs', token, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function getAdminBusinesses(token, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '10',
        ...params,
    });
    return authRequest(`/businesses?${q}`, token, { method: 'GET' });
}

export function patchBusinessVerified(token, businessId, verified) {
    return authRequest(`/businesses/${businessId}/verified`, token, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
    });
}
export function getAdminUsers(token, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '10',
        ...params,
    });
    return authRequest(`/users?${q}`, token, { method: 'GET' });
}

export function patchUserSuspend(token, userId, suspended) {
    return authRequest(`/users/${userId}/suspended`, token, {
        method: 'PATCH',
        body: JSON.stringify({ suspended }),
    });
}

export function getAdminPositionTypes(token, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '10',
        ...params,
    });
    return authRequest(`/position-types?${q}`, token, { method: 'GET' });
}

export function patchPositionType(token, positionTypeId, body) {
    return authRequest(`/position-types/${positionTypeId}/`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}
export function deletePositionType(token, positionTypeId) {
    return authRequest(`/position-types/${positionTypeId}/`, token, {
        method: 'DELETE'
    });
}

export function createPositionType(token, body) {
    return authRequest('/position-types', token, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function patchBusinessJob(token, jobId, body) {
    return authRequest(`/businesses/me/jobs/${jobId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function deleteBusinessJob(token, jobId) {
    return authRequest(`/businesses/me/jobs/${jobId}`, token, { method: 'DELETE' });
}

export function getJobById(token, jobId, params = {}) {
    const q = new URLSearchParams();
    if (params.lat != null && params.lon != null) {
        q.set('lat', String(params.lat));
        q.set('lon', String(params.lon));
    }
    const qs = q.toString();
    return authRequest(`/jobs/${jobId}${qs ? `?${qs}` : ''}`, token, { method: 'GET' });
}

/** Regular user: express or withdraw interest (PATCH /jobs/:jobId/interested). */
export function patchJobInterested(token, jobId, interested) {
    return authRequest(`/jobs/${jobId}/interested`, token, {
        method: 'PATCH',
        body: JSON.stringify({ interested }),
    });
}

export function getJobCandidates(token, jobId, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '20',
        ...params,
    });
    return authRequest(`/jobs/${jobId}/candidates?${q}`, token, { method: 'GET' });
}

export function getJobCandidateDetail(token, jobId, userId) {
    return authRequest(`/jobs/${jobId}/candidates/${userId}`, token, { method: 'GET' });
}

export function patchJobCandidateInterested(token, jobId, userId, interested) {
    return authRequest(`/jobs/${jobId}/candidates/${userId}/interested`, token, {
        method: 'PATCH',
        body: JSON.stringify({ interested }),
    });
}

export function getJobInterests(token, jobId, params = {}) {
    const q = new URLSearchParams({
        page: '1',
        limit: '20',
        ...params,
    });
    return authRequest(`/jobs/${jobId}/interests?${q}`, token, { method: 'GET' });
}

export function patchJobNoShow(token, jobId) {
    return authRequest(`/jobs/${jobId}/no-show`, token, {
        method: 'PATCH',
        body: JSON.stringify({}),
    });
}

export function startNegotiation(token, interestId) {
    return authRequest('/negotiations', token, {
        method: 'POST',
        body: JSON.stringify({ interest_id: interestId }),
    });
}

/** @returns {Promise<{ negotiation_window_seconds: number }>} */
export function getNegotiationWindowSeconds(token) {
    return authRequest('/negotiations/window', token, { method: 'GET' });
}

export function getMyNegotiation(token) {
    return authRequest('/negotiations/me', token, { method: 'GET' });
}

export function patchNegotiationDecision(token, negotiationId, decision) {
    return authRequest('/negotiations/me/decision', token, {
        method: 'PATCH',
        body: JSON.stringify({ negotiation_id: negotiationId, decision }),
    });
}

export { API_BASE_URL };
