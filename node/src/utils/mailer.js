// SMTP mailer for OTP delivery. Deliberately optional: when the SMTP_* env
// vars are not set (local dev, fresh deploys), sendOtpEmail() returns false
// and the caller falls back to logging the code — registration and password
// reset keep working before any email provider is configured.
//
// Works with any SMTP provider. Free options that deliver to arbitrary
// recipients: Brevo (300/day free) — host smtp-relay.brevo.com, port 587 —
// or Gmail with an app password — host smtp.gmail.com, port 587.
//
// Required env vars (set them in the Render dashboard):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
// EMAIL_FROM example: "Work Loading <you@gmail.com>" — Brevo requires the
// address to be a verified sender on your Brevo account.
import nodemailer from "nodemailer";

// Read env lazily (not at module load): dotenv.config() in server.js runs
// after ES module imports are evaluated, so top-level reads would see
// nothing in local dev.
function smtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) return null;
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    from: EMAIL_FROM,
  };
}

export function isEmailConfigured() {
  return smtpConfig() !== null;
}

let transporter = null;
let transporterKey = null;

function getTransporter(config) {
  // Rebuild if config changed (only really matters for tests/hot reload).
  const key = `${config.host}:${config.port}:${config.auth.user}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    transporterKey = key;
  }
  return transporter;
}

/**
 * Sends a one-time code. Returns true when the email was handed to the SMTP
 * server, false when email isn't configured or sending failed — the caller
 * decides the fallback (we never throw, so auth flows can't break on a mail
 * outage).
 */
export async function sendOtpEmail(to, code, reason) {
  const config = smtpConfig();
  if (!config) return false;

  const subject = `${code} is your Work Loading code`;
  const text =
    `Your ${reason} code is: ${code}\n\n` +
    `It expires in 10 minutes. If you didn't request this, ignore this email.`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
    <p style="font-size:15px;font-weight:bold;color:#0b6b63;margin:0 0 16px">Work Loading</p>
    <p style="font-size:14px;color:#0f172a;margin:0 0 8px">Your ${reason} code:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0f172a;margin:0 0 16px">${code}</p>
    <p style="font-size:12px;color:#64748b;margin:0">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  </div>`;

  try {
    await getTransporter(config).sendMail({ from: config.from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error(`✉️ Failed to send ${reason} email to ${to}:`, err?.message || err);
    return false;
  }
}
