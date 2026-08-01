const bcrypt = require("bcrypt");
const User = require("../models/User");


exports.signup = async (req, res) => {

    try {

        const { username, password } = req.body;


        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }


        const existingUser = await User.findOne({
            username
        });


        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists."
            });
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const newUser = new User({

            username,

            passwordHash: hashedPassword

        });


        await newUser.save();


        res.status(201).json({
            message: "Account created successfully."
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

};



exports.login = async (req, res) => {

    try {

        const { username, password } = req.body;


        const user = await User.findOne({
            username
        });


        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }


        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );


        if (!passwordMatches) {
            return res.status(401).json({
                message: "Incorrect password."
            });
        }


        res.json({

            message: "Login successful.",

            username: user.username

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

};