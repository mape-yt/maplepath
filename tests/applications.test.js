const test = require('node:test');
const assert = require('node:assert/strict');
const {validateDetails} = require('../services/applications');
const {createAnalyticsApp} = require('./helpers/analytics-app');
const Application = require('../models/Application');
const TimelineRecord = require('../models/TimelineRecord');
const now=new Date('2026-10-03T12:00:00Z');
const permit={pathway:'Work Permit',profileKey:'WP-PGWP'};

test('application questions accept only useful fields and validate known dates',()=>{
    assert.deepEqual(validateDetails({},permit,now).details,{permitType:'',submissionLocation:'',submittedOn:'',decidedOn:'',outcome:''});
    for(const input of [
        {education:'degree'}, {username:'someone'}, {applicationNumber:'private'}, {dataSource:'self-reported'},
        {submittedOn:'2026-02-30'}, {submittedOn:'2027-01-01'}, {submittedOn:5},
        {submittedOn:'2026-09-01',decidedOn:'2026-08-01',outcome:'approved'},
        {submittedOn:'2026-09-01',decidedOn:'2026-09-02'},
        {permitType:'anything'}, {submissionLocation:'Edmonton'}
    ]) assert.ok(validateDetails(input,permit,now).error,JSON.stringify(input));
    assert.ok(validateDetails({permitType:'new'},{pathway:'Express Entry'},now).error);
    assert.ok(validateDetails({submittedOn:'2026-09-01',decidedOn:'2026-09-01',outcome:'refused'},permit,now).details);
    assert.ok(validateDetails({outcome:'approved',submissionLocation:'Inside Canada'},permit,now).details);
    assert.ok(validateDetails({decidedOn:'2026-09-01',outcome:'approved'},permit,now).details);
});

test('new application indexes distinguish actual attempts without constraining matching durations',()=>{
    const index=TimelineRecord.schema.indexes().find(([keys])=>keys.applicationId===1);
    assert.equal(index[1].unique,true);
    assert.deepEqual(index[1].partialFilterExpression,{applicationId:{$type:'objectId'}});
    assert.equal(TimelineRecord.schema.path('applicationId').options.immutable,true);
    assert.equal(Application.schema.path('dataSource').options.immutable,true);
});

