const express = require('express');
const crypto = require('node:crypto');
const {rateLimit} = require('express-rate-limit');
const User = require('../models/User');
const Session = require('../models/Session');
const {requireAuth, endSession} = require('../middleware/auth');
const {passwordError, matches, hashPassword} = require('../services/passwords');
const email = require('../services/accountEmail');
const router = express.Router();
const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const tokenValid = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const tokenFields = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return {token, data:{tokenHash:digest(token), requestedAt:new Date(), expiresAt:new Date(Date.now()+30*60*1000)}};
};
const versionFilter = user => user.sessionVersion ? {sessionVersion:user.sessionVersion} : {$or:[{sessionVersion:0},{sessionVersion:{$exists:false}}]};
const responseMessage = 'If that address is verified on an account, a reset link will be sent. Check your inbox and spam folder.';
const limited = (limit, windowMs) => rateLimit({windowMs,limit,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Too many attempts. Please try again later.'}});

router.get('/availability', (req,res) => res.json({emailRecoveryAvailable:email.ready()}));

router.post('/forgot-password', limited(5,15*60*1000), (req,res) => {
    if (!email.ready()) return res.status(503).json({message:'Email recovery is not available yet. Please try again later.'});
    const address = email.normalizeEmail(req.body?.email);
    if (!address) return res.status(400).json({message:'Enter a valid email address.'});
    // Response timing/content do not depend on whether an account exists or mail delivery.
    setImmediate(async () => {
        try {
            const {token,data} = tokenFields();
            const user = await User.findOneAndUpdate({email:address,$or:[
                {'passwordReset.requestedAt':{$exists:false}},
                {'passwordReset.requestedAt':{$lte:new Date(Date.now()-60000)}}
            ]},{$set:{passwordReset:data}},{new:true});
            if (user) {
                try { await email.send(address,'reset',token); }
                catch {
                    await User.updateOne({_id:user._id,'passwordReset.tokenHash':data.tokenHash},{$unset:{passwordReset:1}});
                    console.error('Account reset email delivery failed.');
                }
            }
        } catch { console.error('Account recovery request failed.'); }
    });
    res.status(202).json({message:responseMessage});
});

router.post('/reset-password', limited(10,15*60*1000), async (req,res) => {
    const {token,password} = req.body || {};
    if (!tokenValid(token)) return res.status(400).json({message:'This link is invalid or expired. Request a new one.'});
    const error = passwordError(password);
    if (error) return res.status(400).json({message:error});
    const filter = {'passwordReset.tokenHash':digest(token),'passwordReset.expiresAt':{$gt:new Date()}};
    // Check before the expensive hash, then atomically consume the same token.
    if (!await User.findOne(filter)) return res.status(400).json({message:'This link is invalid or expired. Request a new one.'});
    const passwordHash = await hashPassword(password);
    const user = await User.findOneAndUpdate({...filter,'passwordReset.expiresAt':{$gt:new Date()}},
        {$set:{passwordHash},$inc:{sessionVersion:1},$unset:{passwordReset:1,emailVerification:1}},{new:true});
    if (!user) return res.status(400).json({message:'This link has expired or was already used.'});
    await Session.deleteMany({userId:user._id});
    await endSession(req,res);
    res.json({message:'Password reset. Sign in again on each device.'});
});

router.post('/verify-email', limited(10,15*60*1000), async (req,res) => {
    const token = req.body?.token;
    if (!tokenValid(token)) return res.status(400).json({message:'This link is invalid or expired.'});
    const filter = {'emailVerification.tokenHash':digest(token),'emailVerification.expiresAt':{$gt:new Date()}};
    const user = await User.findOne(filter);
    if (!user) return res.status(400).json({message:'This link is invalid or expired.'});
    try {
        const updated = await User.findOneAndUpdate({...filter,'emailVerification.expiresAt':{$gt:new Date()}},
            {$set:{email:user.emailVerification.email},$unset:{emailVerification:1,passwordReset:1},$inc:{sessionVersion:1}},{new:true});
        if (!updated) return res.status(400).json({message:'This link has expired or was already used.'});
        await Session.deleteMany({userId:user._id});
        await endSession(req,res);
        res.json({message:'Email verified. Sign in again to continue.'});
    } catch(error) {
        if (error.code === 11000) return res.status(409).json({message:'This email cannot be linked. Sign in and use another address.'});
        throw error;
    }
});

router.use(requireAuth);
router.use(rateLimit({windowMs:15*60*1000,limit:20,keyGenerator:req=>String(req.auth.userId),
    skip:req=>req.method==='GET',standardHeaders:'draft-8',legacyHeaders:false,
    message:{message:'Too many account changes. Please try again later.'}}));

router.get('/', async (req,res) => {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.sendStatus(401);
    res.json({username:user.username,email:user.email || '',
        pendingEmail:user.emailVerification?.expiresAt > new Date() ? user.emailVerification.email : '',
        emailRecoveryAvailable:email.ready()});
});

router.post('/email', async (req,res) => {
    if (!email.ready()) return res.status(503).json({message:'Email setup is not available yet. Your current login still works.'});
    const address = email.normalizeEmail(req.body?.email);
    if (!address) return res.status(400).json({message:'Enter a valid email address.'});
    const user = await User.findById(req.auth.userId);
    if (!user || !await matches(req.body?.password,user.passwordHash)) return res.status(403).json({message:'Current password is incorrect.'});
    if (user.email === address) return res.json({message:'This email is already verified.'});
    if (user.emailVerification?.requestedAt > new Date(Date.now()-60000)) return res.status(429).json({message:'Wait a minute before requesting another verification email.'});
    const {token,data} = tokenFields();
    const updated = await User.findOneAndUpdate({_id:user._id,passwordHash:user.passwordHash,...versionFilter(user)},
        {$set:{emailVerification:{...data,email:address}}},{new:true});
    if (!updated) return res.status(409).json({message:'Your account changed. Sign in again.'});
    try { await email.send(address,'verify',token); }
    catch {
        await User.updateOne({_id:user._id,'emailVerification.tokenHash':data.tokenHash},{$unset:{emailVerification:1}});
        return res.status(503).json({message:'Could not send the verification email. Please try again later.'});
    }
    res.json({message:'Check your inbox to verify the address. Your existing email stays active until then.'});
});

router.post('/password', async (req,res) => {
    const error = passwordError(req.body?.newPassword);
    if (error) return res.status(400).json({message:error});
    const user = await User.findById(req.auth.userId);
    if (!user || !await matches(req.body?.currentPassword,user.passwordHash)) return res.status(403).json({message:'Current password is incorrect.'});
    const passwordHash = await hashPassword(req.body.newPassword);
    const updated = await User.findOneAndUpdate({_id:user._id,passwordHash:user.passwordHash,...versionFilter(user)},
        {$set:{passwordHash},$inc:{sessionVersion:1},$unset:{passwordReset:1,emailVerification:1}},{new:true});
    if (!updated) return res.status(409).json({message:'Your account changed. Sign in again.'});
    await Session.deleteMany({userId:user._id});
    await endSession(req,res);
    res.json({message:'Password changed. Sign in again on each device.'});
});

router.post('/logout-all', async (req,res) => {
    await User.updateOne({_id:req.auth.userId},{$inc:{sessionVersion:1},$unset:{passwordReset:1,emailVerification:1}});
    await Session.deleteMany({userId:req.auth.userId});
    await endSession(req,res);
    res.json({message:'Signed out on all devices.'});
});

module.exports = router;
