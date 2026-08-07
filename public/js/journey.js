// ============================================
// MaplePath Journey
// Phase 7 Rebuild
// Part 1
//
// DOM
// State
// Loading
// Utilities
// ============================================



// ============================================
// DOM REFERENCES
// ============================================


const journeyContainer =
    document.getElementById(
        "journey-container"
    );


const journeySummary =
    document.getElementById(
        "journey-summary"
    );



// ============================================
// GLOBAL STATE
// ============================================


const state = {

    profile:null,


    roadmap:null,


    pathway:null,


    stream:null,


    profileKey:null,


    completedSteps:[],


    timelineRecords:[],


    timelineAverages:[],


    selectedTimelineRecord:null,


    progress:{


        completed:0,


        total:0,


        percent:0


    }

};




// ============================================
// INITIALIZATION
// ============================================


async function initializeJourney(){


    try{


        const username =
            localStorage.getItem(
                "username"
            );



        if(!username){


            window.location.href =
                "auth.html";


            return;


        }




        await loadProfile(
            username
        );


        await loadRoadmap();


        await loadJourneyProgress(
            username
        );


        await loadTimelineRecords(
            username
        );


        await loadCommunityAnalytics();



        calculateProgress();



        renderJourney();



    }


    catch(error){


        console.error(
            "Journey initialization error:",
            error
        );


        showJourneyError(
            "Unable to load your journey."
        );


    }


}






// ============================================
// PROFILE LOADING
// ============================================


async function loadProfile(username){


    const response =
        await fetch(
            `/api/profile/${username}`
        );



    if(!response.ok){


        throw new Error(
            "Profile loading failed."
        );


    }



    const profile =
        await response.json();



    state.profile =
        profile;



    state.pathway =
        profile.pathway;



    state.stream =
        profile.stream;



    state.profileKey =
        getProfileKey(
            profile
        );


}






// ============================================
// ROADMAP LOADING
// ============================================


async function loadRoadmap(){



    const response =
        await fetch(

            `/api/journey/${

                encodeURIComponent(
                    state.pathway
                )

            }/${

                encodeURIComponent(
                    state.stream
                )

            }`

        );



    const roadmap =
        await response.json();




    if(!response.ok){


        throw new Error(

            roadmap.message ||
            "Roadmap not found."

        );


    }



    state.roadmap =
        roadmap;



}






// ============================================
// PROGRESS LOADING
// ============================================


async function loadJourneyProgress(username){



    const response =
        await fetch(

            `/api/journey/progress/${username}`

        );



    if(!response.ok){


        state.completedSteps =
            [];


        return;


    }



    const progress =
        await response.json();



    state.completedSteps =
        progress.completedSteps || [];



}







// ============================================
// TIMELINE RECORD LOADING
// ============================================


async function loadTimelineRecords(username){



    const response =
        await fetch(

            `/api/timeline/${username}`

        );



    if(!response.ok){


        state.timelineRecords =
            [];


        return;


    }



    state.timelineRecords =
        await response.json();



}







// ============================================
// COMMUNITY ANALYTICS LOADING
// ============================================


async function loadCommunityAnalytics(){



    state.timelineAverages =
        [];



    if(!state.roadmap){


        return;


    }




    for(
        const step of state.roadmap.steps
    ){



        const response =
            await fetch(

                `/api/analytics/${

                    encodeURIComponent(
                        state.profileKey
                    )

                }/${

                    step.order

                }`

            );



        if(response.ok){



            const average =
                await response.json();



            state.timelineAverages.push({


                stepOrder:
                    step.order,


                stepTitle:
                    step.title,


                averageDays:
                    average.averageDays,


                totalUsers:
                    average.totalUsers



            });



        }



    }



}







// ============================================
// PROGRESS CALCULATION
// ============================================


function calculateProgress(){



    if(!state.roadmap){


        return;


    }



    state.progress.total =
        state.roadmap.steps.length;



    state.progress.completed =
        state.completedSteps.length;



    state.progress.percent =
        Math.round(

            (

                state.progress.completed /

                state.progress.total

            )

            *

            100

        );



}







