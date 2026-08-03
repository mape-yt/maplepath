const express = require("express");

const router = express.Router();


// Import roadmap data

const expressEntryRoadmap =
    require("../data/expressEntry");



// =================================
// Get Journey Roadmap
// =================================

router.get("/:pathway", async (req, res) => {


    try {


        const pathway = req.params.pathway;



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



module.exports = router;