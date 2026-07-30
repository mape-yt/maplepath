const express = require("express");

const router = express.Router();

let profile = {

    name: "Seungyun",
    status: "Student",
    province: "Alberta",
    program: "Express Entry",
    crs: "--",
    progress: 35

};

router.get("/", (req, res) => {

    res.json(profile);

});

router.put("/", (req, res) => {

    profile = {

        ...profile,
        ...req.body

    };

    res.json({

        message: "Profile updated!",
        profile

    });

});

module.exports = router;