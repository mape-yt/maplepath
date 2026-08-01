const User = require("../models/User");


exports.createProfile = async (req, res) => {

    try {

        const {
            username,
            pathway,
            stream,
            province,
            location,
            status,
            currentStage,
            journeyStartDate
        } = req.body;


        const user = await User.findOne({
            username
        });


        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }


        user.immigrationProfile = {

            pathway,
            stream,
            province,
            location,
            status,
            currentStage,
            journeyStartDate

        };


        user.profileCompleted = true;


        await user.save();


        res.json({
            message: "Profile saved successfully."
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

};