const express = require("express");

const router = express.Router();

const User = require("../models/User");

// ======================================
// Get Immigration Profile
// ======================================

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

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});


// ======================================
// Onboarding
// Replace Entire Profile
// ======================================

router.put("/onboarding/:username", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.params.username
        });

        if (!user) {

            return res.status(404).json({
                message: "User not found."
            });

        }

        user.immigrationProfile = req.body;

        user.profileCompleted = true;

        await user.save();

        res.json({

            message: "Onboarding completed.",

            profile: user.immigrationProfile

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Server error."

        });

    }

});


// ======================================
// Dashboard Edit
// Update Only Selected Fields
// ======================================

router.patch("/:username", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.params.username
        });

        if (!user) {

            return res.status(404).json({

                message: "User not found."

            });

        }

        Object.assign(
            user.immigrationProfile,
            req.body
        );

        await user.save();

        res.json({

            message: "Profile updated.",

            profile: user.immigrationProfile

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Server error."

        });

    }

});

module.exports = router;