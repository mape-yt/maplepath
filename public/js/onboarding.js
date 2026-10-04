const PNP_PATHWAY = "Provincial Nominee Program";

const state = {
    journeyType: "",
    pathway: "",
    province: "",
    stream: "",
    options: { pathways: [], streams: {}, streamProvinces: {}, provinces: [], locations: [], statuses: [], stages: [] }
};

const steps = {
    situation: document.getElementById("situation-step"),
    pathway: document.getElementById("pathway-step"),
    province: document.getElementById("province-step"),
    stream: document.getElementById("stream-step"),
    details: document.getElementById("details-form")
};

const intro = document.querySelector(".intro-copy");
const pathwayInput = document.getElementById("pathway");
const pnpProvinceInput = document.getElementById("pnp-province");
const streamInput = document.getElementById("stream");
const locationInput = document.getElementById("location");
const currentStatusInput = document.getElementById("current-status");
const settlementProvinceInput = document.getElementById("settlement-province");
const applicationStatusInput = document.getElementById("application-status");
const currentStageInput = document.getElementById("current-stage");
const pathwayStartDateInput = document.getElementById("pathway-start-date");
const canadaArrivalDateInput = document.getElementById("canada-arrival-date");
const permanentResidenceDateInput = document.getElementById("permanent-residence-date");
const permitApprovalDateInput = document.getElementById("permit-approval-date");
const formMessage = document.getElementById("form-message");
const saveButton = document.getElementById("save-profile");

function replaceOptions(select, values, placeholder, selected = "") {
    select.innerHTML = "";
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = placeholder;
    select.appendChild(prompt);

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === selected;
        select.appendChild(option);
    });
}

