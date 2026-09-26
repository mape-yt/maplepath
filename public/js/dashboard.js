const dashboardState = {
    username: "",
    profile: {},
    roadmap: null,
    progress: null,
    timeline: [],
    tasks: []
};

const elements = {
    notice: document.getElementById("dashboard-notice"),
    taskList: document.getElementById("task-list"),
    taskEmpty: document.getElementById("task-empty"),
    taskCount: document.getElementById("task-count"),
    taskInput: document.getElementById("new-task"),
    taskForm: document.getElementById("task-form")
};

function showNotice(message) {
    elements.notice.textContent = message;
    elements.notice.hidden = !message;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Unable to load this information.");
    return data;
}

function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function journeyType() {
    return dashboardState.profile.journeyType || "planning";
}

function stateCopy() {
    const profile = dashboardState.profile;
    if (journeyType() === "completed") {
        return {
            badge: "Permanent residence received",
            title: profile.stream || profile.pathway || "Completed journey",
            action: "Journey",
            actionHref: "journey.html"
        };
    }
    if (journeyType() === "pathway") {
        return {
            badge: "Application in progress",
            title: profile.stream || profile.pathway || "Continue your immigration journey",
            action: "Journey",
            actionHref: "journey.html"
        };
    }
    return {
        badge: "Planning my journey",
        title: "Choose your immigration pathway",
        action: "Choose a pathway",
        actionHref: "profile.html"
    };
}

function profileTimeline() {
    const key = dashboardState.roadmap?.profileKey;
    return key ? dashboardState.timeline.filter(record => record.profileKey === key) : [];
}

function completedStepOrders() {
    return Array.isArray(dashboardState.progress?.completedSteps)
        ? dashboardState.progress.completedSteps
        : [];
}

function nextRoadmapStep() {
    if (!dashboardState.roadmap?.steps?.length) return null;
    const completed = new Set(completedStepOrders());
    return dashboardState.roadmap.steps.find(step => !completed.has(step.order)) || dashboardState.roadmap.steps.at(-1);
}

function missingTimelineStep() {
    if (!dashboardState.roadmap?.steps?.length) return null;
    const recorded = new Set(profileTimeline().filter(record => record.status === "completed").map(record => record.stepOrder));
    return dashboardState.roadmap.steps.find(step => !recorded.has(step.order)) || null;
}