test('application routes preserve legacy history, isolate attempts, protect ownership and use submission context',async t=>{
    const previousMode=process.env.COMMUNITY_DATA_MODE;
    delete process.env.COMMUNITY_DATA_MODE;
    t.after(()=>{if(previousMode===undefined)delete process.env.COMMUNITY_DATA_MODE;else process.env.COMMUNITY_DATA_MODE=previousMode;});
    const old={username:'analytics-test',pathway:'Express Entry',profileKey:'EE-CEC',stepOrder:1,stepTitle:'Check Eligibility',
        startedAt:new Date('2026-08-01'),completedAt:new Date('2026-08-11'),status:'completed',dataSource:'test',durationDays:10};
    const fixture=createAnalyticsApp([old]);
    fixture.user.journeyProgressByProfile.set('EE-CEC',{completedSteps:[1],currentStep:2});
    const original=JSON.stringify(fixture.records());
    const server=fixture.app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    async function request(path,method='GET',body) {
        const response=await fetch(base+path,{method,headers:{'x-test-user':'analytics-test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
        return {status:response.status,body:await response.json()};
    }
    const key={profileKey:'EE-CEC'};
    assert.equal((await fetch(base+'/api/applications')).status,401);
    assert.equal((await request('/api/applications')).body.applications.length,0);
    const first=await request('/api/applications','POST',{...key,submittedOn:'2026-08-01'});
    assert.equal(first.status,201);
    const a=first.body.application.id;
    assert.equal(first.body.application.includesLegacy,true);
    assert.deepEqual((await request('/api/journey/progress/analytics-test')).body.completedSteps,[1]);
    assert.equal(JSON.stringify(fixture.records()),original,'saving details never rewrites legacy records');
    assert.equal((await request('/api/timeline/start','POST',{...key,pathway:'Express Entry',stepOrder:1,applicationId:a})).status,409);
    const second=await request('/api/applications','POST',{...key,applicationId:a});
    assert.equal(second.status,201);
    const b=second.body.application.id;
    assert.notEqual(a,b);
    assert.equal(second.body.application.includesLegacy,false);
    assert.deepEqual((await request('/api/journey/progress/analytics-test')).body.completedSteps,[]);
    assert.equal((await request('/api/applications','POST',{...key,applicationId:b})).status,409,'no stack of empty applications');
    const stale={...key,pathway:'Express Entry',stepOrder:1,applicationId:a};
    assert.equal((await request('/api/timeline/start','POST',stale)).status,409);
    assert.equal((await request('/api/journey/progress/analytics-test','PUT',{...key,applicationId:a,completedSteps:[1,2]})).status,409);
    const startBody={...stale,applicationId:b};
    const started=await request('/api/timeline/start','POST',startBody);
    assert.equal(started.status,200);
    assert.equal(started.body.record.applicationId,b);
    assert.equal((await request('/api/timeline/start','POST',startBody)).body.record._id,started.body.record._id);
    assert.equal(fixture.records().length,2);
    assert.equal((await request('/api/timeline/complete','PUT',startBody)).status,200);
    assert.equal((await request('/api/journey/progress/analytics-test','PUT',{...key,applicationId:b,completedSteps:[1,2]})).status,200);
    assert.equal((await request(`/api/applications/${a}/select`,'POST',key)).status,200);
    assert.deepEqual((await request('/api/journey/progress/analytics-test')).body.completedSteps,[1]);
    const edited=await request(`/api/applications/${a}`,'PUT',{...key,submittedOn:'2026-08-02',decidedOn:'2026-08-20',outcome:'approved'});
    assert.equal(edited.status,200);
    assert.equal(fixture.applications().length,2,'edit does not create a contribution');
    assert.equal((await request(`/api/applications/${a}`,'PUT',{...key,applicationNumber:'secret'})).status,400);
    assert.equal((await request('/api/applications/000000000000000000000099/select','POST',key)).status,404);
    const stranger=new Application({username:'someone-else',profileKey:'EE-CEC',dataSource:'self-reported'});
    fixture.applications().push(stranger);
    assert.equal((await request(`/api/applications/${stranger._id}`,'PUT',key)).status,404);
    assert.equal((await request(`/api/applications/${stranger._id}/select`,'POST',key)).status,404);
    process.env.COMMUNITY_DATA_MODE='community';
    assert.equal((await request(`/api/applications/${a}`,'PUT',{...key,submittedOn:'2026-08-02'})).status,200);
    assert.equal(fixture.applications()[0].dataSource,'test');
    const testStep=await request('/api/timeline/start','POST',{...key,pathway:'Express Entry',stepOrder:2,applicationId:a});
    assert.equal(testStep.body.record.dataSource,'test','new steps in a test application stay test data after mode changes');
    fixture.user.immigrationProfile={pathway:'Work Permit',stream:'Post-graduation work permit (PGWP)',location:'Outside Canada'};
    assert.equal((await request(`/api/applications/${a}/select`,'POST',key)).status,409);
    const work={profileKey:'WP-PGWP',submittedOn:'2026-08-01',permitType:'new',submissionLocation:'Inside Canada'};
    const workApp=await request('/api/applications','POST',work);
    assert.equal(workApp.status,201);
    assert.equal(workApp.body.application.submissionLocation,'Inside Canada','current profile location is not substituted');
    const workId=workApp.body.application.id;
    const workStart=await request('/api/timeline/start','POST',{profileKey:'WP-PGWP',pathway:'Work Permit',stepOrder:1,applicationId:workId});
    assert.equal(workStart.status,200);
    assert.ok(!workStart.body.record.context?.location,'linked permit records do not copy unused current location');
    const rows=[];
    for(let i=0;i<5;i++)for(let attempt=0;attempt<2;attempt++) {
        const app=new Application({username:`peer-${i}`,profileKey:'WP-PGWP',dataSource:'self-reported',permitType:attempt?'extension':'new',submissionLocation:'Inside Canada',submittedOn:'2026-08-01'});
        fixture.applications().push(app);
        rows.push({...old,username:app.username,pathway:'Work Permit',profileKey:'WP-PGWP',applicationId:app._id,dataSource:'self-reported',context:{location:'Outside Canada'}});
    }
    fixture.replace(rows);
    const all=await request('/api/analytics/WP-PGWP/1');
    assert.equal(all.body.totalRecords,10);
    assert.equal(all.body.totalUsers,5);
    const grouped=await request('/api/analytics/WP-PGWP/1?location=Inside%20Canada&permitType=new');
    assert.equal(grouped.body.totalRecords,5);
    assert.equal(grouped.body.averageDays,10);
    assert.equal(grouped.body.locationBasis,'submission');
    assert.doesNotMatch(JSON.stringify(grouped.body),/peer-|applicationId|submittedOn|_id/);
    assert.equal((await request('/api/analytics/WP-PGWP/1?location=Outside%20Canada&permitType=new')).body.totalRecords,0);
    fixture.applications().at(-1).permitType='new';
    assert.equal((await request('/api/analytics/WP-PGWP/1?permitType=new')).body.totalRecords,6,'corrected metadata affects next calculation');
    fixture.applications().at(-1).username='different-owner';
    assert.equal((await request('/api/analytics/WP-PGWP/1?permitType=new')).body.totalRecords,5,'cross-owner references are not evidence');
    const legacyPeer=new Application({username:'legacy-real',profileKey:'WP-PGWP',includesLegacy:true,dataSource:'self-reported',permitType:'new',submissionLocation:'Inside Canada',submittedOn:'2026-08-01'});
    fixture.applications().push(legacyPeer);
    fixture.records().push(new TimelineRecord({...old,username:'legacy-real',pathway:'Work Permit',profileKey:'WP-PGWP',dataSource:'self-reported'}));
    assert.equal((await request('/api/analytics/WP-PGWP/1?location=Inside%20Canada&permitType=new')).body.totalRecords,6,'first application details explicitly cover its legacy timeline without rewriting it');
    fixture.user.immigrationProfile={pathway:'Express Entry',stream:'Canadian Experience Class (CEC)'};
    assert.equal((await request('/api/journey/progress/analytics-test')).body.application.id,a,'switching pathways restores the selected attempt');
    const undated=await request('/api/applications','POST',{...key,applicationId:a,outcome:'refused'});
    assert.equal(undated.status,201);
    assert.equal((await request('/api/applications','POST',{...key,applicationId:undated.body.application.id})).status,201,'known outcome with unknown dates is not an empty attempt');
});
