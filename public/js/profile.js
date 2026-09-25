const PNP_PATHWAY = "Provincial Nominee Program";
let currentProfile = {};
let options = { pathways: [], streams: {}, streamProvinces: {}, provinces: [], locations: [], stages: [] };

const profileContent = document.getElementById("profile-content");
const title = document.getElementById("journey-title");
const subtitle = document.getElementById("journey-subtitle");
const badge = document.getElementById("journey-badge");
const editSection = document.getElementById("edit-section");
const profileForm = document.getElementById("profile-form");
const message = document.getElementById("message");

const inputs = {
    journeyType: document.getElementById("edit-journey-type"),
    pathway: document.getElementById("edit-pathway"),
    pnpProvince: document.getElementById("edit-pnp-province"),
    stream: document.getElementById("edit-stream"),
    location: document.getElementById("edit-location"),
    currentStatus: document.getElementById("edit-current-status"),
    province: document.getElementById("edit-province"),
    status: document.getElementById("edit-status"),
    stage: document.getElementById("edit-stage"),
    pathwayStart: document.getElementById("edit-pathway-start"),
    arrivalDate: document.getElementById("edit-arrival-date"),
    prDate: document.getElementById("edit-pr-date")
};

function journeyLabel(type) {
    if (type === "completed") return "Permanent residence received";
    if (type === "pathway") return "Application in progress";
    return "Planning my journey";
}

function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function dateInputValue(value) {
    return value ? String(value).slice(0, 10) : "";
}

function createOptions(element, values, selected, placeholder = "Select") {
    element.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    element.appendChild(first);
    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === selected;
        element.appendChild(option);
    });
}

