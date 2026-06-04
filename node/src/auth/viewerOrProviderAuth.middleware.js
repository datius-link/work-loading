import jwt from "jsonwebtoken";

export function requireViewerOrProviderAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);

    if (payload.role === "provider") {
      req.user = payload;
      return next();
    }

    if (payload.role === "viewer") {
      req.viewer = payload;
      return next();
    }

    return res.status(401).json({
      message: "Invalid token role",
    });
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
