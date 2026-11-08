// Explicit opt-in local replica set only. Never load .env or connect to Atlas.
const test=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const User=require('../../models/User');
const Session=require('../../models/Session');
const Application=require('../../models/Application');
const TimelineRecord=require('../../models/TimelineRecord');
const {saveOwned,removeAccount}=require('../../services/accountData');

test('MongoDB transactions roll back failed deletion and serialize concurrent child saves',async t=>{
    const uri=process.env.MAPLEPATH_TEST_MONGO_URI;
    assert.match(uri||'',/^mongodb:\/\/127\.0\.0\.1:\d+\/maplepath_test_[a-z0-9_]+(?:\?|$)/,'Use a disposable loopback replica set with a maplepath_test_ database.');
    assert.ok(!uri.includes('@') && !uri.includes(','));
    await mongoose.connect(uri);
    t.after(async()=>{await mongoose.connection.dropDatabase();await mongoose.disconnect();});
    await Promise.all([User.init(),Session.init(),Application.init(),TimelineRecord.init()]);
    const makeUser=username=>User.create({username,passwordHash:'synthetic-test-hash'});
    const makeRecord=username=>new TimelineRecord({username,pathway:'Express Entry',profileKey:'EE-CEC',stepOrder:1,stepTitle:'Eligibility',status:'in-progress',dataSource:'test'});
    const alice=await makeUser('delete-me');
    const bob=await makeUser('keep-me');
    await saveOwned(makeRecord(alice.username),alice._id);
    await saveOwned(makeRecord(bob.username),bob._id);
    await saveOwned(new Application({username:alice.username,profileKey:'EE-CEC',dataSource:'test'}),alice._id);
    await Session.create({userId:alice._id,tokenHash:'a'.repeat(64),expiresAt:new Date(Date.now()+60000)});
    const actualDelete=Application.deleteMany;
    Application.deleteMany=async()=>{throw Error('Injected cleanup failure');};
    try {await assert.rejects(removeAccount(alice),/Injected/);} finally {Application.deleteMany=actualDelete;}
    assert.equal(await TimelineRecord.countDocuments({username:alice.username}),1,'earlier deletion must roll back');
    assert.ok(await User.findById(alice._id));
    assert.equal(await Session.countDocuments({userId:alice._id}),1);
    await removeAccount(alice);
    assert.equal(await User.countDocuments({_id:alice._id}),0);
    assert.equal(await Application.countDocuments({username:alice.username}),0);
    assert.equal(await TimelineRecord.countDocuments({username:alice.username}),0);
    assert.equal(await Session.countDocuments({userId:alice._id}),0);
    assert.equal(await TimelineRecord.countDocuments({username:bob.username}),1);
    const replacement=await makeUser(alice.username);
    await assert.rejects(saveOwned(makeRecord(alice.username),alice._id),/account changed/);
    assert.equal(await TimelineRecord.countDocuments({username:replacement.username}),0);
    for(let i=0;i<6;i++){
        const owner=await makeUser('race-'+i);
        const record=makeRecord(owner.username);
        const results=await Promise.allSettled([saveOwned(record,owner._id),removeAccount(owner)]);
        assert.equal(results[1].status,'fulfilled');
        assert.equal(await TimelineRecord.countDocuments({username:owner.username}),0);
        assert.equal(await User.countDocuments({_id:owner._id}),0);
    }
    const {createApp}=require('../../app');
    const server=createApp().listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    try {
        const base=`http://127.0.0.1:${server.address().port}`;
        const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
        const password='A real database test password!';
        assert.equal((await post('/api/auth/signup',{username:'http-owner',password})).status,201);
        const login=await post('/api/auth/login',{username:'http-owner',password});
        assert.equal(login.status,200,'session transaction must work with the real database');
        const cookie=login.headers.get('set-cookie').split(';')[0];
        assert.equal((await post('/api/account/delete',{password,confirmation:'DELETE'},cookie)).status,200);
        assert.equal(await User.countDocuments({username:'http-owner'}),0);
        assert.equal((await fetch(base+'/api/account',{headers:{Cookie:cookie}})).status,401);
    }finally {await new Promise(resolve=>server.close(resolve));}
});
