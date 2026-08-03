// =================================
// MaplePath Shared Layout Loader
// =================================


async function loadSidebar() {

    const sidebarContainer =
        document.getElementById("sidebar-container");


    if (!sidebarContainer) {

        return;

    }


    try {

        const response =
            await fetch("components/sidebar.html");


        const html =
            await response.text();


        sidebarContainer.innerHTML = html;


    }


    catch(error) {

        console.error(
            "Sidebar loading failed:",
            error
        );

    }

}


loadSidebar();