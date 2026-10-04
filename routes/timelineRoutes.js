const express = require("express");

const router = express.Router();


const TimelineRecord =
    require("../models/TimelineRecord");

const User =
    require("../models/User");

const { durationDays, LOCATIONS, communityDataMode } = require("../services/communityAnalytics");
const { requireOwnUsername } = require("../middleware/auth");
const { roadmapForProfile, loadRoadmap } = require("../data/roadmaps/registry");
const { selectedApplication, applicationMatches, recordScope, isPermit } = require("../services/applications");

router.param("username", requireOwnUsername);



// =================================
// Start a Journey Step
// =================================

router.post("/start", async (req,res) => {
    try{
        const username = req.auth.username;
        const user = await User.findOne({ username });
        if(!user) return res.status(404).json({ message:"User not found." });
        const definition = roadmapForProfile(user.immigrationProfile);
        if(!definition) return res.status(404).json({ message:"No roadmap for this profile yet." });
        if(req.body?.pathway !== definition.pathway ||
            (req.body.profileKey && req.body.profileKey !== definition.profileKey)){
            return res.status(409).json({ message:"Your selected roadmap changed. Reload Journey." });
        }

        const stepOrder = req.body?.stepOrder;
        const step = loadRoadmap(definition).steps.find(item => item.order === stepOrder);
        if(!step) return res.status(400).json({ message:"Unknown roadmap step." });
        const profileKey = definition.profileKey;
        const pathway = definition.pathway;
        const application = await selectedApplication(user,definition);
        if (!applicationMatches(req.body.applicationId,application)) return res.status(409).json({message:"Your application changed. Reload Journey."});
        const scope = recordScope(application);

        const completed = await TimelineRecord.findOne({
            username, profileKey, stepOrder, ...scope, status:"completed"
        });
        if(completed) return res.status(409).json({ message:"Step already completed. Edit its dates if needed." });

        const existing = await TimelineRecord.findOne({
            username, profileKey, stepOrder, ...scope, status:"in-progress"
        });
        if(existing) return res.json({ message:"Step already started.", record:existing });

        const record = new TimelineRecord({
            username, pathway, profileKey, stepOrder,
            stepTitle:step.title, startedAt:new Date(),
            applicationId:application?._id,
            dataSource: application?.dataSource || (communityDataMode() === "community" ? "self-reported" : "test"),
            context: application && isPermit(definition) ? undefined : { location: LOCATIONS.includes(user.immigrationProfile.location)
                ? user.immigrationProfile.location : "Unknown" }
        });
        await record.save();
        res.json({ message:"Step started.", record });
    } catch(error){
        if (error.code===11000) return res.status(409).json({message:"This step was just started. Reload Journey."});
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

// =================================

router.put("/complete", async (req,res) => {
    try{
        const username = req.auth.username;
        const user = await User.findOne({ username });
        if(!user) return res.status(404).json({ message:"User not found." });
        const definition = roadmapForProfile(user.immigrationProfile);
        if(!definition) return res.status(404).json({ message:"No roadmap for this profile yet." });
        if(req.body?.pathway !== definition.pathway ||
            (req.body.profileKey && req.body.profileKey !== definition.profileKey)){
            return res.status(409).json({ message:"Your selected roadmap changed. Reload Journey." });
        }

        const stepOrder = req.body?.stepOrder;
        if(!loadRoadmap(definition).steps.some(item => item.order === stepOrder)){
            return res.status(400).json({ message:"Unknown roadmap step." });
        }
        const application = await selectedApplication(user,definition);
        if (!applicationMatches(req.body.applicationId,application)) return res.status(409).json({message:"Your application changed. Reload Journey."});
        const record = await TimelineRecord.findOne({
            username, profileKey:definition.profileKey, stepOrder, ...recordScope(application), status:"in-progress"
        });
        if(!record) return res.status(404).json({ message:"Active step not found." });

        record.completedAt = new Date();
        record.durationDays = durationDays(record.startedAt, record.completedAt);
        if (record.durationDays === null) return res.status(400).json({ message:"Check the step start date before completing it." });
        record.status = "completed";
        await record.save();
        res.json({ message:"Step completed.", durationDays:record.durationDays });
    } catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

// =================================

router.get("/:username", async (req,res)=>{


    try {


        const records =
            await TimelineRecord.find({

                username:
                req.params.username

            });



        res.json(records);



    }


    catch(error){


        console.error(error);



        res.status(500).json({

            message:
            "Server error."

        });


    }


});







// =================================
// Edit Timeline Dates
// =================================

function parseTimelineDate(value){
    if(typeof value !== "string") return null;

    // Accept a date-only value for older clients and a UTC ISO timestamp
    // for the Journey date picker, which sends local noon as an instant.
    let normalized = value;
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
        normalized = value + "T12:00:00.000Z";
    }

    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized)){
        return null;
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) || date.toISOString() !== normalized
        ? null
        : date;
}

router.put("/edit/:id", async (req,res)=>{
    try{
        const payload = req.body || {};
        const username = req.auth.username;
        if(payload.username && payload.username !== username){
            return res.status(403).json({ message:"Access denied." });
        }

        if(!/^[a-f\d]{24}$/i.test(req.params.id)){
            return res.status(400).json({ message:"Invalid timeline record ID." });
        }

        const record = await TimelineRecord.findOne({
            _id:req.params.id,
            username
        });

        if(!record){
            return res.status(404).json({ message:"Timeline record not found." });
        }

        const hasStart = Object.prototype.hasOwnProperty.call(payload, "startedAt");
        const hasEnd = Object.prototype.hasOwnProperty.call(payload, "completedAt");
        if(!hasStart && !hasEnd){
            return res.status(400).json({ message:"Provide a start or completion date." });
        }

        if(record.status !== "completed" && hasEnd){
            return res.status(400).json({ message:"Complete the step before editing its finish date." });
        }

        const newStart = hasStart
            ? parseTimelineDate(payload.startedAt)
            : record.startedAt;
        const newEnd = hasEnd
            ? parseTimelineDate(payload.completedAt)
            : record.completedAt;

        if(!newStart || (record.status === "completed" && !newEnd)){
            return res.status(400).json({ message:"Enter valid start and finish dates." });
        }

        if(newEnd && newEnd < newStart){
            return res.status(400).json({ message:"Finish date cannot be before start date." });
        }

        // A local calendar date is sent as local noon, which may be ahead of
        // server time on the same day. Allow that offset but reject future days.
        const latestAllowed = Date.now() + (1000 * 60 * 60 * 24);
        if(newStart.getTime() > latestAllowed || (newEnd && newEnd.getTime() > latestAllowed)){
            return res.status(400).json({ message:"Timeline dates cannot be in the future." });
        }

        record.startedAt = newStart;
        record.completedAt = newEnd || null;
        record.durationDays = record.status === "completed"
            ? durationDays(newStart, newEnd)
            : null;

        await record.save();
        res.json({ message:"Timeline updated.", record, analyticsUpdated:true });
    }
    catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

module.exports = router;
