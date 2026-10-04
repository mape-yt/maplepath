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

    profileKey: {
        type: String,
        required: true
    },

    applicationId: { type:mongoose.Schema.Types.ObjectId, ref:"Application", immutable:true },

    // Set only by the server when creating a record. Editing dates never promotes test data.
    dataSource: { type: String, enum: ["test", "self-reported"], default: "test", immutable: true },

    // Snapshot at step creation; never infer this from a later profile.
    context: {
        location: { type: String, enum: ["Inside Canada", "Outside Canada", "Unknown"] }
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



timelineRecordSchema.index({ profileKey: 1, stepOrder: 1 });
timelineRecordSchema.index({applicationId:1, stepOrder:1},
    {unique:true, partialFilterExpression:{applicationId:{$type:"objectId"}}});

module.exports =
mongoose.model(
    "TimelineRecord",
    timelineRecordSchema
);
