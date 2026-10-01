// Isolated fixture app. Real profile/journey routers, in-memory user, no Atlas connection.
const express = require("express");
const path = require("node:path");

function createPermitApp() {
    let storedProfile = {};
    const user = {
        username: "permit-test", profileCompleted: false,
        journeyProgressByProfile: new Map(), legacyJourneyMigrated: true,
        immigrationJourney: { completedSteps: [], currentStep: 1 },
        async save() {}
    };
    Object.defineProperty(user, "immigrationProfile", {
        get() { return storedProfile; },
        set(value) {
            storedProfile = { ...value };
            Object.defineProperty(storedProfile, "toObject", { enumerable: false, value: () => ({ ...storedProfile }) });
        }
    });
    user.immigrationProfile = {};
    const userPath = require.resolve("../../models/User");
    const authPath = require.resolve("../../middleware/auth");
    // Authentication is deliberately stubbed here; these tests exercise route persistence contracts.
    require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: { findOne: async ({ username }) => username === user.username ? user : null } };
    require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { requireOwnUsername: (req, res, next) => next() } };
    for (const route of ["../../routes/profileRoutes", "../../routes/journeyRoutes"]) delete require.cache[require.resolve(route)];
    const app = express();
    app.use(express.json());
    app.get("/api/auth/session", (req, res) => res.json({ username: user.username }));
    app.use("/api/profile", require("../../routes/profileRoutes"));
    app.use("/api/journey", require("../../routes/journeyRoutes"));
    app.use("/api/options", require("../../routes/optionsRoutes"));
    app.get("/api/tasks", (req, res) => res.json([]));
    app.get("/api/timeline/:username", (req, res) => res.json([]));
    app.get("/api/analytics/:key/:step", (req, res) => res.json({ averageDays: null, totalUsers: 0 }));
    app.use(express.static(path.join(__dirname, "../../public")));
    return { app, user };
}
module.exports = { createPermitApp };
