const express = require("express");

const router = express.Router();

let tasks = [

    {
        id: 1,
        title: "Create IRCC Account",
        completed: true
    },

    {
        id: 2,
        title: "Complete IELTS",
        completed: false
    },

    {
        id: 3,
        title: "Prepare Passport",
        completed: false
    }

];

router.put("/:id", (req, res) => {

    const taskId = Number(req.params.id);

    const task = tasks.find(t => t.id === taskId);

    if (!task) {

        return res.status(404).json({
            message: "Task not found."
        });

    }

    task.completed = req.body.completed;

    res.json(task);

});

router.delete("/:id", (req, res) => {

    const taskId = Number(req.params.id);

    tasks = tasks.filter(task => task.id !== taskId);

    res.json({
        message: "Task deleted successfully."
    });

});

router.post("/", (req, res) => {

    const newTask = {

        id: Date.now(),

        title: req.body.title,

        completed: false

    };

    tasks.push(newTask);

    res.status(201).json(newTask);

});

// Get all tasks
router.get("/", (req, res) => {

    res.json(tasks);

});

module.exports = router;