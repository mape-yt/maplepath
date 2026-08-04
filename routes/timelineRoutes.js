const express = require("express");

const router = express.Router();


const TimelineRecord =
    require("../models/TimelineRecord");

const User =
    require("../models/User");

const TimelineAverage =
    require("../models/TimelineAverage");



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

            return;

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



    }


    catch(error){


        console.error(
            "Analytics error:",
            error
        );


    }


}




// =================================
// Start a Journey Step
// =================================

router.post("/start", async (req,res)=>{


    try {


        const {

            username,

            pathway,

            stepOrder,

            stepTitle

        } = req.body;



        const user =
            await User.findOne({ username });

        if (!user) {

            return res.status(404).json({

                message: "User not found."

            });

        }



        let profileKey = pathway;



        if (pathway === "Express Entry") {

            switch(user.immigrationProfile.stream){

                case "Canadian Experience Class (CEC)":
                    profileKey = "EE-CEC";
                    break;

                case "Federal Skilled Worker Program (FSWP)":
                    profileKey = "EE-FSWP";
                    break;

                case "Federal Skilled Trades Program (FSTP)":
                    profileKey = "EE-FSTP";
                    break;

                default:
                    profileKey = "EE";
            }

        }



        const existing =
            await TimelineRecord.findOne({

                username,

                pathway,

                stepOrder,

                status:"in-progress"

            });



        if(existing){


            return res.json({

                message:
                "Step already started.",

                record:existing

            });


        }





        const record =
            new TimelineRecord({

                username,

                pathway,

                profileKey,

                stepOrder,

                stepTitle,

                startedAt:
                new Date()

            });



        await record.save();



        res.json({

            message:
            "Step started.",

            record

        });



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
// Complete Journey Step
// =================================

router.put("/complete", async(req,res)=>{


    try{


        const {

            username,

            pathway,

            stepOrder


        } = req.body;




        const record =
            await TimelineRecord.findOne({

                username,

                pathway,

                stepOrder,

                status:"in-progress"

            });



        if(!record){


            return res.status(404).json({

                message:
                "Active step not found."

            });


        }





        record.completedAt =
            new Date();



        const difference =
            record.completedAt
            -
            record.startedAt;



        record.durationDays =
            Math.ceil(

                difference /
                (1000*60*60*24)

            );



        record.status =
            "completed";



        await record.save();




        // Update MaplePath intelligence

        await updateTimelineAverage(record);





        res.json({

            message:
            "Step completed.",

            durationDays:
            record.durationDays

        });



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
// Get User Timeline Records
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

router.put("/edit/:id", async (req,res)=>{


    try{


        const {

            startedAt,

            completedAt


        } = req.body;




        const record =
            await TimelineRecord.findById(
                req.params.id
            );



        if(!record){


            return res.status(404).json({

                message:
                "Timeline record not found."

            });


        }






        const newStart =
            startedAt
            ?
            new Date(startedAt)
            :
            record.startedAt;



        const newEnd =
            completedAt
            ?
            new Date(completedAt)
            :
            record.completedAt;






        if(
            newEnd
            &&
            newStart
            &&
            newEnd < newStart
        ){


            return res.status(400).json({

                message:
                "Completion date cannot be before start date."

            });


        }






        record.startedAt =
            newStart;



        record.completedAt =
            newEnd;






        if(
            record.completedAt
            &&
            record.startedAt
        ){


            const difference =
                record.completedAt
                -
                record.startedAt;



            record.durationDays =
                Math.ceil(

                    difference /
                    (1000*60*60*24)

                );


        }






        await record.save();




        // Recalculate averages after editing

        await updateTimelineAverage(record);





        res.json({

            message:
            "Timeline updated.",

            record

        });



    }


    catch(error){


        console.error(error);



        res.status(500).json({

            message:
            "Server error."

        });


    }


});




module.exports = router;