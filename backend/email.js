// Minimal email sender using Resend's HTTP API (https://resend.com).
// If RESEND_API_KEY isn't set, sending is skipped silently — the app
// keeps working normally, it just won't email anyone yet.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Freedom VA <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[email skipped — no RESEND_API_KEY set] to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Email send failed (${res.status}): ${text}`);
      return { error: true };
    }
    return { ok: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { error: true };
  }
}

function wrapEmail(bodyHtml) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B2D;">
    <div style="padding: 24px 0 12px;">
      <div style="font-weight: 700; font-size: 18px; letter-spacing: -0.02em;">Freedom VA</div>
    </div>
    <div style="background: #F6F4EF; border-radius: 8px; padding: 24px;">
      ${bodyHtml}
    </div>
    <div style="color: #99998f; font-size: 12px; padding: 16px 0;">
      Freedom VA HR Platform
    </div>
  </div>`;
}

async function sendHiredEmail({ to, name, loginUrl }) {
  return sendEmail({
    to,
    subject: "You're hired! Welcome to Freedom VA",
    html: wrapEmail(`
      <p>Hi ${name},</p>
      <p>Congratulations — you've been hired! Your Freedom VA account is ready.</p>
      <p><a href="${loginUrl}" style="color:#D9A441;">Log in to get started</a> and complete your onboarding checklist.</p>
      <p>Welcome to the team.</p>
    `),
  });
}

async function sendOnboardingReminderEmail({ to, name, completed, total, loginUrl }) {
  return sendEmail({
    to,
    subject: 'Finish up your Freedom VA onboarding',
    html: wrapEmail(`
      <p>Hi ${name},</p>
      <p>Just a nudge — you've completed ${completed} of ${total} onboarding steps.</p>
      <p><a href="${loginUrl}" style="color:#D9A441;">Finish your checklist</a> so you're ready to start with clients.</p>
    `),
  });
}

async function sendNewApplicationEmail({ to, applicantName }) {
  return sendEmail({
    to,
    subject: `New applicant: ${applicantName}`,
    html: wrapEmail(`
      <p>${applicantName} just applied through your public application form.</p>
      <p>Check them out in your Recruitment pipeline.</p>
    `),
  });
}

module.exports = { sendEmail, sendHiredEmail, sendOnboardingReminderEmail, sendNewApplicationEmail };