function progressDetails() {
    const total = dashboardState.roadmap?.steps?.length || 0;
    if (!total) return { percent: 0, text: journeyType() === "planning" ? "Not started" : "Roadmap coming soon" };

    if (journeyType() === "completed") {
        const contributed = new Set(profileTimeline().filter(record => record.status === "completed").map(record => record.stepOrder)).size;
        return { percent: Math.round((contributed / total) * 100), text: `${contributed} of ${total} dates shared` };
    }

    const completed = completedStepOrders().length;
    return { percent: Math.round((completed / total) * 100), text: `${completed} of ${total} steps complete` };
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function renderHero() {
    const copy = stateCopy();
    const profile = dashboardState.profile;
    const progress = progressDetails();
    setText("welcome-title", `Welcome back, ${dashboardState.username}!`);
    setText("journey-state-badge", copy.badge);
    setText("journey-hero-title", copy.title);
    setText("hero-progress-value", dashboardState.roadmap ? `${progress.percent}%` : "—");
    setText("hero-progress-label", journeyType() === "completed" ? "Timeline contributed" : "Roadmap progress");

    const primaryAction = document.getElementById("primary-action");
    primaryAction.textContent = copy.action;
    primaryAction.href = copy.actionHref;

}

function renderSummary() {
    const profile = dashboardState.profile;
    const progress = progressDetails();

    if (journeyType() === "planning") {
        setText("stat-one-label", "Pathway");
        setText("stat-one-value", "Not selected yet");
        setText("stat-two-label", "Province of interest");
        setText("stat-two-value", profile.province || "Not decided");
        setText("stat-three-label", "Current location");
        setText("stat-three-value", profile.location || profile.country || "Not set");
        return;
    }

    setText("stat-one-label", "Pathway");
    setText("stat-one-value", profile.pathway || "Not set");
    setText("stat-two-label", "Province or territory");
    setText("stat-two-value", profile.province || "Not set");
    setText("stat-three-label", journeyType() === "completed" ? "Timeline contribution" : "Roadmap progress");
    setText("stat-three-value", progress.text);
}

function renderNextStep() {
    const title = document.getElementById("next-step-title");
    const link = document.getElementById("next-step-link");
    const number = document.getElementById("next-step-number");
    const label = document.getElementById("next-step-label");
    const icon = document.getElementById("next-step-icon");
    const panel = document.querySelector(".next-step-panel");

    if (journeyType() === "planning") {
        title.textContent = "Choose a pathway when you’re ready";
        link.href = "profile.html";
        link.firstChild.textContent = "Open ";
        label.textContent = "Start here";
        icon.textContent = "🧭";
        number.textContent = "01";
        panel.dataset.kind = "planning";
        return;
    }

    if (!dashboardState.roadmap) {
        title.textContent = "Your pathway roadmap is being expanded";
        link.href = "profile.html";
        link.firstChild.textContent = "Open ";
        label.textContent = "Roadmap";
        icon.textContent = "🗺️";
        number.textContent = "—";
        panel.dataset.kind = "pending";
        return;
    }

    const step = journeyType() === "completed" ? missingTimelineStep() : nextRoadmapStep();
    if (!step) {
        title.textContent = journeyType() === "completed" ? "Your timeline is complete" : "Roadmap complete";
        label.textContent = "Complete";
        icon.textContent = "✓";
        number.textContent = "✓";
        panel.dataset.kind = "complete";
    } else {
        title.textContent = journeyType() === "completed" ? `Add dates for: ${step.title}` : step.title;
        label.textContent = journeyType() === "completed"
            ? "Add dates"
            : step.type === "waiting" ? "Waiting" : step.type === "ircc" ? "IRCC step" : "Next step";
        icon.textContent = journeyType() === "completed"
            ? "📅"
            : step.type === "waiting" ? "⏳" : step.type === "ircc" ? "🍁" : "📄";
        number.textContent = String(step.order).padStart(2, "0");
        panel.dataset.kind = journeyType() === "completed" ? "history" : (step.type || "applicant");
    }
    link.href = "journey.html";
    link.firstChild.textContent = "Open ";
}

function addProfileRow(list, label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value || "Not set";
    row.append(term, detail);
    list.appendChild(row);
}

function renderProfileSnapshot() {
    const profile = dashboardState.profile;
    const list = document.getElementById("profile-snapshot");
    list.replaceChildren();
    if (journeyType() === "planning") {
        addProfileRow(list, "Location", profile.location || profile.country);
        addProfileRow(list, "Interest", profile.province || "Not decided");
        return;
    }
    if (journeyType() === "completed") {
        addProfileRow(list, "Pathway", profile.pathway);
        addProfileRow(list, "PR date", formatDate(profile.permanentResidenceDate));
        return;
    }
    addProfileRow(list, "Stage", profile.currentStage);
    addProfileRow(list, "Location", profile.location);
}

function renderEmpty(container, message) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    container.appendChild(empty);
}

function renderActivity() {
    const container = document.getElementById("activity-list");
    container.replaceChildren();
    const records = profileTimeline()
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.startedAt) - new Date(a.updatedAt || a.startedAt))
        .slice(0, 5);

    if (!records.length) {
        renderEmpty(container, journeyType() === "planning"
            ? "Choose a pathway first."
            : "No activity yet.");
        return;
    }

    records.forEach(record => {
        const item = document.createElement("article");
        item.className = `activity-item${record.status === "completed" ? " is-completed" : ""}`;
        const dot = document.createElement("span");
        dot.className = "activity-dot";
        dot.setAttribute("aria-hidden", "true");
        const content = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = record.stepTitle;
        content.appendChild(heading);
        const time = document.createElement("time");
        const date = record.completedAt || record.startedAt;
        time.dateTime = date || "";
        time.textContent = formatDate(date);
        item.append(dot, content, time);
        container.appendChild(item);
    });
}

