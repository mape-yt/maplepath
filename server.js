require("dns").setDefaultResultOrder("ipv4first");

require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { createApp } = require("./app");
const app = createApp();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

let server;

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down MaplePath.`);

    if (server) {
        await new Promise(resolve => server.close(resolve));
    }

    await mongoose.disconnect();
    process.exit(0);
}

async function startServer() {
    await connectDB();
    // Ensure the verified-email unique index exists before accepting account changes.
    await require('./models/User').init();

    server = app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(error => {
    console.error("MaplePath failed to start:", error.message);
    process.exit(1);
});
