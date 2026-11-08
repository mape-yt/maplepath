const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const Application = require('../models/Application');
const TimelineRecord = require('../models/TimelineRecord');

function changedAccount() {
    const error = new Error('Your account changed. Sign in again.');
    error.status = 409;
    return error;
}

// Touch the same User document as deletion, in the same transaction as a child
// write. MongoDB retries conflicts; a retry after deletion finds no owner.
async function saveOwned(document, userId) {
    if (document.ownerId && String(document.ownerId) !== String(userId)) throw changedAccount();
    return mongoose.connection.transaction(async session => {
        const owner = await User.updateOne({_id:userId, username:document.username},
            {$inc:{dataRevision:1}}, {session});
        if (owner.matchedCount !== 1) throw changedAccount();
        if (!document.ownerId) document.ownerId = userId;
        return document.save({session});
    });
}

async function removeAccount(user) {
    await mongoose.connection.transaction(async session => {
        const locked = await User.updateOne({_id:user._id, passwordHash:user.passwordHash,
            ...(user.sessionVersion ? {sessionVersion:user.sessionVersion} :
                {$or:[{sessionVersion:0},{sessionVersion:{$exists:false}}]})},
            {$inc:{dataRevision:1}}, {session});
        if (locked.matchedCount !== 1) throw changedAccount();
        // Sequential: parallel operations within a MongoDB transaction are unsupported.
        await TimelineRecord.deleteMany({username:user.username}, {session});
        await Application.deleteMany({username:user.username}, {session});
        await Session.deleteMany({userId:user._id}, {session});
        await User.deleteOne({_id:user._id}, {session});
    });
}

module.exports = {saveOwned, removeAccount, changedAccount};
