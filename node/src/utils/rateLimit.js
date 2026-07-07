import rateLimit from "express-rate-limit";

// Guards password-guessing endpoints (login, password confirm/change): a
// caller gets a handful of tries per window, then has to wait, so a stolen
// bearer token or a leaked username can't be brute-forced into a password.
export const passwordAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

// Guards OTP-guessing endpoints: OTP codes are short (4-6 digits), so without
// a limit they're brute-forceable well within their expiry window.
export const otpAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});
