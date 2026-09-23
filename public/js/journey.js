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


        const session = await window.MaplePathSession.require();
        if(!session) return;
        const username = session.username;

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
            `/api/profile/${encodeURIComponent(username)}`
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
    state.profileKey = roadmap.profileKey || state.profileKey;



}






// ============================================
// PROGRESS LOADING
// ============================================


async function loadJourneyProgress(username){



    const response =
        await fetch(

            `/api/journey/progress/${encodeURIComponent(username)}`

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

            `/api/timeline/${encodeURIComponent(username)}`

        );



    if(!response.ok){


        state.timelineRecords =
            [];


        return;


    }



    state.timelineRecords =
        (await response.json()).filter(record => record.profileKey === state.profileKey);



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



    const dateOnlyMatch =
        typeof date === "string"
            ? date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
            : null;



    const formatted = dateOnlyMatch
        ? new Date(
            Number(dateOnlyMatch[1]),
            Number(dateOnlyMatch[2]) - 1,
            Number(dateOnlyMatch[3])
        )
        : new Date(date);



    if(Number.isNaN(formatted.getTime())){


        return "N/A";


    }



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

        case "province":
            return {
                text:"🏛️ Provincial program",
                className:"province"
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

                    ${escapeRoadmapText(state.pathway)}

                </h2>


                <span>

                    ${escapeRoadmapText(state.stream)}

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


        ${renderRoadmapMetadata(state.roadmap)}




        <div class="summary-grid">


            <div class="summary-card">


                <h3>

                    Current Stage

                </h3>


                <p>

                    ${
                        currentStep
                        ?
                        escapeRoadmapText(currentStep.title)
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

Stage ${escapeRoadmapText(step.order)}

</h3>



<h2>

${escapeRoadmapText(step.title)}

</h2>


</div>





<span class="stage-badge ${badge.className}">


${badge.text}


</span>



</div>





<div class="step-content">


<p>

${escapeRoadmapText(step.description ?? "")}

</p>




${renderRoadmapDetails(step)}

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

${record && record._id
    ? `<button type="button" class="edit-timeline-btn" data-action="edit-dates" data-step="${escapeRoadmapText(step.order)}">Edit dates</button>`
    : ""}






</div>



</div>



</div>



`;




    return stage;



}









// ============================================
// OPTIONAL ROADMAP GUIDANCE
// ============================================

function escapeRoadmapText(value){
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
    })[character]);
}

function roadmapItems(value){
    return Array.isArray(value) ? value : [];
}

function renderRoadmapMetadata(roadmap){
    if(!roadmap?.lastVerifiedAt && !roadmap?.federalApplicationRoute && !roadmap?.officialProgramPage){
        return "";
    }

    const statusLabels = {
        active:"Active when reviewed",
        limited:"Limited intake when reviewed",
        paused:"Paused when reviewed",
        closed:"Closed when reviewed"
    };
    const routeLabels = {
        "express-entry":"Express Entry federal route",
        "non-express-entry":"Non-Express Entry federal route",
        "route-dependent":"Federal route depends on the nomination"
    };
    const status = statusLabels[roadmap.programStatus] || "Program status not recorded";
    const route = routeLabels[roadmap.federalApplicationRoute] || "Federal route not recorded";
    const checked = roadmap.lastVerifiedAt
        ? `<span>Official guidance reviewed <time datetime="${escapeRoadmapText(roadmap.lastVerifiedAt)}">${escapeRoadmapText(roadmap.lastVerifiedAt)}</time></span>`
        : "";
    const official = renderRoadmapLink(roadmap.officialProgramPage);

    return `<aside class="roadmap-metadata" aria-label="Roadmap source information">
        <div class="roadmap-metadata-copy">
            <span class="program-status program-status-${escapeRoadmapText(roadmap.programStatus || "unknown")}">${escapeRoadmapText(status)}</span>
            <strong>${escapeRoadmapText(route)}</strong>
            ${checked}
        </div>
        ${official ? `<div class="roadmap-metadata-link">${official}</div>` : ""}
    </aside>`;
}

function renderRoadmapLink(link){
    if(!link || !link.url) return "";

    let url;
    try{
        url = new URL(link.url);
    } catch(error){
        return "";
    }

    if(url.protocol !== "https:") return "";

    const label = escapeRoadmapText(link.label || url.hostname);
    const verified = link.verifiedAt
        ? ` <small>Checked ${escapeRoadmapText(link.verifiedAt)}</small>`
        : "";

    return `<a href="${escapeRoadmapText(url.href)}" target="_blank" rel="noopener noreferrer" aria-label="${label} (opens in new tab)">${label} ↗</a>${verified}`;
}

function renderRoadmapDetails(step){
    const checklist = roadmapItems(step.preparationChecklist);
    const documents = roadmapItems(step.requiredDocuments);
    const mistakes = roadmapItems(step.commonMistakes);
    const links = roadmapItems(step.officialLinks);
    const estimate = step.governmentTimeline;

    if(!checklist.length && !documents.length && !mistakes.length && !links.length && !estimate){
        return "";
    }

    const sections = [];

    if(checklist.length){
        sections.push(`<section class="roadmap-section"><h5>Preparation checklist</h5><ul>${checklist.map(item => `<li>${escapeRoadmapText(item.text)}${item.condition ? ` <small>(${escapeRoadmapText(item.condition)})</small>` : ""}</li>`).join("")}</ul></section>`);
    }

    if(documents.length){
        sections.push(`<section class="roadmap-section"><h5>Documents to prepare</h5><ul>${documents.map(item => {
            const condition = item.condition ? `<p>${escapeRoadmapText(item.condition)}</p>` : "";
            const description = item.description ? `<p>${escapeRoadmapText(item.description)}</p>` : "";
            const documentLinks = roadmapItems(item.officialLinks).map(renderRoadmapLink).filter(Boolean);
            return `<li><strong>${escapeRoadmapText(item.title)}</strong> <span class="roadmap-requirement">${escapeRoadmapText(item.requirement)}</span>${condition}${description}${documentLinks.length ? `<div class="roadmap-links">${documentLinks.join(" ")}</div>` : ""}</li>`;
        }).join("")}</ul></section>`);
    }

    if(mistakes.length){
        sections.push(`<section class="roadmap-section"><h5>Common mistakes</h5><ul>${mistakes.map(item => `<li>${escapeRoadmapText(item)}</li>`).join("")}</ul></section>`);
    }

    if(estimate && typeof estimate === "object"){
        const bounds = [estimate.minimum, estimate.maximum]
            .filter(value => typeof value === "number");
        const duration = bounds.length
            ? `<p>Published range: ${bounds.map(escapeRoadmapText).join("–")} ${escapeRoadmapText(estimate.unit)}</p>`
            : "";
        sections.push(`<section class="roadmap-section"><h5>Government timeline</h5><p>${escapeRoadmapText(estimate.description)}</p><p>Applies to: ${escapeRoadmapText(estimate.scope)}</p>${duration}<div class="roadmap-links">${renderRoadmapLink(estimate.source)}</div></section>`);
    }

    if(links.length){
        const sourceLinks = links.map(renderRoadmapLink).filter(Boolean);
        if(sourceLinks.length){
            sections.push(`<section class="roadmap-section"><h5>Official sources</h5><ul>${sourceLinks.map(link => `<li>${link}</li>`).join("")}</ul></section>`);
        }
    }

    return `<details class="roadmap-details"><summary>Preparation &amp; official guidance</summary><div class="roadmap-details-content">${sections.join("")}</div></details>`;
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


Started: ${formatDate(record.startedAt)}

<br>

Finished: ${formatDate(record.completedAt)}

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

timeline(s)




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

timeline(s)




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

timeline(s)




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
        const step = state.roadmap?.steps.find(item => item.order === stepOrder);
        if(!step) return;
        const existing = getTimelineRecord(stepOrder);
        if(existing?.status === "completed") return;

        const response = await fetch(existing ? "/api/timeline/complete" : "/api/timeline/start", {
            method:existing ? "PUT" : "POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({
                pathway:state.pathway,
                profileKey:state.profileKey,
                stepOrder:step.order
            })
        });
        const result = await response.json();
        if(!response.ok) throw new Error(result.message || "Could not update this step.");

        if(existing){
            state.completedSteps = [...new Set([...state.completedSteps, step.order])];
            await updateJourneyProgress();
        }
        await reloadJourney();
        showJourneyNotice("");
    } catch(error){
        console.error("Step action failed:", error);
        showJourneyNotice(error.message || "Could not update this step. Reload Journey and try again.");
    }
}

async function updateJourneyProgress(){
    const username = localStorage.getItem("username");
    const response = await fetch(`/api/journey/progress/${encodeURIComponent(username)}`, {
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
            profileKey:state.profileKey,
            completedSteps:state.completedSteps,
            currentStep:getCurrentStep()
        })
    });
    const result = await response.json();
    if(!response.ok) throw new Error(result.message || "Could not save Journey progress.");
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
// TIMELINE DATE EDITOR
// ============================================

function dateInputValue(value){
    if(!value) return "";
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dateInputToIso(value){
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if(!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localNoon = new Date(year, month - 1, day, 12);
    if(localNoon.getFullYear() !== year ||
        localNoon.getMonth() !== month - 1 ||
        localNoon.getDate() !== day) return null;
    return localNoon.toISOString();
}

function showTimelineEditError(message){
    const error = document.getElementById("timeline-edit-error");
    error.textContent = message;
    error.hidden = !message;
}

function showJourneyNotice(message){
    const notice = document.getElementById("journey-notice");
    notice.textContent = message;
    notice.hidden = !message;
}

function openTimelineDateEditor(stepOrder){
    const record = getTimelineRecord(stepOrder);
    const step = state.roadmap?.steps.find(item => item.order === stepOrder);
    if(!record || !record._id || !step) return;

    const dialog = document.getElementById("timeline-edit-dialog");
    const form = document.getElementById("timeline-edit-form");
    const start = document.getElementById("timeline-start-date");
    const finish = document.getElementById("timeline-finish-date");
    const completed = record.status === "completed";

    form.dataset.recordId = record._id;
    form.dataset.completed = String(completed);
    document.getElementById("timeline-edit-step").textContent = step.title;
    start.value = dateInputValue(record.startedAt);
    finish.value = completed ? dateInputValue(record.completedAt) : "";
    start.max = dateInputValue(new Date());
    finish.max = start.max;
    document.getElementById("timeline-finish-field").hidden = !completed;
    finish.required = completed;
    showTimelineEditError("");
    if(!dialog.open) dialog.showModal();
}

async function saveTimelineDates(event){
    event.preventDefault();
    const form = event.currentTarget;
    const dialog = document.getElementById("timeline-edit-dialog");
    const save = document.getElementById("timeline-edit-save");
    const startValue = document.getElementById("timeline-start-date").value;
    const finishValue = document.getElementById("timeline-finish-date").value;
    const completed = form.dataset.completed === "true";
    const startedAt = dateInputToIso(startValue);
    const completedAt = completed ? dateInputToIso(finishValue) : null;

    if(!startedAt || (completed && !completedAt)){
        showTimelineEditError("Enter valid dates.");
        return;
    }
    if(completed && finishValue < startValue){
        showTimelineEditError("Finish date cannot be before start date.");
        return;
    }

    const username = localStorage.getItem("username");
    if(!username){
        showTimelineEditError("Sign in again before editing dates.");
        return;
    }

    const body = { username, startedAt };
    if(completed) body.completedAt = completedAt;
    save.disabled = true;
    showTimelineEditError("");

    let saved = false;
    try{
        const response = await fetch(`/api/timeline/edit/${encodeURIComponent(form.dataset.recordId)}`, {
            method:"PUT",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify(body)
        });
        const result = await response.json();
        if(!response.ok) throw new Error(result.message || "Could not save dates.");

        saved = true;
        dialog.close();
        await reloadJourney();
        showJourneyNotice(result.analyticsUpdated === false
            ? "Dates saved. Community average could not be refreshed; try again later."
            : "Timeline dates saved.");
    }
    catch(error){
        if(saved){
            showJourneyNotice("Dates saved, but the Journey page could not refresh. Reload the page.");
        } else {
            showTimelineEditError(error.message || "Could not save dates.");
        }
    }
    finally{
        save.disabled = false;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================


function setupEventListeners(){
    journeyContainer.addEventListener("click", event => {
        const button = event.target.closest("button");
        if(!button) return;

        const stepOrder = Number(button.dataset.step);
        if(button.dataset.action === "start" || button.dataset.action === "complete"){
            handleStepAction(stepOrder);
        } else if(button.dataset.action === "edit-dates"){
            openTimelineDateEditor(stepOrder);
        }
    });

    document.getElementById("timeline-edit-form")
        .addEventListener("submit", saveTimelineDates);
    document.getElementById("timeline-edit-cancel")
        .addEventListener("click", () => {
            document.getElementById("timeline-edit-dialog").close();
        });
}

// ============================================
// START APPLICATION
// ============================================


setupEventListeners();


initializeJourney();
