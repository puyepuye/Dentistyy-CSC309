const DEFAULT_NEGOTIATION_WINDOW_SECONDS = 15 * 60;
const DEFAULT_JOB_START_WINDOW_HOURS = 24 * 7;

function parseLocalDate(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

/**
 * Validate shared business job form fields for create/edit flows.
 * Mirrors the most important backend rules so users get actionable feedback
 * before the server falls back to "Invalid payload".
 */
export function validateBusinessJobDraft({
    positionTypeId,
    salaryMin,
    salaryMax,
    startLocal,
    endLocal,
    note,
    requirePositionType = false,
}) {
    const fieldErrors = {};
    const now = new Date();

    const parsedPositionTypeId = Number(positionTypeId);
    const parsedSalaryMin = Number(salaryMin);
    const parsedSalaryMax = Number(salaryMax);
    const parsedStart = parseLocalDate(startLocal);
    const parsedEnd = parseLocalDate(endLocal);

    if (requirePositionType && (!Number.isInteger(parsedPositionTypeId) || parsedPositionTypeId < 1)) {
        fieldErrors.positionTypeId = 'Choose a position type.';
    }

    if (salaryMin === '' || Number.isNaN(parsedSalaryMin) || parsedSalaryMin < 0) {
        fieldErrors.salaryMin = 'Enter a valid minimum salary.';
    }

    if (salaryMax === '' || Number.isNaN(parsedSalaryMax)) {
        fieldErrors.salaryMax = 'Enter a valid maximum salary.';
    } else if (!fieldErrors.salaryMin && parsedSalaryMax < parsedSalaryMin) {
        fieldErrors.salaryMax = 'Maximum salary must be at least the minimum salary.';
    }

    if (!startLocal) {
        fieldErrors.startLocal = 'Choose a shift start time.';
    } else if (!parsedStart) {
        fieldErrors.startLocal = 'Enter a valid start time.';
    }

    if (!endLocal) {
        fieldErrors.endLocal = 'Choose a shift end time.';
    } else if (!parsedEnd) {
        fieldErrors.endLocal = 'Enter a valid end time.';
    }

    if (parsedStart) {
        if (parsedStart <= now) {
            fieldErrors.startLocal = 'Shift start must be in the future.';
        } else {
            const latestAllowedStart = new Date(now.getTime() + DEFAULT_JOB_START_WINDOW_HOURS * 60 * 60 * 1000);
            if (parsedStart > latestAllowedStart) {
                fieldErrors.startLocal = 'Shift start must be within the next 7 days.';
            } else {
                const minimumNegotiationLead = new Date(now.getTime() + DEFAULT_NEGOTIATION_WINDOW_SECONDS * 1000);
                if (parsedStart <= minimumNegotiationLead) {
                    fieldErrors.startLocal = 'Shift start must be at least 15 minutes from now.';
                }
            }
        }
    }

    if (parsedEnd) {
        if (parsedEnd <= now) {
            fieldErrors.endLocal = 'Shift end must be in the future.';
        } else if (parsedStart && parsedEnd <= parsedStart) {
            fieldErrors.endLocal = 'Shift end must be after the start time.';
        }
    }

    if (typeof note !== 'string') {
        fieldErrors.note = 'Enter a valid note.';
    }

    return {
        fieldErrors,
        hasErrors: Object.keys(fieldErrors).length > 0,
        parsed: {
            positionTypeId: parsedPositionTypeId,
            salaryMin: parsedSalaryMin,
            salaryMax: parsedSalaryMax,
            startIso: parsedStart ? parsedStart.toISOString() : null,
            endIso: parsedEnd ? parsedEnd.toISOString() : null,
            note: typeof note === 'string' ? note : '',
        },
    };
}
