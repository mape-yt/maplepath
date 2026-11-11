// Dedicated local database and intercepted mail only. Never load .env or Atlas.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const mongoose=require('mongoose');
const mail=require('../../services/accountEmail');
const {createApp}=require('../../app');
const User=require('../../models/User');
const TimelineRecord=require('../../models/TimelineRecord');
const Application=require('../../models/Application');
const Session=require('../../models/Session');

test('launch browser checks: responsive pages, onboarding, Journey, recovery and deletion', {timeout:240000},async t=>{
    process.env.COMMUNITY_DATA_MODE='testing';
    const replica=await MongoMemoryReplSet.create({binary:{version:'8.0.17'},replSet:{count:1,storageEngine:'wiredTiger'}});
    let browser,server;
    const messages=[];
    const oldReady=mail.ready,oldSend=mail.send;
    mail.ready=()=>true;mail.send=async(to,purpose,token)=>messages.push({to,purpose,token});
    const output=path.resolve('.qa-output');fs.mkdirSync(output,{recursive:true});
    try{
        await mongoose.connect(replica.getUri('maplepath_test_launch'));
        await Promise.all([User.init(),TimelineRecord.init(),Application.init(),Session.init()]);
        server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
        let base='http://127.0.0.1:'+server.address().port;
        browser=await chromium.launch({headless:true});
        async function layout(page,label){
            await page.evaluate(()=>document.fonts.ready);
            const overflow=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth}));
            assert.ok(Math.max(overflow.body,overflow.document)<=overflow.width+1,label+' overflow: '+JSON.stringify(overflow));
        }
        await t.test('public pages at 320, 390, 768 and 1280 pixels',async()=>{
            const context=await browser.newContext();const page=await context.newPage();
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            for(const width of [320,390,768,1280]){
                await page.setViewportSize({width,height:900});
                for(const file of ['index.html','about.html','aboutdev.html','auth.html','contact.html','privacy.html','recover.html']){
                    const response=await page.goto(base+'/'+file);assert.equal(response.status(),200);
                    await layout(page,file+' '+width);
                }
            }
            assert.deepEqual(errors,[]);await context.close();
        });
        const scenarios=[
            {name:'planning',type:'planning'},
            {name:'express-entry',type:'pathway',pathway:'Express Entry',stream:'Canadian Experience Class (CEC)'},
            {name:'pnp-completed',type:'completed',pathway:'Provincial Nominee Program',province:'Manitoba'},
            {name:'study-permit',type:'pathway',pathway:'Study Permit'},
            {name:'work-permit',type:'pathway',pathway:'Work Permit'}
        ];
        for(const scenario of scenarios)await t.test(scenario.name,async()=>{
            // Each scenario gets a fresh app limiter, preserving production rate limits.
            await new Promise(r=>server.close(r));server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
            const context=await browser.newContext({viewport:{width:390,height:844}});
            const page=await context.newPage(),errors=[];
            page.on('pageerror',e=>errors.push(e.message));
            const username='launch-'+scenario.name,password='Launch88';
            await page.goto(base+'/auth.html?mode=signup');
            await page.locator('#signup-username').fill(username);await page.locator('#signup-password').fill(password);
            await page.locator('#signup-form button[type=submit]').click();
            await page.locator('#login-form').waitFor({state:'visible'});
            await page.locator('#login-username').fill(username);await page.locator('#login-password').fill(password);
            await page.locator('#login-form button[type=submit]').click();await page.waitForURL('**/onboarding.html');
            await page.locator('#location option').nth(1).waitFor({state:'attached'});
            await page.locator('[data-journey-type="'+scenario.type+'"]').click();
            if(scenario.pathway){
                await page.locator('#pathway').selectOption(scenario.pathway);
                if(scenario.province)await page.locator('#pnp-province').selectOption(scenario.province);
                await page.locator('#stream').waitFor({state:'visible'});
                await page.locator('#stream').selectOption(scenario.stream || {index:1});
            }
            await page.locator('#location').selectOption('Inside Canada');
            for(const id of ['current-status','settlement-province','application-status','current-stage']){
                const select=page.locator('#'+id);
                if(await select.isVisible() && await select.isEnabled())await select.selectOption({index:1});
            }
            await layout(page,'onboarding '+scenario.name);
            await page.locator('#save-profile').click();await page.waitForURL('**/dashboard.html');
            const user=await User.findOne({username});assert.ok(user.profileCompleted);
            assert.equal(user.immigrationProfile.journeyStartDate,null,'Unknown start remains unknown');
            for(const width of [320,768,1280]){
                await page.setViewportSize({width,height:900});
                for(const file of ['dashboard.html','profile.html','journey.html','account.html']){
                    await page.goto(base+'/'+file);await page.locator('#sidebar-container nav').waitFor();
                    await page.waitForLoadState('networkidle');
                    await layout(page,scenario.name+' '+file+' '+width);
                    if(width===320 || width===1280)await page.screenshot({path:path.join(output,scenario.name+'-'+file.replace('.html','')+'-'+width+'.png'),fullPage:true});
                }
            }
            if(scenario.name==='express-entry'){
                await page.setViewportSize({width:390,height:844});await page.goto(base+'/journey.html');
                const start=page.locator('[data-action="start"]').first();await start.click();
                await page.locator('#timeline-edit-dialog').waitFor({state:'visible'});
                await page.locator('#timeline-start-date').fill('2026-01-01');
                await page.locator('#timeline-edit-save').click();
                await page.locator('#timeline-edit-dialog').waitFor({state:'hidden'});
                await page.locator('[data-action="complete"]').first().click();
                await page.locator('#timeline-finish-date').fill('2026-01-10');
                await page.locator('#timeline-edit-save').click();
                await page.locator('#timeline-edit-dialog').waitFor({state:'hidden'});
                await page.locator('[data-action="edit-dates"]').first().click();
                await page.locator('#timeline-start-date').fill('2026-01-02');
                await page.locator('#timeline-edit-save').click();await page.locator('#timeline-edit-dialog').waitFor({state:'hidden'});
                const record=await TimelineRecord.findOne({username});assert.equal(record.status,'completed');assert.equal(record.durationDays,8);
                // Exercise the recovery UI using captured local email, never real inboxes.
                await page.goto(base+'/account.html');await page.locator('#account-email').fill('launch@example.com');
                await page.locator('#email-password').fill(password);await page.locator('#email-form button').click();
                await page.waitForFunction(()=>document.querySelector('#email-form [role=status]').textContent.includes('Check your inbox'));
                const verification=messages.find(m=>m.purpose==='verify');assert.ok(verification);
                await page.goto(base+'/recover.html#purpose=verify&token='+verification.token);await page.locator('#recovery-submit').click();
                await page.waitForFunction(()=>document.querySelector('#recovery-message').textContent.includes('Email verified'));
                await page.goto(base+'/recover.html');await page.locator('#recovery-email').fill('launch@example.com');await page.locator('#recovery-submit').click();
                await page.waitForFunction(()=>document.querySelector('#recovery-message').textContent.includes('If that address'));
                const reset=messages.find(m=>m.purpose==='reset');assert.ok(reset);
                await page.goto(base+'/recover.html#purpose=reset&token='+reset.token);await page.waitForFunction(()=>location.hash==='');
                await page.locator('#recovery-password').fill('Updated8');await page.locator('#recovery-confirm').fill('Updated8');await page.locator('#recovery-submit').click();
                await page.waitForFunction(()=>document.querySelector('#recovery-message').textContent.includes('Password reset'));
                await page.goto(base+'/auth.html?mode=login');await page.locator('#login-username').fill(username);await page.locator('#login-password').fill('Updated8');
                await page.locator('#login-form button[type=submit]').click();await page.waitForURL('**/dashboard.html');
            }
            if(scenario.name==='planning'){
                await page.route('**/api/auth/session',route=>route.fulfill({status:429,contentType:'application/json',body:'{"message":"Too many requests"}'}));
                await page.goto(base+'/account.html');await page.locator('#session-load-error').waitFor();
                assert.ok(page.url().endsWith('/account.html'),'temporary throttling must not redirect to login');
                assert.equal(await page.evaluate(()=>localStorage.getItem('username')),username);
                await page.unroute('**/api/auth/session');await page.locator('#session-load-error button').click();
                await page.locator('#account-content').waitFor({state:'visible'});
            }
            await page.goto(base+'/account.html');await page.locator('#account-content').waitFor({state:'visible'});
            await page.locator('details summary').click();await page.locator('#delete-password').fill(scenario.name==='express-entry'?'Updated8':password);
            await page.locator('#delete-confirmation').fill('DELETE');await page.locator('#delete-form button').click();await page.waitForURL('**/auth.html?deleted=1');
            assert.equal(await User.countDocuments({username}),0);assert.equal(await TimelineRecord.countDocuments({username}),0);
            assert.equal(await Application.countDocuments({username}),0);assert.equal(await Session.countDocuments({userId:user._id}),0);
            assert.deepEqual(errors,[]);await context.close();
        });
    }finally{
        mail.ready=oldReady;mail.send=oldSend;
        if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
        await mongoose.disconnect();await replica.stop();
    }
});
