const express = require("express");

const router = express.Router();

const defaultTasks = [

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

// Temporary dashboard tasks are kept separately for each signed-in user.
const tasksByUser = new Map();

function getTasks(username){
    if(!tasksByUser.has(username)){
        tasksByUser.set(username, defaultTasks.map(task => ({ ...task })));
    }
    return tasksByUser.get(username);
}

router.put("/:id", (req, res) => {
    const tasks = getTasks(req.auth.username);

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
    const tasks = getTasks(req.auth.username);

    const taskId = Number(req.params.id);

    tasksByUser.set(req.auth.username, tasks.filter(task => task.id !== taskId));

    res.json({
        message: "Task deleted successfully."
    });

});

router.post("/", (req, res) => {
    const tasks = getTasks(req.auth.username);

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
    const tasks = getTasks(req.auth.username);

    res.json(tasks);

});

module.exports = router;
