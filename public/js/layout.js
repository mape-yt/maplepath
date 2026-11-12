// Shared only by signed-in workspace pages.
async function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    try {
        const response = await fetch('components/sidebar.html');
        if (!response.ok) throw new Error('Navigation unavailable');
        container.innerHTML = await response.text();
        const updateCurrent = () => {
            const page = location.pathname.split('/').pop() || 'dashboard.html';
            const section = page === 'dashboard.html' && location.hash === '#tasks' ? 'tasks' : null;
            container.querySelectorAll('nav a').forEach(link => {
                const active = section ? link.dataset.section === section : (link.dataset.page === page || link.dataset.alsoPage === page);
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', section ? 'location' : 'page');
                else link.removeAttribute('aria-current');
            });
        };
        const openComparison = () => {
            const details = document.getElementById('community-options');
            if (details && location.hash === '#community-controls') details.open = true;
        };
        openComparison(); window.addEventListener('hashchange', openComparison);
        updateCurrent();
        window.addEventListener('hashchange', updateCurrent);
        container.querySelector('#sidebar-logout').addEventListener('click', async event => {
            const button = event.currentTarget;
            button.disabled = true;
            try { await window.MaplePathSession.logout(); }
            catch { container.querySelector('#sidebar-message').textContent = 'Unable to sign out. Please retry.'; button.disabled = false; }
        });
    } catch {
        container.textContent = 'Navigation could not load. Reload to retry.';
    }
}
loadSidebar();
