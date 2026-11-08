const { passwordError, matches, hashPassword } = require('../services/passwords');
const User = require("../models/User");
const { createSession, endSession } = require("../middleware/auth");

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

exports.signup = async (req, res) => {
    try {
        const username = typeof req.body?.username === "string"
            ? req.body.username.trim()
            : "";
        const password = typeof req.body?.password === "string"
            ? req.body.password
            : "";

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        if (username.length < 3 || username.length > 40 ||
            !USERNAME_PATTERN.test(username)) {
            return res.status(400).json({
                message: "Username must be 3–40 characters and use only letters, numbers, periods, underscores, or hyphens."
            });
        }

        const error = passwordError(password);
        if (error) {
            return res.status(400).json({
                message: error
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists."
            });
        }

        const passwordHash = await hashPassword(password);

        await User.create({
            username,
            passwordHash
        });

        res.status(201).json({
            message: "Account created successfully."
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: "Username already exists."
            });
        }

        console.error('Signup failed.');
        res.status(500).json({
            message: "Server error."
        });
    }
};

exports.login = async (req, res) => {
    try {
        const username = typeof req.body?.username === "string"
            ? req.body.username.trim()
            : "";
        const password = typeof req.body?.password === "string"
            ? req.body.password
            : "";

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        if (username.length > 100 || password.length > 128) {
            return res.status(401).json({
                message: "Incorrect username or password."
            });
        }

        const user = await User.findOne({ username });

        const passwordMatches = await matches(password, user?.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Incorrect username or password."
            });
        }

        await endSession(req, res);
        await createSession(res, user);

        res.json({
            message: "Login successful.",
            username: user.username,
            profileCompleted: user.profileCompleted
        });
    } catch (error) {
        console.error('Login failed.');
        res.status(500).json({
            message: "Server error."
        });
    }
};
