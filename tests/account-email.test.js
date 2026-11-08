const test=require('node:test');
const assert=require('node:assert/strict');
const mail=require('../services/accountEmail');

test('email transport uses configured HTTPS origin, minimal data and fails closed',async t=>{
    const oldFetch=global.fetch;
    const keys=['PUBLIC_APP_URL','RESEND_API_KEY','ACCOUNT_EMAIL_FROM','ACCOUNT_EMAIL_PROVIDER','BREVO_API_KEY'];
    const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
    t.after(()=>{global.fetch=oldFetch;for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}});
    for(const key of keys)delete process.env[key];
    assert.equal(mail.ready(),false);
    await assert.rejects(mail.send('test@example.com','reset','a'.repeat(64)),/not configured/);
    process.env.RESEND_API_KEY='synthetic-test-key';process.env.ACCOUNT_EMAIL_FROM='MaplePath <account@example.com>';
    for(const value of ['http://example.com','https://user:pass@example.com','https://example.com/redirect','https://example.com/?x=1']){
        process.env.PUBLIC_APP_URL=value;assert.equal(mail.ready(),false,value);
    }
    process.env.PUBLIC_APP_URL='https://maplepath.example.com';assert.equal(mail.ready(),true);
    let sent;
    global.fetch=async(url,options)=>{sent={url,options};return {ok:true};};
    await mail.send('test@example.com','reset','a'.repeat(64));
    assert.equal(sent.url,'https://api.resend.com/emails');
    const body=JSON.parse(sent.options.body);
    assert.deepEqual(body.to,['test@example.com']);assert.match(body.text,/https:\/\/maplepath.example.com\/recover.html#purpose=reset&token=/);
    assert.deepEqual(Object.keys(body).sort(),['from','subject','text','to']);
    process.env.ACCOUNT_EMAIL_PROVIDER='brevo';process.env.BREVO_API_KEY='synthetic-brevo-key';
    assert.equal(mail.ready(),false,'Brevo needs a plain sender address');
    process.env.ACCOUNT_EMAIL_FROM='sender@example.com';assert.equal(mail.ready(),true);
    await mail.send('test@example.com','verify','b'.repeat(64));
    assert.equal(sent.url,'https://api.brevo.com/v3/smtp/email');
    assert.equal(sent.options.headers['api-key'],'synthetic-brevo-key');
    const brevoBody=JSON.parse(sent.options.body);
    assert.deepEqual(brevoBody.sender,{name:'MaplePath',email:'sender@example.com'});
    assert.deepEqual(brevoBody.to,[{email:'test@example.com'}]);
    assert.match(brevoBody.textContent,/purpose=verify/);
    await assert.rejects(mail.send('bad','verify','b'.repeat(64)),/Invalid/);
    global.fetch=async()=>({ok:false});
    await assert.rejects(mail.send('test@example.com','verify','b'.repeat(64)),/delivery failed/);
    assert.equal(mail.normalizeEmail(' Test@Example.com '),'test@example.com');
    for(const value of [null,{},['a@b.com'],'a@b.com\r\nBcc:x@y.com','bad'])assert.equal(mail.normalizeEmail(value),null);
});
