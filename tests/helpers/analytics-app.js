// Test-only in-memory database adapter. Uses the real schema and routers, never Atlas.
const express = require("express");
const path = require("node:path");
const TimelineRecord = require("../../models/TimelineRecord");
const User = require("../../models/User");
const Application = require("../../models/Application");

function createAnalyticsApp(seed = [], { browserPreview = false } = {}) {
    let records = seed.map(row => new TimelineRecord(row));
    let failReads = false;
    let applications = [];
    const user = { username:"analytics-test", immigrationProfile: {
        journeyType:"pathway", pathway:"Express Entry", stream:"Canadian Experience Class (CEC)",
        location:"Inside Canada", province:"Alberta", currentStage:"Background Check", status:"Waiting for decision"
    }};
    user.activeApplications = new Map();
    user.journeyProgressByProfile = new Map();
    user.legacyJourneyMigrated = true;
    user.save = async()=>{};
    const match = (row, query) => Object.entries(query).every(([key,value]) => {
        if(key==="$or")return value.some(part=>match(row,part));
        if(value===null)return row[key]==null;
        if(value?.$in)return value.$in.some(item=>String(row[key])===String(item));
        return String(row[key]) === String(value);
    });
    Application.findOne = async query => applications.find(row=>match(row,query)) || null;
    Application.find = query => ({select(){return this;},sort(){return this;},limit(){return this;},
        async lean(){return applications.filter(row=>match(row,query)).map(row=>row.toObject());},
        then(resolve,reject){return Promise.resolve(applications.filter(row=>match(row,query))).then(resolve,reject);} });
    Application.prototype.save = async function() {
        await this.validate();
        if(!applications.some(row=>String(row._id)===String(this._id)))applications.push(this);
        return this;
    };
    TimelineRecord.find = query => {
        let cap = Infinity;
        const fetch = async () => {
            if (failReads) throw new Error("Synthetic database failure");
            return records.filter(row => match(row,query)).slice(0,cap);
        };
        return { select(){return this;}, limit(n){cap=n;return this;},
            async lean(){return (await fetch()).map(row=>row.toObject());},
            then(resolve,reject){return fetch().then(resolve,reject);} };
    };
    TimelineRecord.findOne = async query => records.find(row=>match(row,query)) || null;
    TimelineRecord.prototype.save = async function() {
        await this.validate();
        this.updatedAt = new Date();
        if (!records.some(row=>String(row._id)===String(this._id))) records.push(this);
        return this;
    };
    User.findOne = async ({username}) => username === user.username ? user : null;
    User.updateOne = async(query,update)=>{
        if(query.username!==user.username)return {matchedCount:0};
        for(const [key,value] of Object.entries(update.$set))user.activeApplications.set(key.slice('activeApplications.'.length),value);
        return {matchedCount:1};
    };
    const authPath = require.resolve("../../middleware/auth");
    require.cache[authPath] = {id:authPath,filename:authPath,loaded:true,exports:{
        requireOwnUsername(req,res,next){ return req.params.username === req.auth.username ? next() : res.sendStatus(403); }
    }};
    for(const route of ["../../routes/analyticsRoutes","../../routes/timelineRoutes","../../routes/applicationRoutes","../../routes/journeyRoutes"]) delete require.cache[require.resolve(route)];
    const app=express();
    app.use(express.json());
    // Production authentication is outside the scope of this fixture.
    app.use("/api",(req,res,next)=>{
        if(!browserPreview && req.get("x-test-user")!==user.username) return res.sendStatus(401);
        req.auth={username:user.username};next();
    });
    app.get("/api/auth/session",(req,res)=>res.json({username:user.username}));
    app.get("/api/profile/:username",(req,res)=>res.json(user.immigrationProfile));
    app.use("/api/journey",require("../../routes/journeyRoutes"));
    app.use("/api/applications",require("../../routes/applicationRoutes"));
    app.get("/api/journey/:pathway/:stream",(req,res)=>{
        const {findRoadmap,loadRoadmap}=require("../../data/roadmaps/registry");
        const definition=findRoadmap(req.params.pathway,req.params.stream);
        return definition ? res.json(loadRoadmap(definition)) : res.sendStatus(404);
    });
    app.get("/api/tasks",(req,res)=>res.json([]));
    app.use("/api/analytics",require("../../routes/analyticsRoutes"));
    app.use("/api/timeline",require("../../routes/timelineRoutes"));
    app.use(express.static(path.join(__dirname,"../../public")));
    return {app,user, records:()=>records, applications:()=>applications, setFailure:value=>{failReads=value;},
        replace:rows=>{records=rows.map(row=>new TimelineRecord(row));}};
}
module.exports={createAnalyticsApp};