// ============================================
// UTILITY FUNCTIONS
// ============================================


function getProfileKey(profile){



    if(
        profile.pathway !==
        "Express Entry"
    ){


        return profile.pathway;


    }




    switch(profile.stream){



        case "Canadian Experience Class (CEC)":

            return "EE-CEC";



        case "Federal Skilled Worker Program (FSWP)":

            return "EE-FSWP";



        case "Federal Skilled Trades Program (FSTP)":

            return "EE-FSTP";



        default:

            return "EE";


    }


}







function formatDate(date){



    if(!date){


        return "N/A";


    }



    const formatted =
        new Date(date);



    return formatted.toLocaleDateString(

        "en-CA",

        {

            year:"numeric",

            month:"short",

            day:"numeric"

        }

    );


}







function calculateDays(
    start,
    end
){



    const difference =
        new Date(end)
        -
        new Date(start);



    return Math.ceil(

        difference /
        (1000*60*60*24)

    );


}







function getConfidence(users){



    if(!users){


        return "⚠️ No community data";


    }



    if(users < 10){


        return "⚠️ Limited";


    }



    if(users < 50){


        return "📊 Moderate";


    }



    return "✅ High";


}







function getCurrentStep(){



    if(!state.roadmap){


        return null;


    }



    const nextStep =
        state.roadmap.steps.find(


            step =>

            !state.completedSteps.includes(

                step.order

            )


        );



    return nextStep
        ? nextStep.order
        : state.roadmap.steps.length;



}







function getTimelineRecord(stepOrder){



    return state.timelineRecords.find(


        record =>

        record.stepOrder === stepOrder


    );


}







function getTimelineAverage(stepOrder){



    return state.timelineAverages.find(


        average =>

        average.stepOrder === stepOrder


    );


}







function getStageBadge(type){



    switch(type){



        case "applicant":


            return {

                text:"🧑 Applicant",

                className:"applicant"

            };



        case "waiting":


            return {

                text:"⏳ Waiting",

                className:"waiting"

            };



        case "ircc":


            return {

                text:"🏛️ IRCC",

                className:"ircc"

            };



        default:


            return {

                text:"",

                className:""

            };


    }


}







function showJourneyError(message){



    if(journeyContainer){


        journeyContainer.innerHTML = `

            <div class="loading">

                ${message}

            </div>

        `;


    }


}







// ============================================
// RENDER PLACEHOLDER
// Implemented in Part 2
// ============================================


function renderJourney(){



    renderJourneySummary();


    renderTimeline();


}

// ============================================
// Part 2
//
// Journey Summary
// Timeline Renderer
// Analytics UI
// ============================================





// ============================================
// JOURNEY SUMMARY
// ============================================


function renderJourneySummary(){



    if(
        !state.profile ||
        !state.roadmap
    ){

        return;

    }



    const total =
        state.progress.total;



    const completed =
        state.progress.completed;



    const currentStep =
        state.roadmap.steps.find(


            step =>

            step.order === getCurrentStep()


        );



    journeySummary.innerHTML = `


        <div class="summary-title">


            <div>


                <h2>

                    ${state.pathway}

                </h2>


                <span>

                    ${state.stream}

                </span>


            </div>



            <div class="summary-progress">


                <h2>

                    ${state.progress.percent}%

                </h2>


                <p>

                    Journey Complete

                </p>


            </div>


        </div>




        <div class="summary-grid">


            <div class="summary-card">


                <h3>

                    Current Stage

                </h3>


                <p>

                    ${
                        currentStep
                        ?
                        currentStep.title
                        :
                        "Completed 🎉"
                    }

                </p>


            </div>





            <div class="summary-card">


                <h3>

                    Completed Steps

                </h3>


                <p>

                    ${completed}/${total}

                </p>


            </div>





            <div class="summary-card">


                <h3>

                    Started

                </h3>


                <p>

                    ${
                        formatDate(
                            state.profile.journeyStartDate
                        )
                    }

                </p>


            </div>





            <div class="summary-card">


                <h3>

                    Status

                </h3>


                <p>


                    ${
                        completed === total
                        ?
                        "Completed"
                        :
                        "In Progress"
                    }


                </p>


            </div>


        </div>


    `;


}








