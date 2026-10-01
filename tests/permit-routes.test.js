const test = require("node:test");
const assert = require("node:assert/strict");
const { createPermitApp } = require("./helpers/permit-app");
const { roadmaps } = require("../data/roadmaps/registry");
const context = require("../public/js/pathway-context");

test("HTTP onboarding, route loading, progress and profile switches work for every permit", async t => {
    const { app, user } = createPermitApp();
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    async function request(url, method = "GET", body) {
        const response = await fetch(origin + url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    }
    for (const definition of roadmaps.filter(r => context.isPermit(r.pathway))) {
        const profile = { journeyType: "pathway", pathway: definition.pathway, stream: definition.stream, province: "Ontario", location: "Inside Canada", currentStatus: "Visitor", status: "Preparing application", currentStage: "Checking eligibility", journeyStartDate: "2025-01-01" };
        assert.equal((await request(`/api/profile/onboarding/${user.username}`, "PUT", profile)).status, 200);
        const roadmap = await request(`/api/journey/${encodeURIComponent(profile.pathway)}/${encodeURIComponent(profile.stream)}`);
        assert.equal(roadmap.status, 200);
        assert.equal(roadmap.data.profileKey, definition.profileKey);
        assert.deepEqual((await request(`/api/journey/progress/${user.username}`)).data.completedSteps, []);
        assert.equal((await request(`/api/journey/progress/${user.username}`, "PUT", { profileKey: definition.profileKey, completedSteps: [1] })).status, 200);
        const approved = await request(`/api/profile/${user.username}`, "PATCH", { journeyType: "completed", permitApprovalDate: "2025-08-01" });
        assert.equal(approved.status, 200);
        assert.equal(approved.data.profile.status, "Permit approved");
        assert.equal(approved.data.profile.permanentResidenceDate, null);
        assert.equal((await request(`/api/journey/progress/${user.username}`, "PUT", { profileKey: "EE-CEC", completedSteps: [1] })).status, 409);
    }
    const study = roadmaps.find(r => r.pathway === "Study Permit");
    assert.equal((await request(`/api/profile/${user.username}`, "PATCH", { journeyType: "pathway", pathway: study.pathway, stream: study.stream, currentStage: "Checking eligibility", status: "Preparing application" })).status, 200);
    assert.deepEqual((await request(`/api/journey/progress/${user.username}`)).data.completedSteps, [1]);
    assert.equal((await request(`/api/profile/${user.username}`, "PATCH", { currentStage: "Landed as PR" })).status, 400);
});
