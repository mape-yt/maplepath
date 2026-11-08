(function(){
    const $=id=>document.getElementById(id);
    const fragment=new URLSearchParams(location.hash.slice(1));
    let token=fragment.get('token');
    const purpose=fragment.get('purpose');
    const hasLink=Boolean(location.hash);
    history.replaceState(null,'',location.pathname); // Do not retain the token in the address bar/history entry.
    const validLink=token && /^[a-f0-9]{64}$/.test(token) && ['reset','verify'].includes(purpose);
    if(hasLink&&!validLink){$('recovery-form').hidden=true;$('recovery-message').textContent='This link is invalid. Request a new one.';return;}
    if(!validLink){
        $('recovery-submit').disabled=true;
        fetch('/api/account/availability',{cache:'no-store'}).then(async response=>{
            if(!response.ok)throw new Error('unavailable');
            const data=await response.json();
            if(data.emailRecoveryAvailable)$('recovery-submit').disabled=false;
            else{$('recovery-form').hidden=true;$('recovery-message').textContent='Email recovery is not available yet. Your current username and password still work.';}
        }).catch(()=>{$('recovery-message').textContent='Unable to check email availability. Reload to try again.';});
    }
    if(validLink){
        $('recovery-email-fields').hidden=true;$('recovery-email').required=false;
        $('recovery-heading').textContent=purpose==='verify'?'Verify your email':'Choose a new password';
        $('recovery-note').textContent=purpose==='verify'?'Confirm to link this email to your MaplePath account.':'Resetting your password signs you out on all devices.';
        $('recovery-submit').textContent=purpose==='verify'?'Verify email':'Reset password';
        $('recovery-password-fields').hidden=purpose!=='reset';
        $('recovery-password').required=purpose==='reset';$('recovery-confirm').required=purpose==='reset';
    }
    $('recovery-form').addEventListener('submit',async event=>{
        event.preventDefault();const button=$('recovery-submit');if(button.disabled)return;
        $('recovery-message').textContent='';
        if(purpose==='reset'&&$('recovery-password').value!==$('recovery-confirm').value){$('recovery-message').textContent='The passwords do not match.';return;}
        button.disabled=true;
        try{
            const path=validLink?(purpose==='verify'?'verify-email':'reset-password'):'forgot-password';
            const body=validLink?{token,password:$('recovery-password').value}:{email:$('recovery-email').value};
            const response=await fetch('/api/account/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'MaplePath'},body:JSON.stringify(body)});
            const data=await response.json();$('recovery-message').textContent=data.message;
            if(response.ok){$('recovery-form').hidden=true;token=null;$('recovery-password').value='';$('recovery-confirm').value='';if(validLink)localStorage.removeItem('username');}
        }catch{$('recovery-message').textContent='Unable to connect. Please try again.';}
        finally{button.disabled=false;}
    });
})();
