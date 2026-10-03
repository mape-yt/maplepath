// Test-only in-memory database adapter. Uses the real schema and routers, never Atlas.
const express = require("express");
const path = require("node:path");
const TimelineRecord = require("../../models/TimelineRecord");
const User = require("../../models/User");

function createAnalyticsApp(seed = [], { browserPreview = false } = {}) {
    let records = seed.map(row => new TimelineRecord(row));
    let failReads = false;
    const user = { username:"analytics-test", immigrationProfile: {
        journeyType:"pathway", pathway:"Express Entry", stream:"Canadian Experience Class (CEC)",
        location:"Inside Canada", province:"Alberta", currentStage:"Background Check", status:"Waiting for decision"
    }};
    const match = (row, query) => Object.entries(query).every(([key,value]) => String(row[key]) === String(value));
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
    const authPath = require.resolve("../../middleware/auth");
    require.cache[authPath] = {id:authPath,filename:authPath,loaded:true,exports:{
        requireOwnUsername(req,res,next){ return req.params.username === req.auth.username ? next() : res.sendStatus(403); }
    }};
    for(const route of ["../../routes/analyticsRoutes","../../routes/timelineRoutes"]) delete require.cache[require.resolve(route)];
    const app=express();
    app.use(express.json());
    // Production authentication is outside the scope of this fixture.
    app.use("/api",(req,res,next)=>{
        if(!browserPreview && req.get("x-test-user")!==user.username) return res.sendStatus(401);
        req.auth={username:user.username};next();
    });
    app.get("/api/auth/session",(req,res)=>res.json({username:user.username}));
    app.get("/api/profile/:username",(req,res)=>res.json(user.immigrationProfile));
    app.get("/api/journey/progress/:username",(req,res)=>res.json({completedSteps:[],currentStep:1}));
    app.get("/api/journey/:pathway/:stream",(req,res)=>{
        const {findRoadmap,loadRoadmap}=require("../../data/roadmaps/registry");
        const definition=findRoadmap(req.params.pathway,req.params.stream);
        return definition ? res.json(loadRoadmap(definition)) : res.sendStatus(404);
    });
    app.get("/api/tasks",(req,res)=>res.json([]));
    app.use("/api/analytics",require("../../routes/analyticsRoutes"));
    app.use("/api/timeline",require("../../routes/timelineRoutes"));
    app.use(express.static(path.join(__dirname,"../../public")));
    return {app,user, records:()=>records, setFailure:value=>{failReads=value;},
        replace:rows=>{records=rows.map(row=>new TimelineRecord(row));}};
}
module.exports={createAnalyticsApp};
