const express = require("express");

const router = express.Router();

const User = require("../models/User");


// Get immigration profile

router.get("/:username", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.params.username
        });


        if (!user) {

            return res.status(404).json({
                message: "User not found."
            });

        }


        res.json(user.immigrationProfile);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});



// Update immigration profile

router.put("/:username", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.params.username
        });


        if (!user) {

            return res.status(404).json({
                message: "User not found."
            });

        }


        user.immigrationProfile = {

            ...user.immigrationProfile,
            ...req.body

        };


        user.profileCompleted = true;


        await user.save();


        res.json({

            message: "Profile updated!",
            profile: user.immigrationProfile

        });


    } catch(error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});


module.exports = router;