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
    { pathway:"Provincial Nominee Program", stream:"NBPNP Express Entry: New Brunswick Interest", province:"New Brunswick", profileKey:"PNP-NB-EE-INTEREST", file:"pnp/new-brunswick-express-entry-interest.json" },
    { pathway:"Provincial Nominee Program", stream:"NSNP Skilled Worker", province:"Nova Scotia", profileKey:"PNP-NS-SW", file:"pnp/nova-scotia-skilled-worker.json" },
    { pathway:"Provincial Nominee Program", stream:"NSNP Nova Scotia Graduate", province:"Nova Scotia", profileKey:"PNP-NS-GRAD", file:"pnp/nova-scotia-graduate.json" },
    { pathway:"Provincial Nominee Program", stream:"NSNP Entrepreneur", province:"Nova Scotia", profileKey:"PNP-NS-ENT", file:"pnp/nova-scotia-entrepreneur.json" },
    { pathway:"Provincial Nominee Program", stream:"NSNP Nova Scotia: Express Entry", province:"Nova Scotia", profileKey:"PNP-NS-EE", file:"pnp/nova-scotia-express-entry.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Skilled Worker in PEI", province:"Prince Edward Island", profileKey:"PNP-PEI-SW-IN", file:"pnp/prince-edward-island-skilled-worker-in-pei.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Skilled Worker Outside Canada", province:"Prince Edward Island", profileKey:"PNP-PEI-SW-OUT", file:"pnp/prince-edward-island-skilled-worker-outside-canada.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Critical Worker", province:"Prince Edward Island", profileKey:"PNP-PEI-CW", file:"pnp/prince-edward-island-critical-worker.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP International Graduate", province:"Prince Edward Island", profileKey:"PNP-PEI-IG", file:"pnp/prince-edward-island-international-graduate.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Intermediate Experience", province:"Prince Edward Island", profileKey:"PNP-PEI-IE", file:"pnp/prince-edward-island-intermediate-experience.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Occupations in Demand", province:"Prince Edward Island", profileKey:"PNP-PEI-OID", file:"pnp/prince-edward-island-occupations-in-demand.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Express Entry", province:"Prince Edward Island", profileKey:"PNP-PEI-EE", file:"pnp/prince-edward-island-express-entry.json" },
    { pathway:"Provincial Nominee Program", stream:"PEI PNP Work Permit Stream", province:"Prince Edward Island", profileKey:"PNP-PEI-WP", file:"pnp/prince-edward-island-work-permit-stream.json" },
    { pathway:"Provincial Nominee Program", stream:"NLPNP Express Entry Skilled Worker", province:"Newfoundland and Labrador", profileKey:"PNP-NL-EE-SW", file:"pnp/newfoundland-labrador-express-entry-skilled-worker.json" },
    { pathway:"Provincial Nominee Program", stream:"NLPNP Skilled Worker", province:"Newfoundland and Labrador", profileKey:"PNP-NL-SW", file:"pnp/newfoundland-labrador-skilled-worker.json" },
    { pathway:"Provincial Nominee Program", stream:"NLPNP International Graduate", province:"Newfoundland and Labrador", profileKey:"PNP-NL-IG", file:"pnp/newfoundland-labrador-international-graduate.json" },
    { pathway:"Provincial Nominee Program", stream:"NLPNP International Entrepreneur", province:"Newfoundland and Labrador", profileKey:"PNP-NL-ENT", file:"pnp/newfoundland-labrador-international-entrepreneur.json" },
    { pathway:"Provincial Nominee Program", stream:"NLPNP International Graduate Entrepreneur", province:"Newfoundland and Labrador", profileKey:"PNP-NL-IGE", file:"pnp/newfoundland-labrador-international-graduate-entrepreneur.json" }
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
