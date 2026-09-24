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
    { pathway:"Provincial Nominee Program", stream:"Ontario Workforce Priority: TEER 0–3 (Express Entry)", province:"Ontario", profileKey:"PNP-OINP-OWP03-EE", file:"pnp/ontario-workforce-priority-teer-0-3-express-entry.json" },
    { pathway:"Provincial Nominee Program", stream:"SINP International Skilled Worker: Saskatchewan Express Entry", province:"Saskatchewan", profileKey:"PNP-SINP-ISW-EE", file:"pnp/saskatchewan-international-skilled-worker-express-entry.json" },
    { pathway:"Provincial Nominee Program", stream:"SINP International Skilled Worker: Occupations In-Demand", province:"Saskatchewan", profileKey:"PNP-SINP-ISW-OID", file:"pnp/saskatchewan-international-skilled-worker-occupations-in-demand.json" },
    { pathway:"Provincial Nominee Program", stream:"SINP International Skilled Worker: Employment Offer", province:"Saskatchewan", profileKey:"PNP-SINP-ISW-EO", file:"pnp/saskatchewan-international-skilled-worker-employment-offer.json" },
    { pathway:"Provincial Nominee Program", stream:"NBPNP Skilled Worker: New Brunswick Experience", province:"New Brunswick", profileKey:"PNP-NB-SW-EXP", file:"pnp/new-brunswick-skilled-worker-experience.json" },
    { pathway:"Provincial Nominee Program", stream:"NBPNP Skilled Worker: New Brunswick Graduates", province:"New Brunswick", profileKey:"PNP-NB-SW-GRAD", file:"pnp/new-brunswick-skilled-worker-graduates.json" },
    { pathway:"Provincial Nominee Program", stream:"NBPNP Skilled Worker: New Brunswick Priority Occupations", province:"New Brunswick", profileKey:"PNP-NB-SW-PRIORITY", file:"pnp/new-brunswick-skilled-worker-priority-occupations.json" },
    { pathway:"Provincial Nominee Program", stream:"NBPNP Express Entry: Employment in New Brunswick", province:"New Brunswick", profileKey:"PNP-NB-EE-EMP", file:"pnp/new-brunswick-express-entry-employment.json" },
    { pathway:"Provincial Nominee Program", stream:"NBPNP Express Entry: New Brunswick Interest", province:"New Brunswick", profileKey:"PNP-NB-EE-INTEREST", file:"pnp/new-brunswick-express-entry-interest.json" }
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
