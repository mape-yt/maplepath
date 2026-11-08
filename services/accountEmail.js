// No SDK or stored mail history. Only account verification and recovery messages.
function configuration() {
    try {
        const url = new URL(process.env.PUBLIC_APP_URL);
        if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
        if (!process.env.RESEND_API_KEY || !process.env.ACCOUNT_EMAIL_FROM || /[\r\n]/.test(process.env.ACCOUNT_EMAIL_FROM)) return null;
        return { origin: url.origin, key: process.env.RESEND_API_KEY, from: process.env.ACCOUNT_EMAIL_FROM };
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
    // Fragments are not sent in HTTP requests or referrers; the page removes it on load.
    const url = `${config.origin}/recover.html#${new URLSearchParams({purpose, token})}`;
    const subject = purpose === 'verify' ? 'Verify your MaplePath email' : 'Reset your MaplePath password';
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({from: config.from, to: [to], subject,
            text: `${subject}\n\n${url}\n\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email.`})
    });
    if (!response.ok) throw new Error('Account email delivery failed');
}

module.exports = { ready: () => Boolean(configuration()), normalizeEmail, send };
