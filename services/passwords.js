const bcrypt = require('bcrypt');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-user-password', 12);

function passwordError(value) {
    if (typeof value !== 'string' || [...value].length < 15) {
        return 'Use at least 15 characters. A few memorable words work well.';
    }
    if (Buffer.byteLength(value, 'utf8') > 72) return 'This password is too long. Try a shorter phrase; emoji and some letters take more space.';
    return null;
}

async function matches(password, hash) {
    if (typeof password !== 'string' || !password || password.length > 128) return false;
    const valid = await bcrypt.compare(password, hash || DUMMY_HASH);
    return Boolean(hash) && valid;
}

module.exports = { passwordError, matches, hashPassword: password => bcrypt.hash(password, 12) };
