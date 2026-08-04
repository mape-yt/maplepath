const express = require("express");

const router = express.Router();

const immigrationOptions = require("../data/immigrationOptions");


// ======================================
// Get Immigration Options
// ======================================

router.get("/", (req, res) => {

    res.json(immigrationOptions);

});


module.exports = router;