function pnpProvinces() {
    return [...new Set(Object.values(options.streamProvinces || {}))].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function streamsForProvince(province) {
    return (options.streams[PNP_PATHWAY] || []).filter(stream => options.streamProvinces?.[stream] === province);
}

function addInfo(grid, labelText, valueText) {
    const box = document.createElement("div");
    box.className = "info-box";
    const label = document.createElement("strong");
    label.textContent = labelText;
    const value = document.createElement("p");
    value.textContent = valueText || "Not set";
    box.append(label, value);
    grid.appendChild(box);
}

function renderProfile(profile) {
    const type = profile.journeyType || "planning";
    const isPlanning = type === "planning";
    const isCompleted = type === "completed";

    title.textContent = isPlanning ? "🧭 Planning my journey" : isCompleted ? "🍁 Journey completed" : "📝 Application in progress";
    subtitle.textContent = isPlanning
        ? "Your immigration planning profile"
        : isCompleted
            ? "Your completed Canadian immigration journey"
            : "Your personalized immigration roadmap";
    badge.textContent = isPlanning ? "Planning" : isCompleted ? "Permanent resident" : (profile.pathway || "In progress");

    const grid = document.createElement("div");
    grid.className = "profile-info";
    addInfo(grid, "Journey status", journeyLabel(type));

    if (isPlanning) {
        addInfo(grid, "Current location", profile.location || profile.country);
        addInfo(grid, "Status in Canada", profile.currentStatus);
        addInfo(grid, "Province of interest", profile.province || "Not decided");
        if (profile.canadaArrivalDate) addInfo(grid, "First arrived in Canada", formatDate(profile.canadaArrivalDate));
    } else {
        addInfo(grid, "Pathway", profile.pathway);
        addInfo(grid, "Stream", profile.stream);
        addInfo(grid, "Province or territory", profile.province);
        addInfo(grid, isCompleted ? "Location when applying" : "Current location", profile.location);
        addInfo(grid, "Application status", profile.status);
        addInfo(grid, isCompleted ? "Final stage" : "Current stage", profile.currentStage);
        addInfo(grid, "Started working toward pathway", formatDate(profile.journeyStartDate));
        if (profile.canadaArrivalDate) addInfo(grid, "First arrived in Canada", formatDate(profile.canadaArrivalDate));
        if (isCompleted) addInfo(grid, "Became a permanent resident", formatDate(profile.permanentResidenceDate));
    }

    profileContent.replaceChildren(grid);
}

function toggleGroup(id, visible, requiredInput) {
    document.getElementById(id).classList.toggle("hidden", !visible);
    if (requiredInput) requiredInput.required = visible;
}

function refreshStreamFields(selectedStream = "") {
    const pathway = inputs.pathway.value;
    const isPnp = pathway === PNP_PATHWAY;
    toggleGroup("pnp-province-group", isPnp, inputs.pnpProvince);

    let streams = [];
    if (isPnp) streams = streamsForProvince(inputs.pnpProvince.value);
    else streams = options.streams[pathway] || [];

    toggleGroup("stream-group", streams.length > 0, inputs.stream);
    createOptions(inputs.stream, streams, selectedStream, "Select a stream");

    const pnpWithProvince = isPnp && inputs.pnpProvince.value;
    document.getElementById("settlement-province-group").classList.toggle("hidden", Boolean(pnpWithProvince));
    inputs.province.required = !pnpWithProvince && inputs.journeyType.value !== "planning";
    if (pnpWithProvince) inputs.province.value = inputs.pnpProvince.value;
}

function refreshConditionalFields() {
    const type = inputs.journeyType.value;
    const planning = type === "planning";
    const completed = type === "completed";
    document.getElementById("pathway-fields").classList.toggle("hidden", planning);
    inputs.pathway.required = !planning;
    toggleGroup("application-status-group", type === "pathway", inputs.status);
    toggleGroup("stage-group", type === "pathway", inputs.stage);
    toggleGroup("pathway-start-group", !planning, inputs.pathwayStart);
    toggleGroup("pr-date-group", completed, inputs.prDate);

    document.getElementById("edit-location-label").textContent = completed ? "Where were you living when you applied?" : "Where are you currently living?";
    document.getElementById("edit-province-label").textContent = completed
        ? "Province or territory where you settled"
        : planning ? "Province or territory of interest" : "Where do you plan to settle?";

    const insideCanada = inputs.location.value === "Inside Canada";
    toggleGroup("canada-status-group", insideCanada && !completed, inputs.currentStatus);
    toggleGroup("arrival-group", insideCanada || completed);
    if (completed) inputs.currentStatus.value = "Permanent resident";
    if (!planning) refreshStreamFields(inputs.stream.value);
    else {
        document.getElementById("settlement-province-group").classList.remove("hidden");
        inputs.province.required = false;
    }
}

function setupEditForm() {
    inputs.journeyType.value = currentProfile.journeyType || "planning";
    createOptions(inputs.pathway, options.pathways || [], currentProfile.pathway, "Select a pathway");
    createOptions(inputs.pnpProvince, pnpProvinces(), currentProfile.province, "Select a province or territory");
    createOptions(inputs.location, options.locations || [], currentProfile.location, "Select a location");
    createOptions(inputs.currentStatus, options.canadaStatuses || [], currentProfile.currentStatus, "Select your status");
    createOptions(inputs.province, options.provinces || [], currentProfile.province, "Select an option");
    createOptions(inputs.status, options.applicationStatuses || [], currentProfile.status, "Select an application status");
    createOptions(inputs.stage, options.stages || [], currentProfile.currentStage, "Select a stage");
    inputs.pathwayStart.value = dateInputValue(currentProfile.journeyStartDate);
    inputs.arrivalDate.value = dateInputValue(currentProfile.canadaArrivalDate);
    inputs.prDate.value = dateInputValue(currentProfile.permanentResidenceDate);
    refreshStreamFields(currentProfile.stream || "");
    refreshConditionalFields();
}

inputs.journeyType.addEventListener("change", refreshConditionalFields);
inputs.location.addEventListener("change", refreshConditionalFields);
inputs.pathway.addEventListener("change", () => {
    inputs.pnpProvince.value = "";
    refreshStreamFields();
});
inputs.pnpProvince.addEventListener("change", () => refreshStreamFields());
inputs.stream.addEventListener("change", () => {
    const province = options.streamProvinces?.[inputs.stream.value];
    if (province) {
        inputs.pnpProvince.value = province;
        inputs.province.value = province;
    }
});

document.getElementById("edit-profile-btn").addEventListener("click", () => {
    setupEditForm();
    message.textContent = "";
    editSection.classList.remove("hidden");
    editSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("cancel-btn").addEventListener("click", () => {
    editSection.classList.add("hidden");
    message.textContent = "";
});

function buildPayload() {
    const type = inputs.journeyType.value;
    const planning = type === "planning";
    const completed = type === "completed";
    const pnp = inputs.pathway.value === PNP_PATHWAY;
    return {
        journeyType: type,
        pathway: planning ? "" : inputs.pathway.value,
        stream: planning ? "" : inputs.stream.value,
        province: pnp && !planning ? inputs.pnpProvince.value : inputs.province.value,
        location: inputs.location.value,
        currentStatus: completed ? "Permanent resident" : inputs.currentStatus.value,
        status: planning ? "Planning" : completed ? "Permanent resident" : inputs.status.value,
        currentStage: planning ? "Researching" : completed ? "Landed as PR" : inputs.stage.value,
        journeyStartDate: planning ? null : inputs.pathwayStart.value || null,
        canadaArrivalDate: inputs.arrivalDate.value || null,
        permanentResidenceDate: completed ? inputs.prDate.value || null : null
    };
}

profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";
    const payload = buildPayload();
    const today = new Date().toISOString().slice(0, 10);
    const dates = [payload.journeyStartDate, payload.canadaArrivalDate, payload.permanentResidenceDate].filter(Boolean);
    if (dates.some(date => date > today)) {
        message.textContent = "Dates cannot be in the future.";
        return;
    }
    if (payload.permanentResidenceDate && payload.journeyStartDate && payload.permanentResidenceDate < payload.journeyStartDate) {
        message.textContent = "The permanent residence date must be after the pathway start date.";
        return;
    }

    const username = localStorage.getItem("username");
    const saveButton = document.getElementById("save-btn");
    saveButton.disabled = true;
    try {
        const response = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to save your profile.");
        currentProfile = data.profile;
        localStorage.setItem("journeyType", currentProfile.journeyType);
        renderProfile(currentProfile);
        message.textContent = "Saved successfully.";
        setTimeout(() => editSection.classList.add("hidden"), 700);
    } catch (error) {
        message.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});

async function startProfile() {
    const session = await window.MaplePathSession.require();
    if (!session) return;
    const username = localStorage.getItem("username");
    try {
        const [optionsResponse, profileResponse] = await Promise.all([
            fetch("/api/options"),
            fetch(`/api/profile/${encodeURIComponent(username)}`)
        ]);
        if (!optionsResponse.ok || !profileResponse.ok) throw new Error("Unable to load your profile.");
        options = await optionsResponse.json();
        currentProfile = await profileResponse.json();
        const today = new Date().toISOString().slice(0, 10);
        [inputs.pathwayStart, inputs.arrivalDate, inputs.prDate].forEach(input => input.max = today);
        renderProfile(currentProfile);
    } catch (error) {
        profileContent.textContent = error.message;
    }
}

startProfile();
