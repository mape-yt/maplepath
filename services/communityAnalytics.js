// Pure calculations: never changes or deletes the submitted timeline records.
const DAY = 86400000;
const POLICY = Object.freeze({ version: 5, windowDays: 730, recentDays: 180,
    minimumUsers: 5, outlierMinimum: 10, forecastMinimum: 20, maximumRecords: 20000 });
const LOCATIONS = ["Inside Canada", "Outside Canada"];

// Collection is deliberately opt-in. Existing unlabelled records are test data.
function communityDataMode() {
    return process.env.COMMUNITY_DATA_MODE === "community" ? "community" : "testing";
}

function instant(value) {
    if (!(value instanceof Date) && typeof value !== "string") return NaN;
    if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return NaN;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return NaN;
    if (typeof value === "string") {
        const day = value.slice(0, 10);
        const check = new Date(day + "T00:00:00.000Z");
        if (!Number.isFinite(check.getTime()) || check.toISOString().slice(0, 10) !== day) return NaN;
    }
    return time;
}

function durationDays(start, finish) {
    const a = instant(start), b = instant(finish);
    return Number.isFinite(a) && Number.isFinite(b) && b >= a
        ? Math.max(1, Math.round((b - a) / DAY)) : null;
}

function quantile(sorted, fraction) {
    const position = (sorted.length - 1) * fraction;
    const low = Math.floor(position), weight = position - low;
    return sorted[low] + ((sorted[low + 1] ?? sorted[low]) - sorted[low]) * weight;
}

function latest(records) {
    const stamp = row => instant(row.updatedAt) || instant(row.createdAt) || 0;
    return [...records].sort((a, b) => (stamp(b) || 0) - (stamp(a) || 0)
        || String(b._id || "").localeCompare(String(a._id || "")));
}

const contributorCount = records => new Set(records.map(row => row.username)).size;

