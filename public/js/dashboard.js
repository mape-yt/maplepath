async function loadProfile() {

    try {

        const response = await fetch("/api/profile");

        const profile = await response.json();

        document.getElementById("welcome-title").textContent =
            `Welcome Back, ${profile.name}!`;

        document.getElementById("profile-name").textContent =
            profile.name;

        document.getElementById("profile-status").textContent =
            profile.status;

        document.getElementById("profile-province").textContent =
            profile.province;

        document.getElementById("profile-program").textContent =
            profile.program;

        document.getElementById("profile-crs").textContent =
            profile.crs;

        document.getElementById("progress-percent").textContent =
            profile.progress + "%";

        document.getElementById("progress-fill").style.width =
            profile.progress + "%";

    }

    catch (error) {

        console.error(error);

    }

}

loadProfile();