const immigrationOptions = require("../data/immigrationOptions");
const { findRoadmap } = require("../data/roadmaps/registry");
const pathwayContext = require("../public/js/pathway-context");

const JOURNEY_TYPES = new Set(["planning", "pathway", "completed"]);

function isListed(value, values) {
    return typeof value === "string" && values.includes(value);
}

function dateOnly(value) {
    if (!value) return null;
    if (!(value instanceof Date) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value))) return null;
    if (typeof value === "string") {
        const calendar = value.slice(0,10);
        const parsed = new Date(calendar);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== calendar) return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const day = date.toISOString().slice(0, 10);
    if (typeof value === "string" && value.length === 10 && day !== value) return null;
    return day;
}

function validateProfile(input = {}) {
    const profile = { ...input };

    if (!profile.journeyType) {
        const completed = Boolean(profile.permanentResidenceDate || profile.permitApprovalDate)
            || profile.status === "Permanent resident"
            || profile.currentStage === "Landed as PR";
        profile.journeyType = profile.pathway && profile.stream
            ? (completed ? "completed" : "pathway")
            : "planning";
    }

    if (!JOURNEY_TYPES.has(profile.journeyType)) {
        return { error: "Choose a valid journey status." };
    }
    if (!isListed(profile.location, immigrationOptions.locations)) {
        return { error: "Choose whether you are inside or outside Canada." };
    }
    if (profile.province && !isListed(profile.province, immigrationOptions.provinces)) {
        return { error: "Choose a valid province or territory." };
    }

    if (profile.journeyType === "planning") {
        profile.pathway = "";
        profile.stream = "";
        profile.status = "Planning";
        profile.currentStage = "Researching";
        profile.journeyStartDate = null;
        profile.permanentResidenceDate = null;
        profile.permitApprovalDate = null;
        return validateDates(profile);
    }

    if (!isListed(profile.pathway, immigrationOptions.pathways)) {
        return { error: "Choose a supported immigration pathway." };
    }
    if (!isListed(profile.stream, immigrationOptions.streams[profile.pathway] || [])) {
        return { error: "Choose a supported program stream." };
    }

    const definition = findRoadmap(profile.pathway, profile.stream);
    if (!definition) {
        return { error: "This program does not have a MaplePath roadmap yet." };
    }

    if (definition.province) profile.province = definition.province;
    if (profile.pathway === "Express Entry" && profile.province === "Quebec") {
        return { error: "Express Entry applicants must plan to live outside Quebec." };
    }

    if (profile.journeyType === "pathway") {
        if (!isListed(profile.status, immigrationOptions.applicationStatuses)) {
            return { error: "Choose a valid application status." };
        }
        if (!isListed(profile.currentStage, pathwayContext.stages(immigrationOptions, profile.pathway))) {
            return { error: "Choose a valid current stage." };
        }
        profile.permanentResidenceDate = null;
        profile.permitApprovalDate = null;
    } else {
        const outcome = pathwayContext.completion(profile.pathway);
        profile.status = outcome.label;
        profile.currentStage = outcome.stage;
        if (pathwayContext.isPermit(profile.pathway)) {
            profile.permanentResidenceDate = null;
            // An overseas approval is not proof that the permit has been issued
            // or that the applicant has entered Canada with that status.
        } else {
            profile.currentStatus = "Permanent resident";
            profile.permitApprovalDate = null;
        }
        // Completion is a self-reported status; its exact date may be unknown.
    }

    return validateDates(profile);
}

function validateDates(profile) {
    for (const field of ["journeyStartDate","canadaArrivalDate","permanentResidenceDate","permitApprovalDate"]) {
        const value=profile[field];
        if(value==null || value==="")profile[field]=null;
        else if(!dateOnly(value))return {error:"Enter valid dates, or leave unknown dates blank."};
    }
    const today = new Date().toISOString().slice(0, 10);
    const dates = [profile.journeyStartDate, profile.canadaArrivalDate, profile.permanentResidenceDate, profile.permitApprovalDate]
        .filter(Boolean)
        .map(dateOnly);
    if (dates.some(value => !value || value > today)) {
        return { error: "Enter valid dates that are not in the future." };
    }
    const start = dateOnly(profile.journeyStartDate);
    const permanentResidence = dateOnly(profile.permanentResidenceDate);
    if (start && permanentResidence && permanentResidence < start) {
        return { error: "The permanent residence date cannot be before you began preparing." };
    }
    const approval = dateOnly(profile.permitApprovalDate);
    if (start && approval && approval < start) {
        return { error: "The permit approval date cannot be before you began preparing." };
    }

    return { profile };
}

module.exports = { validateProfile };
