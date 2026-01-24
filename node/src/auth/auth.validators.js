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
