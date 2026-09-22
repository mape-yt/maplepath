window.MaplePathSession = {
    async current(){
        try{
            const response = await fetch("/api/auth/session", {
                credentials:"same-origin",
                cache:"no-store"
            });
            return response.ok ? await response.json() : null;
        } catch(error){
            return null;
        }
    },

    async require(){
        const session = await this.current();
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