function showStep(name, label, current, total) {
    Object.entries(steps).forEach(([key, element]) => element.classList.toggle("hidden", key !== name));
    intro.classList.toggle("hidden", name !== "situation");
    document.getElementById("progress-label").textContent = label;
    document.getElementById("progress-count").textContent = `Step ${current} of ${total}`;
    document.getElementById("progress-fill").style.width = `${(current / total) * 100}%`;
    const progress = document.querySelector(".progress-track");
    progress.setAttribute("aria-valuemax", String(total));
    progress.setAttribute("aria-valuenow", String(current));
    document.querySelector(".onboarding-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function streamsForProvince(province) {
    return (state.options.streams[PNP_PATHWAY] || []).filter(stream =>
        state.options.streamProvinces?.[stream] === province
    );
}

function pnpProvinces() {
    return [...new Set(Object.values(state.options.streamProvinces || {}))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
}

function settlementProvinces() {
    const provinces = state.options.provinces || [];
    return state.pathway === "Express Entry"
        ? provinces.filter(province => province !== "Quebec")
        : provinces;
}

function pathwayHasStreams(pathway) {
    return Array.isArray(state.options.streams[pathway]) && state.options.streams[pathway].length > 0;
}

function totalSteps() {
    if (state.journeyType === "planning") return 2;
    if (state.pathway === PNP_PATHWAY) return 5;
    if (pathwayHasStreams(state.pathway)) return 4;
    return 3;
}

function setRequired(groupId, input, required) {
    document.getElementById(groupId).classList.toggle("hidden", !required);
    input.required = required && input.type !== "date";
    if (!required) input.value = "";
}

function configureDetails() {
    const isPlanning = state.journeyType === "planning";
    const isCompleted = state.journeyType === "completed";
    const isPnp = state.pathway === PNP_PATHWAY;
    const isPermit = MaplePathContext.isPermit(state.pathway);
    const selectedProvince = settlementProvinceInput.value;
    replaceOptions(settlementProvinceInput, settlementProvinces(), "Select an option", selectedProvince);

    document.getElementById("details-heading").textContent = isPlanning
        ? "Tell us what you’re planning"
        : isCompleted
            ? "Tell us about your completed journey"
            : "Tell us where your application stands";
    document.getElementById("details-help").textContent = isPlanning
        ? "These basics help MaplePath show relevant options without asking for information we do not use yet."
        : isCompleted
            ? "Dates are optional. Leave anything you don’t remember blank and add it later."
            : "Dates are optional. You can finish setup without guessing.";
    document.getElementById("location-label").textContent = isCompleted
        ? "Where were you living when you applied?"
        : "Where are you currently living?";
    document.getElementById("settlement-province-label").textContent = isCompleted
        ? "Which province or territory did you settle in?"
        : isPlanning
            ? "Which province or territory are you interested in?"
            : "Where do you plan to settle?";

    setRequired("application-status-group", applicationStatusInput, state.journeyType === "pathway");
    setRequired("current-stage-group", currentStageInput, state.journeyType === "pathway");
    setRequired("pathway-start-group", pathwayStartDateInput, !isPlanning);
    setRequired("pr-date-group", permanentResidenceDateInput, isCompleted && !isPermit);
    setRequired("permit-date-group", permitApprovalDateInput, isCompleted && isPermit);
    replaceOptions(currentStageInput, MaplePathContext.stages(state.options, state.pathway), "Select your current stage", currentStageInput.value);
    if (isPermit) {
        document.getElementById("settlement-province-label").textContent = state.pathway === "Study Permit"
            ? "Where will you study?" : "Where will you work?";
        document.getElementById("details-heading").textContent = isCompleted ? "Tell us about your permit approval" : "Tell us about your permit application";
    }

    const provinceGroup = document.getElementById("settlement-province-group");
    provinceGroup.classList.toggle("hidden", isPnp && !isPlanning);
    settlementProvinceInput.required = !isPnp && !isPlanning;
    if (isPnp) settlementProvinceInput.value = state.province;

    updateLocationQuestions();
    showStep("details", "Final details", totalSteps(), totalSteps());
    locationInput.focus();
}

function updateLocationQuestions() {
    const insideCanada = locationInput.value === "Inside Canada";
    const completedPR = state.journeyType === "completed" && !MaplePathContext.isPermit(state.pathway);
    const showStatus = insideCanada && !completedPR;
    document.getElementById("location-label").textContent = completedPR ? "Where were you living when you applied?" : "Where are you currently living?";
    document.getElementById("canada-status-group").classList.toggle("hidden", !showStatus);
    currentStatusInput.required = showStatus;
    if (!showStatus) currentStatusInput.value = completedPR ? "Permanent resident" : "";

    const showArrival = insideCanada || state.journeyType === "completed";
    document.getElementById("arrival-date-group").classList.toggle("hidden", !showArrival);
    if (!showArrival) canadaArrivalDateInput.value = "";
}

function openStreamStep(streams) {
    const isPnp = state.pathway === PNP_PATHWAY;
    replaceOptions(streamInput, streams, "Select your stream", state.stream);
    document.getElementById("stream-eyebrow").textContent = isPnp ? state.province : state.pathway;
    document.getElementById("stream-help").textContent = isPnp
        ? `Showing MaplePath roadmaps available for ${state.province}.`
        : MaplePathContext.isPermit(state.pathway)
            ? "Choose the permit guide that matches your application. Each category has its own eligibility rules."
            : "Choose the federal program that matches your profile.";
    document.getElementById("stream-heading").textContent = MaplePathContext.isPermit(state.pathway) ? "Which permit are you applying for?" : "Which stream are you using?";
    showStep("stream", "Program stream", isPnp ? 4 : 3, totalSteps());
    streamInput.focus();
}

document.querySelectorAll("[data-journey-type]").forEach(button => {
    button.addEventListener("click", () => {
        state.journeyType = button.dataset.journeyType;
        state.pathway = "";
        state.province = "";
        state.stream = "";
        formMessage.textContent = "";

        if (state.journeyType === "planning") {
            configureDetails();
            return;
        }

        pathwayInput.value = "";
        showStep("pathway", "Immigration pathway", 2, 3);
        pathwayInput.focus();
    });
});

pathwayInput.addEventListener("change", () => {
    state.pathway = pathwayInput.value;
    state.province = "";
    state.stream = "";
    if (!state.pathway) return;

    if (state.pathway === PNP_PATHWAY) {
        pnpProvinceInput.value = "";
        showStep("province", "Province or territory", 3, 5);
        pnpProvinceInput.focus();
        return;
    }

    if (pathwayHasStreams(state.pathway)) {
        openStreamStep(state.options.streams[state.pathway]);
        return;
    }

    configureDetails();
});

pnpProvinceInput.addEventListener("change", () => {
    state.province = pnpProvinceInput.value;
    state.stream = "";
    if (!state.province) return;
    openStreamStep(streamsForProvince(state.province));
});

streamInput.addEventListener("change", () => {
    state.stream = streamInput.value;
    if (!state.stream) return;
    const mappedProvince = state.options.streamProvinces?.[state.stream];
    if (mappedProvince) state.province = mappedProvince;
    configureDetails();
});

locationInput.addEventListener("change", updateLocationQuestions);

document.querySelector('[data-back="situation"]').addEventListener("click", () => showStep("situation", "Your situation", 1, 4));
document.querySelector('[data-back="pathway"]').addEventListener("click", () => showStep("pathway", "Immigration pathway", 2, totalSteps()));
document.getElementById("stream-back").addEventListener("click", () => {
    if (state.pathway === PNP_PATHWAY) {
        showStep("province", "Province or territory", 3, 5);
        return;
    }
    showStep("pathway", "Immigration pathway", 2, totalSteps());
});
document.getElementById("details-back").addEventListener("click", () => {
    if (state.journeyType === "planning") {
        showStep("situation", "Your situation", 1, 4);
    } else if (pathwayHasStreams(state.pathway)) {
        openStreamStep(state.pathway === PNP_PATHWAY ? streamsForProvince(state.province) : state.options.streams[state.pathway]);
    } else {
        showStep("pathway", "Immigration pathway", 2, totalSteps());
    }
});

function validateDates() {
    const today = new Date().toISOString().slice(0, 10);
    const dateInputs = [pathwayStartDateInput, canadaArrivalDateInput, permanentResidenceDateInput, permitApprovalDateInput];
    if (dateInputs.some(input => input.value && input.value > today)) {
        return "Dates cannot be in the future.";
    }
    if (permanentResidenceDateInput.value && pathwayStartDateInput.value && permanentResidenceDateInput.value < pathwayStartDateInput.value) {
        return "The permanent residence date must be after the date you started this pathway.";
    }
    if (permitApprovalDateInput.value && pathwayStartDateInput.value && permitApprovalDateInput.value < pathwayStartDateInput.value) {
        return "The permit approval date cannot be before the pathway start date.";
    }
    return "";
}

function profilePayload() {
    const isPlanning = state.journeyType === "planning";
    const isCompleted = state.journeyType === "completed";
    const province = state.pathway === PNP_PATHWAY ? state.province : settlementProvinceInput.value;
    const isPermit = MaplePathContext.isPermit(state.pathway);
    const outcome = MaplePathContext.completion(state.pathway);
    return {
        journeyType: state.journeyType,
        pathway: isPlanning ? "" : state.pathway,
        stream: isPlanning ? "" : state.stream,
        province: province || settlementProvinceInput.value,
        location: locationInput.value,
        currentStatus: isCompleted && !isPermit ? "Permanent resident" : currentStatusInput.value,
        status: isPlanning ? "Planning" : isCompleted ? outcome.label : applicationStatusInput.value,
        currentStage: isPlanning ? "Researching" : isCompleted ? outcome.stage : currentStageInput.value,
        journeyStartDate: isPlanning ? null : pathwayStartDateInput.value || null,
        canadaArrivalDate: canadaArrivalDateInput.value || null,
        permanentResidenceDate: isCompleted && !isPermit ? permanentResidenceDateInput.value || null : null,
        permitApprovalDate: isCompleted && isPermit ? permitApprovalDateInput.value || null : null
    };
}

steps.details.addEventListener("submit", async event => {
    event.preventDefault();
    formMessage.textContent = "";
    const dateError = validateDates();
    if (dateError) {
        formMessage.textContent = dateError;
        return;
    }

    const username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "auth.html";
        return;
    }

    saveButton.disabled = true;
    saveButton.querySelector("span").textContent = "Saving…";
    try {
        const response = await fetch(`/api/profile/onboarding/${encodeURIComponent(username)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profilePayload())
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to save your profile.");
        localStorage.setItem("journeyType", state.journeyType);
        window.location.href = "dashboard.html";
    } catch (error) {
        formMessage.textContent = error.message;
        saveButton.disabled = false;
        saveButton.querySelector("span").textContent = "Finish setup";
    }
});

async function startOnboarding() {
    const session = await window.MaplePathSession.require();
    if (!session) return;

    try {
        const response = await fetch("/api/options");
        if (!response.ok) throw new Error("Unable to load immigration options.");
        state.options = await response.json();

        replaceOptions(pathwayInput, state.options.pathways || [], "Select your pathway");
        replaceOptions(pnpProvinceInput, pnpProvinces(), "Select a province or territory");
        replaceOptions(locationInput, state.options.locations || [], "Select your location");
        replaceOptions(settlementProvinceInput, settlementProvinces(), "Select an option");
        replaceOptions(currentStatusInput, state.options.canadaStatuses || ["Study Permit", "Work Permit", "Visitor", "Maintained status", "Other"], "Select your status");
        replaceOptions(applicationStatusInput, state.options.applicationStatuses || ["Preparing application", "Submitted application", "Waiting for decision"], "Select your application status");
        replaceOptions(currentStageInput, state.options.stages || [], "Select your current stage");

        const today = new Date().toISOString().slice(0, 10);
        [pathwayStartDateInput, canadaArrivalDateInput, permanentResidenceDateInput, permitApprovalDateInput].forEach(input => input.max = today);
    } catch (error) {
        formMessage.textContent = error.message;
    }
}

startOnboarding();
