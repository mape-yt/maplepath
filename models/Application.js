const mongoose = require("mongoose");

// One application attempt. Program/province labels come from the roadmap registry.
const schema = new mongoose.Schema({
    username: { type:String, required:true, immutable:true },
    profileKey: { type:String, required:true, immutable:true },
    includesLegacy: { type:Boolean, default:false, immutable:true },
    dataSource: { type:String, enum:["test", "self-reported"], required:true, immutable:true },
    permitType: { type:String, enum:["", "new", "extension"], default:"" },
    submissionLocation: { type:String, enum:["", "Inside Canada", "Outside Canada"], default:"" },
    submittedOn: { type:String, default:"" },
    decidedOn: { type:String, default:"" },
    outcome: { type:String, enum:["", "approved", "refused", "withdrawn"], default:"" },
    completedSteps: { type:[Number], default:[] },
    currentStep: { type:Number, default:1 }
}, { timestamps:true, optimisticConcurrency:true });

schema.index({username:1, profileKey:1});
// Two simultaneous first saves cannot both claim the old timeline.
schema.index({username:1, profileKey:1, includesLegacy:1},
    {unique:true, partialFilterExpression:{includesLegacy:true}});
module.exports = mongoose.model("Application", schema);
