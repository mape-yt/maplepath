// =================================
// MaplePath Profile Page V2
// =================================


let currentProfile = {};

// =================================
// Immigration Options
// =================================

let OPTIONS = {

    pathways: [],

    streams: {},

    provinces: [],

    locations: [],

    statuses: [],

    stages: [],

    educationLevels: []

};



// =================================
// Load Options
// =================================

async function loadOptions(){

    const response =
        await fetch("/api/options");


    OPTIONS =
        await response.json();

}



// =================================
// DOM Elements
// =================================



const profileContent =
    document.getElementById(
        "profile-content"
    );


const title =
    document.getElementById(
        "journey-title"
    );


const subtitle =
    document.getElementById(
        "journey-subtitle"
    );


const badge =
    document.getElementById(
        "journey-badge"
    );



const editButton =
    document.getElementById(
        "edit-profile-btn"
    );


const editSection =
    document.getElementById(
        "edit-section"
    );


const cancelButton =
    document.getElementById(
        "cancel-btn"
    );


const saveButton =
    document.getElementById(
        "save-btn"
    );



const planningForm =
    document.getElementById(
        "planning-form"
    );


const journeyForm =
    document.getElementById(
        "journey-form"
    );



const streamGroup =
    document.getElementById(
        "stream-group"
    );




// Inputs


const countryInput =
    document.getElementById(
        "edit-country"
    );


const currentStatusInput =
    document.getElementById(
        "edit-current-status"
    );


const educationInput =
    document.getElementById(
        "edit-education"
    );


const pathwayInput =
    document.getElementById(
        "edit-pathway"
    );


const streamInput =
    document.getElementById(
        "edit-stream"
    );


const provinceInput =
    document.getElementById(
        "edit-province"
    );


const locationInput =
    document.getElementById(
        "edit-location"
    );


const statusInput =
    document.getElementById(
        "edit-status"
    );


const stageInput =
    document.getElementById(
        "edit-stage"
    );



const message =
    document.getElementById(
        "message"
    );



// =================================
// Load Profile
// =================================


async function loadProfile(){


    const username =
        localStorage.getItem(
            "username"
        );


    if(!username){

        window.location.href =
            "auth.html";

        return;

    }



    const response =
        await fetch(
            `/api/profile/${username}`
        );



    const profile =
        await response.json();



    currentProfile =
        profile;



    renderProfile(
        profile
    );


}



// =================================
// Render Profile
// =================================


function renderProfile(profile){



    profileContent.innerHTML = "";



    let fields = [];



    if(profile.journeyType === "planning"){


        title.textContent =
            "🌱 Still Exploring";


        subtitle.textContent =
            "Your immigration planning profile";


        badge.textContent =
            "Planning";



        fields = [

            [
                "Country",
                profile.country
            ],

            [
                "Current Status",
                profile.currentStatus
            ],

            [
                "Education",
                profile.education
            ]

        ];


    }

    else {



        title.textContent =
            "🍁 Immigration Journey";


        subtitle.textContent =
            "Your personalized PR roadmap";


        badge.textContent =
            profile.pathway ||
            "Pathway";



        fields = [

            [
                "Pathway",
                profile.pathway
            ],

            [
                "Stream",
                profile.stream
            ],

            [
                "Province",
                profile.province
            ],

            [
                "Location",
                profile.location
            ],

            [
                "Status",
                profile.status
            ],

            [
                "Current Stage",
                profile.currentStage
            ]

        ];


    }



    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "profile-info";



    fields.forEach(field=>{


        grid.innerHTML += `

            <div class="info-box">

                <strong>
                    ${field[0]}
                </strong>

                <p>
                    ${field[1] || "Not set"}
                </p>

            </div>

        `;


    });



    profileContent.appendChild(
        grid
    );


}

// =================================
// Edit Button
// =================================


