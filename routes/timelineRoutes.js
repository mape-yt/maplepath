const express = require("express");

const router = express.Router();


const TimelineRecord =
    require("../models/TimelineRecord");

const User =
    require("../models/User");

const TimelineAverage =
    require("../models/TimelineAverage");
const { requireOwnUsername } = require("../middleware/auth");
const { roadmapForProfile, loadRoadmap } = require("../data/roadmaps/registry");

router.param("username", requireOwnUsername);



// =================================
// Update Community Average Engine
// =================================

async function updateTimelineAverage(record){


    try{


        const records =
            await TimelineRecord.find({


                profileKey:
                record.profileKey,


                stepOrder:
                record.stepOrder,


                status:
                "completed",


                durationDays:
                {
                    $ne:null
                }


            });





        if(records.length === 0){

            return false;

        }





        let totalDays = 0;



        records.forEach(item=>{


            totalDays +=
            item.durationDays;


        });





        const averageDays =
            Math.round(

                totalDays /
                records.length

            );






        await TimelineAverage.findOneAndUpdate(

            {


                profileKey:
                record.profileKey,


                stepOrder:
                record.stepOrder


            },


            {


                profileKey:
                record.profileKey,


                stepOrder:
                record.stepOrder,


                stepTitle:
                record.stepTitle,


                averageDays,


                totalUsers:
                records.length,


                lastUpdated:
                new Date()


            },


            {


                upsert:true,

                returnDocument:"after"


            }


        );




        console.log(
            "Timeline average updated."
        );

        return true;



    }


    catch(error){


        console.error(
            "Analytics error:",
            error
        );

        return false;


    }


}




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

        const completed = await TimelineRecord.findOne({
            username, profileKey, stepOrder, status:"completed"
        });
        if(completed) return res.status(409).json({ message:"Step already completed. Edit its dates if needed." });

        const existing = await TimelineRecord.findOne({
            username, profileKey, stepOrder, status:"in-progress"
        });
        if(existing) return res.json({ message:"Step already started.", record:existing });

        const record = new TimelineRecord({
            username, pathway, profileKey, stepOrder,
            stepTitle:step.title, startedAt:new Date()
        });
        await record.save();
        res.json({ message:"Step started.", record });
    } catch(error){
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
        const record = await TimelineRecord.findOne({
            username, profileKey:definition.profileKey, stepOrder, status:"in-progress"
        });
        if(!record) return res.status(404).json({ message:"Active step not found." });

        record.completedAt = new Date();
        record.durationDays = Math.max(1, Math.ceil(
            (record.completedAt - record.startedAt) / (1000 * 60 * 60 * 24)
        ));
        record.status = "completed";
        await record.save();
        await updateTimelineAverage(record);
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
            ? Math.max(1, Math.round((newEnd - newStart) / (1000 * 60 * 60 * 24)))
            : null;

        await record.save();
        const analyticsUpdated = record.status === "completed"
            ? await updateTimelineAverage(record)
            : true;

        res.json({ message:"Timeline updated.", record, analyticsUpdated });
    }
    catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

module.exports = router;
