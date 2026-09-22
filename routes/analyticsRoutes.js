const express = require("express");

const router = express.Router();


const TimelineRecord =
require("../models/TimelineRecord");


const TimelineAverage =
require("../models/TimelineAverage");





// =================================
// Calculate Average Timeline
// =================================

router.post(
"/calculate",
async(req,res)=>{


    try{


        const {

            profileKey,

            stepOrder


        } = req.body;



        const records =
        await TimelineRecord.find({

            profileKey,

            stepOrder,

            status:"completed",

            durationDays:{
                $ne:null
            }

        });





        if(records.length === 0){


            return res.json({

                message:
                "No completed records found."

            });


        }




        let totalDays = 0;



        records.forEach(record=>{


            totalDays +=
            record.durationDays;


        });





        const averageDays =
        Math.round(

            totalDays /
            records.length

        );





        const average =
        await TimelineAverage.findOneAndUpdate(

            {


            profileKey,

            stepOrder


            },


            {


            profileKey,

            stepOrder,

            stepTitle: records[0].stepTitle,

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





        res.json({

            message:
            "Average calculated.",

            average

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
// Get Average
// =================================


router.get(
"/:profileKey/:stepOrder",
async(req,res)=>{


    try{


        const average =
        await TimelineAverage.findOne({

            profileKey:
            req.params.profileKey,


            stepOrder:
            req.params.stepOrder


        });





        if(!average){


            return res.json({

                averageDays:null,

                totalUsers:0

            });


        }





        res.json(average);



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
