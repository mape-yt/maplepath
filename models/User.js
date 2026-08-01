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

    immigrationProfile: {

        pathway: {
            type: String,
            default: ""
        },

        stream: {
            type: String,
            default: ""
        },

        province: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: ""
        },

        currentStage: {
            type: String,
            default: ""
        },

        journeyStartDate: {
            type: Date,
            default: null
        }

    }

});


module.exports = mongoose.model("User", userSchema);