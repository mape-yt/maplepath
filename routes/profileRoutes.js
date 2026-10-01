const express = require("express");

const router = express.Router();

const User = require("../models/User");
const { requireOwnUsername } = require("../middleware/auth");
const { roadmapForProfile } = require("../data/roadmaps/registry");
const { migrateLegacyProgress, mirrorCurrentProgress } = require("../services/journeyProgress");
const { validateProfile } = require("../services/profileValidation");

function prepareProfile(profile){
    return validateProfile(profile);
}

router.param("username", requireOwnUsername);

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

        const result = prepareProfile(req.body || {});
        if(result.error) return res.status(400).json({ message:result.error });
        const profile = result.profile;

        migrateLegacyProgress(user, roadmapForProfile(user.immigrationProfile));
        user.immigrationProfile = profile;
        mirrorCurrentProgress(user, roadmapForProfile(user.immigrationProfile));

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

        const result = prepareProfile({ ...user.immigrationProfile.toObject(), ...(req.body || {}) });
        if(result.error) return res.status(400).json({ message:result.error });
        const profile = result.profile;

        migrateLegacyProgress(user, roadmapForProfile(user.immigrationProfile));
        Object.assign(user.immigrationProfile, profile);
        mirrorCurrentProgress(user, roadmapForProfile(user.immigrationProfile));

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
