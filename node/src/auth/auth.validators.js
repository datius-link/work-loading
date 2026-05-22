export function validateRegister(body) {
  const { email, password } = body;

  if (!email) return "Email is required";
  if (!password) return "Password is required";
  if (password.length < 4)
    return "Password must be at least 4 characters";

  return null;
}

export function validateLogin(body) {
  if (!body.email || !body.password)
    return "Email and password are required";

  return null;
}

export function validateEmail(body) {
  if (!body.email) return "Email is required";
  if (!String(body.email).includes("@")) return "Valid email is required";

  return null;
}

export function validateResetPassword(body) {
  if (!body.resetToken) return "Reset token is required";
  if (!body.password) return "Password is required";
  if (body.password.length < 4)
    return "Password must be at least 4 characters";

  return null;
}
