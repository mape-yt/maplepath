// No SDK or stored mail history. Only account verification and recovery messages.
function configuration() {
    try {
        const url = new URL(process.env.PUBLIC_APP_URL);
        if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
        const provider = process.env.ACCOUNT_EMAIL_PROVIDER || 'resend';
        if (!['resend','brevo'].includes(provider)) return null;
        const key = provider === 'brevo' ? process.env.BREVO_API_KEY : process.env.RESEND_API_KEY;
        const from = process.env.ACCOUNT_EMAIL_FROM;
        if (!key || !from || /[\r\n]/.test(from)) return null;
        if (provider === 'brevo' && !normalizeEmail(from)) return null;
        // Reply to the real support inbox, even when Brevo replaces a Gmail From address.
        const replyTo = normalizeEmail(process.env.SUPPORT_EMAIL) || (provider === 'brevo' ? normalizeEmail(from) : null);
        return { origin: url.origin, provider, key, from, replyTo };
    } catch { return null; }
}

function normalizeEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email) ? email : null;
}

async function send(to, purpose, token) {
    const config = configuration();
    if (!config) throw new Error('Account email is not configured');
    if (!normalizeEmail(to) || !['verify','reset'].includes(purpose) || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid account email');
    // Fragments are not sent in HTTP requests or referrers; the page removes it on load.
    const url = `${config.origin}/recover.html#${new URLSearchParams({purpose, token})}`;
    const subject = purpose === 'verify' ? 'Verify your MaplePath email' : 'Reset your MaplePath password';
    const explanation = purpose === 'verify'
        ? 'You requested to use this address for account recovery on MaplePath.'
        : 'A password reset was requested for your MaplePath account.';
    const action = purpose === 'verify' ? 'To verify your email, open this link:' : 'To choose a new password, open this link:';
    const text = [
        'MaplePath', explanation, 'Website: '+config.origin, action, url,
        'This link can be used once and expires in 30 minutes.',
        'If you did not request this email, ignore it. No change is made until you complete the steps on the website.',
        ...(config.replyTo ? ['Questions? Reply to this email or contact '+config.replyTo+'.'] : []),
        'Never share your password or this link.'
    ].join('\n\n');
    const brevo = config.provider === 'brevo';
    const response = await fetch(brevo ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {'Content-Type': 'application/json', ...(brevo ? {'api-key':config.key} : {Authorization:`Bearer ${config.key}`})},
        body: JSON.stringify(brevo ? {sender:{name:'MaplePath',email:config.from}, to:[{email:to}], subject, textContent:text,
            ...(config.replyTo ? {replyTo:{name:'MaplePath Support',email:config.replyTo}} : {})}
            : {from: config.from, to: [to], subject, text, ...(config.replyTo ? {reply_to:config.replyTo} : {})})
    });
    if (!response.ok) throw new Error('Account email delivery failed');
}

module.exports = { ready: () => Boolean(configuration()), normalizeEmail, send };
