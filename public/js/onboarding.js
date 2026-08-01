const form = document.getElementById("onboardingForm");


form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const username = localStorage.getItem("username");


    if (!username) {

        alert("User session not found. Please login again.");

        window.location.href = "auth.html";

        return;

    }


    const profileData = {

        pathway: document.getElementById("pathway").value,

        province: document.getElementById("province").value,

        location: document.getElementById("location").value,

        status: document.getElementById("status").value,

        currentStage: document.getElementById("currentStage").value,

        journeyStartDate:
            document.getElementById("journeyStartDate").value

    };


    try {


        const response = await fetch(
            `/api/profile/${username}`,
            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(profileData)

            }
        );


        const data = await response.json();


        if (response.ok) {


            alert("Profile completed successfully!");


            window.location.href = "dashboard.html";


        } 
        
        else {


            alert(data.message);


        }


    }


    catch(error) {


        console.error(error);


        alert("Unable to connect to server.");


    }


});