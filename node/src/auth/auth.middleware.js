import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.AUTH_TOKEN_SECRET
    );

    if (payload.role !== "service_provider" && payload.role !== "provider") {
      return res.status(403).json({ message: "Service provider token required" });
    }

    req.user = payload; // { uuid, role }

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
