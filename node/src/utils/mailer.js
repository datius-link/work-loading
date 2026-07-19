// OTP delivery via Brevo's HTTP transactional email API. Deliberately
// optional: when BREVO_API_KEY/EMAIL_FROM aren't set, sendOtpEmail() returns
// false and the caller falls back to logging the code — registration and
// password reset keep working before any email provider is configured.
//
// HTTP, not SMTP: Render's free tier blocks/restricts outbound SMTP ports
// (confirmed — raw SMTP to smtp-relay.brevo.com:587 hangs until connection
// timeout even with correct credentials), so a normal HTTPS POST is the only
// thing that reliably works there.
//
// Required env vars (set them in the Render dashboard):
//   BREVO_API_KEY — Brevo dashboard > SMTP & API > API Keys tab (starts with "xkeysib-")
//   EMAIL_FROM    — a verified sender / authenticated-domain address, e.g. "Work Loading <workloading@yahzel.com>"
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function parseFrom(emailFrom) {
  const match = String(emailFrom || "").match(/^\s*(.*?)\s*<(.+)>\s*$/);
  if (match) return { name: match[1] || "Work Loading", email: match[2] };
  return { name: "Work Loading", email: String(emailFrom || "").trim() };
}

function brevoConfig() {
  const { BREVO_API_KEY, EMAIL_FROM } = process.env;
  if (!BREVO_API_KEY || !EMAIL_FROM) return null;
  return { apiKey: BREVO_API_KEY, sender: parseFrom(EMAIL_FROM) };
}

export function isEmailConfigured() {
  return brevoConfig() !== null;
}

/**
 * Sends a one-time code. Returns true when Brevo accepted the send, false
 * when email isn't configured or sending failed — the caller decides the
 * fallback (we never throw, so auth flows can't break on a mail outage).
 */
export async function sendOtpEmail(to, code, reason) {
  const config = brevoConfig();
  if (!config) return false;

  const subject = `${code} is your Work Loading code`;
  const textContent =
    `Your ${reason} code is: ${code}\n\n` +
    `It expires in 10 minutes. If you didn't request this, ignore this email.`;
  const htmlContent = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
    <p style="font-size:15px;font-weight:bold;color:#0b6b63;margin:0 0 16px">Work Loading</p>
    <p style="font-size:14px;color:#0f172a;margin:0 0 8px">Your ${reason} code:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0f172a;margin:0 0 16px">${code}</p>
    <p style="font-size:12px;color:#64748b;margin:0">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  </div>`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: config.sender,
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`✉️ Brevo rejected ${reason} email to ${to}: ${res.status} ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`✉️ Failed to send ${reason} email to ${to}:`, err?.message || err);
    return false;
  }
}
