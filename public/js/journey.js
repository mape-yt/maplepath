// =================================
// MaplePath Journey Page
// =================================


const journeyContainer =
    document.getElementById("journey-container");


let currentRoadmap = null;



// =================================
// Load User Journey
// =================================

async function loadJourney() {


    try {


        const username =
            localStorage.getItem("username");



        if (!username) {

            window.location.href =
                "auth.html";

            return;

        }



        const profileResponse =
            await fetch(
                `/api/profile/${username}`
            );


        const profile =
            await profileResponse.json();



        if (!profile.pathway) {


            journeyContainer.innerHTML = `

                <h2>
                    No pathway selected
                </h2>

                <p>
                    Complete your profile first.
                </p>

            `;


            return;


        }



        const journeyResponse =
            await fetch(

                `/api/journey/${encodeURIComponent(profile.pathway)}`

            );



        const roadmap =
            await journeyResponse.json();



        currentRoadmap = roadmap;



        displayJourney(roadmap);



    }


    catch(error) {


        console.error(error);


        journeyContainer.innerHTML = `

            <h2>
                Unable to load journey
            </h2>

        `;


    }


}




// =================================
// Display Journey
// =================================

function displayJourney(roadmap) {


    journeyContainer.innerHTML = "";



    const completedSteps =
        JSON.parse(
            localStorage.getItem("completedSteps")
        ) || [];



    const completedCount =
        completedSteps.length;



    const progress =
        Math.round(
            (completedCount / roadmap.steps.length) * 100
        );



    journeyContainer.innerHTML = `

        <div class="journey-header">

            <h2>
                🍁 ${roadmap.name} Journey
            </h2>


            <p>
                ${roadmap.description}
            </p>


            <div class="journey-progress">

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${progress}%"
                    ></div>

                </div>


                <h3>
                    ${progress}% Completed
                </h3>


            </div>


        </div>


    `;



    const timeline =
        document.createElement("div");


    timeline.className =
        "journey-timeline";




    roadmap.steps.forEach(step => {


        const completed =
            completedSteps.includes(step.order);



        const card =
            document.createElement("div");


        card.className =
            completed
            ?
            "journey-step completed"
            :
            "journey-step";



        card.innerHTML = `

            <div class="step-number">

                ${completed ? "✓" : step.order}

            </div>


            <div class="step-content">


                <h3>

                    ${step.title}

                </h3>


                <p>

                    ${step.description}

                </p>


                <button class="complete-btn">

                    ${
                        completed
                        ?
                        "Completed"
                        :
                        "Mark Complete"
                    }

                </button>


            </div>


        `;



        const button =
            card.querySelector(".complete-btn");



        button.addEventListener(
            "click",
            () => {


                toggleStep(step.order);


            }

        );



        timeline.appendChild(card);



    });



    journeyContainer.appendChild(timeline);



}




// =================================
// Complete Step
// =================================


function toggleStep(stepNumber) {


    let completedSteps =
        JSON.parse(
            localStorage.getItem("completedSteps")
        ) || [];



    if (
        completedSteps.includes(stepNumber)
    ) {


        completedSteps =
            completedSteps.filter(
                step =>
                    step !== stepNumber
            );


    }


    else {


        completedSteps.push(stepNumber);


    }



    localStorage.setItem(

        "completedSteps",

        JSON.stringify(completedSteps)

    );



    displayJourney(currentRoadmap);



}





// Start

loadJourney();