// =================================
// MaplePath Journey
// =================================


const journeyContainer =
document.getElementById(
    "journey-container"
);


let currentRoadmap = null;

let completedSteps = [];

let timelineRecords = [];

let timelineAverages = [];




// =================================
// Load Journey
// =================================

async function loadJourney(){


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




        const profileResponse =
        await fetch(
            `/api/profile/${username}`
        );


        const profile =
        await profileResponse.json();





        const roadmapResponse =
        await fetch(
            `/api/journey/${encodeURIComponent(profile.pathway)}`
        );


        const roadmap =
        await roadmapResponse.json();



        currentRoadmap =
        roadmap;






        const progressResponse =
        await fetch(
            `/api/journey/progress/${username}`
        );


        const progress =
        await progressResponse.json();



        completedSteps =
        progress.completedSteps || [];





        await loadTimelineRecords(
            username
        );



        await loadTimelineAverages(
            profile.pathway,
            roadmap.steps
        );




        displayJourney(
            roadmap
        );



    }


    catch(error){

        console.error(error);

    }


}







// =================================
// Load Timeline Records
// =================================

async function loadTimelineRecords(username){


    const response =
    await fetch(
        `/api/timeline/${username}`
    );


    if(response.ok){

        timelineRecords =
        await response.json();

    }

    else{

        timelineRecords=[];

    }

}








// =================================
// Load Community Averages
// =================================

async function loadTimelineAverages(
    pathway,
    steps
){


    timelineAverages = [];



    for(const step of steps){


        const response =
        await fetch(

        `/api/analytics/${encodeURIComponent(pathway)}/${step.order}`

        );



        if(response.ok){


            const average =
            await response.json();



            timelineAverages.push({

                stepOrder:
                step.order,

                averageDays:
                average.averageDays,

                totalUsers:
                average.totalUsers


            });


        }


    }


}




// =================================
// Confidence Calculator
// =================================

function getConfidence(totalUsers){


    if(!totalUsers || totalUsers === 0){

        return "⚠️ No data yet";

    }


    if(totalUsers < 10){

        return "⚠️ Limited data";

    }


    if(totalUsers < 50){

        return "📊 Moderate confidence";

    }


    return "✅ High confidence";


}




// =================================
// Date Formatter
// =================================

function formatDate(date){


    const d =
    new Date(date);



    const year =
    d.getFullYear();



    const month =
    String(
        d.getMonth()+1
    ).padStart(2,"0");



    const day =
    String(
        d.getDate()
    ).padStart(2,"0");



    return `${year}.${month}.${day}`;


}









// =================================
// Display Journey
// =================================

function displayJourney(roadmap){



    journeyContainer.innerHTML="";



    const timeline =
    document.createElement(
        "div"
    );




    roadmap.steps.forEach(step=>{



        const completed =
        completedSteps.includes(
            step.order
        );



        const current =
        getCurrentStep()
        ===
        step.order;





        const record =
        timelineRecords.find(

            item =>
            item.stepOrder
            ===
            step.order

        );




        const average =
        timelineAverages.find(

            item =>
            item.stepOrder
            ===
            step.order

        );





        const card =
        document.createElement(
            "div"
        );



        if(completed){

            card.className =
            "journey-step completed";

        }

        else if(current){

            card.className =
            "journey-step current";

        }

        else{

            card.className =
            "journey-step";

        }






        let timelineText =
        "Not started";



        let buttonText =
        "Start Step";






        // =============================
        // Completed Step
        // =============================

        if(record &&
        record.status==="completed"){



            let comparison =
            "";



            if(average.averageDays){


                const difference =
                record.durationDays
                -
                average.averageDays;



                if(difference > 0){


                    comparison =
                    `
                    <br>
                    ⏳ You took
                    ${difference}
                    more days than average
                    `;


                }


                else if(difference < 0){


                    comparison =
                    `
                    <br>
                    🚀 You completed
                    ${Math.abs(difference)}
                    days faster than average
                    `;


                }


                else{


                    comparison =
                    `
                    <br>
                    🎯 Right on the MaplePath average
                    `;


                }


            }





            timelineText =
            `
            Completed in:
            ${record.durationDays}
            days

            <br><br>

            MaplePath average:
            ${average.averageDays || "N/A"}
            days

            <br>

            Based on:
            ${average.totalUsers || 0}
            applicants

            <br>

            ${getConfidence(
                average.totalUsers
            )}

            ${comparison}

            `;



            buttonText =
            "Completed";


        }







        // =============================
        // Current Step
        // =============================

        else if(record &&
        record.status==="in-progress"){



            let estimated =
            "";



            if(average.averageDays){


                const estimateDate =
                new Date(
                    record.startedAt
                );



                estimateDate.setDate(

                    estimateDate.getDate()
                    +
                    average.averageDays

                );



                estimated =
                `
                <br><br>

                Estimated completion:
                ${formatDate(estimateDate)}

                `;


            }





            timelineText =
            `
            Started:
            ${formatDate(record.startedAt)}

            <br><br>

            MaplePath average:
            ${average.averageDays || "N/A"}
            days

            <br>

            Based on:
            ${average.totalUsers || 0}
            applicants

            <br>

            ${getConfidence(
                average.totalUsers
            )}

            ${estimated}

            `;



            buttonText =
            "Complete Step";


        }







        // =============================
        // Future Step
        // =============================

        else{


            timelineText =
            `
            MaplePath average:
            ${
            average.averageDays
            ?
            average.averageDays
            :
            "N/A"
            }
            days

            <br>

            Based on:
            ${average.totalUsers || 0}
            applicants

            <br>

            ${getConfidence(
                average.totalUsers
            )}

            `;


        }









        card.innerHTML = `



        <div class="step-number">

        ${
            completed
            ?
            "✓"
            :
            step.order
        }

        </div>



        <div class="step-content">


        <h3>
        ${step.title}
        </h3>



        <p>
        ${step.description}
        </p>



        <span class="step-status">

        ${timelineText}

        </span>





        <button class="complete-btn">

        ${buttonText}

        </button>




        ${
        record
        ?
        `
        <button class="edit-timeline-btn">

        ✏️ Edit Dates

        </button>
        `
        :
        ""
        }



        </div>


        `;







        const button =
        card.querySelector(
            ".complete-btn"
        );



        const editButton =
        card.querySelector(
            ".edit-timeline-btn"
        );





        if(editButton){


            editButton.addEventListener(
                "click",
                ()=>{

                    editTimelineDates(
                        record
                    );

                }
            );


        }






        if(!completed){


            button.addEventListener(
                "click",
                ()=>{

                    handleStepAction(
                        step
                    );


                }
            );


        }





        timeline.appendChild(card);



    });




    journeyContainer.appendChild(
        timeline
    );


}







