const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('node:path');
const {rateLimit} = require('express-rate-limit');
const {requireAuth, requireSameOrigin} = require('./middleware/auth');

// Shared by the actual server and isolated HTTP tests; never connects to a database here.
function createApp() {
    const app = express();
    const production = process.env.NODE_ENV === 'production';
    if (production) app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use(helmet({referrerPolicy:{policy:'no-referrer'},
        contentSecurityPolicy:{directives:{'upgrade-insecure-requests':production?[]:null}}}));
    app.use('/api', (req,res,next) => {res.set('Cache-Control','no-store');next();});
    app.use('/api', requireSameOrigin);
    app.use('/api', rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false,
        skip:req=>req.path==='/health', message:{message:'Too many requests. Please try again shortly.'}}));
    app.use('/api', (req,res,next) => {
        const hasBody = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'];
        if (hasBody && !req.is('application/json')) return res.status(415).json({message:'Send requests as JSON.'});
        next();
    });
    app.use(express.json({limit:'100kb',inflate:false}));
    app.use('/api', (req,res,next) => {
        if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
            return res.status(400).json({message:'Send a JSON object.'});
        }
        next();
    });
    app.use('/api/auth', rateLimit({windowMs:15*60*1000,limit:30,
        skip:req=>req.method!=='POST',standardHeaders:'draft-8',legacyHeaders:false,
        message:{message:'Too many sign-in or account requests. Please try again shortly.'}}),require('./routes/authRoutes'));
    app.use('/api/account', require('./routes/accountRoutes'));
    for (const [name,file] of Object.entries({profile:'profile',tasks:'task',journey:'journey',timeline:'timeline',analytics:'analytics',applications:'application'})) {
        app.use(`/api/${name}`,requireAuth,require(`./routes/${file}Routes`));
    }
    app.use('/api/options',require('./routes/optionsRoutes'));
    app.get('/api/health',(req,res)=>{
        const connected=mongoose.connection.readyState===1;
        res.status(connected?200:503).json({status:connected?'ok':'unavailable',database:connected?'connected':'disconnected'});
    });
    app.get('/api',(req,res)=>res.json({message:'MaplePath API is running!'}));
    app.use('/api',(req,res)=>res.status(404).json({message:'API route not found.'}));
    app.use(express.static(path.join(__dirname,'public'),{dotfiles:'deny',setHeaders:(res,file)=>{
        if (['account.html','recover.html','auth.html','dashboard.html','profile.html','journey.html','onboarding.html'].includes(path.basename(file))) res.setHeader('Cache-Control','no-store');
    }}));
    app.use((error,req,res,next)=>{
        if (res.headersSent) return next(error);
        const status = [400,413,415].includes(error.status) ? error.status : 500;
        if (status===500) console.error('Request failed:',error.name || 'Error');
        const message = status===413?'Request is too large.':status===415?'Unsupported request format.':status===400?'Invalid request.':'Something went wrong. Please try again.';
        res.status(status).json({message});
    });
    return app;
}
module.exports = {createApp};
