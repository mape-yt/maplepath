window.MaplePathSession = {
    async current(){
        try{
            const response = await fetch("/api/auth/session", {
                credentials:"same-origin",
                cache:"no-store"
            });
            if(response.status===401)return null;
            if(!response.ok)throw new Error(response.status===429 ? 'Too many requests. Wait a moment, then retry.' : 'Unable to check your session. Please retry.');
            return await response.json();
        } catch(error){
            throw new Error(error.message || "Unable to connect. Please retry.");
        }
    },

    async require(){
        let session;
        try {session=await this.current();}
        catch(error){
            let notice=document.getElementById('session-load-error');
            if(!notice){
                notice=document.createElement('section');notice.id='session-load-error';notice.setAttribute('role','alert');notice.tabIndex=-1;
                const message=document.createElement('p');message.textContent=error.message;
                const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.addEventListener('click',()=>window.location.reload());
                notice.append(message,retry);(document.querySelector('main')||document.body).prepend(notice);
            }
            notice.focus();return null;
        }
        if(!session){
            localStorage.removeItem("username");
            window.location.href = "auth.html";
            return null;
        }
        // Keep the existing page code in sync while APIs use the cookie.
        localStorage.setItem("username", session.username);
        return session;
    },

    async logout(){
        const response = await fetch("/api/auth/logout", {
            method:"POST",
            credentials:"same-origin"
        });
        if(!response.ok) throw new Error("Could not sign out. Please try again.");
        localStorage.removeItem("username");
        window.location.href = "auth.html";
    }
};
