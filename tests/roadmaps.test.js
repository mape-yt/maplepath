const test = require("node:test");
const assert = require("node:assert/strict");
const options = require("../data/immigrationOptions");
const { roadmaps, findRoadmap, loadRoadmap } = require("../data/roadmaps/registry");
const { progressFor, migrateLegacyProgress, mirrorCurrentProgress, saveProgress } = require("../services/journeyProgress");

test("every advertised Express Entry and PNP stream has a distinct registered roadmap", () => {
    const keys = new Set();
    for(const pathway of ["Express Entry", "Provincial Nominee Program"]){
        for(const stream of options.streams[pathway]){
            const definition = findRoadmap(pathway, stream);
            assert.ok(definition, `${pathway} / ${stream}`);
            assert.ok(!keys.has(definition.profileKey), `duplicate profile key ${definition.profileKey}`);
            keys.add(definition.profileKey);
            const roadmap = loadRoadmap(definition);
            assert.equal(roadmap.pathway, pathway);
            assert.equal(roadmap.stream, stream);
            assert.equal(roadmap.profileKey, definition.profileKey);
            assert.ok(roadmap.steps.length > 0);
            assert.deepEqual(roadmap.steps.map(step => step.order),
                roadmap.steps.map((_, index) => index + 1));
        }
    }
    assert.equal(keys.size, roadmaps.length);
    assert.equal(options.streamProvinces["Alberta Opportunity Stream (AAIP)"], "Alberta");
    assert.equal(options.streamProvinces["Skilled Worker in Manitoba (MPNP)"], "Manitoba");
});

test("new provincial guidance has official sources and valid content identifiers", () => {
    const trustedHosts = new Set(["www.alberta.ca", "immigratemanitoba.com", "www.canada.ca"]);
    for(const definition of roadmaps.filter(item => item.pathway === "Provincial Nominee Program")){
        const roadmap = loadRoadmap(definition);
        assert.equal(roadmap.schemaVersion, 2);
        assert.equal(roadmap.steps.length, 12);
        for(const step of roadmap.steps){
            assert.ok(["applicant", "waiting", "province", "ircc"].includes(step.type));
            assert.ok(step.description);
            assert.ok(step.officialLinks.length > 0, `${definition.profileKey} step ${step.order}`);
            assert.equal(step.governmentTimeline, null);
            const links = [
                ...step.officialLinks,
                ...step.requiredDocuments.flatMap(document => document.officialLinks || [])
            ];
            for(const link of links){
                const url = new URL(link.url);
                assert.equal(url.protocol, "https:");
                assert.ok(trustedHosts.has(url.hostname), url.hostname);
                assert.match(link.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
            }
            for(const entries of [step.requiredDocuments, step.preparationChecklist]){
                const ids = entries.map(entry => entry.id);
                assert.equal(new Set(ids).size, ids.length);
                ids.forEach(id => assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/));
            }
            step.requiredDocuments.filter(document => document.requirement === "conditional")
                .forEach(document => assert.ok(document.condition));
        }
    }
    const manitoba = loadRoadmap(findRoadmap("Provincial Nominee Program", "Skilled Worker in Manitoba (MPNP)"));
    assert.match(manitoba.steps[7].description, /enhanced Express Entry nomination needs different federal steps/);
    assert.match(manitoba.steps[8].description, /not linked to Express Entry/);
});

test("legacy Express Entry progress migrates once and PNP streams stay separate", () => {
    const user = {
        immigrationProfile:{ pathway:"Express Entry", stream:"Canadian Experience Class (CEC)" },
        immigrationJourney:{ completedSteps:[1,2], currentStep:3 },
        journeyProgressByProfile:new Map(),
        legacyJourneyMigrated:false
    };
    assert.equal(migrateLegacyProgress(user), true);
    assert.deepEqual([...progressFor(user, "EE-CEC").completedSteps], [1,2]);
    assert.equal(migrateLegacyProgress(user), false);

    const alberta = findRoadmap("Provincial Nominee Program", "Alberta Opportunity Stream (AAIP)");
    user.immigrationProfile = {pathway:alberta.pathway, stream:alberta.stream};
    mirrorCurrentProgress(user, alberta);
    assert.deepEqual(user.immigrationJourney.completedSteps, []);
    saveProgress(user, alberta.profileKey, [1], 2);
    assert.deepEqual([...progressFor(user, "EE-CEC").completedSteps], [1,2]);
    assert.deepEqual([...progressFor(user, "PNP-AAIP-AOS").completedSteps], [1]);
    assert.deepEqual([...progressFor(user, "PNP-MPNP-SWM").completedSteps], []);
});
