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
const programInput = document.getElementById("edit-program");
const crsInput = document.getElementById("edit-crs");

const profileMessage = document.getElementById("profile-message");

const taskList = document.getElementById("task-list");

const newTaskInput = document.getElementById("new-task");
const addTaskButton = document.getElementById("add-task-btn");

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

    catch (error) {

        console.error(error);

        alert("Server error.");

    }

});

// ==============================
// Load Profile
// ==============================

async function loadProfile() {

    try {

        const response = await fetch("/api/profile");

        const profile = await response.json();

        currentProfile = profile;

        document.getElementById("welcome-title").textContent =
            `Welcome Back, ${profile.name}!`;

        document.getElementById("profile-name").textContent =
            profile.name;

        document.getElementById("profile-status").textContent =
            profile.status;

        document.getElementById("profile-province").textContent =
            profile.province;

        document.getElementById("profile-program").textContent =
            profile.program;

        document.getElementById("profile-crs").textContent =
            profile.crs;

        document.getElementById("progress-percent").textContent =
            profile.progress + "%";

        document.getElementById("progress-fill").style.width =
            profile.progress + "%";

    }

    catch(error){

        console.error(error);

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

                const response = await fetch(`/api/tasks/${task.id}`, {

                    method: "DELETE"

                });

                if (response.ok) {

                    loadTasks();

                }

            });

            li.appendChild(left);
            li.appendChild(deleteButton);

            taskList.appendChild(li);

        });

    }

    catch(error){

        console.error(error);

    }

}


// ==============================
// Edit Button
// ==============================

editButton.addEventListener("click", () => {

    editForm.classList.toggle("hidden");

    statusInput.value = currentProfile.status;
    provinceInput.value = currentProfile.province;
    programInput.value = currentProfile.program;
    crsInput.value = currentProfile.crs;

});


// ==============================
// Save Profile
// ==============================

saveButton.addEventListener("click", async () => {

    const updatedProfile = {

        status: statusInput.value,
        province: provinceInput.value,
        program: programInput.value,
        crs: crsInput.value

    };

    try {

        const response = await fetch("/api/profile", {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(updatedProfile)

        });

        if(response.ok){

            profileMessage.textContent =
                "✅ Profile updated successfully!";

            await loadProfile();

            editForm.classList.add("hidden");

        }

        else{

            profileMessage.textContent =
                "❌ Failed to update profile.";

        }

    }

    catch(error){

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