// ============================================
// TIMELINE RENDERER
// ============================================


function renderTimeline(){



    if(!state.roadmap){


        return;


    }



    journeyContainer.innerHTML = "";



    const timeline =
        document.createElement(
            "div"
        );



    timeline.className =
        "journey-timeline";





    state.roadmap.steps.forEach(

        step => {


            timeline.appendChild(

                createTimelineStage(
                    step
                )

            );


        }

    );




    journeyContainer.appendChild(
        timeline
    );



}









// ============================================
// CREATE TIMELINE STAGE
// ============================================


function createTimelineStage(step){



    const completed =
        state.completedSteps.includes(

            step.order

        );



    const current =
        getCurrentStep()
        ===
        step.order;




    const record =
        getTimelineRecord(

            step.order

        );



    const average =
        getTimelineAverage(

            step.order

        )
        ||
        {

            averageDays:null,

            totalUsers:0

        };





    const statusClass =
        completed
        ?
        "completed"
        :
        current
        ?
        "current"
        :
        "future";






    const stage =
        document.createElement(
            "div"
        );



    stage.className =
        `journey-stage ${statusClass}`;





    const badge =
        getStageBadge(
            step.type
        );





    stage.innerHTML = `


<div class="timeline-column">


    <div class="timeline-node ${statusClass}">

    </div>



    <div class="timeline-line ${

        completed
        ?
        "completed"
        :
        ""

    }">


    </div>


</div>





<div class="stage-card">



<div class="stage-header">



<div class="stage-title">


<h3>

Stage ${step.order}

</h3>



<h2>

${step.title}

</h2>


</div>





<span class="stage-badge ${badge.className}">


${badge.text}


</span>



</div>





<div class="step-content">


<p>

${step.description}

</p>




<div class="stage-section">


<h4>

📅 Timeline

</h4>



<div class="stage-info">


${

renderTimelineInformation(

    step,

    record,

    average

)

}


</div>



</div>






<div class="stage-actions">


${

renderActionButton(

    step,

    record,

    completed

)

}






</div>



</div>



</div>



`;




    return stage;



}









// ============================================
// TIMELINE INFORMATION
// ============================================


function renderTimelineInformation(

    step,

    record,

    average

){



    let html = "";




    if(record){



        if(
            record.status ===
            "completed"
        ){



            html += `


<strong>

Completed

</strong>


<br>


Duration:

${record.durationDays}

days



<br><br>



MaplePath Average:

<br>


${

average.averageDays ??
"N/A"

}

days




<br>


${

average.totalUsers

}

applicant(s)




<br>


${

getConfidence(
    average.totalUsers
)

}



<br><br>



${

getComparisonText(

    record.durationDays,

    average.averageDays

)

}



`;



        }



        else{



            html += `


Started:

<br>


${

formatDate(

record.startedAt

)

}




<br><br>


MaplePath Average:

<br>


${

average.averageDays ??

"N/A"

}

days



<br>


${

average.totalUsers

}

applicant(s)




<br>


${

getConfidence(

average.totalUsers

)

}




${

getEstimatedCompletion(

record,

average

)

}



`;



        }



    }



    else{



        html += `


MaplePath Average:

<br>


${

average.averageDays ??

"N/A"

}

days




<br>


${

average.totalUsers

}

applicant(s)




<br>


${

getConfidence(

average.totalUsers

)

}



`;



    }



    return html;



}









// ============================================
// ANALYTIC HELPERS
// ============================================


function getComparisonText(

    actual,

    average

){



    if(!average){


        return "";


    }



    const difference =
        actual -
        average;



    if(difference > 0){


        return `

⏳ ${difference}

day(s) slower than average.

`;



    }



    if(difference < 0){


        return `

🚀 ${Math.abs(difference)}

day(s) faster than average.

`;



    }




    return `

🎯 Exactly on average.

`;



}









