const bcrypt = require("bcrypt");
const users = require("../data/users");
const User = require("../models/User");

exports.signup = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required."
        });
    }

    const existingUser = users.find(
        user => user.username === username
    );

    if (existingUser) {
        return res.status(409).json({
            message: "Username already exists."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User(
        username,
        hashedPassword
    );

    users.push(newUser);

    res.status(201).json({
        message: "Account created successfully."
    });

};

exports.login = async (req, res) => {

    const { username, password } = req.body;

    const user = users.find(
        user => user.username === username
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password
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

};