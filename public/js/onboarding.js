// ================================
// MaplePath Onboarding
// ================================

const form = document.getElementById("onboardingForm");

const planningCard = document.getElementById("planningCard");
const pathwayCard = document.getElementById("pathwayCard");

let userJourneyType = "";


// ================================
// Card Selection
// ================================

planningCard.addEventListener("click", () => {

    planningCard.classList.add("active");
    pathwayCard.classList.remove("active");

    userJourneyType = "planning";

    form.classList.remove("hidden");
    form.classList.add("show");

});

pathwayCard.addEventListener("click", () => {

    pathwayCard.classList.add("active");
    planningCard.classList.remove("active");

    userJourneyType = "pathway";

    form.classList.remove("hidden");
    form.classList.add("show");

});


// ================================
// Form Submission
// ================================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username = localStorage.getItem("username");

    if (!username) {

        alert("User session not found. Please login again.");

        window.location.href = "auth.html";

        return;

    }

    const profileData = {

        journeyType: userJourneyType,

        pathway: document.getElementById("pathway").value,

        province: document.getElementById("province").value,

        location: document.getElementById("location").value,

        status: document.getElementById("status").value,

        currentStage: document.getElementById("currentStage").value,

        journeyStartDate:
            document.getElementById("journeyStartDate").value

    };

    try {

        const response = await fetch(

            `/api/profile/${username}`,

            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(profileData)

            }

        );

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

});