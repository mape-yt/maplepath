const crypto = require("node:crypto");
const express = require("express");
const User = require("../models/User");

const router = express.Router();

async function currentUser(req, res) {
    const user = await User.findOne({ username:req.auth.username });
    if (!user) res.status(404).json({ message:"User not found." });
    return user;
}

router.get("/", async (req, res) => {
    try {
        const user = await currentUser(req, res);
        if (!user) return;
        res.json(user.dashboardTasks || []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message:"Unable to load tasks." });
    }
});

router.post("/", async (req, res) => {
    try {
        const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
        if (!title || title.length > 160) {
            return res.status(400).json({ message:"Enter a task between 1 and 160 characters." });
        }

        const user = await currentUser(req, res);
        if (!user) return;
        const task = {
            id:crypto.randomUUID(),
            title,
            completed:false,
            createdAt:new Date()
        };
        user.dashboardTasks.push(task);
        await user.save();
        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message:"Unable to add the task." });
    }
});

router.put("/:id", async (req, res) => {
    try {
        if (typeof req.body?.completed !== "boolean") {
            return res.status(400).json({ message:"Task completion must be true or false." });
        }
        const user = await currentUser(req, res);
        if (!user) return;
        const task = user.dashboardTasks.find(item => item.id === req.params.id);
        if (!task) return res.status(404).json({ message:"Task not found." });
        task.completed = req.body.completed;
        user.markModified("dashboardTasks");
        await user.save();
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message:"Unable to update the task." });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const user = await currentUser(req, res);
        if (!user) return;
        const index = user.dashboardTasks.findIndex(item => item.id === req.params.id);
        if (index === -1) return res.status(404).json({ message:"Task not found." });
        user.dashboardTasks.splice(index, 1);
        await user.save();
        res.json({ message:"Task removed." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message:"Unable to remove the task." });
    }
});

module.exports = router;
