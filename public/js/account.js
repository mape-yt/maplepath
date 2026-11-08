(async function(){
    if (!await MaplePathSession.require()) return;
    const $=id=>document.getElementById(id);
    async function request(path,body){
        const response=await fetch('/api/account'+path,{method:body?'POST':'GET',cache:'no-store',
            headers:{'Content-Type':'application/json','X-Requested-With':'MaplePath'},body:body?JSON.stringify(body):undefined});
        const data=await response.json();
        if(!response.ok)throw new Error(data.message||'Please try again.');
        return data;
    }
    function signedOut(){localStorage.removeItem('username');localStorage.removeItem('journeyType');window.location.href='auth.html?mode=login';}
    function submit(id,work){
        const form=$(id);
        form.addEventListener('submit',async event=>{
            event.preventDefault();
            const button=form.querySelector('button');if(button.disabled)return;
            const message=form.querySelector('[role="status"]');message.textContent='';button.disabled=true;
            try {await work(message);form.querySelectorAll('input[type="password"]').forEach(input=>input.value='');}
            catch(error){message.textContent=error.message;}
            finally{button.disabled=false;}
        });
    }
    try {
        const data=await request('');
        $('account-content').hidden=false;
        $('email-status').textContent=data.email?`Verified: ${data.email}`:'No verified recovery email yet.';
        if(data.pendingEmail)$('email-status').textContent+=` Verification pending: ${data.pendingEmail}`;
        if(!data.emailRecoveryAvailable){$('email-form').hidden=true;$('email-status').textContent+=' Email setup will be available when MaplePath’s email service is connected.';}
    }catch(error){$('account-notice').textContent=error.message;}
    submit('email-form',async message=>{const data=await request('/email',{email:$('account-email').value,password:$('email-password').value});message.textContent=data.message;});
    submit('password-form',async()=>{
        if($('new-password').value!==$('confirm-password').value)throw new Error('The new passwords do not match.');
        await request('/password',{currentPassword:$('current-password').value,newPassword:$('new-password').value});signedOut();
    });
    submit('delete-form',async()=>{await request('/delete',{password:$('delete-password').value,confirmation:$('delete-confirmation').value});localStorage.removeItem('username');localStorage.removeItem('journeyType');window.location.href='auth.html?deleted=1';});
    submit('logout-all-form',async()=>{await request('/logout-all',{});signedOut();});
})();
