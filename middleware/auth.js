const crypto = require("node:crypto");
const Session = require("../models/Session");
const User = require("../models/User");

const COOKIE_NAME = "maplepath_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function cookieOptions(maxAge){
    const parts = [
        `${COOKIE_NAME}=${maxAge.value}`,
        "HttpOnly",
        "SameSite=Strict",
        "Path=/",
        `Max-Age=${maxAge.seconds}`
    ];
    if(process.env.NODE_ENV === "production") parts.push("Secure");
    return parts.join("; ");
}

function getSessionToken(req){
    const cookieHeader = req.headers.cookie || "";
    const pair = cookieHeader.split(";").map(value => value.trim())
        .find(value => value.startsWith(`${COOKIE_NAME}=`));
    const token = pair ? pair.slice(COOKIE_NAME.length + 1) : "";
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function hashToken(token){
    return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(res,user){
    const token = crypto.randomBytes(32).toString("hex");
    await Session.create({
        tokenHash: hashToken(token),
        userId: user._id,
        expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000)
    });
    res.setHeader("Set-Cookie", cookieOptions({ value: token, seconds: SESSION_SECONDS }));
}

async function endSession(req,res){
    const token = getSessionToken(req);
    if(token) await Session.deleteOne({ tokenHash: hashToken(token) });
    res.setHeader("Set-Cookie", cookieOptions({ value: "", seconds: 0 }));
}

function requireSameOrigin(req,res,next){
    const origin = req.headers.origin;
    if(origin){
        try{
            const parsed = new URL(origin);
            if(!["http:", "https:"].includes(parsed.protocol) ||
                parsed.host !== req.headers.host){
                return res.status(403).json({ message: "Cross-origin request denied." });
            }
        } catch(error){
            return res.status(403).json({ message: "Cross-origin request denied." });
        }
    }
    next();
}

async function requireAuth(req,res,next){
    res.setHeader("Cache-Control", "no-store");
    const token = getSessionToken(req);
    if(!token) return res.status(401).json({ message: "Please sign in." });

    try{
        const session = await Session.findOne({
            tokenHash: hashToken(token),
            expiresAt: { $gt: new Date() }
        });
        if(!session) return res.status(401).json({ message: "Session expired. Please sign in." });

        const user = await User.findById(session.userId);
        if(!user) return res.status(401).json({ message: "Please sign in." });

        req.auth = {
            userId: user._id,
            username: user.username,
            profileCompleted: user.profileCompleted,
            pathway: user.immigrationProfile?.pathway
        };
        next();
    } catch(error){
        next(error);
    }
}

function requireOwnUsername(req,res,next,value){
    if(value !== req.auth.username){
        return res.status(403).json({ message: "Access denied." });
    }
    next();
}

module.exports = {
    createSession,
    endSession,
    requireAuth,
    requireOwnUsername,
    requireSameOrigin
};
