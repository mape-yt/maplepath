(function() {
    const $ = id => document.getElementById(id);
    const fields = ['permitType','submissionLocation','submittedOn','outcome','decidedOn'];
    let context, busy=false, editing=null;
    async function request(url,method,body) {
        const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
        const data=await response.json();
        if(!response.ok)throw new Error(data.message || 'Could not load applications.');
        return data;
    }
    function setBusy(value) {
        busy=value;
        document.querySelectorAll('#application-controls button, #application-controls select, #application-form button').forEach(el=>el.disabled=value);
    }
    function open(application) {
        editing=application;
        const permit=['Study Permit','Work Permit'].includes(context.pathway);
        $('application-form').reset();
        $('application-title').textContent=application?'Edit application':context.applications.length?'New application':'Application details';
        $('application-help').textContent=!application && context.applications.length
            ? 'A separate application keeps its own timeline. To correct dates, edit the existing one.'
            : 'Optional details. Leave anything you do not know blank.';
        $('application-permit-fields').hidden=!permit;
        $('application-submission-label').textContent=context.pathway==='Provincial Nominee Program'
            ? 'Provincial application submitted' : permit ? 'Permit application submitted' : 'PR application submitted';
        $('application-result-label').textContent=context.pathway==='Provincial Nominee Program'?'Provincial result':'Application result';
        fields.forEach(key=>$('application-'+key).value=application?.[key] || '');
        const today=new Date().toISOString().slice(0,10);
        $('application-submittedOn').max=today;
        $('application-decidedOn').max=today;
        $('application-error').textContent='';
        $('application-dialog').showModal();
    }
    window.MaplePathApplications={async load(profileKey,pathway) {
        const data=await request('/api/applications','GET');
        if(data.profileKey!==profileKey)throw new Error('Your pathway changed. Reload Journey.');
        context={...data,pathway};
        const select=$('application-select');select.replaceChildren();
        if(!data.applications.length)select.add(new Option('Current timeline',''));
        if(data.applications.length && !data.selectedId)select.add(new Option('Choose a saved application',''));
        data.applications.forEach((app,index)=>select.add(new Option(`Application ${index+1}${app.submittedOn?' · '+app.submittedOn:''}${app.outcome?' · '+app.outcome:''}`,app.id)));
        select.value=data.selectedId || '';
        $('application-edit').textContent=data.selectedId?'Edit details':'Add details';
        $('application-new').hidden=!data.selectedId;
        $('application-controls').hidden=false;
    }};
    $('application-edit').addEventListener('click',()=>open(context.applications.find(app=>app.id===context.selectedId)));
    $('application-new').addEventListener('click',()=>open(null));
    $('application-cancel').addEventListener('click',()=>{if(!busy)$('application-dialog').close();});
    $('application-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('application-select').addEventListener('change',async event=>{
        if(busy || !event.target.value)return;setBusy(true);
        try {
            await request(`/api/applications/${encodeURIComponent(event.target.value)}/select`,'POST',{profileKey:context.profileKey});
            window.location.reload();
        } catch(err) {event.target.value=context.selectedId || '';$('application-notice').textContent=err.message;setBusy(false);}
    });
    $('application-form').addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;setBusy(true);$('application-error').textContent='';
        const body={profileKey:context.profileKey,applicationId:context.selectedId};
        fields.forEach(key=>body[key]=$('application-'+key).value);
        try {
            await request(editing?`/api/applications/${encodeURIComponent(editing.id)}`:'/api/applications',editing?'PUT':'POST',body);
            window.location.reload();
        } catch(err) {$('application-error').textContent=err.message;setBusy(false);}
    });
})();
