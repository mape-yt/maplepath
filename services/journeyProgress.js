const { roadmapForProfile } = require("../data/roadmaps/registry");

function emptyProgress(){
    return { completedSteps:[], currentStep:1 };
}

function progressFor(user, profileKey){
    const saved = profileKey && user.journeyProgressByProfile?.get(profileKey);
    return saved || emptyProgress();
}

// Existing users have one legacy progress object and no profile key. Only
// Express Entry had working roadmaps before this change, so never seed a new
// PNP journey with legacy steps that may belong to Express Entry.
function migrateLegacyProgress(user, definition = roadmapForProfile(user.immigrationProfile)){
    if(user.legacyJourneyMigrated) return false;
    if(!user.journeyProgressByProfile) user.journeyProgressByProfile = new Map();

    if(definition?.pathway === "Express Entry" &&
        !user.journeyProgressByProfile.has(definition.profileKey)){
        const legacy = user.immigrationJourney || emptyProgress();
        user.journeyProgressByProfile.set(definition.profileKey, {
            completedSteps:Array.isArray(legacy.completedSteps) ? [...legacy.completedSteps] : [],
            currentStep:Number.isInteger(legacy.currentStep) ? legacy.currentStep : 1
        });
    }
    user.legacyJourneyMigrated = true;
    return true;
}

function mirrorCurrentProgress(user, definition){
    const current = progressFor(user, definition?.profileKey);
    if(!user.immigrationJourney) user.immigrationJourney = emptyProgress();
    user.immigrationJourney.completedSteps = [...current.completedSteps];
    user.immigrationJourney.currentStep = current.currentStep;
}

function saveProgress(user, profileKey, completedSteps, currentStep){
    if(!user.journeyProgressByProfile) user.journeyProgressByProfile = new Map();
    if(!user.immigrationJourney) user.immigrationJourney = emptyProgress();
    user.journeyProgressByProfile.set(profileKey, { completedSteps, currentStep });
    user.immigrationJourney.completedSteps = [...completedSteps];
    user.immigrationJourney.currentStep = currentStep;
}

module.exports = { emptyProgress, progressFor, migrateLegacyProgress, mirrorCurrentProgress, saveProgress };
