const mongoose = require("mongoose");

const journeyProgressSchema = new mongoose.Schema({
    completedSteps: { type:[Number], default:[] },
    currentStep: { type:Number, default:1 }
}, { _id:false });

const dashboardTaskSchema = new mongoose.Schema({
    id: { type:String, required:true },
    title: { type:String, required:true, trim:true, maxlength:160 },
    completed: { type:Boolean, default:false },
    createdAt: { type:Date, default:Date.now }
}, { _id:false });

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

        // Kept for existing profiles and Journey analytics. The UI now asks
        // when the user started working toward the selected pathway.
        journeyStartDate: Date,

        canadaArrivalDate: Date,

        permanentResidenceDate: Date

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
    journeyProgressByProfile: { type:Map, of:journeyProgressSchema, default:{} },
    legacyJourneyMigrated: { type:Boolean, default:false },

    dashboardTasks: { type:[dashboardTaskSchema], default:[] },

});

module.exports = mongoose.model("User", userSchema);
