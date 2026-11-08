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
        return { origin: url.origin, provider, key, from };
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
    const text = `${subject}\n\n${url}\n\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email.`;
    const brevo = config.provider === 'brevo';
    const response = await fetch(brevo ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {'Content-Type': 'application/json', ...(brevo ? {'api-key':config.key} : {Authorization:`Bearer ${config.key}`})},
        body: JSON.stringify(brevo ? {sender:{name:'MaplePath',email:config.from}, to:[{email:to}], subject, textContent:text}
            : {from: config.from, to: [to], subject, text})
    });
    if (!response.ok) throw new Error('Account email delivery failed');
}

module.exports = { ready: () => Boolean(configuration()), normalizeEmail, send };
