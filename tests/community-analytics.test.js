const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeStep, durationDays, POLICY, communityDataMode } = require("../services/communityAnalytics");
const { render } = require("../public/js/community-ui");
const now = new Date("2026-10-02T12:00:00Z"), DAY = 86400000;
const definition = { profileKey: "EE-CEC", pathway: "Express Entry" };
const step = { order: 4, title: "Wait for a decision", type: "ircc" };
const config = { definition, step, now, username: "viewer", dataMode: "community" };
function record(days, index, fields = {}) {
    const end = new Date(now.getTime() - 10 * DAY);
    return { _id: String(index).padStart(24, "0"), username: `person-${index}`, ...definition,
        dataSource: "self-reported", stepOrder: 4, status: "completed", startedAt: new Date(end - days * DAY),
        completedAt: end, durationDays: days, updatedAt: end,
        context: { location: "Inside Canada" }, ...fields };
}
const sample = values => values.map((days, i) => record(days, i));
const active = (days = 10) => record(1, 999, { username: "viewer", status: "in-progress",
    startedAt: new Date(now - days * DAY), completedAt: null, durationDays: null });

test("test and unlabelled data stay excluded even after real collection is enabled", () => {
    const rows = sample(Array(30).fill(10)).map((row,i)=>({...row,dataSource:i%2 ? "test" : undefined}));
    const before = JSON.stringify(rows);
    const result = summarizeStep([...rows,...sample([20,20,20,20,20]).map((row,i)=>({...row,username:`real-${i}`}))],config);
    assert.equal(result.averageDays,20);
    assert.equal(result.totalUsers,5);
    assert.equal(result.quality.testOrUnlabelled,30);
    assert.equal(JSON.stringify(rows),before);
    const activeTest = {...active(),dataSource:"test"};
    assert.match(summarizeStep([...sample(Array(30).fill(20)),activeTest],config).forecast.reason,/test or unlabelled/);
});

test("testing mode suppresses all statistics and fails closed when the mode is omitted", () => {
    const rows=[...sample(Array(30).fill(20)),active()];
    for (const dataMode of ["testing",undefined,"typo"]) {
        const result=summarizeStep(rows,{...config,dataMode});
        assert.equal(result.status,"testing");
        assert.equal(result.averageDays,null);
        assert.equal(result.medianDays,null);
        assert.equal(result.forecast.status,"unavailable");
        assert.equal(result.totalUsers,0);
        const html=render(result,active());
        assert.match(html,/Test timelines are excluded/);
        assert.doesNotMatch(html,/more days|days median/);
    }
});

test("community collection requires an explicit server setting", t => {
    const previous=process.env.COMMUNITY_DATA_MODE;
    t.after(()=>{if(previous===undefined)delete process.env.COMMUNITY_DATA_MODE;else process.env.COMMUNITY_DATA_MODE=previous;});
    delete process.env.COMMUNITY_DATA_MODE;
    assert.equal(communityDataMode(),"testing");
    process.env.COMMUNITY_DATA_MODE="production";
    assert.equal(communityDataMode(),"testing");
    process.env.COMMUNITY_DATA_MODE="community";
    assert.equal(communityDataMode(),"community");
});

test("small samples never expose numeric durations or a completion estimate", () => {
    for (let size = 0; size < POLICY.minimumUsers; size++) {
        const result = summarizeStep([...sample(Array(size).fill(12)), active()], config);
        assert.equal(result.averageDays, null);
        assert.equal(result.medianDays, null);
        assert.equal(result.range, null);
        assert.equal(result.forecast.status, "unavailable");
    }
});

test("unusual records stay in the mean, median and range without modifying input", () => {
    const rows = sample([9,10,10,11,11,12,12,13,13,1000]);
    const before = JSON.stringify(rows);
    const result = summarizeStep(rows, config);
    assert.equal(result.averageDays, 110);
    assert.equal(result.medianDays, 12);
    assert.equal(result.quality.unusual, 1);
    assert.equal(result.totalUsers, 10);
    assert.equal(result.averageUsers, 10);
    assert.equal(result.totalRecords, 10);
    assert.equal(JSON.stringify(rows), before);
});

