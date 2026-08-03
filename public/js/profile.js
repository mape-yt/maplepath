// =================================
// MaplePath Profile Page
// =================================


let currentProfile = {};


// DOM

const profileContent =
    document.getElementById("profile-content");


const title =
    document.getElementById("journey-title");


const badge =
    document.getElementById("journey-badge");


const editButton =
    document.getElementById("edit-profile-btn");


const editSection =
    document.getElementById("edit-section");


const saveButton =
    document.getElementById("save-btn");



// Inputs

const provinceInput =
    document.getElementById("edit-province");


const statusInput =
    document.getElementById("edit-status");


const stageInput =
    document.getElementById("edit-stage");


const locationInput =
    document.getElementById("edit-location");



const message =
    document.getElementById("message");





// ================================
// Load Profile
// ================================


async function loadProfile(){


    const username =
        localStorage.getItem("username");


    if(!username){

        window.location.href="auth.html";

        return;

    }



    const response =
        await fetch(`/api/profile/${username}`);



    const profile =
        await response.json();



    currentProfile = profile;



    renderProfile(profile);


}




// ================================
// Render
// ================================


function renderProfile(profile){



    profileContent.innerHTML="";



    let fields=[];



    if(profile.journeyType==="planning"){


        title.textContent =
            "🌱 Still Exploring";


        badge.textContent =
            "Eligibility Profile";



        fields=[


            ["Country", profile.country],

            ["Current Status", profile.currentStatus],

            ["Education", profile.education]


        ];



    }


    else {


        title.textContent =
            "🍁 Immigration Journey";



        badge.textContent =
            profile.pathway || "Pathway";



        fields=[


            ["Pathway", profile.pathway],

            ["Province", profile.province],

            ["Status", profile.status],

            ["Current Stage", profile.currentStage],

            ["Location", profile.location]


        ];


    }



    const grid =
        document.createElement("div");


    grid.className="profile-info";



    fields.forEach(item=>{


        grid.innerHTML += `

        <div class="info-box">

            <strong>${item[0]}</strong>

            <p>${item[1] || "Not set"}</p>

        </div>

        `;


    });



    profileContent.appendChild(grid);



}







// ================================
// Edit
// ================================


editButton.addEventListener("click",()=>{


    editSection.classList.toggle("hidden");



    provinceInput.value =
        currentProfile.province || "";

    statusInput.value =
        currentProfile.status || "";

    stageInput.value =
        currentProfile.currentStage || "";

    locationInput.value =
        currentProfile.location || "";


});






// ================================
// Save
// ================================


saveButton.addEventListener("click", async()=>{


    const username =
        localStorage.getItem("username");



    const data={


        province:provinceInput.value,

        status:statusInput.value,

        currentStage:stageInput.value,

        location:locationInput.value


    };



    const response =
        await fetch(`/api/profile/${username}`,{


            method:"PATCH",


            headers:{


                "Content-Type":"application/json"


            },


            body:JSON.stringify(data)


        });



    if(response.ok){


        message.textContent =
            "✅ Saved successfully!";


        loadProfile();


    }


});





loadProfile();