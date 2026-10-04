// Null means unknown. It is never replaced by the click time or the Unix epoch.
function parseTimelineDate(value) {
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;
    const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00.000Z' : value;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(text)) return undefined;
    const date = new Date(text);
    return Number.isFinite(date.getTime()) && date.toISOString() === text ? date : undefined;
}
function readDate(payload,key,fallback) {
    return Object.hasOwn(payload,key) ? parseTimelineDate(payload[key]) : fallback;
}
function validateTimelineDates(start,end) {
    const valid = value => value === null || (value instanceof Date && Number.isFinite(value.getTime()));
    if (!valid(start) || !valid(end)) return 'Enter valid dates, or choose “I don’t remember”.';
    if (start && end && end < start) return 'The finish date cannot be before the start date. Correct it or leave an unknown date blank.';
    // Keep compatibility with the existing local-noon picker across time zones.
    if ([start,end].some(date=>date && date.getTime()>Date.now()+86400000)) return 'Timeline dates cannot be in the future.';
    return null;
}
module.exports={parseTimelineDate,readDate,validateTimelineDates};
