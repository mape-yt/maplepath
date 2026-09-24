// MaplePath shared navigation loader

async function loadSidebar() {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    try {
        const response = await fetch("components/sidebar.html");
        if (!response.ok) throw new Error(`Sidebar request failed (${response.status})`);

        sidebarContainer.innerHTML = await response.text();

        const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
        const currentLink = sidebarContainer.querySelector(`[data-page="${currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add("is-active");
            currentLink.setAttribute("aria-current", "page");
        }
    } catch (error) {
        console.error("Sidebar loading failed:", error);
    }
}

loadSidebar();
