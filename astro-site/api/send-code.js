export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, username, code, expiresMinutes } = req.body || {};

    if (!email || !username || !code) {
        return res.status(400).json({ error: 'Missing required fields: email, username, code' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Email service not configured' });
    }

    const fromAddress = process.env.RESEND_FROM || 'GMEcodes <noreply@gmecodes.com>';
    const expiry = Number(expiresMinutes) > 0 ? expiresMinutes : 10;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: fromAddress,
            to: [email],
            subject: `Your GMEcodes verification code: ${code}`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                    <h2 style="margin-bottom:8px;">Verify your email</h2>
                    <p>Hi <strong>${username}</strong>,</p>
                    <p>Your verification code is:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:16px 0;">${code}</div>
                    <p style="color:#666;">This code expires in ${expiry} minutes. Do not share it with anyone.</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                    <p style="font-size:12px;color:#999;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(502).json({ error: err.message || 'Failed to send email' });
    }

    return res.status(200).json({ ok: true });
}
