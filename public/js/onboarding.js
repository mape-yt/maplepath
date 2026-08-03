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
// Exploring Form
// ======================================

exploringForm.addEventListener("submit", (event) => {

    event.preventDefault();

    alert(
        "Exploring onboarding will be connected to MongoDB in the next step."
    );

});

// ======================================
// Journey Form
// ======================================

journeyForm.addEventListener("submit", (event) => {

    event.preventDefault();

    alert(
        "Journey onboarding will be connected back to MongoDB in the next step."
    );

});