function summarizeStep(records, { definition, step, username, location = "all", permitType = "all",
    applicationId = null, includesLegacy = false, now = new Date(), dataMode = "testing" }) {
    const time = now.getTime(), cutoff = time - POLICY.windowDays * DAY;
    const recentCutoff = time - POLICY.recentDays * DAY;
    const scoped = records.filter(r => r.profileKey === definition.profileKey && r.stepOrder === step.order);
    const permit = ["Study Permit", "Work Permit"].includes(definition.pathway);
    const rowLocation = row => permit ? row.application?.submissionLocation : row.context?.location;
    const own = latest(scoped.filter(r => r.username === username && (applicationId
        ? String(r.applicationId) === applicationId || (includesLegacy && !r.applicationId)
        : !r.applicationId)))[0];
    const quality = { repeatedRecordCopies: 0, invalid: 0, missingDates:0, older: 0, unusual: 0, durationCorrections: 0, testOrUnlabelled: 0 };
    const seenIds = new Set(), completed = [], ongoing = [];
    for (const row of latest(scoped)) {
        if (row.username === username) continue;
        if (dataMode !== "community" || row.dataSource !== "self-reported") { quality.testOrUnlabelled++; continue; }
        if ((row.applicationId && !row.application) || (row.application && row.application.dataSource !== "self-reported")) { quality.testOrUnlabelled++; continue; }
        if (typeof row.username !== "string" || !row.username.trim()) { quality.invalid++; continue; }
        // Only repeat reads of the SAME saved record count once. Different IDs,
        // accounts, matching dates and matching durations remain separate observations.
        const id = row._id == null ? null : String(row._id);
        if (id && seenIds.has(id)) { quality.repeatedRecordCopies++; continue; }
        if (id) seenIds.add(id);
        if (location !== "all" && rowLocation(row) !== location) continue;
        if (permitType !== "all" && row.application?.permitType !== permitType) continue;
        if (row.pathway === definition.pathway && row.startedAt == null && row.completedAt == null && row.status === "in-progress") {
            quality.missingDates++;
            // Keep unknown-start waits visible in the conservative unfinished-case check.
            ongoing.push({username:row.username});continue;
        }
        if (row.pathway === definition.pathway && row.status === "completed" && (row.startedAt == null || row.completedAt == null)) {
            quality.missingDates++;continue;
        }
        const start = instant(row.startedAt), end = instant(row.completedAt);
        // The editor accepts local-noon dates within 24h of server time.
        if (row.pathway !== definition.pathway || !Number.isFinite(start) || start > time + DAY) {
            quality.invalid++; continue;
        }
        if (row.status === "in-progress") {
            if (row.completedAt != null) quality.invalid++;
            else if (start >= cutoff) ongoing.push({ username: row.username });
            else quality.older++;
            continue;
        }
        const days = durationDays(row.startedAt, row.completedAt);
        if (row.status !== "completed" || days === null || end > time + DAY) { quality.invalid++; continue; }
        if (end < cutoff) { quality.older++; continue; }
        if (row.durationDays !== days) quality.durationCorrections++;
        completed.push({ days, end, username: row.username });
    }
    const values = completed.map(r => r.days).sort((a, b) => a - b);
    const totalUsers = contributorCount(completed);
    if (totalUsers >= POLICY.outlierMinimum) {
        const q1 = quantile(values, .25), q3 = quantile(values, .75);
        const spread = Math.max(1, q3 - q1); // Guard tied quartiles at day precision.
        // Flag for context only: statistical rarity is not evidence of a false report.
        quality.unusual = values.filter(n => n < q1 - 3 * spread || n > q3 + 3 * spread).length;
    }
    const enough = totalUsers >= POLICY.minimumUsers;
    const recent = completed.filter(r => r.end >= recentCutoff);
    const result = {
        profileKey: definition.profileKey, stepOrder: step.order, stepTitle: step.title,
        methodVersion: POLICY.version, source: dataMode === "community" ? "self-reported" : "none", dataMode, location,
        permitType, locationBasis:permit ? "submission" : "recorded",
        status: dataMode !== "community" ? "testing" : enough ? "available" : "insufficient-data",
        totalUsers, totalRecords: values.length, averageUsers: totalUsers,
        ongoingUsers: contributorCount(ongoing), ongoingRecords: ongoing.length,
        averageDays: enough ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length) : null,
        medianDays: enough ? Math.round(quantile(values, .5)) : null,
        range: enough ? { lowerDays: Math.floor(quantile(values, .25)), upperDays: Math.ceil(quantile(values, .75)), coverage: "middle-50-percent" } : null,
        sampleLabel: !enough ? "Not enough data" : totalUsers < 20 ? "Small sample" : "Community sample",
        quality, windowDays: POLICY.windowDays, recentUsers: contributorCount(recent), recentRecords: recent.length,
        lastUpdated: now.toISOString(), latestCompletion: enough ? new Date(Math.max(...completed.map(r => r.end))).toISOString() : null,
        forecast: { status: "unavailable", reason: "Start this step to see a remaining-time comparison." }
    };
    if (dataMode !== "community") {
        result.forecast.reason = "Test data is excluded. Community estimates will begin when real submissions are enabled.";
        return result;
    }
    if (!own || own.status !== "in-progress") return result;
    const start = instant(own.startedAt);
    const unavailable = reason => { result.forecast.reason = reason; return result; };
    if (own.startedAt == null) return unavailable("Add this step’s start date when you remember it to see a remaining-time comparison.");
    if (own.dataSource !== "self-reported") return unavailable("This is a test or unlabelled timeline, so no personal estimate is shown.");
    if ((own.applicationId && !own.application) || (own.application && own.application.dataSource !== "self-reported")) return unavailable("This application is not eligible for community estimates.");
    if (own.application?.outcome && !(definition.pathway === "Provincial Nominee Program" && own.application.outcome === "approved")) return unavailable("A result has already been recorded for this application.");
    if (!Number.isFinite(start) || start > time + DAY || own.completedAt != null) return unavailable("Check your step dates first.");
    if (!["waiting", "ircc"].includes(step.type)) return unavailable("This preparation step depends on your own actions.");
    if (step.type === "waiting") {
        // Invitation pools are selective, not processing queues. Permit work-authorization
        // checklists also do not measure a decision wait. Only reviewed wait steps qualify.
        const permitWaits = { "SP-POSTSECONDARY": 7, "WP-EMP-LMIA": 6, "WP-EMP-EXEMPT": 6, "WP-OPEN": 6 };
        if (permitWaits[definition.profileKey] !== step.order) {
            return unavailable("Selection rounds and work-authorization checks do not support a decision-time estimate.");
        }
    }
    if (["WP-OPEN", "WP-EMP-EXEMPT"].includes(definition.profileKey)) return unavailable("This guide combines permit categories with different processing rules.");
    if (permit && (location === "all" || permitType === "all")) return unavailable("Choose submission location and new permit or extension before comparing permit waits.");
    if (permit && own.application?.permitType !== permitType) return unavailable("Add matching submission details to this application first.");
    if (location !== "all" && rowLocation(own) !== location) return unavailable(permit ? "Choose where you were when you submitted this application." : "Choose the location saved when you first recorded this step.");
    if (contributorCount(recent) < POLICY.forecastMinimum) return unavailable("Completed timelines from at least 20 other contributors in the last 180 days are needed.");
    if (contributorCount(ongoing) >= contributorCount(recent)) return unavailable("Too many contributors still have unfinished timelines for a useful completed-case estimate.");
    const elapsed = Math.max(0, Math.floor((time - start) / DAY));
    // Retain valid long cases here: trimming the tail would shorten waits artificially.
    const comparable = recent.filter(r => r.days > elapsed);
    const remaining = comparable.map(r => r.days - elapsed).sort((a, b) => a - b);
    if (contributorCount(comparable) < POLICY.forecastMinimum) return unavailable("Too few other contributors have recent completed cases that lasted longer than your wait so far.");
    result.forecast = { status: "available", method: "historical-remaining-range", elapsedDays: elapsed,
        lowerDays: Math.floor(quantile(remaining, .25)), upperDays: Math.ceil(quantile(remaining, .75)),
        totalUsers: contributorCount(comparable), totalRecords: remaining.length, recentDays: POLICY.recentDays,
        caveat: "Middle 50% of recent completed cases that lasted longer than your wait. Self-reported; unfinished cases are not modelled. This is not a guaranteed finish date or a calibrated prediction." };
    return result;
}

module.exports = { POLICY, LOCATIONS, instant, durationDays, quantile, summarizeStep, communityDataMode };
