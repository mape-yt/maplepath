async function loadProfile() {

    try {

        const response = await fetch("/api/profile");

        const profile = await response.json();

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

    catch (error) {

        console.error(error);

    }

}

const editButton = document.getElementById("edit-profile-btn");

const editForm = document.getElementById("edit-form");

const saveButton = document.getElementById("save-profile-btn");

const statusInput = document.getElementById("edit-status");
const provinceInput = document.getElementById("edit-province");
const programInput = document.getElementById("edit-program");
const crsInput = document.getElementById("edit-crs");

editButton.addEventListener("click", () => {

    editForm.classList.toggle("hidden");

});

saveButton.addEventListener("click", async () => {

    const updatedProfile = {

        status: statusInput.value,
        province: provinceInput.value,
        program: programInput.value,
        crs: crsInput.value

    };

    const response = await fetch("/api/profile", {

        method: "PUT",

        headers: {

            "Content-Type": "application/json"

        },

        body: JSON.stringify(updatedProfile)

    });

    if(response.ok){

        loadProfile();

        editForm.classList.add("hidden");

    }

});

loadProfile();