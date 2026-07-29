const dns = require("dns");

dns.resolveSrv("_mongodb._tcp.users.vynwr8x.mongodb.net", (err, records) => {
    if (err) {
        console.error(err);
    } else {
        console.log(records);
    }
});