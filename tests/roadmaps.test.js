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
    assert.equal(options.streamProvinces["BC PNP Skilled Worker (Base)"], "British Columbia");
    assert.equal(options.streamProvinces["BC PNP Skilled Worker – Express Entry BC"], "British Columbia");
    assert.equal(options.streamProvinces["Ontario Workforce Priority: TEER 0–3 (Base)"], "Ontario");
    assert.equal(options.streamProvinces["Ontario Workforce Priority: TEER 0–3 (Express Entry)"], "Ontario");
    assert.equal(options.streamProvinces["SINP International Skilled Worker: Saskatchewan Express Entry"], "Saskatchewan");
    assert.equal(options.streamProvinces["SINP International Skilled Worker: Occupations In-Demand"], "Saskatchewan");
    assert.equal(options.streamProvinces["SINP International Skilled Worker: Employment Offer"], "Saskatchewan");
    assert.equal(options.streamProvinces["NBPNP Skilled Worker: New Brunswick Experience"], "New Brunswick");
    assert.equal(options.streamProvinces["NBPNP Skilled Worker: New Brunswick Graduates"], "New Brunswick");
    assert.equal(options.streamProvinces["NBPNP Skilled Worker: New Brunswick Priority Occupations"], "New Brunswick");
    assert.equal(options.streamProvinces["NBPNP Express Entry: Employment in New Brunswick"], "New Brunswick");
    assert.equal(options.streamProvinces["NBPNP Express Entry: New Brunswick Interest"], "New Brunswick");
    assert.equal(options.streamProvinces["NSNP Skilled Worker"], "Nova Scotia");
    assert.equal(options.streamProvinces["NSNP Nova Scotia Graduate"], "Nova Scotia");
    assert.equal(options.streamProvinces["NSNP Entrepreneur"], "Nova Scotia");
    assert.equal(options.streamProvinces["NSNP Nova Scotia: Express Entry"], "Nova Scotia");
});

