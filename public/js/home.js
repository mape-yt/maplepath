async function updateCoverageCounts(){
    try{
        const response = await fetch("/api/options");
        if(!response.ok) return;

        const options = await response.json();
        const expressEntryStreams = options.streams?.["Express Entry"] ?? [];
        const provincialStreams = options.streams?.["Provincial Nominee Program"] ?? [];
        const provincialNames = new Set(
            provincialStreams
                .map(stream => options.streamProvinces?.[stream])
                .filter(Boolean)
        );

        const expressEntryCount = document.getElementById("express-entry-count");
        const pnpProvinceCount = document.getElementById("pnp-province-count");

        if(expressEntryCount && expressEntryStreams.length){
            expressEntryCount.textContent = String(expressEntryStreams.length);
        }
        if(pnpProvinceCount && provincialNames.size){
            pnpProvinceCount.textContent = String(provincialNames.size);
        }
    } catch(error){
        // Keep the current server-rendered counts when the options API is unavailable.
    }
}

updateCoverageCounts();
