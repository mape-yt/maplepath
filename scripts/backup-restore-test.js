// Dev-only restore drill. The production database is never a restore destination.
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {spawn}=require('node:child_process');
const path=require('node:path');
(async()=>{
    const replica=await MongoMemoryReplSet.create({binary:{version:'8.0.17'},replSet:{count:1,storageEngine:'wiredTiger'}});
    try{
        const port=new URL(replica.getUri()).port;
        const child=spawn(process.execPath,[path.join(__dirname,'backup.js'),'restore-drill',port],{windowsHide:true,stdio:'inherit'});
        process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code===null?1:code));});
    }finally{await replica.stop();}
})().catch(()=>{console.error('Isolated restore drill failed. Check local MongoDB runtime availability.');process.exitCode=1;});
