const immigrationOptions = {


    pathways: [

        "Express Entry",

        "Provincial Nominee Program",

        "Atlantic Immigration Program",

        "Family Sponsorship",

        "Study Permit to PR",

        "Other"

    ],



    streams: {


        "Provincial Nominee Program": [
            "Alberta Opportunity Stream (AAIP)",
            "Skilled Worker in Manitoba (MPNP)"
        ],

        "Express Entry": [

            "Canadian Experience Class (CEC)",

            "Federal Skilled Worker Program (FSWP)",

            "Federal Skilled Trades Program (FSTP)"

        ]


    },



    streamProvinces: {
        "Alberta Opportunity Stream (AAIP)": "Alberta",
        "Skilled Worker in Manitoba (MPNP)": "Manitoba"
    },

    provinces: [

        "Alberta",

        "British Columbia",

        "Manitoba",

        "New Brunswick",

        "Newfoundland and Labrador",

        "Northwest Territories",

        "Nova Scotia",

        "Nunavut",

        "Ontario",

        "Prince Edward Island",

        "Quebec",

        "Saskatchewan",

        "Yukon",

        "Not decided"

    ],



    locations: [

        "Inside Canada",

        "Outside Canada"

    ],



    statuses: [

        "Planning",

        "Study Permit",

        "Work Permit",

        "Visitor",

        "Preparing application",

        "Submitted application",

        "Waiting for decision"

    ],



    stages: [

        "Researching",

        "Improving eligibility",

        "Preparing documents",

        "Language Test",

        "Education Assessment",

        "Profile Submission",

        "Invitation to Apply",

        "Medical Exam",

        "Biometrics",

        "Background Check",

        "Final Decision",

        "Landed as PR"

    ],



    educationLevels: [

        "High School",

        "College Diploma",

        "Bachelor's Degree",

        "Master's Degree",

        "PhD"

    ]

};



module.exports = immigrationOptions;
