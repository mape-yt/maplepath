const express = require("express");
const { rateLimit } = require("express-rate-limit");
const TimelineRecord = require("../models/TimelineRecord");
const { roadmaps, loadRoadmap } = require("../data/roadmaps/registry");
const { POLICY, LOCATIONS, summarizeStep, communityDataMode } = require("../services/communityAnalytics");
const router = express.Router();

router.use(rateLimit({ windowMs: 60000, limit: 90, standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Please wait a minute before refreshing community data again." } }));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

async function calculate(req, res, batch = false) {
    const profileKey = req.params.profileKey || req.body?.profileKey;
    const definition = roadmaps.find(r => r.profileKey === profileKey);
    const location = req.query.location || "all";
    if (!definition || Object.keys(req.query).some(key => key !== "location")
        || typeof location !== "string" || !["all", ...LOCATIONS].includes(location)) {
        return res.status(400).json({ message: "Choose a supported roadmap and location group." });
    }
    const roadmap = loadRoadmap(definition);
    const order = Number(req.params.stepOrder || req.body?.stepOrder);
    const steps = batch ? roadmap.steps : roadmap.steps.filter(s => s.order === order);
    if (!steps.length) return res.status(400).json({ message: "Unknown roadmap step." });
    try {
        const dataMode = communityDataMode();
        const query = { profileKey: definition.profileKey };
        if (!batch) query.stepOrder = order;
        // Read current records: edits cannot leave an old average behind. Legacy cache is unused.
        const records = dataMode === "community" ? await TimelineRecord.find(query)
            .select("username pathway profileKey stepOrder startedAt completedAt status durationDays context dataSource updatedAt createdAt")
            .limit(POLICY.maximumRecords + 1).lean() : [];
        if (records.length > POLICY.maximumRecords) {
            return res.status(503).json({ message: "Community data is temporarily unavailable. Please try again later." });
        }
        const now = new Date();
        const summaries = steps.map(step => summarizeStep(records, { definition, step,
            username: req.auth.username, location, now, dataMode }));
        if (batch) return res.json({ profileKey, methodVersion: POLICY.version, dataMode, steps: summaries });
        if (req.method === "POST") return res.json({ message: "Community statistics calculated.", average: summaries[0] });
        return res.json(summaries[0]);
    } catch (error) {
        console.error("Community analytics unavailable:", error.message);
        return res.status(503).json({ message: "Community data is temporarily unavailable. Please try again later." });
    }
}

router.get("/pathway/:profileKey", (req, res) => calculate(req, res, true));
router.post("/calculate", (req, res) => calculate(req, res));
router.get("/:profileKey/:stepOrder", (req, res) => calculate(req, res));
module.exports = router;
