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
    application:null,


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

        await window.MaplePathApplications.load(state.profileKey,state.pathway);



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

    state.application = progress.application || null;



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
        (await response.json()).filter(record => record.profileKey === state.profileKey && (state.application
            ? record.applicationId === state.application.id || (state.application.includesLegacy && !record.applicationId)
            : !record.applicationId));



}







// ============================================
// COMMUNITY ANALYTICS LOADING
// ============================================


async function loadCommunityAnalytics(){
    const requestId = (state.analyticsRequest || 0) + 1;
    state.analyticsRequest = requestId;
    state.timelineAverages = [];
    if(!state.roadmap || !state.profileKey) return;
    const controls = document.getElementById("community-controls");
    controls.hidden = false;
    const location = document.getElementById("community-location").value;
    const permit = ["Study Permit","Work Permit"].includes(state.pathway);
    document.getElementById("community-permit-field").hidden = !permit;
    const locationOptions = document.getElementById("community-location").options;
    locationOptions[1].textContent = permit ? "Inside Canada when submitted" : "Inside Canada when recorded";
    locationOptions[2].textContent = permit ? "Outside Canada when submitted" : "Outside Canada when recorded";
    const permitType = permit ? document.getElementById("community-permit-type").value : "all";
    try {
        const response = await fetch(`/api/analytics/pathway/${encodeURIComponent(state.profileKey)}?location=${encodeURIComponent(location)}&permitType=${encodeURIComponent(permitType)}`);
        if(!response.ok) throw new Error("Community data unavailable");
        const result = await response.json();
        if (!Array.isArray(result.steps)) throw new Error("Invalid community response");
        if (state.analyticsRequest === requestId) state.timelineAverages = result.steps;
    } catch(error) {
        if (state.analyticsRequest === requestId) state.timelineAverages = state.roadmap.steps.map(step => ({stepOrder:step.order, status:"unavailable"}));
    }
}

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

                    Roadmap progress

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

                    ${state.application ? "Application submitted" : "Started preparing"}

                </h3>


                <p>

                    ${
                        formatDate(
                            state.application ? state.application.submittedOn : state.profile.journeyStartDate
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
                        state.application?.outcome ? escapeRoadmapText(`${state.pathway === "Provincial Nominee Program" ? "Provincial application" : "Application"} ${state.application.outcome}`) : completed === total
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
        "route-dependent":"Federal route depends on the nomination",
        "study-permit":"Study permit · temporary residence",
        "work-permit":"Work permit · temporary residence"
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
    </aside>${renderRelatedPathways(roadmap)}`;
}

function renderRelatedPathways(roadmap){
    if(!roadmap.scopeNote && !roadmap.relatedPathways?.length) return "";
    const items = (roadmap.relatedPathways || []).map(entry => `<article>
        <h3>${escapeRoadmapText(entry.label)}</h3>
        <p>${escapeRoadmapText(entry.description)}</p>
        ${(entry.officialLinks || []).map(renderRoadmapLink).join(" ")}
        <p><a href="${escapeRoadmapText(MaplePathContext.profileLink(entry))}">Choose this pathway →</a></p>
    </article>`).join("");
    return `<details class="related-pathways"><summary>About this permit &amp; related pathways</summary>
        <p>${escapeRoadmapText(roadmap.scopeNote || "")}</p>${items}</details>`;
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


function renderTimelineInformation(step, record, average){
    let html = "";
    if(record?.status === "completed" && record.startedAt && record.completedAt){
        const span = new Date(record.completedAt) - new Date(record.startedAt);
        if(Number.isFinite(span) && span >= 0) record = {...record, durationDays:Math.max(1, Math.round(span / 86400000))};
    }
    if(record){
        const labels=MaplePathTimelineLabels.forStep(step);
        html = `${escapeRoadmapText(labels.start)}: ${record.startedAt ? escapeRoadmapText(formatDate(record.startedAt)) : "Not recorded"}`;
        if(record.status === "completed"){
            if(!record.startedAt || !record.completedAt)record={...record,durationDays:null};
            html += `<br>${escapeRoadmapText(labels.finish)}: ${record.completedAt ? escapeRoadmapText(formatDate(record.completedAt)) : "Not recorded"}
                <br>${record.durationDays == null ? "Add both dates later to calculate duration." : `Duration: ${escapeRoadmapText(record.durationDays)} days`}`;
        }
    }
    return html + MaplePathCommunity.render(average, record);
}

function renderActionButton(step,record,completed){
    if(completed && record)return '<button class="complete-btn completed" disabled>Completed</button>';
    const action=record?.status==='in-progress'?'complete':'start';
    const text=action==='complete'?MaplePathTimelineLabels.forStep(step).action:'Record progress';
    return `<button type="button" class="complete-btn" data-action="${action}" data-step="${escapeRoadmapText(step.order)}">${escapeRoadmapText(text)}</button>`;
}


async function handleStepAction(stepOrder){
    openTimelineDateEditor(stepOrder,getTimelineRecord(stepOrder)?'complete':'new');
}


async function updateJourneyProgress(){
    const username = localStorage.getItem("username");
    const response = await fetch(`/api/journey/progress/${encodeURIComponent(username)}`, {
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
            profileKey:state.profileKey,
            applicationId:state.application?.id || null,
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

function openTimelineDateEditor(stepOrder,mode='edit'){
    const record=getTimelineRecord(stepOrder);
    const step=state.roadmap?.steps.find(item=>item.order===stepOrder);
    if(!step || (mode!=='new' && !record?._id))return;
    const form=document.getElementById('timeline-edit-form');
    if(document.getElementById('timeline-edit-save').disabled)return;
    form.dataset.recordId=record?._id || '';
    form.dataset.stepOrder=stepOrder;
    form.dataset.mode=mode;
    form.dataset.completed=String(mode==='complete' || record?.status==='completed');
    const labels=MaplePathTimelineLabels.forStep(step);
    document.getElementById('timeline-edit-title').textContent=mode==='edit'?'Edit dates':'Record progress';
    document.getElementById('timeline-edit-step').textContent=step.title;
    document.getElementById('timeline-start-label').textContent=labels.start+' (optional)';
    document.getElementById('timeline-finish-label').textContent=labels.finish+' (optional)';
    const status=document.getElementById('timeline-status');
    status.options[0].textContent=labels.start;
    status.options[1].textContent=labels.finish;
    status.value=form.dataset.completed==='true'?'completed':'in-progress';
    document.getElementById('timeline-status-field').hidden=mode!=='new';
    const start=document.getElementById('timeline-start-date'),finish=document.getElementById('timeline-finish-date');
    start.value=dateInputValue(record?.startedAt);
    finish.value=dateInputValue(record?.completedAt);
    start.max=dateInputValue(new Date());finish.max=start.max;
    start.required=false;finish.required=false;
    document.getElementById('timeline-finish-field').hidden=status.value!=='completed';
    document.getElementById('timeline-edit-save').textContent=mode==='edit'?'Save dates':'Save progress';
    showTimelineEditError('');
    document.getElementById('timeline-edit-dialog').showModal();
}

async function saveTimelineDates(event){
    event.preventDefault();
    const form=event.currentTarget,save=document.getElementById('timeline-edit-save');
    if(save.disabled)return;
    const mode=form.dataset.mode;
    const completed=mode==='new'?document.getElementById('timeline-status').value==='completed':form.dataset.completed==='true';
    const startValue=document.getElementById('timeline-start-date').value,finishValue=document.getElementById('timeline-finish-date').value;
    const startedAt=startValue?dateInputToIso(startValue):null;
    const completedAt=completed && finishValue?dateInputToIso(finishValue):null;
    if((startValue && !startedAt)||(completed && finishValue && !completedAt))return showTimelineEditError('Enter a valid date or leave it blank.');
    if(startedAt && completedAt && completedAt<startedAt)return showTimelineEditError('The finish date cannot be before the start date. Correct it or leave an unknown date blank.');
    const body={startedAt};
    if(completed)body.completedAt=completedAt;
    if(mode!=='edit')Object.assign(body,{pathway:state.pathway,profileKey:state.profileKey,applicationId:state.application?.id || null,stepOrder:Number(form.dataset.stepOrder),status:completed?'completed':'in-progress'});
    const url=mode==='edit'?`/api/timeline/edit/${encodeURIComponent(form.dataset.recordId)}`:mode==='new'?'/api/timeline/start':'/api/timeline/complete';
    save.disabled=true;showTimelineEditError('');let saved=false;
    try{
        const response=await fetch(url,{method:mode==='new'?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const result=await response.json();if(!response.ok)throw new Error(result.message || 'Could not save progress.');
        saved=true;
        if(completed){
            state.completedSteps=[...new Set([...state.completedSteps,Number(form.dataset.stepOrder)])];
            await updateJourneyProgress();
        }
        document.getElementById('timeline-edit-dialog').close();
        await reloadJourney();
        showJourneyNotice('Saved. You can add or correct dates later.');
    }catch(error){
        if(saved){document.getElementById('timeline-edit-dialog').close();showJourneyNotice('Timeline saved, but progress could not refresh. Reload and save its dates again to retry.');}
        else showTimelineEditError(error.message || 'Could not save dates.');
    }finally{save.disabled=false;}
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

    document.getElementById('timeline-status').addEventListener('change',event=>{
        document.getElementById('timeline-finish-field').hidden=event.target.value!=='completed';
    });
    document.getElementById('timeline-edit-dialog').addEventListener('cancel',event=>{
        if(document.getElementById('timeline-edit-save').disabled)event.preventDefault();
    });
    document.getElementById("timeline-edit-form")
        .addEventListener("submit", saveTimelineDates);
    document.getElementById("timeline-edit-cancel")
        .addEventListener("click", () => {
            if(!document.getElementById("timeline-edit-save").disabled)document.getElementById("timeline-edit-dialog").close();
        });
}

// ============================================
// START APPLICATION
// ============================================


setupEventListeners();


initializeJourney();

// Disable during refresh so an older response cannot replace a newer selection.
for (const control of ["community-location","community-permit-type"]) document.getElementById(control).addEventListener("change", async event => {
    event.target.disabled = true;
    try { await loadCommunityAnalytics(); renderJourney(); }
    finally { event.target.disabled = false; }
});
