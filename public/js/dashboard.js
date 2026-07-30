let currentProfile = {};


// Load profile from backend
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

    catch(error) {

        console.error(error);

    }

}


// Edit Profile Elements

const editButton = document.getElementById("edit-profile-btn");

const editForm = document.getElementById("edit-form");


const saveButton = document.getElementById("save-profile-btn");


const statusInput = document.getElementById("edit-status");

const provinceInput = document.getElementById("edit-province");

const programInput = document.getElementById("edit-program");

const crsInput = document.getElementById("edit-crs");


const profileMessage = document.getElementById("profile-message");



// Open / Close edit form

editButton.addEventListener("click", () => {


    editForm.classList.toggle("hidden");


    // Fill current values

    statusInput.value = currentProfile.status;

    provinceInput.value = currentProfile.province;

    programInput.value = currentProfile.program;

    crsInput.value = currentProfile.crs;


});




// Save profile changes

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



        if(response.ok) {


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



// Start dashboard

loadProfile();