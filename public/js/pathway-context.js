// Shared by the browser and profile validation so permit outcomes stay consistent.
(function (root, factory) {
    const context = factory();
    if (typeof module === "object" && module.exports) module.exports = context;
    else root.MaplePathContext = context;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const permitPathways = ["Study Permit", "Work Permit"];
    const permitStages = ["Checking eligibility", "Preparing documents", "Waiting for school or employer", "Application submitted", "Biometrics", "Medical Exam", "Waiting for decision", "Permit approved", "Permit received"];
    function isPermit(pathway) { return permitPathways.includes(pathway); }
    function completion(pathway) {
        return isPermit(pathway)
            ? { label: "Permit approved", dateLabel: "Permit approval date", dateField: "permitApprovalDate", stage: "Permit approved" }
            : { label: "Permanent resident", dateLabel: "PR date", dateField: "permanentResidenceDate", stage: "Landed as PR" };
    }
    function stages(options, pathway) { return isPermit(pathway) ? permitStages : (options.stages || []); }
    function profileLink(related) {
        const query = new URLSearchParams({ pathway: related.pathway });
        if (related.stream) query.set("stream", related.stream);
        return `profile.html?${query}`;
    }
    return { isPermit, completion, stages, permitStages, profileLink };
});
