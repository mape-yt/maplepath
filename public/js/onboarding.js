// ======================================
// MaplePath Onboarding V2
// ======================================


// ======================================
// Elements
// ======================================


const planningCard =
    document.getElementById("planningCard");


const pathwayCard =
    document.getElementById("pathwayCard");


const exploringForm =
    document.getElementById("exploringForm");


const journeyForm =
    document.getElementById("journeyForm");



const pathwayInput =
    document.getElementById("pathway");


const streamInput =
    document.getElementById("stream");


const streamContainer =
    document.getElementById("stream-container");



let userJourneyType = "";



// ======================================
// Immigration Data
// ======================================


let OPTIONS = {

    streams:{}

};



async function loadOptions(){

    const response =
        await fetch("/api/options");


    OPTIONS =
        await response.json();

}



// ======================================
// Card Selection
// ======================================


planningCard.addEventListener(
    "click",
    ()=>{


        userJourneyType =
            "planning";


        planningCard.classList.add(
            "active"
        );


        pathwayCard.classList.remove(
            "active"
        );



        exploringForm.classList.remove(
            "hidden"
        );


        exploringForm.classList.add(
            "show"
        );



        journeyForm.classList.add(
            "hidden"
        );


        journeyForm.classList.remove(
            "show"
        );


    }
);




pathwayCard.addEventListener(
    "click",
    ()=>{


        userJourneyType =
            "pathway";



        pathwayCard.classList.add(
            "active"
        );


        planningCard.classList.remove(
            "active"
        );



        journeyForm.classList.remove(
            "hidden"
        );


        journeyForm.classList.add(
            "show"
        );



        exploringForm.classList.add(
            "hidden"
        );


        exploringForm.classList.remove(
            "show"
        );


    }
);



// ======================================
// Stream Handling
// ======================================


function updateStreams(){



    const pathway =
        pathwayInput.value;



    const streams =
        OPTIONS.streams[pathway];



    if(!streams){
        streamInput.required = false;


        streamContainer.classList.add(
            "hidden"
        );


        streamInput.innerHTML =
            "";


        return;


    }



    streamContainer.classList.remove(
        "hidden"
    );
    streamInput.required = true;



    streamInput.innerHTML =
        `
        <option value="">
            Select Stream
        </option>
        `;



    streams.forEach(stream=>{


        const option =
            document.createElement(
                "option"
            );


        option.value =
            stream;


        option.textContent =
            stream;



        streamInput.appendChild(
            option
        );


    });


}



pathwayInput.addEventListener(
    "change",
    updateStreams
);

streamInput.addEventListener("change", () => {
    const province = OPTIONS.streamProvinces?.[streamInput.value];
    if(province) document.getElementById("province").value = province;
});




// ======================================
// Save Profile
// ======================================


async function saveProfile(profileData){



    const username =
        localStorage.getItem(
            "username"
        );



    if(!username){


        alert(
            "User session not found. Please login again."
        );


        window.location.href =
            "auth.html";


        return;


    }




    try {



        const response =
            await fetch(
                `/api/profile/onboarding/${encodeURIComponent(username)}`,
                {


                    method:"PUT",


                    headers:{


                        "Content-Type":
                            "application/json"


                    },


                    body:
                        JSON.stringify(profileData)


                }
            );



        const data =
            await response.json();



        if(response.ok){



            localStorage.setItem(
                "journeyType",
                userJourneyType
            );



            alert(
                "Profile completed successfully!"
            );



            window.location.href =
                "dashboard.html";



        }

        else {


            alert(
                data.message
            );


        }



    }


    catch(error){


        console.error(error);


        alert(
            "Unable to connect to server."
        );


    }


}




// ======================================
// Exploring Form Submit
// ======================================


exploringForm.addEventListener(
    "submit",
    async(event)=>{


        event.preventDefault();



        const profileData = {


            journeyType:
                "planning",


            country:
                document.getElementById(
                    "country"
                ).value,


            currentStatus:
                document.getElementById(
                    "currentStatus"
                ).value,


            education:
                document.getElementById(
                    "education"
                ).value



        };



        await saveProfile(
            profileData
        );



    }
);




// ======================================
// Journey Form Submit
// ======================================


journeyForm.addEventListener(
    "submit",
    async(event)=>{


        event.preventDefault();



        const profileData = {


            journeyType:
                "pathway",



            pathway:
                document.getElementById(
                    "pathway"
                ).value,



            stream:
                document.getElementById(
                    "stream"
                ).value,



            province:
                document.getElementById(
                    "province"
                ).value,



            location:
                document.getElementById(
                    "location"
                ).value,



            status:
                document.getElementById(
                    "status"
                ).value,



            currentStage:
                document.getElementById(
                    "currentStage"
                ).value,



            journeyStartDate:
                document.getElementById(
                    "journeyStartDate"
                ).value



        };



        await saveProfile(
            profileData
        );


    }
);

// ======================================
// Initialize Default Pathway
// ======================================

async function startOnboarding(){

    const session = await window.MaplePathSession.require();
    if(!session) return;

    await loadOptions();

    updateStreams();

}


startOnboarding();
