const express = require("express");

const router = express.Router();

const User = require("../models/User");

const path = require("path");

const fs = require("fs");



// =================================
// Load Dynamic Roadmap
// =================================

function getRoadmap(
    pathway,
    stream
){


    if(pathway === "Express Entry"){


        let fileName;



        if(
            stream ===
            "Canadian Experience Class (CEC)"
        ){

            fileName = "cec.json";

        }


        else if(
            stream ===
            "Federal Skilled Worker Program (FSWP)"
        ){

            fileName = "fswp.json";

        }


        else if(
            stream ===
            "Federal Skilled Trades Program (FSTP)"
        ){

            fileName = "fstp.json";

        }


        else {

            return null;

        }



        const filePath =
            path.join(

                __dirname,

                "../data/roadmaps/express-entry",

                fileName

            );



        const roadmap =
            JSON.parse(

                fs.readFileSync(
                    filePath,
                    "utf8"
                )

            );



        return roadmap;


    }



    return null;


}






// =================================
// Get User Journey Progress
// IMPORTANT:
// Must be ABOVE /:pathway/:stream
// =================================

router.get(
    "/progress/:username",
    async(req,res)=>{


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

router.put(
    "/progress/:username",
    async(req,res)=>{


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









// =================================
// Get Dynamic Journey Roadmap
// =================================

router.get(
    "/:pathway/:stream",
    async(req,res)=>{


    try {


        const pathway =
            req.params.pathway;



        const stream =
            req.params.stream;



        const roadmap =
            getRoadmap(
                pathway,
                stream
            );



        if(!roadmap){


            return res.status(404).json({

                message:
                "Journey roadmap not found."

            });


        }



        res.json(
            roadmap
        );


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