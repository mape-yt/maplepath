(async function(){
    try {
        const response=await fetch('/api/support',{cache:'no-store'});
        if(!response.ok)return;
        const data=await response.json();
        if(typeof data.email!=='string'||!/^[-a-z0-9._+]+@[-a-z0-9.]+\.[a-z]{2,}$/i.test(data.email))return;
        document.querySelectorAll('[data-support-email]').forEach(link=>{link.textContent=data.email;link.href='mailto:'+data.email;});
    }catch{/* Keep the published contact address when the server is waking up. */}
})();
