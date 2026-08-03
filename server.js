require("dns").setDefaultResultOrder("ipv4first");

require("dotenv").config();

const express = require("express");
const path = require("path");


const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const taskRoutes = require("./routes/taskRoutes");
const journeyRoutes = require("./routes/journeyRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const connectDB = require("./config/db");


const app = express();

const PORT = process.env.PORT || 3000;


// Connect to MongoDB

connectDB();


// Middleware

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// API Routes

app.use("/api/auth", authRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/journey", journeyRoutes);

app.use("/api/timeline", timelineRoutes);

app.use("/api/analytics", analyticsRoutes);

// Serve frontend

app.use(express.static(path.join(__dirname, "public")));


// Test API

app.get("/api", (req, res) => {

    res.json({

        message: "MaplePath API is running!"

    });

});


// Start server

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});