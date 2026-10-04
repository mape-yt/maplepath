const Application = require("../models/Application");
const { emptyProgress } = require("./journeyProgress");

const isPermit = definition => ["Study Permit", "Work Permit"].includes(definition.pathway);
const idOf = value => value == null ? "" : String(value);

async function selectedApplication(user, definition) {
    const id = user.activeApplications?.get(definition.profileKey);
    if (!id) return null;
    const application = await Application.findOne({_id:id, username:user.username, profileKey:definition.profileKey});
    if (!application) throw new Error("Selected application not found.");
    return application;
}

function applicationMatches(expected, application) {
    return idOf(expected) === idOf(application?._id);
}

function recordScope(application) {
    if (!application) return {applicationId:null};
    return application.includesLegacy
        ? {$or:[{applicationId:application._id},{applicationId:null}]}
        : {applicationId:application._id};
}

function publicApplication(application) {
    if (!application) return null;
    return { id:idOf(application._id), profileKey:application.profileKey,
        includesLegacy:application.includesLegacy, permitType:application.permitType,
        submissionLocation:application.submissionLocation, submittedOn:application.submittedOn,
        decidedOn:application.decidedOn, outcome:application.outcome };
}

function validateDetails(input, definition, now = new Date()) {
    const allowed = ["profileKey","applicationId","permitType","submissionLocation","submittedOn","decidedOn","outcome"];
    if (!input || typeof input !== "object" || Array.isArray(input)
        || Object.keys(input).some(key => !allowed.includes(key))) return {error:"Only application details can be saved here."};
    const details = {};
    for (const key of ["permitType","submissionLocation","submittedOn","decidedOn","outcome"]) {
        const value = input[key] ?? "";
        if (typeof value !== "string") return {error:"Enter valid application details."};
        details[key] = value;
    }
    if (!["","new","extension"].includes(details.permitType)
        || !["","Inside Canada","Outside Canada"].includes(details.submissionLocation)
        || !["","approved","refused","withdrawn"].includes(details.outcome)) return {error:"Choose one of the listed options."};
    if (!isPermit(definition) && (details.permitType || details.submissionLocation)) return {error:"Permit details do not apply to this pathway."};
    for (const key of ["submittedOn","decidedOn"]) {
        const value = details[key];
        if (!value) continue;
        const date = new Date(value + "T00:00:00.000Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime())
            || date.toISOString().slice(0,10) !== value || value > now.toISOString().slice(0,10)) {
            return {error:"Enter real dates that are not in the future."};
        }
    }
    if (details.decidedOn && !details.outcome) return {error:"Choose which result this date refers to."};
    if (details.decidedOn && details.submittedOn && details.decidedOn < details.submittedOn) return {error:"The result date must be on or after submission. Correct it or leave an unknown date blank."};
    return {details};
}

module.exports = {isPermit, idOf, selectedApplication, applicationMatches, recordScope, publicApplication, validateDetails, emptyProgress};
