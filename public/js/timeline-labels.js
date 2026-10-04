(function(root,factory){const labels=factory();if(typeof module==='object'&&module.exports)module.exports=labels;else root.MaplePathTimelineLabels=labels;})(typeof globalThis!=='undefined'?globalThis:this,function(){
    // Explicit event names only. Other roadmaps keep the step title as context.
    const submissions=new Set(['Submit PR Application','Submit your study permit application','Submit the work permit application','Submit the bridging application','Apply for your PGWP']);
    function forStep(step){
        if(submissions.has(step.title))return {start:'Preparation began',finish:'Application submitted',action:'Record submission'};
        if(step.title==='Create Express Entry Profile')return {start:'Profile preparation began',finish:'Express Entry profile submitted',action:'Record profile submission'};
        if(step.title==='Receive Invitation to Apply')return {start:'Waiting began',finish:'Invitation received',action:'Record invitation'};
        if(['PR Decision','Wait for the decision'].includes(step.title))return {start:'Decision wait began',finish:'Decision received',action:'Record decision'};
        return {start:'Started this step',finish:'Finished this step',action:'Record completion'};
    }
    return {forStep};
});
