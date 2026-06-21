import jwt from "jsonwebtoken";

export function requireAnyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  // 1️⃣ Try VERIFY token first
  try {
    const payload = jwt.verify(token, process.env.VERIFY_TOKEN_SECRET);
    req.tokenType = "verify";
    req.verify = payload; // { uuid, type }
    return next();
  } catch {}

  // 2️⃣ Try AUTH token
  try {
    const payload = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);
    req.tokenType = "auth";
    req.user = payload; // Old token role fields, if present, are intentionally ignored.
    return next();
  } catch {}

  // 3️⃣ If both fail
  return res.status(401).json({ message: "Invalid token" });
}
