const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {

    res.json({

        name: "Seungyun",
        status: "Student",
        province: "Alberta",
        program: "Express Entry",
        crs: "--",
        progress: 35

    });

});

module.exports = router;