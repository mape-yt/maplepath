// ======================================
// MaplePath Onboarding
// ======================================

const planningCard = document.getElementById("planningCard");
const pathwayCard = document.getElementById("pathwayCard");

const exploringForm = document.getElementById("exploringForm");
const journeyForm = document.getElementById("journeyForm");

let userJourneyType = "";

// ======================================
// Card Selection
// ======================================

planningCard.addEventListener("click", () => {

    userJourneyType = "planning";

    planningCard.classList.add("active");
    pathwayCard.classList.remove("active");

    exploringForm.classList.remove("hidden");
    exploringForm.classList.add("show");

    journeyForm.classList.add("hidden");
    journeyForm.classList.remove("show");

});

pathwayCard.addEventListener("click", () => {

    userJourneyType = "pathway";

    pathwayCard.classList.add("active");
    planningCard.classList.remove("active");

    journeyForm.classList.remove("hidden");
    journeyForm.classList.add("show");

    exploringForm.classList.add("hidden");
    exploringForm.classList.remove("show");

});

// ======================================
// Save Profile Helper
// ======================================

async function saveProfile(profileData) {

    const username = localStorage.getItem("username");

    if (!username) {

        alert("User session not found. Please login again.");

        window.location.href = "auth.html";

        return;

    }

    try {

        const response = await fetch(`/api/profile/onboarding/${username}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(profileData)

        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem(
                "journeyType",
                userJourneyType
            );

            alert("Profile completed successfully!");

            window.location.href = "dashboard.html";

        }

        else {

            alert(data.message);

        }

    }

    catch (error) {

        console.error(error);

        alert("Unable to connect to server.");

    }

}

// ======================================
// Exploring Form
// ======================================

exploringForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const profileData = {

        journeyType: "planning",

        country: document.getElementById("country").value,

        currentStatus: document.getElementById("currentStatus").value,

        education: document.getElementById("education").value

    };

    await saveProfile(profileData);

});

// ======================================
// Journey Form
// ======================================

journeyForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const profileData = {

        journeyType: "pathway",

        pathway: document.getElementById("pathway").value,

        province: document.getElementById("province").value,

        location: document.getElementById("location").value,

        status: document.getElementById("status").value,

        currentStage: document.getElementById("currentStage").value,

        journeyStartDate:
            document.getElementById("journeyStartDate").value

    };

    await saveProfile(profileData);

});