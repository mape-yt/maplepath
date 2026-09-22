const signupTab = document.getElementById("signup-tab");
const loginTab = document.getElementById("login-tab");

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");


// -------------------------
// TAB SWITCHING
// -------------------------

signupTab.addEventListener("click", () => {

    signupTab.classList.add("active");
    loginTab.classList.remove("active");

    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");

});


loginTab.addEventListener("click", () => {

    loginTab.classList.add("active");
    signupTab.classList.remove("active");

    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");

});


// -------------------------
// SIGNUP
// -------------------------

signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const username =
        document.getElementById("signup-username").value;


    const password =
        document.getElementById("signup-password").value;


    try {

        const response = await fetch("/api/auth/signup", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                username,
                password

            })

        });


        const data = await response.json();


        document.getElementById("signup-message").textContent =
            data.message;


    }


    catch {

        document.getElementById("signup-message").textContent =
            "Unable to connect to server.";

    }


});


// -------------------------
// LOGIN
// -------------------------

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const username =
        document.getElementById("login-username").value;


    const password =
        document.getElementById("login-password").value;


    try {

        const response = await fetch("/api/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                username,
                password

            })

        });


        const data = await response.json();


        document.getElementById("login-message").textContent =
            data.message;



        if (response.ok) {
            const sessionResponse = await fetch("/api/auth/session", {
                credentials: "same-origin",
                cache: "no-store"
            });
            if (!sessionResponse.ok) {
                document.getElementById("login-message").textContent =
                    "Login could not establish a session. Restart the MaplePath server and try again.";
                return;
            }
            const session = await sessionResponse.json();
            if (session.username !== data.username) {
                document.getElementById("login-message").textContent =
                    "Login could not be verified. Please try again.";
                return;
            }


            // Save logged-in user
            localStorage.setItem(
                "username",
                session.username
            );


            if (session.profileCompleted) {


                window.location.href = "dashboard.html";


            } else {


                window.location.href = "onboarding.html";


            }

        }


    }


    catch {


        document.getElementById("login-message").textContent =
            "Unable to connect to server.";

    }


});
