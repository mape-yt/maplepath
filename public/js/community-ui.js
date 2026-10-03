(function(root, factory) {
    const view = factory();
    if (typeof module === "object" && module.exports) module.exports = view;
    else root.MaplePathCommunity = view;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
    function render(summary, record) {
        if (!summary || summary.status === "unavailable") return '<div class="community-stat">Community data unavailable. Try refreshing later.</div>';
        if (summary.status === "testing") return '<div class="community-stat"><span class="community-label">Community timelines</span><strong>Collecting real data soon</strong><span>Test timelines are excluded from averages and estimates.</span><a href="community-method.html">How it works</a></div>';
        const q = summary.quality || {};
        const available = summary.status === "available" && Number.isFinite(summary.medianDays);
        let html = `<div class="community-stat"><span class="community-label">Community timelines</span>`;
        if (available) {
            html += `<strong>${escape(summary.medianDays)} days <small>median</small></strong>
                <span>Middle 50%: ${escape(summary.range.lowerDays)}–${escape(summary.range.upperDays)} days</span>`;
            if (record?.status === "completed" && Number.isFinite(record.durationDays)) {
                const diff = record.durationDays - summary.medianDays;
                html += `<span>${diff === 0 ? "Matches the community median" : `${Math.abs(diff)} days ${diff > 0 ? "longer" : "shorter"} than the median`}</span>`;
            }
        } else {
            html += '<strong>Building the sample</strong><span>Completed timelines from at least 5 other contributors are needed.</span>';
        }
        html += `<span>${escape(summary.totalRecords || 0)} timelines from ${escape(summary.totalUsers || 0)} other contributors · ${escape(summary.sampleLabel || "Not enough data")}</span>`;
        if (record?.status === "in-progress") {
            const forecast = summary.forecast;
            if (forecast?.status === "available") {
                html += `<div class="community-estimate"><strong>${escape(forecast.lowerDays)}–${escape(forecast.upperDays)} more days</strong>
                    <span>Historical remaining-time range · ${escape(forecast.totalRecords)} completed cases from ${escape(forecast.totalUsers)} contributors</span>
                    <small>${escape(forecast.caveat)}</small></div>`;
            } else {
                html += `<span class="community-muted">${escape(forecast?.reason || "Not enough recent data for an estimate.")}</span>`;
            }
        }
        html += `<details><summary>How this is calculated</summary>
            <p>Same roadmap and step. ${escape(summary.location === "all" ? "All recorded locations, including unknown" : summary.location)}. Completions from the past ${escape(summary.windowDays)} days. Your records are excluded from the comparison.</p>
            <p>Average of all eligible timelines: ${summary.averageDays == null ? "Not enough data" : `${escape(summary.averageDays)} days from ${escape(summary.totalRecords)} timelines`}.</p>
            <p>Matching dates and durations count separately. Separate saved timelines from the same account also count; an edit updates its existing record.</p>
            <p>${escape(q.invalid || 0)} invalid records excluded · ${escape(q.older || 0)} older records excluded · ${escape(q.unusual || 0)} unusual durations flagged, still included · ${escape(q.durationCorrections || 0)} durations recalculated.</p>
            ${q.repeatedRecordCopies ? `<p>${escape(q.repeatedRecordCopies)} repeat reads of the same saved record counted once.</p>` : ""}
            <p>${escape(q.testOrUnlabelled || 0)} test or unlabelled records excluded from all statistics.</p>
            <p>Every eligible timeline has equal weight. Multiple timelines from one account can influence the result more; minimum samples count distinct contributors. ${escape(summary.ongoingRecords || 0)} timelines from ${escape(summary.ongoingUsers || 0)} other contributors are still in progress. Completed-case results can underrepresent long waits. These are self-reported dates, not independently verified applications.</p>
            <p>${escape(summary.recentRecords || 0)} completions from ${escape(summary.recentUsers || 0)} contributors in the last 180 days.${summary.latestCompletion ? ` Latest completion: ${escape(new Date(summary.latestCompletion).toLocaleDateString())}.` : ""}</p>
            <p>Calculated ${escape(new Date(summary.lastUpdated).toLocaleDateString())}. <a href="community-method.html">Method and sources</a></p>
            </details></div>`;
        return html;
    }
    return { render };
});
