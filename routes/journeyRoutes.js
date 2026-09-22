const express = require("express");
const User = require("../models/User");
const { requireOwnUsername } = require("../middleware/auth");
const { findRoadmap, roadmapForProfile, loadRoadmap } = require("../data/roadmaps/registry");
const { progressFor, migrateLegacyProgress, saveProgress } = require("../services/journeyProgress");

const router = express.Router();
router.param("username", requireOwnUsername);

// Progress belongs to the signed-in user's selected pathway and stream.
// Keep this route above /:pathway/:stream.
router.get("/progress/:username", async (req, res) => {
    try{
        const user = await User.findOne({ username:req.params.username });
        if(!user) return res.status(404).json({ message:"User not found." });

        const definition = roadmapForProfile(user.immigrationProfile);
        if(!definition) return res.status(404).json({ message:"No roadmap for this profile yet." });
        if(migrateLegacyProgress(user, definition)) await user.save();

        const progress = progressFor(user, definition.profileKey);
        res.json({
            profileKey:definition.profileKey,
            completedSteps:progress.completedSteps,
            currentStep:progress.currentStep
        });
    } catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

router.put("/progress/:username", async (req, res) => {
    try{
        const user = await User.findOne({ username:req.params.username });
        if(!user) return res.status(404).json({ message:"User not found." });

        const definition = roadmapForProfile(user.immigrationProfile);
        if(!definition) return res.status(404).json({ message:"No roadmap for this profile yet." });
        if(req.body?.profileKey && req.body.profileKey !== definition.profileKey){
            return res.status(409).json({ message:"Your selected roadmap changed. Reload Journey." });
        }

        const roadmap = loadRoadmap(definition);
        const allowed = new Set(roadmap.steps.map(step => step.order));
        const submitted = req.body?.completedSteps;
        if(!Array.isArray(submitted) || submitted.some(order => !Number.isInteger(order) || !allowed.has(order))){
            return res.status(400).json({ message:"Invalid completed steps." });
        }

        migrateLegacyProgress(user, definition);
        const completedSteps = [...new Set(submitted)].sort((a,b) => a-b);
        const currentStep = roadmap.steps.find(step => !completedSteps.includes(step.order))?.order
            ?? roadmap.steps.at(-1).order;
        saveProgress(user, definition.profileKey, completedSteps, currentStep);
        await user.save();

        res.json({ message:"Journey progress updated.", journey:{
            profileKey:definition.profileKey, completedSteps, currentStep
        } });
    } catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

router.get("/:pathway/:stream", (req, res) => {
    try{
        const definition = findRoadmap(req.params.pathway, req.params.stream);
        if(!definition) return res.status(404).json({ message:"Journey roadmap not found." });
        res.json(loadRoadmap(definition));
    } catch(error){
        console.error(error);
        res.status(500).json({ message:"Server error." });
    }
});

module.exports = router;
