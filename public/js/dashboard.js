// ==============================
// Current Profile State
// ==============================

let currentProfile = {};


// ==============================
// DOM Elements
// ==============================

const editButton = document.getElementById("edit-profile-btn");
const editForm = document.getElementById("edit-form");

const saveButton = document.getElementById("save-profile-btn");

const statusInput = document.getElementById("edit-status");
const provinceInput = document.getElementById("edit-province");
const stageInput = document.getElementById("edit-stage");
const locationInput = document.getElementById("edit-location");

const profileMessage = document.getElementById("profile-message");

const taskList = document.getElementById("task-list");

const newTaskInput = document.getElementById("new-task");
const addTaskButton = document.getElementById("add-task-btn");

const logoutButton = document.getElementById("logout-btn");


// ==============================
// Logout
// ==============================

logoutButton.addEventListener("click", () => {

    localStorage.removeItem("username");

    window.location.href = "auth.html";

});


// ==============================
// Add Task
// ==============================

addTaskButton.addEventListener("click", async () => {

    const title = newTaskInput.value.trim();

    if (!title) {

        alert("Please enter a task.");

        return;

    }

    try {

        const response = await fetch("/api/tasks", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                title: title

            })

        });

        if (response.ok) {

            newTaskInput.value = "";

            await loadTasks();

        }

        else {

            alert("Failed to add task.");

        }

    }

    catch(error) {

        console.error(error);

        alert("Server error.");

    }

});


// ==============================
// Load Profile
// ==============================

async function loadProfile() {

    try {

        const username = localStorage.getItem("username");

        if (!username) {

            window.location.href = "auth.html";

            return;

        }

        const response = await fetch(
            `/api/profile/${username}`
        );

        const profile = await response.json();

        currentProfile = profile;

        document.getElementById("welcome-title").textContent =
            `Welcome Back, ${username}!`;

        renderProfile(profile);

        loadRecommendation(profile);

    }

    catch(error) {

        console.error(error);

    }

}


// ==============================
// Render Profile Card
// ==============================

function renderProfile(profile) {

    const profileList =
        document.getElementById("profile-list");

    profileList.innerHTML = "";

    let fields = [];

    if (profile.journeyType === "planning") {

        fields = [

            {

                label: "Journey Type",
                value: "🌱 Still Exploring"

            },

            {

                label: "Country",
                value: profile.country || "Not set"

            },

            {

                label: "Current Status",
                value: profile.currentStatus || "Not set"

            },

            {

                label: "Education",
                value: profile.education || "Not set"

            }

        ];

    }

    else {

        fields = [

            {

                label: "Journey Type",
                value: "🍁 Following a Pathway"

            },

            {

                label: "Immigration Pathway",
                value: profile.pathway || "Not set"

            },

            {

                label: "Province",
                value: profile.province || "Not set"

            },

            {

                label: "Status",
                value: profile.status || "Not set"

            },

            {

                label: "Current Stage",
                value: profile.currentStage || "Not set"

            },

            {

                label: "Location",
                value: profile.location || "Not set"

            }

        ];

    }

    fields.forEach(field => {

        const li = document.createElement("li");

        li.innerHTML = `
            <strong>${field.label}:</strong>
            <span>${field.value}</span>
        `;

        profileList.appendChild(li);

    });

}


// ==============================
// Recommendation System
// ==============================

function loadRecommendation(profile) {

    const title =
        document.getElementById("next-step-title");

    const description =
        document.getElementById("next-step-description");

    if (!title || !description) {

        return;

    }

    if (profile.journeyType === "planning") {

        title.textContent =
            "Complete your eligibility profile";

        description.textContent =
            "Add more information like work experience and language tests to receive personalized pathway recommendations.";

        return;

    }

    if (

        profile.pathway === "Express Entry"

        &&

        profile.currentStage === "Researching"

    ) {

        title.textContent =
            "📄 Complete IELTS Test";

        description.textContent =
            "Language results are one of the first steps for Express Entry applicants.";

    }

    else {

        title.textContent =
            "Continue your immigration journey";

        description.textContent =
            "Complete more steps to receive personalized recommendations.";

    }

}


// ==============================
// Load Tasks
// ==============================

async function loadTasks() {

    try {

        const response = await fetch("/api/tasks");

        const tasks = await response.json();

        taskList.innerHTML = "";

        tasks.forEach(task => {

            const li = document.createElement("li");

            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.marginBottom = "12px";

            const left = document.createElement("div");

            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";

            checkbox.checked = task.completed;

            checkbox.addEventListener("change", async () => {

                await fetch(`/api/tasks/${task.id}`, {

                    method: "PUT",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        completed: checkbox.checked

                    })

                });

                loadTasks();

            });

            left.appendChild(checkbox);

            left.append(" " + task.title);

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "🗑️";

            deleteButton.style.border = "none";

            deleteButton.style.background = "transparent";

            deleteButton.style.cursor = "pointer";

            deleteButton.style.fontSize = "18px";

            deleteButton.addEventListener("click", async () => {

                const response = await fetch(

                    `/api/tasks/${task.id}`,

                    {

                        method: "DELETE"

                    }

                );

                if (response.ok) {

                    loadTasks();

                }

            });

            li.appendChild(left);

            li.appendChild(deleteButton);

            taskList.appendChild(li);

        });

    }

    catch(error) {

        console.error(error);

    }

}


// ==============================
// Edit Profile
// ==============================

editButton.addEventListener("click", () => {

    editForm.classList.toggle("hidden");

    statusInput.value =
        currentProfile.status || "";

    provinceInput.value =
        currentProfile.province || "";

    stageInput.value =
        currentProfile.currentStage || "";

    locationInput.value =
        currentProfile.location || "";

});


// ==============================
// Save Profile
// ==============================

saveButton.addEventListener("click", async () => {

    const username =
        localStorage.getItem("username");

    const updatedProfile = {

        status: statusInput.value,

        province: provinceInput.value,

        currentStage: stageInput.value,

        location: locationInput.value

    };

    try {

        const response = await fetch(

            `/api/profile/${username}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(updatedProfile)

            }

        );

        if(response.ok){

            profileMessage.textContent =
                "✅ Profile updated successfully!";

            await loadProfile();

            editForm.classList.add("hidden");

        }

        else {

            profileMessage.textContent =
                "❌ Failed to update profile.";

        }

    }

    catch(error) {

        console.error(error);

        profileMessage.textContent =
            "❌ Server error.";

    }

});


// ==============================
// Initialize Dashboard
// ==============================

loadProfile();

loadTasks();