test("separate records from the same account count, while self and other routes stay separate", () => {
    const rows = sample([10,10,10,10,10]);
    rows.push(record(90, 30, { username: "person-0", updatedAt: new Date(now) }));
    rows.push(record(700, 20, { username: "viewer" }));
    rows.push(record(700, 21, { profileKey: "EE-FSWP" }));
    rows.push(record(700, 22, { stepOrder: 5 }));
    const result = summarizeStep(rows, config);
    assert.equal(result.totalUsers, 5);
    assert.equal(result.totalRecords, 6);
    assert.equal(result.averageDays, 23);
    assert.equal(result.quality.repeatedRecordCopies, 0);
    assert.equal(result.quality.unusual, 0, "Small samples do not flag statistical outliers");
});

test("matching durations and dates retain their frequency, including within one account", () => {
    const rows = sample([10,10,10,10,100]);
    rows.push(record(10, 50, {username:"person-0"}));
    const result = summarizeStep(rows,config);
    assert.equal(result.totalRecords,6);
    assert.equal(result.totalUsers,5);
    assert.equal(result.averageDays,25); // Five tens and one hundred, not unique values.
    assert.equal(result.medianDays,10);
    assert.equal(result.quality.repeatedRecordCopies,0);
    assert.match(render(result),/6 timelines from 5 other contributors/);
    assert.match(render(result),/Matching dates and durations count separately/);
    assert.doesNotMatch(render(result),/Filtered average|duplicates ignored/);
});

test("only repeated reads of one saved ID collapse; edits never become extra observations", () => {
    const rows = sample([10,10,10,10,10]);
    const edited = record(90, 0, { updatedAt: new Date(now) });
    const result = summarizeStep([...rows,edited,edited],config);
    assert.equal(result.totalRecords,5);
    assert.equal(result.averageDays,26);
    assert.equal(result.quality.repeatedRecordCopies,2);
    const invalidEdit = {...edited,completedAt:null};
    const invalid = summarizeStep([...rows,invalidEdit],config);
    assert.equal(invalid.totalRecords,4,"an invalid edit cannot fall back to its older version");
    assert.equal(invalid.averageDays,null);
    // Missing IDs are not guessed from matching account, dates or values.
    assert.equal(summarizeStep([...rows,record(10,40,{_id:undefined,username:"person-0"})],config).totalRecords,6);
});

test("many records from a few contributors cannot unlock statistics or forecasts", () => {
    const few = sample(Array(100).fill(30)).map((r,i)=>({...r,username:`person-${i%4}`}));
    const small = summarizeStep(few,config);
    assert.equal(small.totalRecords,100);
    assert.equal(small.totalUsers,4);
    assert.equal(small.averageDays,null);
    assert.equal(small.range,null);
    assert.equal(small.sampleLabel,"Not enough data");
    const nineteen = sample(Array(100).fill(30)).map((r,i)=>({...r,username:`person-${i%19}`}));
    const noForecast = summarizeStep([...nineteen,active()],config);
    assert.equal(noForecast.recentUsers,19);
    assert.equal(noForecast.recentRecords,100);
    assert.equal(noForecast.forecast.status,"unavailable");
    const mixedWaits = [...sample(Array(20).fill(30)),record(5,40),active(10)];
    mixedWaits[19].username="person-0";
    assert.equal(summarizeStep(mixedWaits,config).forecast.status,"unavailable","20 recent contributors but only 19 waited long enough");
    const enough = summarizeStep([...nineteen,record(30,200),active()],config);
    assert.equal(enough.forecast.status,"available");
    assert.equal(enough.forecast.totalUsers,20);
    assert.equal(enough.forecast.totalRecords,101);
});

test("invalid and stale dates are excluded; stored duration cannot override dates", () => {
    const rows = sample([10,10,10,10,10]);
    rows[0].durationDays = 9000;
    rows.push(record(2, 6, { startedAt: "2026-02-30", completedAt: "2026-03-10" }));
    rows.push(record(2, 7, { completedAt: null }));
    rows.push(record(2, 8, { startedAt: new Date(now.getTime() + 3 * DAY) }));
    rows.push(record(2, 9, { startedAt: "2020-01-01", completedAt: "2020-02-01" }));
    rows.push(record(2, 10, { startedAt: "2026-09-22", completedAt: "2026-09-20" }));
    rows.push(record(2, 11, { pathway: "Work Permit" }));
    const result = summarizeStep(rows, config);
    assert.equal(result.averageDays, 10);
    assert.equal(result.quality.invalid, 5);
    assert.equal(result.quality.older, 1);
    assert.equal(result.quality.durationCorrections, 1);
});

