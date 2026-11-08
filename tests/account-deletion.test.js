const test=require('node:test');
const assert=require('node:assert/strict');
const {createSecurityApp}=require('./helpers/security-app');
const User=require('../models/User');
const Application=require('../models/Application');
const TimelineRecord=require('../models/TimelineRecord');
const {hashPassword}=require('../services/passwords');

test('account deletion requires session, same origin, confirmation and password; removes only the owner',async t=>{
    const fixture=createSecurityApp();
    const password='A synthetic long password!';
    const alice=await User.create({username:'deletion-alice',passwordHash:await hashPassword(password)});
    const bob=await User.create({username:'deletion-bob',passwordHash:alice.passwordHash});
    for(const user of [alice,bob]){
        fixture.records.push(new TimelineRecord({username:user.username,pathway:'Express Entry',profileKey:'EE-CEC',stepOrder:1,stepTitle:'Eligibility',status:'in-progress'}));
        fixture.applications.push(new Application({username:user.username,profileKey:'EE-CEC',dataSource:'test'}));
    }
    const server=fixture.app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    const post=(path,body,cookie='',origin=base)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});
    const login=await post('/api/auth/login',{username:alice.username,password});
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const payload={password,confirmation:'DELETE'};
    assert.equal((await post('/api/account/delete',payload)).status,401);
    assert.equal((await post('/api/account/delete',payload,cookie,'https://evil.example')).status,403);
    assert.equal((await post('/api/account/delete',{password},cookie)).status,400);
    assert.equal((await post('/api/account/delete',{password:'wrong',confirmation:'DELETE'},cookie)).status,403);
    assert.equal(fixture.users.length,2);
    const removed=await post('/api/account/delete',payload,cookie);
    assert.equal(removed.status,200);
    assert.match(removed.headers.get('set-cookie'),/Max-Age=0/);
    assert.equal(fixture.users.length,1);assert.equal(fixture.users[0].username,bob.username);
    assert.equal(fixture.records.length,1);assert.equal(fixture.records[0].username,bob.username);
    assert.equal(fixture.applications.length,1);assert.equal(fixture.applications[0].username,bob.username);
    assert.equal(fixture.sessions.length,0);
    assert.equal((await post('/api/account/delete',payload,cookie)).status,401);
    assert.equal((await post('/api/auth/login',{username:alice.username,password})).status,401);
});
