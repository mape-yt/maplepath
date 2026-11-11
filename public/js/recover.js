(function(){
    const $=id=>document.getElementById(id);
    let token=null,purpose=null,validLink=false,generation=0;
    async function initialize(){
        const current=++generation;
        const fragment=new URLSearchParams(location.hash.slice(1));
        const hasLink=Boolean(location.hash);
        token=fragment.get('token');purpose=fragment.get('purpose');
        history.replaceState(null,'',location.pathname); // Remove the token immediately, including same-tab links.
        validLink=Boolean(token && /^[a-f0-9]{64}$/.test(token) && ['reset','verify'].includes(purpose));
        $('recovery-message').textContent='';$('recovery-form').reset();$('recovery-form').hidden=false;
        $('recovery-email-fields').hidden=validLink;$('recovery-email').required=!validLink;
        const reset=validLink&&purpose==='reset';
        $('recovery-password-fields').hidden=!reset;$('recovery-password').required=reset;$('recovery-confirm').required=reset;
        $('recovery-heading').textContent=validLink?(reset?'Choose a new password':'Verify your email'):'Reset your password';
        $('recovery-note').textContent=validLink?(reset?'Resetting your password signs you out on all devices.':'Confirm to link this email to your MaplePath account.'):'Use the email you verified in Account.';
        $('recovery-submit').textContent=validLink?(reset?'Reset password':'Verify email'):'Send reset link';
        $('recovery-submit').disabled=!validLink;
        if(hasLink&&!validLink){$('recovery-form').hidden=true;$('recovery-message').textContent='This link is invalid. Request a new one.';return;}
        if(validLink)return;
        try{
            const response=await fetch('/api/account/availability',{cache:'no-store'});
            if(!response.ok)throw Error('unavailable');
            const data=await response.json();if(current!==generation)return;
            if(data.emailRecoveryAvailable)$('recovery-submit').disabled=false;
            else{$('recovery-form').hidden=true;$('recovery-message').textContent='Email recovery is not available yet. Your current username and password still work.';}
        }catch{if(current===generation)$('recovery-message').textContent='Unable to check email availability. Reload to try again.';}
    }
    window.addEventListener('hashchange',initialize);
    $('recovery-form').addEventListener('submit',async event=>{
        event.preventDefault();const button=$('recovery-submit');if(button.disabled)return;
        const current=generation;
        $('recovery-message').textContent='';
        if(purpose==='reset'&&$('recovery-password').value!==$('recovery-confirm').value){$('recovery-message').textContent='The passwords do not match.';return;}
        button.disabled=true;
        try{
            const path=validLink?(purpose==='verify'?'verify-email':'reset-password'):'forgot-password';
            const body=validLink?{token,password:$('recovery-password').value}:{email:$('recovery-email').value};
            const response=await fetch('/api/account/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'MaplePath'},body:JSON.stringify(body)});
            const data=await response.json();if(current!==generation)return;
            $('recovery-message').textContent=data.message;
            if(response.ok){$('recovery-form').hidden=true;token=null;$('recovery-password').value='';$('recovery-confirm').value='';if(validLink){localStorage.removeItem('username');localStorage.removeItem('journeyType');}}
        }catch{if(current===generation)$('recovery-message').textContent='Unable to connect. Please try again.';}
        finally{if(current===generation)button.disabled=false;}
    });
    initialize();
})();