function getEstimatedCompletion(

    record,

    average

){



    if(
        !average.averageDays
    ){


        return "";

    }




    const date =
        new Date(

            record.startedAt

        );



    date.setDate(

        date.getDate()

        +

        average.averageDays

    );




    return `


<br><br>


Estimated Completion:

<br>


${

formatDate(date)

}



`;



}









// ============================================
// ACTION BUTTON DISPLAY
// Part 3 will attach logic
// ============================================


function renderActionButton(

    step,

    record,

    completed

){



    if(completed){



        return `


<button

class="complete-btn completed"

disabled

>

Completed

</button>


`;



    }





    if(
        record &&
        record.status ===
        "in-progress"
    ){


        return `


<button

class="complete-btn"

data-action="complete"

data-step="${step.order}"

>

Complete Step

</button>


`;



    }





    return `


<button

class="complete-btn"

data-action="start"

data-step="${step.order}"

>

Start Step

</button>


`;



}

// ============================================
// Part 3
//
// Actions
// Timeline Updates
// Modal
// Events
// Startup
// ============================================







// ============================================
// STEP ACTION HANDLER
// ============================================


async function handleStepAction(stepOrder){



    try{



        const username =
            localStorage.getItem(
                "username"
            );



        const step =
            state.roadmap.steps.find(

                item =>
                item.order === stepOrder

            );



        if(!step){

            return;

        }





        const existing =
            getTimelineRecord(
                stepOrder
            );





        if(!existing){



            await fetch(

                "/api/timeline/start",

                {

                    method:"POST",

                    headers:{

                        "Content-Type":
                        "application/json"

                    },


                    body:JSON.stringify({

                        username,


                        pathway:
                        state.pathway,


                        stepOrder:
                        step.order,


                        stepTitle:
                        step.title


                    })


                }

            );



        }



        else if(

            existing.status ===
            "in-progress"

        ){



            await fetch(

                "/api/timeline/complete",

                {

                    method:"PUT",

                    headers:{

                        "Content-Type":
                        "application/json"

                    },


                    body:JSON.stringify({

                        username,


                        pathway:
                        state.pathway,


                        stepOrder:
                        step.order


                    })

                }

            );




            state.completedSteps.push(

                step.order

            );



            await updateJourneyProgress();



        }





        await reloadJourney();



    }


    catch(error){


        console.error(

            "Step action failed:",

            error

        );


    }



}









// ============================================
// UPDATE JOURNEY PROGRESS
// ============================================


async function updateJourneyProgress(){



    const username =
        localStorage.getItem(
            "username"
        );



    await fetch(

        `/api/journey/progress/${username}`,

        {

            method:"PUT",


            headers:{

                "Content-Type":
                "application/json"

            },


            body:JSON.stringify({

                completedSteps:
                    state.completedSteps,


                currentStep:
                    getCurrentStep()


            })


        }

    );



}









// ============================================
// RELOAD DATA
// ============================================


async function reloadJourney(){



    const username =
        localStorage.getItem(
            "username"
        );



    await loadJourneyProgress(
        username
    );



    await loadTimelineRecords(
        username
    );



    await loadCommunityAnalytics();



    calculateProgress();



    renderJourney();



}

// ============================================
// EVENT LISTENERS
// ============================================


function setupEventListeners(){


    journeyContainer.addEventListener(

        "click",

        event => {



            const button =
                event.target.closest(
                    "button"
                );



            if(!button){

                return;

            }





            const stepOrder =
                Number(

                    button.dataset.step

                );





            if(

                button.dataset.action ===
                "start"

            ){



                handleStepAction(
                    stepOrder
                );


            }





            if(

                button.dataset.action ===
                "complete"

            ){



                handleStepAction(
                    stepOrder
                );


            }



        }

    );


}









// ============================================
// START APPLICATION
// ============================================


setupEventListeners();


initializeJourney();