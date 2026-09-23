require("dns").setDefaultResultOrder("ipv4first");

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const path = require("path");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const taskRoutes = require("./routes/taskRoutes");
const journeyRoutes = require("./routes/journeyRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const optionsRoutes = require("./routes/optionsRoutes");

const connectDB = require("./config/db");
const { requireAuth, requireSameOrigin } = require("./middleware/auth");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
    app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many sign-in or account requests. Please try again shortly."
    }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/profile", requireSameOrigin, requireAuth, profileRoutes);
app.use("/api/tasks", requireSameOrigin, requireAuth, taskRoutes);
app.use("/api/journey", requireSameOrigin, requireAuth, journeyRoutes);
app.use("/api/timeline", requireSameOrigin, requireAuth, timelineRoutes);
app.use("/api/analytics", requireSameOrigin, requireAuth, analyticsRoutes);
app.use("/api/options", optionsRoutes);

app.get("/api/health", (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ok" : "unavailable",
        database: databaseConnected ? "connected" : "disconnected"
    });
});

app.get("/api", (req, res) => {
    res.json({ message: "MaplePath API is running!" });
});

app.use(express.static(path.join(__dirname, "public")));

let server;

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down MaplePath.`);

    if (server) {
        await new Promise(resolve => server.close(resolve));
    }

    await mongoose.disconnect();
    process.exit(0);
}

async function startServer() {
    await connectDB();

    server = app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(error => {
    console.error("MaplePath failed to start:", error.message);
    process.exit(1);
});
