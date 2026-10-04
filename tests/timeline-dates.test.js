const test=require('node:test');
const assert=require('node:assert/strict');
const {parseTimelineDate,validateTimelineDates}=require('../services/timelineDates');
const {forStep}=require('../public/js/timeline-labels');
const {createAnalyticsApp}=require('./helpers/analytics-app');

test('unknown dates remain null and event labels do not invent government milestones',()=>{
    assert.equal(parseTimelineDate(null),null);
    for(const value of [false,0,{},'','2026-02-30','2026-09-01T99:00:00.000Z'])assert.equal(parseTimelineDate(value),undefined);
    assert.equal(validateTimelineDates(null,null),null);
    assert.equal(validateTimelineDates(null,parseTimelineDate('2026-09-01')),null);
    assert.match(validateTimelineDates(parseTimelineDate('2026-09-02'),parseTimelineDate('2026-09-01')),/before/);
    assert.match(validateTimelineDates(parseTimelineDate('2099-01-01'),null),/future/);
    assert.equal(forStep({title:'Submit PR Application'}).finish,'Application submitted');
    assert.equal(forStep({title:'Create Express Entry Profile'}).finish,'Express Entry profile submitted');
    assert.equal(forStep({title:'PR Decision'}).finish,'Decision received');
    assert.equal(forStep({title:'Background Check'}).finish,'Finished this step');
});

test('timeline HTTP flow records past dates or unknown dates directly and corrects them later',async t=>{
    const fixture=createAnalyticsApp();
    const server=fixture.app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    async function request(path,method,body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','x-test-user':'analytics-test'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
    const route={pathway:'Express Entry',profileKey:'EE-CEC',applicationId:null};
    const unknown=await request('/api/timeline/start','POST',{...route,stepOrder:1,status:'completed',startedAt:null,completedAt:null});
    assert.equal(unknown.status,200);
    assert.equal(unknown.body.record.status,'completed');
    assert.equal(unknown.body.record.startedAt,null);
    assert.equal(unknown.body.record.completedAt,null);
    assert.equal(unknown.body.record.durationDays,null);
    const id=unknown.body.record._id;
    assert.equal((await request('/api/journey/progress/analytics-test','PUT',{profileKey:'EE-CEC',applicationId:null,completedSteps:[1]})).status,200);
    const corrected=await request(`/api/timeline/edit/${id}`,'PUT',{startedAt:'2026-09-01',completedAt:'2026-09-06'});
    assert.equal(corrected.body.record.durationDays,5);
    const old=JSON.stringify(fixture.records()[0]);
    assert.equal((await request(`/api/timeline/edit/${id}`,'PUT',{startedAt:'2026-09-07'})).status,400);
    assert.equal(JSON.stringify(fixture.records()[0]),old,'conflicts do not mutate valid saved dates');
    const cleared=await request(`/api/timeline/edit/${id}`,'PUT',{startedAt:null});
    assert.equal(cleared.body.record.durationDays,null);
    assert.equal(cleared.body.record.status,'completed');
    const started=await request('/api/timeline/start','POST',{...route,stepOrder:2,startedAt:null});
    assert.equal(started.body.record.startedAt,null);
    const finished=await request('/api/timeline/complete','PUT',{...route,stepOrder:2,completedAt:'2026-09-03'});
    assert.equal(finished.status,200);
    assert.equal(finished.body.durationDays,null);
    const direct=await request('/api/timeline/start','POST',{...route,stepOrder:3,status:'completed',startedAt:'2026-08-01',completedAt:'2026-08-15'});
    assert.equal(direct.body.record.durationDays,14);
    assert.equal((await request('/api/timeline/start','POST',{...route,stepOrder:4,startedAt:'2026-02-30'})).status,400);
    assert.equal((await request('/api/timeline/start','POST',{...route,stepOrder:4,startedAt:'2099-01-01'})).status,400);
    const legacy=await request('/api/timeline/start','POST',{...route,stepOrder:4});
    assert.ok(legacy.body.record.startedAt,'older clients that omit the field keep their existing click-time behavior');
    assert.equal((await request('/api/timeline/start','POST',{...route,stepOrder:4,status:'completed',startedAt:null,completedAt:null})).status,409,'stale new-record requests cannot silently claim completion');
});
