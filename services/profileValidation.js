const immigrationOptions = require("../data/immigrationOptions");
const { findRoadmap } = require("../data/roadmaps/registry");

const JOURNEY_TYPES = new Set(["planning", "pathway", "completed"]);

function isListed(value, values) {
    return typeof value === "string" && values.includes(value);
}

function dateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function validateProfile(input = {}) {
    const profile = { ...input };

    if (!profile.journeyType) {
        const completed = Boolean(profile.permanentResidenceDate)
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
        return { profile };
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
        if (!isListed(profile.currentStage, immigrationOptions.stages)) {
            return { error: "Choose a valid current stage." };
        }
        profile.permanentResidenceDate = null;
    } else {
        profile.status = "Permanent resident";
        profile.currentStage = "Landed as PR";
        profile.currentStatus = "Permanent resident";
        if (!profile.permanentResidenceDate) {
            return { error: "Enter the date you became a permanent resident." };
        }
    }

    const today = new Date().toISOString().slice(0, 10);
    const dates = [profile.journeyStartDate, profile.canadaArrivalDate, profile.permanentResidenceDate]
        .filter(Boolean)
        .map(dateOnly);
    if (dates.some(value => !value || value > today)) {
        return { error: "Enter valid dates that are not in the future." };
    }
    const start = dateOnly(profile.journeyStartDate);
    const permanentResidence = dateOnly(profile.permanentResidenceDate);
    if (start && permanentResidence && permanentResidence < start) {
        return { error: "The permanent residence date must be after the pathway start date." };
    }

    return { profile };
}

module.exports = { validateProfile };
