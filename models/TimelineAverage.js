const mongoose = require("mongoose");


const timelineAverageSchema =
new mongoose.Schema({


    profileKey: {
        type: String,
        required: true
    },


    stepOrder: {

        type:Number,

        required:true

    },


    stepTitle: {

        type:String,

        required:true

    },


    averageDays: {

        type:Number,

        default:0

    },


    totalUsers: {

        type:Number,

        default:0

    },


    lastUpdated: {

        type:Date,

        default:Date.now

    }


});



module.exports =
mongoose.model(
    "TimelineAverage",
    timelineAverageSchema
);