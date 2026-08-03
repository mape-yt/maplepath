const express = require("express");

const router = express.Router();

const User = require("../models/User");


// Roadmap data

const expressEntryRoadmap =
    require("../data/expressEntry");




// =================================
// Get Journey Roadmap
// =================================

router.get("/:pathway", async (req, res) => {


    try {


        const pathway =
            req.params.pathway;



        if (pathway === "Express Entry") {


            return res.json(
                expressEntryRoadmap
            );


        }



        res.status(404).json({

            message:
                "Journey roadmap not found."

        });



    }


    catch(error) {


        console.error(error);


        res.status(500).json({

            message:
                "Server error."

        });


    }


});





// =================================
// Get User Journey Progress
// =================================

router.get("/progress/:username", async (req,res)=>{


    try {


        const user =
            await User.findOne({

                username:
                    req.params.username

            });



        if(!user){


            return res.status(404).json({

                message:
                    "User not found."

            });


        }



        res.json({

            completedSteps:
                user.immigrationJourney.completedSteps,


            currentStep:
                user.immigrationJourney.currentStep


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
// Update User Journey Progress
// =================================

router.put("/progress/:username", async (req,res)=>{


    try {


        const user =
            await User.findOne({

                username:
                    req.params.username

            });



        if(!user){


            return res.status(404).json({

                message:
                    "User not found."

            });


        }




        user.immigrationJourney.completedSteps =
            req.body.completedSteps;



        user.immigrationJourney.currentStep =
            req.body.currentStep;



        await user.save();




        res.json({

            message:
                "Journey progress updated.",


            journey:
                user.immigrationJourney


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