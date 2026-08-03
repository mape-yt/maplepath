const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true
    },

    passwordHash: {
        type: String,
        required: true
    },

    profileCompleted: {
        type: Boolean,
        default: false
    },

    immigrationProfile: {

        // =============================
        // User Type
        // =============================

        journeyType: String,

        // =============================
        // Exploring User
        // =============================

        country: String,

        currentStatus: String,

        education: String,

        // =============================
        // Journey User
        // =============================

        pathway: String,

        stream: String,

        province: String,

        location: String,

        status: String,

        currentStage: String,

        journeyStartDate: Date

    },

    immigrationJourney: {

        completedSteps: {

            type: [Number],

            default: []

        },

        currentStep: {

            type: Number,

            default: 1

        }

    },

});

module.exports = mongoose.model("User", userSchema);