test("location cohorts use historical snapshots and never infer missing locations", () => {
    const rows = sample([10,10,10,10,10]);
    rows.push(record(900, 6, { context: undefined }));
    rows.push(record(800, 7, { context: { location: "Outside Canada" } }));
    assert.equal(summarizeStep(rows, {...config, location:"Inside Canada"}).averageDays, 10);
    assert.equal(summarizeStep(rows, config).totalUsers, 7);
    assert.equal(summarizeStep(rows, {...config, location:"Outside Canada"}).medianDays, null);
});

test("tied quartiles have a day-sized tolerance and same-day durations are valid", () => {
    const result = summarizeStep(sample([1,1,1,1,1,1,1,1,2,900]), config);
    assert.equal(result.quality.unusual, 1);
    assert.equal(result.averageUsers, 10);
    assert.equal(result.averageDays, 91);
    assert.equal(durationDays("2026-09-01", "2026-09-01"), 1);
    assert.equal(durationDays(null, "2026-09-01"), null);
});

test("remaining-time range is conditional on elapsed time and retains valid long cases", () => {
    const rows = [...sample(Array.from({length:24}, (_, i) => 30 + i)), active(10)];
    const result = summarizeStep(rows, config);
    assert.equal(result.forecast.status, "available");
    assert.equal(result.forecast.lowerDays, 25);
    assert.equal(result.forecast.upperDays, 38);
    assert.equal(result.forecast.totalUsers, 24);
    assert.equal(summarizeStep([...sample(Array(24).fill(30)), active(40)], config).forecast.status, "unavailable");
    const tails = [...sample([...Array(20).fill(20), ...Array(20).fill(80), ...Array(10).fill(1000)]), active(75)];
    assert.equal(summarizeStep(tails, config).forecast.totalUsers, 30);
});

test("forecasts stop for old samples, action steps, mixed categories and ongoing-heavy samples", () => {
    const rows = [...sample(Array(24).fill(30)), active()];
    assert.equal(summarizeStep(rows, {...config,step:{...step,type:"applicant"}}).forecast.status,"unavailable");
    assert.equal(summarizeStep(rows, {...config,step:{...step,type:"waiting",title:"Receive Invitation to Apply"}}).forecast.status,"unavailable");
    const oldRows = rows.map(r => r.username === "viewer" ? r : {...r, startedAt:"2025-01-01",completedAt:"2025-02-01"});
    assert.equal(summarizeStep(oldRows,config).forecast.status,"unavailable");
    const mixed = {...definition,pathway:"Work Permit",profileKey:"WP-OPEN"};
    assert.equal(summarizeStep(rows.map(r=>({...r,...mixed})),{...config,definition:mixed,location:"Inside Canada"}).forecast.status,"unavailable");
    const busy = rows.concat(Array.from({length:24},(_,i)=>({...active(),_id:`ongoing-${i}`,username:`ongoing-${i}`})));
    assert.equal(summarizeStep(busy,config).forecast.status,"unavailable");
});

test("permit estimates require a matching known location for the viewer", () => {
    const permit = {pathway:"Work Permit",profileKey:"WP-PGWP"};
    const rows = [...sample(Array(24).fill(30)),active()].map(r=>({...r,...permit}));
    assert.equal(summarizeStep(rows,{...config,definition:permit}).forecast.status,"unavailable");
    assert.equal(summarizeStep(rows,{...config,definition:permit,location:"Inside Canada"}).forecast.status,"available");
    rows.at(-1).context = undefined;
    assert.equal(summarizeStep(rows,{...config,definition:permit,location:"Inside Canada"}).forecast.status,"unavailable");
});

test("editing a previously extreme duration changes the result immediately without a cache", () => {
    const rows = sample([10,10,10,10,10,10,10,10,10,900]);
    assert.equal(summarizeStep(rows,config).quality.unusual,1);
    rows[9].startedAt = rows[0].startedAt;
    assert.equal(summarizeStep(rows,config).quality.unusual,0);
    assert.equal(summarizeStep(rows,config).quality.durationCorrections,1);
});

test("public responses and UI do not expose identities, raw dates or unsupported confidence claims", () => {
    const result=summarizeStep(sample([10,11,12,13,14]),config);
    assert.doesNotMatch(JSON.stringify(result),/person-|username|startedAt/);
    const html=render({...result, sampleLabel:'<img src=x onerror=alert(1)>'});
    assert.doesNotMatch(html,/<img|High confidence|Estimated Completion/);
    assert.match(html,/&lt;img/);
    assert.match(render(summarizeStep([],config)),/Building the sample/);
    assert.match(render({status:"unavailable"}),/unavailable/);
});
