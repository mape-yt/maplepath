const fs = require("node:fs");
const path = require("node:path");

// These are the roadmaps the Journey UI can actually load. Keep profile keys
// stable: timeline records, community averages, and saved progress use them.
const roadmaps = [
    { pathway:"Express Entry", stream:"Canadian Experience Class (CEC)", profileKey:"EE-CEC", file:"express-entry/cec.json" },
    { pathway:"Express Entry", stream:"Federal Skilled Worker Program (FSWP)", profileKey:"EE-FSWP", file:"express-entry/fswp.json" },
    { pathway:"Express Entry", stream:"Federal Skilled Trades Program (FSTP)", profileKey:"EE-FSTP", file:"express-entry/fstp.json" },
    { pathway:"Provincial Nominee Program", stream:"Alberta Opportunity Stream (AAIP)", province:"Alberta", profileKey:"PNP-AAIP-AOS", file:"pnp/alberta-opportunity-stream.json" },
    { pathway:"Provincial Nominee Program", stream:"Skilled Worker in Manitoba (MPNP)", province:"Manitoba", profileKey:"PNP-MPNP-SWM", file:"pnp/manitoba-skilled-worker-in-manitoba.json" },
    { pathway:"Provincial Nominee Program", stream:"BC PNP Skilled Worker (Base)", province:"British Columbia", profileKey:"PNP-BC-SW-BASE", file:"pnp/british-columbia-skilled-worker-base.json" },
    { pathway:"Provincial Nominee Program", stream:"BC PNP Skilled Worker – Express Entry BC", province:"British Columbia", profileKey:"PNP-BC-SW-EEBC", file:"pnp/british-columbia-skilled-worker-express-entry.json" },
    { pathway:"Provincial Nominee Program", stream:"Ontario Workforce Priority: TEER 0–3 (Base)", province:"Ontario", profileKey:"PNP-OINP-OWP03-BASE", file:"pnp/ontario-workforce-priority-teer-0-3-base.json" },
    { pathway:"Provincial Nominee Program", stream:"Ontario Workforce Priority: TEER 0–3 (Express Entry)", province:"Ontario", profileKey:"PNP-OINP-OWP03-EE", file:"pnp/ontario-workforce-priority-teer-0-3-express-entry.json" }
];

function findRoadmap(pathway, stream){
    return roadmaps.find(item => item.pathway === pathway && item.stream === stream) || null;
}

function roadmapForProfile(profile){
    return findRoadmap(profile?.pathway, profile?.stream);
}

function loadRoadmap(definition){
    if(!definition) return null;
    const roadmap = JSON.parse(fs.readFileSync(path.join(__dirname, definition.file), "utf8"));
    return { ...roadmap, profileKey:definition.profileKey };
}

module.exports = { roadmaps, findRoadmap, roadmapForProfile, loadRoadmap };
