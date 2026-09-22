const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { endSession, requireAuth, requireSameOrigin } = require("../middleware/auth");

router.use(requireSameOrigin);

// POST /api/auth/signup
router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.get("/session", requireAuth, (req,res) => {
    res.json({ username: req.auth.username, profileCompleted: req.auth.profileCompleted });
});

router.post("/logout", async (req,res,next) => {
    try{
        await endSession(req,res);
        res.json({ message: "Logged out." });
    } catch(error){
        next(error);
    }
});

module.exports = router;
