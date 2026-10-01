const test = require("node:test");
const assert = require("node:assert/strict");
const { validateProfile } = require("../services/profileValidation");

function activeProfile(overrides = {}) {
    return {
        journeyType: "pathway",
        pathway: "Express Entry",
        stream: "Canadian Experience Class (CEC)",
        location: "Inside Canada",
        province: "Alberta",
        status: "Preparing application",
        currentStage: "Preparing documents",
        journeyStartDate: "2025-01-15",
        canadaArrivalDate: "2024-09-01",
        ...overrides
    };
}

test("planning profiles are normalized without assigning a roadmap", () => {
    const result = validateProfile({
        ...activeProfile(),
        journeyType: "planning",
        pathway: "Express Entry",
        stream: "Canadian Experience Class (CEC)"
    });

    assert.equal(result.error, undefined);
    assert.equal(result.profile.pathway, "");
    assert.equal(result.profile.stream, "");
    assert.equal(result.profile.status, "Planning");
    assert.equal(result.profile.currentStage, "Researching");
});

test("profiles saved before journey types existed remain editable", () => {
    const result = validateProfile(activeProfile({ journeyType: undefined }));

    assert.equal(result.error, undefined);
    assert.equal(result.profile.journeyType, "pathway");
    assert.equal(result.profile.stream, "Canadian Experience Class (CEC)");
});

test("only advertised pathways and registered streams can be saved", () => {
    assert.match(validateProfile(activeProfile({ pathway: "Study Permit" })).error,
        /supported immigration pathway/);
    assert.match(validateProfile(activeProfile({ stream: "Imaginary Express Entry Stream" })).error,
        /supported program stream/);
});

test("Express Entry profiles cannot select Quebec as their destination", () => {
    assert.match(validateProfile(activeProfile({ province: "Quebec" })).error,
        /outside Quebec/);
});

test("PNP profiles use the province assigned by the roadmap registry", () => {
    const result = validateProfile(activeProfile({
        pathway: "Provincial Nominee Program",
        stream: "Alberta Opportunity Stream (AAIP)",
        province: "Ontario"
    }));

    assert.equal(result.error, undefined);
    assert.equal(result.profile.province, "Alberta");
});

test("completed journeys require a logical permanent residence date", () => {
    const missing = validateProfile(activeProfile({ journeyType: "completed" }));
    assert.match(missing.error, /date you became a permanent resident/);

    const beforeStart = validateProfile(activeProfile({
        journeyType: "completed",
        permanentResidenceDate: "2024-01-01"
    }));
    assert.match(beforeStart.error, /after the pathway start date/);

    const valid = validateProfile(activeProfile({
        journeyType: "completed",
        permanentResidenceDate: "2026-01-15"
    }));
    assert.equal(valid.error, undefined);
    assert.equal(valid.profile.status, "Permanent resident");
    assert.equal(valid.profile.currentStage, "Landed as PR");
});

test("profile dates cannot be invalid or in the future", () => {
    assert.match(validateProfile(activeProfile({ journeyStartDate: "not-a-date" })).error,
        /valid dates/);
    assert.match(validateProfile(activeProfile({ journeyStartDate: "2099-01-01" })).error,
        /not in the future/);
});
