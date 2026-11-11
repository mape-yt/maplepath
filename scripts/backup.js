// Operator CLI. Not mounted by Express. No credential or document values in output.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const {MongoClient,BSON}=require('mongoose').mongo;
const {seal,unseal,MAX_BYTES}=require('./lib/backup-crypto');
const ROOT=path.resolve(__dirname,'..');
const EXCLUDED=new Set(['sessions','timelineaverages']);

function storePath(){
    if(process.platform!=='win32' || !process.env.LOCALAPPDATA)throw Error('This backup setup requires Windows');
    const store=path.resolve(process.env.LOCALAPPDATA,'MaplePath','Backups');
    if(store.toLowerCase().includes('onedrive') || store.startsWith(ROOT+path.sep))throw Error('Backup destination must be outside the project and OneDrive');
    return store;
}
function keyFor(store){
    const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'backup-key.ps1'),'-Store',store],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const key=Buffer.from(output.toString().trim(),'base64');
    if(key.length!==32)throw Error('Backup key unavailable');
    return key;
}
function tool(name){
    return path.join(process.env.LOCALAPPDATA,'MaplePath','Tools','mongodb-database-tools-windows-x86_64-100.20.1','bin',name+'.exe');
}
function runTool(name,args,input){
    return new Promise((resolve,reject)=>{
        const child=spawn(tool(name),args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
        const chunks=[];let bytes=0,tooLarge=false;
        child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES){tooLarge=true;child.kill();}else chunks.push(chunk);});
        // Tools may include connection details or document values in errors. Never echo them.
        child.stderr.resume();
        child.stdin.on('error',()=>{});
        const timer=setTimeout(()=>child.kill(),10*60*1000);
        child.on('error',()=>{clearTimeout(timer);reject(Error(name+' could not start. Check the installed database tools.'));});
        child.on('close',code=>{clearTimeout(timer);if(code!==0 || tooLarge)reject(Error(name+' failed or exceeded its size/time limit. No raw database log was displayed.'));else resolve(Buffer.concat(chunks));});
        child.stdin.end(input);
    });
}
function safeDatabase(name){
    if(!/^[a-zA-Z0-9_-]+$/.test(name) || ['admin','config','local'].includes(name))throw Error('Unsupported database name');
    return name;
}
async function inventory(db){
    const collections=(await db.listCollections({}, {nameOnly:false}).toArray())
        .filter(c=>!EXCLUDED.has(c.name)&&!c.name.startsWith('system.')).sort((a,b)=>a.name.localeCompare(b.name));
    const result={};
    for(const item of collections){
        if(item.type!=='collection')throw Error('Views require a separately reviewed backup procedure');
        const collection=db.collection(item.name),hash=crypto.createHash('sha256');let count=0;
        for await(const row of collection.find({},{promoteLongs:false}).sort({_id:1})){hash.update(BSON.serialize(row));count++;}
        const indexes=(await collection.listIndexes().toArray()).map(({v,ns,background,...index})=>index).sort((a,b)=>a.name.localeCompare(b.name));
        result[item.name]={count,sha256:hash.digest('hex'),indexes};
    }
    return result;
}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function backupFiles(store){return fs.readdirSync(store).filter(name=>/^maplepath-\d{8}T\d{9}Z-[a-f0-9]{8}\.mpbackup$/.test(name)).sort();}
function readBackup(store,file,key){
    const selected=file ? path.resolve(file) : path.join(store,backupFiles(store).at(-1)||'missing');
    if(path.dirname(selected)!==store || !backupFiles(store).includes(path.basename(selected)))throw Error('Select a MaplePath backup inside the protected backup directory');
    if(fs.statSync(selected).size>MAX_BYTES+65580)throw Error('Backup too large');
    const decoded=unseal(fs.readFileSync(selected),key);
    if(decoded.metadata.format!==1)throw Error('Unsupported backup format');
    safeDatabase(decoded.metadata.database);
    return {...decoded,file:selected};
}
async function backup(store,key){
    const envFile=path.join(ROOT,'.env');
    const env=fs.existsSync(envFile)?require('dotenv').parse(fs.readFileSync(envFile)):{};
    const uri=process.env.MONGO_URI || env.MONGO_URI;
    if(!uri)throw Error('MONGO_URI is not configured');
    const client=new MongoClient(uri,{serverSelectionTimeoutMS:15000});
    const config=path.join(store,'connection-'+crypto.randomUUID()+'.yml');
    try{
        await client.connect();const db=client.db(),database=safeDatabase(db.databaseName);
        const sourceInfo=await db.admin().command({buildInfo:1});
        const sourceMongoMajor=sourceInfo.versionArray[0];
        const before=await inventory(db);
        // JSON string encoding is also a valid YAML quoted string. File inherits the private directory ACL.
        fs.writeFileSync(config,'uri: '+JSON.stringify(uri)+'\n',{flag:'wx'});
        const archive=await runTool('mongodump',['--config',config,'--db',database,'--archive','--gzip',...Array.from(EXCLUDED).map(name=>'--excludeCollection='+name)]);
        const after=await inventory(db);
        if(!equal(before,after))throw Error('Database changed during backup. Retry during a quiet period. No new backup was kept.');
        const metadata={format:1,createdAt:new Date().toISOString(),sourceMongoMajor,toolsVersion:"100.20.1",database,collections:after,excluded:[...EXCLUDED],consistency:'quiet-window-before-after-check'};
        const encoded=seal(archive,metadata,key);
        if(!unseal(encoded,key).archive.equals(archive))throw Error('Encryption verification failed');
        const name='maplepath-'+metadata.createdAt.replace(/[-:.]/g,'')+'-'+crypto.randomBytes(4).toString('hex')+'.mpbackup';
        const target=path.join(store,name),partial=target+'.partial';
        fs.writeFileSync(partial,encoded,{flag:'wx'});fs.renameSync(partial,target);
        // Keep seven most recent successful backups. Failed backups never prune good ones.
        for(const old of backupFiles(store).slice(0,-7))fs.unlinkSync(path.join(store,old));
        const report={createdAt:metadata.createdAt,file:target,bytes:encoded.length,collections:Object.keys(after).length,documents:Object.values(after).reduce((n,c)=>n+c.count,0),restoreVerified:false};
        fs.writeFileSync(path.join(store,'last-backup.json'),JSON.stringify(report,null,2));
        console.log(JSON.stringify(report,null,2));
    }finally{if(fs.existsSync(config))fs.unlinkSync(config);await client.close();}
}
async function restoreDrill(store,key,port,file){
    if(!/^\d+$/.test(port||'') || Number(port)<1024 || Number(port)>65535)throw Error('Provide the port of an isolated local MongoDB server');
    const backup=readBackup(store,file,key),database='maplepath_restore_'+crypto.randomBytes(8).toString('hex');
    const uri='mongodb://127.0.0.1:'+port;
    const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
    let created=false;
    try{
        await client.connect();const db=client.db(database);
        const targetInfo=await db.admin().command({buildInfo:1});
        if(backup.metadata.sourceMongoMajor!==targetInfo.versionArray[0])throw Error('Restore server major version must match the source. Create a current backup first.');
        if((await db.listCollections().toArray()).length)throw Error('Restore destination is not empty');
        created=true;
        await runTool('mongorestore',['--uri',uri,'--archive','--gzip','--stopOnError','--nsInclude',backup.metadata.database+'.*','--nsFrom',backup.metadata.database+'.*','--nsTo',database+'.*'],backup.archive);
        const restored=await inventory(db);
        if(!equal(restored,backup.metadata.collections))throw Error('Restore content or indexes did not match the backup inventory');
        if(await db.collection('sessions').countDocuments())throw Error('Sessions must not be restored');
        // Never revive reset/verification links in a restored copy.
        await db.collection('users').updateMany({},{$unset:{passwordReset:1,emailVerification:1},$inc:{sessionVersion:1}});
        const report={verifiedAt:new Date().toISOString(),file:backup.file,collections:Object.keys(restored).length,documents:Object.values(restored).reduce((n,c)=>n+c.count,0),contentAndIndexesMatch:true,localOnly:true};
        await db.dropDatabase();created=false;report.testDatabaseRemoved=true;
        const reportPath=path.join(store,'last-backup.json');
        if(fs.existsSync(reportPath)){const current=JSON.parse(fs.readFileSync(reportPath,'utf8'));if(current.file===backup.file){current.restoreVerified=true;current.restoreVerifiedAt=report.verifiedAt;fs.writeFileSync(reportPath,JSON.stringify(current,null,2));}}
        fs.writeFileSync(path.join(store,'last-restore-test.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    }finally{
        if(created && /^maplepath_restore_[a-f0-9]{16}$/.test(database))await client.db(database).dropDatabase();
        await client.close();
    }
}
async function main(){
    const [command,...args]=process.argv.slice(2);
    if(!['create','verify','restore-drill','status'].includes(command))throw Error('Use create, verify, restore-drill <local-port> [file], or status');
    const store=storePath(),key=keyFor(store);
    if(command==='create'){if(args.length)throw Error('Unexpected arguments');return backup(store,key);}
    if(command==='restore-drill')return restoreDrill(store,key,...args);
    if(command==='verify'){const decoded=readBackup(store,args[0],key);console.log(JSON.stringify({file:decoded.file,encryptionVerified:true,createdAt:decoded.metadata.createdAt}));return;}
    for(const name of ['last-backup.json','last-restore-test.json'])console.log(fs.existsSync(path.join(store,name))?fs.readFileSync(path.join(store,name),'utf8'):name+': not yet available');
}
if(require.main===module)main().catch(error=>{const allowed=/^(This backup|Backup|Invalid backup|Select a MaplePath|Provide the port|Restore |Database changed|mongodump |mongorestore |Unsupported|MONGO_URI|Use create|Unexpected|Sessions must|Encryption verification)/;console.error(allowed.test(error.message)?error.message:'Backup operation failed. Check connectivity, database access, tools, and Windows key access. Sensitive error details were suppressed.');process.exitCode=1;});
module.exports={inventory,safeDatabase,backupFiles};
