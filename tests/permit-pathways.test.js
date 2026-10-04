const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const options = require("../data/immigrationOptions");
const context = require("../public/js/pathway-context");
const { roadmaps, findRoadmap, loadRoadmap } = require("../data/roadmaps/registry");
const { validateProfile } = require("../services/profileValidation");
const { saveProgress, progressFor, mirrorCurrentProgress } = require("../services/journeyProgress");
const permits = roadmaps.filter(r => context.isPermit(r.pathway));

function profile(definition, changes = {}) {
    return { journeyType: "pathway", pathway: definition.pathway, stream: definition.stream,
        location: "Inside Canada", currentStatus: "Visitor", province: "Quebec",
        status: "Preparing application", currentStage: "Checking eligibility",
        journeyStartDate: "2025-01-01", ...changes };
}

test("all six permit guides load through options with distinct identities and official sources", () => {
    assert.equal(permits.length, 6);
    for (const definition of permits) {
        assert.ok(options.pathways.includes(definition.pathway));
        assert.ok(options.streams[definition.pathway].includes(definition.stream));
        const roadmap = loadRoadmap(definition);
        assert.equal(roadmap.journeyKind, "temporary-residence");
        assert.equal(roadmap.federalApplicationRoute, definition.pathway === "Study Permit" ? "study-permit" : "work-permit");
        assert.ok(roadmap.scopeNote);
        assert.ok(roadmap.steps.length >= 5);
        for (const step of roadmap.steps) {
            assert.ok(step.description && step.preparationChecklist.length && step.officialLinks.length);
            assert.equal(step.governmentTimeline, null, "No invented processing-time promises");
            for (const source of [roadmap.officialProgramPage, ...step.officialLinks]) {
                assert.equal(new URL(source.url).hostname, "www.canada.ca");
                assert.equal(new URL(source.url).protocol, "https:");
                assert.match(source.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
            }
        }
        for (const entry of roadmap.relatedPathways) {
            assert.ok(options.pathways.includes(entry.pathway));
            if (entry.stream) assert.ok(findRoadmap(entry.pathway, entry.stream));
            assert.ok(entry.description && entry.officialLinks.length);
        }
    }
});

test("permit approval stays separate from permanent residence and does not manufacture status", () => {
    for (const definition of permits) {
        const result = validateProfile(profile(definition, { journeyType: "completed", permitApprovalDate: "2025-08-01", permanentResidenceDate: "2025-09-01" }));
        assert.equal(result.error, undefined);
        assert.equal(result.profile.status, "Permit approved");
        assert.equal(result.profile.currentStage, "Permit approved");
        assert.equal(result.profile.currentStatus, "Visitor");
        assert.equal(result.profile.permanentResidenceDate, null);
        assert.equal(context.completion(definition.pathway).dateField, "permitApprovalDate");
    }
});

test("permit profiles enforce their stages, category, and approval dates", () => {
    const definition = permits[0];
    assert.equal(validateProfile(profile(definition)).error, undefined);
    assert.match(validateProfile(profile(definition, { currentStage: "Landed as PR" })).error, /valid current stage/);
    assert.match(validateProfile(profile(definition, { stream: "Canadian Experience Class (CEC)" })).error, /supported program stream/);
    assert.equal(validateProfile(profile(definition, { journeyType: "completed" })).error, undefined);
    for (const date of ["2099-01-01", "2025-02-30", "not-a-date", "2024-01-01"]) {
        assert.ok(validateProfile(profile(definition, { journeyType: "completed", permitApprovalDate: date })).error);
    }
    const active = validateProfile(profile(definition, { permitApprovalDate: "2025-08-01", permanentResidenceDate: "2025-09-01" })).profile;
    assert.equal(active.permitApprovalDate, null);
    assert.equal(active.permanentResidenceDate, null);
});

test("switching study to PGWP to PNP and back preserves each route's progress", () => {
    const study = permits.find(r => r.pathway === "Study Permit");
    const pgwp = permits.find(r => r.profileKey === "WP-PGWP");
    const pnp = findRoadmap("Provincial Nominee Program", "Alberta Opportunity Stream (AAIP)");
    const user = { journeyProgressByProfile: new Map(), immigrationJourney: {} };
    saveProgress(user, study.profileKey, [1, 2], 3);
    mirrorCurrentProgress(user, pgwp);
    assert.deepEqual(user.immigrationJourney.completedSteps, []);
    saveProgress(user, pgwp.profileKey, [1], 2);
    mirrorCurrentProgress(user, pnp);
    assert.deepEqual(user.immigrationJourney.completedSteps, []);
    mirrorCurrentProgress(user, study);
    assert.deepEqual(user.immigrationJourney.completedSteps, [1, 2]);
    assert.deepEqual(progressFor(user, pgwp.profileKey).completedSteps, [1]);
});

test("public coverage, permit forms and shared helpers remain connected", () => {
    const read = file => fs.readFileSync(path.join(__dirname, "../public", file), "utf8");
    for (const page of ["index.html", "about.html"]) {
        assert.match(read(page), /Study Permit/);
        assert.match(read(page), /Work Permit/);
    }
    assert.match(read("index.html"), new RegExp(`id="permit-route-count">${permits.length}</strong>`));
    for (const page of ["onboarding", "profile", "dashboard", "journey"]) {
        const html = read(`${page}.html`);
        assert.ok(html.indexOf('js/pathway-context.js') < html.indexOf(`js/${page}.js`));
    }
    assert.match(read("onboarding.html"), /id="permit-approval-date"/);
    assert.match(read("profile.html"), /id="edit-permit-date"/);
    const related = loadRoadmap(permits[0]).relatedPathways[0];
    const target = new URL(context.profileLink(related), "https://maplepath.example");
    assert.equal(target.pathname, "/profile.html");
    assert.equal(target.searchParams.get("pathway"), related.pathway);
});