editButton.addEventListener(
    "click",
    ()=>{


        editSection.classList.remove(
            "hidden"
        );


        message.textContent = "";


        setupEditForm();


    }
);



// =================================
// Cancel Button
// =================================


cancelButton.addEventListener(
    "click",
    ()=>{


        editSection.classList.add(
            "hidden"
        );


        message.textContent = "";


    }
);



// =================================
// Setup Edit Form
// =================================


function setupEditForm(){



    if(currentProfile.journeyType === "planning"){


        planningForm.classList.remove(
            "hidden"
        );


        journeyForm.classList.add(
            "hidden"
        );



        countryInput.value =
            currentProfile.country || "";



        createOptions(

            currentStatusInput,

            OPTIONS.statuses,

            currentProfile.currentStatus

        );



        createOptions(

            educationInput,

            OPTIONS.educationLevels,

            currentProfile.education

        );


    }


    else {



        journeyForm.classList.remove(
            "hidden"
        );


        planningForm.classList.add(
            "hidden"
        );



        createOptions(

            pathwayInput,

            OPTIONS.pathways,

            currentProfile.pathway

        );



        createOptions(

            provinceInput,

            OPTIONS.provinces,

            currentProfile.province

        );



        createOptions(

            locationInput,

            OPTIONS.locations,

            currentProfile.location

        );



        createOptions(

            statusInput,

            OPTIONS.statuses,

            currentProfile.status

        );



        createOptions(

            stageInput,

            OPTIONS.stages,

            currentProfile.currentStage

        );



        updateStreamOptions();


    }


}



// =================================
// Create Dropdown Options
// =================================


function createOptions(
    element,
    options,
    selected
){


    element.innerHTML =
        `<option value="">
            Select
        </option>`;


    options.forEach(option=>{


        const optionElement =
            document.createElement(
                "option"
            );


        optionElement.value =
            option;


        optionElement.textContent =
            option;



        if(option === selected){

            optionElement.selected =
                true;

        }



        element.appendChild(
            optionElement
        );


    });


}



// =================================
// Stream Handling
// =================================


function updateStreamOptions(){


    const pathway =
        pathwayInput.value;



    const availableStreams =
        OPTIONS.streams[pathway];



    if(!availableStreams){


        streamGroup.classList.add(
            "hidden"
        );


        streamInput.innerHTML =
            "";

        return;


    }



    streamGroup.classList.remove(
        "hidden"
    );



    createOptions(

        streamInput,

        availableStreams,

        currentProfile.stream

    );


}



// When pathway changes


pathwayInput.addEventListener(
    "change",
    ()=>{


        currentProfile.stream =
            "";


        updateStreamOptions();


    }
);



// =================================
// Save Profile
// =================================


saveButton.addEventListener(
    "click",
    async ()=>{


        const username =
            localStorage.getItem(
                "username"
            );



        let data = {};



        if(currentProfile.journeyType === "planning"){



            data = {


                country:
                    countryInput.value,


                currentStatus:
                    currentStatusInput.value,


                education:
                    educationInput.value


            };


        }


        else {



            data = {


                pathway:
                    pathwayInput.value,


                stream:
                    streamInput.value,


                province:
                    provinceInput.value,


                location:
                    locationInput.value,


                status:
                    statusInput.value,


                currentStage:
                    stageInput.value


            };


        }



        const response =
            await fetch(
                `/api/profile/${username}`,
                {


                    method:"PATCH",


                    headers:{


                        "Content-Type":
                            "application/json"


                    },


                    body:
                        JSON.stringify(data)


                }
            );



        if(response.ok){


            message.textContent =
                "✅ Saved successfully!";


            await loadProfile();



            setTimeout(()=>{


                editSection.classList.add(
                    "hidden"
                );


            },800);



        }

        else {


            message.textContent =
                "❌ Failed to save profile.";

        }



    }
);




// =================================
// Start
// =================================


async function startProfile(){

    await loadOptions();

    await loadProfile();

}


startProfile();