test("new provincial guidance has official sources and valid content identifiers", () => {
    const trustedHosts = new Set([
        "www.alberta.ca", "immigratemanitoba.com", "www.canada.ca",
        "www.welcomebc.ca", "www.ontario.ca", "www.saskatchewan.ca",
        "www.gnb.ca", "www2.gnb.ca", "liveinnovascotia.com"
    ]);
    for(const definition of roadmaps.filter(item => item.pathway === "Provincial Nominee Program")){
        const roadmap = loadRoadmap(definition);
        assert.equal(roadmap.schemaVersion, 2);
        assert.ok(roadmap.steps.length >= 12);
        assert.equal(roadmap.province, definition.province);
        assert.ok(["active", "limited"].includes(roadmap.programStatus));
        assert.match(roadmap.lastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(["express-entry", "non-express-entry", "route-dependent"]
            .includes(roadmap.federalApplicationRoute));
        assert.ok(roadmap.officialProgramPage);
        for(const step of roadmap.steps){
            assert.ok(["applicant", "waiting", "province", "ircc"].includes(step.type));
            assert.ok(step.description);
            assert.ok(step.officialLinks.length > 0, `${definition.profileKey} step ${step.order}`);
            const links = [
                roadmap.officialProgramPage,
                ...step.officialLinks,
                ...step.requiredDocuments.flatMap(document => document.officialLinks || []),
                ...(step.governmentTimeline?.source ? [step.governmentTimeline.source] : [])
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

    const sinpExpress = loadRoadmap(findRoadmap("Provincial Nominee Program", "SINP International Skilled Worker: Saskatchewan Express Entry"));
    const sinpDemand = loadRoadmap(findRoadmap("Provincial Nominee Program", "SINP International Skilled Worker: Occupations In-Demand"));
    const sinpOffer = loadRoadmap(findRoadmap("Provincial Nominee Program", "SINP International Skilled Worker: Employment Offer"));
    assert.equal(sinpExpress.programStatus, "limited");
    assert.equal(sinpDemand.programStatus, "limited");
    assert.equal(sinpOffer.programStatus, "active");
    assert.match(sinpExpress.steps[4].description, /no scheduled EOI draws/);
    assert.match(sinpDemand.steps[4].description, /no scheduled EOI draws/);
    assert.match(sinpOffer.steps[3].description, /within 10 days/);

    const nbExperience = loadRoadmap(findRoadmap("Provincial Nominee Program", "NBPNP Skilled Worker: New Brunswick Experience"));
    const nbGraduate = loadRoadmap(findRoadmap("Provincial Nominee Program", "NBPNP Skilled Worker: New Brunswick Graduates"));
    const nbPriority = loadRoadmap(findRoadmap("Provincial Nominee Program", "NBPNP Skilled Worker: New Brunswick Priority Occupations"));
    const nbEmployment = loadRoadmap(findRoadmap("Provincial Nominee Program", "NBPNP Express Entry: Employment in New Brunswick"));
    const nbInterest = loadRoadmap(findRoadmap("Provincial Nominee Program", "NBPNP Express Entry: New Brunswick Interest"));
    assert.equal(nbExperience.programStatus, "limited");
    assert.equal(nbGraduate.programStatus, "active");
    assert.equal(nbPriority.programStatus, "limited");
    assert.equal(nbEmployment.programStatus, "active");
    assert.equal(nbInterest.programStatus, "limited");
    assert.match(nbExperience.steps[0].description, /health care, education and construction/);
    assert.match(nbPriority.steps[0].description, /Government of New Brunswick-led recruitment mission/);
    assert.match(nbEmployment.steps[0].description, /past 12 months/);
    assert.match(nbInterest.steps[0].description, /letter of interest/);

    const nsSkilled = loadRoadmap(findRoadmap("Provincial Nominee Program", "NSNP Skilled Worker"));
    const nsGraduate = loadRoadmap(findRoadmap("Provincial Nominee Program", "NSNP Nova Scotia Graduate"));
    const nsEntrepreneur = loadRoadmap(findRoadmap("Provincial Nominee Program", "NSNP Entrepreneur"));
    const nsExpress = loadRoadmap(findRoadmap("Provincial Nominee Program", "NSNP Nova Scotia: Express Entry"));
    assert.equal(nsSkilled.programStatus, "limited");
    assert.equal(nsGraduate.programStatus, "limited");
    assert.equal(nsEntrepreneur.programStatus, "limited");
    assert.equal(nsExpress.programStatus, "limited");
    assert.match(nsSkilled.steps[0].description, /Occupations in Demand category currently lists no occupations/);
    assert.match(nsGraduate.steps[0].description, /32102, 32124, 33102 or 42202/);
    assert.match(nsEntrepreneur.steps[6].description, /\$2,000 provincial fee/);
    assert.match(nsExpress.steps[6].description, /\$1,000 worker-stream fee/);
});

test("Nova Scotia consolidated streams use the correct federal route", () => {
    for(const stream of ["NSNP Skilled Worker", "NSNP Nova Scotia Graduate", "NSNP Entrepreneur"]){
        const roadmap = loadRoadmap(findRoadmap("Provincial Nominee Program", stream));
        assert.equal(roadmap.federalApplicationRoute, "non-express-entry");
        assert.ok(roadmap.steps.some(step => /non-Express Entry permanent residence application|submit the federal application/.test(step.title)));
        assert.ok(!roadmap.steps.some(step => /Accept the electronic/.test(step.title)));
    }
    const express = loadRoadmap(findRoadmap("Provincial Nominee Program", "NSNP Nova Scotia: Express Entry"));
    assert.equal(express.federalApplicationRoute, "express-entry");
    assert.ok(express.steps.some(step => /Accept the electronic/.test(step.title)));
    assert.ok(express.steps.some(step => /Express Entry permanent residence application/.test(step.title)));
});

test("New Brunswick base and Express Entry pathways keep their federal routes separate", () => {
    const skilledStreams = [
        "NBPNP Skilled Worker: New Brunswick Experience",
        "NBPNP Skilled Worker: New Brunswick Graduates",
        "NBPNP Skilled Worker: New Brunswick Priority Occupations"
    ];
    const expressStreams = [
        "NBPNP Express Entry: Employment in New Brunswick",
        "NBPNP Express Entry: New Brunswick Interest"
    ];
    for(const stream of skilledStreams){
        const roadmap = loadRoadmap(findRoadmap("Provincial Nominee Program", stream));
        assert.equal(roadmap.federalApplicationRoute, "non-express-entry");
        assert.ok(roadmap.steps.some(step => /non-Express Entry permanent residence application/.test(step.title)));
        assert.ok(!roadmap.steps.some(step => /Accept the electronic/.test(step.title)));
    }
    for(const stream of expressStreams){
        const roadmap = loadRoadmap(findRoadmap("Provincial Nominee Program", stream));
        assert.equal(roadmap.federalApplicationRoute, "express-entry");
        assert.ok(roadmap.steps.some(step => /Accept the electronic/.test(step.title)));
        assert.ok(roadmap.steps.some(step => /Express Entry permanent residence application/.test(step.title)));
    }
});

test("base and Express Entry variants use separate profile keys and federal steps", () => {
    const pairs = [
        ["BC PNP Skilled Worker (Base)", "BC PNP Skilled Worker – Express Entry BC"],
        ["Ontario Workforce Priority: TEER 0–3 (Base)", "Ontario Workforce Priority: TEER 0–3 (Express Entry)"],
        ["SINP International Skilled Worker: Occupations In-Demand", "SINP International Skilled Worker: Saskatchewan Express Entry"]
    ];
    for(const [baseName, expressName] of pairs){
        const baseDefinition = findRoadmap("Provincial Nominee Program", baseName);
        const expressDefinition = findRoadmap("Provincial Nominee Program", expressName);
        assert.notEqual(baseDefinition.profileKey, expressDefinition.profileKey);

        const base = loadRoadmap(baseDefinition);
        const express = loadRoadmap(expressDefinition);
        assert.equal(base.federalApplicationRoute, "non-express-entry");
        assert.equal(express.federalApplicationRoute, "express-entry");
        assert.ok(base.steps.some(step => /non-Express Entry permanent residence application/.test(step.title)));
        assert.ok(!base.steps.some(step => /Accept the electronic/.test(step.title)));
        assert.ok(express.steps.some(step => /Accept the electronic/.test(step.title)));
        assert.ok(express.steps.some(step => /Express Entry permanent residence application/.test(step.title)));
        assert.deepEqual(express.steps.map(step => step.order),
            express.steps.map((_, index) => index + 1));
    }

    assert.ok(!options.streams["Provincial Nominee Program"]
        .some(stream => /Human Capital Priorities|Employer Job Offer: Foreign Worker/.test(stream)));
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
