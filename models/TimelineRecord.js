const mongoose = require("mongoose");


const timelineRecordSchema = new mongoose.Schema({


    // User who created this record

    username: {

        type: String,

        required: true

    },



    // Immigration pathway

    pathway: {

        type: String,

        required: true

    },



    // Step number from roadmap

    stepOrder: {

        type: Number,

        required: true

    },



    // Step name for easier analytics

    stepTitle: {

        type: String,

        required: true

    },



    // When user started this step

    startedAt: {

        type: Date,

        required: true

    },



    // When user finished this step

    completedAt: {

        type: Date,

        default: null

    },



    // Automatically calculated

    durationDays: {

        type: Number,

        default: null

    },



    // Current state

    status: {

        type: String,

        enum: [

            "in-progress",

            "completed"

        ],

        default: "in-progress"

    }



},


{

    timestamps:true

}



);



module.exports =
mongoose.model(
    "TimelineRecord",
    timelineRecordSchema
);