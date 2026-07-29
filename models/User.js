class User {
    constructor(username, password) {
        this.id = Date.now().toString();
        this.username = username;
        this.password = password;

        // We'll use these later
        this.program = "";
        this.stages = [];
        this.createdAt = new Date();
    }
}

module.exports = User;