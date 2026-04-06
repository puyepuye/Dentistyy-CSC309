const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** @param {string | null | undefined} path */
export function assetUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${p}`;
}

/**
 * Decode JWT payload (no signature verification — role routing only).
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

export function getQualificationById(token, id) {
    return authRequest(`/qualifications/${id}`, token, { method: 'GET' });
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

/** Public business card (same shape visitors see — account id in URL). */
export function getBusinessPublic(accountId) {
    return request(`/businesses/${accountId}`, { method: 'GET' });
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

export function patchBusinessJob(token, jobId, body) {
    return authRequest(`/businesses/me/jobs/${jobId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function deleteBusinessJob(token, jobId) {
    return authRequest(`/businesses/me/jobs/${jobId}`, token, { method: 'DELETE' });
}

export function getJobById(token, jobId) {
    return authRequest(`/jobs/${jobId}`, token, { method: 'GET' });
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
