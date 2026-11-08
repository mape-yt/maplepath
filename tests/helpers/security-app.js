// Isolated database and mail adapters. Production HTTP middleware, models and routes are real.
const User=require('../../models/User');
const Session=require('../../models/Session');
const TimelineRecord=require('../../models/TimelineRecord');
const Application=require('../../models/Application');
const mail=require('../../services/accountEmail');
const {createApp}=require('../../app');

function createSecurityApp(){
    const users=[],sessions=[],records=[],applications=[],messages=[];
    let emailReady=true,failMail=false;
    const get=(row,key)=>key.split('.').reduce((value,part)=>value?.[part],row);
    const equal=(a,b)=>a==null||b==null?a==null&&b==null:String(a)===String(b);
    const match=(row,query)=>Object.entries(query).every(([key,value])=>{
        if(key==='$or')return value.some(filter=>match(row,filter));
        const actual=get(row,key);
        if(value && typeof value==='object' && !(value instanceof Date) && !value._bsontype){
            return Object.entries(value).every(([operator,target])=>{
                if(operator==='$gt')return actual>target;
                if(operator==='$lte')return actual<=target;
                if(operator==='$exists')return (actual!==undefined&&actual!==null)===target;
                if(operator==='$in')return target.some(v=>equal(actual,v));
                throw Error('Unsupported fixture operator '+operator);
            });
        }
        return equal(actual,value);
    });
    const update=(row,change)=>{
        for(const [key,value] of Object.entries(change.$set||{})){
            if(key==='email' && users.some(other=>other!==row&&other.email===value)){const error=Error('duplicate');error.code=11000;throw error;}
            row.set(key,value);
        }
        for(const [key,value] of Object.entries(change.$inc||{}))row.set(key,(get(row,key)||0)+value);
        for(const key of Object.keys(change.$unset||{}))row.set(key,undefined);
        return row;
    };
    const remove=(rows,query)=>{let count=0;for(let i=rows.length-1;i>=0;i--)if(match(rows[i],query)){rows.splice(i,1);count++;}return {deletedCount:count};};
    User.findOne=async query=>users.find(row=>match(row,query))||null;
    User.findById=async id=>users.find(row=>equal(row._id,id))||null;
    User.findOneAndUpdate=async(query,change)=>{const row=users.find(row=>match(row,query));return row?update(row,change):null;};
    User.updateOne=async(query,change)=>{const row=users.find(row=>match(row,query));if(row)update(row,change);return {modifiedCount:row?1:0};};
    User.create=async data=>{const row=new User(data);await row.validate();if(users.some(user=>user.username===row.username)){const e=Error('duplicate');e.code=11000;throw e;}users.push(row);return row;};
    User.prototype.save=async function(){await this.validate();return this;};
    Session.create=async data=>{const row=new Session(data);await row.validate();sessions.push(row);return row;};
    Session.findOne=async query=>sessions.find(row=>match(row,query))||null;
    Session.deleteOne=async query=>remove(sessions,query);
    Session.deleteMany=async query=>remove(sessions,query);
    TimelineRecord.findOne=async query=>records.find(row=>match(row,query))||null;
    TimelineRecord.find=query=>({then(resolve,reject){return Promise.resolve(records.filter(row=>match(row,query))).then(resolve,reject);}});
    Application.findOne=async query=>applications.find(row=>match(row,query))||null;
    mail.ready=()=>emailReady;
    mail.send=async(to,purpose,token)=>{if(failMail)throw Error('test mail failure');messages.push({to,purpose,token});};
    return {app:createApp(),users,sessions,records,applications,messages,setEmailReady:value=>emailReady=value,setFailMail:value=>failMail=value};
}
module.exports={createSecurityApp};