// =================================
// Step Action
// =================================

async function handleStepAction(step){


    const username =
    localStorage.getItem(
        "username"
    );



    const profileResponse =
    await fetch(
        `/api/profile/${username}`
    );


    const profile =
    await profileResponse.json();




    const existing =
    timelineRecords.find(

        record =>
        record.stepOrder
        ===
        step.order

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
        profile.pathway,

        stepOrder:
        step.order,

        stepTitle:
        step.title


        })

        });


    }





    else if(existing.status==="in-progress"){



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
        profile.pathway,


        stepOrder:
        step.order


        })


        });



        completedSteps.push(
            step.order
        );


        await updateJourneyProgress();


    }





    loadJourney();


}








// =================================
// Progress Update
// =================================

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

    completedSteps,

    currentStep:
    getCurrentStep()

    })


    });


}









function getCurrentStep(){


    const next =
    currentRoadmap.steps.find(

    step =>
    !completedSteps.includes(
        step.order
    )

    );



    return next
    ?
    next.order
    :
    currentRoadmap.steps.length;


}









// =================================
// Edit Timeline Modal
// =================================

let selectedTimelineRecord=null;



const modal =
document.getElementById(
"timeline-modal"
);


const startInput =
document.getElementById(
"edit-start-date"
);


const endInput =
document.getElementById(
"edit-end-date"
);


const durationText =
document.getElementById(
"edit-duration"
);



const saveEdit =
document.getElementById(
"save-edit"
);



const cancelEdit =
document.getElementById(
"cancel-edit"
);





function editTimelineDates(record){


    selectedTimelineRecord =
    record;



    startInput.value =
    record.startedAt.substring(
        0,10
    );



    endInput.value =
    record.completedAt
    ?
    record.completedAt.substring(
        0,10
    )
    :
    "";



    updateDurationPreview();


    modal.classList.remove(
        "hidden"
    );


}






function updateDurationPreview(){


    if(
        !startInput.value
        ||
        !endInput.value
    ){

        durationText.textContent =
        "0 days";

        return;

    }




    const start =
    new Date(startInput.value);


    const end =
    new Date(endInput.value);



    const days =
    Math.ceil(

    (end-start)
    /
    (1000*60*60*24)

    );



    if(days < 0){


        durationText.textContent =
        "Invalid dates";


        return;

    }



    durationText.textContent =
    `${days} days`;


}





startInput.addEventListener(
"change",
updateDurationPreview
);


endInput.addEventListener(
"change",
updateDurationPreview
);





cancelEdit.addEventListener(
"click",
()=>{

modal.classList.add(
"hidden"
);

});





saveEdit.addEventListener(
"click",
async()=>{


    if(
    durationText.textContent
    ===
    "Invalid dates"
    ){

        alert(
        "Completion date cannot be before start date."
        );

        return;

    }




    await fetch(

    `/api/timeline/edit/${selectedTimelineRecord._id}`,

    {


    method:"PUT",


    headers:{

    "Content-Type":
    "application/json"

    },


    body:JSON.stringify({

    startedAt:
    startInput.value,


    completedAt:
    endInput.value


    })


    });


    modal.classList.add(
        "hidden"
    );


    loadJourney();


});





loadJourney();