function renderTasks() {
    elements.taskList.replaceChildren();
    elements.taskEmpty.hidden = dashboardState.tasks.length > 0;
    const openCount = dashboardState.tasks.filter(task => !task.completed).length;
    elements.taskCount.textContent = `${openCount} open`;

    dashboardState.tasks.forEach(task => {
        const item = document.createElement("li");
        item.className = `task-list-item${task.completed ? " is-completed" : ""}`;
        const label = document.createElement("label");
        label.className = "task-list-main";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.completed);
        checkbox.addEventListener("change", () => updateTask(task.id, checkbox.checked));
        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;
        label.append(checkbox, title);
        const remove = document.createElement("button");
        remove.className = "task-delete-btn";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${task.title}`);
        remove.addEventListener("click", () => deleteTask(task.id));
        item.append(label, remove);
        elements.taskList.appendChild(item);
    });
}

async function loadTasks() {
    dashboardState.tasks = await fetchJson("/api/tasks");
    renderTasks();
}

async function updateTask(id, completed) {
    try {
        await fetchJson(`/api/tasks/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed })
        });
        await loadTasks();
    } catch (error) {
        showNotice(error.message);
        await loadTasks();
    }
}

async function deleteTask(id) {
    try {
        await fetchJson(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadTasks();
    } catch (error) {
        showNotice(error.message);
    }
}

elements.taskForm.addEventListener("submit", async event => {
    event.preventDefault();
    const title = elements.taskInput.value.trim();
    if (!title) return;
    const button = document.getElementById("add-task-btn");
    button.disabled = true;
    try {
        await fetchJson("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title })
        });
        elements.taskInput.value = "";
        showNotice("");
        await loadTasks();
    } catch (error) {
        showNotice(error.message);
    } finally {
        button.disabled = false;
    }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        await window.MaplePathSession.logout();
    } catch (error) {
        showNotice(error.message);
    }
});

async function loadRoadmapData() {
    const profile = dashboardState.profile;
    if (!profile.pathway || !profile.stream) return;
    const pathway = encodeURIComponent(profile.pathway);
    const stream = encodeURIComponent(profile.stream);
    const results = await Promise.allSettled([
        fetchJson(`/api/journey/${pathway}/${stream}`),
        fetchJson(`/api/journey/progress/${encodeURIComponent(dashboardState.username)}`),
        fetchJson(`/api/timeline/${encodeURIComponent(dashboardState.username)}`)
    ]);
    if (results[0].status === "fulfilled") dashboardState.roadmap = results[0].value;
    if (results[1].status === "fulfilled") dashboardState.progress = results[1].value;
    if (results[2].status === "fulfilled") dashboardState.timeline = results[2].value;
}

function renderDashboard() {
    renderHero();
    renderSummary();
    renderNextStep();
    renderProfileSnapshot();
    renderActivity();
}

async function initializeDashboard() {
    const session = await window.MaplePathSession.require();
    if (!session) return;
    dashboardState.username = localStorage.getItem("username") || session.username;
    try {
        const [profile, tasks] = await Promise.all([
            fetchJson(`/api/profile/${encodeURIComponent(dashboardState.username)}`),
            fetchJson("/api/tasks")
        ]);
        dashboardState.profile = profile || {};
        dashboardState.tasks = tasks;
        await loadRoadmapData();
        renderDashboard();
        renderTasks();
    } catch (error) {
        showNotice(error.message);
    }
}

initializeDashboard();
