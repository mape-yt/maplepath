const express = require("express");
const User = require("../models/User");
const Application = require("../models/Application");
const TimelineRecord = require("../models/TimelineRecord");
const { roadmapForProfile } = require("../data/roadmaps/registry");
const { progressFor, migrateLegacyProgress } = require("../services/journeyProgress");
const { communityDataMode } = require("../services/communityAnalytics");
const { selectedApplication, applicationMatches, publicApplication, validateDetails, emptyProgress, recordScope } = require("../services/applications");
const router = express.Router();
router.use((req,res,next) => {res.set("Cache-Control","no-store");next();});

router.use(async(req,res,next) => {
    try {
        req.applicationUser = await User.findOne({username:req.auth.username});
        if (!req.applicationUser) return res.status(404).json({message:"User not found."});
        req.definition = roadmapForProfile(req.applicationUser.immigrationProfile);
        if (!req.definition) return res.status(400).json({message:"Choose a pathway first."});
        if (req.method !== "GET" && req.body?.profileKey !== req.definition.profileKey) return res.status(409).json({message:"Your pathway changed. Reload Journey."});
        next();
    } catch(error) { next(error); }
});

router.get("/", async(req,res,next) => {
    try {
        const applications = await Application.find({username:req.auth.username,profileKey:req.definition.profileKey}).sort({createdAt:1,_id:1});
        const selected = await selectedApplication(req.applicationUser,req.definition);
        res.json({profileKey:req.definition.profileKey, selectedId:selected ? String(selected._id) : null,
            applications:applications.map(publicApplication)});
    } catch(error) { next(error); }
});

router.post("/", async(req,res,next) => {
    try {
        const user = req.applicationUser, definition = req.definition;
        const validation = validateDetails(req.body,definition);
        if (validation.error) return res.status(400).json({message:validation.error});
        const active = await selectedApplication(user,definition);
        if (!applicationMatches(req.body.applicationId,active)) return res.status(409).json({message:"Your application changed. Reload Journey."});
        if (active && !active.submittedOn && !active.outcome && !active.submissionLocation && !active.permitType && !active.completedSteps.length
            && !await TimelineRecord.findOne({username:user.username,profileKey:definition.profileKey,...recordScope(active)})) {
            return res.status(409).json({message:"Your current application is empty. Use it before starting another."});
        }
        const existing = await Application.findOne({username:user.username,profileKey:definition.profileKey});
        if (migrateLegacyProgress(user,definition)) await user.save();
        const progress = existing ? emptyProgress() : progressFor(user,definition.profileKey);
        const application = new Application({username:user.username,profileKey:definition.profileKey,
            includesLegacy:!existing, dataSource:communityDataMode()==="community" ? "self-reported" : "test",
            ...validation.details, completedSteps:[...progress.completedSteps],currentStep:progress.currentStep});
        await application.save();
        // Update just this selection; never overwrite another pathway's progress.
        await User.updateOne({username:user.username},{$set:{[`activeApplications.${definition.profileKey}`]:application._id}});
        res.status(201).json({application:publicApplication(application)});
    } catch(error) { next(error); }
});

router.put("/:id", async(req,res,next) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({message:"Invalid application."});
        const validation = validateDetails(req.body,req.definition);
        if (validation.error) return res.status(400).json({message:validation.error});
        const application = await Application.findOne({_id:req.params.id,username:req.auth.username,profileKey:req.definition.profileKey});
        if (!application) return res.status(404).json({message:"Application not found."});
        Object.assign(application,validation.details);
        await application.save();
        res.json({application:publicApplication(application)});
    } catch(error) { next(error); }
});

router.post("/:id/select", async(req,res,next) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({message:"Invalid application."});
        if (Object.keys(req.body || {}).some(key=>key!=="profileKey")) return res.status(400).json({message:"Unexpected selection details."});
        const application = await Application.findOne({_id:req.params.id,username:req.auth.username,profileKey:req.definition.profileKey});
        if (!application) return res.status(404).json({message:"Application not found."});
        await User.updateOne({username:req.auth.username},{$set:{[`activeApplications.${req.definition.profileKey}`]:application._id}});
        res.json({application:publicApplication(application)});
    } catch(error) { next(error); }
});

router.use((error,req,res,next) => {
    if (error.code===11000 || error.name==="VersionError") return res.status(409).json({message:"This application changed in another request. Reload Journey."});
    console.error("Application request failed:",error.message);
    res.status(500).json({message:"Could not save application details. Please reload and try again."});
});
module.exports = router;
