// ==============================
// Current Profile State
// ==============================

let currentProfile = {};


// ==============================
// DOM Elements
// ==============================

const profileSnapshot =
    document.getElementById("profile-snapshot");


const viewProfileButton =
    document.getElementById("view-profile-btn");

const taskList = document.getElementById("task-list");

const newTaskInput = document.getElementById("new-task");
const addTaskButton = document.getElementById("add-task-btn");

const logoutButton = document.getElementById("logout-btn");

function escapeProfileText(value){
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[character]);
}


// ==============================
// Logout
// ==============================

logoutButton.addEventListener("click", async () => {
    try{
        await window.MaplePathSession.logout();
    } catch(error){
        alert(error.message);
    }
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
            `/api/profile/${encodeURIComponent(username)}`
        );

        const profile = await response.json();

        currentProfile = profile;

        document.getElementById("welcome-title").textContent =
            `Welcome Back, ${username}!`;

        loadProfileSnapshot(profile);

        document.getElementById("welcome-title").textContent =
            `Welcome Back, ${username}!`;

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

        const label = document.createElement("strong");
        label.textContent = `${field.label}:`;
        const value = document.createElement("span");
        value.textContent = field.value;
        li.append(label, value);

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
            li.className = "task-list-item";

            const left = document.createElement("div");
            left.className = "task-list-main";

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
            deleteButton.className = "task-delete-btn";
            deleteButton.type = "button";
            deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

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
// Profile Snapshot
// ==============================


function loadProfileSnapshot(profile){


    if(!profileSnapshot){

        return;

    }



    if(profile.journeyType==="planning"){


        profileSnapshot.innerHTML = `


        <p>
            🌱 Still Exploring
        </p>


        <p>
            Build your eligibility profile
            to discover possible pathways.
        </p>


        `;


    }


    else {


        profileSnapshot.innerHTML = `


        <p>
            🍁 ${escapeProfileText(profile.pathway)}
        </p>


        <p>
            Stage:
            ${escapeProfileText(profile.currentStage || "Not set")}
        </p>


        <p>
            Province:
            ${escapeProfileText(profile.province || "Not set")}
        </p>


        `;


    }


}

viewProfileButton.addEventListener(
"click",
()=>{

    window.location.href =
    "profile.html";

});

// ==============================
// Initialize Dashboard
// ==============================

async function initializeDashboard(){
    const session = await window.MaplePathSession.require();
    if(!session) return;
    await Promise.all([loadProfile(), loadTasks()]);
}

initializeDashboard();
