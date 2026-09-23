const signupTab = document.getElementById("signup-tab");
const loginTab = document.getElementById("login-tab");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const signupMessage = document.getElementById("signup-message");
const loginMessage = document.getElementById("login-message");

function setMessage(element, message, success = false) {
    element.textContent = message || "";
    element.classList.toggle("is-success", success);
}

function setMode(mode, updateUrl = true) {
    const showLogin = mode === "login";

    signupTab.classList.toggle("is-active", !showLogin);
    loginTab.classList.toggle("is-active", showLogin);
    signupTab.setAttribute("aria-selected", String(!showLogin));
    loginTab.setAttribute("aria-selected", String(showLogin));

    signupForm.classList.toggle("hidden", showLogin);
    loginForm.classList.toggle("hidden", !showLogin);

    if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", showLogin ? "login" : "signup");
        window.history.replaceState({}, "", url);
    }
}

function setSubmitting(form, submitting) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = submitting;
    button.setAttribute("aria-busy", String(submitting));
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return { message: "The server returned an unexpected response." };
    }
}

signupTab.addEventListener("click", () => {
    setMessage(signupMessage, "");
    setMode("signup");
});

loginTab.addEventListener("click", () => {
    setMessage(loginMessage, "");
    setMode("login");
});

document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const showing = input.type === "text";

        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
        button.setAttribute("aria-label", (showing ? "Show" : "Hide") + " password");
    });
});

signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage(signupMessage, "");

    if (!signupForm.reportValidity()) {
        return;
    }

    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;

    setSubmitting(signupForm, true);

    try {
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await readJson(response);

        if (!response.ok) {
            setMessage(signupMessage, data.message || "Unable to create your account.");
            return;
        }

        signupForm.reset();
        setMode("login");
        document.getElementById("login-username").value = username;
        setMessage(loginMessage, "Account created. Sign in to build your roadmap.", true);
        document.getElementById("login-password").focus();
    } catch {
        setMessage(signupMessage, "Unable to connect to MaplePath. Please try again.");
    } finally {
        setSubmitting(signupForm, false);
    }
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage(loginMessage, "");

    if (!loginForm.reportValidity()) {
        return;
    }

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    setSubmitting(loginForm, true);

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await readJson(response);

        if (!response.ok) {
            setMessage(loginMessage, data.message || "Unable to sign in.");
            return;
        }

        const sessionResponse = await fetch("/api/auth/session", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!sessionResponse.ok) {
            setMessage(loginMessage, "Your session could not be verified. Please try again.");
            return;
        }

        const session = await readJson(sessionResponse);

        if (session.username !== data.username) {
            setMessage(loginMessage, "Your session could not be verified. Please try again.");
            return;
        }

        localStorage.setItem("username", session.username);
        window.location.href = session.profileCompleted
            ? "dashboard.html"
            : "onboarding.html";
    } catch {
        setMessage(loginMessage, "Unable to connect to MaplePath. Please try again.");
    } finally {
        setSubmitting(loginForm, false);
    }
});

const requestedMode = new URLSearchParams(window.location.search).get("mode");
setMode(requestedMode === "login" ? "login" : "signup", false);
